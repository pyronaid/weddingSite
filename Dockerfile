# syntax=docker/dockerfile:1

# ---------- Stage 1: build the static site ----------
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Typecheck, test and build: a broken commit never produces an image.
RUN npm run typecheck && npm test && npm run build
# Defensive: strip CRLF endings (Windows checkouts) from the startup script.
# Done here because the runtime stage runs as an unprivileged user.
RUN sed -i 's/\r$//' docker/40-env-config.sh

# ---------- Stage 2: serve with an unprivileged nginx ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chmod=755 /app/docker/40-env-config.sh /docker-entrypoint.d/40-env-config.sh
# Owned by the nginx user so env-config.js can be regenerated at startup.
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
