// 收費詳細頁：按 fees-params.js 的數字，用公開的公式算出家庭例子。
// 這個檔案只做計算和顯示，沒有讀取或寫入任何人的資料。
(function () {
  "use strict";

  var P = window.OGD_FEES;

  // 三個方案（n = 家庭出席人數，S×F = 老師餐費總額）：
  // ① 按人頭：      n×F + n×(S×F+M)/N
  // ② 雜費按人頭：  n×F + (S×F)/G + n×M/N
  // ③ 按家庭：      n×F + (S×F+M)/G
  var PLANS = [
    function (n, F, S, M, G, N) { return n * F + n * (S * F + M) / N; },
    function (n, F, S, M, G, N) { return n * F + (S * F) / G + n * M / N; },
    function (n, F, S, M, G, N) { return n * F + (S * F + M) / G; }
  ];

  function round10(x) { return Math.round(x / 10) * 10; }
  function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function render() {
    var S = P.staff.value, M = P.incidentals.value, G = P.graduates.value, N = P.attendees.value;

    if (P.isDemo) document.getElementById("demo-banner").hidden = false;
    document.getElementById("version").textContent =
      P.version + (P.frozenDate ? " · " + P.frozenDate + " 凍結，之後如有修改會公開說明" : " · 未凍結");
    Array.prototype.forEach.call(document.querySelectorAll(".deposit"), function (s) {
      s.textContent = String(P.depositPerHead);
    });
    document.getElementById("win-rule").textContent = "怎樣定勝出：" + (P.winRule || "待籌委會決定。");
    document.getElementById("tie-rule").textContent = "平手時：" + (P.tieRule || "待籌委會決定。");

    var avg = N / G;
    document.getElementById("who-wins").textContent =
      "人數少於平均（約每家 " + (Math.round(avg * 10) / 10) + " 人）的家庭，方案 ① 最便宜；" +
      "人數多於平均的家庭，方案 ③ 最便宜；方案 ② 在兩者中間。平均人數的家庭三個方案差不多。" +
      "差額只在老師餐費及雜費，自己家的餐費三個方案都一樣。";

    var box = document.getElementById("venues");
    P.venues.forEach(function (v) {
      var F = v.perHead;
      var card = el("div", undefined, "venue");
      card.appendChild(el("h3", v.name + " · 每位餐費 " + money(F)));
      var t = el("table", undefined, "fees");
      var head = el("tr");
      ["家庭", "①", "②", "③"].forEach(function (h) { head.appendChild(el("th", h)); });
      var thead = el("thead"); thead.appendChild(head); t.appendChild(thead);
      var tb = el("tbody");
      P.examples.forEach(function (ex) {
        var tr = el("tr");
        tr.appendChild(el("td", ex.label));
        PLANS.map(function (f) { return f(ex.n, F, S, M, G, N); }).forEach(function (x) {
          var td = el("td");
          td.appendChild(el("span", money(round10(x))));
          td.appendChild(el("small", "每位 " + money(round10(x / ex.n))));
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      card.appendChild(t);
      box.appendChild(card);
    });

    document.getElementById("staff-line").textContent =
      S + " 位老師，餐費由家長分擔，怎樣分視乎方案（" + P.staff.source + "）";
    document.getElementById("misc-line").textContent =
      "預計約 " + money(M) + "（" + P.incidentals.source + "）";

    var rows = [
      ["n", "你家出席人數（包括畢業生）", "見上表"],
      ["F", "每位餐費（視乎場地）", P.venues.map(function (v) { return v.name + " " + money(v.perHead); }).join("；")],
      ["S", "老師人數", S + "（" + P.staff.source + "）"],
      ["M", "雜費", "預計 " + money(M) + "（" + P.incidentals.source + "）"],
      ["G", "出席畢業生人數", "預計 " + G + "（" + P.graduates.source + "）"],
      ["N", "出席總人數（包括畢業生）", "預計 " + N + "（" + P.attendees.source + "）"]
    ];
    var vars = document.getElementById("vars");
    rows.forEach(function (r) {
      var tr = el("tr");
      r.forEach(function (c, i) { tr.appendChild(el("td", c, i === 0 ? "sym" : "")); });
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

  if (P) render();

  // 給測試用。
  window.OGD_FEES_TEST = { plans: PLANS, round10: round10 };
})();
