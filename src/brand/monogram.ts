import { border, CANVAS, isBorderStyle, LEGACY_BORDERS, type BorderStyle } from './borders';
import type { Glyph, GlyphFont } from './glyphs/types';
import { HEART_PATH } from './ornaments';

/**
 * The couple's monogram: two letters, how they are arranged, an optional
 * separator and an optional border, each with its colour. Letters are drawn
 * from the font outlines (src/brand/glyphs), so the logo looks the same
 * everywhere, with or without the fonts installed. Pure: same output in the
 * browser, in the print files and in the tests.
 */

export type MonogramFont = 'script' | 'sans' | 'serif';
export const MONOGRAM_FONTS: MonogramFont[] = ['script', 'sans', 'serif'];

/** Crossed: overlapped. Aligned: side by side. Diagonal: the second lower, on the right. */
export type Arrangement = 'crossed' | 'aligned' | 'diagonal';
export const ARRANGEMENTS: Arrangement[] = ['crossed', 'aligned', 'diagonal'];

export type Separator = 'none' | 'ampersand' | 'bar' | 'heart' | 'custom';
export const SEPARATORS: Separator[] = ['none', 'ampersand', 'bar', 'heart', 'custom'];

export interface MonogramDesign {
  letters: [string, string];
  colors: [string, string];
  arrangement: Arrangement;
  /** Between spaced letters (not when crossed). */
  separator: Separator;
  customSeparator: string;
  separatorColor: string;
  font: MonogramFont;
  border: BorderStyle;
  borderColor: string;
}

export type GlyphFonts = Record<MonogramFont, GlyphFont>;

export const DEFAULT_MONOGRAM: MonogramDesign = {
  letters: ['G', 'V'],
  colors: ['#6d3350', '#c24f78'],
  arrangement: 'crossed',
  separator: 'none',
  customSeparator: '',
  separatorColor: '#c24f78',
  font: 'script',
  border: 'none',
  borderColor: '#6d3350',
};

/** Fallback when a character has no outline here: real text in the site fonts (embedded on export). */
const FONT_FAMILIES: Record<MonogramFont, string> = {
  script: "'Great Vibes', cursive",
  sans: "'Lato', sans-serif",
  serif: "'Tinos', 'Times New Roman', serif",
};

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
const n = (value: number) => Math.round(value * 100) / 100;

/** One drawn element, in "em units" (1000 per em) before the final fit. */
interface Item {
  /** Path data (a glyph or the heart), or a text fallback. */
  d?: string;
  text?: string;
  x: number;
  y: number;
  scale: number;
  /** Outline box at scale 1, relative to (x, y). */
  box: [number, number, number, number];
  fill: string;
  /** The first letter, when crossed: cut where the second one passes. */
  masked?: boolean;
}

const bounds = (item: Item) => ({
  left: item.x + item.box[0] * item.scale,
  top: item.y + item.box[1] * item.scale,
  right: item.x + item.box[2] * item.scale,
  bottom: item.y + item.box[3] * item.scale,
});

/** A character as an item: its outline, or text when the font table lacks it. */
function character(font: MonogramFont, glyphs: GlyphFont, char: string, fill: string): Item {
  const glyph: Glyph | undefined = glyphs.glyphs[char.toLocaleUpperCase()] ?? glyphs.glyphs[char];
  if (glyph) return { d: glyph.d, x: 0, y: 0, scale: 1, box: glyph.box, fill };
  // Approximate box of a capital in `font`: enough to place it.
  return { text: char, x: 0, y: 0, scale: 1, box: [0, font === 'script' ? -750 : -700, 650, 0], fill };
}

const width = (item: Item) => (item.box[2] - item.box[0]) * item.scale;
const height = (item: Item) => (item.box[3] - item.box[1]) * item.scale;

/** Moves an item so that its outline's centre is at (cx, cy). */
function centreAt(item: Item, cx: number, cy: number): Item {
  return {
    ...item,
    x: cx - ((item.box[0] + item.box[2]) / 2) * item.scale,
    y: cy - ((item.box[1] + item.box[3]) / 2) * item.scale,
  };
}

/** The separator, about `size` tall, centred on (cx, cy). */
function separatorItem(design: MonogramDesign, glyphs: GlyphFont, size: number, cx: number, cy: number): Item | null {
  const fill = design.separatorColor;
  let item: Item;
  switch (design.separator) {
    case 'heart':
      item = { d: HEART_PATH, x: 0, y: 0, scale: 1, box: [-575, -475, 575, 425], fill };
      item.scale = (size * 0.55) / height(item);
      break;
    case 'ampersand':
    case 'bar':
    case 'custom': {
      const text =
        design.separator === 'ampersand' ? '&' : design.separator === 'bar' ? '|' : design.customSeparator.trim();
      if (!text) return null;
      // Several characters: drawn one after the other.
      const parts = [...text].map((char) => character(design.font, glyphs, char, fill));
      let cursor = 0;
      const placed = parts.map((part) => {
        const at = { ...part, x: cursor - part.box[0] };
        cursor += part.box[2] - part.box[0] + 40;
        return at;
      });
      const top = Math.min(...placed.map((part) => part.box[1]));
      const bottom = Math.max(...placed.map((part) => part.box[3]));
      const target = design.separator === 'bar' ? size : size * 0.62;
      const scale = target / (bottom - top);
      const total = cursor - 40;
      return {
        // Grouped as one item: a composite path list is easier to place.
        d: undefined,
        text: undefined,
        x: cx - (total / 2) * scale,
        y: cy - ((top + bottom) / 2) * scale,
        scale,
        box: [0, top, total, bottom],
        fill,
        ...{ parts: placed },
      } as Item & { parts: Item[] };
    }
    default:
      return null;
  }
  return centreAt(item, cx, cy);
}

/** Places the letters (and separator) in em units, before fitting them into the canvas. */
function layout(design: MonogramDesign, glyphs: GlyphFont): Item[] {
  const [one, two] = design.letters.map((letter) => letter.trim().slice(0, 1));
  const first = one ? character(design.font, glyphs, one, design.colors[0]) : null;
  const second = two ? character(design.font, glyphs, two, design.colors[1]) : null;
  if (!first || !second) return [first, second].filter((item): item is Item => item !== null);

  // Height of a capital in this font (the first letter's top to the baseline).
  const cap = Math.max(-first.box[1], -second.box[1], 500);
  const a = { ...first, x: -first.box[0] };

  if (design.arrangement === 'crossed') {
    // The second letter over the right part of the first, a little lower.
    const overlap = 0.42 * Math.min(width(first), width(second));
    const b = { ...second, x: bounds(a).right - overlap - second.box[0], y: cap * 0.1 };
    return [{ ...a, masked: true }, b];
  }

  const gap = cap * (design.font === 'script' ? 0.05 : 0.14);
  const hasSeparator = design.separator !== 'none';
  const sepSize = cap * 0.9;

  if (design.arrangement === 'aligned') {
    const middle = -cap / 2;
    let cursor = bounds(a).right + gap;
    const items: Item[] = [a];
    if (hasSeparator) {
      const probe = separatorItem(design, glyphs, sepSize, 0, middle);
      if (probe) {
        const w = width(probe);
        const sep = separatorItem(design, glyphs, sepSize, cursor + gap + w / 2, middle)!;
        items.push(sep);
        cursor += w + 3 * gap;
      }
    }
    items.push({ ...second, x: cursor - second.box[0] });
    return items;
  }

  // Diagonal: the second letter down and to the right. Script letters may touch
  // (their swashes interlace); the others stay apart, the separator in between.
  const script = design.font === 'script';
  const items: Item[] = [a];
  let dx = bounds(a).right - (script ? 0.22 : -0.02) * width(second) - second.box[0];
  let dy = cap * (script ? 0.62 : 0.78);
  if (hasSeparator) {
    // Script separators are slimmer: a little bigger to balance.
    const size = sepSize * (script ? 1 : 0.7);
    const probe = separatorItem(design, glyphs, size, 0, 0);
    if (probe) {
      const w = width(probe);
      // Between the bottom right of the first letter and the top left of the second one.
      const sep = separatorItem(design, glyphs, size, bounds(a).right + gap + w / 2, cap * 0.1)!;
      items.push(sep);
      dx += w + 2 * gap;
      dy += cap * 0.08;
    }
  }
  items.push({ ...second, x: dx, y: dy });
  return items;
}

function renderItem(item: Item & { parts?: Item[] }, design: MonogramDesign, maskId: string): string {
  const transform = `translate(${n(item.x)} ${n(item.y)}) scale(${n(item.scale)})`;
  if (item.parts) {
    return `<g transform="${transform}">${item.parts.map((part) => renderItem(part, design, maskId)).join('')}</g>`;
  }
  const mask = item.masked ? ` mask="url(#${maskId})"` : '';
  if (item.d) return `<path transform="${transform}" d="${item.d}" fill="${item.fill}"${mask}/>`;
  return `<text transform="${transform}" font-family="${escapeXml(FONT_FAMILIES[design.font])}" font-size="1000" fill="${item.fill}"${mask}>${escapeXml(item.text ?? '')}</text>`;
}

/** viewBox and drawing of a monogram, to place inside another SVG (e.g. an invitation). */
export function monogramParts(design: MonogramDesign, fonts: GlyphFonts, idPrefix = 'monogram') {
  const frame = border(design.border, design.borderColor, idPrefix);
  const items = layout(design, fonts[design.font]);
  const maskId = `${idPrefix}-gap`;

  let body = frame.svg;
  if (items.length > 0) {
    // Fit everything into the room the border leaves, centred.
    const all = items.map(bounds);
    const left = Math.min(...all.map((b) => b.left));
    const right = Math.max(...all.map((b) => b.right));
    const top = Math.min(...all.map((b) => b.top));
    const bottom = Math.max(...all.map((b) => b.bottom));
    const w = right - left;
    const h = bottom - top;
    const { shape, size } = frame.room;
    const scale = shape === 'circle' ? (2 * size) / Math.hypot(w, h) : (2 * size) / Math.max(w, h);
    const tx = CANVAS / 2 - ((left + right) / 2) * scale;
    const ty = CANVAS / 2 - ((top + bottom) / 2) * scale;

    const crossed = design.arrangement === 'crossed' && items.length === 2 && items[1].d;
    // A gap of GAP canvas units on each side of the second letter, whatever the fit.
    const GAP = 11;
    const defs = crossed
      ? `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="-${CANVAS}" y="-${CANVAS}" width="${4 * CANVAS}" height="${4 * CANVAS}">` +
        `<rect x="-${CANVAS}" y="-${CANVAS}" width="${4 * CANVAS}" height="${4 * CANVAS}" fill="#fff"/>` +
        // The second letter, in the first one's own coordinates (the mask applies to it).
        `<path transform="translate(${n((items[1].x - items[0].x) / items[0].scale)} ${n((items[1].y - items[0].y) / items[0].scale)}) scale(${n(items[1].scale / items[0].scale)})" d="${items[1].d}" stroke="#000" stroke-width="${n((2 * GAP) / (scale * items[1].scale))}" stroke-linejoin="round"/>` +
        `</mask></defs>`
      : '';
    const content = items.map((item) => renderItem(item, design, maskId)).join('');
    body += `<g transform="translate(${n(tx)} ${n(ty)}) scale(${n(scale)})">${defs}${content}</g>`;
  }
  return { viewBox: `0 0 ${CANVAS} ${CANVAS}`, body };
}

/** A standalone SVG file of the monogram (square). `size` sets its width/height, e.g. "60mm" or 1024. */
export function monogramSvg(
  design: MonogramDesign,
  fonts: GlyphFonts,
  { size = 1024, title, background }: { size?: number | string; title?: string; background?: string } = {},
): string {
  const { viewBox, body } = monogramParts(design, fonts);
  const name = title ?? design.letters.join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" role="img">
<title>${escapeXml(name)}</title>
${background ? `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>` : ''}${body}
</svg>
`;
}

const HEX = /^#[0-9a-f]{6}$/i;
const record = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
export const sanitizeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : fallback;
export const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/**
 * A design as loaded from storage, made safe to draw: every field checked,
 * anything unknown or malformed replaced by the default. (Colours end up in
 * SVG attributes: only #rrggbb gets through.)
 */
export function sanitizeMonogram(raw: unknown): MonogramDesign {
  const d = DEFAULT_MONOGRAM;
  const r = record(raw);
  const letter = (value: unknown, fallback: string) =>
    typeof value === 'string' ? [...value.trim()].slice(0, 1).join('').toLocaleUpperCase() : fallback;
  const letters = Array.isArray(r.letters) ? r.letters : [];
  const colors = Array.isArray(r.colors) ? r.colors : [];
  return {
    letters: [letter(letters[0], d.letters[0]), letter(letters[1], d.letters[1])],
    colors: [sanitizeColor(colors[0], d.colors[0]), sanitizeColor(colors[1], d.colors[1])],
    arrangement: oneOf(r.arrangement, ARRANGEMENTS, d.arrangement),
    separator: oneOf(r.separator, SEPARATORS, d.separator),
    customSeparator: typeof r.customSeparator === 'string' ? r.customSeparator.slice(0, 3) : d.customSeparator,
    separatorColor: sanitizeColor(r.separatorColor, d.separatorColor),
    font: oneOf(r.font, MONOGRAM_FONTS, d.font),
    // A border file renamed or deleted: no border. Older names: their file.
    border: isBorderStyle(r.border)
      ? r.border
      : typeof r.border === 'string' && isBorderStyle(LEGACY_BORDERS[r.border])
        ? LEGACY_BORDERS[r.border]
        : d.border,
    borderColor: sanitizeColor(r.borderColor, d.borderColor),
  };
}
