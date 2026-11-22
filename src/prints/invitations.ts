import { isLanguage, type Language } from '../i18n';
import { oneOf, sanitizeColor } from '../brand/monogram';
import { formatDeadline, formatWeddingDate } from '../lib/format';
import type { SiteContent, Venue } from '../services/site';
import { paint, stencil, viewBoxOf, type SvgFile } from '../brand/svgFiles';
import { isDecoration, isPattern, type Decoration, type InvitationArt, type Pattern } from './art';
import { mixColours, sanitizePalette, type Palette } from '../theme/palette';
import { escapeXml, nestSvg, PRINT_FONTS, text, wrapText } from './svg';

export type { Decoration, InvitationArt, Pattern } from './art';

/** Sizes in millimetres. */
export const INVITATION_SIZES = {
  square: { width: 150, height: 150 },
  'a4-portrait': { width: 210, height: 297 },
  'a4-landscape': { width: 297, height: 210 },
};
export type InvitationSize = keyof typeof INVITATION_SIZES;

/** The line(s) where the guests' names are written by hand. */
export type NameLines = 'none' | 'one' | 'two';

export interface InvitationDesign {
  size: InvitationSize;
  names: NameLines;
  /** null: the default text of the chosen language. */
  heading: string | null;
  subheading: string | null;
  language: Language;
  logo: boolean;
  qr: boolean;
  qrText: string | null;
  signupCode: boolean;
  /** Tint of the background shading; null: plain white. */
  background: string | null;
  decoration: Decoration;
  /** For drawings: pictures keep their own colours. */
  decorationColor: string;
  /** Moves and size of the decoration: top left, bottom right (see CORNER_ADJUST). */
  decorationAdjustments: [CornerAdjustment, CornerAdjustment];
  /** Moves and size of the logo (same steps and limits), grown from its centre. */
  logoAdjustment: CornerAdjustment;
  /** A background pattern, drawn faintly over the whole card. */
  pattern: Pattern;
  patternColor: string;
  /** How strong the pattern is: a percentage (see PATTERN_OPACITY). */
  patternOpacity: number;
}

/**
 * A corner decoration moved or resized by hand: whole steps, in the card's
 * directions (▲ is up on the card for both corners). Nothing keeps it on the
 * card: what goes past the edge is cut off.
 */
export interface CornerAdjustment {
  /** Steps right (negative: left). */
  x: number;
  /** Steps down (negative: up). */
  y: number;
  /** Percent of the normal size, grown or shrunk from its corner. */
  size: number;
}

/**
 * A step is a share of the card's short side, so it looks the same on any card
 * size. The same steps and limits for the logo.
 */
export const CORNER_ADJUST = { moveStep: 0.02, maxSteps: 50, sizeStep: 5, minSize: 25, maxSize: 300 };
export const NO_CORNER_ADJUSTMENT: CornerAdjustment = { x: 0, y: 0, size: 100 };

/** The pattern's opacity, in percent: faint by default, so the texts stay easy to read. */
export const PATTERN_OPACITY = { min: 5, max: 100, step: 5, initial: 15 };
/** A pattern tile's width on the card, in millimetres, when its file does not say (data-tile). */
export const PATTERN_TILE = 150;

export const DEFAULT_INVITATION: InvitationDesign = {
  size: 'a4-portrait',
  names: 'one',
  heading: null,
  subheading: null,
  language: 'en',
  logo: true,
  qr: true,
  qrText: null,
  signupCode: true,
  background: null,
  decoration: 'plants',
  decorationColor: '#7d9a6a',
  decorationAdjustments: [NO_CORNER_ADJUSTMENT, NO_CORNER_ADJUSTMENT],
  logoAdjustment: NO_CORNER_ADJUSTMENT,
  pattern: 'none',
  patternColor: '#6d3350',
  patternOpacity: PATTERN_OPACITY.initial,
};

const NAME_LINES: NameLines[] = ['none', 'one', 'two'];

/** A design as loaded from storage, made safe to use: every field checked, the rest from the defaults. */
export function sanitizeInvitation(raw: unknown, language: Language): InvitationDesign {
  const d = { ...DEFAULT_INVITATION, language };
  const r: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const text = (value: unknown, max: number, fallback: string | null) =>
    value === null ? null : typeof value === 'string' ? value.slice(0, max) : fallback;
  const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
  return {
    size: oneOf(r.size, Object.keys(INVITATION_SIZES) as InvitationSize[], d.size),
    names: oneOf(r.names, NAME_LINES, d.names),
    heading: text(r.heading, 80, d.heading),
    subheading: text(r.subheading, 80, d.subheading),
    language: isLanguage(r.language) ? r.language : d.language,
    logo: flag(r.logo, d.logo),
    qr: flag(r.qr, d.qr),
    qrText: text(r.qrText, 200, d.qrText),
    signupCode: flag(r.signupCode, d.signupCode),
    background: r.background === null ? null : sanitizeColor(r.background, '') || d.background,
    decoration: isDecoration(r.decoration) ? r.decoration : d.decoration,
    decorationColor: sanitizeColor(r.decorationColor, d.decorationColor),
    decorationAdjustments: [
      sanitizeCornerAdjustment(Array.isArray(r.decorationAdjustments) ? r.decorationAdjustments[0] : undefined),
      sanitizeCornerAdjustment(Array.isArray(r.decorationAdjustments) ? r.decorationAdjustments[1] : undefined),
    ],
    logoAdjustment: sanitizeCornerAdjustment(r.logoAdjustment),
    pattern: isPattern(r.pattern) ? r.pattern : d.pattern,
    patternColor: sanitizeColor(r.patternColor, d.patternColor),
    patternOpacity: isPatternOpacity(r.patternOpacity) ? r.patternOpacity : d.patternOpacity,
  };
}

/** Whole steps within the limits, or not moved at all. */
function sanitizeCornerAdjustment(raw: unknown): CornerAdjustment {
  const r: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const step = (value: unknown) =>
    typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= CORNER_ADJUST.maxSteps;
  const size =
    typeof r.size === 'number' &&
    Number.isInteger(r.size) &&
    r.size >= CORNER_ADJUST.minSize &&
    r.size <= CORNER_ADJUST.maxSize &&
    r.size % CORNER_ADJUST.sizeStep === 0;
  return step(r.x) && step(r.y) && size
    ? { x: r.x as number, y: r.y as number, size: r.size as number }
    : NO_CORNER_ADJUSTMENT;
}

/** The decoration's normal width on a card, in millimetres (before any resize). */
const decorationBaseWidth = (size: InvitationSize) => {
  const { width, height } = INVITATION_SIZES[size];
  return Math.min(width, height) * (width > height ? 0.42 : 0.38);
};

/**
 * How sharp a picture decoration prints: dots per inch at its printed size,
 * for each corner (null for drawings, which are always sharp).
 */
export function decorationResolution(
  design: InvitationDesign,
  art: InvitationArt | undefined,
): [number, number] | null {
  const decoration = design.decoration === 'none' ? undefined : art?.decorations.get(design.decoration);
  if (decoration?.kind !== 'picture') return null;
  const base = decorationBaseWidth(design.size);
  const dpi = (adjustment: CornerAdjustment) =>
    Math.round(decoration.file.width / ((base * adjustment.size) / 100 / 25.4));
  return [dpi(design.decorationAdjustments[0]), dpi(design.decorationAdjustments[1])];
}

const isPatternOpacity = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= PATTERN_OPACITY.min &&
  value <= PATTERN_OPACITY.max &&
  (value - PATTERN_OPACITY.min) % PATTERN_OPACITY.step === 0;

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * A pattern over a `width` × `height` area (the card's units: millimetres),
 * in `color` at `opacity` percent. The file is a mask: its drawing shows the
 * colour, its white parts and the rest let the card show through, so it works
 * on a white or a shaded background alike.
 */
export function patternLayer(
  file: SvgFile,
  color: string,
  opacity: number,
  width: number,
  height: number,
  idPrefix: string,
): string {
  const box = viewBoxOf(file);
  if (!(box.width > 0 && box.height > 0)) return '';
  const drawing = stencil(file, idPrefix);
  let defs = '';
  let shapes: string;
  if (file.data.fit === 'cover') {
    // Once, as big as needed to cover the area (artwork that does not repeat).
    shapes = `<svg width="${width}" height="${height}" viewBox="${file.viewBox}" preserveAspectRatio="xMidYMid slice">${drawing}</svg>`;
  } else {
    // Tiles of the same size on any card: the same density on a square card and on an A4.
    const tile = Math.min(1000, Math.max(10, parseFloat(file.data.tile ?? '') || PATTERN_TILE));
    const tileHeight = round((tile * box.height) / box.width);
    defs =
      `<pattern id="${idPrefix}-tile" patternUnits="userSpaceOnUse" width="${tile}" height="${tileHeight}">` +
      `<svg width="${tile}" height="${tileHeight}" viewBox="${file.viewBox}" preserveAspectRatio="none">${drawing}</svg></pattern>`;
    shapes = `<rect width="${width}" height="${height}" fill="url(#${idPrefix}-tile)"/>`;
  }
  return (
    `<defs>${defs}<mask id="${idPrefix}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">${shapes}</mask></defs>` +
    `<rect width="${width}" height="${height}" fill="${color}" fill-opacity="${round(opacity / 100)}" mask="url(#${idPrefix}-mask)"/>`
  );
}

/**
 * The card's colours, from the site's palette (Site settings → Colour palette):
 * the original palette gives the original card. The logo, the decorations and
 * the pattern keep the colours chosen in the designer.
 */
export function cardColours(palette: Palette) {
  return {
    /** Times, places, the couple's names. */
    ink: palette.text,
    /** The "&", CEREMONY / RECEPTION, the lines, the website, the hashtag. */
    accent: palette.accentStrong,
    /** The title. */
    title: palette.cardBg,
    /** Subtitle, addresses, the name lines, the QR code text: the text, lighter. */
    muted: mixColours(palette.text, '#ffffff', 0.25),
    /** The middle of the shaded background. */
    paper: palette.pageLight,
  };
}

/** The texts printed on the card, in its language. */
export interface CardTexts {
  guest: string;
  and: string;
  heading: Record<NameLines, string>;
  to: string;
  ceremony: string;
  reception: string;
  at: (time: string) => string;
  replyBy: (lines: NameLines, date: string) => string;
  website: string;
  signupCode: (code: string) => string;
}

export interface InvitationInput {
  design: InvitationDesign;
  content: SiteContent;
  /** The website, and its QR code. */
  url: string;
  qrSvg: string;
  /** The monogram, already drawn (monogramParts), when the design shows it. */
  logo?: { viewBox: string; body: string };
  /** The code to create an account in the private area. */
  signupCode?: string;
  /** e.g. "it-IT": the dates in the card's language. */
  locale: string;
  texts: CardTexts;
  /** The decoration and pattern files (loadInvitationArt); without them, none is drawn. */
  art?: InvitationArt;
}

const capitalise = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

/**
 * A piece of the layout, measured in "base units" (an A5 card is 148 wide):
 * drawn centred on `cx`, from `top`. Columns and rows combine them.
 */
interface Block {
  width: number;
  height: number;
  draw: (cx: number, top: number) => string;
}

/**
 * An invitation card: the couple, the date, the ceremony and the reception
 * with their times, and (optionally) a QR code to the site for the details,
 * the RSVP form and the game. Everything comes from the site settings, so a
 * regenerated card always matches the site. No frame: side decorations and
 * an optional colour shading instead.
 *
 * Portrait: one centred column. Square: the invitation, then the places and
 * the QR code side by side. Landscape: two columns. Then everything is scaled
 * to fill the paper.
 */
export function invitationSvg({
  design,
  content,
  url,
  qrSvg,
  logo,
  signupCode,
  locale,
  texts,
  art,
}: InvitationInput): string {
  const { width, height } = INVITATION_SIZES[design.size];
  // From the palette, checked (content cached by an older version has none).
  const { ink, accent, title, muted, paper } = cardColours(sanitizePalette(content.palette));
  const landscape = width > height;
  const square = width === height;

  // Millimetres per base unit, known once the layout is measured.
  let s = 1;
  const t = (value: string, x: number, y: number, style: Parameters<typeof text>[3]) =>
    text(value, x, y, { fill: ink, ...style, size: style.size * s });
  const block = (blockWidth: number, blockHeight: number, draw: Block['draw']): Block => ({
    width: blockWidth,
    height: blockHeight,
    draw,
  });
  const column = (items: Block[], gap = 0): Block => ({
    width: Math.max(...items.map((item) => item.width)),
    height: items.reduce((sum, item) => sum + item.height, 0) + gap * Math.max(0, items.length - 1),
    draw: (cx, top) => {
      let y = top;
      return items
        .map((item) => {
          const out = item.draw(cx, y);
          y += (item.height + gap) * s;
          return out;
        })
        .join('');
    },
  });
  const row = (items: Block[], gap: number): Block => {
    const total = items.reduce((sum, item) => sum + item.width, 0) + gap * (items.length - 1);
    const tallest = Math.max(...items.map((item) => item.height));
    return {
      width: total,
      height: tallest,
      draw: (cx, top) => {
        let x = cx - (total * s) / 2;
        return items
          .map((item) => {
            // Each one vertically centred in the row.
            const out = item.draw(x + (item.width * s) / 2, top + ((tallest - item.height) * s) / 2);
            x += (item.width + gap) * s;
            return out;
          })
          .join('');
      },
    };
  };

  // ---- The invitation itself ----
  const intro: Block[] = [];
  if (design.logo && logo) {
    const size = 30;
    intro.push(
      block(size, size + 6, (cx, top) => {
        const drawn = `<svg x="${cx - (size * s) / 2}" y="${top}" width="${size * s}" height="${size * s}" viewBox="${logo.viewBox}">${logo.body}</svg>`;
        const { x, y, size: percent } = design.logoAdjustment;
        if (x === 0 && y === 0 && percent === 100) return drawn;
        // Moved by hand, and resized around its centre: the rest of the card stays where it is.
        const step = Math.min(width, height) * CORNER_ADJUST.moveStep;
        const middle = { x: round(cx), y: round(top + (size * s) / 2) };
        return (
          `<g transform="translate(${round(middle.x + x * step)} ${round(middle.y + y * step)}) scale(${percent / 100}) translate(${-middle.x} ${-middle.y})">` +
          `${drawn}</g>`
        );
      }),
    );
  }
  if (design.names !== 'none') {
    intro.push(
      block(100, 12, (cx, top) => {
        const y = top + 7 * s;
        const line = (x1: number, x2: number) =>
          `<line x1="${cx + x1 * s}" y1="${y + 0.6 * s}" x2="${cx + x2 * s}" y2="${y + 0.6 * s}" stroke="${muted}" stroke-width="${0.25 * s}"/>`;
        if (design.names === 'one') {
          return (
            t(texts.guest, cx - 28 * s, y, { size: 4.2, font: PRINT_FONTS.serif, italic: true, anchor: 'end' }) +
            line(-26, 38)
          );
        }
        return (
          t(texts.guest, cx - 44 * s, y, { size: 4.2, font: PRINT_FONTS.serif, italic: true, anchor: 'end' }) +
          line(-42, -4) +
          t(texts.and, cx, y, { size: 5, font: PRINT_FONTS.script, fill: accent }) +
          line(4, 42)
        );
      }),
    );
  }
  const heading = (design.heading ?? texts.heading[design.names]).trim();
  const subheading = (design.subheading ?? texts.to).trim();
  if (heading) {
    intro.push(
      block(Math.min(130, heading.length * 4), 12, (cx, top) =>
        t(heading, cx, top + 8 * s, { size: 9, font: PRINT_FONTS.serif, italic: true, weight: 600, fill: title }),
      ),
    );
  }
  if (subheading) {
    intro.push(
      block(Math.min(130, subheading.length * 2), 8, (cx, top) =>
        t(subheading, cx, top + 5 * s, { size: 4.2, font: PRINT_FONTS.serif, italic: true, fill: muted }),
      ),
    );
  }
  // The couple, in the script of the site; smaller when the names are long.
  const one = content.couple.partnerOne.trim();
  const two = content.couple.partnerTwo.trim();
  const nameSize = Math.min(17, 118 / (0.4 * (one.length + two.length + 3)));
  intro.push(
    block(
      120,
      24,
      (cx, top) =>
        `<text x="${cx}" y="${top + 17 * s}" text-anchor="middle" font-family="${escapeXml(PRINT_FONTS.script)}" font-size="${(nameSize * s).toFixed(2)}" fill="${ink}">` +
        `${escapeXml(one)} <tspan fill="${accent}">&amp;</tspan> ${escapeXml(two)}</text>`,
    ),
  );
  const date = capitalise(formatWeddingDate(content.date, locale, content.timezone));
  intro.push(
    block(
      90,
      15,
      (cx, top) =>
        t(date, cx, top + 6 * s, { size: 6.2, font: PRINT_FONTS.serif, weight: 700 }) +
        `<line x1="${cx - 14 * s}" y1="${top + 11.5 * s}" x2="${cx + 14 * s}" y2="${top + 11.5 * s}" stroke="${accent}" stroke-width="${0.35 * s}"/>`,
    ),
  );

  // ---- Ceremony and reception ----
  const venue = ([label, place]: [string, Venue], nameWidth: number, addressWidth: number): Block => {
    const names = wrapText(place.name, nameWidth, 2);
    const address = wrapText(place.address, addressWidth, 3);
    return block(nameWidth * 2.2, 20 + names.length * 5 + address.length * 4.3, (cx, top) =>
      [
        t(label.toLocaleUpperCase(), cx, top + 4 * s, {
          size: 3,
          font: PRINT_FONTS.sans,
          fill: accent,
          weight: 700,
          spacing: 0.8 * s,
        }),
        t(texts.at(place.time), cx, top + 12 * s, { size: 6, font: PRINT_FONTS.serif, weight: 700 }),
        ...names.map((line, i) =>
          t(line, cx, top + (19 + i * 5) * s, { size: 4.3, font: PRINT_FONTS.serif, weight: 600 }),
        ),
        ...address.map((line, i) =>
          t(line, cx, top + (19.5 + names.length * 5 + i * 4.3) * s, {
            size: 3.1,
            font: PRINT_FONTS.sans,
            fill: muted,
          }),
        ),
      ].join(''),
    );
  };
  const places: [string, Venue][] = [[texts.ceremony, content.ceremony]];
  if (content.reception) places.push([texts.reception, content.reception]);
  // Side by side, or one above the other (square cards, next to the QR code).
  const venues = (stacked: boolean): Block =>
    stacked || places.length === 1
      ? column(
          places.map((place) => venue(place, places.length === 1 ? 40 : 26, 34)),
          2,
        )
      : row(
          places.map((place) => venue(place, 26, 30)),
          8,
        );

  // ---- QR code to the site ----
  const signup = design.signupCode && signupCode ? texts.signupCode(signupCode) : '';
  const qrBlock = (stacked: boolean): Block | null => {
    if (!design.qr) {
      return signup
        ? block(80, 8, (cx, top) => t(signup, cx, top + 5 * s, { size: 3.2, font: PRINT_FONTS.sans }))
        : null;
    }
    const qr = 30;
    const reply = texts.replyBy(design.names, formatDeadline(content.rsvpDeadline, locale));
    const note = wrapText((design.qrText ?? texts.website).trim(), stacked ? 34 : 40, 3);
    const site = url.replace(/^https?:\/\//, '');
    const lines = (x: number, top: number, anchor: string) =>
      [
        t(reply, x, top + 4 * s, { size: 4.6, font: PRINT_FONTS.serif, weight: 700, anchor }),
        ...note.map((line, i) =>
          t(line, x, top + (10 + i * 4.2) * s, { size: 3, font: PRINT_FONTS.sans, fill: muted, anchor }),
        ),
        t(site, x, top + (11.5 + note.length * 4.2) * s, {
          size: 3.6,
          font: PRINT_FONTS.sans,
          weight: 700,
          fill: accent,
          anchor,
        }),
        signup ? t(signup, x, top + (17 + note.length * 4.2) * s, { size: 3, font: PRINT_FONTS.sans, anchor }) : '',
      ].join('');
    const textHeight = 14 + note.length * 4.2 + (signup ? 5 : 0);
    if (stacked) {
      // QR code above, texts centred below.
      return block(
        70,
        qr + 4 + textHeight,
        (cx, top) =>
          nestSvg(qrSvg, { x: cx - (qr * s) / 2, y: top, width: qr * s, height: qr * s }) +
          lines(cx, top + (qr + 4) * s, 'middle'),
      );
    }
    const blockWidth = qr + 6 + 64;
    return block(blockWidth, Math.max(qr, textHeight) + 4, (cx, top) => {
      const left = cx - (blockWidth * s) / 2;
      return (
        nestSvg(qrSvg, { x: left, y: top + 2 * s, width: qr * s, height: qr * s }) +
        lines(left + (qr + 6) * s, top + 2 * s, 'start')
      );
    });
  };

  const hashtagText = content.couple.hashtag.trim();
  const hashtag = hashtagText
    ? block(60, 8, (cx, top) =>
        t(hashtagText, cx, top + 5 * s, { size: 3.2, font: PRINT_FONTS.sans, fill: accent, spacing: 0.4 * s }),
      )
    : null;
  const divider = block(
    100,
    6,
    (cx, top) =>
      `<line x1="${cx - 50 * s}" y1="${top + 3 * s}" x2="${cx + 50 * s}" y2="${top + 3 * s}" stroke="${accent}" stroke-width="${0.25 * s}" stroke-dasharray="${1 * s} ${1.4 * s}"/>`,
  );
  const present = (items: (Block | null)[]) => items.filter((item): item is Block => item !== null);

  let layout: Block;
  if (landscape) {
    const details = present([venues(false), design.qr ? divider : null, qrBlock(false), hashtag]);
    layout = row([column(intro), column(details, 3)], 16);
  } else if (square) {
    const qr = qrBlock(true);
    layout = column(present([column(intro), divider, qr ? row([venues(true), qr], 10) : venues(false), hashtag]));
  } else {
    layout = column(present([...intro, venues(false), design.qr ? divider : null, qrBlock(false), hashtag]), 2);
  }

  // As big as the paper allows, leaving room for the decorations at the corners.
  const margin = Math.min(width, height) * 0.08;
  s = Math.min(
    (height - 2 * margin) / layout.height,
    (width - 2 * margin) / layout.width,
    Math.min(width, height) / 110,
  );
  const drawn = layout.draw(width / 2, (height - layout.height * s) / 2);

  // Background: plain paper, or a soft shading from the two decorated corners.
  let defs = design.background
    ? `<defs><linearGradient id="invitation-shade" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${design.background}"/><stop offset="0.48" stop-color="${paper}"/>` +
      `<stop offset="0.52" stop-color="${paper}"/><stop offset="1" stop-color="${design.background}"/></linearGradient></defs>`
    : '';
  const background = `<rect width="${width}" height="${height}" fill="${design.background ? 'url(#invitation-shade)' : '#ffffff'}"/>`;

  // A faint pattern over the background.
  const patternFile = design.pattern === 'none' ? undefined : art?.patterns.get(design.pattern);
  const pattern = patternFile
    ? patternLayer(patternFile, design.patternColor, design.patternOpacity, width, height, 'invitation-pattern')
    : '';

  // Side decorations: top left, and the same turned round at the bottom right,
  // each moved and resized by hand. Whatever goes past the card is cut off.
  const decoration = design.decoration === 'none' ? undefined : art?.decorations.get(design.decoration);
  let decorations = '';
  if (decoration) {
    const decorationWidth = decorationBaseWidth(design.size);
    const ratio =
      decoration.kind === 'drawing'
        ? (({ width: w, height: h }) => (w > 0 ? h / w : 1))(viewBoxOf(decoration.file))
        : decoration.file.height / decoration.file.width;
    const decorationHeight = round(decorationWidth * ratio);
    const box = `width="${round(decorationWidth)}" height="${decorationHeight}"`;
    // A picture is embedded once and used by both corners (it can weigh a few hundred kB).
    if (decoration.kind === 'picture') {
      defs += `<defs><image id="invitation-decoration" ${box} preserveAspectRatio="xMinYMin meet" xlink:href="${decoration.file.href}"/></defs>`;
    }
    const drawing = (idPrefix: string) =>
      decoration.kind === 'picture'
        ? `<use xlink:href="#invitation-decoration"/>`
        : `<svg ${box} viewBox="${decoration.file.viewBox}" preserveAspectRatio="xMinYMin meet">` +
          `${paint(decoration.file, design.decorationColor, idPrefix, { keepWhite: true })}</svg>`;
    const step = Math.min(width, height) * CORNER_ADJUST.moveStep;
    const place = ({ x, y, size }: CornerAdjustment) => ({
      dx: round(x * step),
      dy: round(y * step),
      scale: size / 100,
    });
    const topLeft = place(design.decorationAdjustments[0]);
    const bottomRight = place(design.decorationAdjustments[1]);
    // Moved on the card first, then turned and resized around its own corner.
    decorations =
      `<g transform="translate(${topLeft.dx} ${topLeft.dy}) scale(${topLeft.scale})">${drawing('invitation-decoration-1')}</g>` +
      `<g transform="translate(${round(width + bottomRight.dx)} ${round(height + bottomRight.dy)}) rotate(180) scale(${bottomRight.scale})">` +
      `${drawing('invitation-decoration-2')}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
<title>${escapeXml(`${one} & ${two}`)}</title>
${defs}${background}
${pattern}
${decorations}
${drawn}
</svg>`;
}
