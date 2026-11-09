/** Shared bits of the printable files (posters, invitations): pure string builders, 1 SVG unit = 1 mm. */

export const PRINT_COLORS = { ink: '#4a2537', accent: '#c24f78', frame: '#6d3350', paper: '#fffaf7', muted: '#7a5566' };

/** The site's fonts (loaded by the page, and by the print page). */
export const PRINT_FONTS = {
  script: "'Great Vibes', 'Brush Script MT', cursive",
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Lato', Helvetica, Arial, sans-serif",
};

/** Google Fonts stylesheet with every style the prints use. */
export const PRINT_FONTS_CSS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Great+Vibes&family=Lato:wght@400;700&display=block';

export const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);

/** Re-roots a standalone SVG document (a card image, a QR code) at a box of another SVG. */
export function nestSvg(svg: string, box: { x: number; y: number; width: number; height: number }): string {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? '';
  const viewBox = /viewBox="([^"]+)"/.exec(root)?.[1];
  if (!viewBox) throw new Error('SVG without viewBox');
  // Kept from the original root: e.g. crispEdges, so a QR code has no seams between its squares.
  const rendering = /shape-rendering="([^"]+)"/.exec(root)?.[1];
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" viewBox="${viewBox}"${
    rendering ? ` shape-rendering="${rendering}"` : ''
  }>${inner}</svg>`;
}

/**
 * Splits text into lines of at most `max` characters, at spaces (SVG text
 * does not wrap). Words longer than a line stay whole. At most `lines`
 * lines: the last one gets an ellipsis if the text is longer.
 */
export function wrapText(text: string, max: number, lines = 3): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && `${current} ${word}`.length > max) {
      result.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) result.push(current);
  if (result.length <= lines) return result;
  const kept = result.slice(0, lines);
  kept[lines - 1] = `${kept[lines - 1].replace(/[\s,;.]+$/, '')}…`;
  return kept;
}

/** A centred (or anchored) line of text. */
export function text(
  content: string,
  x: number,
  y: number,
  style: {
    size: number;
    font: string;
    fill?: string;
    weight?: number;
    italic?: boolean;
    spacing?: number;
    anchor?: string;
  },
): string {
  const attributes = [
    `x="${x}"`,
    `y="${y}"`,
    `text-anchor="${style.anchor ?? 'middle'}"`,
    `font-family="${escapeXml(style.font)}"`,
    `font-size="${style.size}"`,
    `fill="${style.fill ?? PRINT_COLORS.ink}"`,
    style.weight ? `font-weight="${style.weight}"` : '',
    style.italic ? 'font-style="italic"' : '',
    style.spacing ? `letter-spacing="${style.spacing}"` : '',
  ];
  return `<text ${attributes.filter(Boolean).join(' ')}>${escapeXml(content)}</text>`;
}

/** The double frame of the prints: plum outside, a thin pink line inside. */
export function frame(width: number, height: number, inset: number): string {
  const { frame: plum, accent } = PRINT_COLORS;
  const outer = `<rect x="${inset}" y="${inset}" width="${width - 2 * inset}" height="${height - 2 * inset}" rx="${inset * 0.8}" fill="none" stroke="${plum}" stroke-width="${inset * 0.14}"/>`;
  const gap = inset * 0.4;
  const inner = `<rect x="${inset + gap}" y="${inset + gap}" width="${width - 2 * (inset + gap)}" height="${height - 2 * (inset + gap)}" rx="${inset * 0.6}" fill="none" stroke="${accent}" stroke-width="${inset * 0.05}"/>`;
  return outer + inner;
}
