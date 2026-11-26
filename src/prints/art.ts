import { imageFolder, type ImageFile } from '../brand/imageFiles';
import { byName, fileLabel, svgFolder, type SvgFile } from '../brand/svgFiles';

/**
 * The invitations' artwork, as files named after them:
 * - ./decorations/: side decorations, drawn for the top left corner (the
 *   bottom right one is the same turned round), either
 *   - SVG drawings (../brand/svgFiles.ts), in one colour that is replaced by
 *     the chosen one; white parts stay white; or
 *   - PNG or WebP pictures with transparency (../brand/imageFiles.ts), e.g.
 *     watercolours, in their own colours. Big enough to print: 300 dpi at the
 *     size they are printed (about 2400 pixels covers a corner made twice as
 *     big on an A4); the designer warns below 200 dpi;
 * - ./patterns/: background patterns, either
 *   - SVG drawings in one colour (any), drawn faintly in the chosen colour;
 *     white parts hide what is behind them and the card shows through. A
 *     drawing repeats in tiles `data-tile` millimetres wide (default 150), or
 *     covers the whole card once with `data-fit="cover"` (artwork that does
 *     not repeat seamlessly); or
 *   - PNG or WebP pictures (e.g. watercolours), in their own colours, at the
 *     chosen strength. A picture is one tile printed at 300 dpi: its size in
 *     pixels is its size on the card (1772 px wide: 150 mm). It must repeat
 *     seamlessly.
 *
 * The drawings can be big: they are downloaded only by the invitation
 * designer (`loadInvitationArt`), while their names are known at once.
 */
const decorationDrawings = svgFolder(
  import.meta.glob<string>('./decorations/*.svg', { query: '?raw', import: 'default' }),
);
const decorationPictures = imageFolder(
  import.meta.glob<string>('./decorations/*.{png,webp}', { query: '?inline', import: 'default' }),
);
const patternDrawings = svgFolder(import.meta.glob<string>('./patterns/*.svg', { query: '?raw', import: 'default' }));
const patternPictures = imageFolder(
  import.meta.glob<string>('./patterns/*.{png,webp}', { query: '?inline', import: 'default' }),
);

/** Drawings and pictures of a folder, as one list of choices by name (a drawing wins over a picture of the same name). */
const byNameOnce = (...lists: string[][]) =>
  [...new Set(lists.flat())]
    .map((id) => ({ id, label: fileLabel(id) }))
    .sort(byName)
    .map((file) => file.id);

/** "none", or the name of a file in ./decorations/ without its extension. */
export type Decoration = string;
/** "none", or the name of a file in ./patterns/ without ".svg". */
export type Pattern = string;

/** "none" first, then the files by name. */
export const DECORATIONS: Decoration[] = ['none', ...byNameOnce(decorationDrawings.ids, decorationPictures.ids)];
export const PATTERNS: Pattern[] = ['none', ...byNameOnce(patternDrawings.ids, patternPictures.ids)];

export const isDecoration = (value: unknown): value is Decoration =>
  value === 'none' || decorationDrawings.has(value) || decorationPictures.has(value);
export const isPattern = (value: unknown): value is Pattern =>
  value === 'none' || patternDrawings.has(value) || patternPictures.has(value);

/** A background pattern: a drawing (in the chosen colour) or a picture (its own colours). */
export type PatternArt = { kind: 'drawing'; file: SvgFile } | { kind: 'picture'; file: ImageFile };

/** A side decoration: a drawing (repainted in the chosen colour) or a picture (its own colours). */
export type DecorationArt = { kind: 'drawing'; file: SvgFile } | { kind: 'picture'; file: ImageFile };

export interface InvitationArt {
  decorations: Map<string, DecorationArt>;
  patterns: Map<string, PatternArt>;
}

/** Every decoration and pattern, downloaded once. */
export async function loadInvitationArt(): Promise<InvitationArt> {
  const [drawings, pictures, patternDrawn, patternPictured] = await Promise.all([
    decorationDrawings.load(),
    decorationPictures.load(),
    patternDrawings.load(),
    patternPictures.load(),
  ]);
  const decorations = new Map<string, DecorationArt>();
  for (const [id, file] of pictures) decorations.set(id, { kind: 'picture', file });
  for (const [id, file] of drawings) decorations.set(id, { kind: 'drawing', file });
  const patterns = new Map<string, PatternArt>();
  for (const [id, file] of patternPictured) patterns.set(id, { kind: 'picture', file });
  for (const [id, file] of patternDrawn) patterns.set(id, { kind: 'drawing', file });
  return { decorations, patterns };
}

/** The same art, each picture's address replaced by `convert(address)` (e.g. a PNG copy for an SVG download). */
export async function withPictures(
  art: InvitationArt,
  convert: (href: string) => Promise<string> | string,
): Promise<InvitationArt> {
  const swap = async <T extends DecorationArt | PatternArt>(item: T): Promise<T> =>
    item.kind === 'picture' ? { ...item, file: { ...item.file, href: await convert(item.file.href) } } : item;
  const decorations = new Map<string, DecorationArt>();
  for (const [id, decoration] of art.decorations) decorations.set(id, await swap(decoration));
  const patterns = new Map<string, PatternArt>();
  for (const [id, pattern] of art.patterns) patterns.set(id, await swap(pattern));
  return { decorations, patterns };
}
