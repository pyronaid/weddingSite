import { getTimeLeft } from './useCountdown';

describe('getTimeLeft', () => {
  const now = new Date('2027-06-18T15:00:00Z');

  it('splits the remaining time into units', () => {
    const target = new Date('2027-06-20T17:30:45Z'); // 2d 2h 30m 45s later
    expect(getTimeLeft(target, now)).toEqual({ days: 2, hours: 2, minutes: 30, seconds: 45, isOver: false });
  });

  it('is over when the target is in the past or now', () => {
    expect(getTimeLeft(new Date('2027-06-18T14:00:00Z'), now).isOver).toBe(true);
    expect(getTimeLeft(now, now).isOver).toBe(true);
  });

  it('treats an invalid date as over instead of returning NaN', () => {
    expect(getTimeLeft(new Date('not-a-date'), now)).toMatchObject({ days: 0, isOver: true });
  });
});
