// 收費頁及計算機頁共用的公式及小工具。數字來自 fees-params.js（收費）及 venues-params.js（場地報價）。
// 只做計算，沒有讀取或寫入任何人的資料，亦不會記住你輸入的人數。
(function () {
  "use strict";
  var P = window.OGD_FEES, VP = window.OGD_VENUES;
  if (!P || !VP) return;

  // 三個方案（n = 家庭出席人數，F = 每位餐費，S×F = 老師餐總額，M = 雜費，G = 出席畢業生，N = 出席總人數）：
  // ① 按人頭：      n×F + n×(S×F+M)/N
  // ② 雜費按人頭：  n×F + (S×F)/G + n×M/N
  // ③ 按家庭：      n×F + (S×F+M)/G
  var PLANS = [
    function (n, F, S, M, G, N) { return n * F + n * (S * F + M) / N; },
    function (n, F, S, M, G, N) { return n * F + (S * F) / G + n * M / N; },
    function (n, F, S, M, G, N) { return n * F + (S * F + M) / G; }
  ];
  var S = P.staff.value, M = P.incidentals.value, G = P.graduates.value, N = P.attendees.value;
  var CAP = P.budgetPerHead.max;
  var SMALLEST_FAMILY = 2; // 最少 1 大 1 小

  function round10(x) { return Math.round(x / 10) * 10; }
  function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  // 每個菜式的「每位約」：有範圍取中位數。檢查上限時用範圍最高價（最壞情況）。
  function mid(m) { return m.Fmax ? Math.round((m.F + m.Fmax) / 2) : m.F; }
  function top(m) { return m.Fmax || m.F; }
  var MENUS = [];
  VP.venues.forEach(function (v) { v.menus.forEach(function (m) { MENUS.push(m); }); });
  var FAVG = MENUS.reduce(function (s, m) { return s + mid(m); }, 0) / MENUS.length;

  function totals(n, F) { return PLANS.map(function (f) { return round10(f(n, F, S, M, G, N)); }); }

  // 某每位餐費下，任何家庭人數、任何方案，每位最貴是多少。
  function worstPerHead(F) {
    var worst = 0;
    PLANS.forEach(function (f) {
      for (var n = SMALLEST_FAMILY; n <= 8; n++) worst = Math.max(worst, f(n, F, S, M, G, N) / n);
    });
    return worst;
  }
  // 某每位餐費下，雜費最多可以是多少，才令任何家庭、任何方案每位都不超過上限。
  function maxIncidentals(F) {
    var best = Infinity;
    PLANS.forEach(function (f) {
      for (var n = SMALLEST_FAMILY; n <= 8; n++) {
        var a = f(n, F, S, 0, G, N) / n, b = (f(n, F, S, 1, G, N) - f(n, F, S, 0, G, N)) / n;
        best = Math.min(best, (CAP - a) / b);
      }
    });
    return Math.max(0, Math.floor(best / 100) * 100);
  }

  function ver(o) { return o.version + (o.frozenDate ? " · " + o.frozenDate + " 凍結" : " · 未凍結"); }
  function banner(id) {
    var warn = [];
    if (P.isDemo) warn.push("示範版：收費的人數及規則細節是假設，未經籌委會通過。");
    if (VP.isDraft) warn.push("場地名單是草稿，未經籌委會通過；報價僅供參考，未經場地書面確認；相片是示範圖片。");
    var bn = document.getElementById(id);
    if (bn && warn.length) { bn.textContent = warn.join(""); bn.hidden = false; }
    var v = document.getElementById("version");
    if (v) v.textContent = "收費：" + ver(P) + "　場地名單：" + ver(VP);
  }
  function commitLink() {
    var commit = window.OGD_COMMIT || "";
    var link = document.getElementById("commit-link");
    if (!link) return;
    if (/^[0-9a-f]{40}$/.test(commit)) {
      link.href = "https://github.com/open-grad-din/open-grad-din/commit/" + commit;
      link.textContent = commit.slice(0, 7);
    } else {
      link.removeAttribute("href");
      link.textContent = "本地測試版（未經正式部署）";
    }
  }

  window.OGD_CALC = {
    P: P, VP: VP, PLANS: PLANS, PLAN_NAMES: ["① 按人頭", "② 雜費按人頭", "③ 按家庭"],
    S: S, M: M, G: G, N: N, CAP: CAP, MENUS: MENUS, FAVG: FAVG,
    round10: round10, money: money, esc: esc, el: el, mid: mid, top: top, totals: totals,
    worstPerHead: worstPerHead, maxIncidentals: maxIncidentals, banner: banner, commitLink: commitLink
  };
})();
