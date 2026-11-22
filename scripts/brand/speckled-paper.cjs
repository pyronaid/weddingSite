// Speckled paper (src/prints/patterns/pattern_04.svg): a seamless tile of
// irregular flecks and short fibres, like recycled or seed paper. Seeded: the
// same file every time. Change the counts, sizes or seed below, then run
//   node scripts/brand/speckled-paper.cjs src/prints/patterns/pattern_04.svg
const fs = require('fs');
const SIZE = 400; // tile units
let seed = 20261121;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const n = (v) => Math.round(v * 10) / 10;
const between = (a, b) => a + rnd() * (b - a);

/** A closed, smooth, irregular blob: quadratic curves through the midpoints of jittered points. */
function blob(cx, cy, r, stretch, angle) {
  const count = 5 + Math.floor(rnd() * 4);
  const pts = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + between(-0.3, 0.3);
    const rr = r * between(0.55, 1.15);
    const x = Math.cos(a) * rr * stretch;
    const y = Math.sin(a) * rr;
    return [cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle)];
  });
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const start = mid(pts[count - 1], pts[0]);
  let d = `M${n(start[0])} ${n(start[1])}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % count]);
    d += `Q${n(p[0])} ${n(p[1])} ${n(m[0])} ${n(m[1])}`;
  });
  return d + 'Z';
}

/** A short fibre: a thin curved stroke. */
function fibre(cx, cy, length, angle) {
  const dx = (Math.cos(angle) * length) / 2;
  const dy = (Math.sin(angle) * length) / 2;
  const bend = between(-0.35, 0.35) * length;
  const c = [cx - Math.sin(angle) * bend, cy + Math.cos(angle) * bend];
  return `M${n(cx - dx)} ${n(cy - dy)}Q${n(c[0])} ${n(c[1])} ${n(cx + dx)} ${n(cy + dy)}`;
}

const elements = [];
/** Adds an element, and its copies across the edges it touches (a seamless tile). */
function add(x, y, reach, make) {
  for (const ox of [-SIZE, 0, SIZE]) {
    for (const oy of [-SIZE, 0, SIZE]) {
      const px = x + ox;
      const py = y + oy;
      if (px + reach < 0 || px - reach > SIZE || py + reach < 0 || py - reach > SIZE) continue;
      elements.push(make(px, py));
    }
  }
}

// Flecks: mostly tiny, a few bigger, in different greys (opacity).
for (let i = 0; i < 95; i++) {
  const big = rnd() < 0.12;
  const r = big ? between(3, 5.5) : between(0.8, 2.6);
  const stretch = between(1, big ? 2.2 : 1.8);
  const angle = rnd() * Math.PI;
  const opacity = n(between(0.35, 0.9));
  const x = rnd() * SIZE;
  const y = rnd() * SIZE;
  add(x, y, r * stretch * 1.2, (px, py) => `<path fill="#9a9a9a" fill-opacity="${opacity}" d="${blob(px, py, r, stretch, angle)}"/>`);
}
// Fibres: short, thin, lighter.
for (let i = 0; i < 22; i++) {
  const length = between(6, 16);
  const angle = rnd() * Math.PI;
  const width = n(between(0.5, 1.1));
  const opacity = n(between(0.3, 0.6));
  const x = rnd() * SIZE;
  const y = rnd() * SIZE;
  add(x, y, length, (px, py) =>
    `<path fill="none" stroke="#9a9a9a" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" d="${fibre(px, py, length, angle)}"/>`,
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" data-tile="110" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<!-- Speckled paper: flecks and fibres, a seamless tile (made by a script, seeded: the same file every time). -->
${elements.join('\n')}
</svg>
`;
fs.writeFileSync(process.argv[2], svg);
console.log(elements.length, 'elements', svg.length, 'bytes');
