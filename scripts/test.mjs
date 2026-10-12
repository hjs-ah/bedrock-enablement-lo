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

ok('wrapper survives a missing localStorage', () => {
  const ctx = sandbox();
  vm.runInContext(js('scorm.js'), ctx);
  ctx.Scorm.init();
  ctx.Scorm.saveProgress('a', 'b');
  assert.equal(ctx.Scorm.get('cmi.suspend_data'), '');
});

console.log(`\n${passed} checks passed`);
