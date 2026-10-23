/** "IT60X0542811101000000123456" -> "IT60 X054 2811 1010 0000 0123 456" */
export function formatIban(iban: string): string {
  return compactIban(iban).replace(/(.{4})(?=.)/g, '$1 ');
}

/** Removes spaces and upper-cases, which is the canonical form to copy/paste. */
export function compactIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/** In the wedding's time zone, so every guest reads the same day wherever they are. */
export function formatWeddingDate(iso: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDeadline(isoDate: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${isoDate}T12:00:00`),
  );
}

export function mapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function mapsDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * ISO 13616 check: country, check digits, account; the rearranged number
 * modulo 97 must be 1. Catches typos before the IBAN is shown to guests
 * (the server runs the same check).
 */
export function isValidIban(iban: string): boolean {
  const compact = compactIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(compact)) return false;
  const digits = (compact.slice(4) + compact.slice(0, 4)).replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (let index = 0; index < digits.length; index += 7) {
    remainder = Number(String(remainder) + digits.slice(index, index + 7)) % 97;
  }
  return remainder === 1;
}
