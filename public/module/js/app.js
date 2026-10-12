/*
 * Module player. Works in a browser (standalone) and in a SCORM 1.2 LMS.
 * Scoring: 12 points from three scenarios + 5 points from the knowledge check.
 */
(function () {
  'use strict';

  var M = window.MODULE;
  var S = window.Scorm;

  var stage = document.getElementById('stage');
  var nextBtn = document.getElementById('next');
  var prevBtn = document.getElementById('prev');
  var bar = document.getElementById('bar');
  var barWrap = document.getElementById('barWrap');
  var stepLabel = document.getElementById('stepLabel');
  var modeEl = document.getElementById('mode');

  var SCENES = ['welcome', 'warmup', 'zones', 'planner', 'scen0', 'scen1', 'scen2', 'quiz', 'results'];
  var TITLES = {
    welcome: 'Welcome',
    warmup: 'The real question',
    zones: 'Three zones',
    planner: 'Choosing a model family',
    scen0: 'Conversation 1',
    scen1: 'Conversation 2',
    scen2: 'Conversation 3',
    quiz: 'Knowledge check',
    results: 'Results and job aid'
  };

  var state = { i: 0, far: 0, warm: null, sort: {}, plan: {}, scen: {}, quiz: {}, done: false };

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function track(name, data) {
    try {
      if (window.va) { window.va('event', { name: name, data: data || {} }); }
    } catch (e) { /* analytics is optional */ }
  }

  function loadAnalytics() {
    if (S.isLMS()) { return; }
    if (!/^https?:$/.test(window.location.protocol)) { return; }
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    document.head.appendChild(s);
  }

  function save() {
    try {
      S.saveProgress(SCENES[state.i], JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function restore() {
    var p = S.loadProgress();
    if (!p.data) { return false; }
    try {
      var s = JSON.parse(p.data);
      if (s && typeof s.i === 'number' && s.i >= 0 && s.i < SCENES.length) {
        state = s;
        return true;
      }
    } catch (e) { /* ignore bad data */ }
    return false;
  }

  function scenarioPoints() {
    var total = 0;
    M.scenarios.forEach(function (sc) {
      var a = state.scen[sc.id];
      if (a) { total += (a.n1 ? a.n1.score : 0) + (a.n2 ? a.n2.score : 0); }
    });
    return total;
  }

  function quizPoints() {
    var total = 0;
    M.quiz.forEach(function (q, idx) {
      var a = state.quiz[idx];
      if (a !== undefined && q.opts[a] && q.opts[a].correct) { total += 1; }
    });
    return total;
  }

  function percent() {
    return Math.round(((scenarioPoints() + quizPoints()) / (M.scenarioMax + M.quizMax)) * 100);
  }

  function verdict(score) {
    if (score === 2) { return { cls: 'good', label: 'Strong answer' }; }
    if (score === 1) { return { cls: 'ok', label: 'Partly right' }; }
    return { cls: 'poor', label: 'Weak answer' };
  }

  function planOutput(p) {
    var out = [];
    if (p.priority === 'speed') {
      out.push('Start with the smaller, faster model families in the catalog. Test quality on 20 real examples from the customer.');
    } else if (p.priority === 'depth') {
      out.push('Start with the most capable model families. Then test whether a lower-cost option is good enough for the easy cases.');
    } else {
      out.push('Shortlist two or three model families and run them side by side on the customer\'s own examples.');
    }
    if (p.docs === 'yes') {
      out.push('Raise retrieval early (for example, Knowledge Bases for Amazon Bedrock) so answers are grounded in the customer\'s own content.');
    }
    if (p.sensitive === 'yes') {
      out.push('Cover data handling and Guardrails in the first conversation. Bring in a solutions architect and point to current AWS documentation.');
    }
    if (p.media === 'yes') {
      out.push('Filter the catalog to models that accept the input types the customer needs before you compare anything else.');
    }
    out.push('The model choice is a test result, not a sales claim. Ask a solutions architect to help run the comparison.');
    return out;
  }

  /* ---------- scene renderers ---------- */

  function optionButton(attrs, text, cls) {
    return '<button type="button" class="opt ' + (cls || '') + '" ' + attrs + '>' + esc(text) + '</button>';
  }

  function feedback(score, why) {
    var v = verdict(score);
    return '<div class="fb ' + v.cls + '" role="status"><strong>' + v.label + '.</strong> ' + esc(why) + '</div>';
  }

  function renderWelcome() {
    var resume = state.far > 0
      ? '<p class="resume">You have progress saved. <button type="button" class="link" data-act="restart">Start over</button></p>'
      : '';
    return '' +
      '<h1>' + esc(M.title) + '</h1>' +
      '<p class="lede">A practice module for inside sales reps and sales leaders who need to talk about Amazon Bedrock with customers. About 25 minutes.</p>' +
      '<h2>By the end you can</h2>' +
      '<ul class="plain">' + M.objectives.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>' +
      '<p class="callout">' + esc(M.disclaimer) + '</p>' + resume;
  }

  function renderWarmup() {
    var w = M.warmup;
    var chosen = state.warm;
    var html = '<h1>' + TITLES.warmup + '</h1>' +
      '<p>' + esc(w.note) + '</p>' +
      '<blockquote class="customer">' + esc(w.customer) + '</blockquote>' +
      '<div class="opts">';
    w.options.forEach(function (o, idx) {
      var cls = chosen === null ? '' : (chosen === idx ? 'picked' : 'dim');
      html += optionButton('data-act="warm" data-i="' + idx + '"' + (chosen !== null ? ' disabled' : ''), o.text, cls);
    });
    html += '</div>';
    if (chosen !== null) {
      html += feedback(w.options[chosen].score, w.options[chosen].why);
      html += '<p>Executives under pressure rarely need a product tour. They need a starting point. The rest of this module gives you three of them.</p>';
    }
    return html;
  }

  function renderZones() {
    var html = '<h1>' + TITLES.zones + '</h1>' +
      '<p>When sellers asked where AI was actually being used, the answers fell into three zones. Name the zone and you know which question to ask next.</p>' +
      '<div class="tabs" role="tablist" aria-label="Adoption zones">';
    M.zones.forEach(function (z, idx) {
      var on = (state.tab || 0) === idx;
      html += '<button type="button" role="tab" class="tab ' + (on ? 'on' : '') + '" aria-selected="' + on + '" data-act="tab" data-i="' + idx + '">' + esc(z.name) + '</button>';
    });
    html += '</div>';
    var z = M.zones[state.tab || 0];
    html += '<div class="panel" role="tabpanel">' +
      '<p><strong>Who:</strong> ' + esc(z.who) + '</p>' +
      '<p><strong>Examples</strong></p><ul class="plain">' + z.examples.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' +
      '<p><strong>Watch for:</strong> ' + esc(z.risk) + '</p>' +
      '<p class="firstq"><strong>First question to ask:</strong> ' + esc(z.ask) + '</p></div>';

    html += '<h2>Which zone?</h2><p>Sort what each customer says.</p>';
    M.sort.forEach(function (item) {
      var a = state.sort[item.id];
      html += '<div class="sortitem"><p class="said">' + esc(item.text) + '</p><div class="row">';
      M.zones.forEach(function (z2) {
        var cls = '';
        if (a !== undefined) { cls = (a === z2.id ? (a === item.answer ? 'picked' : 'picked wrong') : 'dim'); }
        html += optionButton('data-act="sort" data-id="' + item.id + '" data-z="' + z2.id + '"' + (a !== undefined ? ' disabled' : ''), z2.name, cls + ' small');
      });
      html += '</div>';
      if (a !== undefined) {
        html += '<p class="fb ' + (a === item.answer ? 'good' : 'ok') + '" role="status"><strong>' + (a === item.answer ? 'Right.' : 'Not quite.') + '</strong> ' + esc(item.why) + '</p>';
      }
      html += '</div>';
    });
    return html;
  }

  function renderPlanner() {
    var html = '<h1>' + TITLES.planner + '</h1>' +
      '<p>Sellers don\'t pick the model. They frame the conversation so the right test gets run. Seven criteria cover almost every discussion.</p>' +
      '<div class="criteria">';
    M.criteria.forEach(function (c) {
      html += '<details><summary>' + esc(c.name) + '</summary><p>' + esc(c.what) + '</p><p class="firstq"><strong>Ask:</strong> ' + esc(c.ask) + '</p></details>';
    });
    html += '</div><h2>Try the planner</h2><p>Answer four questions about an imaginary customer.</p>';
    M.planner.forEach(function (q) {
      html += '<fieldset class="q"><legend>' + esc(q.q) + '</legend><div class="opts">';
      q.opts.forEach(function (o) {
        var on = state.plan[q.id] === o[0];
        html += optionButton('data-act="plan" data-q="' + q.id + '" data-v="' + o[0] + '" aria-pressed="' + on + '"', o[1], on ? 'picked' : '');
      });
      html += '</div></fieldset>';
    });
    if (Object.keys(state.plan).length === M.planner.length) {
      html += '<div class="panel result"><h3>Your talk track</h3><ul class="plain">' +
        planOutput(state.plan).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    return html;
  }

  function renderScenario(idx) {
    var sc = M.scenarios[idx];
    var a = state.scen[sc.id] || {};
    var html = '<h1>' + esc(sc.title) + '</h1><p class="setup">' + esc(sc.setup) + '</p>';

    html += '<h2>' + esc(sc.n1.prompt) + '</h2><div class="opts">';
    sc.n1.options.forEach(function (o, k) {
      var cls = a.n1 ? (a.n1.pick === k ? 'picked' : 'dim') : '';
      html += optionButton('data-act="n1" data-s="' + idx + '" data-i="' + k + '"' + (a.n1 ? ' disabled' : ''), o.text, cls);
    });
    html += '</div>';

    if (a.n1) {
      html += feedback(a.n1.score, sc.n1.options[a.n1.pick].why);
      html += '<blockquote class="customer">' + esc(sc.n2.prompt) + '</blockquote><div class="opts">';
      sc.n2.options.forEach(function (o, k) {
        var cls = a.n2 ? (a.n2.pick === k ? 'picked' : 'dim') : '';
        html += optionButton('data-act="n2" data-s="' + idx + '" data-i="' + k + '"' + (a.n2 ? ' disabled' : ''), o.text, cls);
      });
      html += '</div>';
    }
    if (a.n2) {
      html += feedback(a.n2.score, sc.n2.options[a.n2.pick].why);
      var pts = a.n1.score + a.n2.score;
      html += '<p class="callout"><strong>' + pts + ' of 4 points.</strong> ' + esc(sc.takeaway) + '</p>';
    }
    return html;
  }

  function renderQuiz() {
    var html = '<h1>' + TITLES.quiz + '</h1><p>Five questions. Each is worth one point.</p>';
    M.quiz.forEach(function (q, qi) {
      var a = state.quiz[qi];
      html += '<fieldset class="q"><legend>' + (qi + 1) + '. ' + esc(q.q) + '</legend><div class="opts">';
      q.opts.forEach(function (o, k) {
        var cls = '';
        if (a !== undefined) {
          if (o.correct) { cls = 'picked'; } else if (a === k) { cls = 'picked wrong'; } else { cls = 'dim'; }
        }
        html += optionButton('data-act="quiz" data-q="' + qi + '" data-i="' + k + '"' + (a !== undefined ? ' disabled' : ''), o.text, cls);
      });
      html += '</div>';
      if (a !== undefined) {
        var ok = q.opts[a].correct;
        html += '<p class="fb ' + (ok ? 'good' : 'poor') + '" role="status"><strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + esc(q.why) + '</p>';
      }
      html += '</fieldset>';
    });
    return html;
  }

  function renderResults() {
    var pct = percent();
    var passed = pct >= M.passMark;
    var sp = scenarioPoints();
    var qp = quizPoints();
    var html = '<h1>' + TITLES.results + '</h1>' +
      '<div class="score ' + (passed ? 'good' : 'poor') + '"><span class="big">' + pct + '%</span>' +
      '<span>' + (passed ? 'Passed. You can take these conversations into the field.' : 'Not yet. The pass mark is ' + M.passMark + '%. Review the feedback and try again.') + '</span></div>' +
      '<table class="plain"><tbody>' +
      '<tr><th scope="row">Customer conversations</th><td>' + sp + ' of ' + M.scenarioMax + '</td></tr>' +
      '<tr><th scope="row">Knowledge check</th><td>' + qp + ' of ' + M.quizMax + '</td></tr>' +
      '</tbody></table>';
    if (!passed) {
      html += '<p><button type="button" class="btn" data-act="retry">Retry the conversations and quiz</button></p>';
    }
    html += renderJobAid();
    return html;
  }

  function renderJobAid() {
    var j = M.jobaid;
    var html = '<section class="jobaid" aria-labelledby="ja-title"><h2 id="ja-title">' + esc(j.title) + '</h2>' +
      '<h3>' + esc(j.zones) + '</h3><ul class="plain">';
    M.zones.forEach(function (z) {
      html += '<li><strong>' + esc(z.name) + ':</strong> ' + esc(z.ask) + '</li>';
    });
    html += '</ul><h3>Seven criteria</h3><p>' + M.criteria.map(function (c) { return esc(c.name); }).join(', ') + '.</p>' +
      '<h3>' + esc(j.capacityTitle) + '</h3><ul class="plain">' +
      j.capacity.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
      '<p class="rule">' + esc(j.rule) + '</p><p class="small">' + esc(M.disclaimer) + '</p></section>' +
      '<p class="noprint"><button type="button" class="btn ghost" data-act="print">Print the job aid</button></p>';
    return html;
  }

  var RENDER = {
    welcome: renderWelcome,
    warmup: renderWarmup,
    zones: renderZones,
    planner: renderPlanner,
    scen0: function () { return renderScenario(0); },
    scen1: function () { return renderScenario(1); },
    scen2: function () { return renderScenario(2); },
    quiz: renderQuiz,
    results: renderResults
  };

  /* ---------- gating and navigation ---------- */

  function complete(id) {
    if (id === 'warmup') { return state.warm !== null; }
    if (id === 'zones') { return Object.keys(state.sort).length === M.sort.length; }
    if (id === 'planner') { return Object.keys(state.plan).length === M.planner.length; }
    if (id.indexOf('scen') === 0) {
      var a = state.scen[M.scenarios[Number(id.slice(4))].id];
      return !!(a && a.n1 && a.n2);
    }
    if (id === 'quiz') { return Object.keys(state.quiz).length === M.quiz.length; }
    return true;
  }

  function paint(focus) {
    var id = SCENES[state.i];
    stage.innerHTML = RENDER[id]();
    var pct = Math.round((state.i / (SCENES.length - 1)) * 100);
    bar.style.width = pct + '%';
    barWrap.setAttribute('aria-valuenow', String(pct));
    stepLabel.textContent = 'Step ' + (state.i + 1) + ' of ' + SCENES.length + ': ' + TITLES[id];
    prevBtn.disabled = state.i === 0;
    var last = state.i === SCENES.length - 1;
    nextBtn.hidden = last;
    nextBtn.disabled = !complete(id);
    if (focus) {
      stage.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function go(to) {
    if (to < 0 || to >= SCENES.length) { return; }
    state.i = to;
    state.far = Math.max(state.far, to);
    paint(true);
    save();
    track('scene_viewed', { scene: SCENES[to] });
    if (SCENES[to] === 'results') { finishAttempt(); }
  }

  function finishAttempt() {
    var pct = percent();
    var passed = pct >= M.passMark;
    S.setScore(pct);
    S.setStatus(passed ? 'passed' : 'failed');
    state.done = true;
    save();
    track('module_completed', { score: pct, status: passed ? 'passed' : 'failed' });
  }

  function refresh() {
    var top = window.pageYOffset;
    paint(false);
    window.scrollTo(0, top);
    save();
  }

  /* ---------- site bar (browser mode only) ---------- */

  // The portfolio navigation shows only when the module is opened directly on the web.
  // Inside an LMS or inside someone else's frame, the module stays chrome-free.
  function setupSiteBar() {
    var siteBar = document.getElementById('siteBar');
    if (!siteBar) { return; }
    var framed = false;
    try { framed = window.self !== window.top; } catch (e) { framed = true; }
    if (S.isLMS() || framed) { return; }
    siteBar.hidden = false;

    var btn = document.getElementById('themeBtn');
    var label = document.getElementById('themeLabel');
    var root = document.documentElement;
    function paintTheme() {
      var dark = root.getAttribute('data-theme') === 'dark';
      if (label) { label.textContent = dark ? 'Light' : 'Dark'; }
      if (btn) { btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'); }
    }
    paintTheme();
    if (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { window.localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
        paintTheme();
      });
    }
    siteBar.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-track]');
      if (t) { track(t.getAttribute('data-track'), { where: 'module' }); }
    });
  }

  /* ---------- events ---------- */

  stage.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t || t.disabled) { return; }
    var act = t.getAttribute('data-act');
    var i = Number(t.getAttribute('data-i'));

    if (act === 'warm') {
      state.warm = i;
      track('warmup_answered', { score: M.warmup.options[i].score });
    } else if (act === 'tab') {
      state.tab = i;
    } else if (act === 'sort') {
      state.sort[t.getAttribute('data-id')] = t.getAttribute('data-z');
    } else if (act === 'plan') {
      state.plan[t.getAttribute('data-q')] = t.getAttribute('data-v');
      if (Object.keys(state.plan).length === M.planner.length) { track('planner_completed', state.plan); }
    } else if (act === 'n1' || act === 'n2') {
      var s = Number(t.getAttribute('data-s'));
      var sc = M.scenarios[s];
      var node = act === 'n1' ? sc.n1 : sc.n2;
      var cur = state.scen[sc.id] || {};
      cur[act] = { pick: i, score: node.options[i].score };
      state.scen[sc.id] = cur;
      track('scenario_answered', { scenario: sc.id, node: act, score: node.options[i].score });
    } else if (act === 'quiz') {
      state.quiz[Number(t.getAttribute('data-q'))] = i;
      if (Object.keys(state.quiz).length === M.quiz.length) { track('quiz_submitted', { points: quizPoints() }); }
    } else if (act === 'retry') {
      M.scenarios.forEach(function (sc2) { delete state.scen[sc2.id]; });
      state.quiz = {};
      state.done = false;
      S.setStatus('incomplete');
      state.i = SCENES.indexOf('scen0');
      paint(true);
      save();
      track('module_retry', {});
      return;
    } else if (act === 'restart') {
      state = { i: 0, far: 0, warm: null, sort: {}, plan: {}, scen: {}, quiz: {}, done: false };
      S.setStatus('incomplete');
      paint(true);
      save();
      return;
    } else if (act === 'print') {
      track('jobaid_printed', {});
      window.print();
      return;
    }
    refresh();
  });

  nextBtn.addEventListener('click', function () { go(state.i + 1); });
  prevBtn.addEventListener('click', function () { go(state.i - 1); });

  window.addEventListener('beforeunload', function () { S.finish(!state.done); });

  /* ---------- start ---------- */

  S.init();
  loadAnalytics();
  setupSiteBar();
  restore();
  modeEl.textContent = S.isLMS() ? 'Reporting to your LMS' : 'Browser mode: progress saves on this device';
  paint(false);
  track('module_started', { mode: S.isLMS() ? 'lms' : 'web' });
}());
