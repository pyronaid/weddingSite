/** Outlines of some characters of a font, scaled to 1000 units per em, y down, baseline at 0. */
export interface Glyph {
  /** SVG path data. */
  d: string;
  advance: number;
  /** [left, top, right, bottom] of the outline. */
  box: [number, number, number, number];
}

export interface GlyphFont {
  glyphs: Record<string, Glyph>;
}
