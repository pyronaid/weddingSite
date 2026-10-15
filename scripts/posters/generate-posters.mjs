#!/usr/bin/env node
/**
 * Generates the printable A3 posters of a suit: the card image plus a QR code
 * that opens the card's riddle (FRONTEND_URL/area/riddles/<code>).
 *
 * The codes are secret and random per database, so posters are generated
 * from YOUR PocketBase (as superuser) and written to posters/ (git-ignored).
 *
 *   npm run posters                  # clubs, settings from .env
 *   npm run posters -- --suit hearts
 *   npm run posters -- --pdf         # also a print-ready PDF (needs Playwright)
 *
 * Environment (read from .env when present):
 *   VITE_POCKETBASE_URL / PB_URL   PocketBase URL
 *   PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
 *   FRONTEND_URL                   public site URL encoded in the QR codes
 *
 * Output (vector, so sharp at any print size):
 *   <suit>-<rank>-<name>.svg  one A3 poster per card
 *   <suit>-posters.html       all posters, one A3 page each: open and print / save as PDF
 *   <suit>-posters.pdf        with --pdf
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import QRCode from 'qrcode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
const RANK_NAMES = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };
const rankName = (rank) => RANK_NAMES[rank] ?? String(rank);

// A3 portrait in millimetres; the SVG user unit is 1 mm.
const PAGE = { width: 297, height: 420 };
const COLORS = { ink: '#4a2537', accent: '#c24f78', frame: '#6d3350' };

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function loadConfig() {
  try {
    process.loadEnvFile(path.join(ROOT, '.env')); // never overrides variables already set
  } catch {
    // No .env: rely on the environment.
  }

  const { values } = parseArgs({
    options: {
      suit: { type: 'string', default: 'clubs' },
      out: { type: 'string', default: path.join(ROOT, 'posters') },
      pdf: { type: 'boolean', default: false },
      'allow-localhost': { type: 'boolean', default: false },
    },
  });

  const env = (name) => process.env[name]?.trim() || undefined;
  const config = {
    suit: values.suit,
    out: path.resolve(values.out),
    pdf: values.pdf,
    pbUrl: (env('PB_URL') ?? env('VITE_POCKETBASE_URL') ?? '').replace(/\/+$/, ''),
    email: env('PB_ADMIN_EMAIL'),
    password: env('PB_ADMIN_PASSWORD'),
    siteUrl: (env('FRONTEND_URL') ?? '').replace(/\/+$/, ''),
  };

  if (!SUITS.includes(config.suit)) fail(`Unknown suit "${config.suit}". Use one of: ${SUITS.join(', ')}.`);
  if (!config.pbUrl) fail('Set PB_URL (or VITE_POCKETBASE_URL) to your PocketBase URL.');
  if (!config.email || !config.password) fail('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (the superuser).');
  if (!/^https?:\/\//.test(config.siteUrl)) fail('Set FRONTEND_URL to the public site URL, e.g. https://our-wedding.com');
  // A printed poster pointing to localhost would be useless at the venue.
  if (/\/\/(localhost|127\.|0\.0\.0\.0)/.test(config.siteUrl) && !values['allow-localhost']) {
    fail(`FRONTEND_URL is ${config.siteUrl}: guests' phones cannot open it. Use the public URL (or --allow-localhost to test).`);
  }
  return config;
}

async function api(config, pathname, init = {}) {
  const response = await fetch(`${config.pbUrl}${pathname}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`PocketBase answered ${response.status} on ${pathname}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function fetchCards(config) {
  const { token } = await api(config, '/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    body: JSON.stringify({ identity: config.email, password: config.password }),
  });
  const query = new URLSearchParams({
    filter: `suit = '${config.suit}'`,
    sort: 'rank',
    perPage: '100',
    fields: 'id,suit,rank,code,riddle,solution',
  });
  const { items } = await api(config, `/api/collections/cards/records?${query}`, { headers: { Authorization: token } });
  return items;
}

/** Re-roots a standalone SVG document so it can be nested at a given box. */
function nestSvg(svg, { x, y, width, height }) {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error('SVG without viewBox');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}">${inner}</svg>`;
}

const escapeXml = (text) =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

async function buildPoster(card, url) {
  const cardSvg = await readFile(path.join(ROOT, 'public/cards', card.suit, `${card.rank}.svg`), 'utf8');
  // Q = 25% error correction: survives glare, folds and a bit of tape.
  const qrSvg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#000000', light: '#ffffff' } });
  const name = `${rankName(card.rank)} of ${card.suit}`;
  const cx = PAGE.width / 2;

  const cardBox = { width: 126, height: 176.4 }; // 5:7, like the card images
  const qrSize = 112;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PAGE.width}mm" height="${PAGE.height}mm" viewBox="0 0 ${PAGE.width} ${PAGE.height}">
  <title>${escapeXml(name)}</title>
  <rect width="${PAGE.width}" height="${PAGE.height}" fill="#ffffff"/>
  <rect x="10" y="10" width="${PAGE.width - 20}" height="${PAGE.height - 20}" rx="8" fill="none" stroke="${COLORS.frame}" stroke-width="1.4"/>
  <rect x="14" y="14" width="${PAGE.width - 28}" height="${PAGE.height - 28}" rx="6" fill="none" stroke="${COLORS.accent}" stroke-width="0.5"/>
  <text x="${cx}" y="46" text-anchor="middle" font-family="'Great Vibes', 'Brush Script MT', cursive" font-size="24" fill="${COLORS.ink}">Find the Joker</text>
  <text x="${cx}" y="58" text-anchor="middle" font-family="'Lato', 'Helvetica', 'Arial', sans-serif" font-size="5.2" letter-spacing="1.2" fill="${COLORS.accent}">SCAN · SOLVE THE RIDDLE · COLLECT THE CARD</text>
  ${nestSvg(cardSvg, { x: cx - cardBox.width / 2, y: 68, ...cardBox })}
  ${nestSvg(qrSvg, { x: cx - qrSize / 2, y: 252, width: qrSize, height: qrSize })}
  <text x="${cx}" y="378" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-weight="700" font-size="9" fill="${COLORS.ink}">Scan me to win the ${escapeXml(name)}</text>
  <text x="${cx}" y="392" text-anchor="middle" font-family="'Lato', 'Helvetica', 'Arial', sans-serif" font-size="3.6" fill="${COLORS.ink}" opacity="0.75">Log in to the private area first · ${escapeXml(url)}</text>
</svg>
`;
}

/** Posters are inlined (not <object>) so they use the web fonts loaded by the page. */
function buildPrintPage(suit, posters) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${suit} posters (A3)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Great+Vibes&family=Lato&display=block" rel="stylesheet">
<style>
  @page { size: A3 portrait; margin: 0; }
  html, body { margin: 0; }
  .poster { width: 297mm; height: 420mm; page-break-after: always; break-after: page; }
  .poster:last-child { page-break-after: auto; break-after: auto; }
  .poster > svg { width: 100%; height: 100%; display: block; }
  @media screen { body { background: #888; } .poster { margin: 10mm auto; background: #fff; box-shadow: 0 2mm 6mm #0006; } }
</style>
</head>
<body>
${posters.map((svg) => `<div class="poster">${svg.replace(/^<\?xml[^>]*>\s*/, '')}</div>`).join('\n')}
</body>
</html>
`;
}

async function writePdf(htmlPath, pdfPath) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.warn('⚠ --pdf needs Playwright (npm i -D playwright && npx playwright install chromium).');
    console.warn(`  Or open ${htmlPath} in Chrome and print it to PDF (A3, no margins).`);
    return;
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
    await page.pdf({ path: pdfPath, format: 'A3', printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
  console.log(`✔ ${path.relative(process.cwd(), pdfPath)}`);
}

async function main() {
  const config = loadConfig();
  const cards = await fetchCards(config);
  if (cards.length === 0) fail(`No ${config.suit} found in the cards collection.`);

  await mkdir(config.out, { recursive: true });
  const posters = [];
  for (const card of cards) {
    if (!card.code) fail(`${rankName(card.rank)} of ${card.suit} has no code: run the latest migrations.`);
    if (!card.riddle || !card.solution) {
      console.warn(`⚠ ${rankName(card.rank)} of ${card.suit}: riddle or solution missing, the QR page will say "not available yet".`);
    }
    const url = `${config.siteUrl}/area/riddles/${card.code}`;
    const file = `${card.suit}-${String(card.rank).padStart(2, '0')}-${rankName(card.rank).toLowerCase()}.svg`;
    const poster = await buildPoster(card, url);
    await writeFile(path.join(config.out, file), poster);
    posters.push(poster);
  }

  const htmlPath = path.join(config.out, `${config.suit}-posters.html`);
  await writeFile(htmlPath, buildPrintPage(config.suit, posters));
  console.log(`✔ ${posters.length} posters in ${path.relative(process.cwd(), config.out) || '.'}/`);
  console.log(`✔ ${path.relative(process.cwd(), htmlPath)} (open and print, A3, no margins)`);

  if (config.pdf) await writePdf(htmlPath, path.join(config.out, `${config.suit}-posters.pdf`));
  console.log('\n⚠ The posters contain secret codes: do not commit or share the files.');
}

await main();
