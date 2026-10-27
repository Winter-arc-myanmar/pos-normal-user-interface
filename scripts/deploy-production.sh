#!/usr/bin/env bash
# Installed by the administrator as /usr/local/sbin/privatevip-deploy.
# Do not run this from a writable checkout as a forced SSH command.
set -euo pipefail

command=${SSH_ORIGINAL_COMMAND:-}
if [[ ! "$command" =~ ^deploy\ ([a-f0-9]{40})$ ]]; then
  echo "Only 'deploy <40-character commit SHA>' is permitted." >&2
  exit 2
fi
sha=${BASH_REMATCH[1]}
exec 9>/run/privatevip-deploy.lock
flock -w 1200 9

repo=/opt/pos-normal-user-interface
compose=/etc/privatevip/compose.yml
project=pos-normal-user-interface
image="vision-pos-web:$sha"
cd "$repo"
git fetch --no-tags origin main
if [[ "$(git rev-parse origin/main)" != "$sha" ]]; then
  echo "Skipping superseded commit $sha; only the current main tip is deployed."
  exit 0
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Refusing to overwrite tracked changes in the server checkout." >&2
  exit 1
fi

# Hash the tracked Dockerfile inputs, not the commit date or deployment scripts.
# Keep this list aligned with the Dockerfile COPY instructions. Including the API
# origin prevents accidentally reusing a bundle compiled for another backend.
api_url=https://apivision.winterarc.asia
build_key=$({
  printf 'VITE_API_URL=%s\n' "$api_url"
  git ls-tree -r "$sha" -- Dockerfile .dockerignore .npmrc package.json \
    package-lock.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json \
    vite.config.ts vitest.config.ts scripts/vitest-windows-patch.cjs src public docker
} | git hash-object --stdin)

if docker image inspect "$image" > /dev/null 2>&1; then
  echo "Reusing existing image $image."
else
  cached=$(docker image ls --filter "label=com.vision-pos.build-inputs=$build_key" \
    --format '{{.ID}}' | sort -u | sed -n '1p')
  if [[ -n "$cached" ]]; then
    echo "Build inputs unchanged; reusing $cached for $sha."
    docker tag "$cached" "$image"
  else
    # Build an isolated archive without .env or Git credentials. BuildKit keeps
    # the dependency/package caches between builds; do not prune them each run.
    context=$(mktemp -d /opt/privatevip-build.XXXXXX)
    trap 'rm -rf "$context"' EXIT
    git archive "$sha" | tar -x -C "$context"
    DOCKER_BUILDKIT=1 docker build --build-arg "VITE_API_URL=$api_url" \
      --label "org.opencontainers.image.revision=$sha" \
      --label "com.vision-pos.build-inputs=$build_key" -t "$image" "$context"
  fi
fi

previous=$(docker inspect vision-pos-web --format '{{.Image}}' 2>/dev/null || true)
target=$(docker image inspect "$image" --format '{{.Id}}')
rollback=vision-pos-web:rollback
superseded_rollback=$(docker image inspect "$rollback" --format '{{.Id}}' 2>/dev/null || true)
# Do not overwrite the real rollback image during a repeated/no-op deployment.
if [[ -n "$previous" && "$previous" != "$target" ]]; then
  docker tag "$previous" "$rollback"
fi

activate() {
  APP_IMAGE="$1" docker compose -p "$project" -f "$compose" up \
    -d --no-build --pull never --wait --wait-timeout 120
}
verify() {
  curl --fail --silent --show-error --retry 5 --retry-delay 2 \
    --retry-all-errors --max-time 10 http://127.0.0.1:8080/healthz
  curl --fail --silent --show-error --max-time 15 \
    --resolve privatevip.mmlnkits.com:443:127.0.0.1 \
    https://privatevip.mmlnkits.com/healthz
}

if ! activate "$image" || ! verify; then
  if [[ -n "$previous" && "$previous" != "$target" ]]; then
    echo "Deployment failed; restoring $rollback." >&2
    activate "$rollback"
    verify
  else
    echo "Deployment failed; no different previous image to restore." >&2
  fi
  exit 1
fi

# Keep manual docker compose commands aligned with the successful release.
docker tag "$image" vision-pos-web:latest
git merge --ff-only "$sha"
printf '%s\n' "$sha" > /etc/privatevip/deployed-sha

# Keep the current release and one stable rollback tag. Only retire this app's
# generated SHA/timestamp tags, never other repositories or operator-made tags.
# No --force: Docker refuses removal when an image is still needed by a container.
while IFS= read -r tag; do
  if [[ "$tag" != "$sha" && ( "$tag" =~ ^[a-f0-9]{40}$ || "$tag" =~ ^rollback-[0-9]+$ ) ]]; then
    docker image rm "vision-pos-web:$tag" || \
      echo "Keeping image still in use: vision-pos-web:$tag" >&2
  fi
done < <(docker image ls vision-pos-web --format '{{.Tag}}')
# Moving the stable rollback tag can leave its former image dangling. Remove
# only that known superseded image, and only if no operator tag now refers to it.
if [[ -n "$superseded_rollback" && "$superseded_rollback" != "$previous" && "$superseded_rollback" != "$target" ]]; then
  remaining_tags=$(docker image inspect "$superseded_rollback" --format '{{json .RepoTags}}' 2>/dev/null || true)
  if [[ "$remaining_tags" == '[]' || "$remaining_tags" == 'null' ]]; then
    docker image rm "$superseded_rollback" || \
      echo "Keeping superseded rollback image still in use: $superseded_rollback" >&2
  fi
fi
printf 'Deployed %s successfully. Rollback tag (when available): %s\n' "$sha" "$rollback"