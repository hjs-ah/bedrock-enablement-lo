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
  var tocBtn = document.getElementById('tocBtn');
  var outline = document.getElementById('outline');
  var announce = document.getElementById('announce');
  var barWrap = document.getElementById('barWrap');
  var stepLabel = document.getElementById('stepLabel');
  var modeEl = document.getElementById('mode');
  var lmsBtn = document.getElementById('lmsBtn');
  var lmsPanel = document.getElementById('lmsPanel');
  var resetBtn = document.getElementById('resetBtn');
  var resetDialog = document.getElementById('resetDialog');
  var resetYes = document.getElementById('resetYes');
  var resetNo = document.getElementById('resetNo');
  var resetOpener = null;

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

  // Smallest number of points that reaches the pass mark, using the same rounding as percent().
  function passPoints() {
    var total = M.scenarioMax + M.quizMax;
    for (var n = 0; n <= total; n += 1) {
      if (Math.round((n / total) * 100) >= M.passMark) { return n; }
    }
    return total;
  }

  // Polite screen reader message for things that are not announced by moving focus.
  function say(text) {
    announce.textContent = '';
    window.setTimeout(function () { announce.textContent = text; }, 40);
  }

  function scoreTag(scored, text) {
    return '<p class="scoretag' + (scored ? ' scored' : '') + '">' + (scored ? 'Scored: ' + esc(text) : 'Practice: not scored') + '</p>';
  }

  var FIGURE = '' +
    '<figure class="hero-fig">' +
    '<svg viewBox="0 0 640 270" role="img" aria-labelledby="figT figD" focusable="false">' +
    '<title id="figT">A customer asks where to start; the seller asks about the customer\'s own work</title>' +
    '<desc id="figD">Two speech bubbles. The customer says: Where do we even start? The seller replies: Which process would change the most if it got faster or smarter? Below are the three adoption zones: back office, middle office, and customer-facing.</desc>' +
    '<rect class="fig-bg" x="1" y="1" width="638" height="268" rx="14"/>' +
    '<path class="fig-a" d="M42 26h262a14 14 0 0 1 14 14v46a14 14 0 0 1-14 14H78l-24 18v-18H42a14 14 0 0 1-14-14V40a14 14 0 0 1 14-14z"/>' +
    '<text class="fig-ta" x="48" y="70" font-size="18">Where do we even start?</text>' +
    '<path class="fig-b" d="M266 124h332a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14h-22v18l-24-18H266a14 14 0 0 1-14-14v-52a14 14 0 0 1 14-14z"/>' +
    '<text class="fig-tb" x="272" y="158" font-size="16">Which process would change the most</text>' +
    '<text class="fig-tb" x="272" y="184" font-size="16">if it got faster or smarter?</text>' +
    '<g class="fig-c"><rect x="24" y="226" width="190" height="32" rx="16"/><rect x="225" y="226" width="190" height="32" rx="16"/><rect x="426" y="226" width="190" height="32" rx="16"/></g>' +
    '<g class="fig-tc" font-size="14" text-anchor="middle"><text x="119" y="247">Back office</text><text x="320" y="247">Middle office</text><text x="521" y="247">Customer-facing</text></g>' +
    '</svg></figure>';

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

  function optionButton(attrs, text, cls, sr) {
    return '<button type="button" class="opt ' + (cls || '') + '" ' + attrs + '>' + (sr ? '<span class="sr">' + esc(sr) + ' </span>' : '') + esc(text) + '</button>';
  }

  function feedback(score, why) {
    var v = verdict(score);
    return '<div class="fb ' + v.cls + '" role="status"><strong>' + v.label + '.</strong> ' + esc(why) + '</div>';
  }

  function renderWelcome() {
    var total = M.scenarioMax + M.quizMax;
    var resume = state.far > 0
      ? '<p class="resume">You have progress saved. <button type="button" class="link" data-act="reset">Start over</button></p>'
      : '';
    var where = S.isLMS()
      ? 'Your score and pass or fail status go to your learning system when you finish.'
      : 'You are in browser mode: your progress saves on this device, and the site counts anonymous visits and clicks, never names.';
    return '' +
      '<h1>' + esc(M.title) + '</h1>' +
      '<p class="lede">A practice module for inside sales reps and sales leaders who need to talk about Amazon Bedrock with customers. About 25 minutes.</p>' +
      FIGURE +
      '<h2>By the end you can</h2>' +
      '<ul class="plain">' + M.objectives.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>' +
      '<section class="scorebox" aria-labelledby="sc-h"><h2 id="sc-h">How you are scored</h2><ul class="plain">' +
      '<li><strong>Three customer conversations: ' + M.scenarioMax + ' points.</strong> Each has two decisions. A strong answer earns 2 points, a partly right answer 1, and a weak answer 0.</li>' +
      '<li><strong>Knowledge check: ' + M.quizMax + ' points.</strong> Five questions, 1 point each.</li>' +
      '<li><strong>Everything else is practice.</strong> The warm-up, zone sorting, and planner are not scored.</li>' +
      '<li><strong>Pass mark: ' + M.passMark + '%, which is ' + passPoints() + ' of ' + total + ' points.</strong> If you finish under it, you can retry the conversations and the quiz. Feedback explains every answer, and there is no timer.</li>' +
      '</ul><p class="small">' + esc(where) + '</p></section>' +
      '<section class="scorebox" aria-labelledby="sm-h"><h2 id="sm-h">Where SCORM comes in</h2>' +
      '<p>This module is packaged as <strong>SCORM 1.2</strong>, the long-standing standard that lets a learning system (an LMS) track training. It reports four things: whether you finished, your score, where you stopped, and your saved answers. That is how a manager sees results and how you can leave and come back.</p>' +
      '<p class="small">' + esc(S.isLMS() ? 'An LMS is connected right now, so these go to it as you work.' : 'No LMS is connected here, so the module simulates one and saves to your browser.') + ' <button type="button" class="link" data-act="lms">See what the LMS receives</button></p></section>' +
      '<section class="scorebox" aria-labelledby="mv-h"><h2 id="mv-h">Moving around</h2>' +
      '<p>Use <strong>Continue</strong> and <strong>Back</strong>, or open <strong>Contents</strong> to jump to any step you have unlocked. Continue turns on when you finish the activities on a step. Everything works with a keyboard: Tab to move, Enter or Space to choose.</p></section>' +
      '<p class="callout">' + esc(M.disclaimer) + '</p>' + resume;
  }

  function renderWarmup() {
    var w = M.warmup;
    var chosen = state.warm;
    var html = '<h1>' + TITLES.warmup + '</h1>' + scoreTag(false) +
      '<p>' + esc(w.note) + '</p>' +
      '<blockquote class="customer">' + esc(w.customer) + '</blockquote>' +
      '<div class="opts">';
    w.options.forEach(function (o, idx) {
      var cls = chosen === null ? '' : (chosen === idx ? 'picked' : 'dim');
      html += optionButton('data-act="warm" data-i="' + idx + '"' + (chosen !== null ? ' disabled' : ''), o.text, cls, chosen === idx ? 'Your choice:' : '');
    });
    html += '</div>';
    if (chosen !== null) {
      html += feedback(w.options[chosen].score, w.options[chosen].why);
      html += '<p>Executives under pressure rarely need a product tour. They need a starting point. The rest of this module gives you three of them.</p>';
    }
    return html;
  }

  function renderZones() {
    var html = '<h1>' + TITLES.zones + '</h1>' + scoreTag(false) +
      '<p>When sellers asked where AI was actually being used, the answers fell into three zones. Name the zone and you know which question to ask next.</p>' +
      '<div class="tabs" role="tablist" aria-label="Adoption zones">';
    M.zones.forEach(function (z, idx) {
      var on = (state.tab || 0) === idx;
      html += '<button type="button" role="tab" id="tab-' + idx + '" aria-controls="zonepanel" tabindex="' + (on ? '0' : '-1') + '" class="tab ' + (on ? 'on' : '') + '" aria-selected="' + on + '" data-act="tab" data-i="' + idx + '">' + esc(z.name) + '</button>';
    });
    html += '</div>';
    var z = M.zones[state.tab || 0];
    html += '<div class="panel" id="zonepanel" role="tabpanel" aria-labelledby="tab-' + (state.tab || 0) + '">' +
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
        var srSort = a === z2.id ? (a === item.answer ? 'Your choice, correct:' : 'Your choice, not correct:') : '';
        html += optionButton('data-act="sort" data-id="' + item.id + '" data-z="' + z2.id + '"' + (a !== undefined ? ' disabled' : ''), z2.name, cls + ' small', srSort);
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
    var html = '<h1>' + TITLES.planner + '</h1>' + scoreTag(false) +
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
    var html = '<h1>' + esc(sc.title) + '</h1>' + scoreTag(true, 'up to 4 points') + '<p class="setup">' + esc(sc.setup) + '</p>';

    html += '<h2>' + esc(sc.n1.prompt) + '</h2><div class="opts">';
    sc.n1.options.forEach(function (o, k) {
      var cls = a.n1 ? (a.n1.pick === k ? 'picked' : 'dim') : '';
      html += optionButton('data-act="n1" data-s="' + idx + '" data-i="' + k + '"' + (a.n1 ? ' disabled' : ''), o.text, cls, a.n1 && a.n1.pick === k ? 'Your choice:' : '');
    });
    html += '</div>';

    if (a.n1) {
      html += feedback(a.n1.score, sc.n1.options[a.n1.pick].why);
      html += '<blockquote class="customer">' + esc(sc.n2.prompt) + '</blockquote><div class="opts">';
      sc.n2.options.forEach(function (o, k) {
        var cls = a.n2 ? (a.n2.pick === k ? 'picked' : 'dim') : '';
        html += optionButton('data-act="n2" data-s="' + idx + '" data-i="' + k + '"' + (a.n2 ? ' disabled' : ''), o.text, cls, a.n2 && a.n2.pick === k ? 'Your choice:' : '');
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
    var html = '<h1>' + TITLES.quiz + '</h1>' + scoreTag(true, '5 questions, 1 point each') + '<p>Choose one answer for each question.</p>';
    M.quiz.forEach(function (q, qi) {
      var a = state.quiz[qi];
      html += '<fieldset class="q"><legend>' + (qi + 1) + '. ' + esc(q.q) + '</legend><div class="opts">';
      q.opts.forEach(function (o, k) {
        var cls = '';
        if (a !== undefined) {
          if (o.correct) { cls = 'picked'; } else if (a === k) { cls = 'picked wrong'; } else { cls = 'dim'; }
        }
        var srQuiz = '';
        if (a !== undefined) {
          if (o.correct) { srQuiz = a === k ? 'Your choice, correct answer:' : 'Correct answer:'; } else if (a === k) { srQuiz = 'Your choice, incorrect:'; }
        }
        html += optionButton('data-act="quiz" data-q="' + qi + '" data-i="' + k + '"' + (a !== undefined ? ' disabled' : ''), o.text, cls, srQuiz);
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
      '</tbody></table>' +
      '<p class="small">' + esc(S.isLMS() ? 'Sent to your LMS: score ' + pct + ', status ' + (passed ? 'passed' : 'failed') + '.' : 'An LMS would receive: score ' + pct + ', status ' + (passed ? 'passed' : 'failed') + '.') +
      ' <button type="button" class="link" data-act="lms">See the LMS data</button></p>';
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

  /* ---------- LMS data panel and reset ---------- */

  var STATUS_WORDS = {
    'not attempted': 'not attempted',
    incomplete: 'incomplete',
    passed: 'passed',
    failed: 'failed',
    completed: 'completed'
  };

  function renderLms() {
    var snap = S.snapshot();
    var rows = [
      ['Status', 'cmi.core.lesson_status', STATUS_WORDS[snap.status] || snap.status || 'not set',
        'Finished or not, and pass or fail. This is what shows on the LMS roster and in completion reports.'],
      ['Score', 'cmi.core.score.raw', snap.score === '' ? 'not yet' : snap.score + ' of 100',
        'The percent you earned. It goes to the LMS gradebook. The pass mark is ' + M.passMark + '.'],
      ['Place', 'cmi.core.lesson_location', snap.location || 'none',
        'The step you were on, so you can leave and come back to the same spot.'],
      ['Saved answers', 'cmi.suspend_data', snap.suspendLength + ' of ' + snap.suspendMax + ' characters',
        'Your answers, packed small so a resume restores them. SCORM 1.2 allows only ' + snap.suspendMax + ' characters, so the module keeps this compact.'],
      ['Time spent', 'cmi.core.session_time', 'sent when you leave',
        'Reported once, when the session ends.']
    ];
    var html = '<div class="sheet-head"><h2 id="lmsH" tabindex="-1">What the LMS receives</h2>' +
      '<button type="button" class="btn ghost" data-close="lms">Close</button></div>' +
      '<p class="lms-mode' + (snap.live ? '' : ' sim') + '">' + (snap.live
        ? '<strong>Connected to your LMS.</strong> These are the values it has received.'
        : '<strong>No LMS here, so this is a simulation.</strong> In an LMS, the same calls go to its SCORM API and it stores the values below. Here they are saved in your browser.') + '</p>' +
      '<ul class="lms-list">' + rows.map(function (r) {
        return '<li><div class="lms-row"><strong>' + esc(r[0]) + '</strong><span class="lms-val">' + esc(r[2]) + '</span></div>' +
          '<code>' + esc(r[1]) + '</code><p class="lms-why">' + esc(r[3]) + '</p></li>';
      }).join('') + '</ul>' +
      '<h3>Recent calls</h3>' +
      '<ol class="lms-log" aria-label="Recent SCORM calls, newest first">' + (snap.calls.slice(-10).reverse().map(function (c) {
        return '<li><code>' + esc(c) + '</code></li>';
      }).join('') || '<li><code>none yet</code></li>') + '</ol>' +
      '<p class="lms-purpose"><strong>Why SCORM.</strong> On its own, a module is just a web page. SCORM is the agreed way for it to tell any LMS who finished, who passed and where they stopped, so training teams get results without custom integration and learners keep their place.</p>';
    lmsPanel.innerHTML = html;
  }

  function setLms(open, returnFocus) {
    if (open) {
      setToc(false);
      closeReset(false);
      renderLms();
      lmsPanel.hidden = false;
      var h = document.getElementById('lmsH');
      if (h) { h.focus({ preventScroll: true }); }
      track('lms_panel_opened', { mode: S.isLMS() ? 'lms' : 'web' });
    } else {
      lmsPanel.hidden = true;
      if (returnFocus) { lmsBtn.focus(); }
    }
    lmsBtn.setAttribute('aria-expanded', String(open));
  }

  function openReset(opener) {
    setToc(false);
    setLms(false, false);
    resetOpener = opener || resetBtn;
    document.getElementById('rsLms').hidden = !S.isLMS();
    resetDialog.hidden = false;
    resetNo.focus({ preventScroll: true });
  }

  function closeReset(returnFocus) {
    if (resetDialog.hidden) { return; }
    resetDialog.hidden = true;
    if (returnFocus && resetOpener && document.body.contains(resetOpener)) { resetOpener.focus({ preventScroll: true }); }
  }

  function resetAll() {
    state = { i: 0, far: 0, warm: null, sort: {}, plan: {}, scen: {}, quiz: {}, done: false };
    S.reset();
    resetDialog.hidden = true;
    paint(true);
    save();
    say('The module was reset. You are back at the welcome screen.');
    track('module_reset', { mode: S.isLMS() ? 'lms' : 'web' });
  }

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

  // A step is open when every step before it is finished. Same rule as the Continue button,
  // so the contents list can never skip an activity or reach the results early.
  function unlocked(idx) {
    for (var k = 0; k < idx; k += 1) {
      if (!complete(SCENES[k])) { return false; }
    }
    return true;
  }

  function sceneScoreInfo(id) {
    if (id.indexOf('scen') === 0) {
      var a = state.scen[M.scenarios[Number(id.slice(4))].id] || {};
      var got = (a.n1 ? a.n1.score : 0) + (a.n2 ? a.n2.score : 0);
      if (a.n1 && a.n2) { return got + ' of 4 points'; }
      return a.n1 ? got + ' points so far' : 'Scored, up to 4 points';
    }
    if (id === 'quiz') {
      return Object.keys(state.quiz).length ? quizPoints() + ' of ' + M.quizMax + ' points' : 'Scored, up to ' + M.quizMax + ' points';
    }
    if (id === 'warmup' || id === 'zones' || id === 'planner') { return 'Practice, not scored'; }
    return '';
  }

  function renderOutline() {
    var html = '<h2 class="toc-h">Contents</h2><ol class="toc">';
    SCENES.forEach(function (id, idx) {
      var cur = idx === state.i;
      var open = unlocked(idx);
      var done = !cur && idx <= state.far && complete(id) && id !== 'results';
      var status = cur ? 'current step' : (!open ? 'locked until earlier steps are finished' : (done ? 'completed' : 'available'));
      var info = sceneScoreInfo(id);
      html += '<li><button type="button" class="toc-item' + (cur ? ' cur' : '') + (done ? ' done' : '') + (open ? '' : ' locked') + '" data-go="' + idx + '"' +
        (cur ? ' aria-current="step"' : '') + (open ? '' : ' aria-disabled="true"') + '>' +
        '<span class="toc-n" aria-hidden="true">' + (done ? '\u2713' : (idx + 1)) + '</span>' +
        '<span class="toc-t">' + esc(TITLES[id]) + (info ? '<small>' + esc(info) + '</small>' : '') +
        '<span class="sr"> (' + status + ')</span></span></button></li>';
    });
    html += '</ol><p class="toc-total">Points so far: <strong>' + (scenarioPoints() + quizPoints()) + ' of ' + (M.scenarioMax + M.quizMax) + '</strong></p>';
    outline.innerHTML = html;
  }

  function setToc(open) {
    outline.setAttribute('data-open', String(open));
    tocBtn.setAttribute('aria-expanded', String(open));
  }

  function paint(focus) {
    var id = SCENES[state.i];
    stage.innerHTML = RENDER[id]();
    var pct = Math.round((state.i / (SCENES.length - 1)) * 100);
    var label = 'Step ' + (state.i + 1) + ' of ' + SCENES.length + ': ' + TITLES[id];
    barWrap.innerHTML = SCENES.map(function (_, k) {
      return '<i class="seg' + (k < state.i ? ' done' : (k === state.i ? ' cur' : '')) + '"></i>';
    }).join('');
    barWrap.setAttribute('aria-valuenow', String(pct));
    barWrap.setAttribute('aria-valuetext', label);
    stepLabel.textContent = label;
    document.title = label + ' | ' + M.title;
    renderOutline();
    prevBtn.disabled = state.i === 0;
    var last = state.i === SCENES.length - 1;
    nextBtn.hidden = last;
    nextBtn.disabled = !complete(id);
    if (focus) {
      // Move focus to the new step's heading so screen readers announce where they landed.
      var h = stage.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } else { stage.focus({ preventScroll: true }); }
      window.scrollTo(0, 0);
    }
  }

  function go(to) {
    if (to < 0 || to >= SCENES.length) { return; }
    setToc(false);
    setLms(false, false);
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

  /* ---------- focus after a choice ---------- */

  // The step is redrawn after every choice, which would drop keyboard focus.
  // Put it back on the same control, or on the feedback if the control is now locked.
  function selectorFor(el) {
    var sel = 'button';
    Array.prototype.forEach.call(el.attributes, function (a) {
      if (a.name.indexOf('data-') === 0) { sel += '[' + a.name + '="' + String(a.value).replace(/"/g, '\\"') + '"]'; }
    });
    return sel;
  }

  function afterAction(sel, act) {
    var el = stage.querySelector(sel);
    if (!el) { return; }
    if (!el.disabled) { el.focus({ preventScroll: true }); }
    else {
      var box = el.closest('.opts, .row');
      var fb = box && box.nextElementSibling;
      if (fb && fb.classList.contains('fb')) {
        fb.setAttribute('tabindex', '-1');
        fb.focus({ preventScroll: true });
      }
    }
    if (act === 'plan' && complete('planner')) { say('Your talk track is ready below the questions.'); }
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
    } else if (act === 'reset') {
      openReset(t);
      return;
    } else if (act === 'lms') {
      setLms(true);
      return;
    } else if (act === 'print') {
      track('jobaid_printed', {});
      window.print();
      return;
    }
    var sel = selectorFor(t);
    refresh();
    afterAction(sel, act);
  });

  // Zone tabs: arrow keys, Home and End, as users of tab widgets expect.
  stage.addEventListener('keydown', function (ev) {
    var t = ev.target.closest('[data-act="tab"]');
    if (!t) { return; }
    var n = M.zones.length;
    var i = Number(t.getAttribute('data-i'));
    var to = null;
    if (ev.key === 'ArrowRight') { to = (i + 1) % n; }
    else if (ev.key === 'ArrowLeft') { to = (i - 1 + n) % n; }
    else if (ev.key === 'Home') { to = 0; }
    else if (ev.key === 'End') { to = n - 1; }
    if (to === null) { return; }
    ev.preventDefault();
    state.tab = to;
    refresh();
    var el = stage.querySelector('button[data-act="tab"][data-i="' + to + '"]');
    if (el) { el.focus({ preventScroll: true }); }
  });

  lmsBtn.addEventListener('click', function () { setLms(lmsPanel.hidden); });
  lmsPanel.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-close="lms"]')) { setLms(false, true); }
  });
  resetBtn.addEventListener('click', function () { openReset(resetBtn); });
  resetNo.addEventListener('click', function () { closeReset(true); });
  resetYes.addEventListener('click', resetAll);
  S.onChange(function () { if (!lmsPanel.hidden) { renderLms(); } });

  nextBtn.addEventListener('click', function () { go(state.i + 1); });
  prevBtn.addEventListener('click', function () { go(state.i - 1); });

  // Contents: sidebar on wide screens, a sheet above the buttons on narrow ones.
  tocBtn.addEventListener('click', function () {
    var open = outline.getAttribute('data-open') !== 'true';
    if (open) { setLms(false, false); closeReset(false); }
    setToc(open);
  });
  outline.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-go]');
    if (!t) { return; }
    var to = Number(t.getAttribute('data-go'));
    if (!unlocked(to)) {
      say('That step opens after you finish the steps before it.');
      return;
    }
    if (to !== state.i) { track('contents_jump', { to: SCENES[to] }); go(to); } else { setToc(false); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') { return; }
    if (!resetDialog.hidden) { closeReset(true); }
    else if (!lmsPanel.hidden) { setLms(false, true); }
    else if (outline.getAttribute('data-open') === 'true') { setToc(false); tocBtn.focus(); }
  });

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
