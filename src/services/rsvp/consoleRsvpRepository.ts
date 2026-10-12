import type { RsvpRepository, RsvpSubmission } from './types';

/**
 * Development fallback used when no backend is configured: lets you work on
 * the UI without a Supabase project. Never used when credentials are present.
 */
export class ConsoleRsvpRepository implements RsvpRepository {
  async submit(rsvp: RsvpSubmission): Promise<void> {
    console.warn('[rsvp] Supabase is not configured: submission NOT persisted.', rsvp);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
}
