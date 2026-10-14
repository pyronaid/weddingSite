/**
 * Runtime configuration.
 *
 * Vite inlines `import.meta.env.*` at build time, which would force us to
 * rebuild the Docker image for every environment. Instead the container
 * writes `/env-config.js` at startup (see docker/40-env-config.sh), which sets
 * `window.__APP_CONFIG__`. In local development the `.env` file is used as a
 * fallback, so both workflows share the same code path.
 */
export interface RuntimeConfig {
  /** Public URL of the PocketBase instance, e.g. https://api.example.com */
  pocketbaseUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<RuntimeConfig>;
  }
}

/** Empty strings (unset env vars in the container) count as "not provided". */
function pick(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === 'string' && value.trim() !== '')?.trim() ?? '';
}

function loadConfig(): RuntimeConfig {
  const runtime = typeof window !== 'undefined' ? (window.__APP_CONFIG__ ?? {}) : {};

  return Object.freeze({
    pocketbaseUrl: pick(runtime.pocketbaseUrl, import.meta.env.VITE_POCKETBASE_URL).replace(/\/+$/, ''),
  });
}

export const runtimeConfig: RuntimeConfig = loadConfig();
