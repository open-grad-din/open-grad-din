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

  // 左上角選單（2026-11-18 Ken）：投票完成後較少用的「費用」「計算機」收在這裏，底部只留 首頁／交訂金／報名。（Ken：放左上角）
  var MENU = [
    { href: "fees.html", label: "費用", note: "每位上限、錢用在哪、三個分擔方案" },
    { href: "venues.html", label: "計算機", note: "我家要付多少？" }
  ];
  function menu() {
    var page = location.pathname.split("/").pop();
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-btn";
    btn.setAttribute("aria-label", "更多頁面");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "menu-panel");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    var panel = document.createElement("nav");
    panel.id = "menu-panel";
    panel.className = "menu-panel";
    panel.setAttribute("aria-label", "更多頁面");
    panel.hidden = true;
    MENU.forEach(function (m) {
      var a = document.createElement("a");
      a.href = m.href;
      if (page === m.href) a.setAttribute("aria-current", "page");
      var b = document.createElement("b"); b.textContent = m.label;
      var s = document.createElement("small"); s.textContent = m.note;
      a.appendChild(b); a.appendChild(s);
      panel.appendChild(a);
    });
    function set(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); set(panel.hidden); });
    document.addEventListener("click", function (e) { if (!panel.hidden && !panel.contains(e.target)) set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { set(false); btn.focus(); } });
    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  window.OGD_UI = { whenSeen: whenSeen, reveal: reveal, countUp: countUp, still: still };
  function ready() { reveal(); menu(); }
  if (document.readyState !== "loading") ready();
  else document.addEventListener("DOMContentLoaded", ready);
})();
