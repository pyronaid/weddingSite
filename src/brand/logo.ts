import { LOGO_PATHS } from './logoPaths';

/**
 * The couple's monogram: a capital G and V overlapped.
 *
 * - `script`: in the script of the site's titles (Great Vibes), the main logo.
 * - `seal`:   serif capitals (Cormorant Garamond) in a double ring, for seals,
 *             stickers and small sizes.
 *
 * Where the letters cross, the G stops a little short of the V (a transparent
 * gap, not a white outline), so the logo works on any background. Pure
 * functions returning SVG text: the same output in the browser, in the
 * print files and in tests.
 */
export type LogoVariant = keyof typeof LOGO_PATHS;
export const LOGO_VARIANTS = Object.keys(LOGO_PATHS) as LogoVariant[];

export interface LogoColors {
  /** The G and the outer ring. */
  primary: string;
  /** The V and the inner ring. */
  accent: string;
  /** Optional solid background; transparent otherwise. */
  background?: string;
}

/** The palette of the site: plum and pink; one colour; and for dark backgrounds. */
export const LOGO_SCHEMES = {
  color: { primary: '#6d3350', accent: '#c24f78' },
  mono: { primary: '#4a2537', accent: '#4a2537' },
  light: { primary: '#fff7f2', accent: '#ffc2d6' },
} satisfies Record<string, LogoColors>;
export type LogoScheme = keyof typeof LOGO_SCHEMES;

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);

/** viewBox and drawing of a logo, to place inside another SVG (e.g. an invitation). */
export function logoParts(variant: LogoVariant, colors: LogoColors, idPrefix = 'gv') {
  const logo = LOGO_PATHS[variant];
  const [x, y, size] = logo.viewBox;
  const mask = `${idPrefix}-${variant}-gap`;
  const area = `x="${x}" y="${y}" width="${size}" height="${size}"`;
  const ring =
    'ring' in logo
      ? `<circle cx="${logo.ring.cx}" cy="${logo.ring.cy}" r="${logo.ring.r}" fill="none" stroke="${colors.primary}" stroke-width="12"/>` +
        `<circle cx="${logo.ring.cx}" cy="${logo.ring.cy}" r="${logo.ring.inner}" fill="none" stroke="${colors.accent}" stroke-width="4"/>`
      : '';
  const body = [
    colors.background ? `<rect ${area} fill="${colors.background}"/>` : '',
    `<defs><mask id="${mask}" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#fff"/>`,
    `<path transform="${logo.vTransform}" d="${logo.v}" stroke="#000" stroke-width="${logo.gap}" stroke-linejoin="round"/></mask></defs>`,
    ring,
    `<path d="${logo.g}" fill="${colors.primary}" mask="url(#${mask})"/>`,
    `<path transform="${logo.vTransform}" d="${logo.v}" fill="${colors.accent}"/>`,
  ].join('');
  return { viewBox: `${x} ${y} ${size} ${size}`, body };
}

/** A standalone SVG file of the logo (square). `size` sets its width/height, e.g. "60mm" or 512. */
export function logoSvg(
  variant: LogoVariant,
  colors: LogoColors = LOGO_SCHEMES.color,
  { size = 512, title = 'G V' }: { size?: number | string; title?: string } = {},
): string {
  const { viewBox, body } = logoParts(variant, colors);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" role="img">
<title>${escapeXml(title)}</title>
${body}
</svg>
`;
}
