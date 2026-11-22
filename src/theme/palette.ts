/**
 * The site's colour palette: the colour tokens of src/styles/global.css that
 * the super admin can change (Site settings → Colours). Saved with the site
 * content, so every visitor gets it; applied as CSS custom properties on
 * <html>, overriding the defaults of global.css (the same values as
 * DEFAULT_PALETTE: a test keeps them in step).
 */

export const PALETTE_KEYS = [
  'pageEdge',
  'pageBand',
  'pageLight',
  'text',
  'accent',
  'accentStrong',
  'cardBg',
  'cardText',
  'cardMuted',
  'cardAccent',
] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;

/** The CSS custom property of each colour. */
export const PALETTE_VARS: Record<PaletteKey, `--${string}`> = {
  pageEdge: '--page-edge',
  pageBand: '--page-band',
  pageLight: '--page-light',
  text: '--text',
  accent: '--accent',
  accentStrong: '--accent-strong',
  cardBg: '--card-bg',
  cardText: '--card-text',
  cardMuted: '--card-muted',
  cardAccent: '--card-accent',
};

/** The colours the site was made with. */
export const DEFAULT_PALETTE: Palette = {
  pageEdge: '#f9cfdd',
  pageBand: '#fde7ef',
  pageLight: '#fffaf7',
  text: '#4a2537',
  accent: '#e88aa8',
  accentStrong: '#c24f78',
  cardBg: '#6d3350',
  cardText: '#fff7f2',
  cardMuted: '#f3d6e1',
  cardAccent: '#ffc2d6',
};

/** Ready-made palettes, each easy to read (a test checks their contrast). */
export const PALETTE_PRESETS = {
  pink: DEFAULT_PALETTE,
  sage: {
    pageEdge: '#d9e4cf',
    pageBand: '#eef3e8',
    pageLight: '#fbfcf8',
    text: '#2f3b2a',
    accent: '#8fae7e',
    accentStrong: '#4f7a43',
    cardBg: '#3e5636',
    cardText: '#f7faf3',
    cardMuted: '#dbe6d2',
    cardAccent: '#cfe6b8',
  },
  lavender: {
    pageEdge: '#e2d9f0',
    pageBand: '#f1ecf8',
    pageLight: '#fcfaff',
    text: '#3b2d52',
    accent: '#a58fd0',
    accentStrong: '#6d4fa8',
    cardBg: '#4b3a6e',
    cardText: '#faf7ff',
    cardMuted: '#e0d8f0',
    cardAccent: '#d9c8ff',
  },
  navy: {
    pageEdge: '#d5e5f2',
    pageBand: '#eaf2f9',
    pageLight: '#f9fbfd',
    text: '#22324a',
    accent: '#7fa4cf',
    accentStrong: '#2f5d8c',
    cardBg: '#2f3e5c',
    cardText: '#f5f8fc',
    cardMuted: '#d3deeb',
    cardAccent: '#b9d4f2',
  },
  champagne: {
    pageEdge: '#f3e7cf',
    pageBand: '#f9f2e4',
    pageLight: '#fffcf6',
    text: '#4a3b22',
    accent: '#d1b06b',
    accentStrong: '#8a6527',
    cardBg: '#5c4a2a',
    cardText: '#fffaf0',
    cardMuted: '#eadfc8',
    cardAccent: '#f4d58d',
  },
  mono: {
    pageEdge: '#e6e6e6',
    pageBand: '#f2f2f2',
    pageLight: '#ffffff',
    text: '#222222',
    accent: '#9a9a9a',
    accentStrong: '#4d4d4d',
    cardBg: '#2b2b2b',
    cardText: '#ffffff',
    cardMuted: '#d9d9d9',
    cardAccent: '#f0d9a8',
  },
} satisfies Record<string, Palette>;
export type PalettePreset = keyof typeof PALETTE_PRESETS;
export const PALETTE_PRESET_IDS = Object.keys(PALETTE_PRESETS) as PalettePreset[];

/** Only "#rrggbb": the colours end up in the page's CSS. */
export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

/** A palette as saved (or cached), made safe: every colour checked, the default for the rest. */
export function sanitizePalette(raw: unknown): Palette {
  const r: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const palette = { ...DEFAULT_PALETTE };
  for (const key of PALETTE_KEYS) {
    const value = r[key];
    if (isHexColor(value)) palette[key] = value.toLowerCase();
  }
  return palette;
}

export const samePalette = (a: Palette, b: Palette) => PALETTE_KEYS.every((key) => a[key] === b[key]);

/** The palette as CSS custom properties (e.g. for a preview: `style={paletteStyle(p)}`). */
export function paletteStyle(palette: Palette): Record<string, string> {
  return Object.fromEntries(PALETTE_KEYS.map((key) => [PALETTE_VARS[key], palette[key]]));
}

/**
 * Applies the palette to the whole page: on <html> (it wins over the
 * defaults of global.css), and as the browser bar's colour on phones.
 */
export function applyPalette(palette: Palette, doc: Document = document) {
  const root = doc.documentElement;
  for (const key of PALETTE_KEYS) {
    if (palette[key] === DEFAULT_PALETTE[key]) root.style.removeProperty(PALETTE_VARS[key]);
    else root.style.setProperty(PALETTE_VARS[key], palette[key]);
  }
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.pageEdge);
}

/** `a` moved towards `b` by `amount` (0: a, 1: b), both "#rrggbb": for colours derived from the palette. */
export function mixColours(a: string, b: string, amount: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * amount))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** WCAG relative luminance of "#rrggbb". */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 (none) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The pairs that must stay readable: text needs 4.5:1 (WCAG AA), titles and
 * highlights 3:1. Text on the page is checked on each colour of the gradient.
 */
export const CONTRAST_CHECKS = [
  { id: 'pageText', text: 'text', on: ['pageLight', 'pageBand', 'pageEdge'], min: 4.5 },
  { id: 'pageTitles', text: 'accentStrong', on: ['pageLight', 'pageBand'], min: 3 },
  { id: 'cardText', text: 'cardText', on: ['cardBg'], min: 4.5 },
  { id: 'cardMuted', text: 'cardMuted', on: ['cardBg'], min: 4.5 },
  { id: 'cardAccent', text: 'cardAccent', on: ['cardBg'], min: 3 },
] as const satisfies readonly { id: string; text: PaletteKey; on: readonly PaletteKey[]; min: number }[];
export type ContrastCheck = (typeof CONTRAST_CHECKS)[number]['id'];

export interface ContrastProblem {
  id: ContrastCheck;
  /** The worst ratio found, rounded to one decimal. */
  ratio: number;
  min: number;
}

/** The pairs that are hard to read with this palette. */
export function contrastProblems(palette: Palette): ContrastProblem[] {
  return CONTRAST_CHECKS.flatMap((check) => {
    const ratio = Math.min(...check.on.map((background) => contrastRatio(palette[check.text], palette[background])));
    return ratio < check.min ? [{ id: check.id, ratio: Math.floor(ratio * 10) / 10, min: check.min }] : [];
  });
}
