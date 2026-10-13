import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { runtimeConfig } from '../config/runtimeConfig';

let client: SupabaseClient | null | undefined;

/**
 * Lazily creates a single shared Supabase client.
 * Returns `null` when Supabase is not configured, so the app still renders
 * (e.g. while designing the page locally without a backend).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const { supabaseUrl, supabaseAnonKey } = runtimeConfig;
  client =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey, {
          // Guests are anonymous: no session to persist or refresh.
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  return client;
}
