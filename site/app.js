// Open Grad Din 首頁：讀取統籌公開發佈的兩個 CSV 分頁並顯示。
// 這個檔案只「讀」資料，沒有任何寫入或上載功能。
// 公開分頁只有總數，沒有任何家庭或學生的資料。
(function () {
  "use strict";

  var config = window.OGD_CONFIG || {};

  // 流程的固定階段。資訊分頁的「現階段」必須是其中一項。
  var STAGES = ["籌委會公布規則", "報名、投票及交訂金", "公布投票結果", "收尾數", "晚宴"];
  var SUMMARY_COLUMNS = ["收款人", "已核實", "未核實", "最早未核實提交日期"];

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
    return rows
      .map(function (r) { return r.map(function (f) { return f.trim(); }); })
      .filter(function (r) { return r.some(function (f) { return f !== ""; }); });
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text; // 只用 textContent，資料不會被當成程式碼執行
    if (cls) e.className = cls;
    return e;
  }

  // 只接受 https 連結，其他（例如 javascript:）一律不顯示。
  function safeUrl(u) {
    try {
      var url = new URL(u);
      return url.protocol === "https:" ? url.href : null;
    } catch (e) { return null; }
  }

  function wholeNumber(s) {
    return /^\d+$/.test(s) ? Number(s) : null;
  }

  // 以香港日期計算由某日至今的日數（YYYY-MM-DD）。
  function daysSince(dateText, now) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
    if (!m) return null;
    var hk = new Date(now.getTime() + 8 * 3600 * 1000);
    var today = Date.UTC(hk.getUTCFullYear(), hk.getUTCMonth(), hk.getUTCDate());
    var then = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Math.max(0, Math.round((today - then) / 86400000));
  }

  function formatDeadline(text, now) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(text);
    if (!m) return null;
    var weekday = "日一二三四五六"[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
    var label = Number(m[2]) + " 月 " + Number(m[3]) + " 日（星期" + weekday + "）";
    if (m[4]) {
      var h = Number(m[4]);
      label += (h < 12 ? " 上午 " : h < 18 ? " 下午 " : " 晚上 ") + ((h % 12) || 12) + ":" + m[5];
    }
    var hk = new Date(now.getTime() + 8 * 3600 * 1000);
    var today = Date.UTC(hk.getUTCFullYear(), hk.getUTCMonth(), hk.getUTCDate());
    var dayLeft = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - today) / 86400000);
    return { label: label, daysLeft: dayLeft };
  }

  function readInfo(rows) {
    var info = {};
    rows.slice(1).forEach(function (r) { if (r[0]) info[r[0]] = r[1] || ""; });
    return info;
  }

  function readSummary(rows) {
    var header = rows[0];
    var idx = SUMMARY_COLUMNS.map(function (c) { return header.indexOf(c); });
    if (idx.indexOf(-1) !== -1) {
      throw new Error("收款人分頁的欄位不符，第一行應為：" + SUMMARY_COLUMNS.join(","));
    }
    return rows.slice(1).map(function (r) {
      var p = {
        name: r[idx[0]] || "",
        verified: wholeNumber(r[idx[1]] || ""),
        pending: wholeNumber(r[idx[2]] || ""),
        oldest: r[idx[3]] || ""
      };
      if (!p.name || p.verified === null || p.pending === null) {
        throw new Error("收款人分頁有一行資料格式有誤：" + r.join(","));
      }
      return p;
    });
  }

  function renderHeader(info) {
    var parts = [];
    if (info["發出人"]) parts.push(info["發出人"] + " 發出");
    if (info["最後更新"]) parts.push("最後更新 " + info["最後更新"]);
    document.getElementById("by").textContent = parts.join(" · ");
  }

  function renderNow(info, now) {
    var stage = info["現階段"] || "";
    var cur = STAGES.indexOf(stage);
    document.getElementById("stage").textContent = stage || "請留意正式通告";

    var dl = info["截止時間"] ? formatDeadline(info["截止時間"], now) : null;
    if (dl) {
      var p = document.getElementById("deadline");
      p.textContent = "截止：";
      p.appendChild(el("b", dl.label));
      p.appendChild(document.createTextNode(
        dl.daysLeft > 0 ? "，還有 " + dl.daysLeft + " 日" : dl.daysLeft === 0 ? "，今日截止" : "，已截止"));
      p.hidden = false;
    }

    var href = safeUrl(info["行動連結"] || "");
    if (href && info["行動掣文字"]) {
      var a = document.getElementById("action");
      a.href = href;
      a.textContent = info["行動掣文字"];
      a.hidden = false;
    }
    if (info["行動說明"]) {
      var note = document.getElementById("action-note");
      note.textContent = info["行動說明"];
      note.hidden = false;
    }

    var steps = document.getElementById("steps");
    STAGES.forEach(function (s, i) {
      steps.appendChild(el("li", s, cur === -1 ? "" : i < cur ? "done" : i === cur ? "cur" : ""));
    });
    document.getElementById("now-section").hidden = false;
  }

  function renderProgress(payees, info) {
    var verified = payees.reduce(function (s, p) { return s + p.verified; }, 0);
    var grade = wholeNumber(info["全級人數"] || "");
    document.getElementById("verified").textContent = String(verified);
    document.getElementById("verified-of").textContent =
      "人已核實付款" + (grade ? " · 全級約 " + grade + " 人" : "");
    if (grade) {
      var pct = Math.min(100, Math.round(verified / grade * 100));
      document.getElementById("bar-fill").style.width = pct + "%";
      document.getElementById("bar").setAttribute("aria-label", "已核實 " + verified + " 人，約佔全級 " + pct + "%");
    } else {
      document.getElementById("bar").hidden = true;
    }
    document.getElementById("prog-section").hidden = false;
  }

  function renderPayees(payees, info, now) {
    var limit = wholeNumber(info["未核實上限日數"] || "");
    var list = document.getElementById("payees");
    payees.forEach(function (p) {
      var li = el("li");
      li.appendChild(el("span", "收款人（" + p.name + "）", "who"));
      li.appendChild(el("span", "已核實 " + p.verified + " 筆", "got"));
      var waitText = "未核實 " + p.pending + " 筆", slow = false;
      if (p.pending > 0) {
        var d = daysSince(p.oldest, now);
        if (d !== null) {
          waitText += " · 最長等了 " + d + " 日";
          slow = limit !== null && d > limit;
        }
      }
      li.appendChild(el("span", waitText, "wait" + (slow ? " slow" : "")));
      list.appendChild(li);
    });
    if (limit !== null) {
      document.getElementById("payee-rule").appendChild(document.createTextNode(
        "超過 " + limit + " 日未核實，可把 FPS 收據交統籌處理。"));
    }
    document.getElementById("pay-section").hidden = false;
  }

  function renderIndex(info) {
    var items = [
      ["正式通告", "通告連結", info["通告日期"] || ""],
      ["規則（投票、訂金、截止）", "規則連結", info["規則凍結日期"] ? "已凍結 " + info["規則凍結日期"] : ""],
      ["收費計法及場地", "詳細頁連結", info["詳細頁版本"] || ""]
    ];
    var ul = document.getElementById("index");
    items.forEach(function (it) {
      var href = safeUrl(info[it[1]] || "");
      if (!href) return;
      var a = el("a");
      a.href = href;
      a.appendChild(el("span", it[0]));
      a.appendChild(el("span", it[2]));
      var li = el("li");
      li.appendChild(a);
      ul.appendChild(li);
    });
    document.getElementById("idx-section").hidden = false;
  }

  function setFooter() {
    [["src-summary", config.summaryCsvUrl], ["src-info", config.infoCsvUrl]].forEach(function (s) {
      var a = document.getElementById(s[0]);
      var abs = new URL(s[1] || "", location.href).href;
      a.href = abs; a.textContent = abs;
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

  function load(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("讀取資料失敗（" + res.status + "）");
      return res.text();
    }).then(function (text) {
      var rows = parseCsv(text);
      if (rows.length < 2) throw new Error("資料是空的");
      return rows;
    });
  }

  setFooter();
  if (config.isDemo) document.getElementById("demo-banner").hidden = false;

  var status = document.getElementById("status");
  Promise.all([load(config.infoCsvUrl), load(config.summaryCsvUrl)])
    .then(function (res) {
      var now = new Date();
      var info = readInfo(res[0]);
      var payees = readSummary(res[1]);
      renderHeader(info);
      renderNow(info, now);
      renderProgress(payees, info);
      renderPayees(payees, info, now);
      renderIndex(info);
      status.textContent = "資料讀取時間：" + now.toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" });
    })
    .catch(function (err) {
      status.textContent = "";
      var box = document.getElementById("error");
      box.textContent = "暫時未能顯示資料：" + err.message + "。請以統籌的正式通告為準。";
      box.hidden = false;
    });

  // 給測試用。
  window.OGD_TEST = { parseCsv: parseCsv, daysSince: daysSince, formatDeadline: formatDeadline, safeUrl: safeUrl };
})();
