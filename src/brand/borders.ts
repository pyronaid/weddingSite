/**
 * The borders of the monograms: the SVG files in ./borders/. Each file is a
 * style, named after the file ("stile_uno.svg" -> "Stile uno"): to add one,
 * drop the file there and deploy.
 *
 * A border file:
 * - is drawn in one colour (any): it is repainted with the colour chosen on
 *   the site;
 * - may say how much room it leaves for the letters on its <svg> element:
 *   data-room="0.6" (the free circle's diameter, as a fraction of the width;
 *   default 0.6) and data-room-shape="square" for a free square instead;
 * - is scaled to the monogram, keeping its proportions (any size or units).
 *
 * Read as described in ./svgFiles.ts (only drawing gets through).
 */

import { byName, fileLabel, paint, parseSvgFile, type SvgFile } from './svgFiles';

/** The monograms are drawn on a 1000 × 1000 canvas, centred. */
export const CANVAS = 1000;

/** "none", or the name of a border file without ".svg". */
export type BorderStyle = string;

export interface BorderFile extends SvgFile {
  room: { shape: 'circle' | 'square'; fraction: number };
}

export interface Border {
  /** SVG elements, in the border colour. */
  svg: string;
  /** Room left for the letters: a circle of this radius, or a square of this half side (canvas units). */
  room: { shape: 'circle' | 'square'; size: number };
}

const DEFAULT_ROOM = 0.6;

/** "stile_uno" -> "Stile uno". */
export const borderLabel = fileLabel;

/** Reads a border file; null when it is not a usable SVG. */
export function parseBorderFile(id: string, source: string): BorderFile | null {
  const file = parseSvgFile(id, source);
  if (!file) return null;
  const fraction = parseFloat(file.data.room ?? '');
  return {
    ...file,
    room: {
      shape: file.data['room-shape'] === 'square' ? 'square' : 'circle',
      fraction: fraction > 0.1 && fraction <= 1 ? fraction : DEFAULT_ROOM,
    },
  };
}

// Every SVG of the folder, read at build time (a new file needs a deploy).
const sources = import.meta.glob<string>('./borders/*.svg', { query: '?raw', import: 'default', eager: true });

const files = new Map<string, BorderFile>();
for (const [path, source] of Object.entries(sources)) {
  const id = path.replace(/^.*\//, '').replace(/\.svg$/i, '');
  const file = parseBorderFile(id, source);
  if (file) files.set(id, file);
}

export { byName, paint };

/** "none" first, then the files by name. */
export const BORDER_STYLES: BorderStyle[] = ['none', ...[...files.values()].sort(byName).map((file) => file.id)];

export const isBorderStyle = (value: unknown): value is BorderStyle =>
  typeof value === 'string' && (value === 'none' || files.has(value));

export function border(style: BorderStyle, color: string, idPrefix = 'border'): Border {
  const file = style === 'none' ? undefined : files.get(style);
  if (!file) return { svg: '', room: { shape: 'square', size: 390 } };
  return {
    svg: `<svg x="0" y="0" width="${CANVAS}" height="${CANVAS}" viewBox="${file.viewBox}" preserveAspectRatio="xMidYMid meet">${paint(file, color, idPrefix)}</svg>`,
    room: { shape: file.room.shape, size: (file.room.fraction * CANVAS) / 2 },
  };
}
