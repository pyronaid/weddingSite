import { PRINT_FONTS_CSS } from './svg';

/** A page size in millimetres (A3 posters, square or A4 invitations...). */
export interface PageSize {
  width: number;
  height: number;
}

const stripXmlHeader = (svg: string) => svg.replace(/^<\?xml[^>]*>\s*/, '');

/**
 * An HTML document with one page per SVG, to print or save as PDF (the
 * browser embeds the fonts in the PDF, and takes the page size from it).
 * The SVGs are inlined, not linked, so they use the web fonts the page loads.
 */
export function printDocument(pages: string[], size: PageSize, title: string): string {
  const { width, height } = size;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="stylesheet" href="${PRINT_FONTS_CSS}">
<style>
  @page { size: ${width}mm ${height}mm; margin: 0; }
  html, body { margin: 0; }
  .sheet { width: ${width}mm; height: ${height}mm; break-after: page; page-break-after: always; overflow: hidden; }
  .sheet:last-child { break-after: auto; page-break-after: auto; }
  .sheet > svg { display: block; width: 100%; height: 100%; }
  @media screen { body { background: #888; } .sheet { margin: 10mm auto; background: #fff; box-shadow: 0 2mm 6mm #0006; } }
</style>
</head>
<body>
${pages.map((page) => `<div class="sheet">${stripXmlHeader(page)}</div>`).join('\n')}
</body>
</html>`;
}

/**
 * Opens the print dialog for a document, from a hidden frame (no pop-up to
 * allow). Waits for the fonts first, or the PDF would use fallback fonts.
 */
export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    frame.onload = async () => {
      try {
        const win = frame.contentWindow!;
        await Promise.race([win.document.fonts.ready, new Promise((done) => setTimeout(done, 4000))]);
        win.focus();
        win.print();
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        // Removed later: some browsers print asynchronously from the frame.
        setTimeout(() => frame.remove(), 60_000);
      }
    };
    frame.srcdoc = html;
    document.body.append(frame);
  });
}

/** Saves a file from the browser. */
export function download(filename: string, content: Blob | string, type = 'image/svg+xml'): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: `${type};charset=utf-8` }) : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** A standalone SVG file: XML header, and the namespace even for SVG built for inlining. */
export function svgFile(svg: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${stripXmlHeader(svg)}\n`;
}

let fontFaces: Promise<string> | null = null;

/**
 * The @font-face rules of the prints with the fonts themselves inlined
 * (data: URLs), Latin subsets only. An SVG drawn as an image (for a PNG)
 * cannot load anything, so the fonts must be inside it. Fetched once.
 */
function inlineFontFaces(): Promise<string> {
  fontFaces ??= (async () => {
    const css = await (await fetch(PRINT_FONTS_CSS)).text();
    // Google answers one block per subset, each after a "/* latin */"-style comment.
    const blocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/)/).filter((block) => /\/\*\s*latin(-ext)?\s*\*\//.test(block));
    const inlined = await Promise.all(
      blocks.map(async (block) => {
        const url = /url\(([^)]+)\)/.exec(block)?.[1];
        if (!url) return block;
        const bytes = await (await fetch(url)).blob();
        const dataUrl = await new Promise<string>((done, fail) => {
          const reader = new FileReader();
          reader.onload = () => done(String(reader.result));
          reader.onerror = () => fail(reader.error);
          reader.readAsDataURL(bytes);
        });
        return block.replace(url, dataUrl);
      }),
    );
    return inlined.join('\n');
  })().catch((error: unknown) => {
    fontFaces = null; // try again next time
    throw error;
  });
  return fontFaces;
}

/** The SVG with the fonts inside it (falls back to linking them if they cannot be fetched). */
export async function withEmbeddedFonts(svg: string): Promise<string> {
  let css: string;
  try {
    css = await inlineFontFaces();
  } catch {
    css = `@import url('${PRINT_FONTS_CSS}');`;
  }
  return stripXmlHeader(svg).replace(/<svg\b[^>]*>/, (open) => `${open}<style>${css}</style>`);
}

/**
 * A PNG of an SVG, `widthPx` wide (e.g. 300 dpi: 1748 px for A5). Drawn by
 * the browser, with the fonts embedded first.
 */
export async function svgToPng(svg: string, widthPx: number): Promise<Blob> {
  const source = await withEmbeddedFonts(svg);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const ratio = image.naturalHeight / image.naturalWidth || 1;
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = Math.round(widthPx * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas not available');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((done, fail) =>
      canvas.toBlob((blob) => (blob ? done(blob) : fail(new Error('PNG export failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
