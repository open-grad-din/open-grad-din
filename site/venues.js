// 計算機頁。頂部黏住：你家人數＋三個方案下你家的總開支；下面一行一間列出候選場地。
// 向上捲動時，去到頂部下方的那個菜式（以菜式為單位）會以 active 顏色標示，三格即時換成該菜式的總開支；未捲到任何菜式時不顯示銀碼。
// 公式在 fees-core.js，場地資料在 venues-params.js，收費數字在 fees-params.js。
// 只做計算和顯示，沒有讀取或寫入任何人的資料，亦不會記住你輸入的人數。
(function () {
  "use strict";
  var C = window.OGD_CALC;
  if (!C) return;
  var VP = C.VP, V = VP.venues, S = C.S, M = C.M, G = C.G, N = C.N, CAP = C.CAP;
  var money = C.money, esc = C.esc, mid = C.mid, totals = C.totals, PLAN_NAMES = C.PLAN_NAMES;
  var TYPE = { hotel: "酒店", rest: "酒樓" };
  // 方案一律「編號＋名字」一起寫（Ken 2026-11-02：只寫編號會混亂）。
  var NAMES = PLAN_NAMES;

  // ---- 場地相片及官方連結，按場地名彈出視窗 ----
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
      '<button class="gal-btn next" aria-label="下一張" data-dir="1">›</button></div>' +
      '<p class="dots" aria-live="polite">' + items.map(function (_, i) { return '<i' + (i ? "" : ' class="on"') + '></i>'; }).join("") +
      '<span class="cnt">1 / ' + items.length + '</span></p>';
  }
  // 按場地名彈出視窗：只有相片及官方網站連結（Ken 2026-11-02）。
  function popHTML(v) {
    var link = v.url
      ? '<a class="link" href="' + esc(v.url) + '" target="_blank" rel="noopener">官方網站 ↗</a>'
      : '<span class="link none">官方連結待補</span>';
    return galleryHTML(v) + '<div class="pop-foot">' + link + '</div>';
  }

  // ---- 一行一間 ----
  function menuRowHTML(m) {
    return '<div class="mrow" data-f="' + mid(m) + '">' +
      '<span class="ml"><span class="mn"><span class="mtag ' + (/自助/.test(m.name) ? "buffet" : "chinese") + '">' + esc(m.name) + '</span></span>' +
      '<span class="mf">場地餐飲費每位約 <b>' + money(mid(m)) + '</b></span></span>' +
      (C.worstPerHead(C.top(m)) > CAP ? '<span class="over">按估算可能超出每位 ' + money(CAP) + ' 上限，請籌委會覆核。</span>' : "") +
      '</div>';
  }
  function rowHTML(v, i) {
    return '<article class="row">' +
      '<button type="button" class="row-head" data-i="' + i + '" aria-haspopup="dialog">' +
        '<span class="tag ' + v.type + '">' + (v.grade ? esc(v.grade) : "") + TYPE[v.type] + '</span>' +
        '<span class="name">' + esc(v.name) + '</span>' +
        '<span class="chev" aria-hidden="true">相片 ›</span></button>' +
      v.menus.map(menuRowHTML).join("") +
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

  // ---- 狀態：你家人數、現在捲到哪個菜式 ----
  var state = { adults: 1, kids: 1, active: null };
  var LIMITS = { adults: [1, 6], kids: [1, 4] };

  function renderTiles() {
    var box = document.getElementById("tiles");
    box.innerHTML = PLAN_NAMES.map(function (name, k) {
      return '<div class="tile" data-k="' + k + '">' +
        '<span class="tile-l"><small>' + NAMES[k] + '</small><b></b><i></i></span><span class="tile-fam"></span></div>';
    }).join("");
  }

  // 三格：未捲到任何菜式時不顯示銀碼；捲到時顯示該菜式下你家三個方案的總開支（包括自己的餐費）。
  function paintTiles() {
    var n = state.adults + state.kids, row = state.active;
    var t = row ? totals(n, Number(row.getAttribute("data-f"))) : null;
    var lo = t && Math.min.apply(null, t), same = !t || Math.max.apply(null, t) - lo < 10;
    Array.prototype.forEach.call(document.querySelectorAll(".tile"), function (el) {
      var k = Number(el.getAttribute("data-k")), best = !same && t[k] === lo;
      el.querySelector("b").textContent = t ? money(t[k]) : "—";
      el.classList.toggle("empty", !t);
      el.querySelector("i").textContent = best ? "最省" : "";
      el.classList.toggle("best", best);
    });
  }

  // 未捲動時不顯示銀碼。捲動後：黏頂那塊底線以下，第一個完整看得見的菜式就是 active（以菜式為單位）。
  // 一間場地的第一個菜式由場地名開始計，其餘由該菜式那行開始計；整個列表捲過了頂就不再有 active。
  function pickActive() {
    var line = document.querySelector(".dock").getBoundingClientRect().bottom - 12;
    var found = null;
    if (window.scrollY > 10) {
      var rows = document.querySelectorAll("#list .mrow");
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], art = r.parentElement;
        var start = (art.querySelector(".mrow") === r ? art : r).getBoundingClientRect().top;
        if (start >= line) { found = r; break; }
      }
    }
    // 「向上捲動」提示只在未捲動時出現；一開始捲動就收起，捲完列表也不再出現。
    document.getElementById("scroll-hint").hidden = window.scrollY > 10;
    if (found === state.active) return;
    if (state.active) { state.active.classList.remove("active"); state.active.parentElement.classList.remove("on"); }
    state.active = found;
    if (found) { found.classList.add("active"); found.parentElement.classList.add("on"); }
    paintTiles();
  }

  function update() {
    var n = state.adults + state.kids;
    Array.prototype.forEach.call(document.querySelectorAll(".tile"), function (t) {
      var fam = t.querySelector(".tile-fam");
      fam.innerHTML = ""; fam.appendChild(C.family(Number(t.getAttribute("data-k")), state.adults, state.kids));
      fam.style.setProperty("--fw", n > 6 ? "20px" : "26px"); // 人多時縮小，免得格子太高
    });
    paintTiles();

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
        st.parentElement.classList.remove("nudge"); // 改過人數就不再提示
        update();
      });
    });
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; pickActive(); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    var list = document.getElementById("list");
    list.innerHTML = ORDER.map(rowHTML).join("");
    var pop = document.getElementById("venue-pop"), popBody = document.getElementById("pop-body"), lastHead = null;
    list.addEventListener("click", function (e) {
      var head = e.target.closest(".row-head"); if (!head) return;
      var v = ORDER[Number(head.getAttribute("data-i"))];
      document.getElementById("pop-h").innerHTML = '<span class="tag ' + v.type + '">' + (v.grade ? esc(v.grade) : "") + TYPE[v.type] + '</span>' + esc(v.name);
      popBody.innerHTML = popHTML(v);
      lastHead = head;
      if (pop.showModal) pop.showModal(); else pop.setAttribute("open", "");
    });
    function closePop() { if (pop.close) pop.close(); else pop.removeAttribute("open"); }
    pop.addEventListener("click", function (e) {
      if (e.target === pop || e.target.closest(".pop-x")) { closePop(); return; } // 按外面灰色位或 × 關閉
      var b = e.target.closest(".gal-btn"); if (!b) return;
      var g = b.parentElement.querySelector(".gallery");
      g.scrollBy({ left: Number(b.dataset.dir) * g.querySelector(".shot").offsetWidth, behavior: "smooth" });
    });
    // 掃相片時更新圓點及「1 / 3」
    popBody.addEventListener("scroll", function (e) {
      var g = e.target; if (!g.classList || !g.classList.contains("gallery")) return;
      var shot = g.querySelector(".shot"); if (!shot) return;
      var gap = parseFloat(getComputedStyle(g).columnGap) || 0;
      var idx = Math.round(g.scrollLeft / (shot.offsetWidth + gap)), dots = popBody.querySelectorAll(".dots i");
      Array.prototype.forEach.call(dots, function (d, i) { d.classList.toggle("on", i === idx); });
      popBody.querySelector(".cnt").textContent = (idx + 1) + " / " + dots.length;
    }, true);
    pop.addEventListener("close", function () { popBody.innerHTML = ""; if (lastHead) lastHead.focus(); });
    // 相片：電腦用左右箭咀或按住拖動；手機用手指掃。
    var drag = null;
    pop.addEventListener("pointerdown", function (e) {
      var g = e.target.closest(".gallery"); if (!g || e.pointerType !== "mouse") return;
      drag = { g: g, x: e.clientX, left: g.scrollLeft }; g.classList.add("dragging"); e.preventDefault();
    });
    window.addEventListener("pointermove", function (e) { if (drag) drag.g.scrollLeft = drag.left - (e.clientX - drag.x); });
    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var g = drag.g, w = g.querySelector(".shot").offsetWidth + (parseFloat(getComputedStyle(g).columnGap) || 0);
      g.classList.remove("dragging"); g.scrollTo({ left: Math.round(g.scrollLeft / w) * w, behavior: "smooth" }); drag = null;
    });
  }

  function renderText() {
    C.banner("demo-banner");
    document.getElementById("history").textContent = VP.history;
    document.getElementById("funnel-text").textContent =
      "籌委會委員先收集了" + VP.collected + "酒店和酒樓，再篩走" + VP.excludeReasons.join("、") + "的場地，剩下 " + V.length +
      " 間：" + count("hotel") + " 間酒店、" + count("rest") + " 間酒樓。篩走了哪些場地，見下面「已篩走的場地及原因」。" +
      (VP.gradeNote ? VP.gradeNote : "");
    document.getElementById("excluded").innerHTML = VP.excluded.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
    var avg = Math.round(N / G * 10) / 10, avgTxt = (avg % 1 ? "約 " : "") + avg;
    document.getElementById("avg-line").textContent =
      "三個方案分擔的是同一筆錢（老師餐和雜費），分別只在於按人頭攤還是按家庭攤。按估算，出席總人數約 " + N +
      " 位、出席畢業生約 " + G + " 位，即平均每家 " + avgTxt + " 人。一個家庭的人數剛好等於平均時，「按人頭」和「按家庭」付的一樣，" +
      "「雜費按人頭」亦一樣，所以 2 大 1 小的家庭三個方案差不多。人數多過平均的家庭，「按家庭」較省；人數少過平均的（例如 1 大 1 小），「按人頭」較省。" +
      "實際平均人數要報名截止才知道，差距會隨之改變。";
    document.getElementById("assume-line").textContent =
      "假設老師和職員 " + S + " 位、雜費約 " + money(M) + "、出席畢業生 " + G + " 位、出席總人數 " + N + " 位（包括畢業生）。頂部三格顯示你捲到的那個菜式下，你家在三個方案的總開支（自己的餐費加分擔的老師餐和雜費）。";
    C.commitLink();
  }

  renderText();
  renderTiles();
  setup();
  update();
  pickActive();
})();
