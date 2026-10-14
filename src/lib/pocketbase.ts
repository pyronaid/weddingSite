import PocketBase from 'pocketbase';
import { runtimeConfig } from '../config/runtimeConfig';

let client: PocketBase | null | undefined;

/**
 * Lazily creates the single shared PocketBase client.
 * Returns `null` when no backend URL is configured, so the public page still
 * renders (e.g. while designing locally without a backend).
 *
 * The default LocalAuthStore persists the session in localStorage and keeps
 * multiple tabs in sync.
 */
export function getPocketBase(): PocketBase | null {
  if (client !== undefined) return client;

  client = runtimeConfig.pocketbaseUrl ? new PocketBase(runtimeConfig.pocketbaseUrl) : null;
  // Auto-cancellation aborts duplicated requests, which surprises React
  // StrictMode double effects; we handle concurrency in the UI instead.
  client?.autoCancellation(false);

  return client;
}
