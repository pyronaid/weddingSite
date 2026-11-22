import { border, CANVAS, isBorderStyle, type BorderStyle } from './borders';
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
  /** Each letter moved and resized by hand (the [+][^][-] [<][v][>] buttons). */
  adjustments: [LetterAdjustment, LetterAdjustment];
}

/**
 * A letter moved and resized from where the layout puts it: x and y in steps
 * of ADJUST.moveStep of the letters' area (right and down are positive), size
 * in % (100 = as laid out).
 */
export interface LetterAdjustment {
  x: number;
  y: number;
  size: number;
}

export const ADJUST = {
  /** One move: this fraction of the width of the letters' area. */
  moveStep: 0.02,
  /** At most this many steps away, in each direction. */
  maxSteps: 50,
  /** One resize: this many %, between the limits. */
  sizeStep: 5,
  minSize: 50,
  maxSize: 200,
};

export const NO_ADJUSTMENT: LetterAdjustment = { x: 0, y: 0, size: 100 };
const isNeutral = (a: LetterAdjustment) => a.x === 0 && a.y === 0 && a.size === 100;

/**
 * The choices that lay the letters out again. Moves and resizes are a final
 * touch made for one layout, so picking any of these puts both letters back.
 * Letters, colours and the separator's own text keep them: the letters' boxes
 * stay where they are.
 */
export const STYLE_FIELDS = ['arrangement', 'separator', 'font', 'border'] as const;

/** Applies `changes`; when a style choice really changes, the letters lose their moves and resizes. */
export function restyle(design: MonogramDesign, changes: Partial<MonogramDesign>): MonogramDesign {
  const next = { ...design, ...changes };
  const newStyle = STYLE_FIELDS.some((field) => next[field] !== design[field]);
  return newStyle ? { ...next, adjustments: [NO_ADJUSTMENT, NO_ADJUSTMENT] } : next;
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
  adjustments: [NO_ADJUSTMENT, NO_ADJUSTMENT],
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
/** Scale factors (often below 1) need more digits than positions, or the drawing shifts. */
const ns = (value: number) => Math.round(value * 10000) / 10000;

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
  /** Which letter it is (the separator has none). */
  letter?: 0 | 1;
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

/**
 * The shares of the width of spaced letters (side by side or diagonal), in %.
 * Both letters get the same box, the width of the wider one, symmetric
 * around the middle of the logo, where the separator is. Each letter leans
 * towards the middle: the first against the right side of its box, the
 * second against the left side of its own, so they always face each other
 * across the same gap (or separator), whatever their widths.
 */
export const SPACING = {
  /** Without a separator: 46 | 8 | 46. */
  plain: { letter: 46, gap: 8 },
  /** With one: 40 | 2.5 | 15 | 2.5 | 40. */
  separated: { letter: 40, gap: 2.5, separator: 15 },
};

/** The items, and the horizontal centre of their boxes (the logo is centred on it). */
interface Layout {
  items: Item[];
  centerX?: number;
}

/** An item moved so that its outline ends at x (its height unchanged). */
const endingAt = (item: Item, x: number): Item => ({ ...item, x: x - item.box[2] * item.scale });

/** An item moved so that its outline starts at x (its height unchanged). */
const startingAt = (item: Item, x: number): Item => ({ ...item, x: x - item.box[0] * item.scale });

/** The separator centred on (cx, cy), at most `size` tall and `maxWidth` wide. */
function fittedSeparator(
  design: MonogramDesign,
  glyphs: GlyphFont,
  size: number,
  maxWidth: number,
  cx: number,
  cy: number,
) {
  const probe = separatorItem(design, glyphs, size, cx, cy);
  if (!probe) return null;
  const w = width(probe);
  return w > maxWidth ? separatorItem(design, glyphs, (size * maxWidth) / w, cx, cy) : probe;
}

/** Places the letters (and separator) in em units, before fitting them into the canvas. */
function layout(design: MonogramDesign, glyphs: GlyphFont): Layout {
  const [one, two] = design.letters.map((letter) => letter.trim().slice(0, 1));
  const first: Item | null = one ? { ...character(design.font, glyphs, one, design.colors[0]), letter: 0 } : null;
  const second: Item | null = two ? { ...character(design.font, glyphs, two, design.colors[1]), letter: 1 } : null;
  if (!first || !second) return { items: [first, second].filter((item): item is Item => item !== null) };

  // Height of a capital in this font (the first letter's top to the baseline).
  const cap = Math.max(-first.box[1], -second.box[1], 500);

  if (design.arrangement === 'crossed') {
    // The second letter over the right part of the first, a little lower.
    const a = { ...first, x: -first.box[0] };
    const overlap = 0.42 * Math.min(width(first), width(second));
    const b = { ...second, x: bounds(a).right - overlap - second.box[0], y: cap * 0.1 };
    return { items: [{ ...a, masked: true }, b] };
  }

  const hasSeparator = design.separator !== 'none';
  const shares = hasSeparator ? SPACING.separated : SPACING.plain;
  // One box per letter, as wide as the wider letter: unit = 1% of the whole width.
  const box = Math.max(width(first), width(second));
  const unit = box / shares.letter;
  const sepBox = hasSeparator ? SPACING.separated.separator * unit : 0;
  const sepSize = cap * 0.9;

  if (design.arrangement === 'aligned') {
    // Box centres: the first at 0, the second one box (+ gaps and separator) further.
    const step = box + (hasSeparator ? 2 * shares.gap * unit + sepBox : shares.gap * unit);
    // The first letter against the right side of its box, the second against the left side of its own.
    const items: Item[] = [endingAt(first, box / 2)];
    if (hasSeparator) {
      const sep = fittedSeparator(design, glyphs, sepSize, sepBox, step / 2, -cap / 2);
      if (sep) items.push(sep);
    }
    items.push(startingAt(second, step - box / 2));
    return { items, centerX: step / 2 };
  }

  // Diagonal: the second box down and to the right. Script letters may come
  // closer (their swashes interlace); the separator midway between the boxes.
  const script = design.font === 'script';
  const across = box * (script ? 0.78 : 1.02) + (hasSeparator ? 2 * shares.gap * unit + sepBox : 0);
  const down = cap * (script ? 0.62 : 0.78) + (hasSeparator ? cap * 0.08 : 0);
  const items: Item[] = [endingAt(first, box / 2)];
  if (hasSeparator) {
    // Script separators are slimmer: a little bigger to balance.
    const sep = fittedSeparator(design, glyphs, sepSize * (script ? 1 : 0.7), sepBox, across / 2, down / 2 - cap / 2);
    if (sep) items.push(sep);
  }
  items.push({ ...startingAt(second, across - box / 2), y: down });
  return { items, centerX: across / 2 };
}

function renderItem(item: Item & { parts?: Item[] }, design: MonogramDesign, maskId: string): string {
  const transform = `translate(${n(item.x)} ${n(item.y)}) scale(${ns(item.scale)})`;
  if (item.parts) {
    return `<g transform="${transform}">${item.parts.map((part) => renderItem(part, design, maskId)).join('')}</g>`;
  }
  const mask = item.masked ? ` mask="url(#${maskId})"` : '';
  if (item.d) return `<path transform="${transform}" d="${item.d}" fill="${item.fill}"${mask}/>`;
  return `<text transform="${transform}" font-family="${escapeXml(FONT_FAMILIES[design.font])}" font-size="1000" fill="${item.fill}"${mask}>${escapeXml(item.text ?? '')}</text>`;
}

interface Placement {
  frame: ReturnType<typeof border>;
  /** The items, each letter moved and resized as adjusted (em units). */
  items: Item[];
  /** em units -> canvas: canvas = t + scale * em. */
  scale: number;
  tx: number;
  ty: number;
}

/**
 * Where everything goes: the layout fitted into the room the border leaves,
 * centred; then each letter moved and resized as adjusted. The adjustments
 * come after the fit, so moving or resizing one letter changes nothing else.
 */
function place(design: MonogramDesign, fonts: GlyphFonts, idPrefix: string): Placement {
  const frame = border(design.border, design.borderColor, idPrefix);
  const { items, centerX } = layout(design, fonts[design.font]);
  if (items.length === 0) return { frame, items, scale: 1, tx: 0, ty: 0 };

  const all = items.map(bounds);
  let left = Math.min(...all.map((b) => b.left));
  let right = Math.max(...all.map((b) => b.right));
  const top = Math.min(...all.map((b) => b.top));
  const bottom = Math.max(...all.map((b) => b.bottom));
  if (centerX !== undefined) {
    // Spaced letters: centred on their boxes, not on the ink (symmetric logo,
    // separator in the middle), wide enough for whatever sticks out.
    const half = Math.max(centerX - left, right - centerX);
    left = centerX - half;
    right = centerX + half;
  }
  const w = right - left;
  const h = bottom - top;
  const { shape, size } = frame.room;
  const scale = shape === 'circle' ? (2 * size) / Math.hypot(w, h) : (2 * size) / Math.max(w, h);
  const tx = CANVAS / 2 - ((left + right) / 2) * scale;
  const ty = CANVAS / 2 - ((top + bottom) / 2) * scale;

  // One move step, in em units (a share of the width of the letters' area).
  const step = (ADJUST.moveStep * 2 * size) / scale;
  const adjusted = items.map((item) => {
    const adjustment = item.letter === undefined ? undefined : design.adjustments[item.letter];
    if (!adjustment || isNeutral(adjustment)) return item;
    // Resized around the middle of its outline, then moved.
    const factor = adjustment.size / 100;
    const cx = item.x + ((item.box[0] + item.box[2]) / 2) * item.scale;
    const cy = item.y + ((item.box[1] + item.box[3]) / 2) * item.scale;
    const s = item.scale * factor;
    return {
      ...item,
      scale: s,
      x: cx - ((item.box[0] + item.box[2]) / 2) * s + adjustment.x * step,
      y: cy - ((item.box[1] + item.box[3]) / 2) * s + adjustment.y * step,
    };
  });
  return { frame, items: adjusted, scale, tx, ty };
}

/**
 * Whether a letter (0 or 1) lies entirely inside the letters' area: the
 * circle or square the border leaves free (the whole canvas without one).
 * Measured on its outline's box, so the check is on the safe side.
 */
export function letterFitsArea(design: MonogramDesign, fonts: GlyphFonts, letter: 0 | 1): boolean {
  const { frame, items, scale, tx, ty } = place(design, fonts, 'check');
  const item = items.find((candidate) => candidate.letter === letter);
  if (!item) return true;
  const b = bounds(item);
  const corners = [
    [tx + b.left * scale, ty + b.top * scale],
    [tx + b.right * scale, ty + b.top * scale],
    [tx + b.left * scale, ty + b.bottom * scale],
    [tx + b.right * scale, ty + b.bottom * scale],
  ];
  // A unit of tolerance: the fitted layout touches the area's edge.
  const { shape, size } = frame.room;
  const c = CANVAS / 2;
  return corners.every(([x, y]) =>
    shape === 'circle'
      ? Math.hypot(x - c, y - c) <= size + 1
      : Math.abs(x - c) <= size + 1 && Math.abs(y - c) <= size + 1,
  );
}

/** viewBox and drawing of a monogram, to place inside another SVG (e.g. an invitation). */
export function monogramParts(design: MonogramDesign, fonts: GlyphFonts, idPrefix = 'monogram') {
  const { frame, items, scale, tx, ty } = place(design, fonts, idPrefix);
  const maskId = `${idPrefix}-gap`;

  let body = frame.svg;
  if (items.length > 0) {
    const crossed = design.arrangement === 'crossed' && items.length === 2 && items[1].d;
    // A gap of GAP canvas units on each side of the second letter, whatever the fit.
    const GAP = 11;
    const defs = crossed
      ? `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="-${CANVAS}" y="-${CANVAS}" width="${4 * CANVAS}" height="${4 * CANVAS}">` +
        `<rect x="-${CANVAS}" y="-${CANVAS}" width="${4 * CANVAS}" height="${4 * CANVAS}" fill="#fff"/>` +
        // The second letter, in the first one's own coordinates (the mask applies to it).
        `<path transform="translate(${n((items[1].x - items[0].x) / items[0].scale)} ${n((items[1].y - items[0].y) / items[0].scale)}) scale(${ns(items[1].scale / items[0].scale)})" d="${items[1].d}" stroke="#000" stroke-width="${n((2 * GAP) / (scale * items[1].scale))}" stroke-linejoin="round"/>` +
        `</mask></defs>`
      : '';
    const content = items.map((item) => renderItem(item, design, maskId)).join('');
    body += `<g transform="translate(${n(tx)} ${n(ty)}) scale(${ns(scale)})">${defs}${content}</g>`;
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
  const adjustments = Array.isArray(r.adjustments) ? r.adjustments : [];
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
      : d.border,
    borderColor: sanitizeColor(r.borderColor, d.borderColor),
    adjustments: [sanitizeAdjustment(adjustments[0]), sanitizeAdjustment(adjustments[1])],
  };
}

/** Whole steps within the limits; anything else: not adjusted. */
function sanitizeAdjustment(raw: unknown): LetterAdjustment {
  const r = record(raw);
  const steps = (value: unknown) =>
    typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= ADJUST.maxSteps ? value : 0;
  const size =
    typeof r.size === 'number' &&
    r.size >= ADJUST.minSize &&
    r.size <= ADJUST.maxSize &&
    (r.size - ADJUST.minSize) % ADJUST.sizeStep === 0
      ? r.size
      : 100;
  return { x: steps(r.x), y: steps(r.y), size };
}
