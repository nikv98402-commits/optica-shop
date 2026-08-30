import { gzipSync } from 'node:zlib';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');
const html = await readFile(join(dist, 'index.html'), 'utf8');
const files = await readdir(assets);

function initialAsset(pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing initial ${label} reference in dist/index.html.`);
  return match[1].split('/').at(-1);
}

async function size(file) {
  const bytes = await readFile(join(assets, file));
  return { raw: bytes.byteLength, gzip: gzipSync(bytes).byteLength };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const entryJs = initialAsset(/<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/, 'entry JS');
const entryCss = initialAsset(/<link[^>]+href="([^"]*\/assets\/index-[^"]+\.css)"/, 'entry CSS');
const js = await size(entryJs);
const css = await size(entryCss);
const cssText = await readFile(join(assets, entryCss), 'utf8');

assert(js.gzip < 150 * 1024, `Entry JS is ${js.gzip} bytes gzip; budget is <153600.`);
assert(css.raw < 100 * 1024, `Entry CSS is ${css.raw} bytes raw; budget is <102400.`);
assert(css.gzip < 25 * 1024, `Entry CSS is ${css.gzip} bytes gzip; budget is <25600.`);

for (const chunk of ['supabase-', 'AuthNavigationBridge-', 'FoundationRoutes-', 'TryOnPilot-', 'faceFitEngine-']) {
  const file = files.find((candidate) => candidate.startsWith(chunk) && candidate.endsWith('.js'));
  assert(file, `Expected an independently loadable ${chunk} chunk.`);
  assert(!html.includes(file), `${file} must not be eagerly loaded by Home.`);
}

assert(html.includes('requestIdleCallback'), 'Yandex Metrica must remain outside the initial rendering path.');
assert(!/fonts\.(?:googleapis|gstatic)\.com/.test(html), 'Initial HTML must not depend on Google Fonts.');
assert(!/fonts\.(?:googleapis|gstatic)\.com/.test(cssText), 'Entry CSS must not depend on Google Fonts.');

const criticalFontPreloads = [
  'fonts/manrope-cyrillic-variable.woff2',
  'fonts/unbounded-cyrillic-variable.woff2',
];
for (const font of criticalFontPreloads) {
  assert(html.includes(`rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin`), `Missing critical local font preload for ${font}.`);
}
assert((html.match(/rel="preload"[^>]+as="font"/g) ?? []).length === criticalFontPreloads.length, 'Only critical local fonts may be preloaded.');

for (const font of [
  ...criticalFontPreloads,
  'fonts/manrope-latin-variable.woff2',
  'fonts/unbounded-latin-variable.woff2',
]) {
  const bytes = await readFile(join(dist, font));
  assert(bytes.byteLength > 1_000, `Local font ${font} is missing or empty.`);
}

console.log(JSON.stringify({
  entryJs: { file: entryJs, ...js, budgetGzip: 150 * 1024 },
  entryCss: { file: entryCss, ...css, budgetRaw: 100 * 1024, budgetGzip: 25 * 1024 },
  lazyChunksVerified: ['supabase', 'AuthNavigationBridge', 'FoundationRoutes', 'TryOnPilot', 'faceFitEngine'],
  localFontsVerified: true,
}, null, 2));
