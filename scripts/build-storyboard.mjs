// Generates two views of one file, content/storyboard.json:
//   public/storyboard/index.html        the document view (read top to bottom)
//   public/storyboard/board/index.html  the board view (one column per scene, with screenshots)
// Edit the JSON, run this, and both views change together.
// Run: node scripts/build-storyboard.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'content', 'storyboard.json'), 'utf8'));

// Strings in the JSON may contain trusted inline HTML (filler and to-do tags).
const parts = [
  ['objective', 'Objective'],
  ['onScreen', 'On screen'],
  ['interaction', 'Interaction'],
  ['feedback', 'Feedback'],
  ['assessment', 'Assessment'],
  ['rationale', 'Why this way']
];

const scenes = data.scenes.map((s) => `
    <section class="scene" id="${s.id}" data-section="scene-${s.id}">
      <h2>${s.title}</h2>
      <p class="kind">${s.kind}</p>
      <dl class="parts">
${parts.map(([k, label]) => `        <dt>${label}</dt><dd>${s[k]}</dd>`).join('\n')}
      </dl>
    </section>`).join('\n');

const measurement = data.measurement.map((m) =>
  `          <tr><th scope="row">${m.level}</th><td>${m.question}</td><td>${m.measure}</td><td>${m.source}</td></tr>`).join('\n');

// Screens are optional: captured by scripts/capture-screens.mjs.
const screensDir = path.join(root, 'public', 'storyboard', 'screens');
const manifestPath = path.join(screensDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
const hasScreen = (id) => fs.existsSync(path.join(screensDir, `${id}.jpg`));
if (manifest) {
  const h = crypto.createHash('sha1');
  for (const f of ['js/content.js', 'js/app.js', 'css/module.css']) h.update(fs.readFileSync(path.join(root, 'public', 'module', f)));
  if (h.digest('hex') !== manifest.moduleHash) {
    console.warn('Note: the module changed since the board screenshots were captured. Run: node scripts/capture-screens.mjs');
  }
}

const navLink = (href, label, key, current) =>
  `        <a href="${href}"${current === key ? ' aria-current="page"' : ''} data-track="nav_${key}" data-where="header">${label}</a>`;

const shell = ({ title, description, current, mainClass, extraHead = '', body }) => `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Remove this tag when the case is ready to be indexed. -->
  <meta name="robots" content="noindex">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/site.css">
  <script>
    /* Apply the saved theme before paint. Light is the default; ?theme=dark overrides it (useful when embedding). */
    (function () { var t = null; try { t = new URLSearchParams(location.search).get('theme'); } catch (e) {} if (!t) { try { t = localStorage.getItem('theme'); } catch (e) {} } if (t === 'dark' || t === 'light') { document.documentElement.setAttribute('data-theme', t); } }());
  </script>
  <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script defer src="/assets/site.js"></script>${extraHead}
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <aside class="draft" aria-label="Draft notice">Draft in progress. Values marked <span class="filler">like this</span> are placeholders and will be replaced before this case is shared.</aside>
  <header class="site-bar" id="siteBar">
    <div class="site-bar-in">
      <a class="site-brand" href="/"><span class="site-brand-name">Antone Holmes</span><span class="site-brand-sub">Enablement portfolio</span></a>
      <nav class="site-nav" aria-label="Site">
${navLink('/', 'Case', 'case', current)}
${navLink('/module/', 'Module', 'module', current)}
${navLink('/storyboard/', 'Storyboard', 'storyboard', current)}
        <a href="https://ah-resume-1-0.vercel.app/" data-track="nav_portfolio" data-where="header">Portfolio &#8599;</a>
      </nav>
      <button type="button" class="site-theme" id="themeBtn" aria-label="Switch to dark theme"><svg class="ic-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg><svg class="ic-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span id="themeLabel">Dark</span></button>
    </div>
  </header>
  <main id="main" class="${mainClass}">
${body}
  </main>
  <footer class="site-foot">
    <p><a href="/">Back to the case</a>. Source on <a href="https://github.com/hjs-ah/bedrock-enablement-lo">GitHub</a>.</p>
  </footer>
</body>
</html>
`;

/* ---------- document view ---------- */

const docBody = `    <section data-section="storyboard-top">
      <h1>${data.title}</h1>
      <p class="lede" style="max-width:40rem">${data.intro}</p>
      <p class="actions"><a class="btn" href="/storyboard/board/" data-track="open_board" data-where="storyboard">See it as a board</a></p>
      <h2>Audience</h2>
      <p style="max-width:40rem">${data.audience}</p>
      <h2>Performance goal</h2>
      <p style="max-width:40rem">${data.goal}</p>
      <h2>Design approach</h2>
      <ul class="plain" style="max-width:40rem">
${data.approach.map((a) => `        <li>${a}</li>`).join('\n')}
      </ul>
    </section>
${scenes}
    <section class="scene" id="measurement" data-section="measurement">
      <h2>Measurement plan</h2>
      <p class="kind">The four Kirkpatrick levels, with the evidence behind each.</p>
      <div class="table-scroll">
        <table class="data">
          <thead><tr><th scope="col">Level</th><th scope="col">Question</th><th scope="col">Measure</th><th scope="col">Evidence</th></tr></thead>
          <tbody>
${measurement}
          </tbody>
        </table>
      </div>
    </section>`;

const doc = shell({
  title: data.title,
  description: 'The design record for a Bedrock sales enablement module: audience, goal, scene-by-scene plan, and measurement.',
  current: 'storyboard',
  mainClass: 'wrap',
  body: docBody
});

/* ---------- board view ---------- */

const plain = (html) => String(html).replace(/<[^>]+>/g, '');
const screenCell = (sc) => hasScreen(sc.id)
  ? `<td><a class="shot-link" href="/storyboard/screens/${sc.id}.jpg" target="_blank" rel="noopener"><img class="shot" src="/storyboard/screens/${sc.id}.jpg" width="1100" height="720" loading="lazy" alt="Screenshot of the module step: ${plain(sc.title).replace(/"/g, '&quot;')}"><span class="sr">(opens full size in a new tab)</span></a></td>`
  : '<td><p class="no-shot">No screenshot yet.</p></td>';

const boardHead = data.scenes.map((sc, i) =>
  `            <th scope="col"><span class="b-n">Scene ${i + 1}</span><a class="b-t" href="/storyboard/#${sc.id}" data-track="board_scene_link" data-where="${sc.id}">${sc.title}</a><span class="b-k">${sc.kind}</span></th>`).join('\n');

const boardRows = [
  `          <tr class="screen-row"><th scope="row">Screen</th>${data.scenes.map(screenCell).join('')}</tr>`,
  ...parts.map(([k, label]) =>
    `          <tr><th scope="row">${label}</th>${data.scenes.map((sc) => `<td>${sc[k]}</td>`).join('')}</tr>`)
].join('\n');

const shotsNote = manifest
  ? `Screens captured ${manifest.capturedAt} from the live module. The results screen is shown with a sample perfect run.`
  : 'Screens have not been captured yet.';

const boardBody = `    <section class="board-top" data-section="board-top">
      <h1>Storyboard board</h1>
      <p class="lede">${data.intro}</p>
      <div class="board-tools">
        <a class="btn quiet" href="/storyboard/" data-track="open_doc_view" data-where="board">Read it as a document</a>
        <button type="button" class="btn quiet" id="boardPrev" data-track="board_scroll" data-where="prev">Scroll left</button>
        <button type="button" class="btn quiet" id="boardNext" data-track="board_scroll" data-where="next">Scroll right</button>
        <button type="button" class="btn quiet" id="copyLink" data-track="board_copy_link" data-where="board">Copy link</button>
        <span id="copyNote" class="sr" role="status" aria-live="polite"></span>
      </div>
    </section>
    <div class="board" id="board" role="region" aria-label="Storyboard board. Use the scroll buttons, the arrow keys, or swipe to move between scenes." tabindex="0" data-section="board">
      <table class="board-table">
        <caption class="sr">One column per scene, in the order a learner meets them. Rows show the screen, objective, what is on screen, interaction, feedback, assessment and the reason for the design.</caption>
        <thead>
          <tr>
            <td class="corner"><span class="sr">Scene</span></td>
${boardHead}
          </tr>
        </thead>
        <tbody>
${boardRows}
        </tbody>
      </table>
    </div>
    <p class="board-note">${shotsNote} This board and the document view are built from one file, so they never disagree.</p>`;

const board = shell({
  title: 'Storyboard board: ' + data.title.replace(/^Storyboard: /, ''),
  description: 'The Bedrock module storyboard as a horizontal board: one column per scene, with screenshots and the design plan for each.',
  current: 'storyboard',
  mainClass: 'board-page',
  extraHead: '\n  <script defer src="/assets/board.js"></script>',
  body: boardBody
});

function write(rel, content) {
  const out = path.join(root, 'public', rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
  console.log('Wrote', path.relative(root, out));
}
write('storyboard/index.html', doc);
write('storyboard/board/index.html', board);
