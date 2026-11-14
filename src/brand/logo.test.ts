/// <reference types="node" />
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BORDER_STYLES, borderLabel, paint, parseBorderFile } from './borders';
import { sans } from './glyphs/sans';
import { script } from './glyphs/script';
import { serif } from './glyphs/serif';
import { DEFAULT_MONOGRAM, monogramParts, monogramSvg, sanitizeMonogram, type MonogramDesign } from './monogram';
import { LOGO_PRESETS, LOGO_SCHEMES, withScheme, type LogoScheme } from './presets';

const fonts = { script, sans, serif };
const design = (changes: Partial<MonogramDesign>): MonogramDesign => ({ ...DEFAULT_MONOGRAM, ...changes });

// public/brand/<preset>[-<scheme>].svg: ready-made files of the logo for later use
// (print shop, invitations, social). Regenerate them with `npm run brand`.
// Tests run from the project root.
const BRAND_DIR = path.resolve(process.cwd(), 'public/brand');
const files = (Object.keys(LOGO_PRESETS) as (keyof typeof LOGO_PRESETS)[]).flatMap((preset) =>
  (Object.keys(LOGO_SCHEMES) as LogoScheme[]).map((scheme) => ({
    file: `${preset}${scheme === 'color' ? '' : `-${scheme}`}.svg`,
    svg: monogramSvg(withScheme(LOGO_PRESETS[preset], scheme), fonts, { size: 512, title: 'G V' }),
  })),
);

/**
 * Whether a file on disk holds `expected`, line endings aside: a Windows
 * checkout (git core.autocrlf) writes the files with CRLF, and the Docker
 * build must still pass there.
 */
function isUpToDate(file: string, expected: string): boolean {
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n') === expected;
}

describe('monogram', () => {
  it('crosses the letters, the first one cut where the second one passes, on a transparent background', () => {
    const { body } = monogramParts(DEFAULT_MONOGRAM, fonts, 'logo');
    expect(body).toContain('mask="url(#logo-gap)"');
    expect(body).toContain('fill="#6d3350"');
    expect(body).toContain('fill="#c24f78"');
    expect(body).toContain(`d="${script.glyphs.G.d}"`);
    expect(body).toContain(`d="${script.glyphs.V.d}"`);
    expect(body).not.toContain('<rect width');
  });

  it('draws the letters in the chosen font, upper case', () => {
    const { body } = monogramParts(design({ letters: ['d', 's'], font: 'serif', arrangement: 'aligned' }), fonts);
    expect(body).toContain(`d="${serif.glyphs.D.d}"`);
    expect(body).toContain(`d="${serif.glyphs.S.d}"`);
    expect(body).not.toContain('mask=');
  });

  it('puts the separator between spaced letters, in its own colour', () => {
    const heart = monogramParts(
      design({ arrangement: 'aligned', separator: 'heart', separatorColor: '#ff0000' }),
      fonts,
    ).body;
    expect(heart).toContain('fill="#ff0000"');
    expect(heart).toContain('C-575');
    const ampersand = monogramParts(
      design({ arrangement: 'diagonal', separator: 'ampersand', font: 'sans' }),
      fonts,
    ).body;
    expect(ampersand).toContain(`d="${sans.glyphs['&'].d}"`);
    // Not when crossed.
    const crossed = monogramParts(design({ separator: 'heart' }), fonts).body;
    expect(crossed).not.toContain('C-575');
  });

  it('writes a custom separator with outlines, or as text when the font table lacks a character', () => {
    const plus = monogramParts(
      design({ arrangement: 'aligned', separator: 'custom', customSeparator: '+' }),
      fonts,
    ).body;
    expect(plus).toContain(`d="${script.glyphs['+'].d}"`);
    const accent = monogramParts(
      design({ arrangement: 'aligned', separator: 'custom', customSeparator: 'é<' }),
      fonts,
    ).body;
    expect(accent).toContain('>é</text>');
    expect(accent).toContain('&lt;');
  });

  it.each(BORDER_STYLES.filter((style) => style !== 'none'))(
    'draws the border file %s in the chosen colour',
    (style) => {
      const { body } = monogramParts(design({ border: style, borderColor: '#123456' }), fonts);
      expect(body).toContain('<svg x="0" y="0" width="1000" height="1000"');
      expect(body).toContain('fill="#123456"');
      // Every colour of the file replaced.
      expect(body).not.toMatch(/(fill|stroke)="#000000"/);
    },
  );

  it('offers every file of src/brand/borders, named after it', () => {
    expect(BORDER_STYLES).toEqual(['none', 'big_flowers', 'circles', 'small_flowers', 'squares', 'stile_uno']);
    expect(borderLabel('stile_uno')).toBe('Stile uno');
    expect(borderLabel('my-new__border')).toBe('My new border');
  });

  it('reads the room a border leaves for the letters', () => {
    const file = (attrs: string) =>
      parseBorderFile(
        'x',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" ${attrs}><path d="M0 0"/></svg>`,
      )!;
    expect(file('').room).toEqual({ shape: 'circle', fraction: 0.6 });
    expect(file('data-room="0.5" data-room-shape="square"').room).toEqual({ shape: 'square', fraction: 0.5 });
    expect(file('data-room="7"').room.fraction).toBe(0.6);
    // Units and sizes of any kind: only the viewBox matters, or width and height without one.
    expect(parseBorderFile('y', '<svg width="240pt" height="120pt"><path d="M0 0"/></svg>')!.viewBox).toBe(
      '0 0 240 120',
    );
    expect(parseBorderFile('z', '<p>not an svg</p>')).toBeNull();
  });

  it('keeps only the drawing of a border file, and makes its ids unique', () => {
    const file = parseBorderFile(
      'evil',
      `<?xml version="1.0"?><!DOCTYPE svg><svg viewBox="0 0 10 10" onload="alert(1)">
        <script>alert(2)</script><style>path{fill:url(https://x)}</style>
        <foreignObject><div>hi</div></foreignObject><image href="https://x/y.png"/>
        <defs><linearGradient id="g"><stop stop-color="#ff0000"/></linearGradient></defs>
        <a href="javascript:alert(3)"><path d="M1 1"/></a>
        <path d="M0 0" fill="url(#g)" style="fill:red" onclick="alert(4)"/><use href="#g"/><use href="https://x#a"/>
      </svg>`,
    )!;
    expect(file.content).not.toMatch(/script|alert|style|foreignObject|image|javascript|https/);
    const painted = paint(file, '#123456', 'p');
    expect(painted).toContain('id="p-evil-g"');
    expect(painted).toContain('href="#p-evil-g"');
    expect(painted).toContain('stop-color="#123456"');
    expect(painted).toMatch(/^<g fill="#123456"/);
  });

  it('turns the border names of earlier versions into their files, and a missing file into none', () => {
    expect(sanitizeMonogram({ border: 'flowersBig' }).border).toBe('big_flowers');
    expect(sanitizeMonogram({ border: 'circles' }).border).toBe('circles');
    expect(sanitizeMonogram({ border: 'deleted_file' }).border).toBe('none');
  });

  it('keeps the letters inside the canvas, whatever the arrangement', () => {
    for (const arrangement of ['crossed', 'aligned', 'diagonal'] as const) {
      for (const border of ['none', 'circles'] as const) {
        const { body } = monogramParts(design({ arrangement, border, separator: 'ampersand' }), fonts);
        const [, tx, ty, scale] = /<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)">/
          .exec(body)!
          .map(Number);
        expect(tx).toBeGreaterThan(-200);
        expect(ty).toBeGreaterThan(0);
        expect(scale).toBeGreaterThan(0.1);
        expect(scale).toBeLessThan(1.5);
      }
    }
  });

  it('draws a single letter when the other one is empty', () => {
    const { body } = monogramParts(design({ letters: ['A', ''] }), fonts);
    expect(body).toContain(`d="${script.glyphs.A.d}"`);
    expect(body).not.toContain('mask=');
  });

  it('checks every field of a saved design, keeping what is valid', () => {
    expect(sanitizeMonogram(null)).toEqual(DEFAULT_MONOGRAM);
    expect(
      sanitizeMonogram({
        letters: ['dd', 7],
        colors: ['#ABCDEF', 'red" onload="x'],
        arrangement: 'aligned',
        separator: 'explode',
        customSeparator: 'abcdef',
        font: 'comic',
        border: 'squares',
        borderColor: '#123',
      }),
    ).toEqual({
      ...DEFAULT_MONOGRAM,
      letters: ['D', 'V'],
      colors: ['#abcdef', DEFAULT_MONOGRAM.colors[1]],
      arrangement: 'aligned',
      customSeparator: 'abc',
      border: 'squares',
    });
    // An empty second letter stays empty.
    expect(sanitizeMonogram({ letters: ['A', ''] }).letters).toEqual(['A', '']);
  });

  it.each(files)('public/brand/$file is up to date (npm run brand)', ({ file, svg }) => {
    const target = path.join(BRAND_DIR, file);
    if (process.env.BRAND_WRITE) {
      mkdirSync(BRAND_DIR, { recursive: true });
      writeFileSync(target, svg);
    }
    expect(isUpToDate(target, svg)).toBe(true);
  });

  describe('on a Windows checkout (CRLF line endings)', () => {
    const toCrlf = (text: string) => text.replace(/\r?\n/g, '\r\n');
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(path.join(os.tmpdir(), 'brand-'));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('ignores line endings when comparing, so a Windows checkout builds even with the files it already has', () => {
      const { file, svg } = files[0];
      const windowsCopy = path.join(dir, file);
      writeFileSync(windowsCopy, toCrlf(svg));
      expect(readFileSync(windowsCopy, 'utf8')).toContain('\r\n');
      expect(isUpToDate(windowsCopy, svg)).toBe(true);
    });

    it('still notices a real change, whatever the line endings', () => {
      const { file, svg } = files[0];
      const changed = path.join(dir, file);
      writeFileSync(changed, toCrlf(svg.replace('#6d3350', '#000000')));
      expect(isUpToDate(changed, svg)).toBe(false);
    });

    it.each(BORDER_STYLES.filter((style) => style !== 'none'))(
      'reads the border file %s exactly the same with CRLF',
      (style) => {
        const source = readFileSync(path.resolve(process.cwd(), `src/brand/borders/${style}.svg`), 'utf8');
        const unix = parseBorderFile(style, source.replace(/\r\n/g, '\n'))!;
        const windows = parseBorderFile(style, toCrlf(source))!;
        // Exactly: not "the same once the line endings are fixed".
        expect(windows).toEqual(unix);
        expect(paint(windows, '#123456', 'w')).toBe(paint(unix, '#123456', 'w'));
      },
    );

    it('makes the very same seal logo from border files with CRLF', () => {
      const source = readFileSync(path.resolve(process.cwd(), 'src/brand/borders/circles.svg'), 'utf8');
      const fromWindows = parseBorderFile('circles', toCrlf(source))!;
      const seal = files.find(({ file }) => file === 'gv-seal.svg')!;
      // The ready-made seal (made from circles.svg) has no CR, so a Windows copy of the border changes nothing in it.
      expect(seal.svg).not.toContain('\r');
      expect(fromWindows.content).not.toContain('\r');
    });
  });
});
