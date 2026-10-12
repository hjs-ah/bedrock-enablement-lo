/*
 * Minimal SCORM 1.2 runtime wrapper.
 * - Finds the LMS API (window.API) in parent frames or the opener.
 * - If none is found, runs standalone and keeps progress in localStorage.
 * Exposes window.Scorm.
 */
(function (global) {
  'use strict';

  var api = null;
  var live = false;
  var started = 0;
  var STORE_KEY = 'bedrock-lo-v1';
  var KEYS = ['cmi.core.lesson_status', 'cmi.core.lesson_location', 'cmi.suspend_data', 'cmi.core.score.raw', 'cmi.core.score.min', 'cmi.core.score.max'];

  // Recent calls, newest last. The module's "LMS data" panel shows these so a reader can
  // see what an LMS would receive. In browser mode the same calls are simulated.
  var log = [];
  var listener = null;
  function note(call) {
    log.push(call);
    if (log.length > 40) { log.shift(); }
    if (listener) { try { listener(); } catch (e) { /* display only */ } }
  }
  function q(v) { return '"' + String(v) + '"'; }

  // Walks up the frame chain looking for the LMS API. A parent on another origin
  // (for example, this module embedded in a different site) throws on property access;
  // treat that as "no LMS above here" and stop.
  function findApi(win) {
    var hops = 0;
    try {
      while (win && !win.API && win.parent && win.parent !== win && hops < 10) {
        win = win.parent;
        hops += 1;
      }
      return win && win.API ? win.API : null;
    } catch (e) {
      return null;
    }
  }

  function locate() {
    var found = findApi(global);
    if (!found) {
      try { if (global.opener) { found = findApi(global.opener); } } catch (e) { found = null; }
    }
    return found;
  }

  function pad(n, w) {
    var s = String(n);
    while (s.length < w) { s = '0' + s; }
    return s;
  }

  // SCORM 1.2 time format: HHHH:MM:SS.SS
  function sessionTime(ms) {
    var total = Math.max(0, Math.round(ms / 10) / 100);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total - h * 3600 - m * 60;
    return pad(h, 4) + ':' + pad(m, 2) + ':' + pad(s.toFixed(2), 5);
  }

  function lsGet(key) {
    try { return global.localStorage.getItem(STORE_KEY + ':' + key); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { global.localStorage.setItem(STORE_KEY + ':' + key, val); } catch (e) { /* storage unavailable */ }
  }

  var Scorm = {
    init: function () {
      started = Date.now();
      api = locate();
      if (api) {
        live = String(api.LMSInitialize('')) === 'true';
      }
      note('LMSInitialize("")');
      var status = live ? String(api.LMSGetValue('cmi.core.lesson_status')) : (lsGet('cmi.core.lesson_status') || '');
      if (status === 'not attempted' || status === '') {
        this.set('cmi.core.lesson_status', 'incomplete');
      }
      this.commit();
      return live;
    },

    isLMS: function () { return live; },

    get: function (key) {
      if (live) { return String(api.LMSGetValue(key)); }
      return lsGet(key) || '';
    },

    set: function (key, val) {
      var shown = String(val);
      if (shown.length > 48) { shown = shown.slice(0, 45) + '...'; }
      note('LMSSetValue(' + q(key) + ', ' + q(shown) + ')');
      if (live) { return String(api.LMSSetValue(key, String(val))) === 'true'; }
      lsSet(key, String(val));
      return true;
    },

    commit: function () {
      note('LMSCommit("")');
      if (live) { return String(api.LMSCommit('')) === 'true'; }
      return true;
    },

    // What the LMS (or, in browser mode, this browser) currently holds for the four values that matter.
    snapshot: function () {
      var data = this.get('cmi.suspend_data');
      return {
        live: live,
        status: this.get('cmi.core.lesson_status'),
        score: this.get('cmi.core.score.raw'),
        location: this.get('cmi.core.lesson_location'),
        suspendLength: data.length,
        suspendMax: 4096,
        calls: log.slice()
      };
    },

    onChange: function (fn) { listener = fn; },

    // Clears the bookmark and saved answers and marks the attempt incomplete.
    // SCORM 1.2 has no "new attempt" call, so an LMS may still keep an earlier score or status:
    // that is the LMS's rule, not the module's.
    reset: function () {
      note('// reset: bookmark and saved answers cleared');
      if (live) {
        this.set('cmi.core.lesson_location', '');
        this.set('cmi.suspend_data', '');
        this.set('cmi.core.lesson_status', 'incomplete');
        this.commit();
        return;
      }
      KEYS.forEach(function (k) {
        try { global.localStorage.removeItem(STORE_KEY + ':' + k); } catch (e) { /* storage unavailable */ }
      });
      this.set('cmi.core.lesson_status', 'incomplete');
    },

    saveProgress: function (location, suspendData) {
      this.set('cmi.core.lesson_location', location);
      // SCORM 1.2 allows 4096 characters of suspend_data.
      this.set('cmi.suspend_data', String(suspendData).slice(0, 4096));
      this.commit();
    },

    loadProgress: function () {
      return { location: this.get('cmi.core.lesson_location'), data: this.get('cmi.suspend_data') };
    },

    setStatus: function (status) {
      this.set('cmi.core.lesson_status', status);
      this.commit();
    },

    setScore: function (raw) {
      this.set('cmi.core.score.min', 0);
      this.set('cmi.core.score.max', 100);
      this.set('cmi.core.score.raw', Math.max(0, Math.min(100, Math.round(raw))));
      this.commit();
    },

    finish: function (suspend) {
      if (!live) { return; }
      note('LMSFinish("")');
      api.LMSSetValue('cmi.core.session_time', sessionTime(Date.now() - started));
      api.LMSSetValue('cmi.core.exit', suspend ? 'suspend' : '');
      api.LMSCommit('');
      api.LMSFinish('');
      live = false;
    },

    _sessionTime: sessionTime
  };

  global.Scorm = Scorm;
}(typeof window !== 'undefined' ? window : this));
