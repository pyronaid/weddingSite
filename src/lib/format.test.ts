import { compactIban, formatIban, mapsEmbedUrl } from './format';

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
