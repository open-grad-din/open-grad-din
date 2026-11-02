// 計算機頁。兩層：先按你家人數顯示三個方案的分別（和場地幾乎無關），再一行一間列出候選場地你家要付的總數。
// 公式在 fees-core.js，場地資料在 venues-params.js，收費數字在 fees-params.js。
// 只做計算和顯示，沒有讀取或寫入任何人的資料，亦不會記住你輸入的人數。
(function () {
  "use strict";
  var C = window.OGD_CALC;
  if (!C) return;
  var VP = C.VP, V = VP.venues, S = C.S, M = C.M, G = C.G, N = C.N, CAP = C.CAP, FAVG = C.FAVG, PLANS = C.PLANS;
  var money = C.money, esc = C.esc, mid = C.mid, totals = C.totals, round10 = C.round10, PLAN_NAMES = C.PLAN_NAMES;
  var TYPE = { hotel: "酒店", rest: "酒樓" };

  // ---- 場地詳情（相片、賣點、報價、連結），按場地名才展開 ----
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
  function quoteHTML(m) {
    var over = C.worstPerHead(C.top(m)) > CAP;
    return '<li><b>' + esc(m.name) + '</b>：' + esc(m.quote) +
      (m.Fmax ? '（範圍 ' + money(m.F) + '–' + money(m.Fmax) + '，取中位數 ' + money(mid(m)) + '）' : "") +
      (over ? '<span class="over">按估算可能超出每位 ' + money(CAP) + ' 上限，請籌委會覆核。</span>' : "") + '</li>';
  }
  function moreHTML(v) {
    var link = v.url
      ? '<a class="link" href="' + esc(v.url) + '" target="_blank" rel="noopener">官方網站 ↗</a>'
      : '<span class="link none">官方連結待補</span>';
    return '<div class="row-more" hidden>' +
      galleryHTML(v) +
      (v.chips && v.chips.length ? '<div class="chips">' + v.chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join("") + '</div>' : "") +
      '<ul class="quotes">' + v.menus.map(quoteHTML).join("") + '</ul>' +
      '<div class="row-foot"><span class="where">' + esc(v.where || "") + '</span>' + link + '</div>' +
      '</div>';
  }

  // ---- 一行一間 ----
  function menuRowHTML(m, single) {
    return '<div class="mrow" data-f="' + mid(m) + '">' +
      '<span class="ml">' + (single ? "" : '<span class="mn">' + esc(m.name) + '</span>') +
      '<span class="mf">每位約 <b>' + money(mid(m)) + '</b>' + (m.Fmax ? '<small>範圍</small>' : "") + '</span></span>' +
      '<span class="mr"></span></div>';
  }
  function rowHTML(v) {
    var single = v.menus.length === 1;
    return '<article class="row">' +
      '<button type="button" class="row-head" aria-expanded="false">' +
        '<span class="tag ' + v.type + '">' + TYPE[v.type] + '</span>' +
        '<span class="name">' + esc(v.name) + '</span>' +
        '<span class="chev" aria-hidden="true">▾</span></button>' +
      v.menus.map(function (m) { return menuRowHTML(m, single); }).join("") +
      moreHTML(v) +
      '</article>';
  }

  // 為公平起見：每次打開頁面，場地次序隨機打亂一次。不按價錢排列，亦沒有預先揀好的場地。
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

  // ---- 狀態：你家人數、有沒有揀定一個方案來看 ----
  var state = { adults: 2, kids: 1, plan: null };
  var LIMITS = { adults: [1, 6], kids: [1, 4] };

  function renderTiles() {
    var box = document.getElementById("tiles");
    box.innerHTML = PLAN_NAMES.map(function (name, k) {
      return '<button type="button" class="tile" data-k="' + k + '" aria-pressed="false">' +
        '<small>' + name + '</small><b></b><i></i></button>';
    }).join("");
  }

  function update() {
    var n = state.adults + state.kids;
    var who = state.adults + " 大 " + state.kids + " 小";

    // 第一層：你家分擔老師餐和雜費的金額（以名單平均餐費計；場地之間只差幾十元）。
    var shares = PLANS.map(function (f) { return round10(f(n, FAVG, S, M, G, N) - n * FAVG); });
    var lo = Math.min.apply(null, shares), hi = Math.max.apply(null, shares), same = hi - lo < 10;
    Array.prototype.forEach.call(document.querySelectorAll(".tile"), function (t) {
      var k = Number(t.getAttribute("data-k"));
      t.querySelector("b").textContent = money(shares[k]);
      t.querySelector("i").textContent = (!same && shares[k] === lo) ? "最省" : "";
      t.classList.toggle("best", !same && shares[k] === lo);
      t.setAttribute("aria-pressed", String(state.plan === k));
    });
    var avg = Math.round(N / G * 10) / 10;
    document.getElementById("calc-note").textContent = same
      ? "你家 " + who + "，人數接近平均（每家約 " + avg + " 人），三個方案差不多，可以按你覺得哪個最公平來投。按一個方案，下面列表只顯示該方案的總數。"
      : "你家 " + who + "，三個方案最多相差約 " + money(hi - lo) + "，哪個場地都差不多。按一個方案，下面列表只顯示該方案的總數。";

    // 第二層：每間場地你家要付的總數（包括自己的餐費）。
    document.getElementById("col-total").textContent =
      state.plan === null ? "你家總數（三方案）" : "你家總數（" + PLAN_NAMES[state.plan].slice(0, 1) + "）";
    Array.prototype.forEach.call(document.querySelectorAll("#list .mrow"), function (row) {
      var t = totals(n, Number(row.getAttribute("data-f")));
      var a = Math.min.apply(null, t), b = Math.max.apply(null, t);
      var sameRow = b - a < 10, mr = row.querySelector(".mr");
      if (state.plan !== null) {
        mr.innerHTML = '<b class="mt">' + money(t[state.plan]) + '</b><small class="ms">' + PLAN_NAMES[state.plan] + '</small>';
      } else if (sameRow) {
        mr.innerHTML = '<b class="mt">' + money(a) + '</b><small class="ms">三個方案一樣</small>';
      } else {
        // 三個方案分開列出，最平的加深顏色。
        mr.innerHTML = t.map(function (x, k) {
          return '<span class="m3' + (x === a ? " best" : "") + '">' + PLAN_NAMES[k].slice(0, 1) + '<b>' + money(x) + '</b></span>';
        }).join("");
      }
    });

    document.getElementById("adults-out").textContent = String(state.adults);
    document.getElementById("kids-out").textContent = String(state.kids);
    Array.prototype.forEach.call(document.querySelectorAll(".stepper"), function (st) {
      var key = st.getAttribute("data-key"), btns = st.querySelectorAll("button");
      btns[0].disabled = state[key] <= LIMITS[key][0];
      btns[1].disabled = state[key] >= LIMITS[key][1];
    });
  }

  function setup() {
    Array.prototype.forEach.call(document.querySelectorAll(".stepper"), function (st) {
      var key = st.getAttribute("data-key");
      st.addEventListener("click", function (e) {
        var d = e.target && e.target.getAttribute && e.target.getAttribute("data-d");
        if (!d) return;
        state[key] = Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], state[key] + Number(d)));
        update();
      });
    });
    document.getElementById("tiles").addEventListener("click", function (e) {
      var t = e.target.closest(".tile"); if (!t) return;
      var k = Number(t.getAttribute("data-k"));
      state.plan = state.plan === k ? null : k; // 再按一次還原為三方案範圍
      update();
    });

    var list = document.getElementById("list");
    list.innerHTML = ORDER.map(rowHTML).join("");
    list.addEventListener("click", function (e) {
      var head = e.target.closest(".row-head");
      if (head) {
        var open = head.getAttribute("aria-expanded") !== "true";
        head.setAttribute("aria-expanded", String(open));
        head.parentElement.querySelector(".row-more").hidden = !open;
        return;
      }
      var b = e.target.closest(".gal-btn"); if (!b) return;
      var g = b.parentElement.querySelector(".gallery");
      g.scrollBy({ left: Number(b.dataset.dir) * g.querySelector(".shot").offsetWidth, behavior: "smooth" });
    });
    // 相片：電腦用左右箭咀或按住拖動；手機用手指掃。
    var drag = null;
    list.addEventListener("pointerdown", function (e) {
      var g = e.target.closest(".gallery"); if (!g || e.pointerType !== "mouse") return;
      drag = { g: g, x: e.clientX, left: g.scrollLeft }; g.classList.add("dragging"); e.preventDefault();
    });
    window.addEventListener("pointermove", function (e) { if (drag) drag.g.scrollLeft = drag.left - (e.clientX - drag.x); });
    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var g = drag.g, w = g.querySelector(".shot").offsetWidth + 8;
      g.classList.remove("dragging"); g.scrollTo({ left: Math.round(g.scrollLeft / w) * w, behavior: "smooth" }); drag = null;
    });
  }

  function renderText() {
    C.banner("demo-banner");
    document.getElementById("history").textContent = VP.history;
    document.getElementById("funnel-text").textContent =
      "籌委會委員先收集了" + VP.collected + "酒店和酒樓，再篩走" + VP.excludeReasons.join("、") + "的場地，剩下 " + V.length +
      " 間：" + count("hotel") + " 間酒店、" + count("rest") + " 間酒樓。篩走了哪些場地，見下面「已篩走的場地及原因」。";
    document.getElementById("excluded").innerHTML = VP.excluded.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
    var avg = Math.round(N / G * 10) / 10, avgTxt = (avg % 1 ? "約 " : "") + avg;
    document.getElementById("avg-line").textContent =
      "三個方案分擔的是同一筆錢（老師餐和雜費），分別只在於按人頭攤還是按家庭攤。按估算，出席總人數約 " + N +
      " 位、出席畢業生約 " + G + " 位，即平均每家 " + avgTxt + " 人。一個家庭的人數剛好等於平均時，按人頭攤（①）和按家庭攤（③）付的一樣，" +
      "② 亦一樣，所以 2 大 1 小的家庭三個方案差不多。人數多過平均的家庭，按家庭攤（③）較省；人數少過平均的（例如 1 大 1 小），按人頭攤（①）較省。" +
      "實際平均人數要報名截止才知道，差距會隨之改變。";
    document.getElementById("assume-line").textContent =
      "假設老師和職員 " + S + " 位、雜費約 " + money(M) + "、出席畢業生 " + G + " 位、出席總人數 " + N + " 位（包括畢業生）。頂部三個方案的分擔金額以名單平均餐費計，場地之間只差幾十元。";
    C.commitLink();
  }

  renderText();
  renderTiles();
  setup();
  update();
})();
