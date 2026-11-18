/**
 * K3 畢業晚宴：收款人核對表（2026-11-18）
 *
 * 為甚麼：收款人收到家長的轉帳截圖後，要知道該家庭應付多少，才可以核實。
 * 這個 script 為每班收款人建立一份獨立的 Google 試算表，只有該班的家庭，欄位只有核對需要的資料
 * （班別學號、學生名、大人、小朋友、應收訂金、轉帳備註），不含電郵、電話。
 * 收款人核實後剔「已核實」並填日期；統籌可以隨時打開四份表看進度。
 *
 * 人數及金額與付款指示電郵同一來源（send-deposit-emails.gs 的 depFamilies，已計「調整」分頁及 DEP_MERGE 合併），
 * 所以收款人看到的應收金額，一定與家長收到的電郵相同。
 *
 * 必須放在與 send-deposit-emails.gs 同一個 Apps Script 專案，由統籌在籌委會帳戶執行。開發者不可執行。
 *
 * 用法（統籌）：
 *   1. 在同一個 Apps Script 專案按 ＋ → Script，新增檔案（例如叫 payee-lists），貼上整個檔案，儲存。
 *   2. 執行 makePayeeLists。試算表會多一個「收款人核對表」分頁，列出四份核對表的連結。
 *   3. 逐份打開，按 Share，只分享給該班收款人的 Google 帳戶（Editor）。不要用「知道連結的人」。
 *   4. 之後有人加人或新報名、或「調整」分頁改了人數，再執行 makePayeeLists：
 *      新的家庭會加在最後；已有的家庭如人數或金額改了，會更新人數、金額並在「備註」寫明；收款人剔過的「已核實」不會被清走。
 *   5. 執行 payeeProgress，「收款人核對表」分頁會更新每班已核實／未核實的家庭數及金額。
 */

var PAY_INDEX = "收款人核對表";
var PAY_HEAD = ["班別學號", "學生名", "大人", "小朋友", "人數", "應收訂金", "轉帳備註", "已核實", "核實日期", "備註"];

function payIndexSheet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(PAY_INDEX);
  if (!sh) {
    sh = ss.insertSheet(PAY_INDEX);
    sh.appendRow(["班別", "核對表連結", "家庭數", "已核實家庭", "未核實家庭", "應收總額", "已核實金額", "更新時間"]);
  }
  return sh;
}

function payFileFor(cls, index) {
  var rows = index.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === cls && rows[i][1]) return SpreadsheetApp.openByUrl(rows[i][1]);
  }
  var file = SpreadsheetApp.create("K3 畢業晚宴 交訂金核對表 " + cls);
  var sh = file.getSheets()[0];
  sh.setName("名單");
  sh.appendRow(PAY_HEAD);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, PAY_HEAD.length).setFontWeight("bold");
  index.appendRow([cls, file.getUrl()]);
  return file;
}

function makePayeeLists() {
  depCheckSettings();
  var index = payIndexSheet();
  var fams = depFamilies();
  Object.keys(DEP_PAYEES).forEach(function (cls) {
    var sh = payFileFor(cls, index).getSheetByName("名單");
    var have = {};
    sh.getDataRange().getValues().slice(1).forEach(function (r, i) { have[r[0]] = i + 2; });
    fams.filter(function (f) { return f.cls === cls; }).forEach(function (f) {
      var note = f.cls + " " + f.no + " " + f.name;
      var why = [f.undecided ? "投票時未決定" : "", f.merged ? "合併：" + f.merged.join("、") : "", f.fixed ? "人數已調整" + (f.fixReason ? "：" + f.fixReason : "") : ""]
        .filter(String).join("；");
      var row = have[f.key];
      if (!row) {
        sh.appendRow([f.key, f.name, f.adults, f.kids, f.total, f.amount, note, false, "", why]);
        sh.getRange(sh.getLastRow(), 8).insertCheckboxes();
        return;
      }
      var old = sh.getRange(row, 3, 1, 4).getValues()[0];
      if (old[0] !== f.adults || old[1] !== f.kids || old[3] !== f.amount) {
        sh.getRange(row, 3, 1, 4).setValues([[f.adults, f.kids, f.total, f.amount]]);
        var memo = sh.getRange(row, 10).getValue();
        sh.getRange(row, 10).setValue((memo ? memo + "；" : "") + Utilities.formatDate(new Date(), "Asia/Hong_Kong", "M/d") +
          " 人數由 " + old[0] + " 大 " + old[1] + " 小改為 " + f.adults + " 大 " + f.kids + " 小");
      }
    });
    sh.autoResizeColumns(1, PAY_HEAD.length);
  });
  payeeProgress();
  Logger.log("已建立／更新四份核對表，連結在「" + PAY_INDEX + "」分頁。記得逐份只分享給該班收款人。");
}

function payeeProgress() {
  var index = payIndexSheet();
  var rows = index.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][1]) continue;
    var data = SpreadsheetApp.openByUrl(rows[i][1]).getSheetByName("名單").getDataRange().getValues().slice(1);
    var done = data.filter(function (r) { return r[7] === true; });
    var sum = function (list) { return list.reduce(function (s, r) { return s + (Number(r[5]) || 0); }, 0); };
    index.getRange(i + 1, 3, 1, 6).setValues([[data.length, done.length, data.length - done.length, sum(data), sum(done), new Date()]]);
  }
}
