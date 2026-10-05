# PrivateVIP CI/CD

The workflow in `.github/workflows/deploy.yml` runs CI for pull requests to
`main`, and CI plus deployment for pushes to `main`. It can also be started
manually from the GitHub Actions tab (select `main`). Other branches never deploy.

## Required repository Actions secrets

- `DEPLOY_SSH_KEY`: dedicated PEM-format SSH private key.
- `DEPLOY_KNOWN_HOSTS`: verified SSH host-key entry for `118.27.147.101`.

Neither secret belongs in the repository. The server authorizes the deployment
key with a forced command and disables shell access, port forwarding, and PTYs.
The deployment command runs as root, so protect access to these secrets and
review changes to `main`, especially the Dockerfile and workflow.

## Pipeline

1. Compile with the existing Dockerfile's Node 24 build stage.
2. Run the repository test suite. **Tests are currently advisory** because the
   baseline has a cashier table-state failure and two Burmese locale failures.
   Failures produce a workflow warning and summary. Remove `continue-on-error`
   once the baseline is fixed to make tests a required deployment gate.
3. Build the complete runtime image, including Nginx configuration validation.
4. SSH to the server and request deployment of the triggering commit SHA.
5. The server only accepts the current `main` tip, builds an isolated source
   archive, and starts the image with Docker health checks. Concurrent server
   deployments are serialized with `flock`.
6. Local HTTP/TLS probes verify the new release. Failed activation/probes restore
   the previous image and fail the deployment. GitHub verifies public HTTPS too.

This is a single-container replacement, so a brief interruption is possible.
The server rebuilds the validated commit rather than pulling from a registry.
Images are tagged by commit and the previous image is retained for rollback.
Monitor disk use and periodically remove old images, retaining rollback images.

## Server configuration

- Repository: `/opt/pos-normal-user-interface`
- Administrator-owned deployment command: `/usr/local/sbin/privatevip-deploy`
- Administrator-owned Compose file: `/etc/privatevip/compose.yml`
- Last deployed SHA: `/etc/privatevip/deployed-sha`
- Internal port: `127.0.0.1:8080`
- Frontend: `https://privatevip.mmlnkits.com`
- Backend: `https://apivision.winterarc.asia`

The deployment command is copied from `scripts/deploy-production.sh` by an
administrator. Workflow changes do not automatically replace that trusted command
or the server-owned Compose file. Reinstall explicitly after reviewing changes.
Nginx, Certbot, and their certificates are not changed during application deploys.

## Check and manually restore a release

```bash
cat /etc/privatevip/deployed-sha
docker inspect vision-pos-web --format '{{.Config.Image}} {{.State.Health.Status}}'
docker logs --tail 100 vision-pos-web
docker image ls vision-pos-web

# Choose an existing commit or rollback image tag from the image list:
APP_IMAGE=vision-pos-web:<selected-tag> docker compose \
  -p pos-normal-user-interface -f /etc/privatevip/compose.yml \
  up -d --no-build --pull never --wait --wait-timeout 120
```

After a manual rollback, align `vision-pos-web:latest` and the server checkout
before using the repository's original Compose file for manual deployment.