import type { RsvpSubmission } from './types';
import { normalizeRsvp, validateRsvp } from './validation';

const valid: RsvpSubmission = {
  fullName: 'Mario Rossi',
  email: 'mario@example.com',
  attending: 'yes',
  guests: 2,
  dietaryNotes: '',
  message: '',
};

describe('normalizeRsvp', () => {
  it('trims fields and lower-cases the e-mail', () => {
    const result = normalizeRsvp({ ...valid, fullName: '  Mario  ', email: ' Mario@Example.COM ' });
    expect(result.fullName).toBe('Mario');
    expect(result.email).toBe('mario@example.com');
  });

  it('resets guests and dietary notes when declining', () => {
    const result = normalizeRsvp({ ...valid, attending: 'no', guests: 3, dietaryNotes: 'vegan' });
    expect(result.guests).toBe(0);
    expect(result.dietaryNotes).toBe('');
  });
});

describe('validateRsvp', () => {
  it('accepts a valid submission', () => {
    expect(validateRsvp(valid, 5)).toEqual({});
  });

  it('requires name and a valid e-mail', () => {
    const errors = validateRsvp({ ...valid, fullName: '', email: 'nope' }, 5);
    expect(errors.fullName).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it('enforces the guest range only when attending', () => {
    expect(validateRsvp({ ...valid, guests: 6 }, 5).guests).toBeDefined();
    expect(validateRsvp({ ...valid, guests: 0 }, 5).guests).toBeDefined();
    expect(validateRsvp({ ...valid, attending: 'no', guests: 0 }, 5).guests).toBeUndefined();
  });
});
