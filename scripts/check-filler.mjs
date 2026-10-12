// Lists every placeholder (filler) and to-do tag left in the site.
// Exits with code 1 if any remain, so it can gate publishing.
// Run: node scripts/check-filler.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The storyboard page is generated from content/storyboard.json, so scan the page.
const targets = ['public/index.html', 'public/storyboard/index.html'];
// Skips the legend in the draft banner ("like this").
const re = /<span class=\\?"(filler|todo)\\?">(?!like this)([^<]*)<\/span>/g;

let count = 0;
for (const t of targets) {
  const text = fs.readFileSync(path.join(root, t), 'utf8');
  for (const m of text.matchAll(re)) {
    count += 1;
    console.log(`${m[1].padEnd(6)} ${t}: ${m[2]}`);
  }
}
console.log(count ? `\n${count} placeholders remain.` : '\nNo placeholders remain.');
process.exit(count ? 1 : 0);
