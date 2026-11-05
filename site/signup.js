// 每頁底部導覽的「投票」tab（data-signup；第二階段報名時改回「報名」）。
// 報名表格連結不寫在程式碼內，而是從統籌的 Google Sheet 公開分頁（infoCsvUrl 的「報名表格連結」一行）讀取，
// 所以連結一定是統籌那張表格。連結必須是 Google 表格的網址，否則不會打開。
// 讀到連結前、報名未開始或讀取失敗時，按 tab 會在畫面底部顯示原因，不會打開任何網址。
(function () {
  var tabs = document.querySelectorAll("[data-signup]");
  if (!window.OGD_CONFIG || !tabs.length) return;
  var msg = "表格連結載入中，請稍後再按一次。";
  var toast;

  function say(text) {
    if (!toast) {
      toast = document.createElement("p");
      toast.className = "signup-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(say.t);
    say.t = setTimeout(function () { toast.hidden = true; }, 4000);
  }

  function hold(e) {
    if (this.dataset.ready) {
      if (window.OGD_CONFIG.isDemo) say("示範版：這是原型表格，只可以填假資料，請不要轉帳。");
      // 先播「多謝老師」短動畫，最後一幕由家長按「開始投票」才打開表格（thanks.js）。
      if (window.OGD_THANKS) { e.preventDefault(); window.OGD_THANKS.open(this.href, e.detail === 0); }
      return;
    }
    e.preventDefault();
    say(msg);
  }
  Array.prototype.forEach.call(tabs, function (a) { a.addEventListener("click", hold); });

  function parseCsv(text) {
    var rows = [], row = [], field = "", q = false;
    text = text.replace(/^﻿/, "");
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { q = false; } }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function isGoogleForm(url) {
    return /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/.test(url);
  }

  fetch(window.OGD_CONFIG.infoCsvUrl, { cache: "no-store" })
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
    .then(function (text) {
      var info = {};
      parseCsv(text).forEach(function (r) { if (r.length >= 2) info[r[0].replace(/[\s:：]+$/, "").trim()] = r[1].trim(); });
      var url = info["報名表格連結"] || "";
      if (isGoogleForm(url)) {
        Array.prototype.forEach.call(tabs, function (a) {
          a.href = url; a.target = "_blank"; a.rel = "noopener"; a.dataset.ready = "1";
        });
      } else {
        msg = "投票尚未開始。開始時，按這裏就會打開投票表格。";
      }
    })
    .catch(function () {
      msg = "暫時未能載入表格連結，請稍後再試。";
    });
})();
