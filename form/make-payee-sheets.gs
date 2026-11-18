/**
 * K3 畢業晚宴：開四班「收款核對」試算表（2026-11-18）
 *
 * 做甚麼：讀「已寄付款指示」分頁，每班開一份獨立的新試算表，列出已寄付款指示的家庭（班別學號、人數、訂金），
 * 讓該班收款人逐家勾選「已收」、填收款日期及備註。統籌可隨時打開四份表監察；Google 的版本記錄會留下誰在何時勾選。
 *
 * 為甚麼每班一份獨立試算表：Google 試算表不能只分享一個分頁。收款人如在「K3 畢業晚宴回應」試算表有編輯權，
 * 就看得到全級家長的電郵、人數及投票內容。所以每位收款人只拿到自己班的一份，而且只有班別學號、人數及訂金，沒有電郵。
 *
 * 必須由統籌在籌委會帳戶執行（新試算表的擁有人就是執行者），開發者不可執行。
 *
 * 用法（統籌）：
 *   1. 等付款指示全部寄完（「付款指示預覽」分頁沒有「會寄」）才執行。
 *   2. 在「K3 畢業晚宴回應」試算表：擴充功能 → Apps Script，新增檔案（例如 payee-sheets），貼上整個檔案。
 *      可以和 send-deposit-emails 放在同一個專案，名稱都加了 pay 字頭，不會互相影響。
 *   3. 在 PAY_SHARE 填四位收款人的 Google 帳戶電郵（只在這裏填，不要寫入 GitHub）。留空的班別不會自動分享，可之後人手分享。
 *   4. 執行 makePayeeSheets。第一次會要求授權（Google 試算表及 Google 雲端硬碟）。
 *      完成後，回應試算表會多一個「收款核對表」分頁，列出四份表的連結。
 *   5. 之後再有新寄出的付款指示（例如遲寄、加人），再執行一次 makePayeeSheets：
 *      已開的表不會重開，只會在表底加上新的家庭，收款人已勾選的不受影響。
 *
 * 收款人可以改：「已收」勾選框、「收款日期」、「備註」三欄。其他欄（班別學號、人數、訂金）已保護，只有統籌可以改。
 * 表內不能排序（受保護），所以勾選一定跟着那一家，不會錯配。
 */

// ---------- 要填的設定 ----------
// 四位收款人的 Google 帳戶電郵（要用 Google 帳戶才可以勾選）。只在這裏填，不要寫入 GitHub。
var PAY_SHARE = {
  K3A: "",
  K3B: "",
  K3C: "",
  K3D: ""
};

// ---------- 以下不用改 ----------
var PAY_SRC = "已寄付款指示";      // 欄位：A 寄出時間、B 班別學號、C 電郵、D 人數、E 訂金
var PAY_INDEX = "收款核對表";      // 在回應試算表內記錄四份表的連結
var PAY_HEAD = ["班別學號", "人數", "訂金", "已收", "收款日期", "備註"];
var PAY_CLASSES = ["K3A", "K3B", "K3C", "K3D"];

// 由「已寄付款指示」分頁讀出每班的家庭。合併的家庭（例如 "K3D 1+K3D 2"）算入第一個班別學號的班。
function payRowsByClass(values) {
  var out = {};
  PAY_CLASSES.forEach(function (c) { out[c] = []; });
  var seen = {};
  values.slice(1).forEach(function (r) {
    var key = String(r[1]).trim();
    if (!key || seen[key]) return;
    var cls = key.slice(0, 3);
    if (!out[cls]) return;
    seen[key] = true;
    out[cls].push([key, Number(r[3]) || 0, Number(r[4]) || 0]);
  });
  return out;
}

function payIndexSheet(ss) {
  var sh = ss.getSheetByName(PAY_INDEX);
  if (!sh) {
    sh = ss.insertSheet(PAY_INDEX);
    sh.appendRow(["班別", "試算表連結", "分享給", "建立時間"]);
  }
  return sh;
}

function payExisting(indexSheet) {
  var map = {};
  indexSheet.getDataRange().getValues().slice(1).forEach(function (r) {
    if (r[0] && r[1]) map[String(r[0])] = String(r[1]);
  });
  return map;
}

function payNewSheet(cls) {
  var file = SpreadsheetApp.create(cls + " 收款核對（K3 畢業晚宴）");
  var sh = file.getSheets()[0];
  sh.setName("收款核對");
  sh.getRange(1, 1, 1, PAY_HEAD.length).setValues([PAY_HEAD]).setFontWeight("bold");
  sh.setFrozenRows(1);

  // 統計（只供參考，受保護）
  sh.getRange("H1:I3").setValues([
    ["已收家數", '=COUNTIF(D2:D,TRUE)'],
    ["已收訂金", '=SUMIF(D2:D,TRUE,C2:C)'],
    ["應收訂金", '=SUM(C2:C)']
  ]);
  sh.getRange("I2:I3").setNumberFormat("$#,##0");
  sh.getRange("C2:C").setNumberFormat("$#,##0");
  sh.getRange("E2:E").setNumberFormat("yyyy-mm-dd")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false)
      .setHelpText("請填收款日期，例如 2026-11-19").build());
  sh.setColumnWidth(1, 120);
  sh.setColumnWidth(6, 260);

  // 保護整張表，只開放 D（已收）、E（收款日期）、F（備註）三欄給收款人。
  var p = sh.protect().setDescription("只可改已收、收款日期、備註");
  p.setUnprotectedRanges([sh.getRange("D2:F")]);
  var me = Session.getEffectiveUser();
  p.addEditor(me);
  p.removeEditors(p.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
  if (p.canDomainEdit()) p.setDomainEdit(false);

  var share = String(PAY_SHARE[cls] || "").trim();
  if (share) file.addEditor(share);
  return { file: file, share: share };
}

// 在表底加上未列出的家庭，已有的不動。
function payAppend(sh, rows) {
  // 只看 A 欄的最後一行（H、I 欄的統計不算）。
  var colA = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
  var have = {}, last = 1;
  colA.forEach(function (r, i) { var v = String(r[0]).trim(); if (v) { have[v] = true; last = i + 1; } });
  var add = rows.filter(function (r) { return !have[r[0]]; });
  if (!add.length) return 0;
  var start = last + 1;
  sh.getRange(start, 1, add.length, 3).setValues(add);
  sh.getRange(start, 4, add.length, 1).insertCheckboxes();
  return add.length;
}

function makePayeeSheets() {
  var ss = SpreadsheetApp.getActive();
  var src = ss.getSheetByName(PAY_SRC);
  if (!src) throw new Error("找不到「" + PAY_SRC + "」分頁。請先用 send-deposit-emails 寄出付款指示。");
  var byClass = payRowsByClass(src.getDataRange().getValues());
  var index = payIndexSheet(ss);
  var existing = payExisting(index);
  var report = [];

  PAY_CLASSES.forEach(function (cls) {
    var sh, added;
    if (existing[cls]) {
      sh = SpreadsheetApp.openByUrl(existing[cls]).getSheetByName("收款核對");
      added = payAppend(sh, byClass[cls]);
      report.push(cls + "：已有，新加 " + added + " 家");
    } else {
      var made = payNewSheet(cls);
      sh = made.file.getSheetByName("收款核對");
      added = payAppend(sh, byClass[cls]);
      index.appendRow([cls, made.file.getUrl(), made.share || "（未分享，請人手分享）", new Date()]);
      report.push(cls + "：新開，列出 " + added + " 家" + (made.share ? "，已分享" : "，未分享"));
    }
  });
  Logger.log(report.join("\n"));
}
