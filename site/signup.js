// 收費頁及場地頁底部的「去報名」掣，以及每頁底部導覽的「報名」tab（data-signup）。
// tab 預設指向收費頁底的「去報名」一節；讀到報名表格連結後才改為在新分頁打開 Google 表格。
// 報名表格連結不寫在程式碼內，而是從統籌的 Google Sheet 公開分頁（infoCsvUrl 的「報名表格連結」一行）讀取，
// 所以連結一定是統籌那張表格。連結必須是 Google 表格的網址，否則不顯示按鈕。
(function () {
  var btn = document.getElementById("signup-btn");
  var note = document.getElementById("signup-note");
  var tabs = document.querySelectorAll("[data-signup]");
  if (!window.OGD_CONFIG || (!btn && !tabs.length)) return;

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
      parseCsv(text).forEach(function (r) { if (r.length >= 2) info[r[0].trim()] = r[1].trim(); });
      var url = info["報名表格連結"] || "";
      if (isGoogleForm(url)) {
        Array.prototype.forEach.call(tabs, function (a) {
          a.href = url; a.target = "_blank"; a.rel = "noopener";
        });
        if (!btn) return;
        btn.href = url;
        btn.hidden = false;
        if (window.OGD_CONFIG.isDemo) {
          btn.textContent = "試用原型表格";
          note.textContent = "示範版：這是原型表格，收款人資料是佔位字。只可以填假資料，請不要轉帳。";
        } else {
          note.textContent = "會在新分頁打開 Google 表格，需要登入 Google 帳戶。約 5 分鐘。";
        }
      } else if (note) {
        note.textContent = "報名尚未開始。開始時，這裏會出現報名按鈕。";
      }
    })
    .catch(function () {
      if (note) note.textContent = "暫時未能載入報名連結，請稍後再試，或回到首頁。";
    });
})();
