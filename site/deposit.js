// 交訂金頁：只讀「公開資料」的截止時間及「統籌聯絡」（由 signup.js 讀入），以及 fees-params.js 的訂金及上限。不讀寫任何家庭資料。
(function () {
  "use strict";
  var P = window.OGD_FEES || {};
  var fmt = function (n) { return Number(n).toLocaleString("en-US"); };
  Array.prototype.forEach.call(document.querySelectorAll(".deposit"), function (s) { if (P.depositPerHead) s.textContent = String(P.depositPerHead); });
  Array.prototype.forEach.call(document.querySelectorAll(".bmax"), function (s) { if (P.budgetPerHead) s.textContent = fmt(P.budgetPerHead.max); });

  // 「2026-11-20 23:59」→「11 月 20 日（星期五）晚上 11:59」
  function label(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(text || "");
    if (!m) return null;
    var wd = "日一二三四五六"[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
    var out = Number(m[2]) + " 月 " + Number(m[3]) + " 日（星期" + wd + "）";
    if (m[4]) {
      var h = Number(m[4]);
      out += (h < 12 ? " 上午 " : h < 18 ? " 下午 " : " 晚上 ") + ((h % 12) || 12) + ":" + m[5];
    }
    return out;
  }
  function show(info) {
    var c = (info["統籌聯絡"] || "").trim();
    if (c) Array.prototype.forEach.call(document.querySelectorAll(".coord"), function (s) { s.textContent = c; });
    var stage = info["現階段"] || "";
    var l = (stage === "交訂金" || stage === "報名及交訂金") ? label(info["截止時間"]) : null;
    if (!l) return;
    Array.prototype.forEach.call(document.querySelectorAll(".dep-deadline"), function (s) { s.textContent = l; });
    var top = document.getElementById("dep-dl");
    if (top) top.hidden = false;
  }
  if (window.OGD_INFO) show(window.OGD_INFO);
  document.addEventListener("ogd-info", function (e) { show(e.detail); });
})();
