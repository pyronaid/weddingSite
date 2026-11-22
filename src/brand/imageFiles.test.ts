import { readFileSync } from 'node:fs';
import { imageFolder, imageSize, parseImageFile } from './imageFiles';

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((part) => (typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : part)));
const le24 = (value: number) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
const dataUri = (type: string, data: Uint8Array) => `data:image/${type};base64,${Buffer.from(data).toString('base64')}`;

// The first bytes of each kind of file, as written by image programs.
const PNG = bytes(
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  [0, 0, 0, 13],
  'IHDR',
  [0, 0, 9, 0x60],
  [0, 0, 4, 0xb0],
);
const RIFF = (chunk: string, body: number[]) => bytes('RIFF', [0, 0, 0, 0], 'WEBP', chunk, [0, 0, 0, 0], body);
const WEBP_EXTENDED = RIFF('VP8X', [0x10, 0, 0, 0, ...le24(2343), ...le24(2399), 0, 0]);
// Lossless: 14 bits width - 1, 14 bits height - 1, after the 0x2f signature.
const lossless = ((800 - 1) | ((600 - 1) << 14)) >>> 0;
const WEBP_LOSSLESS = RIFF('VP8L', [
  0x2f,
  lossless & 0xff,
  (lossless >> 8) & 0xff,
  (lossless >> 16) & 0xff,
  (lossless >>> 24) & 0xff,
  0,
  0,
  0,
  0,
  0,
]);
// Lossy: frame tag (3 bytes), start code 9d 01 2a, then 16-bit width and height.
const WEBP_LOSSY = RIFF('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 320 & 0xff, 320 >> 8, 240 & 0xff, 240 >> 8]);

describe('picture files', () => {
  it('reads the size of PNG and WebP files from their first bytes', () => {
    expect(imageSize(PNG)).toEqual({ width: 2400, height: 1200 });
    expect(imageSize(WEBP_EXTENDED)).toEqual({ width: 2344, height: 2400 });
    expect(imageSize(WEBP_LOSSLESS)).toEqual({ width: 800, height: 600 });
    expect(imageSize(WEBP_LOSSY)).toEqual({ width: 320, height: 240 });
    expect(imageSize(bytes('GIF89a', [1, 0, 1, 0]))).toBeNull();
    expect(imageSize(bytes([0x89, 0x50]))).toBeNull();
  });

  it('reads the real decorations', () => {
    const file = readFileSync('src/prints/decorations/watercolour_peonies.webp');
    expect(parseImageFile('watercolour_peonies', dataUri('webp', file))).toMatchObject({
      label: 'Watercolour peonies',
      width: 2126,
      height: 2249,
    });
  });

  it('keeps only PNG and WebP pictures with a size', () => {
    expect(parseImageFile('a', dataUri('png', PNG))).toMatchObject({ id: 'a', width: 2400, height: 1200 });
    expect(parseImageFile('b', dataUri('gif', bytes('GIF89a')))).toBeNull();
    expect(parseImageFile('c', 'https://example.com/picture.png')).toBeNull();
    expect(parseImageFile('d', dataUri('png', bytes('not a png at all, really not')))).toBeNull();
  });

  it('knows the names at once, by name, and reads the pictures once', async () => {
    const loaders = {
      './x/b_10.webp': vi.fn(async () => dataUri('webp', WEBP_EXTENDED)),
      './x/b_2.png': vi.fn(async () => dataUri('png', PNG)),
      './x/broken.png': vi.fn(async () => 'data:image/png;base64,AAAA'),
    };
    const folder = imageFolder(loaders);
    expect(folder.ids).toEqual(['b_2', 'b_10', 'broken']);
    expect(folder.has('b_2')).toBe(true);
    expect(folder.has('b_2.png')).toBe(false);
    for (const load of Object.values(loaders)) expect(load).not.toHaveBeenCalled();
    const files = await folder.load();
    expect([...files.keys()]).toEqual(['b_2', 'b_10']);
    await folder.load();
    expect(loaders['./x/b_2.png']).toHaveBeenCalledTimes(1);
  });
});
