// 收費頁：上限、錢用在哪、三個方案圖解、怎樣選出及細節。公式在 fees-core.js，數字在 fees-params.js。
// 這個檔案只做計算和顯示，沒有讀取或寫入任何人的資料。
(function () {
  "use strict";
  var C = window.OGD_CALC;
  if (!C) return;
  var P = C.P, S = C.S, M = C.M, G = C.G, N = C.N, CAP = C.CAP, FAVG = C.FAVG;
  var money = C.money, el = C.el, PLANS = C.PLANS, PLAN_NAMES = C.PLAN_NAMES;
  var SVGNS = "http://www.w3.org/2000/svg";
  var PLAN_TEXT = [
    "老師餐和雜費全部按出席人數平分，大人小朋友同一個價錢。",
    "老師餐只由畢業生分擔，雜費按出席人數平分。",
    "老師餐和雜費都由畢業生分擔，陪同家人只付自己的餐費。"
  ];
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function renderPlans() {
    var box = document.getElementById("plans");
    PLANS.forEach(function (_, i) {
      var card = el("div", undefined, "plan");
      card.appendChild(el("h3", PLAN_NAMES[i]));
      card.appendChild(C.family(i, 2, 1)); // 以一家 2 大 1 小為例
      card.appendChild(el("p", PLAN_TEXT[i]));
      box.appendChild(card);
    });
  }

  // ---- 每位的錢用在哪（以名單平均餐費、方案 ① 的平均計） ----
  // 一隻碟：三段圓環按比例畫出（以名單平均餐費、方案 ① 的平均計），只寫類別，不寫金額。
  function renderStack() {
    var F = FAVG;
    var parts = [["meal", F], ["teach", S * F / N], ["misc", M / N]];
    var total = parts.reduce(function (s, p) { return s + p[1]; }, 0);
    var box = document.getElementById("stack");
    var R = 54, C = 2 * Math.PI * R, GAP = 4, at = 0;
    var s = svg("svg", { viewBox: "0 0 160 160", width: 160, height: 160, "aria-hidden": "true" });
    s.appendChild(svg("circle", { cx: 80, cy: 80, r: 74, "class": "plate-rim" }));
    s.appendChild(svg("circle", { cx: 80, cy: 80, r: 66, "class": "plate-in" }));
    parts.forEach(function (p, i) {
      var len = p[1] / total * C;
      var arc = svg("circle", { cx: 80, cy: 80, r: R, "class": "arc " + p[0],
        "stroke-dasharray": Math.max(1, len - GAP) + " " + C, "stroke-dashoffset": String(-at), transform: "rotate(-90 80 80)" });
      arc.style.setProperty("--len", Math.max(1, len - GAP));
      arc.style.setProperty("--i", i);
      s.appendChild(arc);
      at += len;
    });
    // 碟中間寫「每位總數」，表示整個圓 = 每位付的總數（Ken 2026-11-03）
    [["每位", 76], ["總數", 96]].forEach(function (w) {
      var t = svg("text", { x: 80, y: w[1], "text-anchor": "middle", "class": "plate-t" });
      t.textContent = w[0];
      s.appendChild(t);
    });
    box.appendChild(s);
    box.setAttribute("aria-label", "每位付的總數：大部分是自己的餐費，其餘是老師餐及雜費");
    document.getElementById("teach-note").textContent = S + " 位老師和職員的餐費";
  }

  function renderText() {
    C.banner("demo-banner");
    document.getElementById("cap").textContent = money(CAP);
    document.getElementById("cap-range").textContent = money(CAP);
    Array.prototype.forEach.call(document.querySelectorAll(".deposit"), function (s) { s.textContent = String(P.depositPerHead); });
    document.getElementById("win-line").textContent =
      (P.winRule || "勝出規則待籌委會決定，會在開放報名前公布。") + "所有家庭都按勝出的場地及方案付尾數，包括投了其他選項的家庭。";
    document.getElementById("tie-line").textContent = P.tieRule || "待籌委會決定，會在開放報名前公布。";
    document.getElementById("mcap-line").textContent =
      "雜費設有上限：即使人數最少的家庭（1 大 1 小），無論哪個場地、哪個方案勝出，每位都不會超過 " + money(CAP) +
      "。名單上每個場地都按報價範圍的最高價檢查過。實際雜費如會超出，籌委會刪減雜費項目，不會向家長多收。截止後按實際人數計算這個上限並公布。";
    document.getElementById("what-line").textContent =
      "老師餐：" + S + " 位老師和職員。其他雜費：參考" + P.incidentals.source + "，約 " + money(M) + "。";
    var rows = [
      ["n", "你家出席人數（包括畢業生）"],
      ["F", "每位餐費：視乎場地，見計算機的場地列表（已計入服務費）"],
      ["S", "老師和職員人數：" + S + "（" + P.staff.source + "）"],
      ["M", "雜費：預計 " + money(M) + "（" + P.incidentals.source + "）"],
      ["G", "出席畢業生：預計 " + G],
      ["N", "出席總人數：預計 " + N]
    ];
    var vars = document.getElementById("vars");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", r[0], "sym"));
      tr.appendChild(el("td", r[1]));
      vars.appendChild(tr);
    });
    C.commitLink();
  }

  renderText();
  renderStack();
  renderPlans();
})();
