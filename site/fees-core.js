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


  // ---- 人形圖（收費頁及計算機頁共用）：每人身上的點點表示由誰分擔（t = 老師餐，m = 雜費）。 ----
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function person(isGrad, dots) {
    var w = 48, h = 92;
    var sv = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, "aria-hidden": "true" });
    var tall = !isGrad;
    // 大人和畢業生的身體底部都在 y = 59，站在同一條線上。
    var headY = tall ? 14 : 25, headR = tall ? 9 : 8;
    var bodyTop = headY + headR + 2, bodyH = tall ? 34 : 24;
    sv.appendChild(svgEl("circle", { cx: 24, cy: headY, r: headR, "class": "fig" }));
    sv.appendChild(svgEl("rect", { x: tall ? 12 : 14, y: bodyTop, width: tall ? 24 : 20, height: bodyH, rx: 10, "class": "fig" }));
    if (isGrad) sv.appendChild(svgEl("polygon", { points: "12,17 24,11 36,17 24,23", "class": "cap" }));
    dots.forEach(function (d, i) {
      sv.appendChild(svgEl("circle", { cx: dots.length === 2 ? 16 + i * 16 : 24, cy: 82, r: 6, "class": d === "t" ? "d-teach" : "d-misc" }));
    });
    return sv;
  }
  // 某方案下，一家 adults 大 kids 小（最後一位小朋友是畢業生）每人身上有甚麼點點。
  function familyDots(plan, adults, kids) {
    var out = [];
    for (var i = 0; i < adults + kids; i++) {
      var grad = i === adults + kids - 1;
      out.push(plan === 0 ? ["t", "m"] : plan === 1 ? (grad ? ["t", "m"] : ["m"]) : (grad ? ["t", "m"] : []));
    }
    return out;
  }
  // 一家人的圖（adults 大 kids 小，按某方案標點點）。
  function family(plan, adults, kids) {
    var box = document.createElement("div");
    box.className = "family";
    familyDots(plan, adults, kids).forEach(function (dots, i) { box.appendChild(person(i >= adults, dots)); });
    return box;
  }

  function ver(o) { return o.version + (o.frozenDate ? " · " + o.frozenDate + " 凍結" : " · 未凍結"); }
  function banner(id) {
    // 未經籌委會通過時一定顯示一句提示；數字及名單通過後（isDemo、isDraft 改為 false）自動消失。
    var bn = document.getElementById(id);
    if (bn && (P.isDemo || VP.isDraft)) { bn.textContent = "示範資料，未經籌委會通過。"; bn.hidden = false; }
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
    worstPerHead: worstPerHead, maxIncidentals: maxIncidentals, banner: banner, commitLink: commitLink,
    person: person, familyDots: familyDots, family: family
  };
})();
