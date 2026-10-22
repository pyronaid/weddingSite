/**
 * Wall-clock times in the wedding's time zone <-> ISO-8601 with an offset.
 * The super admin types "19 June 2027, 16:00" for Europe/Rome; the site
 * stores 2027-06-19T16:00:00+02:00 (summer time) so the countdown is right
 * for every guest, wherever they are.
 */

/** "2027-06-19T16:00" as seen in `timeZone`. */
function wallClockParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Minutes `timeZone` is ahead of UTC at `instant` (120 for Rome in summer). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const asUtc = Date.parse(`${wallClockParts(instant, timeZone)}:00Z`);
  return Math.round((asUtc - Math.floor(instant.getTime() / 60000) * 60000) / 60000);
}

const pad = (value: number) => String(value).padStart(2, '0');

/** A value for <input type="datetime-local">: the date as seen in the wedding's time zone. */
export function isoToLocalInput(iso: string, timeZone: string): string {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime()) || !isTimeZone(timeZone)) return '';
  return wallClockParts(instant, timeZone);
}

/** "2027-06-19T16:00" in `timeZone` -> "2027-06-19T16:00:00+02:00". */
export function localInputToIso(local: string, timeZone: string): string {
  const naive = Date.parse(`${local}:00Z`);
  if (Number.isNaN(naive) || !isTimeZone(timeZone)) return '';
  // The offset depends on the instant itself (summer/winter time): guess, then correct once.
  let offset = offsetMinutes(new Date(naive), timeZone);
  offset = offsetMinutes(new Date(naive - offset * 60000), timeZone);
  const sign = offset < 0 ? '-' : '+';
  const absolute = Math.abs(offset);
  return `${local}:00${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/** A time zone the browser knows, e.g. "Europe/Rome". */
export function isTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
