/// <reference types="node" />
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { LOGO_SCHEMES, LOGO_VARIANTS, logoParts, logoSvg, type LogoScheme } from './logo';

// public/brand/gv-<variant>[-<scheme>].svg: ready-made files of the logo for later use
// (print shop, invitations, social). Regenerate them with `npm run brand`.
// Tests run from the project root.
const BRAND_DIR = path.resolve(process.cwd(), 'public/brand');
const files = LOGO_VARIANTS.flatMap((variant) =>
  (Object.keys(LOGO_SCHEMES) as LogoScheme[]).map((scheme) => ({
    file: `gv-${variant}${scheme === 'color' ? '' : `-${scheme}`}.svg`,
    svg: logoSvg(variant, LOGO_SCHEMES[scheme]),
  })),
);

describe('logo', () => {
  it('draws the G with a gap where the V crosses it, on any background', () => {
    const svg = logoSvg('script');
    expect(svg).toMatch(/^<\?xml/);
    expect(svg).toContain('viewBox="-86 -897 1348 1348"');
    expect(svg).toContain('mask="url(#gv-script-gap)"');
    expect(svg).toContain('fill="#6d3350"');
    expect(svg).toContain('fill="#c24f78"');
    // Transparent: nothing drawn behind the letters.
    expect(logoParts('script', LOGO_SCHEMES.color).body.startsWith('<defs>')).toBe(true);
  });

  it('puts the seal in a double ring, and recolours everything', () => {
    const svg = logoSvg('seal', { primary: '#111111', accent: '#222222', background: '#ffffff' }, { size: '40mm' });
    expect(svg.match(/<circle/g)).toHaveLength(2);
    expect(svg).toContain('width="40mm"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).not.toMatch(/#6d3350|#c24f78/);
  });

  it('gives each embedded copy its own mask id', () => {
    expect(logoParts('script', LOGO_SCHEMES.color, 'card1').body).toContain('id="card1-script-gap"');
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
