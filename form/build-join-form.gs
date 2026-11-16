/**
 * K3 畢業晚宴：「報名及加人」Google Form（2026-11-17）
 *
 * 給兩類家長：
 *   1. 投票時答「會出席」，現在想加人；
 *   2. 之前沒有投票，或答了「不會出席」／「未決定」，現在想報名出席。
 * 不設投票題。勝出的場地及分擔方案同樣適用。
 *
 * 人數問「加人之後全家總共幾多位」，不問「加幾多位」（Ken 2026-11-17：家長未必記得之前填了多少）。
 * 差額由試算表計：新總數 − 投票時登記的人數（見下面「試算表」）。
 *
 * 處理（籌委會定，表格只負責收集）：
 *   - 交訂金期限之前收到：直接接受，統籌寄付款指示。
 *   - 期限之後收到：按提交時間先後排隊，統籌問場地能否加位，可以就按次序寄付款指示。
 *   - 人數只可加不可減。新總數不多於原本人數的，統籌聯絡該家庭問清楚。
 *   - 提交不等於確認；收到統籌的付款指示前不要轉帳。
 *
 * 用法（由統籌在自己的 Google 帳戶做，只做一次）：
 *   1. 打開 https://script.google.com ，按 New project。
 *   2. 刪除原有內容，貼上這整個檔案。
 *   3. 把 PROTOTYPE 改為 false；SPREADSHEET_ID 填「K3 畢業晚宴回應」試算表網址中 /d/ 與 /edit 之間的一串字
 *      （回應會寫入該試算表的新分頁）。按 Ctrl+S 儲存。
 *   4. 上方下拉選單選 buildJoinForm，按 ▷ Run，按 Allow 授權。
 *   5. 按 Execution log，會看到表格編輯連結、填寫連結。只執行一次，再執行會另外建立一張新表格。
 *   6. 在 Form 內人手設定：Settings → Responses → Send responders a copy of their response：Always；
 *      主題色 #00918a。
 *
 * 試算表：回應分頁欄位是 A 時間戳、B 電郵、C 你想做甚麼、D 班別、E 學號、F 學生名、G 大人、H 小朋友。
 * 在最右邊加一欄「原本人數」，第 2 行貼（點票分頁 G＝班別、H＝學號、J＝大人、K＝小朋友）：
 *   =ARRAYFORMULA(IF(C2:C="",,IFERROR(VLOOKUP(D2:D&" "&E2:E, {'點票'!G:G&" "&'點票'!H:H, '點票'!J:J+'點票'!K:K}, 2, FALSE), 0)))
 * 再加一欄「要加人數」，第 2 行貼 =ARRAYFORMULA(IF(C2:C="",,G2:G+H2:H-原本人數那一欄))；
 * 「加人」而結果是 0 或負數的，要聯絡家庭問清楚。「新報名」的原本人數應為 0，不是 0 的代表之前已報名。
 */

var PROTOTYPE = true;
var VERSION = "報名及加人表格第 1 版 · 2026 年 11 月 17 日";
var SPREADSHEET_ID = "";      // 填「K3 畢業晚宴回應」試算表的 ID；留空會另外建立新試算表
var SITE = "https://open-grad-din.github.io/open-grad-din/";
var J_DEPOSIT = 550;

var J_T = {
  type: "你想做甚麼？",
  cls: "班別",
  no: "學號",
  name: "學生名字",
  adults: "加人之後，全家總共幾多位大人出席？",
  kids: "加人之後，全家總共幾多位小朋友出席？（包括畢業生）",
  phone: "聯絡電話",
  agree: "我明白",
  comment: "還有其他想告訴籌委會的嗎？"
};

var J_TYPES = [
  "加人：投票時已答「會出席」，現在想加人",
  "新報名：之前沒有投票，或答了「不會出席」／「未決定」，現在想報名出席"
];

function buildJoinForm() {
  var title = (PROTOTYPE ? "【原型，請勿填寫】" : "") + "K3 畢業晚宴：報名及加人";
  var form = FormApp.create(title);

  form.setDescription([
    "畢業晚宴舉行日期為 2027 年 7 月 2 日。投票結果已在網站公布：" + SITE,
    "",
    "這張表格給想加人，或之前未報名、現在想出席的家庭。不用投票。",
    "",
    "提交後，籌委會會確認名額，然後寄出付款指示（訂金每位 $" + J_DEPOSIT + "）。收到付款指示前，請不要轉帳。",
    "交訂金期限之前提交的，會直接安排；期限之後提交的，按提交時間先後處理，能否成功要視乎場地能否加位。",
    "",
    "本表格所收集的資料只用於這次晚宴，待晚宴完結及帳目公布後，將會立即刪除資料。",
    "如 Google 登入失敗，請用 Chrome 或 Safari 打開連結。",
    "",
    VERSION
  ].join("\n"));

  try { form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED); }
  catch (e) { form.setCollectEmail(true); Logger.log("注意：未能設定「已驗證」電郵，請在 Settings → Responses 人手改為 Verified。"); }
  form.setLimitOneResponsePerUser(false);   // 統籌要代沒有 Google 帳戶的家長填
  form.setAllowResponseEdits(false);
  form.setPublishingSummary(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage(
    "已提交，謝謝。\n" +
    "Google 會把你的回應副本寄到你的電郵，請保留作紀錄。\n" +
    "籌委會確認名額後會寄出付款指示。收到付款指示前，請不要轉帳。");

  form.addMultipleChoiceItem().setTitle(J_T.type).setChoiceValues(J_TYPES).setRequired(true);

  form.addListItem().setTitle(J_T.cls).setChoiceValues(["K3A", "K3B", "K3C", "K3D"]).setRequired(true);
  form.addTextItem().setTitle(J_T.no)
    .setValidation(FormApp.createTextValidation().requireNumberBetween(1, 40).setHelpText("請填 1 至 40 的數字").build())
    .setRequired(true);
  form.addTextItem().setTitle(J_T.name).setHelpText("可以寫英文名。").setRequired(true);

  form.addListItem().setTitle(J_T.adults)
    .setHelpText("填全家總數，不是加幾多位。例如之前報了 2 大 1 小，想加 1 位大人，這裏填 3。")
    .setChoiceValues(["1", "2", "3", "4", "5", "6"]).setRequired(true);
  form.addListItem().setTitle(J_T.kids)
    .setHelpText("畢業生加兄弟姊妹等，佔座位、有餐的才計；不佔座位的嬰兒不計。填全家總數。")
    .setChoiceValues(["1", "2", "3", "4", "5"]).setRequired(true);

  form.addTextItem().setTitle(J_T.phone).setHelpText("只在籌委會要確認名額或人數時使用。")
    .setValidation(FormApp.createTextValidation().requireTextMatchesPattern("^[2-9]\\d{7}$")
      .setHelpText("請填 8 位數字的香港電話").build())
    .setRequired(true);

  form.addCheckboxItem().setTitle(J_T.agree)
    .setChoiceValues([
      "提交不等於確認。籌委會確認名額後會寄出付款指示，收到前我不會轉帳",
      "訂金每位 $" + J_DEPOSIT + "，不設退款；人數只可以加，不可以減",
      "投票勝出的場地及分擔方案同樣適用於我家"
    ])
    .setValidation(FormApp.createCheckboxValidation().requireSelectExactly(3).setHelpText("三項都要剔").build())
    .setRequired(true);

  form.addParagraphTextItem().setTitle(J_T.comment).setHelpText("選填。只有籌委會看到。");

  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.create((PROTOTYPE ? "【原型】" : "") + "K3 畢業晚宴報名及加人回應");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log("表格編輯連結：" + form.getEditUrl());
  Logger.log("表格填寫連結：" + form.getPublishedUrl());
  Logger.log("回應試算表：" + ss.getUrl());
  Logger.log("還要人手設定：Send responders a copy → Always；主題色 #00918a。");
}
