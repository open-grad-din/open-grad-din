/**
 * K3 畢業晚宴：報名、投票及訂金 Google Form（v2）
 *
 * 這個檔案做三件事：
 *   1. buildForm：建立整張表格，連同一個收集回應的試算表。
 *   2. 建立「提交表格」觸發器（buildForm 會自動做）。
 *   3. onSubmit：每次有人提交，自動寄一封「付款指示」電郵，寫明準確金額、收款人及轉帳備註。
 *
 * 用法：
 *   1. 打開 https://script.google.com ，按 ☰ → New project。
 *   2. 刪除原有內容，貼上這整個檔案，按 Ctrl+S 儲存。
 *   3. 上方下拉選單選 buildForm，按 ▷ Run，按 Allow 授權。
 *   4. 按 Execution log，會看到表格編輯連結、填寫連結及試算表連結。
 *   5. 只執行一次。再執行會另外建立一張新表格。
 *
 * 建立後要在 Form 內人手完成（Apps Script 做不到）：
 *   - Settings → Responses → Send responders a copy of their response：Always
 *   - 「場地」題 → 右下 ⋮ → Shuffle option order（隨機排列選項）
 *   - 上方調色盤圖示（Customize theme）→ Color → ＋ → 輸入 00918a（與網站同一主題色）
 *
 * 場地選項（VENUES）必須與網站「我家要付多少」頁（site/venues-params.js）一致：每個菜式一個選項，
 * 金額是頁面顯示的「場地餐飲費每位約」。改名單時兩邊一起改，form/check-venues.js 會在部署時檢查。
 * 三個方案的人形圖（PLANS_IMAGE）直接截自網站「費用」頁，製作方法見 tools/form-image/。
 *
 * PROTOTYPE = true：原型。標題加「原型，請勿填寫」，收款人資料全部是佔位字，只可以用假資料試填。
 * 正式版必須由統籌在她自己的 Google 帳戶執行：把 PROTOTYPE 改為 false，填入 PAYEES 的真資料及 DEADLINE_DAYS。
 * 觸發器以執行者的帳戶運作，付款指示電郵由執行者的 Gmail 寄出，所以開發者不可以執行正式版。
 *
 * 限制：Gmail 個人帳戶每日最多寄給約 100 位收件人。一日內超過 100 個家庭提交，多出的付款指示電郵會寄不出；
 * 家長仍有表格內的金額表及 Google 寄出的回應副本。
 */

var PROTOTYPE = true;
var VERSION = "表格第 1 版 · 2026 年 11 月 3 日";
var DEPOSIT = 550;
var DEADLINE_DAYS = "〔X〕";   // 提交後多少日內轉帳，由籌委會決定，例如 "3"

var PAYEES = {
  A: { label: "收款人（A 班財務）", name: "〔A 班財務名字〕", fps: "〔FPS ID 或電話〕", classes: ["K3A", "K3B"] },
  C: { label: "收款人（C 班財務）", name: "〔C 班財務名字〕", fps: "〔FPS ID 或電話〕", classes: ["K3C", "K3D"] }
};

var SITE = "https://open-grad-din.github.io/open-grad-din/";
var PLANS_IMAGE = SITE + "form/plans.png";

// 場地：每個菜式一個選項，寫法「場地 · 級別 · 菜式 · 每位約 $X」，與網站「我家要付多少」頁一致。
var VENUES = [
  "康得思酒店 · 5 星酒店 · 自助餐 · 每位約 $537",
  "唯港薈 · 5 星酒店 · 自助餐 · 每位約 $758",
  "唯港薈 · 5 星酒店 · 自助餐（午餐菜單・晚上供應） · 每位約 $638",
  "美麗華酒店 · 5 星酒店 · 中式筵席 · 每位約 $600",
  "美麗華酒店 · 5 星酒店 · 自助餐 · 每位約 $635",
  "千禧新世界香港酒店 · 5 星酒店 · 自助餐 · 每位約 $680",
  "麗思卡爾頓 · 5 星酒店 · 自助餐 · 每位約 $825",
  "嘉里酒店 · 5 星酒店 · 自助餐 · 每位約 $825",
  "九龍海逸君綽酒店 · 5 星酒店 · 自助餐 · 每位約 $669",
  "海月（煌府） · 酒樓 · 中式筵席 · 每位約 $528",
  "囍薈 · 酒樓 · 中式筵席 · 每位約 $549",
  "彩福皇宴 · 酒樓 · 中式筵席 · 每位約 $540",
  "沙田美心皇宮 · 酒樓 · 中式筵席 · 每位約 $490",
  "中環美心皇宮 · 酒樓 · 中式筵席 · 每位約 $728"
];

// 勝出規則：照抄網站「費用」頁（site/fees-params.js 的 winRule、tieRule）。
var WIN_RULE = "場地和分擔方案各自計票，票數最多的勝出。如最高票數相同，則交由學校在最高票的選項中決定。";

// 題目名稱。onSubmit 用這些名稱找答案，改題目時要一併改這裏。
var T = {
  venue: "場地",
  plan: "老師餐及雜費怎樣分擔？",
  use: "雜費想優先用在哪方面？（最多揀 2 項）",
  cls: "班別",
  no: "學號",
  name: "學生名字",
  adults: "出席的大人",
  kids: "出席的小朋友（包括畢業生）",
  phone: "聯絡電話",
  agree: "我明白及同意",
  pay: "我會按以上資料轉帳"
};

function money(n) { return "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

function payeeOf(cls) {
  for (var k in PAYEES) if (PAYEES[k].classes.indexOf(cls) >= 0) return PAYEES[k];
  return null;
}

function buildForm() {
  var title = (PROTOTYPE ? "【原型，請勿填寫】" : "") + "K3 畢業晚宴報名、投票及訂金";
  var form = FormApp.create(title);

  form.setDescription([
    "2027 年 7 月 2 日 · 全級四班",
    "無論哪個場地及方案勝出，都不會超過每位 $1,100。",
    "",
    "三步完成：① 投票 ② 填資料 ③ 轉帳訂金。",
    "未看網站？先看：",
    "費用 " + SITE + "fees.html",
    "我家要付多少 " + SITE + "venues.html",
    "",
    "勝出規則：" + WIN_RULE,
    "",
    "資料只用於這次晚宴，帳目公布後一個月內刪除。你的投票只有你的收款人，及籌委會負責各班的班代（或其接手人）看得到；網上只公布總票數。",
    "只有付款核實後，報名及投票才計算。",
    "如 Google 登入失敗，請用 Chrome 或 Safari 打開連結。",
    "",
    VERSION
  ].join("\n"));

  // ---- 設定 ----
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED); }
  catch (e) { form.setCollectEmail(true); Logger.log("注意：未能設定「已驗證」電郵，請在 Settings → Responses 人手改為 Verified。"); }
  form.setLimitOneResponsePerUser(false);   // 統籌要代沒有 Google 帳戶的家長登記
  form.setAllowResponseEdits(false);        // 避免核實後改人數或改票
  form.setPublishingSummary(false);         // 不可讓人看到票數及其他家庭的答案
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setShuffleQuestions(false);
  form.setConfirmationMessage(
    "已提交，但還未完成。\n" +
    "你會收到一封「付款指示」電郵，寫明你要轉帳的準確金額、收款人及轉帳備註。請照電郵轉帳。\n" +
    "收款人核實後，你會再收到電郵通知。只有核實付款的報名及投票才計算。");

  // ---- 第 1 頁：投票 ----
  form.addSectionHeaderItem().setTitle("第 1 頁：投票").setHelpText("每位畢業生一票。");

  var venue = form.addMultipleChoiceItem().setTitle(T.venue)
    .setHelpText("場地餐飲費每位約數，與網站「我家要付多少」相同，已含加一，以場地書面確認為準。" +
      "同一場地有不同菜式的，每個菜式一個選項。選項次序每人不同。")
    .setRequired(true);
  venue.setChoices(VENUES.map(function (v) { return venue.createChoice(v); }));

  // 三個方案的人形圖，截自網站「費用」頁。讀不到圖（例如網站暫時停了）仍會建立表格，只是少了圖。
  try {
    form.addImageItem().setTitle("三個分擔方案（以一家 2 大 1 小為例）")
      .setHelpText("點點在誰身上，就由誰分擔。")
      .setImage(UrlFetchApp.fetch(PLANS_IMAGE).getBlob())
      .setAlignment(FormApp.Alignment.CENTER);
  } catch (e) { Logger.log("注意：未能載入方案圖 " + PLANS_IMAGE + "，請人手加入。"); }

  var plan = form.addMultipleChoiceItem().setTitle(T.plan)
    .setHelpText("詳細見網站「費用」；你家實際要付多少，見「我家要付多少」。")
    .setRequired(true);
  plan.setChoiceValues(["① 按人頭", "② 雜費按人頭", "③ 按家庭"]);

  form.addCheckboxItem().setTitle(T.use)
    .setHelpText("只作指引，交負責的組別參考。學校希望雜費以節約為原則。")
    .setChoiceValues(["佈置", "節目", "影片", "紀念品", "物資", "沒有特別意見"])   // 與網站「費用」頁「雜費」一項相同
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(2).setHelpText("最多揀 2 項").build())
    .setRequired(true);

  // ---- 第 2 頁：資料及確認 ----
  form.addPageBreakItem().setTitle("第 2 頁：你的資料及確認")
    .setHelpText("提交後不能自己修改。要改人數，請聯絡統籌。");

  var cls = form.addListItem().setTitle(T.cls)
    .setHelpText("A、B 班付給 A 班財務；C、D 班付給 C 班財務。")
    .setRequired(true);

  form.addTextItem().setTitle(T.no)
    .setValidation(FormApp.createTextValidation().requireNumberBetween(1, 40).setHelpText("請填 1 至 40 的數字").build())
    .setRequired(true);

  form.addTextItem().setTitle(T.name).setHelpText("轉帳備註會用到。可以寫英文名。").setRequired(true);

  form.addListItem().setTitle(T.adults).setChoiceValues(["1", "2", "3", "4", "5", "6"]).setRequired(true);

  form.addListItem().setTitle(T.kids)
    .setHelpText("畢業生加兄弟姊妹等，佔座位、有餐的才計；不佔座位的嬰兒不計。\n" +
      "總人數 = 大人 + 小朋友。訂金每位 " + money(DEPOSIT) + "。準確金額會在提交後以電郵通知你。")
    .setChoiceValues(["1", "2", "3", "4", "5"]).setRequired(true);

  form.addTextItem().setTitle(T.phone).setHelpText("只在收款人對不上你的付款時使用。")
    .setValidation(FormApp.createTextValidation().requireTextMatchesPattern("^[2-9]\\d{7}$")
      .setHelpText("請填 8 位數字的香港電話").build())
    .setRequired(true);

  form.addCheckboxItem().setTitle(T.agree)
    .setChoiceValues([
      "訂金每位 " + money(DEPOSIT) + "，一經提交不會退回。如活動取消，退款視乎場地的條款，籌委會會盡力另擇日子舉辦",
      "無論哪個方案及場地勝出（勝出規則見表格開頭），我都會按結果付尾數",
      "我的收款人及籌委會負責各班的班代（或其接手人）看得到我的投票；網上只公布總票數"
    ])
    .setValidation(FormApp.createCheckboxValidation().requireSelectExactly(3).setHelpText("三項都要剔").build())
    .setRequired(true);

  // ---- 第 3 頁：收款人（按班別只看到一個） ----
  var pages = {};
  ["A", "C"].forEach(function (k) {
    var p = PAYEES[k];
    var amounts = [];
    for (var n = 2; n <= 8; n++) amounts.push(n + " 位 " + money(n * DEPOSIT));
    pages[k] = form.addPageBreakItem()
      .setTitle("付訂金給" + p.label)
      .setHelpText([
        "只付給這裏寫的收款人。其他人叫你轉帳都不要理會。",
        "",
        "收款人：" + p.name,
        "FPS：" + p.fps,
        "金額：" + money(DEPOSIT) + " × 總人數（大人 + 小朋友）",
        amounts.join(" · "),
        "",
        "轉帳備註：班別＋學號＋學生名",
        "例：K3A 18 Grady（假設）",
        "",
        "提交後你會收到「付款指示」電郵，寫明準確金額。請在提交後 " + DEADLINE_DAYS + " 日內轉帳。"
      ].join("\n"))
      .setGoToPage(FormApp.PageNavigationType.SUBMIT);
    form.addCheckboxItem().setTitle(T.pay)
      .setChoiceValues(["轉帳到 " + p.label + " " + p.name + "，FPS " + p.fps + "，備註寫班別＋學號＋學生名"])
      .setRequired(true);
  });

  // 班別按答案跳到對應收款人
  var choices = [];
  ["A", "C"].forEach(function (k) {
    PAYEES[k].classes.forEach(function (c) { choices.push(cls.createChoice(c, pages[k])); });
  });
  choices.sort(function (a, b) { return a.getValue() < b.getValue() ? -1 : 1; });
  cls.setChoices(choices);

  // ---- 回應試算表 ----
  var ss = SpreadsheetApp.create((PROTOTYPE ? "【原型】" : "") + "K3 畢業晚宴回應");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ---- 提交觸發器（以執行者的帳戶運作） ----
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onSubmit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onSubmit").forForm(form).onFormSubmit().create();

  Logger.log("表格編輯連結：" + form.getEditUrl());
  Logger.log("表格填寫連結：" + form.getPublishedUrl());
  Logger.log("回應試算表：" + ss.getUrl());
  Logger.log("還要人手設定：Send responders a copy → Always；場地題 Shuffle option order；主題色 #00918a。");
}

// 每次有人提交：寄付款指示電郵
function onSubmit(e) {
  var r = e.response;
  var a = {};
  r.getItemResponses().forEach(function (ir) { a[ir.getItem().getTitle()] = ir.getResponse(); });

  var to = r.getRespondentEmail();
  if (!to) { Logger.log("沒有電郵，略過"); return; }

  var cls = a[T.cls], no = a[T.no], name = a[T.name];
  var adults = Number(a[T.adults]), kids = Number(a[T.kids]);
  var total = adults + kids;
  var p = payeeOf(cls);
  var note = cls + " " + no + " " + name;

  var subject = (PROTOTYPE ? "【原型測試】" : "") + "K3 畢業晚宴：付訂金指示（" + cls + " " + no + " 號）";
  var body = [
    "你好，",
    "",
    "我們已收到 " + cls + " " + no + " 號的報名及投票。還差一步：請轉帳訂金。",
    "",
    "金額：" + money(total * DEPOSIT) + "（大人 " + adults + " 位 + 小朋友 " + kids + " 位 = " + total + " 位 × " + money(DEPOSIT) + "）",
    "收款人：" + p.label + " " + p.name,
    "FPS：" + p.fps,
    "轉帳備註：" + note,
    "期限：提交後 " + DEADLINE_DAYS + " 日內",
    "",
    "只付給以上收款人。其他人叫你轉帳都不要理會。",
    "收款人對照銀行紀錄核實後，你會再收到電郵通知。只有核實付款的報名及投票才計算。",
    "",
    "如人數有誤，請不要轉帳，先聯絡統籌更正。",
    "",
    "這封電郵由籌委會統籌的帳戶自動寄出，請保留作紀錄。",
    "K3 畢業晚宴籌委會"
  ].join("\n");

  MailApp.sendEmail({ to: to, subject: subject, body: body, name: "K3 畢業晚宴籌委會" });
}
