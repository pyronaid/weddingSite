import { runtimeConfig } from '../../config/runtimeConfig';
import { ConsoleRsvpRepository } from './consoleRsvpRepository';
import type { RsvpRepository, RsvpSubmission } from './types';

export * from './types';
export * from './validation';

/**
 * Defers loading supabase-js (~400 kB) until the first submission, keeping
 * the initial page load fast. The module promise is cached after first use.
 */
class LazySupabaseRsvpRepository implements RsvpRepository {
  private delegate?: Promise<RsvpRepository>;

  submit(rsvp: RsvpSubmission): Promise<void> {
    this.delegate ??= Promise.all([
      import('../../lib/supabaseClient'),
      import('./supabaseRsvpRepository'),
    ]).then(([{ getSupabaseClient }, { SupabaseRsvpRepository }]) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase client is not configured');
      return new SupabaseRsvpRepository(client);
    });
    // Don't cache a failed chunk load: allow the user to retry.
    this.delegate.catch(() => (this.delegate = undefined));
    return this.delegate.then((repository) => repository.submit(rsvp));
  }
}

export function createRsvpRepository(): RsvpRepository {
  const { supabaseUrl, supabaseAnonKey } = runtimeConfig;
  return supabaseUrl && supabaseAnonKey ? new LazySupabaseRsvpRepository() : new ConsoleRsvpRepository();
}
