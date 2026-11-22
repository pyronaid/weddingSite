/**
 * Artwork kept as SVG files in the repository (logo borders, invitation
 * decorations and patterns): each file is a choice, named after the file
 * ("stile_uno.svg" -> "Stile uno"). To add one, drop the file in its folder
 * and deploy.
 *
 * Only drawing gets through: scripts, event handlers, external links,
 * embedded HTML, styles and images are removed when a file is read, because
 * the drawings are inlined into the page.
 */

export interface SvgFile {
  /** The file name without ".svg". */
  id: string;
  /** The file name, readable: "stile_uno" -> "Stile uno". */
  label: string;
  viewBox: string;
  /** The drawing, cleaned (ids still to be made unique). */
  content: string;
  /** The data-* attributes of its <svg> element, without "data-": the file's own settings. */
  data: Record<string, string>;
}

/** "stile_uno" -> "Stile uno". */
export const fileLabel = (id: string) => {
  const words = id.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
};

/** Removes everything that is not drawing. */
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

/** Reads an SVG file; null when it is not a usable SVG. */
export function parseSvgFile(id: string, source: string): SvgFile | null {
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
  const data: Record<string, string> = {};
  for (const [, name, , value] of tag.matchAll(/\sdata-([a-z][a-z0-9-]*)\s*=\s*(["'])([^"']*)\2/gi)) {
    data[name.toLowerCase()] = value;
  }
  return {
    id,
    label: fileLabel(id),
    viewBox: viewBox.trim(),
    content: cleaned.slice(open.index + tag.length, end).trim(),
    data,
  };
}

/** The four numbers of a file's viewBox. */
export function viewBoxOf(file: Pick<SvgFile, 'viewBox'>): { x: number; y: number; width: number; height: number } {
  const [x = 0, y = 0, width = 0, height = 0] = file.viewBox.split(/[\s,]+/).map(Number);
  return { x, y, width, height };
}

/** Order of the files: by the name shown, "Border 2" before "Border 10", capitals aside. */
export const byName = (a: Pick<SvgFile, 'id' | 'label'>, b: Pick<SvgFile, 'id' | 'label'>) =>
  a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** True for white, however the file writes it. */
export const isWhite = (value: string) =>
  /^\s*(#fff|#ffffff|white|rgb\(\s*(255\s*,\s*255\s*,\s*255|100%\s*,\s*100%\s*,\s*100%)\s*\))\s*$/i.test(value);

/**
 * The drawing of a file with its ids made unique on the page (`idPrefix`) and
 * every colour that is not "none" replaced by `recolour(colour)`. Shapes
 * without a colour of their own get `base`.
 */
function repaint(file: SvgFile, idPrefix: string, recolour: (value: string) => string, base: string): string {
  const prefix = `${idPrefix}-${file.id}`;
  const content = file.content
    // Ids and the references to them: unique on the page.
    // (The whitespace before each attribute is kept as it is: the same output whatever the line endings.)
    .replace(/(\s)id\s*=\s*(["'])([^"']+)\2/g, `$1id="${prefix}-$3"`)
    .replace(/url\(\s*['"]?#([^)'"]+)['"]?\s*\)/g, `url(#${prefix}-$1)`)
    .replace(/(\s(?:xlink:)?href\s*=\s*["'])#/g, `$1#${prefix}-`)
    .replace(
      /(\s)(fill|stroke|stop-color|color)\s*=\s*(["'])((?!none\3)[^"']*)\3/gi,
      (_, space: string, name: string, _quote: string, value: string) => `${space}${name}="${recolour(value)}"`,
    );
  // Shapes without a fill of their own are black in SVG: `base` instead.
  return `<g fill="${base}" color="${base}">${content}</g>`;
}

/**
 * The drawing in one colour. With `keepWhite`, white parts stay white (the
 * petals of a flower over its leaves).
 */
export function paint(file: SvgFile, color: string, idPrefix: string, { keepWhite = false } = {}): string {
  return repaint(file, idPrefix, (value) => (keepWhite && isWhite(value) ? '#ffffff' : color), color);
}

/**
 * The drawing as a mask: what is drawn shows (white), white parts hide what is
 * behind them (black), and the rest is transparent. A colour through it gives
 * the drawing in that colour on whatever is underneath.
 */
export function stencil(file: SvgFile, idPrefix: string): string {
  return repaint(file, idPrefix, (value) => (isWhite(value) ? '#000000' : '#ffffff'), '#ffffff');
}

/**
 * A folder of SVG files loaded only when needed (the files can be big): the
 * names are known at once, the drawings on `load()`.
 */
export interface SvgFolder {
  /** The file ids, by name. */
  ids: string[];
  has: (id: unknown) => id is string;
  /** Every usable file, read once. */
  load: () => Promise<Map<string, SvgFile>>;
}

/** `loaders`: from import.meta.glob('./folder/*.svg', { query: '?raw', import: 'default' }). */
export function svgFolder(loaders: Record<string, () => Promise<string>>): SvgFolder {
  const paths = new Map(Object.keys(loaders).map((path) => [path.replace(/^.*\//, '').replace(/\.svg$/i, ''), path]));
  const ids = [...paths.keys()]
    .map((id) => ({ id, label: fileLabel(id) }))
    .sort(byName)
    .map((file) => file.id);
  let loading: Promise<Map<string, SvgFile>> | undefined;
  return {
    ids,
    has: (id): id is string => typeof id === 'string' && paths.has(id),
    load: () => {
      loading ??= Promise.all(ids.map(async (id) => parseSvgFile(id, await loaders[paths.get(id)!]()))).then(
        (files) => new Map(files.filter((file) => file !== null).map((file) => [file.id, file])),
      );
      // A failed download can be tried again.
      loading.catch(() => {
        loading = undefined;
      });
      return loading;
    },
  };
}
