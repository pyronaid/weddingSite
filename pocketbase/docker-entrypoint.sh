#!/bin/sh
# PocketBase container entrypoint.
# - applies pending migrations (also done automatically by `serve`)
# - creates/updates the superuser from env vars, if provided
# - starts the server in the foreground (PID 1 via exec, so signals work)
set -eu

DATA_DIR=/pb/pb_data
COMMON_FLAGS="--dir=${DATA_DIR} --migrationsDir=/pb/pb_migrations --hooksDir=/pb/pb_hooks"

pocketbase migrate up ${COMMON_FLAGS}

if [ -n "${PB_ADMIN_EMAIL:-}" ] && [ -n "${PB_ADMIN_PASSWORD:-}" ]; then
  pocketbase superuser upsert "${PB_ADMIN_EMAIL}" "${PB_ADMIN_PASSWORD}" ${COMMON_FLAGS}
fi

# Comma separated list of allowed CORS origins (default: any).
ORIGINS="${PB_ORIGINS:-*}"

exec pocketbase serve ${COMMON_FLAGS} --http=0.0.0.0:8090 --origins="${ORIGINS}"
