import type PocketBase from 'pocketbase';
import { RsvpSubmissionError, type RsvpRepository, type RsvpSubmission } from './types';

const COLLECTION = 'rsvps';

export class PocketBaseRsvpRepository implements RsvpRepository {
  private readonly pb: PocketBase;

  constructor(pb: PocketBase) {
    this.pb = pb;
  }

  async submit(rsvp: RsvpSubmission): Promise<void> {
    try {
      // `fields: 'id'` keeps the response minimal: the collection's view rule
      // is superuser-only, so guests never read back other people's answers.
      await this.pb.collection(COLLECTION).create(
        {
          full_name: rsvp.fullName,
          email: rsvp.email,
          attending: rsvp.attending === 'yes',
          guests: rsvp.guests,
          dietary_notes: rsvp.dietaryNotes,
          message: rsvp.message,
        },
        { fields: 'id' },
      );
    } catch (error) {
      throw new RsvpSubmissionError('Unable to save your confirmation. Please try again later.', {
        cause: error,
      });
    }
  }
}
