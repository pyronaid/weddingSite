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
 * - ./patterns/: background patterns, in one colour (any), drawn faintly in
 *   the chosen colour; white parts hide what is behind them and the card
 *   shows through. A pattern repeats in tiles `data-tile` millimetres wide
 *   (default 150), or covers the whole card once with `data-fit="cover"`
 *   (artwork that does not repeat seamlessly).
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
const patternFiles = svgFolder(import.meta.glob<string>('./patterns/*.svg', { query: '?raw', import: 'default' }));

/** "none", or the name of a file in ./decorations/ without its extension. */
export type Decoration = string;
/** "none", or the name of a file in ./patterns/ without ".svg". */
export type Pattern = string;

/** "none" first, then the files by name. */
export const DECORATIONS: Decoration[] = [
  'none',
  // A drawing and a picture with the same name: one choice (the drawing).
  ...[...new Set([...decorationDrawings.ids, ...decorationPictures.ids])]
    .map((id) => ({ id, label: fileLabel(id) }))
    .sort(byName)
    .map((file) => file.id),
];
export const PATTERNS: Pattern[] = ['none', ...patternFiles.ids];

export const isDecoration = (value: unknown): value is Decoration =>
  value === 'none' || decorationDrawings.has(value) || decorationPictures.has(value);
export const isPattern = (value: unknown): value is Pattern => value === 'none' || patternFiles.has(value);

/** A side decoration: a drawing (repainted in the chosen colour) or a picture (its own colours). */
export type DecorationArt = { kind: 'drawing'; file: SvgFile } | { kind: 'picture'; file: ImageFile };

export interface InvitationArt {
  decorations: Map<string, DecorationArt>;
  patterns: Map<string, SvgFile>;
}

/** Every decoration and pattern, downloaded once. */
export async function loadInvitationArt(): Promise<InvitationArt> {
  const [drawings, pictures, patterns] = await Promise.all([
    decorationDrawings.load(),
    decorationPictures.load(),
    patternFiles.load(),
  ]);
  const decorations = new Map<string, DecorationArt>();
  for (const [id, file] of pictures) decorations.set(id, { kind: 'picture', file });
  for (const [id, file] of drawings) decorations.set(id, { kind: 'drawing', file });
  return { decorations, patterns };
}

/** The same art, each picture's address replaced by `convert(address)` (e.g. a PNG copy for an SVG download). */
export async function withPictures(
  art: InvitationArt,
  convert: (href: string) => Promise<string> | string,
): Promise<InvitationArt> {
  const decorations = new Map<string, DecorationArt>();
  for (const [id, decoration] of art.decorations) {
    decorations.set(
      id,
      decoration.kind === 'picture'
        ? { kind: 'picture', file: { ...decoration.file, href: await convert(decoration.file.href) } }
        : decoration,
    );
  }
  return { ...art, decorations };
}
