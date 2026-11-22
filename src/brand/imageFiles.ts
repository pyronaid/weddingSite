import { byName, fileLabel } from './svgFiles';

/**
 * Pictures kept as files in the repository (PNG or WebP, with transparency):
 * the invitations' watercolour decorations, for instance. Like the SVG files
 * (./svgFiles.ts), each one is a choice named after the file, and the
 * pictures are downloaded only when needed.
 *
 * A picture is read as a data URI ("data:image/webp;base64,..."): it is
 * embedded as it is in the cards (an SVG or PNG export has no other way to
 * carry it: browsers leave out linked pictures), and its size in pixels is
 * read from the file itself.
 */
export interface ImageFile {
  /** The file name without its extension. */
  id: string;
  /** The file name, readable: "watercolour_peonies" -> "Watercolour peonies". */
  label: string;
  /** The picture, as a data URI. */
  href: string;
  /** Pixels. */
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The size in pixels of a PNG or WebP file, from its header; null for anything else. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const u32be = (at: number) =>
    ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
  const u24le = (at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
  const ascii = (at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

  if (bytes.length >= 24 && PNG_SIGNATURE.every((value, i) => bytes[i] === value) && ascii(12, 4) === 'IHDR') {
    return { width: u32be(16), height: u32be(20) };
  }
  if (bytes.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    // Extended (transparency, ...): sizes minus one, 24 bits each.
    if (chunk === 'VP8X') return { width: u24le(24) + 1, height: u24le(27) + 1 };
    // Lossless: 14 bits each, after a one-byte signature.
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    // Lossy: 14 bits each, after the frame tag and start code.
    if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
    }
  }
  return null;
}

/** The bytes at the start of a base64 data URI (enough for the header). */
function headOf(dataUri: string, length = 64): Uint8Array {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1, dataUri.indexOf(',') + 1 + Math.ceil(length / 3) * 4);
  const text = atob(base64);
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

/** Reads a picture file; null when it is not a PNG or WebP data URI with a size. */
export function parseImageFile(id: string, dataUri: string): ImageFile | null {
  if (!/^data:image\/(png|webp);base64,/.test(dataUri)) return null;
  const size = imageSize(headOf(dataUri));
  if (!size || size.width <= 0 || size.height <= 0) return null;
  return { id, label: fileLabel(id), href: dataUri, ...size };
}

/** A folder of pictures loaded only when needed: the names at once, the pictures on `load()`. */
export interface ImageFolder {
  /** The file ids, by name. */
  ids: string[];
  has: (id: unknown) => id is string;
  /** Every usable picture, read once. */
  load: () => Promise<Map<string, ImageFile>>;
}

/** `loaders`: from import.meta.glob('./folder/*.{png,webp}', { query: '?inline', import: 'default' }). */
export function imageFolder(loaders: Record<string, () => Promise<string>>): ImageFolder {
  const paths = new Map(
    Object.keys(loaders).map((path) => [path.replace(/^.*\//, '').replace(/\.(png|webp)$/i, ''), path]),
  );
  const ids = [...paths.keys()]
    .map((id) => ({ id, label: fileLabel(id) }))
    .sort(byName)
    .map((file) => file.id);
  let loading: Promise<Map<string, ImageFile>> | undefined;
  return {
    ids,
    has: (id): id is string => typeof id === 'string' && paths.has(id),
    load: () => {
      loading ??= Promise.all(ids.map(async (id) => parseImageFile(id, await loaders[paths.get(id)!]()))).then(
        (files) => new Map(files.filter((file) => file !== null).map((file) => [file.id, file])),
      );
      // A failed download can be tried again.
      loading.catch(() => {
        loading = undefined;
      });
      return loading;
    },
  };
}
