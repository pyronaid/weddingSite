import type { RsvpSubmission } from './types';

export type RsvpErrors = Partial<Record<keyof RsvpSubmission, string>>;

export const LIMITS = {
  fullName: 120,
  email: 254,
  dietaryNotes: 500,
  message: 1000,
} as const;

// Pragmatic e-mail check: the authoritative check is the confirmation itself.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims strings and normalises the guest count before validation/submission. */
export function normalizeRsvp(input: RsvpSubmission): RsvpSubmission {
  const attending = input.attending;
  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    attending,
    // Nobody is coming if the invitee declined.
    guests: attending === 'yes' ? Math.trunc(Number(input.guests)) : 0,
    dietaryNotes: attending === 'yes' ? input.dietaryNotes.trim() : '',
    message: input.message.trim(),
  };
}

export function validateRsvp(input: RsvpSubmission, maxGuests: number): RsvpErrors {
  const errors: RsvpErrors = {};

  if (!input.fullName) errors.fullName = 'Please tell us your name.';
  else if (input.fullName.length > LIMITS.fullName) errors.fullName = 'Name is too long.';

  if (!input.email) errors.email = 'Please enter your e-mail.';
  else if (input.email.length > LIMITS.email || !EMAIL_RE.test(input.email))
    errors.email = 'Please enter a valid e-mail.';

  if (input.attending !== 'yes' && input.attending !== 'no')
    errors.attending = 'Please let us know if you can come.';

  if (input.attending === 'yes') {
    if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > maxGuests)
      errors.guests = `Number of guests must be between 1 and ${maxGuests}.`;
  }

  if (input.dietaryNotes.length > LIMITS.dietaryNotes) errors.dietaryNotes = 'Text is too long.';
  if (input.message.length > LIMITS.message) errors.message = 'Message is too long.';

  return errors;
}
