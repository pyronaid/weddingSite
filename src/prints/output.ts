import { PRINT_FONTS_CSS } from './svg';

/** Page formats of the print documents. `A4-2up`: two A5 cards side by side on an A4 sheet, to cut in half. */
export type PrintFormat = 'A3' | 'A5' | 'A4-2up';

const PAGE_CSS: Record<PrintFormat, string> = {
  A3: '@page { size: A3 portrait; margin: 0; } .sheet { width: 297mm; height: 420mm; }',
  A5: '@page { size: A5 portrait; margin: 0; } .sheet { width: 148mm; height: 210mm; }',
  'A4-2up':
    '@page { size: A4 landscape; margin: 0; } .sheet { width: 297mm; height: 210mm; display: flex; } ' +
    '.sheet > svg { width: 148mm !important; height: 210mm !important; } ' +
    '.sheet > svg + svg { border-left: 0.2mm dashed #bbb; }',
};

const stripXmlHeader = (svg: string) => svg.replace(/^<\?xml[^>]*>\s*/, '');

/**
 * An HTML document with one page per sheet, to print or save as PDF (the
 * browser embeds the fonts in the PDF). The SVGs are inlined, not linked,
 * so they use the web fonts the page loads.
 */
export function printDocument(pages: string[], format: PrintFormat, title: string): string {
  const sheets =
    format === 'A4-2up'
      ? Array.from({ length: Math.ceil(pages.length / 2) }, (_, i) => pages.slice(2 * i, 2 * i + 2))
      : pages.map((page) => [page]);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="stylesheet" href="${PRINT_FONTS_CSS}">
<style>
  html, body { margin: 0; }
  ${PAGE_CSS[format]}
  .sheet { break-after: page; page-break-after: always; overflow: hidden; }
  .sheet:last-child { break-after: auto; page-break-after: auto; }
  .sheet > svg { display: block; width: 100%; height: 100%; }
  @media screen { body { background: #888; } .sheet { margin: 10mm auto; background: #fff; box-shadow: 0 2mm 6mm #0006; } }
</style>
</head>
<body>
${sheets.map((sheet) => `<div class="sheet">${sheet.map(stripXmlHeader).join('')}</div>`).join('\n')}
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
