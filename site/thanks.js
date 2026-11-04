// 「報名」tab 打開表格之前的短動畫（約 25 秒）：提醒大家辦晚宴的初心是多謝老師和學校。
// 只是一段畫面，不讀取、不寫入任何資料；不講費用、方案或場地，以免影響投票。
// 隨時可以按「略過」；最後一幕的「開始報名」由家長親手按，才打開表格（瀏覽器不會當作彈出視窗攔截）。
// 設定了「減少動態效果」就直接顯示最後一幕。
(function () {
  "use strict";
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var n = 0; // 線條畫出的次序

  // 一條手繪線：pathLength=1 令每條線都可以用同一個動畫畫出來。
  function ln(d, cls) {
    return '<path class="ln' + (cls ? " " + cls : "") + '" pathLength="1" style="--d:' + (n++ * 0.06).toFixed(2) + 's" d="' + d + '"/>';
  }
  function dot(x, y, r, cls) { return '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; }

  // 小朋友：(x, y) 是雙腳中間；與首頁開場的小朋友同一畫法。
  function kid(x, y, color, opt) {
    opt = opt || {};
    var s = '<g class="kid" transform="translate(' + (x - 94) + " " + (y - 122) + ')">';
    if (opt.bag) s += '<path class="fill kin-soft" d="M75 78 h-8 q-4 0 -4 4 v18 q0 4 4 4 h8 z"/>' + ln("M75 78 h-8 q-4 0 -4 4 v18 q0 4 4 4 h8");
    s += ln("M77 52 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0") + ln("M80 45 q7 6 14 2 q7 4 14 -2");
    if (opt.cap) s += '<g class="cap"><path class="fill paper" d="M70 37 L94 25 L118 37 L94 45 Z"/>' + ln("M70 37 L94 25 L118 37 L94 45 Z") + ln("M118 37 L121 52") + dot(121, 54, 3, "fl") + "</g>";
    s += dot(88, 55, 2.2, "eye") + dot(100, 55, 2.2, "eye") + dot(82, 62, 3.5, "cheek") + dot(106, 62, 3.5, "cheek");
    s += ln("M89 63 q5 5 10 0");
    s += '<path class="fill ' + color + '" d="M79 74 q15 -8 30 0 v30 h-30 z"/>' + ln("M79 74 q15 -8 30 0 v30 h-30 z");
    s += ln("M87 104 v18 M101 104 v18");
    if (opt.arms) s += ln(opt.arms);
    return s + "</g>";
  }

  // 老師：(x, y) 是雙腳中間。
  function teacher(x, y, arms) {
    var s = '<g class="adult" transform="translate(' + x + " " + y + ')">';
    s += ln("M-15 -118 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0");
    s += ln("M-13 -125 q6 6 13 2 q7 4 13 -2") + ln("M10 -134 a6 6 0 1 0 0.1 0");
    s += dot(-5, -117, 2, "eye") + dot(5, -117, 2, "eye") + dot(-10, -110, 3, "cheek") + dot(10, -110, 3, "cheek");
    s += ln("M-4 -111 q4 4 8 0");
    s += '<path class="fill sage" d="M-12 -98 q12 -6 24 0 l10 66 h-44 z"/>' + ln("M-12 -98 q12 -6 24 0 l10 66 h-44 z");
    s += ln("M-8 -32 v32 M8 -32 v32");
    s += ln(arms || "M-12 -92 q-12 18 -14 36 M12 -92 q12 18 14 36");
    return s + "</g>";
  }

  function star(x, y, i) { return '<path class="star" pathLength="1" style="--i:' + i + '" d="M' + x + " " + (y - 6) + " v12 M" + (x - 6) + " " + y + ' h12"/>'; }
  function note(x, y) { return '<g class="float">' + ln("M" + x + " " + y + " v-18 l12 -4 v18") + dot(x - 3, y, 3.5, "fl") + dot(x + 9, y - 4, 3.5, "fl") + "</g>"; }
  // 一束花：(x, y) 是拿着花的手。
  function bouquet(x, y) {
    var s = '<g class="bouquet">';
    [[-7, -12, "shu-soft"], [0, -17, "kin"], [7, -12, "sage"]].forEach(function (f) {
      s += ln("M" + x + " " + y + " L" + (x + f[0]) + " " + (y + f[1] + 4));
      s += '<circle class="fill solid ' + f[2] + '" cx="' + (x + f[0]) + '" cy="' + (y + f[1]) + '" r="5"/>' + ln("M" + (x + f[0] - 5) + " " + (y + f[1]) + " a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0");
    });
    s += '<path class="fill solid kin-soft" d="M' + (x - 7) + " " + (y - 4) + " L" + x + " " + (y + 10) + " L" + (x + 7) + " " + (y - 4) + ' Z"/>' + ln("M" + (x - 7) + " " + (y - 4) + " L" + x + " " + (y + 10) + " L" + (x + 7) + " " + (y - 4) + " Z");
    return s + "</g>";
  }

  // 每一幕：字幕、畫面、停留毫秒。
  var scenes = [
    { say: "那一年，他們第一次上學。", ms: 5800, art: function () {
      return ln("M150 200 v-86 l60 -38 l60 38 v86") + ln("M196 200 v-34 h28 v34") + ln("M168 128 h18 v16 h-18 z M234 128 h18 v16 h-18 z") +
        ln("M210 76 v-30") + ln("M296 200 v-36") + '<circle class="fill sage" cx="296" cy="146" r="20"/>' + ln("M276 146 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0") + ln("M296 176 l-7 -9 M296 182 l8 -11") + '<path class="fill kin" d="M210 46 l20 7 l-20 7 z"/>' + ln("M210 46 l20 7 l-20 7") +
        ln("M20 200 h280", "ground") + kid(96, 200, "ai", { bag: true, arms: "M79 84 q-8 8 -10 18 M109 84 q8 8 10 18" }) + star(40, 60, 0) + star(290, 40, 1);
    } },
    { say: "老師牽着小手，陪他們寫字、唱歌、交朋友。", ms: 6800, art: function () {
      return ln("M20 200 h280", "ground") + teacher(130, 200, "M-12 -92 q-12 18 -14 36 M12 -92 q16 20 24 56") +
        kid(196, 200, "kin", { arms: "M79 84 q-8 0 -15 2 M109 84 q8 8 10 18" }) + note(240, 90) + note(70, 70) + star(270, 140, 2);
    } },
    { say: "轉眼，他們要畢業了。", ms: 5200, art: function () {
      return ln("M20 200 h280", "ground") + '<g class="toss">' +
        kid(84, 200, "kin", { cap: true, arms: "M79 84 q-10 -10 -12 -24 M109 84 q10 -10 12 -24" }) +
        kid(160, 200, "ai", { cap: true, arms: "M79 84 q-10 -10 -12 -24 M109 84 q10 -10 12 -24" }) +
        kid(236, 200, "sage", { cap: true, arms: "M79 84 q-10 -10 -12 -24 M109 84 q10 -10 12 -24" }) + "</g>" +
        star(40, 50, 0) + star(160, 30, 1) + star(282, 56, 2);
    } },
    { say: "這一晚，一起多謝老師，多謝學校。", ms: 6800, art: function () {
      return ln("M20 200 h280", "ground") + teacher(160, 200, "M-12 -92 q-14 10 -20 26 M12 -92 q14 10 20 26") +
        kid(84, 200, "kin", { cap: true, arms: "M79 84 q-6 10 -6 18 M109 84 q10 -4 16 -14" }) + bouquet(115, 148) +
        kid(236, 200, "sage", { cap: true, arms: "M79 84 q-10 -4 -16 -14 M109 84 q6 10 6 18" }) + bouquet(205, 148) +
        star(50, 50, 0) + star(160, 28, 1) + star(276, 40, 2);
    } }
  ];

  var box, svg, cap, endCard, go, skip, timers = [], idx = -1, lastFocus;

  function build() {
    box = document.createElement("div");
    box.className = "thanks";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "報名之前：多謝老師，多謝學校");
    box.innerHTML =
      '<button type="button" class="thanks-skip">略過 ›</button>' +
      '<div class="thanks-stage">' +
        scenes.map(function (sc, i) { n = 0; return '<svg class="thanks-scene" data-i="' + i + '" viewBox="0 0 320 220" aria-hidden="true">' + sc.art() + "</svg>"; }).join("") +
        '<p class="thanks-say" aria-live="polite"></p>' +
      "</div>" +
      '<div class="thanks-end" hidden>' +
        '<svg class="thanks-kids" viewBox="0 0 320 150" aria-hidden="true">' + (n = 0, "") +
          [[84, "kin"], [160, "ai"], [236, "sage"]].map(function (k) {
            return '<g class="cheer" style="--i:' + (k[0] - 84) / 76 + ';transform-origin:' + k[0] + 'px 140px">' +
              kid(k[0], 140, k[1], { cap: true, arms: "M79 84 q6 10 13 14 M109 84 q-6 10 -13 14" }) + bouquet(k[0], 114) + "</g>";
          }).join("") + star(30, 40, 0) + star(290, 30, 1) + star(160, 4, 2) + "</svg>" +
        '<p class="thanks-h">多謝老師<br>多謝學校</p>' +
        '<p class="thanks-sub">K3 畢業晚宴 · 2027 年 7 月 2 日</p>' +
        '<a class="btn thanks-go" target="_blank" rel="noopener">開始報名</a>' +
        '<button type="button" class="thanks-again">重播</button>' +
      "</div>";
    document.body.appendChild(box);
    cap = box.querySelector(".thanks-say");
    endCard = box.querySelector(".thanks-end");
    go = box.querySelector(".thanks-go");
    skip = box.querySelector(".thanks-skip");
    skip.addEventListener("click", end);
    box.querySelector(".thanks-again").addEventListener("click", play);
    go.addEventListener("click", function () { setTimeout(close, 300); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") { // 焦點留在動畫內
        var f = [skip, go, box.querySelector(".thanks-again")].filter(function (x) { return x.offsetParent; });
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
  }

  function clear() { timers.forEach(clearTimeout); timers = []; }

  function show(i) {
    idx = i;
    Array.prototype.forEach.call(box.querySelectorAll(".thanks-scene"), function (s) { s.classList.toggle("on", +s.dataset.i === i); });
    cap.classList.remove("on");
    void cap.offsetWidth; // 重新開始字幕動畫
    cap.textContent = scenes[i].say;
    cap.classList.add("on");
    timers.push(setTimeout(function () { if (i + 1 < scenes.length) show(i + 1); else end(); }, scenes[i].ms));
  }

  function play() {
    clear();
    box.classList.remove("ended");
    endCard.hidden = true;
    skip.hidden = false;
    show(0);
    skip.focus();
  }

  function end() {
    clear();
    Array.prototype.forEach.call(box.querySelectorAll(".thanks-scene"), function (s) { s.classList.remove("on"); });
    cap.classList.remove("on");
    cap.textContent = "";
    skip.hidden = true;
    endCard.hidden = false;
    box.classList.add("ended");
    go.focus();
  }

  function close() {
    clear();
    box.classList.remove("open");
    document.documentElement.classList.remove("thanks-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // url：已核對過的 Google 表格網址（由 signup.js 傳入）。
  function open(url) {
    if (!box) build();
    lastFocus = document.activeElement;
    go.href = url;
    box.classList.add("open");
    document.documentElement.classList.add("thanks-lock");
    if (still) end(); else play();
  }

  window.OGD_THANKS = { open: open };
})();
