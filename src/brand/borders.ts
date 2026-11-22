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
 * Only drawing gets through: scripts, event handlers, external links,
 * embedded HTML, styles and images are removed.
 */

/** The monograms are drawn on a 1000 × 1000 canvas, centred. */
export const CANVAS = 1000;

/** "none", or the name of a border file without ".svg". */
export type BorderStyle = string;

export interface BorderFile {
  id: string;
  /** The file name, readable: "stile_uno" -> "Stile uno". */
  label: string;
  viewBox: string;
  /** The drawing, cleaned (ids still to be made unique). */
  content: string;
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
export const borderLabel = (id: string) => {
  const words = id.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
};

/** Removes everything that is not drawing (the files are inlined into the page). */
function clean(svg: string): string {
  return (
    svg
      .replace(/<\?xml[\s\S]*?\?>/g, '')
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      // Elements that are not drawing, with their content.
      .replace(/<(script|style|foreignObject|image|iframe|a|metadata|title|desc)\b[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<(script|style|foreignObject|image|iframe|a|metadata|title|desc)\b[^>]*\/>/gi, '')
      // Event handlers, styles, and links that are not to this file's own ids.
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
      .replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, '')
      .replace(/\s+(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '')
      .replace(/url\(\s*(?!['"]?#)[^)]*\)/gi, 'none')
  );
}

const attribute = (tag: string, name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)?.[1];

/** Reads a border file; null when it is not a usable SVG. */
export function parseBorderFile(id: string, source: string): BorderFile | null {
  // Line endings as in the repository, whatever the checkout (Windows: CRLF), so
  // the drawing (and the ready-made logos made with it) never depends on them.
  const cleaned = clean(source.replace(/\r\n?/g, '\n'));
  const open = /<svg\b[^>]*>/i.exec(cleaned);
  const end = cleaned.lastIndexOf('</svg>');
  if (!open || end < open.index) return null;
  const tag = open[0];
  const width = parseFloat(attribute(tag, 'width') ?? '');
  const height = parseFloat(attribute(tag, 'height') ?? '');
  const viewBox = attribute(tag, 'viewBox') ?? (width > 0 && height > 0 ? `0 0 ${width} ${height}` : null);
  if (!viewBox || !/^[-\d.\s,e]+$/i.test(viewBox)) return null;
  const fraction = parseFloat(attribute(tag, 'data-room') ?? '');
  return {
    id,
    label: borderLabel(id),
    viewBox: viewBox.trim(),
    content: cleaned.slice(open.index + tag.length, end).trim(),
    room: {
      shape: attribute(tag, 'data-room-shape') === 'square' ? 'square' : 'circle',
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

/** Order of the borders: by the name shown, "Border 2" before "Border 10", capitals aside. */
export const byName = (a: Pick<BorderFile, 'id' | 'label'>, b: Pick<BorderFile, 'id' | 'label'>) =>
  a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** "none" first, then the files by name. */
export const BORDER_STYLES: BorderStyle[] = ['none', ...[...files.values()].sort(byName).map((file) => file.id)];

export const isBorderStyle = (value: unknown): value is BorderStyle =>
  typeof value === 'string' && (value === 'none' || files.has(value));

/** The drawing of a file, repainted in `color`, its ids made unique with `idPrefix`. */
export function paint(file: BorderFile, color: string, idPrefix: string): string {
  const prefix = `${idPrefix}-${file.id}`;
  const content = file.content
    // Ids and the references to them: unique on the page.
    // (The whitespace before each attribute is kept as it is: the same output whatever the line endings.)
    .replace(/(\s)id\s*=\s*(["'])([^"']+)\2/g, `$1id="${prefix}-$3"`)
    .replace(/url\(\s*['"]?#([^)'"]+)['"]?\s*\)/g, `url(#${prefix}-$1)`)
    .replace(/(\s(?:xlink:)?href\s*=\s*["'])#/g, `$1#${prefix}-`)
    // One colour: every fill and stroke that is not "none".
    .replace(/(\s)(fill|stroke|stop-color|color)\s*=\s*(["'])(?!none\3)[^"']*\3/gi, `$1$2="${color}"`);
  // Shapes without a fill of their own are black in SVG: the colour instead.
  return `<g fill="${color}" color="${color}">${content}</g>`;
}

export function border(style: BorderStyle, color: string, idPrefix = 'border'): Border {
  const file = style === 'none' ? undefined : files.get(style);
  if (!file) return { svg: '', room: { shape: 'square', size: 390 } };
  return {
    svg: `<svg x="0" y="0" width="${CANVAS}" height="${CANVAS}" viewBox="${file.viewBox}" preserveAspectRatio="xMidYMid meet">${paint(file, color, idPrefix)}</svg>`,
    room: { shape: file.room.shape, size: (file.room.fraction * CANVAS) / 2 },
  };
}
