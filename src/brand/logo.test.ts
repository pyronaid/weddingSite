/// <reference types="node" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sans } from './glyphs/sans';
import { script } from './glyphs/script';
import { serif } from './glyphs/serif';
import { DEFAULT_MONOGRAM, monogramParts, monogramSvg, type MonogramDesign } from './monogram';
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

  it.each(['flowersSmall', 'flowersBig', 'circles', 'squares'] as const)(
    'draws the %s border in its colour',
    (border) => {
      const { body } = monogramParts(design({ border, borderColor: '#123456' }), fonts);
      expect(body).toMatch(/(stroke|fill)="#123456"/);
    },
  );

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

  it.each(files)('public/brand/$file is up to date (npm run brand)', ({ file, svg }) => {
    const target = path.join(BRAND_DIR, file);
    if (process.env.BRAND_WRITE) {
      mkdirSync(BRAND_DIR, { recursive: true });
      writeFileSync(target, svg);
    }
    // Line endings aside: a Windows checkout (core.autocrlf) may turn them into CRLF.
    expect(readFileSync(target, 'utf8').replace(/\r\n/g, '\n')).toBe(svg);
  });
});
