#!/bin/sh
# Generates /env-config.js from environment variables at container startup,
# so the same image can be promoted across environments without rebuilding.
# Executed automatically by the nginx image entrypoint (/docker-entrypoint.d).
set -eu

TARGET="${ENV_CONFIG_PATH:-/usr/share/nginx/html/env-config.js}"

# Strip characters that could break out of the JS string literal.
sanitize() {
  printf '%s' "${1:-}" | tr -d '"\\\n\r<>'
}

cat > "$TARGET" <<JS
window.__APP_CONFIG__ = {
  supabaseUrl: "$(sanitize "${SUPABASE_URL:-}")",
  supabaseAnonKey: "$(sanitize "${SUPABASE_ANON_KEY:-}")",
  privateAreaUrl: "$(sanitize "${PRIVATE_AREA_URL:-}")"
};
JS

echo "env-config: wrote runtime configuration to $TARGET"
