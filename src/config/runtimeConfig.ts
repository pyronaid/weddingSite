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
  supabaseUrl: string;
  supabaseAnonKey: string;
  privateAreaUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const DEFAULT_PRIVATE_AREA_URL = 'https://www.google.it';

/** Empty strings (unset env vars in the container) count as "not provided". */
function pick(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === 'string' && value.trim() !== '')?.trim() ?? '';
}

function loadConfig(): RuntimeConfig {
  const runtime = typeof window !== 'undefined' ? (window.__APP_CONFIG__ ?? {}) : {};

  return Object.freeze({
    supabaseUrl: pick(runtime.supabaseUrl, import.meta.env.VITE_SUPABASE_URL),
    supabaseAnonKey: pick(runtime.supabaseAnonKey, import.meta.env.VITE_SUPABASE_ANON_KEY),
    privateAreaUrl:
      pick(runtime.privateAreaUrl, import.meta.env.VITE_PRIVATE_AREA_URL) || DEFAULT_PRIVATE_AREA_URL,
  });
}

export const runtimeConfig: RuntimeConfig = loadConfig();
