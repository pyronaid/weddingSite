import { escapeXml, frame, nestSvg, PRINT_COLORS, PRINT_FONTS, text } from './svg';

/** A3 portrait, in millimetres. */
export const POSTER_PAGE = { width: 297, height: 420 };

export interface PosterTexts {
  title: string;
  steps: string;
  scanToWin: (card: string) => string;
  footer: (url: string) => string;
}

export interface PosterInput {
  /** e.g. "5 of clubs" */
  cardName: string;
  /** The card image (public/cards/<suit>/<rank>.svg). */
  cardSvg: string;
  /** The QR code opening the riddle, and its address. */
  qrSvg: string;
  url: string;
  texts: PosterTexts;
}

/** One A3 poster of a club: the card, and a QR code to its riddle. */
export function posterSvg({ cardName, cardSvg, qrSvg, url, texts }: PosterInput): string {
  const { width, height } = POSTER_PAGE;
  const cx = width / 2;
  const card = { width: 126, height: 176.4 }; // 5:7, like the card images
  const qr = 112;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
<title>${escapeXml(cardName)}</title>
<rect width="${width}" height="${height}" fill="#ffffff"/>
${frame(width, height, 10)}
${text(texts.title, cx, 46, { size: 24, font: PRINT_FONTS.script })}
${text(texts.steps, cx, 58, { size: 5.2, font: PRINT_FONTS.sans, fill: PRINT_COLORS.accent, spacing: 1.2 })}
${nestSvg(cardSvg, { x: cx - card.width / 2, y: 68, ...card })}
${nestSvg(qrSvg, { x: cx - qr / 2, y: 252, width: qr, height: qr })}
${text(texts.scanToWin(cardName), cx, 378, { size: 9, font: PRINT_FONTS.serif, weight: 700 })}
<g opacity="0.75">${text(texts.footer(url), cx, 392, { size: 3.6, font: PRINT_FONTS.sans })}</g>
</svg>`;
}
