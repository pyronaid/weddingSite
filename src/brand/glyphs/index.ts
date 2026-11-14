import type { GlyphFonts } from '../monogram';

let loading: Promise<GlyphFonts> | null = null;

/** The letter outlines of the three monogram fonts (~70 kB), loaded once, on first use. */
export function loadGlyphFonts(): Promise<GlyphFonts> {
  loading ??= Promise.all([import('./script'), import('./sans'), import('./serif')])
    .then(([{ script }, { sans }, { serif }]) => ({ script, sans, serif }))
    .catch((error: unknown) => {
      loading = null; // try again next time
      throw error;
    });
  return loading;
}
