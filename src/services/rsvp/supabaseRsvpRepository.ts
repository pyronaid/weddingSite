import type { SupabaseClient } from '@supabase/supabase-js';
import { RsvpSubmissionError, type RsvpRepository, type RsvpSubmission } from './types';

const TABLE = 'rsvps';

export class SupabaseRsvpRepository implements RsvpRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async submit(rsvp: RsvpSubmission): Promise<void> {
    // No `.select()` on purpose: RLS only grants INSERT to anonymous users,
    // so guests can never read other people's answers.
    const { error } = await this.client.from(TABLE).insert({
      full_name: rsvp.fullName,
      email: rsvp.email,
      attending: rsvp.attending === 'yes',
      guests: rsvp.guests,
      dietary_notes: rsvp.dietaryNotes || null,
      message: rsvp.message || null,
    });

    if (error) {
      throw new RsvpSubmissionError('Unable to save your confirmation. Please try again later.', {
        cause: error,
      });
    }
  }
}
