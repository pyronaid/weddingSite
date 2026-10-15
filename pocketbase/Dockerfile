# syntax=docker/dockerfile:1

# ---------- Stage 1: download and verify the PocketBase binary ----------
FROM alpine:3.20 AS download

# Pin the version for reproducible builds; bump deliberately.
ARG PB_VERSION=0.40.5
# Provided automatically by BuildKit (amd64, arm64, ...).
ARG TARGETARCH=amd64

# Only BusyBox tools already in the base image are used (wget, unzip,
# sha256sum): no package downloads, fewer moving parts.
WORKDIR /tmp/pb
RUN set -eux; \
    base="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}"; \
    archive="pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip"; \
    wget -q "${base}/${archive}"; \
    wget -q "${base}/checksums.txt"; \
    # Fail the build if the archive was tampered with or corrupted.
    grep " ${archive}\$" checksums.txt | sha256sum -c -; \
    unzip -q "${archive}" pocketbase; \
    chmod +x pocketbase

# ---------- Stage 2: minimal runtime ----------
FROM alpine:3.20

# The base image already ships CA certificates (for SMTP/TLS) and BusyBox
# wget (used by the health check).
RUN addgroup -S pocketbase && adduser -S -G pocketbase -h /pb pocketbase

WORKDIR /pb
COPY --from=download /tmp/pb/pocketbase /usr/local/bin/pocketbase
COPY --chown=pocketbase:pocketbase pb_migrations /pb/pb_migrations
COPY --chown=pocketbase:pocketbase pb_hooks /pb/pb_hooks
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Defensive: strip CRLF endings in case the build context comes from a
# Windows checkout, otherwise the shebang breaks with "no such file".
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh

# All state (SQLite DB + uploaded files) lives here: mount a volume on it.
RUN mkdir -p /pb/pb_data && chown pocketbase:pocketbase /pb/pb_data
VOLUME /pb/pb_data

USER pocketbase
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8090/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
