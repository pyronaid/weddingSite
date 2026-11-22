import { svgFolder, type SvgFile } from '../brand/svgFiles';

/**
 * The invitations' artwork, as SVG files (see ../brand/svgFiles.ts), named
 * after the files:
 * - ./decorations/: side decorations, drawn for the top left corner (the
 *   bottom right one is the same turned round), in one colour that is
 *   replaced by the chosen one; white parts stay white;
 * - ./patterns/: background patterns, in one colour (any), drawn faintly in
 *   the chosen colour; white parts hide what is behind them and the card
 *   shows through. A pattern repeats in tiles `data-tile` millimetres wide
 *   (default 150), or covers the whole card once with `data-fit="cover"`
 *   (artwork that does not repeat seamlessly).
 *
 * The drawings can be big: they are downloaded only by the invitation
 * designer (`loadInvitationArt`), while their names are known at once.
 */
const decorationFiles = svgFolder(
  import.meta.glob<string>('./decorations/*.svg', { query: '?raw', import: 'default' }),
);
const patternFiles = svgFolder(import.meta.glob<string>('./patterns/*.svg', { query: '?raw', import: 'default' }));

/** "none", or the name of a file in ./decorations/ without ".svg". */
export type Decoration = string;
/** "none", or the name of a file in ./patterns/ without ".svg". */
export type Pattern = string;

/** "none" first, then the files by name. */
export const DECORATIONS: Decoration[] = ['none', ...decorationFiles.ids];
export const PATTERNS: Pattern[] = ['none', ...patternFiles.ids];

export const isDecoration = (value: unknown): value is Decoration => value === 'none' || decorationFiles.has(value);
export const isPattern = (value: unknown): value is Pattern => value === 'none' || patternFiles.has(value);

export interface InvitationArt {
  decorations: Map<string, SvgFile>;
  patterns: Map<string, SvgFile>;
}

/** Every decoration and pattern, downloaded once. */
export async function loadInvitationArt(): Promise<InvitationArt> {
  const [decorations, patterns] = await Promise.all([decorationFiles.load(), patternFiles.load()]);
  return { decorations, patterns };
}
