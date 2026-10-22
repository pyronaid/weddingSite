import { messagesOf } from '../../i18n';
import { rsvpMessages } from './messages';
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
  const t = messagesOf(rsvpMessages);

  if (!input.fullName) errors.fullName = t.nameMissing;
  else if (input.fullName.length > LIMITS.fullName) errors.fullName = t.nameTooLong;

  if (!input.email) errors.email = t.emailMissing;
  else if (input.email.length > LIMITS.email || !EMAIL_RE.test(input.email))
    errors.email = t.emailInvalid;

  if (input.attending !== 'yes' && input.attending !== 'no')
    errors.attending = t.attendingMissing;

  if (input.attending === 'yes') {
    if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > maxGuests)
      errors.guests = t.guestsRange(maxGuests);
  }

  if (input.dietaryNotes.length > LIMITS.dietaryNotes) errors.dietaryNotes = t.textTooLong;
  if (input.message.length > LIMITS.message) errors.message = t.messageTooLong;

  return errors;
}
