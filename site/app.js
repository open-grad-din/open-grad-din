// Open Grad Din 首頁：讀取統籌公開發佈的兩個 CSV 分頁並顯示。
// 這個檔案只「讀」資料，沒有任何寫入或上載功能。
// 公開分頁只有總數，沒有任何家庭或學生的資料。
(function () {
  "use strict";

  var config = window.OGD_CONFIG || {};

  // 流程的固定階段。資訊分頁的「現階段」必須是其中一項。
  var STAGES = ["籌委會公布規則", "報名、投票及交訂金", "公布投票結果", "收尾數", "晚宴"];
  // 進度條上顯示的短名（最多 5 個字）；資訊分頁的「現階段」仍用上面的全名。
  var STAGE_SHORT = ["公布規則", "報名交訂金", "公布結果", "收尾數", "晚宴"];
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
    // 截止一刻（香港時間）；沒有寫時間就當該日 23:59。
    var at = Date.UTC(+m[1], +m[2] - 1, +m[3], (m[4] ? Number(m[4]) : 23) - 8, m[5] ? Number(m[5]) : 59);
    return { label: label, daysLeft: dayLeft, at: at };
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

  var DINNER = Date.UTC(2027, 6, 2);
  function hkToday(now) {
    var hk = new Date(now.getTime() + 8 * 3600 * 1000);
    return Date.UTC(hk.getUTCFullYear(), hk.getUTCMonth(), hk.getUTCDate());
  }

  function renderCountdown(now) {
    var d = Math.round((DINNER - hkToday(now)) / 86400000);
    var box = document.getElementById("days");
    var enso = document.getElementById("enso");
    if (d > 0) {
      box.textContent = String(d);
      enso.setAttribute("aria-label", "距離晚宴還有 " + d + " 日");
    } else {
      box.textContent = d === 0 ? "今晚" : "完";
      box.parentNode.firstChild.textContent = d === 0 ? "晚宴就在" : "晚宴已舉行";
      box.parentNode.lastChild.textContent = "";
      enso.setAttribute("aria-label", d === 0 ? "晚宴就在今晚" : "晚宴已舉行");
    }
  }

  function renderNow(info, now) {
    var stage = info["現階段"] || "";
    var cur = STAGES.indexOf(stage);
    document.getElementById("stage").textContent = stage || "請留意正式通告";

    var dl = info["截止時間"] ? formatDeadline(info["截止時間"], now) : null;
    if (dl) {
      var p = document.getElementById("deadline");
      p.textContent = "";
      p.appendChild(el("span", "截止倒數", "dl-label"));
      var timer = el("span", undefined, "timer");
      var cells = ["日", "時", "分", "秒"].map(function (u) {
        var b = el("b", "0");
        timer.appendChild(b);
        timer.appendChild(el("small", u));
        return b;
      });
      p.appendChild(timer);
      p.appendChild(el("span", "截止：" + dl.label, "dl-date"));
      p.hidden = false;
      var pad = function (n) { return (n < 10 ? "0" : "") + n; };
      var tick = function () {
        var left = Math.floor((dl.at - Date.now()) / 1000);
        if (left <= 0) {
          timer.textContent = "";
          timer.appendChild(el("span", "已截止", "left"));
          clearInterval(id);
          return;
        }
        cells[0].textContent = String(Math.floor(left / 86400));
        cells[1].textContent = pad(Math.floor(left / 3600) % 24);
        cells[2].textContent = pad(Math.floor(left / 60) % 60);
        cells[3].textContent = pad(left % 60);
      };
      var id = setInterval(tick, 1000);
      tick();
    }

    var href = safeUrl(info["行動連結"] || "");
    if (href && info["行動掣文字"]) {
      var a = document.getElementById("action");
      a.href = href;
      a.textContent = info["行動掣文字"];
      a.hidden = false;
      setTimeout(function () { a.classList.add("shine"); }, document.documentElement.className.indexOf("intro") !== -1 ? 1900 : 300);
    }
    if (info["行動說明"]) {
      var note = document.getElementById("action-note");
      note.textContent = info["行動說明"];
      note.hidden = false;
    }

    var steps = document.getElementById("steps");
    STAGES.forEach(function (s, i) {
      var li = el("li", STAGE_SHORT[i], cur === -1 ? "" : i < cur ? "done" : i === cur ? "cur" : "");
      li.title = s;
      if (i === cur) li.setAttribute("aria-current", "step");
      steps.appendChild(li);
    });
    document.getElementById("now-section").hidden = false;
  }

  function renderProgress(payees, info) {
    var verified = payees.reduce(function (s, p) { return s + p.verified; }, 0);
    var pending = payees.reduce(function (s, p) { return s + p.pending; }, 0);
    var grade = wholeNumber(info["全級人數"] || "");
    var num = document.getElementById("verified");
    document.getElementById("verified-of").textContent = grade ? "/" + grade + " 位畢業生" : " 位畢業生";

    var dots = document.getElementById("dots");
    if (grade) {
      var total = Math.max(grade, verified + pending);
      for (var i = 0; i < total; i++) {
        var d = el("i", undefined, i < verified ? "v" : i < verified + pending ? "p" : "");
        if (i < verified + pending) d.style.animationDelay = (i * 18) + "ms";
        dots.appendChild(d);
      }
      dots.setAttribute("aria-label", "全級約 " + grade + " 位畢業生，已核實 " + verified + " 位，等候核實 " + pending + " 位");
    } else {
      dots.hidden = true;
    }
    if (!pending) document.getElementById("key-p").hidden = true;
    document.getElementById("prog-section").hidden = false;

    var ui = window.OGD_UI;
    var seal = document.getElementById("seal");
    var go = function () {
      dots.classList.add("play");
      if (!ui) { num.textContent = String(verified); return; }
      ui.countUp(num, verified, 1200, function () { if (verified > 0) seal.classList.add("stamp"); });
    };
    if (verified === 0) seal.hidden = true;
    if (ui) ui.whenSeen(dots.hidden ? num : dots, go); else go();
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
  renderCountdown(new Date());
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
      document.getElementById("idx-section").hidden = false;
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
