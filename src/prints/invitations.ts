import { formatDeadline, formatWeddingDate } from '../lib/format';
import type { SiteContent, Venue } from '../services/site';
import { escapeXml, frame, nestSvg, PRINT_COLORS, PRINT_FONTS, text, wrapText } from './svg';

/** A5 portrait, in millimetres: print shops' usual size, and two fit an A4 sheet. */
export const INVITATION_PAGE = { width: 148, height: 210 };

export type InvitationKind = 'single' | 'couple';
export const INVITATION_KINDS: InvitationKind[] = ['single', 'couple'];

export interface InvitationTexts {
  /** Before the line(s) where the guests' names are written by hand. */
  guest: string;
  heading: Record<InvitationKind, string>;
  to: string;
  ceremony: string;
  reception: string;
  at: (time: string) => string;
  replyBy: (kind: InvitationKind, date: string) => string;
  website: string;
  signupCode: (code: string) => string;
}

export interface InvitationInput {
  kind: InvitationKind;
  content: SiteContent;
  /** The website, and its QR code. */
  url: string;
  qrSvg: string;
  /** The logo, already drawn (logoParts). */
  logo: { viewBox: string; body: string };
  /** The code to create an account in the private area (printed when given). */
  signupCode?: string;
  /** e.g. "it-IT": dates in the site language. */
  locale: string;
  texts: InvitationTexts;
}

const capitalise = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

/**
 * An invitation card (single guest, or a couple): the couple, the date, the
 * ceremony and the reception with their times, and a QR code to the site
 * for the details, the RSVP form and the game. Everything comes from the
 * site settings, so a regenerated card always matches the site.
 */
export function invitationSvg({ kind, content, url, qrSvg, logo, signupCode, locale, texts }: InvitationInput): string {
  const { width, height } = INVITATION_PAGE;
  const cx = width / 2;
  const { ink, accent, frame: plum, muted } = PRINT_COLORS;
  const parts: string[] = [];

  // Logo, top centre.
  const logoSize = 26;
  parts.push(
    `<svg x="${cx - logoSize / 2}" y="12" width="${logoSize}" height="${logoSize}" viewBox="${logo.viewBox}">${logo.body}</svg>`,
  );

  // The line(s) to write the guests' names on.
  const lineY = 48;
  const line = (x1: number, x2: number) =>
    `<line x1="${x1}" y1="${lineY + 0.6}" x2="${x2}" y2="${lineY + 0.6}" stroke="${muted}" stroke-width="0.25"/>`;
  if (kind === 'single') {
    parts.push(
      text(texts.guest, 46, lineY, { size: 4.2, font: PRINT_FONTS.serif, italic: true, anchor: 'end' }),
      line(48, 112),
    );
  } else {
    parts.push(
      text(texts.guest, 30, lineY, { size: 4.2, font: PRINT_FONTS.serif, italic: true, anchor: 'end' }),
      line(32, 70),
      text('&', 74, lineY, { size: 5, font: PRINT_FONTS.script, fill: accent }),
      line(78, 116),
    );
  }

  parts.push(
    text(texts.heading[kind], cx, 64, { size: 9, font: PRINT_FONTS.serif, italic: true, weight: 600, fill: plum }),
    text(texts.to, cx, 71.5, { size: 4.2, font: PRINT_FONTS.serif, italic: true, fill: muted }),
  );

  // The couple, in the script of the site; smaller when the names are long.
  const one = content.couple.partnerOne.trim();
  const two = content.couple.partnerTwo.trim();
  const nameSize = Math.min(17, 118 / (0.4 * (one.length + two.length + 3)));
  parts.push(
    `<text x="${cx}" y="91" text-anchor="middle" font-family="${escapeXml(PRINT_FONTS.script)}" font-size="${nameSize.toFixed(1)}" fill="${ink}">` +
      `${escapeXml(one)} <tspan fill="${accent}">&amp;</tspan> ${escapeXml(two)}</text>`,
  );

  const date = capitalise(formatWeddingDate(content.date, locale, content.timezone));
  parts.push(
    text(date, cx, 104, { size: 6.2, font: PRINT_FONTS.serif, weight: 700 }),
    `<line x1="${cx - 14}" y1="109.5" x2="${cx + 14}" y2="109.5" stroke="${accent}" stroke-width="0.35"/>`,
  );

  // Ceremony and reception side by side (or the ceremony alone, centred).
  const venues: [string, Venue][] = [[texts.ceremony, content.ceremony]];
  if (content.reception) venues.push([texts.reception, content.reception]);
  const columns = venues.length === 2 ? [cx - 34, cx + 34] : [cx];
  venues.forEach(([label, venue], index) => {
    const x = columns[index];
    parts.push(
      text(label.toLocaleUpperCase(), x, 119, {
        size: 3,
        font: PRINT_FONTS.sans,
        fill: accent,
        weight: 700,
        spacing: 0.8,
      }),
      text(texts.at(venue.time), x, 127, { size: 6, font: PRINT_FONTS.serif, weight: 700 }),
      ...wrapText(venue.name, venues.length === 2 ? 26 : 44, 2).map((row, i) =>
        text(row, x, 134 + i * 5, { size: 4.3, font: PRINT_FONTS.serif, weight: 600 }),
      ),
    );
    const nameRows = Math.min(2, wrapText(venue.name, venues.length === 2 ? 26 : 44, 2).length);
    wrapText(venue.address, venues.length === 2 ? 30 : 50, 3).forEach((row, i) =>
      parts.push(text(row, x, 134 + nameRows * 5 + 0.5 + i * 4.3, { size: 3.1, font: PRINT_FONTS.sans, fill: muted })),
    );
  });

  // QR code to the site, with the reply date and the address.
  const qrTop = 162;
  const qrSize = 31;
  parts.push(
    `<line x1="18" y1="157" x2="${width - 18}" y2="157" stroke="${accent}" stroke-width="0.25" stroke-dasharray="1 1.4"/>`,
    nestSvg(qrSvg, { x: 16, y: qrTop, width: qrSize, height: qrSize }),
  );
  const tx = 52;
  const right: string[] = [
    text(texts.replyBy(kind, formatDeadline(content.rsvpDeadline, locale)), tx, qrTop + 6, {
      size: 4.6,
      font: PRINT_FONTS.serif,
      weight: 700,
      anchor: 'start',
    }),
    ...wrapText(texts.website, 44, 2).map((row, i) =>
      text(row, tx, qrTop + 12.5 + i * 4.2, { size: 3, font: PRINT_FONTS.sans, fill: muted, anchor: 'start' }),
    ),
    text(url.replace(/^https?:\/\//, ''), tx, qrTop + 22.5, {
      size: 3.6,
      font: PRINT_FONTS.sans,
      weight: 700,
      fill: accent,
      anchor: 'start',
    }),
  ];
  if (signupCode) {
    right.push(
      text(texts.signupCode(signupCode), tx, qrTop + 28, { size: 3, font: PRINT_FONTS.sans, anchor: 'start' }),
    );
  }
  parts.push(...right);
  if (content.couple.hashtag.trim()) {
    parts.push(
      text(content.couple.hashtag.trim(), cx, height - 10.5, {
        size: 3.2,
        font: PRINT_FONTS.sans,
        fill: accent,
        spacing: 0.4,
      }),
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
<title>${escapeXml(`${one} & ${two}`)}</title>
<rect width="${width}" height="${height}" fill="${PRINT_COLORS.paper}"/>
${frame(width, height, 6)}
${parts.join('\n')}
</svg>`;
}
