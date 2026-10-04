# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Vision POS - production image.
#
# Multi-stage build:
#   stage 1 (build)   -> node compiles the Vite SPA into /app/dist
#   stage 2 (runtime) -> nginx serves the static files (tiny, stable, read-mostly)
#
# The runtime image never contains Node, npm or the source tree, which keeps it
# small, fast to start and free of the long-running JS process entirely.
# ---------------------------------------------------------------------------

# ===========================================================================
# Stage 1 - build the static SPA
# ===========================================================================
FROM node:24-alpine AS build

WORKDIR /app

# Vite inlines env vars into the bundle at BUILD time.
#   * default  -> call the API origin directly (current behaviour)
#   * override -> set this to the site's own origin to use the nginx proxy
#                 (docker build --build-arg VITE_API_URL=https://vision.example.com)
ARG VITE_API_URL=https://apivision.winterarc.asia
ENV VITE_API_URL=${VITE_API_URL}

# The repo pins legacy-peer-deps in .npmrc; mirror it and keep CI installs
# reproducible and quiet.
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    CI=true

# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Copy the sources and build the production bundle.
COPY . .
RUN npm run build

# ===========================================================================
# Stage 2 - serve the static build with nginx
# ===========================================================================
FROM nginx:1.27-alpine AS runtime

# envsubst (from gettext) renders the server template at container start.
RUN apk add --no-cache gettext

# Optional same-origin backend upstream. Change API_UPSTREAM at runtime to
# re-point /api, /csrf and /uploads without rebuilding the image. Only this
# variable is substituted into the template (all nginx $vars are preserved).
ENV API_UPSTREAM=https://apivision.winterarc.asia \
    NGINX_ENVSUBST_FILTER=^API_UPSTREAM\$

# nginx master config + server template + reusable snippets.
COPY docker/nginx.conf   /etc/nginx/nginx.conf
COPY docker/templates/   /etc/nginx/templates/
COPY docker/snippets/    /etc/nginx/snippets/

# Static build output (the only artefact that ships to the user).
COPY --from=build /app/dist /usr/share/nginx/html

# Render the template once and validate the whole config so a broken config
# fails the build instead of crash-looping in production.
RUN rm -f /etc/nginx/conf.d/default.conf \
    && envsubst '${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf \
    && nginx -t

LABEL org.opencontainers.image.title="vision-pos-web" \
      org.opencontainers.image.description="Vision POS - production SPA runtime (nginx)" \
      org.opencontainers.image.source="https://github.com/"

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

# SIGQUIT = nginx graceful shutdown (finish in-flight requests on restart).
STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
