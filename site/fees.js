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
  var PLAN_TEXT = [
    "老師餐和雜費全部按出席人數平分，大人小朋友同一個價錢。",
    "老師餐只由畢業生分擔，雜費按出席人數平分。",
    "老師餐和雜費都由畢業生分擔，陪同家人只付自己的餐費。接龍時公布的是這個方法。"
  ];
  // 2 大 1 小的圖解：每人身上有甚麼點點（t = 老師餐，m = 雜費）。最後一位是畢業生。
  var PLAN_DOTS = [
    [["t", "m"], ["t", "m"], ["t", "m"]],
    [["m"], ["m"], ["t", "m"]],
    [[], [], ["t", "m"]]
  ];
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

  // ---- 人形圖 ----
  function person(isGrad, dots) {
    var w = 48, h = 92;
    var s = svg("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, "aria-hidden": "true" });
    var tall = !isGrad;
    var headY = tall ? 14 : 30, headR = tall ? 9 : 8;
    var bodyTop = headY + headR + 2, bodyH = tall ? 34 : 24;
    s.appendChild(svg("circle", { cx: 24, cy: headY, r: headR, "class": "fig" }));
    s.appendChild(svg("rect", { x: tall ? 12 : 14, y: bodyTop, width: tall ? 24 : 20, height: bodyH, rx: 10, "class": "fig" }));
    if (isGrad) { // 畢業帽
      s.appendChild(svg("polygon", { points: "12,22 24,16 36,22 24,28", "class": "cap" }));
    }
    dots.forEach(function (d, i) {
      s.appendChild(svg("circle", { cx: dots.length === 2 ? 16 + i * 16 : 24, cy: 82, r: 6, "class": d === "t" ? "d-teach" : "d-misc" }));
    });
    return s;
  }

  function renderPlans() {
    var box = document.getElementById("plans");
    PLANS.forEach(function (_, i) {
      var card = el("div", undefined, "plan");
      card.appendChild(el("h3", PLAN_NAMES[i]));
      var fam = el("div", undefined, "family");
      PLAN_DOTS[i].forEach(function (dots, k) { fam.appendChild(person(k === 2, dots)); });
      card.appendChild(fam);
      card.appendChild(el("p", PLAN_TEXT[i]));
      box.appendChild(card);
    });
  }

  // ---- 每位的錢用在哪（以第一個場地、方案 ① 的平均計） ----
  function renderStack() {
    var F = P.venues[0].perHead;
    var parts = [["meal", F], ["teach", S * F / N], ["misc", M / N]];
    var total = parts.reduce(function (s, p) { return s + p[1]; }, 0);
    var box = document.getElementById("stack");
    parts.forEach(function (p) {
      var seg = el("span", money(p[1]), p[0]);
      seg.style.flexGrow = String(p[1] / total);
      box.appendChild(seg);
    });
    box.setAttribute("aria-label", "以" + P.venues[0].name + "計，每位約：餐費 " + money(F) +
      "，老師餐 " + money(S * F / N) + "，雜費 " + money(M / N));
    document.getElementById("teach-note").textContent = S + " 位老師的餐費，由家長分擔";
  }

  // ---- 計算機 ----
  var state = { adults: 2, kids: 1, venue: 0 };
  var LIMITS = { adults: [1, 6], kids: [1, 4] };

  function renderCalc() {
    document.getElementById("adults-out").textContent = String(state.adults);
    document.getElementById("kids-out").textContent = String(state.kids);
    Array.prototype.forEach.call(document.querySelectorAll(".stepper"), function (st) {
      var key = st.getAttribute("data-key"), btns = st.querySelectorAll("button");
      btns[0].disabled = state[key] <= LIMITS[key][0];
      btns[1].disabled = state[key] >= LIMITS[key][1];
    });
    Array.prototype.forEach.call(document.querySelectorAll("#venue-seg button"), function (b, i) {
      b.setAttribute("aria-checked", i === state.venue ? "true" : "false");
    });

    var n = state.adults + state.kids, F = P.venues[state.venue].perHead;
    var top = CAP * n;
    var bars = document.getElementById("bars");
    var amounts = PLANS.map(function (f) { return f(n, F, S, M, G, N); });
    if (!bars.children.length) {
      PLANS.forEach(function (_, i) {
        var row = el("div", undefined, "bar-row");
        row.appendChild(el("span", PLAN_NAMES[i], "bar-name"));
        var track = el("div", undefined, "track");
        track.appendChild(el("i", undefined, "fill-meal"));
        track.appendChild(el("i", undefined, "fill-share"));
        row.appendChild(track);
        var num = el("span", undefined, "bar-num");
        num.appendChild(el("b"));
        num.appendChild(el("small"));
        row.appendChild(num);
        bars.appendChild(row);
      });
    }
    amounts.forEach(function (x, i) {
      var row = bars.children[i];
      row.querySelector(".fill-meal").style.width = (n * F / top * 100) + "%";
      row.querySelector(".fill-share").style.width = ((x - n * F) / top * 100) + "%";
      row.querySelector("b").textContent = money(round10(x));
      row.querySelector("small").textContent = "每位 " + money(round10(x / n));
      row.classList.toggle("over", x / n > CAP);
    });
    var lo = Math.min.apply(null, amounts), hi = Math.max.apply(null, amounts);
    var anyOver = amounts.some(function (x) { return x / n > CAP; });
    var note = document.getElementById("calc-note");
    note.textContent = (anyOver
      ? "示範數字超出了上限，籌委會須減少雜費。"
      : (round10(hi - lo) < 10 ? "你家人數接近平均，三個方案金額差不多" : "三個方案最多相差約 " + money(round10(hi - lo))) +
        "，每位都不超過 " + money(CAP) + "。") +
      "灰色是自己的餐費，彩色是分擔的老師餐和雜費；整條是上限 " + money(CAP) + " × " + n + " 位。";
    note.classList.toggle("warn", anyOver);
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
    var seg = document.getElementById("venue-seg");
    P.venues.forEach(function (v, i) {
      var b = el("button", v.name, "");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.appendChild(el("small", "每位餐費 " + money(v.perHead)));
      b.addEventListener("click", function () { state.venue = i; renderCalc(); });
      seg.appendChild(b);
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
      money(CAP) + "：" + P.venues.map(function (v) { return v.name + " " + money(maxIncidentals(v.perHead)); }).join("；") +
      "。實際雜費如會超出，籌委會刪減雜費項目，不會向家長多收。截止後按實際人數重新計算這個上限並公布。";
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
    renderStack();
    renderPlans();
    setupCalc();
  }

  // 給測試用。
  window.OGD_FEES_TEST = { plans: PLANS, round10: round10, maxIncidentals: maxIncidentals };
})();
