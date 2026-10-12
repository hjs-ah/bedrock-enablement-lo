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
<html lang="en" data-theme="light">
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
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/site.css">
  <script>
    /* Apply the saved theme before paint. Light is the default; ?theme=dark overrides it (useful when embedding). */
    (function () { var t = null; try { t = new URLSearchParams(location.search).get('theme'); } catch (e) {} if (!t) { try { t = localStorage.getItem('theme'); } catch (e) {} } if (t === 'dark' || t === 'light') { document.documentElement.setAttribute('data-theme', t); } }());
  </script>
  <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script defer src="/assets/site.js"></script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <aside class="draft" aria-label="Draft notice">Draft in progress. Values marked <span class="filler">like this</span> are placeholders and will be replaced before this case is shared.</aside>
  <header class="site-bar" id="siteBar">
    <div class="site-bar-in">
      <a class="site-brand" href="/"><span class="site-brand-name">Antone Holmes</span><span class="site-brand-sub">Enablement portfolio</span></a>
      <nav class="site-nav" aria-label="Site">
        <a href="/" data-track="nav_case" data-where="header">Case</a>
        <a href="/module/" data-track="nav_module" data-where="header">Module</a>
        <a href="/storyboard/" aria-current="page" data-track="nav_storyboard" data-where="header">Storyboard</a>
        <a href="https://ah-resume-1-0.vercel.app/" data-track="nav_portfolio" data-where="header">Portfolio &#8599;</a>
      </nav>
      <button type="button" class="site-theme" id="themeBtn" aria-label="Switch to dark theme"><svg class="ic-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg><svg class="ic-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span id="themeLabel">Dark</span></button>
    </div>
  </header>
  <main id="main" class="wrap">
    <section data-section="storyboard-top">
      <h1>${data.title}</h1>
      <p class="lede" style="max-width:40rem">${data.intro}</p>
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
    </section>
  </main>
  <footer class="site-foot">
    <p><a href="/">Back to the case</a>. Source on <a href="https://github.com/hjs-ah/bedrock-enablement-lo">GitHub</a>.</p>
  </footer>
</body>
</html>
`;

const out = path.join(root, 'public', 'storyboard', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Wrote', path.relative(root, out));
