// 收費詳細頁：按 fees-params.js 的數字，用公開的公式計算及畫圖。
// 這個檔案只做計算和顯示，沒有讀取或寫入任何人的資料。
(function () {
  "use strict";

  var P = window.OGD_FEES;
  var SVGNS = "http://www.w3.org/2000/svg";

  // 三個方案（n = 家庭出席人數，S×F = 老師餐總額，M = 雜費）：
  // ① 按人頭：      n×F + n×(S×F+M)/N
  // ② 雜費按人頭：  n×F + (S×F)/G + n×M/N
  // ③ 按家庭：      n×F + (S×F+M)/G
  var PLANS = [
    function (n, F, S, M, G, N) { return n * F + n * (S * F + M) / N; },
    function (n, F, S, M, G, N) { return n * F + (S * F) / G + n * M / N; },
    function (n, F, S, M, G, N) { return n * F + (S * F + M) / G; }
  ];
  var PLAN_NAMES = ["① 按人頭", "② 雜費按人頭", "③ 按家庭"];
  // 每個方案下，一家 n 人要分擔的 [老師餐, 雜費]。T = 老師餐總額。
  var SPLITS = [
    function (n, T, M, G, N) { return [n * T / N, n * M / N]; },
    function (n, T, M, G, N) { return [T / G, n * M / N]; },
    function (n, T, M, G, N) { return [T / G, M / G]; }
  ];
  var WHO = [
    ["全部出席者平分", "全部出席者平分"],
    ["只由畢業生分擔（每家一份）", "全部出席者平分"],
    ["只由畢業生分擔（每家一份）", "只由畢業生分擔（每家一份）"]
  ];
  var PLAN_NOTE = ["大人小朋友同一個價錢。", "", "陪同家人只付自己的餐費。接龍時公布的是這個方法。"];
  var SMALLEST_FAMILY = 2; // 最少 1 大 1 小

  function round10(x) { return Math.round(x / 10) * 10; }
  function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  var S = P.staff.value, M = P.incidentals.value, G = P.graduates.value, N = P.attendees.value;
  var CAP = P.budgetPerHead.max;
  // 平均每位餐費：只用來估算老師餐。家長自己的餐費三個方案都一樣，比較時不計。
  var FAVG = P.venues.reduce(function (s, v) { return s + v.perHead; }, 0) / P.venues.length;

  // 某場地下，雜費最多可以是多少，才令任何家庭、任何方案每位都不超過上限。
  // 每位價錢對 M 是直線，人數最少的家庭最貴，所以逐個方案、逐個家庭人數計一次，取最小。
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

  function renderPlans() {
    var box = document.getElementById("plans");
    PLANS.forEach(function (_, i) {
      var card = el("div", undefined, "plan");
      card.appendChild(el("h3", PLAN_NAMES[i]));
      var dl = el("dl");
      dl.appendChild(el("dt", "老師餐")); dl.appendChild(el("dd", WHO[i][0]));
      dl.appendChild(el("dt", "雜費")); dl.appendChild(el("dd", WHO[i][1]));
      card.appendChild(dl);
      if (PLAN_NOTE[i]) card.appendChild(el("p", PLAN_NOTE[i]));
      box.appendChild(card);
    });
  }

  // 每位的錢用在哪：以平均餐費及「全部出席者平分」估算。
  function renderSum() {
    var meal = round10(FAVG), t = round10(S * FAVG / N), m = round10(M / N);
    var rows = [
      ["自己的餐費", "三個方案都一樣，視乎場地", meal],
      ["老師餐", S + " 位老師的餐費，由家長分擔", t],
      ["雜費", "佈置、節目、影片、物資等", m]
    ];
    var tb = document.getElementById("sum");
    rows.forEach(function (r) {
      var tr = el("tr"), td = el("td");
      td.appendChild(el("b", r[0]));
      td.appendChild(el("small", r[1]));
      tr.appendChild(td);
      tr.appendChild(el("td", money(r[2]), "amt"));
      tb.appendChild(tr);
    });
    var tr = el("tr", undefined, "total");
    tr.appendChild(el("td", "合共每位約"));
    tr.appendChild(el("td", money(meal + t + m), "amt"));
    tb.appendChild(tr);
  }

  // ---- 計算機 ----
  var state = { adults: 2, kids: 1 };
  var LIMITS = { adults: [1, 6], kids: [1, 4] };

  function renderCalc() {
    document.getElementById("adults-out").textContent = String(state.adults);
    document.getElementById("kids-out").textContent = String(state.kids);
    Array.prototype.forEach.call(document.querySelectorAll(".stepper"), function (st) {
      var key = st.getAttribute("data-key"), btns = st.querySelectorAll("button");
      btns[0].disabled = state[key] <= LIMITS[key][0];
      btns[1].disabled = state[key] >= LIMITS[key][1];
    });

    var n = state.adults + state.kids, T = S * FAVG;
    // 只比較要分擔的老師餐和雜費。每項先四捨五入至十位，令加起來與顯示的總數一致。
    var parts = SPLITS.map(function (f) { return f(n, T, M, G, N).map(round10); });
    var shares = parts.map(function (p) { return p[0] + p[1]; });
    var top = Math.max.apply(null, shares), lo = Math.min.apply(null, shares);
    var bars = document.getElementById("bars");
    if (!bars.children.length) {
      PLANS.forEach(function (_, i) {
        var row = el("div", undefined, "bar-row");
        row.appendChild(el("span", PLAN_NAMES[i], "bar-name"));
        var num = el("span", undefined, "bar-num");
        num.appendChild(el("b"));
        num.appendChild(el("small", undefined, "tag"));
        row.appendChild(num);
        row.appendChild(el("span", undefined, "bar-calc"));
        var track = el("div", undefined, "track");
        track.appendChild(el("i", undefined, "fill-share"));
        row.appendChild(track);
        bars.appendChild(row);
      });
    }
    var same = top - lo < 10;
    shares.forEach(function (x, i) {
      var row = bars.children[i];
      row.querySelector(".fill-share").style.width = (x / top * 100) + "%";
      row.querySelector("b").textContent = money(x);
      row.querySelector(".tag").textContent = same ? "差不多" : (x === lo ? "你家最省" : "多 " + money(x - lo));
      row.querySelector(".bar-calc").textContent = "= 老師餐 " + money(parts[i][0]) + " ＋ 雜費 " + money(parts[i][1]);
      row.classList.toggle("best", !same && x === lo);
    });
    document.getElementById("calc-note").textContent = same
      ? "你家人數接近平均，三個方案差不多，可以按你覺得哪個最公平來投。"
      : "三個方案相差最多約 " + money(top - lo) + "。";
  }

  function setupCalc() {
    Array.prototype.forEach.call(document.querySelectorAll(".stepper"), function (st) {
      var key = st.getAttribute("data-key");
      st.addEventListener("click", function (e) {
        var d = e.target && e.target.getAttribute && e.target.getAttribute("data-d");
        if (!d) return;
        state[key] = Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], state[key] + Number(d)));
        renderCalc();
      });
    });
    renderCalc();
  }

  // ---- 文字 ----
  function renderText() {
    if (P.isDemo) document.getElementById("demo-banner").hidden = false;
    document.getElementById("version").textContent =
      P.version + (P.frozenDate ? " · " + P.frozenDate + " 凍結，之後如有修改會公開說明" : " · 未凍結");
    document.getElementById("cap").textContent = money(CAP);
    document.getElementById("cap-range").textContent = money(P.budgetPerHead.min) + " 至 " + money(CAP);
    Array.prototype.forEach.call(document.querySelectorAll(".deposit"), function (s) {
      s.textContent = String(P.depositPerHead);
    });
    document.getElementById("win-line").textContent =
      (P.winRule || "勝出規則待籌委會決定，會在開放報名前公布。") + "所有家庭都按勝出方案付尾數，包括投了其他方案的家庭。";
    document.getElementById("tie-line").textContent = P.tieRule || "待籌委會決定，會在開放報名前公布。";

    document.getElementById("mcap-line").textContent =
      "雜費設有上限。只要雜費不超過以下金額，即使人數最少的家庭（1 大 1 小），無論哪個方案勝出，每位都不會超過 " +
      money(CAP) + "：" + money(Math.min.apply(null, P.venues.map(function (v) { return maxIncidentals(v.perHead); }))) +
      "（以最貴的場地計）。實際雜費如會超出，籌委會刪減雜費項目，不會向家長多收。截止後按實際人數重新計算這個上限並公布。";
    document.getElementById("what-line").textContent =
      "老師餐：" + S + " 位老師（" + P.staff.source + "）。其他雜費：預計約 " + money(M) + "（" + P.incidentals.source + "）。";

    var rows = [
      ["n", "你家出席人數（包括畢業生）"],
      ["F", "每位餐費：" + P.venues.map(function (v) { return v.name + " " + money(v.perHead); }).join("；")],
      ["S", "老師人數：" + S],
      ["M", "雜費：預計 " + money(M)],
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

    var commit = window.OGD_COMMIT || "";
    var link = document.getElementById("commit-link");
    if (/^[0-9a-f]{40}$/.test(commit)) {
      link.href = "https://github.com/open-grad-din/open-grad-din/commit/" + commit;
      link.textContent = commit.slice(0, 7);
    } else {
      link.removeAttribute("href");
      link.textContent = "本地測試版（未經正式部署）";
    }
  }

  if (P) {
    renderText();
    renderSum();
    renderPlans();
    setupCalc();
  }

  // 給測試用。
  window.OGD_FEES_TEST = { plans: PLANS, round10: round10, maxIncidentals: maxIncidentals };
})();
