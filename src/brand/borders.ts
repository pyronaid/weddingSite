import { arc, dot, flower, leaf, polar, rose, stem, toward, type Point } from './ornaments';

/** The monograms are drawn on a 1000 × 1000 canvas, centred. */
export const CANVAS = 1000;
const C = CANVAS / 2;

export type BorderStyle = 'none' | 'flowersSmall' | 'flowersBig' | 'circles' | 'squares';
export const BORDER_STYLES: BorderStyle[] = ['none', 'flowersSmall', 'flowersBig', 'circles', 'squares'];

export interface Border {
  /** SVG elements, in the border colour. */
  svg: string;
  /** Room left for the letters: a circle of this radius, or a square of this half side. */
  room: { shape: 'circle' | 'square'; size: number };
}

const strokeGroup = (color: string, width: number, d: string) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fillGroup = (color: string, d: string) => `<path d="${d}" fill="${color}"/>`;

/** Wreath of small leaves and berries all around (like a laurel crown). */
function flowersSmall(color: string): Border {
  const r = 385;
  const leaves: string[] = [];
  const berries: string[] = [];
  const twigs: string[] = [];
  for (let i = 0; i < 30; i++) {
    const deg = i * 12;
    const base = polar(C, C, r, deg);
    // Leaves pointing along the wreath (clockwise), one outside and one inside, alternating sizes.
    const along = deg + 90;
    const size = i % 2 ? 62 : 72;
    leaves.push(
      leaf(base, along - 42, size, size * 0.3),
      leaf(polar(C, C, r, deg + 5), along + 42, size * 0.85, size * 0.28),
    );
    if (i % 3 === 1) {
      // A little twig of berries, outwards.
      const twigEnd = polar(C, C, r + 58, deg + 4);
      twigs.push(stem(base, twigEnd, 8));
      berries.push(dot(twigEnd, 12), dot(toward(twigEnd, deg - 75, 24), 9), dot(toward(twigEnd, deg + 75, 24), 9));
    }
  }
  return {
    svg:
      strokeGroup(color, 9, arc(C, C, r, 0, 359.9)) +
      strokeGroup(color, 6, twigs.join('')) +
      fillGroup(color, leaves.join('') + berries.join('')),
    room: { shape: 'circle', size: 300 },
  };
}

/** A thin circle with two big flowering sprigs, top left and bottom right. */
function flowersBig(color: string): Border {
  const r = 400;
  const strokes: string[] = [];
  const fills: string[] = [];
  // The circle stops where the sprigs take over.
  strokes.push(arc(C, C, r, 252, 378), arc(C, C, r, 72, 198));
  for (const start of [200, 20]) {
    // Stem along the circle, then a flower beyond its end.
    const end = start + 52;
    strokes.push(arc(C, C, r, start, end));
    for (let k = 0; k < 6; k++) {
      const deg = start + 5 + k * 8;
      const base = polar(C, C, r, deg);
      const outside = k % 2 === 0;
      fills.push(leaf(base, deg + 90 + (outside ? -42 : 42), 92 - k * 5, 25));
    }
    const tip = polar(C, C, r, end);
    const head = toward(tip, end + 115, 56);
    strokes.push(stem(tip, head, 10));
    const bloom = flower(head, 60, end);
    strokes.push(bloom.petals);
    fills.push(bloom.heart);
    // A bud near the start.
    const budBase = polar(C, C, r, start + 3);
    const bud = toward(budBase, start - 60, 60);
    strokes.push(stem(budBase, bud, -8));
    fills.push(leaf(bud, start - 70, 36, 13));
  }
  return {
    svg: strokeGroup(color, 8, strokes.join('')) + fillGroup(color, fills.join('')),
    room: { shape: 'circle', size: 320 },
  };
}

/** Two circles with roses, each between two leaves. */
function circles(color: string): Border {
  const r = 395;
  const roseAngles = [-90, -18, 54, 126, 198];
  const gap = 8;
  const strokes: string[] = [];
  const fills: string[] = [];
  roseAngles.forEach((deg, i) => {
    const next = roseAngles[(i + 1) % roseAngles.length] + (i === roseAngles.length - 1 ? 360 : 0);
    // The outer circle breaks around each rose.
    strokes.push(arc(C, C, r, deg + gap, next - gap));
    strokes.push(rose(polar(C, C, r, deg), 44, deg));
    // Two leaves fanning out of the rose, outside the circle.
    for (const side of [-1, 1]) {
      const base = polar(C, C, r + 22, deg + side * 5);
      fills.push(leaf(base, deg + side * 55, 66, 20));
    }
  });
  return {
    svg:
      strokeGroup(color, 8, strokes.join('')) +
      strokeGroup(color, 3.5, arc(C, C, r - 26, 0, 359.9)) +
      fillGroup(color, fills.join('')),
    room: { shape: 'circle', size: 305 },
  };
}

/** A rounded square, doubled, with leafy sprigs across two corners. */
function squares(color: string): Border {
  const outer = 128;
  const inner = outer + 22;
  const square = (inset: number, radius: number) =>
    `M${inset + radius} ${inset}H${CANVAS - inset - radius}Q${CANVAS - inset} ${inset} ${CANVAS - inset} ${inset + radius}` +
    `V${CANVAS - inset - radius}Q${CANVAS - inset} ${CANVAS - inset} ${CANVAS - inset - radius} ${CANVAS - inset}` +
    `H${inset + radius}Q${inset} ${CANVAS - inset} ${inset} ${CANVAS - inset - radius}V${inset + radius}Q${inset} ${inset} ${inset + radius} ${inset}Z`;
  const strokes = [square(outer, 70), square(inner, 52)];
  const fills: string[] = [];
  const sprig = (corner: Point, deg: number) => {
    // From inside the frame, out across the corner.
    const from = toward(corner, deg + 180, 170);
    const to = toward(corner, deg, 90);
    strokes.push(stem(from, to, 22));
    for (let k = 0; k < 7; k++) {
      const base = toward(from, deg, 24 + k * 36);
      fills.push(leaf(base, deg + (k % 2 ? 48 : -48), 78 - k * 4, 21));
    }
    fills.push(dot(to, 14), dot(toward(to, deg - 60, 30), 10), dot(toward(to, deg + 60, 30), 10));
  };
  sprig({ x: CANVAS - outer, y: outer }, -45);
  sprig({ x: outer, y: CANVAS - outer }, 135);
  return {
    svg:
      strokeGroup(color, 8, strokes[0]) +
      strokeGroup(color, 3.5, strokes[1]) +
      strokeGroup(color, 6, strokes.slice(2).join('')) +
      fillGroup(color, fills.join('')),
    room: { shape: 'square', size: 290 },
  };
}

export function border(style: BorderStyle, color: string): Border {
  switch (style) {
    case 'flowersSmall':
      return flowersSmall(color);
    case 'flowersBig':
      return flowersBig(color);
    case 'circles':
      return circles(color);
    case 'squares':
      return squares(color);
    default:
      return { svg: '', room: { shape: 'square', size: 390 } };
  }
}
