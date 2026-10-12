/** "IT60X0542811101000000123456" -> "IT60 X054 2811 1010 0000 0123 456" */
export function formatIban(iban: string): string {
  return compactIban(iban).replace(/(.{4})(?=.)/g, '$1 ');
}

/** Removes spaces and upper-cases, which is the canonical form to copy/paste. */
export function compactIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

export function formatWeddingDate(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
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
