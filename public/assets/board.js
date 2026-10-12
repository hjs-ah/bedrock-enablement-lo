(function () {
  'use strict';

  var board = document.getElementById('board');
  if (!board) { return; }

  // One scene column is about 20rem wide; scroll by roughly one column at a time.
  function step() {
    var th = board.querySelector('thead th[scope="col"]');
    return th ? th.getBoundingClientRect().width : 320;
  }
  function by(dir) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    board.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
  }

  var prev = document.getElementById('boardPrev');
  var next = document.getElementById('boardNext');
  if (prev) { prev.addEventListener('click', function () { by(-1); }); }
  if (next) { next.addEventListener('click', function () { by(1); }); }

  var copy = document.getElementById('copyLink');
  var note = document.getElementById('copyNote');
  if (copy) {
    copy.addEventListener('click', function () {
      var url = location.origin + location.pathname;
      function done(msg) {
        if (note) { note.textContent = ''; window.setTimeout(function () { note.textContent = msg; }, 40); }
        var old = copy.textContent;
        copy.textContent = msg === 'Link copied.' ? 'Copied' : old;
        window.setTimeout(function () { copy.textContent = 'Copy link'; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done('Link copied.'); }, function () { done('Copy is blocked here. The address in the bar is the link.'); });
      } else {
        done('Copy is blocked here. The address in the bar is the link.');
      }
    });
  }
}());
