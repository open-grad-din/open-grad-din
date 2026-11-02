// 計算機頁：每個候選場地一張卡，按你家人數即時計出三個分擔方案的總數。
// 公式在 fees-core.js，場地資料在 venues-params.js，收費數字在 fees-params.js。
// 只做計算和顯示，沒有讀取或寫入任何人的資料，亦不會記住你輸入的人數。
(function () {
  "use strict";
  var C = window.OGD_CALC;
  if (!C) return;
  var VP = C.VP, V = VP.venues, S = C.S, M = C.M, G = C.G, N = C.N, CAP = C.CAP, FAVG = C.FAVG;
  var money = C.money, esc = C.esc, mid = C.mid, totals = C.totals, round10 = C.round10, PLAN_NAMES = C.PLAN_NAMES;

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
  function menuHTML(m) {
    var over = C.worstPerHead(C.top(m)) > CAP;
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
        '<span class="pay-l">你家 <span class="who"></span><br>約付</span>' +
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
      v.menus.map(menuHTML).join("") +
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

  function renderText() {
    C.banner("demo-banner");
    document.getElementById("history").textContent = VP.history;
    document.getElementById("funnel-text").textContent =
      "籌委會委員先收集了" + VP.collected + "酒店和酒樓，再篩走" + VP.excludeReasons.join("、") + "的場地，剩下 " + V.length +
      " 間：" + count("hotel") + " 間酒店、" + count("rest") + " 間酒樓。篩走了哪些場地，見下面「已篩走的場地及原因」。";
    document.getElementById("excluded").innerHTML = VP.excluded.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
    document.getElementById("assume-line").textContent =
      "假設老師和職員 " + S + " 位、雜費約 " + money(M) + "、出席畢業生 " + G + " 位、出席總人數 " + N + " 位（包括畢業生）。";
    C.commitLink();
  }

  renderText();
  setupFamily();
  setupCards();
  renderFamily();
})();
