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

# Build an isolated archive of the exact commit, without .env or Git credentials.
context=$(mktemp -d /opt/privatevip-build.XXXXXX)
trap 'rm -rf "$context"' EXIT
git archive "$sha" | tar -x -C "$context"
docker build --build-arg VITE_API_URL=https://apivision.winterarc.asia \
  --label "org.opencontainers.image.revision=$sha" -t "$image" "$context"

previous=$(docker inspect vision-pos-web --format '{{.Image}}')
rollback="vision-pos-web:rollback-$(date +%s)"
docker tag "$previous" "$rollback"

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
  echo "Deployment failed; restoring $rollback." >&2
  activate "$rollback"
  verify
  exit 1
fi

# Keep manual docker compose commands aligned with the successful release.
docker tag "$image" vision-pos-web:latest
git merge --ff-only "$sha"
printf '%s\n' "$sha" > /etc/privatevip/deployed-sha
printf 'Deployed %s successfully. Previous image: %s\n' "$sha" "$rollback"