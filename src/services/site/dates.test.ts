import { daysUntil, isTimeZone, isoToLocalInput, localInputToIso } from './dates';

describe('wedding time zone dates', () => {
  it('stores a wall-clock time with the right offset, summer or winter', () => {
    expect(localInputToIso('2027-06-19T16:00', 'Europe/Rome')).toBe('2027-06-19T16:00:00+02:00');
    expect(localInputToIso('2027-01-09T16:00', 'Europe/Rome')).toBe('2027-01-09T16:00:00+01:00');
    expect(localInputToIso('2027-06-19T16:00', 'America/New_York')).toBe('2027-06-19T16:00:00-04:00');
    expect(localInputToIso('2027-06-19T16:00', 'UTC')).toBe('2027-06-19T16:00:00+00:00');
  });

  it('shows a stored date as the wall-clock time of the wedding, whatever the browser zone', () => {
    expect(isoToLocalInput('2027-06-19T16:00:00+02:00', 'Europe/Rome')).toBe('2027-06-19T16:00');
    expect(isoToLocalInput('2027-06-19T14:00:00Z', 'Europe/Rome')).toBe('2027-06-19T16:00');
    expect(isoToLocalInput('not a date', 'Europe/Rome')).toBe('');
  });

  it('round-trips', () => {
    const iso = localInputToIso('2027-10-31T11:30', 'Europe/Rome');
    expect(isoToLocalInput(iso, 'Europe/Rome')).toBe('2027-10-31T11:30');
  });

  it('gives an empty value, never an exception, for an unknown time zone', () => {
    expect(localInputToIso('2027-06-19T16:00', 'Europe/Atlantis')).toBe('');
    expect(isoToLocalInput('2027-06-19T16:00:00+02:00', 'Europe/Atlantis')).toBe('');
  });

  it('recognises time zones', () => {
    expect(isTimeZone('Europe/Rome')).toBe(true);
    expect(isTimeZone('Europe/Atlantis')).toBe(false);
    expect(isTimeZone('')).toBe(false);
  });
});

describe('daysUntil', () => {
  const wedding = '2027-06-19T16:00:00+02:00';

  it('counts calendar days in the wedding time zone', () => {
    expect(daysUntil(wedding, 'Europe/Rome', new Date('2027-06-18T23:30:00+02:00'))).toBe(1);
    // Ten minutes later it is the 19th in Rome: the day itself.
    expect(daysUntil(wedding, 'Europe/Rome', new Date('2027-06-19T00:10:00+02:00'))).toBe(0);
    expect(daysUntil(wedding, 'Europe/Rome', new Date('2027-06-20T09:00:00+02:00'))).toBe(-1);
    // Across the change to summer time.
    expect(daysUntil(wedding, 'Europe/Rome', new Date('2027-03-01T12:00:00+01:00'))).toBe(110);
  });

  it('gives up on a broken date or time zone', () => {
    expect(daysUntil('soon', 'Europe/Rome')).toBeNull();
    expect(daysUntil(wedding, 'Europe/Atlantis')).toBeNull();
  });
});
