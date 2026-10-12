export type Attendance = 'yes' | 'no';

/** Shape of the data collected by the confirmation form. */
export interface RsvpSubmission {
  fullName: string;
  email: string;
  attending: Attendance;
  guests: number;
  dietaryNotes: string;
  message: string;
}

/**
 * Persistence abstraction: the UI depends only on this interface, so the
 * backend (Supabase, PocketBase, a custom API...) can be swapped by adding a
 * new implementation and changing the factory in ./index.ts.
 */
export interface RsvpRepository {
  submit(rsvp: RsvpSubmission): Promise<void>;
}

export class RsvpSubmissionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RsvpSubmissionError';
  }
}
