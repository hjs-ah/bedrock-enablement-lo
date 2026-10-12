// Checks content integrity and the SCORM wrapper against a mock LMS.
// Run: node scripts/test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = (f) => fs.readFileSync(path.join(root, 'public', 'module', 'js', f), 'utf8');

function sandbox(extra = {}) {
  const ctx = { console, ...extra };
  ctx.window = ctx;
  ctx.parent = ctx;
  ctx.top = ctx;
  return vm.createContext(ctx);
}

let passed = 0;
const ok = (name, fn) => { fn(); passed += 1; console.log('ok  ' + name); };

/* ---- content ---- */
const cctx = sandbox();
vm.runInContext(js('content.js'), cctx);
const M = cctx.MODULE;

ok('scenario points total matches scenarioMax', () => {
  let max = 0;
  for (const s of M.scenarios) {
    for (const node of [s.n1, s.n2]) {
      const scores = Array.from(node.options, (o) => o.score).sort();
      assert.equal(scores.join(','), '0,1,2', `${s.id} options need one each of 0, 1, 2`);
      max += 2;
    }
  }
  assert.equal(max, M.scenarioMax);
});

ok('each quiz question has exactly one correct answer and quizMax matches', () => {
  for (const q of M.quiz) assert.equal(q.opts.filter((o) => o.correct).length, 1, q.q);
  assert.equal(M.quiz.length, M.quizMax);
});

ok('sort answers refer to real zones', () => {
  const ids = M.zones.map((z) => z.id);
  for (const s of M.sort) assert.ok(ids.includes(s.answer), s.id);
});

ok('pass mark is reachable and not trivial', () => {
  const total = M.scenarioMax + M.quizMax;
  assert.ok(Math.round(((total - 1) / total) * 100) >= M.passMark);
  assert.ok(Math.round((total / 2 / total) * 100) < M.passMark);
});

/* ---- SCORM wrapper with a mock LMS ---- */
function mockLms(initial = {}) {
  const store = { 'cmi.core.lesson_status': 'not attempted', ...initial };
  const calls = [];
  return {
    store,
    calls,
    API: {
      LMSInitialize: () => { calls.push('init'); return 'true'; },
      LMSGetValue: (k) => store[k] ?? '',
      LMSSetValue: (k, v) => { calls.push(['set', k, v]); store[k] = v; return 'true'; },
      LMSCommit: () => { calls.push('commit'); return 'true'; },
      LMSFinish: () => { calls.push('finish'); return 'true'; },
      LMSGetLastError: () => '0'
    }
  };
}

ok('wrapper finds API, initializes, and sets incomplete', () => {
  const lms = mockLms();
  const ctx = sandbox({ API: lms.API });
  vm.runInContext(js('scorm.js'), ctx);
  assert.equal(ctx.Scorm.init(), true);
  assert.equal(ctx.Scorm.isLMS(), true);
  assert.equal(lms.store['cmi.core.lesson_status'], 'incomplete');
});

ok('wrapper reports score, status, location, suspend data', () => {
  const lms = mockLms();
  const ctx = sandbox({ API: lms.API });
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.setScore(88.4);
  ctx.Scorm.setStatus('passed');
  ctx.Scorm.saveProgress('quiz', '{"i":7}');
  assert.equal(lms.store['cmi.core.score.raw'], '88');
  assert.equal(lms.store['cmi.core.score.max'], '100');
  assert.equal(lms.store['cmi.core.lesson_status'], 'passed');
  assert.equal(lms.store['cmi.core.lesson_location'], 'quiz');
  assert.equal(lms.store['cmi.suspend_data'], '{"i":7}');
});

ok('wrapper truncates suspend_data to 4096 characters', () => {
  const lms = mockLms();
  const ctx = sandbox({ API: lms.API });
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.saveProgress('x', 'a'.repeat(5000));
  assert.equal(lms.store['cmi.suspend_data'].length, 4096);
});

ok('wrapper finish writes session_time, exit, and calls LMSFinish', () => {
  const lms = mockLms();
  const ctx = sandbox({ API: lms.API });
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.finish(true);
  assert.match(lms.store['cmi.core.session_time'], /^\d{4}:\d{2}:\d{2}\.\d{2}$/);
  assert.equal(lms.store['cmi.core.exit'], 'suspend');
  assert.ok(lms.calls.includes('finish'));
});

ok('wrapper formats session time correctly', () => {
  const ctx = sandbox();
  vm.runInContext(js('scorm.js'), ctx);
  assert.equal(ctx.Scorm._sessionTime(3725500), '0001:02:05.50');
});

ok('wrapper runs standalone when no LMS exists', () => {
  const store = {};
  const ctx = sandbox({ localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } });
  vm.runInContext(js('scorm.js'), ctx);
  assert.equal(ctx.Scorm.init(), false);
  assert.equal(ctx.Scorm.isLMS(), false);
  ctx.Scorm.saveProgress('zones', '{"i":2}');
  const p = ctx.Scorm.loadProgress();
  assert.equal(p.location, 'zones');
  assert.equal(p.data, '{"i":2}');
});

ok('wrapper stays standalone when the parent frame is on another origin', () => {
  const crossOrigin = {};
  Object.defineProperty(crossOrigin, 'API', { get() { throw new Error('SecurityError: blocked a frame from accessing a cross-origin frame'); } });
  const store = {};
  const ctx = sandbox({ localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } });
  ctx.parent = crossOrigin;
  vm.runInContext(js('scorm.js'), ctx);
  assert.equal(ctx.Scorm.init(), false);
  assert.equal(ctx.Scorm.isLMS(), false);
  ctx.Scorm.saveProgress('zones', '{}');
  assert.equal(ctx.Scorm.loadProgress().location, 'zones');
});

ok('wrapper survives a missing localStorage', () => {
  const ctx = sandbox();
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.saveProgress('a', 'b');
  assert.equal(ctx.Scorm.get('cmi.suspend_data'), '');
});

/* ---- site navigation stays identical on every page ---- */
const pageHtml = (...parts) => fs.readFileSync(path.join(root, 'public', ...parts), 'utf8');
const navOf = (html) => {
  const m = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/);
  assert.ok(m, 'page has a site-nav');
  return m[0].replace(/ aria-current="page"/g, '');
};
const pages = {
  case: pageHtml('index.html'),
  module: pageHtml('module', 'index.html'),
  storyboard: pageHtml('storyboard', 'index.html'),
  board: pageHtml('storyboard', 'board', 'index.html')
};

ok('site nav has the same items, order and links on the case page, module and storyboard', () => {
  const ref = navOf(pages.case);
  assert.equal(navOf(pages.module), ref);
  assert.equal(navOf(pages.storyboard), ref);
  assert.equal(navOf(pages.board), ref);
});

ok('each page marks only its own nav item as current', () => {
  const current = (html) => [...html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0].matchAll(/<a href="([^"]+)" aria-current="page"/g)].map((m) => m[1]);
  assert.deepEqual(current(pages.case), ['/']);
  assert.deepEqual(current(pages.module), ['/module/']);
  assert.deepEqual(current(pages.storyboard), ['/storyboard/']);
  assert.deepEqual(current(pages.board), ['/storyboard/']);
});

ok('hosting keeps the trailing slash so the module\'s relative asset paths resolve', () => {
  // The module links css/ and js/ relatively (it has to, to work inside a SCORM zip).
  // With trailingSlash false, /module/ redirects to /module and those paths break.
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(cfg.trailingSlash, true);
  assert.match(pages.module, /href="css\/module\.css"/);
  assert.match(pages.module, /src="js\/app\.js"/);
});

ok('module site bar is hidden by default so the SCORM package shows no site chrome', () => {
  assert.match(pages.module, /<header class="site-bar" id="siteBar" hidden>/);
});

ok('old teal palette and fonts are gone', () => {
  for (const [name, html] of Object.entries(pages)) assert.ok(!/Bricolage|Source\+Serif/.test(html), name);
  for (const f of [['assets', 'site.css'], ['module', 'css', 'module.css'], ['assets', 'favicon.svg']]) {
    assert.ok(!/0C6B7A|5EC4D3|084F5B/i.test(pageHtml(...f)), f.join('/'));
  }
});

/* ---- SCORM visibility: log, snapshot, reset ---- */
ok('wrapper keeps a log of calls and a snapshot of what the LMS holds', () => {
  const lms = mockLms();
  const ctx = sandbox({ API: lms.API });
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.setScore(88);
  ctx.Scorm.saveProgress('quiz', '{"i":7}');
  const snap = ctx.Scorm.snapshot();
  assert.equal(snap.live, true);
  assert.equal(snap.score, '88');
  assert.equal(snap.location, 'quiz');
  assert.equal(snap.suspendLength, 7);
  assert.equal(snap.suspendMax, 4096);
  assert.ok(snap.calls.includes('LMSInitialize("")'));
  assert.ok(snap.calls.some((c) => c.startsWith('LMSSetValue("cmi.core.score.raw"')));
  assert.ok(snap.calls.includes('LMSCommit("")'));
});

ok('wrapper simulates the same calls in browser mode', () => {
  const store = {};
  const ctx = sandbox({ localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } } });
  vm.runInContext(js('scorm.js'), ctx);
  assert.equal(ctx.Scorm.init(), false);
  const snap = ctx.Scorm.snapshot();
  assert.equal(snap.live, false);
  assert.equal(snap.status, 'incomplete');
  assert.ok(snap.calls.includes('LMSInitialize("")'));
});

ok('wrapper log stays short and long values are shortened', () => {
  const ctx = sandbox();
  vm.runInContext(js('scorm.js'), ctx);
  for (let i = 0; i < 100; i += 1) ctx.Scorm.set('cmi.suspend_data', 'x'.repeat(200));
  const snap = ctx.Scorm.snapshot();
  assert.ok(snap.calls.length <= 40);
  assert.ok(snap.calls[snap.calls.length - 1].length < 120);
});

ok('reset in an LMS clears place and saved answers and marks the attempt incomplete', () => {
  const lms = mockLms();
  const ctx = sandbox({ API: lms.API });
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.saveProgress('quiz', '{"i":7}');
  ctx.Scorm.setStatus('passed');
  ctx.Scorm.reset();
  assert.equal(lms.store['cmi.core.lesson_location'], '');
  assert.equal(lms.store['cmi.suspend_data'], '');
  assert.equal(lms.store['cmi.core.lesson_status'], 'incomplete');
});

ok('reset in browser mode clears everything the module saved', () => {
  const store = {};
  const ctx = sandbox({ localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } } });
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.saveProgress('quiz', '{"i":7}');
  ctx.Scorm.setScore(90);
  ctx.Scorm.setStatus('passed');
  ctx.Scorm.reset();
  const left = Object.keys(store).filter((k) => !k.endsWith('lesson_status'));
  assert.deepEqual(left, []);
  assert.equal(ctx.Scorm.get('cmi.core.lesson_status'), 'incomplete');
});

ok('module has a reset button with a confirmation and an LMS data panel', () => {
  for (const id of ['resetBtn', 'resetDialog', 'resetYes', 'resetNo', 'lmsBtn', 'lmsPanel']) {
    assert.match(pages.module, new RegExp(`id="${id}"`), id);
  }
  assert.match(pages.module, /role="alertdialog"/);
});

/* ---- storyboard: one file feeds the document view and the board ---- */
const story = JSON.parse(fs.readFileSync(path.join(root, 'content', 'storyboard.json'), 'utf8'));

ok('storyboard scenes match the module steps, in order', () => {
  const m = js('app.js').match(/var SCENES = \[([^\]]+)\]/);
  assert.ok(m, 'SCENES list found');
  const steps = m[1].split(',').map((x) => x.trim().replace(/'/g, ''));
  assert.deepEqual(story.scenes.map((s) => s.id), steps);
});

ok('document view and board both carry every scene and every part from the JSON', () => {
  for (const [name, html] of [['storyboard', pages.storyboard], ['board', pages.board]]) {
    for (const sc of story.scenes) {
      for (const k of ['title', 'kind', 'objective', 'onScreen', 'interaction', 'feedback', 'assessment', 'rationale']) {
        assert.ok(html.includes(sc[k]), `${name} is missing ${sc.id}.${k}. Run npm run build:storyboard.`);
      }
    }
  }
});

ok('board has one column per scene', () => {
  const cols = pages.board.match(/<th scope="col">/g) || [];
  assert.equal(cols.length, story.scenes.length);
});

ok('every board screenshot that is linked exists on disk', () => {
  const srcs = [...pages.board.matchAll(/<img class="shot" src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(srcs.length > 0, 'board shows screenshots');
  for (const src of srcs) assert.ok(fs.existsSync(path.join(root, 'public', src)), src);
});

console.log(`\n${passed} checks passed`);
