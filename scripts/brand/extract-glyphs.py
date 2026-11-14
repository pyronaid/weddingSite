"""Letter outlines for the monogram designer (src/brand/glyphs/*.ts).

    python3 -I scripts/brand/extract-glyphs.py <font.woff> <name> "<license note>" > src/brand/glyphs/<name>.ts

Reads a WOFF 1.0 font with TrueType outlines (e.g. from the @fontsource npm
packages: `npm pack @fontsource/<family>`, then files/<family>-latin-400-normal.woff)
and writes the outlines of the characters below as SVG path data, scaled to
1000 units per em, y pointing down (SVG), baseline at y = 0. Only standard
library code: the font is read as data.
"""
import json, struct, sys, zlib

CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ&|/+-~*.:'


def woff_tables(data):
    if data[:4] != b'wOFF':
        raise SystemExit('not a WOFF 1.0 file')
    num_tables = struct.unpack('>H', data[12:14])[0]
    tables = {}
    for i in range(num_tables):
        tag, offset, comp, orig, _ = struct.unpack('>4sIIII', data[44 + 20 * i: 64 + 20 * i])
        raw = data[offset: offset + comp]
        tables[tag.decode('latin-1')] = zlib.decompress(raw) if comp < orig else raw
    return tables


def cmap_lookup(cmap, codepoint):
    n = struct.unpack('>H', cmap[2:4])[0]
    for i in range(n):
        platform, encoding, offset = struct.unpack('>HHI', cmap[4 + 8 * i: 12 + 8 * i])
        if (platform, encoding) not in ((3, 1), (0, 3), (0, 4), (3, 10)):
            continue
        fmt = struct.unpack('>H', cmap[offset: offset + 2])[0]
        if fmt == 4:
            seg2 = struct.unpack('>H', cmap[offset + 6: offset + 8])[0]
            seg = seg2 // 2
            base = offset + 14
            ends = struct.unpack(f'>{seg}H', cmap[base: base + seg2])
            starts = struct.unpack(f'>{seg}H', cmap[base + seg2 + 2: base + 2 * seg2 + 2])
            deltas = struct.unpack(f'>{seg}h', cmap[base + 2 * seg2 + 2: base + 3 * seg2 + 2])
            ro_base = base + 3 * seg2 + 2
            ranges = struct.unpack(f'>{seg}H', cmap[ro_base: ro_base + seg2])
            for k in range(seg):
                if starts[k] <= codepoint <= ends[k]:
                    if ranges[k] == 0:
                        return (codepoint + deltas[k]) & 0xFFFF
                    addr = ro_base + 2 * k + ranges[k] + 2 * (codepoint - starts[k])
                    gid = struct.unpack('>H', cmap[addr: addr + 2])[0]
                    return (gid + deltas[k]) & 0xFFFF if gid else 0
        elif fmt == 12:
            groups = struct.unpack('>I', cmap[offset + 12: offset + 16])[0]
            for g in range(groups):
                start, end, gid = struct.unpack('>III', cmap[offset + 16 + 12 * g: offset + 28 + 12 * g])
                if start <= codepoint <= end:
                    return gid + codepoint - start
    return 0


class Font:
    def __init__(self, data):
        t = woff_tables(data)
        if 'glyf' not in t:
            raise SystemExit('only TrueType (glyf) outlines are supported')
        self.t = t
        self.upm = struct.unpack('>H', t['head'][18:20])[0]
        long_loca = struct.unpack('>h', t['head'][50:52])[0] == 1
        n = struct.unpack('>H', t['maxp'][4:6])[0]
        loca = t['loca']
        if long_loca:
            self.loca = struct.unpack(f'>{n + 1}I', loca[: 4 * (n + 1)])
        else:
            self.loca = [v * 2 for v in struct.unpack(f'>{n + 1}H', loca[: 2 * (n + 1)])]
        self.num_hmetrics = struct.unpack('>H', t['hhea'][34:36])[0]
        self.hmtx = t['hmtx']

    def advance(self, gid):
        i = min(gid, self.num_hmetrics - 1)
        return struct.unpack('>H', self.hmtx[4 * i: 4 * i + 2])[0]

    def contours(self, gid, transform=(1, 0, 0, 1, 0, 0)):
        """Contours of a glyph: lists of (x, y, on_curve) in font units, y up."""
        start, end = self.loca[gid], self.loca[gid + 1]
        if start == end:
            return []
        g = self.t['glyf'][start:end]
        n = struct.unpack('>h', g[0:2])[0]
        a, b, c, d, e, f = transform
        apply = lambda x, y: (a * x + c * y + e, b * x + d * y + f)
        if n >= 0:
            ends = struct.unpack(f'>{n}H', g[10: 10 + 2 * n])
            pos = 10 + 2 * n
            pos += 2 + struct.unpack('>H', g[pos: pos + 2])[0]
            count = ends[-1] + 1 if n else 0
            flags = []
            while len(flags) < count:
                flag = g[pos]; pos += 1
                flags.append(flag)
                if flag & 8:
                    repeat = g[pos]; pos += 1
                    flags.extend([flag] * repeat)

            def coords(short_bit, same_bit):
                nonlocal pos
                out, value = [], 0
                for flag in flags:
                    if flag & short_bit:
                        delta = g[pos]; pos += 1
                        value += delta if flag & same_bit else -delta
                    elif not flag & same_bit:
                        value += struct.unpack('>h', g[pos: pos + 2])[0]; pos += 2
                    out.append(value)
                return out

            xs, ys = coords(0x02, 0x10), coords(0x04, 0x20)
            result, first = [], 0
            for last in ends:
                result.append([(*apply(xs[i], ys[i]), bool(flags[i] & 1)) for i in range(first, last + 1)])
                first = last + 1
            return result
        # Composite glyph (e.g. accented letters): components with offset and scale.
        pos, result = 10, []
        while True:
            flags, sub = struct.unpack('>HH', g[pos: pos + 4]); pos += 4
            if flags & 1:
                dx, dy = struct.unpack('>hh', g[pos: pos + 4]); pos += 4
            else:
                dx, dy = struct.unpack('>bb', g[pos: pos + 2]); pos += 2
            sa, sb, sc, sd = 1, 0, 0, 1
            f2 = lambda raw: raw / 16384
            if flags & 0x8:
                sa = sd = f2(struct.unpack('>h', g[pos: pos + 2])[0]); pos += 2
            elif flags & 0x40:
                sa, sd = (f2(v) for v in struct.unpack('>hh', g[pos: pos + 4])); pos += 4
            elif flags & 0x80:
                sa, sb, sc, sd = (f2(v) for v in struct.unpack('>hhhh', g[pos: pos + 8])); pos += 8
            inner = (sa, sb, sc, sd, dx, dy)
            composed = (
                a * inner[0] + c * inner[1], b * inner[0] + d * inner[1],
                a * inner[2] + c * inner[3], b * inner[2] + d * inner[3],
                a * inner[4] + c * inner[5] + e, b * inner[4] + d * inner[5] + f,
            )
            result.extend(self.contours(sub, composed))
            if not flags & 0x20:
                return result


def to_path(contours, scale):
    """Quadratic TrueType contours -> SVG path, scaled, y flipped (SVG y grows downwards)."""
    num = lambda v: str(round(v * scale))
    pt = lambda p: f'{num(p[0])} {num(-p[1])}'
    parts = []
    for contour in contours:
        if not contour:
            continue
        points = contour[:]
        if not points[0][2]:
            if points[-1][2]:
                points = [points[-1]] + points[:-1]
            else:
                mid = ((points[0][0] + points[-1][0]) / 2, (points[0][1] + points[-1][1]) / 2, True)
                points = [mid] + points
        parts.append(f'M{pt(points[0])}')
        n, pending = len(points), None
        for k in range(1, n + 1):
            p = points[k] if k < n else points[0]
            if p[2]:
                parts.append(f'Q{pt(pending)} {pt(p)}' if pending else f'L{pt(p)}')
                pending = None
            else:
                if pending:
                    parts.append(f'Q{pt(pending)} {pt(((pending[0] + p[0]) / 2, (pending[1] + p[1]) / 2))}')
                pending = p
        parts.append('Z')
    return ''.join(parts)


def main():
    path, name, license_note = sys.argv[1], sys.argv[2], sys.argv[3]
    font = Font(open(path, 'rb').read())
    scale = 1000 / font.upm
    glyphs = {}
    for ch in CHARS:
        gid = cmap_lookup(font.t['cmap'], ord(ch))
        if not gid:
            continue
        contours = font.contours(gid)
        xs = [p[0] for c in contours for p in c]
        ys = [-p[1] for c in contours for p in c]
        if not xs:
            continue
        glyphs[ch] = {
            'd': to_path(contours, scale),
            'advance': round(font.advance(gid) * scale),
            'box': [round(min(xs) * scale), round(min(ys) * scale), round(max(xs) * scale), round(max(ys) * scale)],
        }
    print(f'// Generated by scripts/brand/extract-glyphs.py from {path.rsplit("/", 1)[-1]}. Do not edit.')
    print(f'// {license_note}')
    print("import type { GlyphFont } from './types';")
    print()
    print(f'export const {name}: GlyphFont = {json.dumps({"glyphs": glyphs}, separators=(",", ":"))};')


main()
