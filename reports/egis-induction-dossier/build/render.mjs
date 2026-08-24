/**
 * Render dossier.html to PDF with headless Chromium.
 *
 *   node build/render.mjs [--out path.pdf] [--shots]
 *
 * --shots also writes PNG proofs of every page to build/proofs/ so the layout
 * can be eyeballed without opening the PDF.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'dossier.html');

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const OUT = path.resolve(arg('--out', path.join(ROOT, 'EgisIrelandRUTInductionDossier.pdf')));
const SHOTS = argv.includes('--shots');

const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));

await page.goto(pathToFileURL(SRC).href, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__chartsReady === true, { timeout: 30_000 });
await page.evaluate(() => document.fonts.ready);

// Report anything the page itself flagged (missing chart hosts, overflow, etc.)
const diag = await page.evaluate(() => window.__diagnostics || {});
const pageCount = await page.evaluate(() => document.querySelectorAll('.page').length);

// Content that overflows its fixed-height page is a silent layout bug in print,
// so measure every page box and fail loudly instead.
const { overflow, slack } = await page.evaluate(() => {
  const overflow = [];
  const slack = [];
  const px2mm = 25.4 / 96;
  document.querySelectorAll('.page').forEach((p, i) => {
    const body = p.querySelector('.page-body');
    if (!body) return;
    const foot = p.querySelector('.page-foot');
    const limit = foot ? foot.getBoundingClientRect().top : p.getBoundingClientRect().bottom;
    // .page-body is flex:1, so measure its last child instead of the box itself
    const kids = [...body.children];
    const contentBottom = kids.length
      ? Math.max(...kids.map((k) => k.getBoundingClientRect().bottom))
      : body.getBoundingClientRect().bottom;
    const gap = limit - contentBottom;
    if (gap < -1.5) overflow.push({ page: i + 1, over: Math.round(-gap * px2mm) + 'mm' });
    else if (gap > 40) slack.push({ page: i + 1, slack: Math.round(gap * px2mm) + 'mm' });
  });
  return { overflow, slack };
});

await page.pdf({
  path: OUT,
  width: '210mm',
  height: '297mm',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' }
});

if (SHOTS) {
  const dir = path.join(HERE, 'proofs');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const pages = await page.$$('.page');
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: path.join(dir, `p${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log(`proofs: ${pages.length} written to build/proofs/`);
}

await browser.close();

console.log(`pages: ${pageCount}`);
console.log(`pdf:   ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
if (Object.keys(diag).length) console.log('diagnostics:', JSON.stringify(diag));
if (overflow.length) console.log('OVERFLOW:', JSON.stringify(overflow));
if (slack.length) console.log('SLACK (>40px unused above the footer):', JSON.stringify(slack));
if (problems.length) {
  console.log('CONSOLE ISSUES:');
  problems.slice(0, 25).forEach((p) => console.log('  ' + p));
}
if (overflow.length || problems.length) process.exitCode = 1;
