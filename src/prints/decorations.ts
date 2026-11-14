import { dot, flower, heart, leaf, stem, toward, type Point } from '../brand/ornaments';

/** Side decorations of the invitations: a spray growing from a corner. */
export type Decoration = 'none' | 'plants' | 'flowers' | 'hearts' | 'roots';
export const DECORATIONS: Decoration[] = ['none', 'plants', 'flowers', 'hearts', 'roots'];

/** Deterministic "randomness" (same drawing every time): mulberry32. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (value: number) => Math.round(value * 100) / 100;
const pathEl = (d: string, attrs: string) => (d ? `<path d="${d}" ${attrs}/>` : '');

/** Points along a quadratic curve from `a` to `b` bending by `bend`. */
function curve(a: Point, b: Point, bend: number, steps: number): Point[] {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const c = toward(mid, deg + 90, bend);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
      y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
    };
  });
}

const angleAt = (points: Point[], i: number) => {
  const a = points[Math.max(0, i - 1)];
  const b = points[Math.min(points.length - 1, i + 1)];
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
};

/** A leafy branch: stem plus pairs of leaves, two tones for depth. */
function branch(
  a: Point,
  b: Point,
  bend: number,
  leafSize: number,
  rnd: () => number,
  dark: string[],
  light: string[],
  stems: string[],
) {
  stems.push(stem(a, b, bend));
  const points = curve(a, b, bend, 9);
  points.slice(1).forEach((p, i) => {
    const deg = angleAt(points, i + 1);
    const size = leafSize * (1 - i * 0.06) * (0.85 + rnd() * 0.3);
    (i % 2 ? light : dark).push(leaf(p, deg - 55 - rnd() * 10, size, size * 0.42));
    (i % 2 ? dark : light).push(leaf(p, deg + 55 + rnd() * 10, size * 0.92, size * 0.4));
  });
  const tip = points[points.length - 1];
  dark.push(leaf(tip, angleAt(points, points.length - 1), leafSize * 0.8, leafSize * 0.34));
}

/**
 * A spray in a 100 × 100 box growing from the corner (0, 0) towards (100, 100),
 * mostly along the two edges, leaving the middle free for the text.
 */
export function spray(kind: Decoration, color: string): string {
  const rnd = random(kind.length * 7919);
  const dark: string[] = [];
  const light: string[] = [];
  const stems: string[] = [];
  const outlines: string[] = [];
  const fills: string[] = [];
  const origin = { x: -4, y: -4 };

  switch (kind) {
    case 'plants':
      // Eucalyptus-like branches along the top and the side edges.
      branch(origin, { x: 92, y: 10 }, -8, 13, rnd, dark, light, stems);
      branch(origin, { x: 14, y: 88 }, 8, 12, rnd, dark, light, stems);
      branch({ x: 2, y: 2 }, { x: 58, y: 46 }, 4, 10, rnd, dark, light, stems);
      break;
    case 'flowers': {
      // Thin stems, small leaves and clusters of little white flowers (like gypsophila).
      const ends: Point[] = [
        { x: 86, y: 14 },
        { x: 62, y: 38 },
        { x: 16, y: 84 },
        { x: 38, y: 58 },
      ];
      ends.forEach((end, k) => {
        const bend = k % 2 ? 6 : -6;
        stems.push(stem(origin, end, bend));
        const points = curve(origin, end, bend, 8);
        points.slice(2, 7).forEach((p, i) => {
          const deg = angleAt(points, i + 2);
          (i % 2 ? light : dark).push(leaf(p, deg + (i % 2 ? 50 : -50), 9, 3.2));
        });
        // A cluster at the end.
        for (let f = 0; f < 6; f++) {
          const at = toward(end, rnd() * 360, 2 + rnd() * 9);
          stems.push(stem(end, at, 1));
          const bloom = flower(at, 2.6 + rnd() * 1.6, rnd() * 72);
          outlines.push(bloom.petals);
          fills.push(bloom.heart);
        }
      });
      break;
    }
    case 'hearts': {
      // A trail of hearts along each edge, smaller and smaller, with little dots.
      for (const [end, bend] of [
        [{ x: 96, y: 16 }, -10],
        [{ x: 16, y: 96 }, 10],
      ] as const) {
        const points = curve({ x: 2, y: 2 }, end, bend, 9);
        points.forEach((p, i) => {
          const size = 13 - i * 1.05;
          fills.push(heart(p, size, angleAt(points, i) - 90 + (i % 2 ? 14 : -14)));
          if (i < points.length - 1)
            fills.push(`<path d="${dot(toward(p, angleAt(points, i) + 90, 6 + rnd() * 3), 0.9)}"/>`);
        });
      }
      fills.push(heart({ x: 14, y: 14 }, 18, -45));
      break;
    }
    case 'roots': {
      // Branching, twisting roots, thinner towards their tips.
      const grow = (from: Point, deg: number, length: number, width: number, depth: number) => {
        const to = toward(from, deg + (rnd() - 0.5) * 24, length);
        outlines.push(`<path d="${stem(from, to, (rnd() - 0.5) * length * 0.5)}" stroke-width="${n(width)}"/>`);
        if (depth === 0) {
          fills.push(`<path d="${dot(to, width * 0.9)}"/>`);
          return;
        }
        grow(to, deg - 18 - rnd() * 20, length * 0.72, width * 0.7, depth - 1);
        grow(to, deg + 18 + rnd() * 20, length * 0.68, width * 0.66, depth - 1);
      };
      grow(origin, 12, 34, 2.4, 3);
      grow(origin, 78, 34, 2.4, 3);
      grow(origin, 45, 24, 2, 2);
      break;
    }
    default:
      return '';
  }

  return [
    pathEl(stems.join(''), `fill="none" stroke="${color}" stroke-width="0.7" stroke-linecap="round"`),
    pathEl(light.join(''), `fill="${color}" fill-opacity="0.45"`),
    pathEl(dark.join(''), `fill="${color}" fill-opacity="0.9"`),
    kind === 'roots'
      ? `<g fill="none" stroke="${color}" stroke-linecap="round">${outlines.join('')}</g><g fill="${color}">${fills.join('')}</g>`
      : kind === 'hearts'
        ? `<g fill="${color}" fill-opacity="0.85">${fills.join('')}</g>`
        : pathEl(outlines.join(''), `fill="#ffffff" stroke="${color}" stroke-width="0.45"`) +
          pathEl(fills.join(''), `fill="${color}"`),
  ].join('');
}
