// Generates public/storyboard/index.html from content/storyboard.json.
// Run: node scripts/build-storyboard.mjs
import fs from 'node:fs';
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

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Remove this tag when the case is ready to be indexed. -->
  <meta name="robots" content="noindex">
  <title>${data.title}</title>
  <meta name="description" content="The design record for a Bedrock sales enablement module: audience, goal, scene-by-scene plan, and measurement.">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap">
  <link rel="stylesheet" href="/assets/site.css">
  <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script defer src="/assets/site.js"></script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="draft" role="note">Draft in progress. Values marked <span class="filler">like this</span> are placeholders and will be replaced before this case is shared.</div>
  <header class="wrap site-head">
    <a class="name" href="/">Antone Holmes</a>
    <nav aria-label="This case">
      <a href="/">Case</a>
      <a href="/module/" data-track="nav_module" data-where="storyboard">Module</a>
      <a href="#measurement">Measurement</a>
    </nav>
  </header>
  <main id="main" class="wrap">
    <section style="padding:2rem 0 1.5rem" data-section="storyboard-top">
      <h1 style="font:800 clamp(2rem,5vw,3.4rem)/1.05 var(--sans);letter-spacing:-.025em;margin:0 0 1rem">${data.title}</h1>
      <p style="max-width:40rem;font-size:1.2rem">${data.intro}</p>
      <h2 style="margin-top:2rem">Audience</h2>
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
    </section>
  </main>
  <footer class="wrap site-foot">
    <p><a href="/">Back to the case</a>. Source on <a href="https://github.com/hjs-ah/bedrock-enablement-lo">GitHub</a>.</p>
  </footer>
</body>
</html>
`;

const out = path.join(root, 'public', 'storyboard', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Wrote', path.relative(root, out));
