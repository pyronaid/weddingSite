import { readFileSync } from 'node:fs';
import {
  applyPalette,
  contrastProblems,
  contrastRatio,
  mixColours,
  DEFAULT_PALETTE,
  PALETTE_KEYS,
  PALETTE_PRESET_IDS,
  PALETTE_PRESETS,
  PALETTE_VARS,
  paletteStyle,
  sanitizePalette,
} from './palette';

describe('colour palette', () => {
  it('has the same defaults as global.css', () => {
    const css = readFileSync('src/styles/global.css', 'utf8');
    for (const key of PALETTE_KEYS) {
      expect(css, PALETTE_VARS[key]).toContain(`${PALETTE_VARS[key]}: ${DEFAULT_PALETTE[key]};`);
    }
  });

  it('measures contrast as WCAG does', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it.each(PALETTE_PRESET_IDS)('the ready-made palette "%s" is easy to read', (id) => {
    expect(contrastProblems(PALETTE_PRESETS[id])).toEqual([]);
  });

  it('points out what is hard to read, with the worst ratio', () => {
    const problems = contrastProblems({ ...DEFAULT_PALETTE, cardText: '#7a4560', text: '#f0f0f0' });
    expect(problems.map((problem) => problem.id)).toEqual(['pageText', 'cardText']);
    expect(problems[1]).toEqual({ id: 'cardText', ratio: 1.2, min: 4.5 });
  });

  it('keeps only "#rrggbb" colours from a saved palette, in lower case', () => {
    expect(sanitizePalette(undefined)).toEqual(DEFAULT_PALETTE);
    expect(sanitizePalette('pink')).toEqual(DEFAULT_PALETTE);
    expect(
      sanitizePalette({
        cardBg: '#ABCDEF',
        text: 'red',
        accent: 'url(https://example.com/x)',
        pageEdge: '#abc',
        unknown: '#000000',
      }),
    ).toEqual({ ...DEFAULT_PALETTE, cardBg: '#abcdef' });
  });

  it('applies to the whole page, leaving the defaults to global.css', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#f9cfdd">';
    const sage = PALETTE_PRESETS.sage;
    applyPalette(sage);
    const root = document.documentElement.style;
    expect(root.getPropertyValue('--card-bg')).toBe(sage.cardBg);
    expect(root.getPropertyValue('--page-edge')).toBe(sage.pageEdge);
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe(sage.pageEdge);

    applyPalette(DEFAULT_PALETTE);
    expect(root.getPropertyValue('--card-bg')).toBe('');
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#f9cfdd');
  });

  it('mixes two colours', () => {
    expect(mixColours('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixColours('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixColours('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColours('#4a2537', '#ffffff', 0.25)).toBe('#775c69');
  });

  it('gives the CSS custom properties for a preview', () => {
    expect(paletteStyle(DEFAULT_PALETTE)).toMatchObject({ '--card-bg': '#6d3350', '--accent-strong': '#c24f78' });
  });
});
