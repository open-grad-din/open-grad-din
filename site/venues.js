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
      '<div class="row-head">' +
        // 第一行場地名，第二行酒店／酒樓 pill 及地區（Ken 2026-11-05）。area 是短地區；沒有就用 where。
        '<span class="titles"><span class="name">' + esc(v.name) + '</span>' +
          '<span class="meta"><span class="tag ' + v.type + '">' + (v.grade ? esc(v.grade) : "") + TYPE[v.type] + '</span>' +
          ((v.area || v.where) ? '<span class="area">' + esc(v.area || v.where) + '</span>' : '') + '</span></span>' +
        // 不設相片彈出視窗，直接連去官網（Ken 2026-11-03）
        (v.url ? '<a class="link site" href="' + esc(v.url) + '" target="_blank" rel="noopener" aria-label="' + esc(v.name) + ' 官方網站（新分頁）">官網 ↗</a>'
               : '<span class="link none">官網待補</span>') +
      '</div>' +
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
  }

  function renderText() {
    C.banner("demo-banner");
    document.getElementById("history").textContent = VP.history;
    document.getElementById("funnel-text").textContent =
      "籌委會委員先收集了" + VP.collected + "酒店和酒樓，再篩走" + VP.excludeReasons.join("、") + "的場地，剩下 " + V.length +
      " 間：" + count("hotel") + " 間酒店、" + count("rest") + " 間酒樓。" +
      (VP.gradeNote ? VP.gradeNote : "") + "篩走的場地及原因如下：";
    document.getElementById("excluded").innerHTML = VP.excluded.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
    var avg = Math.round(N / G * 10) / 10, avgTxt = (avg % 1 ? "約 " : "") + avg;
    document.getElementById("avg-line").textContent =
      "三個方案分擔的是同一筆錢（老師餐和雜費），分別只在於按人頭攤還是按家庭攤。按估算，出席總人數約 " + N +
      " 位、出席畢業生約 " + G + " 位，即平均每家 " + avgTxt + " 人。一個家庭的人數剛好等於平均時，「按人頭」和「按家庭」付的一樣，" +
      "「雜費按人頭」亦一樣，所以 2 大 1 小的家庭三個方案差不多。人數多過平均的家庭，「按家庭」較省；人數少過平均的（例如 1 大 1 小），「按人頭」較省。" +
      "實際平均人數要報名截止才知道，差距會隨之改變。";
    document.getElementById("assume-line").textContent =
      "頂部三格顯示你捲到的那個菜式下，你家在三個方案的總開支（自己的餐費加分擔的老師餐和雜費）。下面公式用到的數字及來源見表。";
    // 公式變數表（2026-11-03 由費用頁搬來，與公式及例子放在一起）
    var rows = [
      ["n", "你家出席人數（包括畢業生）"],
      ["F", "每位餐費：視乎場地，見上面場地列表（已計入服務費）"],
      ["S", "老師和職員人數：" + S + "（" + C.P.staff.source + "）"],
      ["M", "雜費：預計 " + money(M) + "（" + C.P.incidentals.source + "）"],
      ["G", "出席畢業生：預計 " + G + "（" + C.P.graduates.source + "）"],
      ["N", "出席總人數：預計 " + N + "（" + C.P.attendees.source + "）"]
    ];
    var vars = document.getElementById("vars");
    rows.forEach(function (r) {
      var tr = C.el("tr");
      tr.appendChild(C.el("td", r[0], "sym"));
      tr.appendChild(C.el("td", r[1]));
      vars.appendChild(tr);
    });
    renderExample();
    C.commitLink();
  }

  // 計算例子（Ken 2026-11-03）：用名單上一個場地、一家 2 大 1 小，把三條算式逐步計一次，數字全部讀 params，與頂部三格一致。
  function renderExample() {
    var box = document.getElementById("example"); if (!box) return;
    var v = V.filter(function (x) { return x.name === "康得思酒店"; })[0] || V[0], m = v.menus[0];
    var F = mid(m), n = 3, own = n * F, teach = S * F, pool = teach + M, t = totals(n, F);
    var $ = function (x) { return money(x); };
    var lines = [
      "例子：" + v.name + "（" + m.name + "，每位 " + $(F) + "），一家 2 大 1 小，即 n = " + n + "。",
      "其他數字：老師和職員 S = " + S + "、雜費 M = " + $(M) + "、出席畢業生 G = " + G + "、出席總人數 N = " + N + "。",
      "自己的餐費：" + n + " × " + $(F) + " = " + $(own),
      "老師餐：" + S + " × " + $(F) + " = " + $(teach) + "；加雜費共 " + $(pool),
      "<b>① 按人頭</b>：" + $(own) + " + " + n + " × " + $(pool) + " ÷ " + N + " = <b>" + $(t[0]) + "</b>",
      "<b>② 雜費按人頭</b>：" + $(own) + " + " + $(teach) + " ÷ " + G + " + " + n + " × " + $(M) + " ÷ " + N + " = <b>" + $(t[1]) + "</b>",
      "<b>③ 按家庭</b>：" + $(own) + " + " + $(pool) + " ÷ " + G + " = <b>" + $(t[2]) + "</b>",
      "最後四捨五入至元。換其他場地，把 " + $(F) + " 換成該菜式的每位餐費；換其他人數，把 n 換成你家出席人數（包括畢業生）。",
      "<small>備註：S、M、G、N 的數字及來源見上表；截止後按已核實人數重新計算。</small>"
    ];
    box.innerHTML = lines.map(function (l) { return "<p>" + l + "</p>"; }).join("");
  }

  renderText();
  renderTiles();
  setup();
  update();
  pickActive();
})();
