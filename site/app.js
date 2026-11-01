// Open Grad Din：讀取公開 CSV，顯示已確認名單。
// 這個檔案只「讀」資料，沒有任何寫入或上載功能。
(function () {
  "use strict";

  var COLUMNS = ["學生名", "班別", "出席人數", "核實狀態"];
  var VERIFIED = "已核實";
  var config = window.OGD_CONFIG || {};

  // 簡單 CSV 解析：支援引號內的逗號、換行及 "" 轉義。
  function parseCsv(text) {
    var rows = [], row = [], field = "", inQuotes = false;
    text = text.replace(/^﻿/, "");
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else { field += c; }
      } else if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else { field += c; }
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (f) { return f.trim() !== ""; }); });
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text; // 只用 textContent，資料不會被當成程式碼執行
    if (cls) e.className = cls;
    return e;
  }

  function render(rows) {
    var header = rows[0].map(function (h) { return h.trim(); });
    var idx = COLUMNS.map(function (c) { return header.indexOf(c); });
    if (idx.indexOf(-1) !== -1) {
      throw new Error("資料欄位不符，應為：" + COLUMNS.join("、"));
    }

    var confirmed = [], unverified = 0, invalid = 0;
    rows.slice(1).forEach(function (r) {
      var name = (r[idx[0]] || "").trim();
      var cls = (r[idx[1]] || "").trim();
      var countText = (r[idx[2]] || "").trim();
      var status = (r[idx[3]] || "").trim();
      if (status !== VERIFIED) { unverified++; return; }
      if (!name || !cls || !/^[1-9]\d?$/.test(countText)) { invalid++; return; }
      confirmed.push({ name: name, cls: cls, count: Number(countText) });
    });

    var byClass = {};
    confirmed.forEach(function (f) { (byClass[f.cls] = byClass[f.cls] || []).push(f); });
    var classNames = Object.keys(byClass).sort();
    var totalPeople = confirmed.reduce(function (s, f) { return s + f.count; }, 0);

    var summary = document.getElementById("summary");
    var totals = el("div", undefined, "totals");
    [["已確認畢業生", confirmed.length], ["出席總人數", totalPeople]].forEach(function (t) {
      var box = el("div");
      box.appendChild(el("strong", String(t[1])));
      box.appendChild(el("span", t[0]));
      totals.appendChild(box);
    });
    summary.appendChild(totals);
    summary.appendChild(el("p", "未核實（不計算）：" + unverified + " 個"
      + (invalid ? "；資料格式有誤（不計算，請統籌更正）：" + invalid + " 個" : ""), "note"));

    var container = document.getElementById("classes");
    classNames.forEach(function (c) {
      var list = byClass[c].sort(function (a, b) { return a.name.localeCompare(b.name, "zh-Hant"); });
      var people = list.reduce(function (s, f) { return s + f.count; }, 0);
      container.appendChild(el("h3", c + "（" + list.length + " 位畢業生，" + people + " 人出席）"));
      var table = el("table");
      var thead = el("thead"), hr = el("tr");
      hr.appendChild(el("th", "學生名"));
      hr.appendChild(el("th", "出席人數", "num"));
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el("tbody");
      list.forEach(function (f) {
        var tr = el("tr");
        tr.appendChild(el("td", f.name));
        tr.appendChild(el("td", String(f.count), "num"));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    });
  }

  function setFooter() {
    var src = document.getElementById("source-link");
    var abs = new URL(config.csvUrl || "", location.href).href;
    src.href = abs; src.textContent = abs;
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

  setFooter();
  if (config.isDemo) document.getElementById("demo-banner").hidden = false;

  var status = document.getElementById("status");
  fetch(config.csvUrl, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("讀取資料失敗（" + res.status + "）");
      return res.text();
    })
    .then(function (text) {
      var rows = parseCsv(text);
      if (!rows.length) throw new Error("資料是空的");
      render(rows);
      status.textContent = "資料讀取時間：" + new Date().toLocaleString("zh-HK");
    })
    .catch(function (err) {
      status.textContent = "暫時未能顯示名單：" + err.message + "。請以統籌的正式通告為準。";
    });
})();
