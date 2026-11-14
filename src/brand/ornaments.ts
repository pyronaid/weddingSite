/**
 * Botanical line art for the borders and the invitations: leaves, berries,
 * flowers, roses and hearts, as SVG path strings. Angles in degrees,
 * 0 = pointing right, growing clockwise (SVG y points down).
 */

const rad = (deg: number) => (deg * Math.PI) / 180;
const n = (value: number) => Math.round(value * 10) / 10;

export interface Point {
  x: number;
  y: number;
}

export const polar = (cx: number, cy: number, r: number, deg: number): Point => ({
  x: cx + r * Math.cos(rad(deg)),
  y: cy + r * Math.sin(rad(deg)),
});

/** A point `distance` away from `from`, towards `deg`. */
export const toward = (from: Point, deg: number, distance: number): Point => ({
  x: from.x + distance * Math.cos(rad(deg)),
  y: from.y + distance * Math.sin(rad(deg)),
});

/** An almond-shaped leaf growing from `base` towards `deg` (filled). */
export function leaf(base: Point, deg: number, length: number, width: number): string {
  const tip = toward(base, deg, length);
  const mid = toward(base, deg, length * 0.45);
  const left = toward(mid, deg - 90, width);
  const right = toward(mid, deg + 90, width);
  return `M${n(base.x)} ${n(base.y)}Q${n(left.x)} ${n(left.y)} ${n(tip.x)} ${n(tip.y)}Q${n(right.x)} ${n(right.y)} ${n(base.x)} ${n(base.y)}Z`;
}

/** A dot (berry, bud). */
export function dot(at: Point, r: number): string {
  return `M${n(at.x - r)} ${n(at.y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
}

/** A circular arc (stroke). */
export function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M${n(a.x)} ${n(a.y)}A${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(b.x)} ${n(b.y)}`;
}

/** A gently curved stem from `a` to `b`, bending by `bend` (perpendicular offset). */
export function stem(a: Point, b: Point, bend: number): string {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const control = toward(mid, deg + 90, bend);
  return `M${n(a.x)} ${n(a.y)}Q${n(control.x)} ${n(control.y)} ${n(b.x)} ${n(b.y)}`;
}

/** Five rounded petals around a centre: outline (stroke), with the heart of the flower filled apart. */
export function flower(at: Point, r: number, rotation = 0, petals = 5): { petals: string; heart: string } {
  const parts: string[] = [];
  for (let i = 0; i < petals; i++) {
    const deg = rotation + (360 / petals) * i;
    const tip = toward(at, deg, r);
    const left = toward(toward(at, deg - 28, r * 0.75), deg - 90, r * 0.18);
    const right = toward(toward(at, deg + 28, r * 0.75), deg + 90, r * 0.18);
    const base = toward(at, deg, r * 0.22);
    parts.push(
      `M${n(base.x)} ${n(base.y)}C${n(left.x)} ${n(left.y)} ${n(toward(tip, deg - 90, r * 0.35).x)} ${n(toward(tip, deg - 90, r * 0.35).y)} ${n(tip.x)} ${n(tip.y)}` +
        `C${n(toward(tip, deg + 90, r * 0.35).x)} ${n(toward(tip, deg + 90, r * 0.35).y)} ${n(right.x)} ${n(right.y)} ${n(base.x)} ${n(base.y)}Z`,
    );
  }
  return { petals: parts.join(''), heart: dot(at, r * 0.2) };
}

/** A rose seen from above: a spiral of petals inside a scalloped outline (stroke). */
export function rose(at: Point, r: number, rotation = 0): string {
  const parts: string[] = [];
  // Outer scallops.
  const scallops = 6;
  let d = '';
  for (let i = 0; i <= scallops; i++) {
    const deg = rotation + (360 / scallops) * i;
    const p = polar(at.x, at.y, r, deg);
    if (i === 0) d += `M${n(p.x)} ${n(p.y)}`;
    else {
      const c = polar(at.x, at.y, r * 1.22, deg - 180 / scallops);
      d += `Q${n(c.x)} ${n(c.y)} ${n(p.x)} ${n(p.y)}`;
    }
  }
  parts.push(d + 'Z');
  // Inner spiral.
  let spiral = '';
  for (let i = 0; i <= 22; i++) {
    const deg = rotation + i * 33;
    const radius = r * 0.78 * (1 - i / 26);
    const p = polar(at.x, at.y, radius, deg);
    spiral += i === 0 ? `M${n(p.x)} ${n(p.y)}` : `L${n(p.x)} ${n(p.y)}`;
  }
  parts.push(spiral);
  return parts.join('');
}

/** A heart, centred on `at`, `size` wide (filled). */
export function heart(at: Point, size: number, rotation = 0): string {
  const s = size / 2;
  const d = `M0 ${n(s * 0.85)}C${n(-s * 1.15)} ${n(-s * 0.05)} ${n(-s * 0.55)} ${n(-s * 0.95)} 0 ${n(-s * 0.4)}C${n(s * 0.55)} ${n(-s * 0.95)} ${n(s * 1.15)} ${n(-s * 0.05)} 0 ${n(s * 0.85)}Z`;
  return `<path transform="translate(${n(at.x)} ${n(at.y)}) rotate(${n(rotation)})" d="${d}"/>`;
}

/** The same heart as path data at the origin (for glyph-like placement). */
export const HEART_PATH = 'M0 425C-575 -25 -275 -475 0 -200C275 -475 575 -25 0 425Z';
