// Captures one screenshot per module step into public/storyboard/screens/, for the board view.
// Run: node scripts/capture-screens.mjs   (then: npm run build:storyboard)
//
// Needs Playwright with a Chromium browser (not a project dependency, so install it yourself:
// npm i --no-save playwright). Optional: set FONT_DIR to a folder holding Poppins .woff2 files
// named poppins-latin-<weight>-normal.woff2 (from @fontsource/poppins) so captures match the live look.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const outDir = path.join(pub, 'storyboard', 'screens');
const story = JSON.parse(fs.readFileSync(path.join(root, 'content', 'storyboard.json'), 'utf8'));

let chromium;
try {
  // require() also honors NODE_PATH, so a globally installed Playwright is found.
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i --no-save playwright   (and: npx playwright install chromium)');
  process.exit(1);
}

// Tiny static server that behaves like the hosting config (directory index, trailing slash).
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(pub, p);
  if (!file.startsWith(pub) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const fontCss = (() => {
  const dir = process.env.FONT_DIR;
  if (!dir) return '';
  return [400, 500, 600, 700].map((w) => {
    const f = path.join(dir, `poppins-latin-${w}-normal.woff2`);
    if (!fs.existsSync(f)) return '';
    return `@font-face{font-family:"Poppins";font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format("woff2")}`;
  }).join('');
})();

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route('**/fonts.googleapis.com/**', (r) => r.abort());
await page.route('**/_vercel/**', (r) => r.abort());

const ids = await (async () => {
  await page.goto(`${base}/module/?theme=light`);
  return page.evaluate(() => Array.from(document.querySelectorAll('#outline .toc-item')).length);
})();
if (ids !== story.scenes.length) {
  console.error(`The module has ${ids} steps but the storyboard has ${story.scenes.length} scenes. Fix the mismatch first.`);
  await browser.close(); server.close(); process.exit(1);
}

for (let k = 0; k < story.scenes.length; k += 1) {
  const scene = story.scenes[k];
  const last = k === story.scenes.length - 1;
  await page.goto(`${base}/module/?theme=light`);
  // Seed a saved state: the results step needs a finished run; every other step is shown as the learner first arrives.
  await page.evaluate(({ k, last }) => {
    const M = window.MODULE;
    const state = { i: k, far: k, warm: null, sort: {}, plan: {}, scen: {}, quiz: {}, done: false };
    if (last) {
      state.warm = M.warmup.options.findIndex((o) => o.score === 2);
      M.sort.forEach((s) => { state.sort[s.id] = s.answer; });
      M.planner.forEach((q) => { state.plan[q.id] = q.opts[0][0]; });
      M.scenarios.forEach((sc) => {
        const best = (n) => { const i = n.options.findIndex((o) => o.score === 2); return { pick: i, score: 2 }; };
        state.scen[sc.id] = { n1: best(sc.n1), n2: best(sc.n2) };
      });
      M.quiz.forEach((q, qi) => { state.quiz[qi] = q.opts.findIndex((o) => o.correct); });
      state.done = true;
    }
    localStorage.setItem('bedrock-lo-v1:cmi.suspend_data', JSON.stringify(state));
    localStorage.setItem('bedrock-lo-v1:cmi.core.lesson_location', '');
  }, { k, last });
  await page.reload();
  await page.evaluate(() => { const b = document.getElementById('siteBar'); if (b) b.hidden = true; });
  if (fontCss) { await page.addStyleTag({ content: fontCss }); await page.evaluate(() => document.fonts.ready); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, `${scene.id}.jpg`), type: 'jpeg', quality: 82 });
  console.log('captured', scene.id);
}
await browser.close();
server.close();

// Remember which module files these screens came from, so the build can say when they are stale.
const hash = crypto.createHash('sha1');
for (const f of ['js/content.js', 'js/app.js', 'css/module.css']) hash.update(fs.readFileSync(path.join(pub, 'module', f)));
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString().slice(0, 10), moduleHash: hash.digest('hex') }, null, 2) + '\n');
console.log('Wrote manifest.json');
