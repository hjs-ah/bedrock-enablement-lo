(function () {
  'use strict';

  // Vercel Web Analytics: window.va is defined in each page head. Events are
  // optional; if analytics is blocked or not enabled, nothing breaks.
  function track(name, data) {
    try { if (window.va) { window.va('event', { name: name, data: data || {} }); } } catch (e) { /* optional */ }
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-track]');
    if (t) { track(t.getAttribute('data-track'), { where: t.getAttribute('data-where') || '' }); }
  });

  // Report which sections get read, once each. Shows whether visitors reach the results.
  if ('IntersectionObserver' in window) {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var id = e.target.getAttribute('data-section');
        if (e.isIntersecting && !seen[id]) { seen[id] = true; track('section_seen', { section: id }); }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-section]').forEach(function (el) { io.observe(el); });
  }

  // Zone picker on the case page.
  var ZONES = {
    back: {
      who: 'Internal operations: IT, HR, finance operations, document handling.',
      q: 'Which repetitive internal process costs your team the most hours each week?'
    },
    middle: {
      who: 'Teams that review, decide, and control: risk, compliance, underwriting, procurement, analytics.',
      q: 'Where do your analysts or reviewers spend hours reading before they can make a decision?'
    },
    front: {
      who: 'Anything a customer sees or touches: support, sales assistance, product features. Highest visibility, so testing and guardrails come first.',
      q: 'Where would a faster or better answer change what your own customers experience?'
    }
  };
  var out = document.getElementById('zone-out');
  if (out) {
    var buttons = document.querySelectorAll('.zone');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var z = ZONES[b.getAttribute('data-zone')];
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        out.querySelector('.who').textContent = z.who;
        out.querySelector('.q').textContent = z.q;
        track('zone_viewed', { zone: b.getAttribute('data-zone') });
      });
    });
  }
}());
