// 共用的界面效果：捲動時淡入、數字由 0 數上去。只影響顯示，不讀取或寫入任何資料。
(function () {
  "use strict";
  var root = document.documentElement;
  if (root.className.indexOf("js") === -1) root.className += " js";
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 某元素進入畫面時執行一次 fn。舊瀏覽器或減少動態效果時立即執行。
  function whenSeen(node, fn) {
    if (still || !("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, { threshold: 0.25 });
    io.observe(node);
  }

  function reveal(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(".reveal"), function (n) {
      whenSeen(n, function () { n.classList.add("in"); });
    });
  }

  // 數字由 0 數到 to。done 在完成後執行。
  function countUp(node, to, ms, done) {
    if (still || to <= 0) { node.textContent = String(to); if (done) done(); return; }
    var t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      node.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  window.OGD_UI = { whenSeen: whenSeen, reveal: reveal, countUp: countUp, still: still };
  if (document.readyState !== "loading") reveal();
  else document.addEventListener("DOMContentLoaded", function () { reveal(); });
})();
