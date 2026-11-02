// 場地頁：按 venues-params.js 的資料畫出場地卡。不做任何計算以外的處理。
(function () {
  var P = window.OGD_VENUES;
  var V = P.venues;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(v) { return "$" + v.toLocaleString("en-US"); }
  // 有範圍取中位數（四捨五入到整數）。
  function mid(m) { return m.Fmax ? Math.round((m.F + m.Fmax) / 2) : m.F; }
  function count(type) { return V.filter(function (v) { return v.type === type; }).length; }

  // ---- 相片 ----
  var TABLES = "";
  for (var i = 0; i < 9; i++) {
    TABLES += '<circle cx="' + (40 + (i % 3) * 60) + '" cy="' + (48 + Math.floor(i / 3) * 36) + '" r="13"/>';
  }
  function placeholder(i, name) {
    var hue = [190, 32, 150][i % 3];
    return '<figure class="shot"><svg viewBox="0 0 200 150" role="img" aria-label="' + esc(name) + ' 示範圖片 ' + (i + 1) + '">' +
      '<rect width="200" height="150" fill="hsl(' + hue + ' 35% 72%)"/>' +
      '<rect width="200" height="22" fill="hsl(' + hue + ' 30% 60%)"/>' +
      '<g fill="hsl(' + hue + ' 25% 92%)">' + TABLES + '</g></svg>' +
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

  // ---- 場地卡 ----
  function menuHTML(m) {
    return '<div class="menu">' +
      '<div class="menu-top"><span class="menu-name">' + esc(m.name) + '</span>' +
      '<span class="menu-price">每位約 <b>' + money(mid(m)) + '</b></span></div>' +
      (m.Fmax ? '<p class="range-note">範圍 ' + money(m.F) + '–' + money(m.Fmax) + '，取中位數</p>' : "") +
      '<p class="quote">報價：' + esc(m.quote) + '</p></div>';
  }
  function cardHTML(v) {
    var where = [v.where, v.seats].filter(Boolean).map(esc).join("・");
    var link = v.url
      ? '<a class="link" href="' + esc(v.url) + '" target="_blank" rel="noopener">官方網站 ↗</a>'
      : '<span class="link none">官方連結待補</span>';
    return '<article class="card">' +
      '<div class="card-head"><div><h3>' + esc(v.name) + '</h3>' + (where ? '<p class="where">' + where + '</p>' : "") + '</div>' + link + '</div>' +
      galleryHTML(v) +
      v.menus.map(menuHTML).join("") +
      (v.chips && v.chips.length ? '<div class="chips">' + v.chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join("") + '</div>' : "") +
      '</article>';
  }
  function show(type) {
    var list = V.filter(function (v) { return v.type === type; })
      .sort(function (a, b) { return mid(a.menus[0]) - mid(b.menus[0]); });
    document.getElementById("cards").innerHTML = list.map(cardHTML).join("");
    document.getElementById("tab-hotel").setAttribute("aria-selected", type === "hotel");
    document.getElementById("tab-rest").setAttribute("aria-selected", type === "rest");
  }

  // ---- 文字 ----
  if (P.isDraft) document.getElementById("draft-banner").hidden = false;
  document.getElementById("version").textContent =
    P.version + (P.frozenDate ? " · " + P.frozenDate + " 凍結，之後如有修改會公開說明" : " · 未凍結");
  document.getElementById("collected").textContent = P.collected;
  document.getElementById("history").textContent = P.history;
  document.getElementById("cut-reasons").innerHTML = P.excludeReasons.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
  document.getElementById("excluded").innerHTML = P.excluded.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
  document.getElementById("n-total").textContent = V.length + " 間";
  document.getElementById("n-split").textContent = count("hotel") + " 間酒店 ＋ " + count("rest") + " 間酒樓";
  document.getElementById("n-hotel").textContent = count("hotel") + " 間";
  document.getElementById("n-rest").textContent = count("rest") + " 間";
  document.getElementById("tab-hotel").onclick = function () { show("hotel"); };
  document.getElementById("tab-rest").onclick = function () { show("rest"); };
  show("hotel");

  // ---- 相片：電腦用左右箭咀或按住拖動；手機用手指掃 ----
  var cards = document.getElementById("cards");
  cards.addEventListener("click", function (e) {
    var b = e.target.closest(".gal-btn"); if (!b) return;
    var g = b.parentElement.querySelector(".gallery");
    g.scrollBy({ left: Number(b.dataset.dir) * g.querySelector(".shot").offsetWidth, behavior: "smooth" });
  });
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

  // ---- 版本 ----
  var commit = window.OGD_COMMIT || "";
  var link = document.getElementById("commit-link");
  if (/^[0-9a-f]{40}$/.test(commit)) {
    link.href = "https://github.com/open-grad-din/open-grad-din/commit/" + commit;
    link.textContent = commit.slice(0, 7);
  } else {
    link.removeAttribute("href");
    link.textContent = "本地測試版（未經正式部署）";
  }
})();
