// 場地及收費頁：按 fees-params.js（收費數字）及 venues-params.js（場地名單及報價），用公開的公式計算及畫圖。
// 這個檔案只做計算和顯示，沒有讀取或寫入任何人的資料，亦不會記住你揀的人數。
(function () {
  "use strict";

  var P = window.OGD_FEES;
  var VP = window.OGD_VENUES;
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
    "老師餐和雜費都由畢業生分擔，陪同家人只付自己的餐費。"
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
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  var S = P.staff.value, M = P.incidentals.value, G = P.graduates.value, N = P.attendees.value;
  var CAP = P.budgetPerHead.max;
  var V = VP.venues;

  // 每個菜式的「每位約」：有範圍取中位數。檢查上限時用範圍最高價（最壞情況）。
  function mid(m) { return m.Fmax ? Math.round((m.F + m.Fmax) / 2) : m.F; }
  function top(m) { return m.Fmax || m.F; }
  var MENUS = [];
  V.forEach(function (v) { v.menus.forEach(function (m) { MENUS.push(m); }); });
  // 名單平均每位餐費：只用於「每位的錢用在哪」的示意圖。
  var FAVG = MENUS.reduce(function (s, m) { return s + mid(m); }, 0) / MENUS.length;

  // 某每位餐費下，任何家庭人數、任何方案，每位最貴是多少。
  function worstPerHead(F) {
    var worst = 0;
    PLANS.forEach(function (f) {
      for (var n = SMALLEST_FAMILY; n <= 8; n++) worst = Math.max(worst, f(n, F, S, M, G, N) / n);
    });
    return worst;
  }

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
    if (isGrad) s.appendChild(svg("polygon", { points: "12,22 24,16 36,22 24,28", "class": "cap" }));
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

  // ---- 每位的錢用在哪（以名單平均餐費、方案 ① 的平均計） ----
  function renderStack() {
    var F = FAVG;
    var parts = [["meal", F], ["teach", S * F / N], ["misc", M / N]];
    var total = parts.reduce(function (s, p) { return s + p[1]; }, 0);
    var box = document.getElementById("stack");
    parts.forEach(function (p) {
      var seg = el("span", p[0] === "meal" ? "餐費（視乎場地）" : "約 " + money(p[1]), p[0]);
      seg.style.flexGrow = String(p[1] / total);
      box.appendChild(seg);
    });
    box.setAttribute("aria-label", "每位的錢大部分是自己的餐費；老師餐約 " + money(S * F / N) + "，雜費約 " + money(M / N));
    document.getElementById("teach-note").textContent = S + " 位老師和職員的餐費，由家長分擔";
  }

  // ---- 場地卡 ----
  var TABLES = "";
  for (var i = 0; i < 9; i++) {
    TABLES += '<circle cx="' + (40 + (i % 3) * 60) + '" cy="' + (48 + Math.floor(i / 3) * 36) + '" r="13"/>';
  }
  function placeholder(i, name) {
    var hue = [205, 42, 120][i % 3];
    return '<figure class="shot"><svg viewBox="0 0 200 150" role="img" aria-label="' + esc(name) + ' 示範圖片 ' + (i + 1) + '">' +
      '<rect width="200" height="150" fill="hsl(' + hue + ' 22% 84%)"/>' +
      '<rect width="200" height="22" fill="hsl(' + hue + ' 22% 70%)"/>' +
      '<g fill="hsl(' + hue + ' 30% 97%)">' + TABLES + '</g></svg>' +
      '<figcaption>示範圖片 ' + (i + 1) + '</figcaption></figure>';
  }
  function galleryHTML(v) {
    var items = (v.photos && v.photos.length)
      ? v.photos.map(function (p) {
          return '<figure class="shot"><img src="' + esc(p.src) + '" alt="' + esc(p.alt || v.name) + '" loading="lazy"></figure>';
        })
      : [0, 1, 2].map(function (i) { return placeholder(i, v.name); });
    return '<div class="gal-wrap"><div class="gallery" tabindex="0" aria-label="' + esc(v.name) + ' 場地相片，可左右掃">' + items.join("") + '</div>' +
      '<button class="gal-btn prev" aria-label="上一張" data-dir="-1">‹</button>' +
      '<button class="gal-btn next" aria-label="下一張" data-dir="1">›</button></div>';
  }
  function menuHTML(m, v) {
    var over = worstPerHead(top(m)) > CAP;
    var rows = PLAN_NAMES.map(function (name, k) {
      return '<div class="pr" data-k="' + k + '"><span class="pr-name">' + name + '</span>' +
        '<span class="pr-num"><b></b><small></small></span></div>';
    }).join("");
    return '<div class="menu" data-f="' + mid(m) + '">' +
      '<div class="menu-top"><span class="menu-name">' + esc(m.name) + '</span>' +
      '<span class="menu-price">每位餐費約 <b>' + money(mid(m)) + '</b></span></div>' +
      (m.Fmax ? '<p class="range-note">範圍 ' + money(m.F) + '–' + money(m.Fmax) + '，取中位數</p>' : "") +
      '<p class="quote">報價：' + esc(m.quote) + '</p>' +
      (over ? '<p class="over">按估算可能超出每位 ' + money(CAP) + ' 上限，請籌委會覆核。</p>' : "") +
      '<button type="button" class="pay" aria-expanded="false">' +
        '<span class="pay-l">你家 <span class="who"></span> 約付</span>' +
        '<span class="pay-r"><b class="pay-range"></b><small></small></span></button>' +
      '<div class="pr-box" hidden>' + rows +
        '<p class="pr-foot">總數包括你家自己的餐費。三個方案只差在老師餐和雜費怎樣分。</p></div>' +
      '</div>';
  }
  function cardHTML(v) {
    var where = [v.where, v.seats].filter(Boolean).map(esc).join("・");
    var link = v.url
      ? '<a class="link" href="' + esc(v.url) + '" target="_blank" rel="noopener">官方網站 ↗</a>'
      : '<span class="link none">官方連結待補</span>';
    return '<article class="card">' +
      '<div class="card-head"><div><h3>' + esc(v.name) + '</h3>' + (where ? '<p class="where">' + where + '</p>' : "") + '</div>' + link + '</div>' +
      galleryHTML(v) +
      (v.chips && v.chips.length ? '<div class="chips">' + v.chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join("") + '</div>' : "") +
      v.menus.map(function (m) { return menuHTML(m, v); }).join("") +
      '</article>';
  }

  // 為公平起見：每次打開頁面，場地次序隨機打亂一次，並隨機決定先顯示酒店還是酒樓。切換分頁時次序不變。
  // 不按價錢排列，亦沒有預先揀好的場地。
  function rand(n) {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = rand(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  var ORDER = shuffle(V.slice());
  function count(type) { return V.filter(function (v) { return v.type === type; }).length; }

  function show(type) {
    var list = ORDER.filter(function (v) { return v.type === type; });
    var box = document.getElementById("cards");
    box.classList.remove("anim");
    box.innerHTML = list.map(cardHTML).join("");
    void box.offsetWidth; // 重新觸發入場動畫
    box.classList.add("anim");
    document.getElementById("tab-hotel").setAttribute("aria-selected", type === "hotel");
    document.getElementById("tab-rest").setAttribute("aria-selected", type === "rest");
    updateCards();
  }

  // ---- 你家人數 → 每張卡即時計算 ----
  var state = { adults: 2, kids: 1 };
  var LIMITS = { adults: [1, 6], kids: [1, 4] };

  function totals(n, F) { return PLANS.map(function (f) { return round10(f(n, F, S, M, G, N)); }); }

  function updateCards() {
    var n = state.adults + state.kids;
    var who = state.adults + " 大 " + state.kids + " 小";
    Array.prototype.forEach.call(document.querySelectorAll("#cards .menu"), function (menu) {
      var t = totals(n, Number(menu.getAttribute("data-f")));
      var lo = Math.min.apply(null, t), hi = Math.max.apply(null, t);
      var same = hi - lo < 10;
      menu.querySelector(".who").textContent = who;
      menu.querySelector(".pay-range").textContent = same ? money(lo) : money(lo) + "–" + money(hi);
      menu.querySelector(".pay-r small").textContent = same ? "三個方案差不多 · 看詳情" : "視乎方案 · 看三個方案";
      Array.prototype.forEach.call(menu.querySelectorAll(".pr"), function (row) {
        var k = Number(row.getAttribute("data-k"));
        row.querySelector("b").textContent = money(t[k]);
        row.querySelector("small").textContent = "每位約 " + money(round10(t[k] / n)) +
          (same ? "" : (t[k] === lo ? " · 你家最省" : ""));
        row.classList.toggle("best", !same && t[k] === lo);
      });
    });
  }

  function renderFamily() {
    document.getElementById("adults-out").textContent = String(state.adults);
    document.getElementById("kids-out").textContent = String(state.kids);
    Array.prototype.forEach.call(document.querySelectorAll(".stepper"), function (st) {
      var key = st.getAttribute("data-key"), btns = st.querySelectorAll("button");
      btns[0].disabled = state[key] <= LIMITS[key][0];
      btns[1].disabled = state[key] >= LIMITS[key][1];
    });
    // 三個方案的差距只取決於人數，與場地關係很小，所以用名單平均餐費說明一次。
    var n = state.adults + state.kids;
    var t = totals(n, FAVG), gap = round10(Math.max.apply(null, t) - Math.min.apply(null, t));
    document.getElementById("calc-note").textContent = gap < 10
      ? "你家人數接近平均，三個方案差不多，可以按你覺得哪個最公平來投。"
      : "以你家人數計，三個方案最多相差約 " + money(gap) + "；哪個場地都差不多。場地之間的差別，主要是每位餐費。";
    updateCards();
  }

  function setupFamily() {
    Array.prototype.forEach.call(document.querySelectorAll(".stepper"), function (st) {
      var key = st.getAttribute("data-key");
      st.addEventListener("click", function (e) {
        var d = e.target && e.target.getAttribute && e.target.getAttribute("data-d");
        if (!d) return;
        state[key] = Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], state[key] + Number(d)));
        renderFamily();
      });
    });
  }

  function setupCards() {
    document.getElementById("n-hotel").textContent = count("hotel") + " 間";
    document.getElementById("n-rest").textContent = count("rest") + " 間";
    document.getElementById("tab-hotel").onclick = function () { show("hotel"); };
    document.getElementById("tab-rest").onclick = function () { show("rest"); };

    var cards = document.getElementById("cards");
    cards.addEventListener("click", function (e) {
      var pay = e.target.closest(".pay");
      if (pay) {
        var open = pay.getAttribute("aria-expanded") !== "true";
        pay.setAttribute("aria-expanded", String(open));
        pay.nextElementSibling.hidden = !open;
        return;
      }
      var b = e.target.closest(".gal-btn"); if (!b) return;
      var g = b.parentElement.querySelector(".gallery");
      g.scrollBy({ left: Number(b.dataset.dir) * g.querySelector(".shot").offsetWidth, behavior: "smooth" });
    });
    // 相片：電腦用左右箭咀或按住拖動；手機用手指掃。
    var drag = null;
    cards.addEventListener("pointerdown", function (e) {
      var g = e.target.closest(".gallery"); if (!g || e.pointerType !== "mouse") return;
      drag = { g: g, x: e.clientX, left: g.scrollLeft }; g.classList.add("dragging"); e.preventDefault();
    });
    window.addEventListener("pointermove", function (e) { if (drag) drag.g.scrollLeft = drag.left - (e.clientX - drag.x); });
    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var g = drag.g, w = g.querySelector(".shot").offsetWidth + 8;
      g.classList.remove("dragging"); g.scrollTo({ left: Math.round(g.scrollLeft / w) * w, behavior: "smooth" }); drag = null;
    });

    show(rand(2) ? "rest" : "hotel");
  }

  // ---- 文字 ----
  function ver(o) { return o.version + (o.frozenDate ? " · " + o.frozenDate + " 凍結" : " · 未凍結"); }
  function renderText() {
    var warn = [];
    if (P.isDemo) warn.push("示範版：收費的人數及規則細節是假設，未經籌委會通過。");
    if (VP.isDraft) warn.push("場地名單是草稿，未經籌委會通過；報價僅供參考，未經場地書面確認；相片是示範圖片。");
    if (warn.length) { var bn = document.getElementById("demo-banner"); bn.textContent = warn.join(""); bn.hidden = false; }
    document.getElementById("version").textContent = "收費：" + ver(P) + "　場地名單：" + ver(VP);
    document.getElementById("cap").textContent = money(CAP);
    document.getElementById("cap-range").textContent = money(P.budgetPerHead.min) + " 至 " + money(CAP);
    Array.prototype.forEach.call(document.querySelectorAll(".deposit"), function (s) { s.textContent = String(P.depositPerHead); });
    document.getElementById("win-line").textContent =
      (P.winRule || "勝出規則待籌委會決定，會在開放報名前公布。") + "所有家庭都按勝出的場地及方案付尾數，包括投了其他選項的家庭。";
    document.getElementById("tie-line").textContent = P.tieRule || "待籌委會決定，會在開放報名前公布。";

    document.getElementById("funnel-line").textContent =
      "籌委會委員收集了" + VP.collected + "，篩走" + VP.excludeReasons.join("、") + "的，剩下 " + V.length + " 間。" + VP.history;
    document.getElementById("collected").textContent = VP.collected;
    document.getElementById("history").textContent = VP.history;
    document.getElementById("cut-reasons").innerHTML = VP.excludeReasons.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
    document.getElementById("excluded").innerHTML = VP.excluded.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
    document.getElementById("n-total").textContent = V.length + " 間";
    document.getElementById("n-split").textContent = count("hotel") + " 間酒店 ＋ " + count("rest") + " 間酒樓";

    document.getElementById("assume-line").textContent =
      "假設老師和職員 " + S + " 位、雜費約 " + money(M) + "、出席畢業生 " + G + " 位、出席總人數 " + N + " 位（包括畢業生）。";
    document.getElementById("mcap-line").textContent =
      "雜費設有上限：即使人數最少的家庭（1 大 1 小），無論哪個場地、哪個方案勝出，每位都不會超過 " + money(CAP) +
      "。名單上每個場地都按範圍最高價檢查過。實際雜費如會超出，籌委會刪減雜費項目，不會向家長多收。截止後按實際人數計算這個上限並公布。";
    document.getElementById("what-line").textContent =
      "老師餐：" + S + " 位老師和職員。其他雜費：參考 2025 年實際雜費，約 " + money(M) + "。";

    var rows = [
      ["n", "你家出席人數（包括畢業生）"],
      ["F", "每位餐費：視乎場地，見各場地卡（已計入服務費）"],
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

  if (P && VP) {
    renderText();
    renderStack();
    renderPlans();
    setupFamily();
    setupCards();
    renderFamily();
  }

  // 給測試用。
  window.OGD_FEES_TEST = { plans: PLANS, round10: round10, maxIncidentals: maxIncidentals, worstPerHead: worstPerHead, menus: MENUS, top: top };
})();
