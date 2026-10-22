import { compactIban, formatIban, isValidIban, mapsEmbedUrl } from './format';

describe('IBAN formatting', () => {
  it('groups the IBAN in blocks of four', () => {
    expect(formatIban('IT60X0542811101000000123456')).toBe('IT60 X054 2811 1010 0000 0123 456');
  });

  it('compacts spaces and upper-cases', () => {
    expect(compactIban('it60 x054 2811')).toBe('IT60X0542811');
  });
});

describe('maps urls', () => {
  it('encodes the query', () => {
    expect(mapsEmbedUrl('Via Roma 1, Milano')).toContain('q=Via%20Roma%201%2C%20Milano');
  });
});

describe('isValidIban', () => {
  it('accepts valid IBANs, with or without spaces and in any case', () => {
    expect(isValidIban('IT60X0542811101000000123456')).toBe(true);
    expect(isValidIban('de89 3704 0044 0532 0130 00')).toBe(true);
    expect(isValidIban('GB82WEST12345698765432')).toBe(true);
  });

  it('rejects typos and malformed values', () => {
    expect(isValidIban('IT60X0542811101000000123457')).toBe(false);
    expect(isValidIban('IT60')).toBe(false);
    expect(isValidIban('')).toBe(false);
  });
});
