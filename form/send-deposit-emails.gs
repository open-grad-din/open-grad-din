/**
 * K3 畢業晚宴：第二階段「交訂金」付款指示電郵（2026-11-16）
 *
 * 做甚麼：讀試算表「點票」分頁（已去重、已扣除「不計」分頁），向每個「會出席」的家庭寄一封付款指示，
 * 寫明人數、訂金金額、收款人、轉帳備註及期限。每寄出一封，就在「已寄付款指示」分頁記一行；
 * 再執行時，已寄過的班別＋學號會略過，不會重複寄。
 *
 * 2026-11-16 Ken 決定：報名已在投票時完成，第二階段只交訂金，不用新表格；付款後截圖 WhatsApp 給收款人，
 * 收款人核實後回覆家長；不收截圖上傳、不做自動核實。
 *
 * 必須由統籌在她自己的 Google 帳戶執行（電郵由她的帳戶寄出），開發者不可執行。
 *
 * 用法（統籌）：
 *   1. 在「K3 畢業晚宴回應」試算表：擴充功能 → Apps Script，新增檔案，貼上整個檔案。
 *   2. 填好下面「要填的設定」：截止時間、統籌聯絡方法、四位收款人的電話及名稱（從舊報名表格 Apps Script 的 PAYEES 抄過來）。
 *   3. 執行 previewEmails：只會建立「付款指示預覽」分頁，逐封列出收件人、金額及內容，不寄任何電郵。逐行核對。
 *   4. 執行 sendTestToMe：把第一封寄給你自己，用手機看一次。
 *   5. 確認無誤，執行 sendAll。Gmail 每日約可寄 100 封；不夠的話，明天再執行 sendAll，會由未寄的繼續。
 *
 * 「點票」分頁的欄位（沒有標題行）：A 時間戳、B 電郵、C 出席、G 班別、H 學號、I 學生名、J 大人、K 小朋友。
 */

// ---------- 要填的設定 ----------
var DEADLINE = "〔截止日期〕";          // 例如 "12 月 1 日（星期二）晚上 10 時"
var COORDINATOR = "〔統籌聯絡方法〕";   // 例如 "統籌 WhatsApp 9xxx xxxx"（只在這裏填，不要寫入 GitHub）
var REPLY_DAYS = 3;                     // 收款人收到截圖後幾日內回覆核實
var DEPOSIT = 550;                      // 每位訂金（不退）
var INCLUDE_UNDECIDED = false;          // 「未決定」的家庭是否一併寄（待籌委會決定）

// 每班一位收款人。acct = FPS／PayMe 電話；name = 轉帳確認畫面顯示的收款人名稱（遮蓋版）。
var PAYEES = {
  K3A: { method: "FPS",   acct: "〔電話〕", name: "〔收款人名稱〕" },
  K3B: { method: "PayMe", acct: "〔電話〕", name: "〔收款人名稱〕" },
  K3C: { method: "PayMe", acct: "〔電話〕", name: "〔收款人名稱〕" },
  K3D: { method: "PayMe", acct: "〔電話〕", name: "〔收款人名稱〕" }
};

// 不自動寄、由統籌親手處理的班別＋學號（例如孖生兩份回應屬同一家庭，要合併成一封，避免人數計兩次）。
var MANUAL = ["K3D 1", "K3D 2"];

// ---------- 以下不用改 ----------
var SRC = "點票", LOG = "已寄付款指示", PREVIEW = "付款指示預覽";

function money(n) { return "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

function checkSettings() {
  var all = DEADLINE + COORDINATOR;
  Object.keys(PAYEES).forEach(function (k) { all += PAYEES[k].acct + PAYEES[k].name; });
  if (/〔|〕/.test(all)) throw new Error("請先填好「要填的設定」：截止時間、統籌聯絡方法及四位收款人的電話和名稱（仍有〔〕佔位字）。");
}

function families() {
  var rows = SpreadsheetApp.getActive().getSheetByName(SRC).getDataRange().getValues();
  var out = [];
  rows.forEach(function (r) {
    var attend = String(r[2]).trim();
    if (attend !== "會出席" && !(INCLUDE_UNDECIDED && attend === "未決定")) return;
    var f = {
      email: String(r[1]).trim(), cls: String(r[6]).trim(), no: String(r[7]).trim(), name: String(r[8]).trim(),
      adults: Number(r[9]) || 0, kids: Number(r[10]) || 0
    };
    f.key = f.cls + " " + f.no;
    f.total = f.adults + f.kids;
    f.amount = f.total * DEPOSIT;
    if (!f.email || !PAYEES[f.cls] || !f.no || !f.total) throw new Error("「點票」有一行資料不完整：" + r.join(" | "));
    out.push(f);
  });
  return out;
}

function message(f) {
  var p = PAYEES[f.cls];
  var note = f.cls + " " + f.no + " " + f.name;
  var subject = "K3 畢業晚宴：交訂金指示（" + f.key + " 號）";
  var body = [
    "你好，",
    "",
    "多謝你參與投票。投票結果已在網站公布：https://open-grad-din.github.io/open-grad-din/",
    "",
    "你在投票表格填了 " + f.key + " 號（" + f.name + "）會出席。現在請交訂金，名額才算確認。",
    "",
    "人數：大人 " + f.adults + " 位 + 小朋友 " + f.kids + " 位 = " + f.total + " 位",
    "訂金：" + money(f.amount) + "（" + f.total + " 位 × " + money(DEPOSIT) + "）",
    "",
    "轉帳到：" + p.method + " " + p.acct,
    "收款人名稱：" + p.name + "（轉帳前請核對；名稱不對，請不要轉帳，先聯絡統籌）",
    "轉帳備註：" + note,
    "期限：" + DEADLINE,
    "",
    "轉帳後：請截圖，WhatsApp 給收款人 " + p.acct + "。截圖要看到金額、日期及轉帳備註。",
    "收款人會對照轉帳紀錄核實，並在 " + REPLY_DAYS + " 日內 WhatsApp 回覆你。請保留這個回覆作紀錄。",
    REPLY_DAYS + " 日內沒有收到回覆，請聯絡統籌：" + COORDINATOR,
    "",
    "請留意：",
    "・只付給以上收款人。其他人叫你轉帳都不要理會。",
    "・訂金不設退款。人數只可以加，不可以減。",
    "・人數有誤或想加人，請先聯絡統籌，不要自行更改金額。",
    "・期限後仍未交訂金，當作不出席；之後想參加，要視乎當時場地能否加位。",
    "・晚宴最後按實際成本收費，每位不會超過 $1,100；尾數會另行通知。",
    "",
    "這封電郵由籌委會統籌的帳戶寄出，請保留作紀錄。",
    "K3 畢業晚宴籌委會"
  ].join("\n");
  return { subject: subject, body: body };
}

function sentKeys() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(LOG);
  if (!sh) {
    sh = ss.insertSheet(LOG);
    sh.appendRow(["寄出時間", "班別學號", "電郵", "人數", "訂金"]);
  }
  var keys = {};
  sh.getDataRange().getValues().slice(1).forEach(function (r) { keys[r[1]] = true; });
  return { sheet: sh, keys: keys };
}

// 只建立預覽分頁，不寄電郵。
function previewEmails() {
  checkSettings();
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(PREVIEW) || ss.insertSheet(PREVIEW);
  sh.clear();
  sh.appendRow(["班別學號", "電郵", "人數", "訂金", "處理", "標題", "內容"]);
  var sent = sentKeys().keys;
  families().forEach(function (f) {
    var m = message(f);
    var how = MANUAL.indexOf(f.key) >= 0 ? "統籌親手處理" : sent[f.key] ? "已寄" : "會寄";
    sh.appendRow([f.key, f.email, f.total, f.amount, how, m.subject, m.body]);
  });
}

// 把第一封寄給執行者自己，用來檢查格式。
function sendTestToMe() {
  checkSettings();
  var f = families()[0];
  var m = message(f);
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: "【測試】" + m.subject, body: m.body, name: "K3 畢業晚宴籌委會" });
}

// 寄給所有未寄的家庭。可重複執行，已寄的會略過。
function sendAll() {
  checkSettings();
  var log = sentKeys();
  var sentNow = 0;
  families().forEach(function (f) {
    if (MANUAL.indexOf(f.key) >= 0 || log.keys[f.key]) return;
    if (MailApp.getRemainingDailyQuota() < 1) return;
    var m = message(f);
    MailApp.sendEmail({ to: f.email, subject: m.subject, body: m.body, name: "K3 畢業晚宴籌委會" });
    log.sheet.appendRow([new Date(), f.key, f.email, f.total, f.amount]);
    log.keys[f.key] = true;
    sentNow++;
  });
  Logger.log("今次寄出 " + sentNow + " 封。今日餘額：" + MailApp.getRemainingDailyQuota() + "。");
}
