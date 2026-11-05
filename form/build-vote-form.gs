/**
 * K3 畢業晚宴：第一階段投票 Google Form
 *
 * 2026-11-05 籌委會決定投票與交訂金分開：先投票（這張表格），投票結果公布後，才報名及交訂金（第二階段，另一張表格）。
 * 這張表格不收付款資料、不收出席人數、不寄任何電郵，所以沒有提交觸發器。
 *
 * 用法（由統籌在自己的 Google 帳戶做，只做一次）：
 *   1. 打開 https://script.google.com ，按 New project（不要貼在舊的報名表格 script 內）。
 *   2. 刪除原有內容，貼上這整個檔案。
 *   3. 把下面 PROTOTYPE 改為 false。
 *      如想把回應寫入現有的試算表（網站讀的「總數」「公開資料」分頁所在的那一份），
 *      在 SPREADSHEET_ID 填入該試算表網址中 /d/ 與 /edit 之間的一串字；留空就另外建立一份新試算表。
 *      按 Ctrl+S 儲存。
 *   4. 上方下拉選單選 buildVoteForm，按 ▷ Run，按 Allow 授權。
 *   5. 按 Execution log，會看到表格編輯連結、填寫連結及試算表連結。
 *   6. 只執行一次。再執行會另外建立一張新表格。
 *
 * 建立後要在 Form 內人手完成（Apps Script 做不到）：
 *   - Settings → Responses → Send responders a copy of their response：Always（家長手上的投票證明）
 *   - 「場地」題 → 右下 ⋮ → Shuffle option order（隨機排列選項）
 *   - 上方調色盤圖示（Customize theme）→ Color → ＋ → 輸入 00918a（與網站同一主題色）
 *
 * 場地選項（VENUES）必須與網站「計算機」頁（site/venues-params.js）一致：每個菜式一個選項，
 * 金額是頁面顯示的「場地餐飲費每位約」。改名單時兩邊一起改，form/check-venues.js 會在部署時檢查。
 * 勝出規則（WIN_RULE）亦要與網站（site/fees-params.js）一字不差。
 *
 * 點票（由籌委會在回應試算表做，任何人可以用同一規則重算）：
 *   - 同一班別＋學號只計一份。有多於一份時，籌委會聯絡該家庭核實，只計家庭確認的一份。
 *   - 答「不會出席」的不計票（他們不會看到投票題）。
 *   - 場地：每個選項數有多少份投票剔了它，最多的勝出。分擔方案：票數最多的勝出。平手交學校決定。
 */

var PROTOTYPE = true;
var VERSION = "投票表格第 1 版 · 2026 年 11 月 5 日";
var SPREADSHEET_ID = "";      // 留空：建立新試算表。填入：回應寫入該試算表的新分頁。
var MAX_VENUES = 3;           // 場地最多揀幾個（2026-11-05 籌委會決定 3 個）

var SITE = "https://open-grad-din.github.io/open-grad-din/";
var PLANS_IMAGE = SITE + "form/plans.png";

// 場地：每個菜式一個選項，寫法「場地 · 級別 · 菜式 · 每位約 $X」，與網站「計算機」頁一致。
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

// 勝出規則：照抄網站「費用」頁（site/fees-params.js 的 winRule、tieRule），部署檢查會對照。
var WIN_RULE = "場地由最多家庭剔選的勝出；分擔方案票數最多的勝出。如最高票數相同，則交由學校在最高票的選項中決定。";

// 題目名稱。點票時用這些名稱找答案。
var T = {
  attend: "你家預計會出席畢業晚宴嗎？",
  why: "有甚麼原因或意見想告訴籌委會嗎？",
  comment: "還有其他意見嗎？",
  venue: "場地（最多揀 " + MAX_VENUES + " 個）",
  plan: "老師餐及雜費怎樣分擔？",
  use: "雜費想優先用在哪方面？（最多揀 2 項）",
  cls: "班別",
  no: "學號",
  name: "學生名字",
  agree: "我明白"
};

function buildVoteForm() {
  var title = (PROTOTYPE ? "【原型，請勿填寫】" : "") + "K3 畢業晚宴：場地及分擔方案投票";
  var form = FormApp.create(title);

  form.setDescription([
    "畢業晚宴舉行日期為 2027 年 7 月 2 日。",
    "無論哪個場地及方案勝出，最後按實際成本收費，每位不會超過之前投票定下的上限 $1,100。",
    "",
    "這次只投票，不用付款。投票結果公布後，才報名及交訂金。",
    "",
    "場地：最多揀 " + MAX_VENUES + " 個你接受的場地，每個剔都一樣計，被最多家庭剔選的場地勝出。",
    "分擔方案：三揀一，票數最多的勝出。",
    "如最高票數相同，則交由學校在最高票的選項中決定。",
    "",
    "每位畢業生一票。同一學號有多於一份投票，籌委會會聯絡你核實，只計一份。",
    "",
    "計算金額方式請先看網站：",
    "- 費用 " + SITE + "fees.html",
    "- 我家的總參加費用 " + SITE + "venues.html",
    "",
    "你的投票只有畢業晚宴籌委會成員可以看到。投票結果將於網站上公佈。",
    "本表格所收集的資料只用於這次晚宴，待晚宴完結及帳目公布後，將會立即刪除資料。",
    "",
    "如 Google 登入失敗，請用 Chrome 或 Safari 打開連結。",
    "",
    VERSION
  ].join("\n"));

  // ---- 設定 ----
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED); }
  catch (e) { form.setCollectEmail(true); Logger.log("注意：未能設定「已驗證」電郵，請在 Settings → Responses 人手改為 Verified。"); }
  form.setLimitOneResponsePerUser(false);   // 統籌要代沒有 Google 帳戶的家長投票；重複以學號處理
  form.setAllowResponseEdits(false);        // 提交後不能改票
  form.setPublishingSummary(false);         // 不可讓人看到票數及其他家庭的答案
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setShuffleQuestions(false);
  form.setConfirmationMessage(
    "已提交，謝謝。\n" +
    "Google 會把你的回應副本寄到你的電郵，請保留作紀錄。\n" +
    "投票結果會在網站公布。之後才報名及交訂金，到時會另行通知。");

  // ---- 開頭：會否出席。「不會出席」跳到最後一頁，不會投票。 ----
  var attend = form.addMultipleChoiceItem().setTitle(T.attend)
    .setHelpText("晚宴費用由出席的家庭分擔，所以由預計出席的家庭投票。")
    .setRequired(true);

  // ---- 第 1 頁：投票 ----
  var votePage = form.addPageBreakItem().setTitle("第 1 頁：投票").setHelpText("每位畢業生一票。");

  var venue = form.addCheckboxItem().setTitle(T.venue)
    .setHelpText("剔你接受的場地，最少 1 個、最多 " + MAX_VENUES + " 個，每個剔都一樣計，被最多家庭剔選的場地勝出。" +
      "場地餐飲費每位約數，與網站「我家要付多少？」相同，已含加一，以場地書面確認為準。" +
      "同一場地有不同菜式的，每個菜式一個選項。選項次序每人不同。")
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(MAX_VENUES)
      .setHelpText("最多揀 " + MAX_VENUES + " 個").build())
    .setRequired(true);
  venue.setChoices(VENUES.map(function (v) { return venue.createChoice(v); }));

  try {
    form.addImageItem().setTitle("三個分擔方案（以一家 2 大 1 小為例）")
      .setHelpText("點點在誰身上，就由誰分擔。")
      .setImage(UrlFetchApp.fetch(PLANS_IMAGE).getBlob())
      .setAlignment(FormApp.Alignment.CENTER);
  } catch (e) { Logger.log("注意：未能載入方案圖 " + PLANS_IMAGE + "，請人手加入。"); }

  form.addMultipleChoiceItem().setTitle(T.plan)
    .setHelpText("詳細見網站「費用」；你家實際要付多少，見「我家要付多少？」。")
    .setChoiceValues(["① 按人頭", "② 雜費按人頭", "③ 按家庭"])
    .setRequired(true);

  form.addCheckboxItem().setTitle(T.use)
    .setHelpText("只作指引，交負責的組別參考。學校希望雜費以節約為原則。")
    .setChoiceValues(["佈置", "節目", "影片", "紀念品", "物資", "沒有特別意見"])
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(2).setHelpText("最多揀 2 項").build())
    .setRequired(true);

  // ---- 第 2 頁：畢業生資料及確認 ----
  form.addPageBreakItem().setTitle("第 2 頁：畢業生資料")
    .setHelpText("用來確保每位畢業生只有一票。提交後不能自己修改。");

  form.addListItem().setTitle(T.cls).setChoiceValues(["K3A", "K3B", "K3C", "K3D"]).setRequired(true);

  form.addTextItem().setTitle(T.no)
    .setValidation(FormApp.createTextValidation().requireNumberBetween(1, 40).setHelpText("請填 1 至 40 的數字").build())
    .setRequired(true);

  form.addTextItem().setTitle(T.name).setHelpText("可以寫英文名。").setRequired(true);

  form.addCheckboxItem().setTitle(T.agree)
    .setChoiceValues([
      "每位畢業生只投一次。同一學號有多於一份投票，籌委會會聯絡我核實，只計一份",
      "勝出的場地及方案適用於所有出席的家庭，包括投了其他選項的家庭。報名及交訂金在投票結果公布後進行",
      "籌委會成員看得到我的投票內容，以確保點票公平公正；全級家長只會看到總票數，不會公開投票內容。籌委會成員須確保投票內容不會外流"
    ])
    .setValidation(FormApp.createCheckboxValidation().requireSelectExactly(3).setHelpText("三項都要剔").build())
    .setRequired(true);

  form.addParagraphTextItem().setTitle(T.comment).setHelpText("選填。只有籌委會看到。");

  // ---- 不出席（只有答「不會出席」才看到） ----
  // setGoToPage 設定的是「這個分頁之前那一頁」完成後去哪裏：資料頁填完就提交，不會走進「不出席」頁。
  var noPage = form.addPageBreakItem().setTitle("不出席")
    .setHelpText("謝謝你告訴我們。按「提交」就完成。")
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);
  form.addParagraphTextItem().setTitle(T.why).setHelpText("選填。只有籌委會看到。");

  attend.setChoices([
    attend.createChoice("會出席", votePage),
    attend.createChoice("未決定", votePage),
    attend.createChoice("不會出席", noPage)
  ]);

  // ---- 回應試算表 ----
  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.create((PROTOTYPE ? "【原型】" : "") + "K3 畢業晚宴投票回應");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log("表格編輯連結：" + form.getEditUrl());
  Logger.log("表格填寫連結：" + form.getPublishedUrl());
  Logger.log("回應試算表：" + ss.getUrl());
  Logger.log("還要人手設定：Send responders a copy → Always；場地題 Shuffle option order；主題色 #00918a。");
}
