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
 *   2. 填好下面「要填的設定」：截止時間、統籌聯絡方法、四位收款人的電話及名稱（從舊報名表格 Apps Script 的 DEP_PAYEES 抄過來）。
 *   2b. 執行 listSameEmail，看「同一電郵」分頁：同一家庭有兩位畢業生（孖生或不同班）的，加入 DEP_MERGE。
 *   3. 執行 previewEmails：只會建立「付款指示預覽」分頁，逐封列出收件人、金額及內容，不寄任何電郵。逐行核對。
 *   4. 執行 sendTestToMe：把第一封寄給你自己，用手機看一次。
 *   5. 確認無誤，執行 sendAll。每次最多寄 MAX_PER_RUN 封；隔一兩小時再執行 sendAll，會由未寄的繼續。
 *      先寄第一批後，問幾位家長有沒有收到、是否在垃圾郵件，才寄下一批。
 *   後備：如電郵寄不出或被封，「付款指示預覽」分頁已有每家的內容，可以由統籌或收款人逐家 WhatsApp。
 *
 * 同一個 Apps Script 專案內可能已有舊報名表格的 script（PAYEES、money 等），所以這裏的名稱都加了 dep 字頭，不會互相影響。
 *
 * 「點票」分頁的欄位（沒有標題行）：A 時間戳、B 電郵、C 出席、G 班別、H 學號、I 學生名、J 大人、K 小朋友。
 */

// ---------- 要填的設定 ----------
var DEP_DEADLINE = "11 月 20 日（星期五）晚上 11 時 59 分";   // 2026-11-18 Ken：11/20 23:59:59
var COORDINATOR = "〔統籌聯絡方法〕";   // 例如 "統籌 WhatsApp 9xxx xxxx"（只在這裏填，不要寫入 GitHub）
var REPLY_DAYS = 3;                     // 收款人收到截圖後幾日內回覆核實
var DEP_PER_HEAD = 550;                      // 每位訂金（不退）
var INCLUDE_UNDECIDED = true;           // 2026-11-18 Ken：「未決定」的家庭也寄
var MAX_PER_RUN = 25;                   // 每次 sendAll 最多寄幾封。新開的 Gmail 一次大量寄出容易被當成垃圾郵件，分幾批、相隔一段時間再寄。

// 每班一位收款人。acct = FPS／PayMe 電話；name = 轉帳確認畫面顯示的收款人名稱（遮蓋版）。
// 舊報名表格的 script 在同一個專案並已填好的話，留着〔〕佔位字即可，會自動沿用（見 depUseOldPayees）。
var DEP_PAYEES = {
  K3A: { method: "FPS",   acct: "〔電話〕", name: "〔收款人名稱〕" },
  K3B: { method: "PayMe", acct: "〔電話〕", name: "〔收款人名稱〕" },
  K3C: { method: "PayMe", acct: "〔電話〕", name: "〔收款人名稱〕" },
  K3D: { method: "PayMe", acct: "〔電話〕", name: "〔收款人名稱〕" }
};

// 合併：同一家庭有兩位畢業生（孖生，或在不同班的兄弟姊妹），各自交了投票，每份都填了全家人數。
// 投票照計兩票，但訂金只收一次。每組寫明包括哪幾個班別＋學號，以及全家實際出席人數（統籌向家長確認）。
// 合併後只寄一封，付給第一個班別學號所屬班的收款人。執行 listSameEmail 可列出同一電郵有多份出席回應的，幫助找出要合併的家庭
// （統籌代填的不同家庭也會列出，要逐個判斷，不要全部合併）。
var DEP_MERGE = [
  { keys: ["K3D 1", "K3D 2"], adults: 2, kids: 2 }   // 孖生，2026-11-17 Ken 確認全家 2 大 2 小
];

// 不自動寄、由統籌親手處理的班別＋學號。
var DEP_MANUAL = [];

// ---------- 以下不用改 ----------
var SRC = "點票", LOG = "已寄付款指示", PREVIEW = "付款指示預覽";

function depMoney(n) { return "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

// 如同一個 Apps Script 專案內已有舊報名表格的 script，而它的 PAYEES 已填好真資料（A/B/C/D 四行），
// 就直接沿用，不用再抄一次；DEP_PAYEES 填了的班別則以 DEP_PAYEES 為準。
function depUseOldPayees() {
  if (typeof PAYEES === "undefined") return;
  Object.keys(DEP_PAYEES).forEach(function (cls) {
    var mine = DEP_PAYEES[cls], old = PAYEES[cls.slice(-1)];
    if (!/〔|〕/.test(mine.acct + mine.name) || !old || /〔|〕/.test(old.acct + old.name)) return;
    DEP_PAYEES[cls] = { method: old.method, acct: old.acct, name: old.name };
  });
}

function depCheckSettings() {
  depUseOldPayees();
  var all = DEP_DEADLINE + COORDINATOR;
  Object.keys(DEP_PAYEES).forEach(function (k) { all += DEP_PAYEES[k].acct + DEP_PAYEES[k].name; });
  if (/〔|〕/.test(all)) throw new Error("請先填好「要填的設定」：截止時間、統籌聯絡方法及四位收款人的電話和名稱（仍有〔〕佔位字）。");
}

function depFamilies() {
  var rows = SpreadsheetApp.getActive().getSheetByName(SRC).getDataRange().getValues();
  var out = [];
  rows.forEach(function (r) {
    var attend = String(r[2]).trim();
    if (attend !== "會出席" && !(INCLUDE_UNDECIDED && attend === "未決定")) return;
    var f = {
      email: String(r[1]).trim(), cls: String(r[6]).trim(), no: String(r[7]).trim(), name: String(r[8]).trim(),
      adults: Number(r[9]) || 0, kids: Number(r[10]) || 0, undecided: attend === "未決定"
    };
    f.key = f.cls + " " + f.no;
    f.total = f.adults + f.kids;
    f.amount = f.total * DEP_PER_HEAD;
    if (!f.email || !DEP_PAYEES[f.cls] || !f.no || !f.total) throw new Error("「點票」有一行資料不完整：" + r.join(" | "));
    f.label = f.key + " 號（" + f.name + "）";
    out.push(f);
  });
  return depApplyMerge(out);
}

function depApplyMerge(list) {
  DEP_MERGE.forEach(function (g) {
    var parts = g.keys.map(function (k) {
      var hit = list.filter(function (f) { return f.key === k; })[0];
      if (!hit) throw new Error("DEP_MERGE 的 " + k + " 在「點票」找不到會出席的回應，請檢查。");
      return hit;
    });
    var first = parts[0];
    var merged = {
      email: first.email, cls: first.cls, no: first.no, name: first.name,
      adults: g.adults, kids: g.kids, total: g.adults + g.kids,
      key: g.keys.join("+"),
      label: parts.map(function (f) { return f.key + " 號（" + f.name + "）"; }).join("及"),
      merged: g.keys
    };
    merged.amount = merged.total * DEP_PER_HEAD;
    var emails = {};
    parts.forEach(function (f) { emails[f.email] = true; });
    merged.email = Object.keys(emails).join(",");   // 不同電郵的話，兩個都寄
    list = list.filter(function (f) { return g.keys.indexOf(f.key) < 0; });
    list.push(merged);
  });
  return list;
}

// 列出同一電郵有多於一份出席回應的，寫入「同一電郵」分頁，幫助統籌判斷哪些是同一家庭要合併。
function listSameEmail() {
  var byEmail = {};
  SpreadsheetApp.getActive().getSheetByName(SRC).getDataRange().getValues().forEach(function (r) {
    var attend = String(r[2]).trim();
    if (attend === "不會出席" || !attend) return;
    var e = String(r[1]).trim();
    (byEmail[e] = byEmail[e] || []).push([e, String(r[6]) + " " + String(r[7]), String(r[8]), Number(r[9]) || 0, Number(r[10]) || 0, attend]);
  });
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("同一電郵") || ss.insertSheet("同一電郵");
  sh.clear();
  sh.appendRow(["電郵", "班別學號", "學生名", "大人", "小朋友", "出席"]);
  Object.keys(byEmail).forEach(function (e) {
    if (byEmail[e].length > 1) byEmail[e].forEach(function (row) { sh.appendRow(row); });
  });
}

function depMessage(f) {
  var p = DEP_PAYEES[f.cls];
  var note = f.cls + " " + f.no + " " + f.name;
  var subject = "K3 畢業晚宴：交訂金指示（" + f.key + " 號）";
  var body = [
    "你好，",
    "",
    "多謝你參與投票。投票結果已在網站公布：https://open-grad-din.github.io/open-grad-din/",
    "",
    f.undecided
      ? "你在投票表格填了 " + f.label + " 未決定是否出席。如決定出席，請在期限前交訂金，名額才算確認；期限前沒有交訂金，當作不出席。"
      : "你在投票表格填了 " + f.label + " 會出席。現在請交訂金，名額才算確認。",
    f.merged ? "你家有 " + f.merged.length + " 位畢業生，訂金按全家實際人數只收一次，以下人數已和你確認。" : null,
    "",
    "人數：大人 " + f.adults + " 位 + 小朋友 " + f.kids + " 位 = " + f.total + " 位",
    "訂金：" + depMoney(f.amount) + "（" + f.total + " 位 × " + depMoney(DEP_PER_HEAD) + "）",
    "",
    "轉帳到：" + p.method + " " + p.acct,
    "收款人名稱：" + p.name + "（轉帳前請核對；名稱不對，請不要轉帳，先聯絡統籌）",
    "轉帳備註：" + note,
    "期限：" + DEP_DEADLINE,
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
  ].filter(function (x) { return x !== null; }).join("\n");
  return { subject: subject, body: body };
}

function depSentKeys() {
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
  depCheckSettings();
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(PREVIEW) || ss.insertSheet(PREVIEW);
  sh.clear();
  sh.appendRow(["班別學號", "電郵", "人數", "訂金", "處理", "標題", "內容"]);
  var sent = depSentKeys().keys;
  depFamilies().forEach(function (f) {
    var m = depMessage(f);
    var how = DEP_MANUAL.indexOf(f.key) >= 0 ? "統籌親手處理" : sent[f.key] ? "已寄" : "會寄";
    sh.appendRow([f.key, f.email, f.total, f.amount, how, m.subject, m.body]);
  });
}

// 把第一封寄給執行者自己，用來檢查格式。
function sendTestToMe() {
  depCheckSettings();
  var f = depFamilies()[0];
  var m = depMessage(f);
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: "【測試】" + m.subject, body: m.body, name: "K3 畢業晚宴籌委會" });
}

// 寄給所有未寄的家庭。可重複執行，已寄的會略過。
function sendAll() {
  depCheckSettings();
  var log = depSentKeys();
  var sentNow = 0;
  depFamilies().forEach(function (f) {
    if (DEP_MANUAL.indexOf(f.key) >= 0 || log.keys[f.key]) return;
    if (sentNow >= MAX_PER_RUN || MailApp.getRemainingDailyQuota() < 1) return;
    var m = depMessage(f);
    MailApp.sendEmail({ to: f.email, subject: m.subject, body: m.body, name: "K3 畢業晚宴籌委會" });
    log.sheet.appendRow([new Date(), f.key, f.email, f.total, f.amount]);
    log.keys[f.key] = true;
    (f.merged || []).forEach(function (k) { log.keys[k] = true; });
    sentNow++;
  });
  Logger.log("今次寄出 " + sentNow + " 封。今日餘額：" + MailApp.getRemainingDailyQuota() + "。");
}
