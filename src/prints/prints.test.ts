import { sans } from '../brand/glyphs/sans';
import { script } from '../brand/glyphs/script';
import { serif } from '../brand/glyphs/serif';
import { DEFAULT_MONOGRAM, monogramParts } from '../brand/monogram';
import { defaultContent } from '../config/wedding';
import { printMessages } from '../features/private-area/messages/prints';
import type { ImageFile } from '../brand/imageFiles';
import { parseSvgFile, type SvgFile } from '../brand/svgFiles';
import { DEFAULT_PALETTE, PALETTE_PRESETS } from '../theme/palette';
import { DECORATIONS, loadInvitationArt, PATTERNS, withPictures, type InvitationArt } from './art';
import {
  decorationResolution,
  DEFAULT_INVITATION,
  invitationSvg,
  NO_CORNER_ADJUSTMENT,
  PATTERN_OPACITY,
  patternLayer,
  sanitizeInvitation,
  type InvitationDesign,
  type InvitationInput,
} from './invitations';
import { printDocument } from './output';
import { posterSvg } from './posters';
import { wrapText } from './svg';

const QR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges"><path d="M0 0h7v7H0z"/></svg>';
const logo = monogramParts(DEFAULT_MONOGRAM, { script, sans, serif }, 'test');

let art: InvitationArt;
beforeAll(async () => {
  art = await loadInvitationArt();
});

const file = (id: string, source: string) => parseSvgFile(id, source)!;
/** Small files, so the tests do not depend on the artwork in the folders. */
const LEAF = file(
  'leaf',
  '<svg viewBox="0 0 100 50"><path id="a" fill="#7d9a6a" d="M0 0h9v9z"/><path fill="#fff" d="M1 1h2v2z"/></svg>',
);
const DOTS = file('dots', '<svg viewBox="0 0 40 20"><circle fill="#999" r="2"/><circle fill="white" r="1"/></svg>');
const fakeArt = (decorations: SvgFile[] = [LEAF], patterns: SvgFile[] = [DOTS]): InvitationArt => ({
  decorations: new Map(decorations.map((item) => [item.id, { kind: 'drawing' as const, file: item }])),
  patterns: new Map(patterns.map((item) => [item.id, item])),
});

const invitation = (design: Partial<InvitationDesign> = {}, input: Partial<InvitationInput> = {}) => {
  const full = { ...DEFAULT_INVITATION, ...design };
  return invitationSvg({
    design: full,
    content: defaultContent,
    url: 'https://gioevale.com',
    qrSvg: QR,
    logo,
    signupCode: '#wedding',
    locale: full.language === 'it' ? 'it-IT' : 'en-GB',
    texts: printMessages[full.language].card,
    art,
    ...input,
  });
};

describe('wrapText', () => {
  it('breaks at spaces, and shortens what does not fit', () => {
    expect(wrapText('Piazza San Pietro 1, 00120 Roma', 18)).toEqual(['Piazza San Pietro', '1, 00120 Roma']);
    expect(wrapText('short', 20)).toEqual(['short']);
    expect(wrapText('one two three four five six', 8, 2)).toEqual(['one two', 'three…']);
  });
});

describe('invitations', () => {
  it('has the couple, the date, both venues with their times, the deadline, the QR code and the logo', () => {
    const svg = invitation();
    expect(svg).toContain('width="210mm" height="297mm"');
    expect(svg).toContain('You are invited');
    expect(svg).toContain('to celebrate the wedding of');
    expect(svg).toContain('>Giulia <tspan fill="#c24f78">&amp;</tspan> Marco</text>');
    // With or without the comma, depending on the browser's date data.
    expect(svg).toMatch(/Saturday,? 19 June 2027/);
    expect(svg).toContain('>at 16:00<');
    expect(svg).toContain('>at 19:00<');
    expect(svg).toContain('CEREMONY');
    expect(svg).toContain('RECEPTION');
    expect(svg).toContain('Please reply by 30 April 2027');
    expect(svg).toContain('>gioevale.com<');
    expect(svg).toContain('viewBox="0 0 29 29" shape-rendering="crispEdges"');
    expect(svg).toContain('Code for the private area: #wedding');
    expect(svg).toContain('mask="url(#test-gap)"');
    // No frame any more.
    expect(svg).not.toContain('rx=');
  });

  it('comes in three sizes', () => {
    expect(invitation({ size: 'square' })).toContain('width="150mm" height="150mm"');
    expect(invitation({ size: 'a4-landscape' })).toContain('width="297mm" height="210mm"');
  });

  it('has no line, one line or two for the names', () => {
    const lines = (names: InvitationDesign['names']) =>
      (invitation({ names, qr: false }).match(/<line /g) ?? []).length;
    // The line under the date is always there.
    expect(lines('none')).toBe(1);
    expect(lines('one')).toBe(2);
    expect(lines('two')).toBe(3);
    expect(invitation({ names: 'two' })).toContain('You are both invited');
    expect(invitation({ names: 'none' })).not.toContain('>Dear<');
  });

  it('takes a title, a subtitle and a QR text of its own, or none', () => {
    const svg = invitation({ heading: 'Save the date', subheading: '', qrText: 'All the details online' });
    expect(svg).toContain('Save the date');
    expect(svg).not.toContain('to celebrate');
    expect(svg).toContain('All the details online');
  });

  it('leaves out the QR code, the logo and the sign-up code on request', () => {
    const svg = invitation({ qr: false, logo: false, signupCode: false });
    expect(svg).not.toContain('viewBox="0 0 29 29"');
    expect(svg).not.toContain('Please reply');
    expect(svg).not.toContain('test-gap');
    expect(svg).not.toContain('#wedding<');
    // The code alone, without the QR block.
    expect(invitation({ qr: false })).toContain('Code for the private area: #wedding');
  });

  it('shades the background in the chosen colour, or leaves it white', () => {
    expect(invitation({ background: '#f6d3df' })).toContain('<stop offset="0" stop-color="#f6d3df"/>');
    expect(invitation()).toContain('<rect width="210" height="297" fill="#ffffff"/>');
  });

  describe('side decorations (files)', () => {
    it('draws the file in two corners, in the chosen colour, white parts kept white', () => {
      const svg = invitation({ decoration: 'leaf', decorationColor: '#123456' }, { art: fakeArt() });
      // Top left, 38% of the short side wide, keeping the file's proportions.
      expect(svg).toContain(
        '<svg width="79.8" height="39.9" viewBox="0 0 100 50" preserveAspectRatio="xMinYMin meet">',
      );
      expect(svg).toContain('<g transform="translate(0 0) scale(1)">');
      expect(svg).toContain('<g transform="translate(210 297) rotate(180) scale(1)">');
      expect(svg).toContain('fill="#123456" d="M0 0h9v9z"');
      expect(svg).toContain('fill="#ffffff" d="M1 1h2v2z"');
      expect(svg).not.toContain('#7d9a6a');
      // Each corner's ids its own.
      expect(svg).toContain('id="invitation-decoration-1-leaf-a"');
      expect(svg).toContain('id="invitation-decoration-2-leaf-a"');
    });

    it('draws none for "none", for a file that is gone, or before the files are loaded', () => {
      expect(invitation({ decoration: 'none' }, { art: fakeArt() })).not.toContain('rotate(180)');
      expect(invitation({ decoration: 'gone' }, { art: fakeArt() })).not.toContain('rotate(180)');
      expect(invitation({ decoration: 'leaf' }, { art: undefined })).not.toContain('rotate(180)');
    });

    it.each(DECORATIONS.filter((decoration) => decoration !== 'none'))(
      'decorates two corners with the file %s',
      (decoration) => {
        const svg = invitation({ decoration, decorationColor: '#123456' });
        expect(art.decorations.has(decoration)).toBe(true);
        expect(svg).toContain('rotate(180)');
        // Drawings take the chosen colour; pictures keep theirs, embedded once.
        if (art.decorations.get(decoration)!.kind === 'drawing') expect(svg).toContain('#123456');
        else expect(svg.match(/xlink:href="data:image\/(webp|png);base64,/g)).toHaveLength(1);
      },
    );

    describe('pictures (PNG, WebP)', () => {
      const PICTURE: ImageFile = {
        id: 'peonies',
        label: 'Peonies',
        href: 'data:image/webp;base64,UklGRg==',
        width: 2400,
        height: 1200,
      };
      const withPicture = (): InvitationArt => ({
        decorations: new Map([['peonies', { kind: 'picture', file: PICTURE }]]),
        patterns: new Map(),
      });

      it('is embedded once, used in both corners, in its own colours and proportions', () => {
        const svg = invitation({ decoration: 'peonies', decorationColor: '#123456' }, { art: withPicture() });
        expect(svg).toContain(
          `<defs><image id="invitation-decoration" width="79.8" height="39.9" preserveAspectRatio="xMinYMin meet" xlink:href="${PICTURE.href}"/></defs>`,
        );
        expect(svg.match(/<use xlink:href="#invitation-decoration"\/>/g)).toHaveLength(2);
        expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
        expect(svg).not.toContain('#123456');
      });

      it('says how sharp it prints in each corner', () => {
        // 2400 px over 79.8 mm (A4 portrait): 764 dpi; three times as big: 255.
        expect(
          decorationResolution(
            {
              ...DEFAULT_INVITATION,
              decoration: 'peonies',
              decorationAdjustments: [NO_CORNER_ADJUSTMENT, { x: 0, y: 0, size: 300 }],
            },
            withPicture(),
          ),
        ).toEqual([764, 255]);
        // Drawings are always sharp.
        expect(decorationResolution({ ...DEFAULT_INVITATION, decoration: 'leaf' }, fakeArt())).toBeNull();
      });

      it('changes only the pictures when asked (e.g. PNG copies for an SVG file)', async () => {
        const art = await withPictures(
          { ...withPicture(), decorations: new Map([...withPicture().decorations, ...fakeArt().decorations]) },
          () => 'data:image/png;base64,iVBORw0KGgo=',
        );
        expect(art.decorations.get('peonies')).toMatchObject({ file: { href: 'data:image/png;base64,iVBORw0KGgo=' } });
        expect(art.decorations.get('leaf')).toEqual(fakeArt().decorations.get('leaf'));
      });
    });

    describe('moved and resized by hand, in each corner', () => {
      it('moves in the card directions and grows from its corner, in steps of the short side', () => {
        const svg = invitation(
          {
            decoration: 'leaf',
            decorationAdjustments: [
              { x: 1, y: 2, size: 150 },
              { x: -3, y: -1, size: 50 },
            ],
          },
          { art: fakeArt() },
        );
        // A step is 2% of 210 mm: 4.2 mm.
        expect(svg).toContain('<g transform="translate(4.2 8.4) scale(1.5)">');
        // The bottom-right one goes left and up on the card, though it is turned round.
        expect(svg).toContain('<g transform="translate(197.4 292.8) rotate(180) scale(0.5)">');
      });

      it('checks saved moves: whole steps within the limits, or not moved', () => {
        const saved = (decorationAdjustments: unknown) =>
          sanitizeInvitation({ decorationAdjustments }, 'en').decorationAdjustments;
        expect(saved(undefined)).toEqual([NO_CORNER_ADJUSTMENT, NO_CORNER_ADJUSTMENT]);
        expect(
          saved([
            { x: 50, y: -50, size: 300 },
            { x: 1, y: 1, size: 25 },
          ]),
        ).toEqual([
          { x: 50, y: -50, size: 300 },
          { x: 1, y: 1, size: 25 },
        ]);
        for (const wrong of [
          { x: 51, y: 0, size: 100 },
          { x: 0.5, y: 0, size: 100 },
          { x: 0, y: 0, size: 20 },
          { x: 0, y: 0, size: 102 },
          { x: '1', y: 0, size: 100 },
          'up',
        ]) {
          expect(saved([wrong, wrong])).toEqual([NO_CORNER_ADJUSTMENT, NO_CORNER_ADJUSTMENT]);
        }
      });
    });
  });

  describe('background pattern (files)', () => {
    it('is not there by default', () => {
      expect(DEFAULT_INVITATION.pattern).toBe('none');
      expect(invitation({}, { art: fakeArt() })).not.toContain('invitation-pattern');
      expect(invitation({ pattern: 'gone' }, { art: fakeArt() })).not.toContain('invitation-pattern');
    });

    it('covers the card through a mask, in its colour and strength, under the decorations and the texts', () => {
      const svg = invitation(
        { pattern: 'dots', patternColor: '#123456', patternOpacity: 20, decoration: 'leaf' },
        { art: fakeArt() },
      );
      expect(svg).toContain(
        '<rect width="210" height="297" fill="#123456" fill-opacity="0.2" mask="url(#invitation-pattern-mask)"/>',
      );
      // Drawn parts show, white parts hide what is behind them.
      expect(svg).toContain('<circle fill="#ffffff" r="2"/><circle fill="#000000" r="1"/>');
      const at = (needle: string) => svg.indexOf(needle);
      expect(at('<rect width="210" height="297" fill="#ffffff"/>')).toBeLessThan(at('invitation-pattern-mask'));
      expect(at('invitation-pattern-mask')).toBeLessThan(at('rotate(180)'));
      expect(at('rotate(180)')).toBeLessThan(at('CEREMONY'));
    });

    it('repeats in tiles of a set size on every card, or covers the card once', () => {
      // Default: 150 mm wide tiles, keeping the file's proportions.
      expect(patternLayer(DOTS, '#000000', 15, 210, 297, 'p')).toContain(
        '<pattern id="p-tile" patternUnits="userSpaceOnUse" width="150" height="75">',
      );
      const small = file('small', '<svg data-tile="40" viewBox="0 0 40 20"><circle r="2"/></svg>');
      expect(patternLayer(small, '#000000', 15, 150, 150, 'p')).toContain('width="40" height="20"');
      const once = file('once', '<svg data-fit="cover" viewBox="0 0 40 20"><circle r="2"/></svg>');
      const cover = patternLayer(once, '#000000', 15, 150, 150, 'p');
      expect(cover).not.toContain('<pattern');
      expect(cover).toContain(
        '<svg width="150" height="150" viewBox="0 0 40 20" preserveAspectRatio="xMidYMid slice">',
      );
    });

    it.each(PATTERNS.filter((pattern) => pattern !== 'none'))('draws the file %s', (pattern) => {
      expect(art.patterns.has(pattern)).toBe(true);
      expect(invitation({ pattern })).toContain('mask="url(#invitation-pattern-mask)"');
    });
  });

  describe('colours of the site palette', () => {
    const sage = PALETTE_PRESETS.sage;
    // No logo, decorations or pattern: they keep the colours chosen in the designer.
    const plain = (palette: typeof sage) =>
      invitation(
        { logo: false, decoration: 'none', background: '#f6d3df' },
        { content: { ...defaultContent, palette }, logo: undefined },
      );
    const accentOn = (svg: string, label: string) =>
      expect(svg).toMatch(new RegExp(`fill="${sage.accentStrong}"[^>]*>${label}<`));

    it('takes the strong accent for the "&", the labels, the lines, the website and the hashtag', () => {
      const svg = plain(sage);
      expect(svg).toContain(`>Giulia <tspan fill="${sage.accentStrong}">&amp;</tspan> Marco</text>`);
      accentOn(svg, 'CEREMONY');
      accentOn(svg, 'RECEPTION');
      accentOn(svg, 'gioevale\\.com');
      accentOn(svg, defaultContent.couple.hashtag);
      // The solid line under the date, and the dotted one above the QR code.
      const accentLines = (svg.match(/<line [^>]*>/g) ?? []).filter((line) =>
        line.includes(`stroke="${sage.accentStrong}"`),
      );
      expect(accentLines.some((line) => !line.includes('dasharray'))).toBe(true);
      expect(accentLines.some((line) => line.includes('dasharray'))).toBe(true);
    });

    it('takes the title, text and paper colours too, leaving none of the original ones', () => {
      const svg = plain(sage);
      expect(svg).toMatch(new RegExp(`fill="${sage.cardBg}"[^>]*>You are invited<`));
      expect(svg).toMatch(new RegExp(`fill="${sage.text}"[^>]*>at 16:00<`));
      expect(svg).toContain(`stop-color="${sage.pageLight}"`);
      for (const original of ['#c24f78', '#6d3350', '#4a2537', '#7a5566', '#fffaf7']) {
        expect(svg, original).not.toContain(original);
      }
    });

    it('looks as before with the original palette', () => {
      const svg = plain(DEFAULT_PALETTE);
      expect(svg).toContain('>Giulia <tspan fill="#c24f78">&amp;</tspan> Marco</text>');
      expect(svg).toMatch(/fill="#6d3350"[^>]*>You are invited</);
      expect(svg).toContain('stop-color="#fffaf7"');
    });
  });

  it('centres the ceremony alone when there is no reception', () => {
    const svg = invitation({}, { content: { ...defaultContent, reception: null } });
    expect(svg).not.toContain('RECEPTION');
  });

  it('escapes what the super admin typed', () => {
    const svg = invitation(
      { heading: '<b>Hi</b>' },
      {
        content: { ...defaultContent, couple: { ...defaultContent.couple, partnerOne: 'Ann<script>' } },
        signupCode: 'a&b"',
      },
    );
    expect(svg).toContain('Ann&lt;script&gt;');
    expect(svg).toContain('&lt;b&gt;Hi&lt;/b&gt;');
    expect(svg).toContain('a&amp;b&quot;');
    expect(svg).not.toContain('<script>');
  });

  it('speaks Italian, in a neutral way, with Italian dates', () => {
    const one = invitation({ language: 'it' });
    expect(one).toContain('Ti invitiamo');
    expect(one).toContain('>Per<');
    expect(one).toMatch(/Sabato,? 19 giugno 2027/);
    expect(one).toContain('Rispondi entro il 30 aprile 2027');
    expect(one).toContain('>ore 16:00<');
    const couple = invitation({ language: 'it', names: 'two' });
    expect(couple).toContain('Vi invitiamo');
    expect(couple).toContain('Rispondete entro');
  });
});

describe('sanitizeInvitation', () => {
  it('checks every field of a saved design, keeping what is valid', () => {
    expect(sanitizeInvitation(undefined, 'it')).toEqual({ ...DEFAULT_INVITATION, language: 'it' });
    expect(
      sanitizeInvitation(
        {
          size: 'square',
          names: 'many',
          heading: 'x'.repeat(100),
          subheading: null,
          language: 'fr',
          qr: false,
          qrText: 42,
          background: '#D9E4CF',
          decoration: 'roots',
          decorationColor: 'url(javascript:x)',
          pattern: 'gone',
          patternColor: '#ABCDEF',
          patternOpacity: 23,
        },
        'en',
      ),
    ).toEqual({
      ...DEFAULT_INVITATION,
      size: 'square',
      heading: 'x'.repeat(80),
      subheading: null,
      qr: false,
      background: '#d9e4cf',
      decoration: 'roots',
      patternColor: '#abcdef',
    });
    expect(sanitizeInvitation({ background: '<b>' }, 'en').background).toBeNull();
    expect(sanitizeInvitation({ decoration: 'gone' }, 'en').decoration).toBe(DEFAULT_INVITATION.decoration);
  });

  it('keeps a pattern only if its file is there, and a strength only in whole steps', () => {
    const pattern = PATTERNS.find((value) => value !== 'none')!;
    expect(sanitizeInvitation({ pattern }, 'en').pattern).toBe(pattern);
    const strength = (patternOpacity: unknown) => sanitizeInvitation({ patternOpacity }, 'en').patternOpacity;
    expect(strength(40)).toBe(40);
    expect(strength(PATTERN_OPACITY.min)).toBe(PATTERN_OPACITY.min);
    expect(strength(PATTERN_OPACITY.max)).toBe(PATTERN_OPACITY.max);
    for (const wrong of [0, 23, 105, 12.5, '40', null]) expect(strength(wrong)).toBe(PATTERN_OPACITY.initial);
  });
});

describe('posters', () => {
  it('puts the card and the QR code of its riddle on an A3 page', () => {
    const svg = posterSvg({
      cardName: '5 of clubs',
      cardSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 336"><rect width="240" height="336"/></svg>',
      qrSvg: QR,
      url: 'https://gioevale.com/area/riddles/abc',
      texts: printMessages.en.posters.texts,
    });
    expect(svg).toContain('width="297mm" height="420mm"');
    expect(svg).toContain('Scan me to win the 5 of clubs');
    expect(svg).toContain('https://gioevale.com/area/riddles/abc');
    expect(svg).toContain('viewBox="0 0 240 336"');
  });
});

describe('printDocument', () => {
  it('prints one page per SVG, at the given size', () => {
    const pages = ['<svg>1</svg>', '<?xml version="1.0"?>\n<svg>2</svg>'];
    const html = printDocument(pages, { width: 150, height: 150 }, 'Cards');
    expect(html.match(/class="sheet"/g)).toHaveLength(2);
    expect(html).toContain('@page { size: 150mm 150mm; margin: 0; }');
    expect(html).toContain('<div class="sheet"><svg>2</svg></div>');
    expect(printDocument(pages, { width: 297, height: 420 }, '<b>')).toContain('<title>&lt;b></title>');
  });
});
