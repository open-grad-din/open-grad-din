// 檢查投票表格（build-vote-form.gs）的場地選項及勝出規則，是否與網站一致。
// 網站的數字在 site/venues-params.js 及 site/fees-params.js；表格不能直接讀網站，所以兩邊各寫一份，由這裏對照。
// 用法：node form/check-venues.js（不一致時列出分別並以錯誤結束，部署會停下）
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
global.window = {};
require(path.join(root, "site/venues-params.js"));
require(path.join(root, "site/fees-params.js"));

const mid = (m) => (m.Fmax ? Math.round((m.F + m.Fmax) / 2) : m.F);
const site = [];
window.OGD_VENUES.venues.forEach((v) =>
  v.menus.forEach((m) =>
    site.push([v.name, (v.grade || "") + (v.type === "hotel" ? "酒店" : "酒樓"), m.name, "每位約 $" + mid(m)].join(" · "))
  )
);

const gs = fs.readFileSync(path.join(root, "form/build-vote-form.gs"), "utf8");
const form = JSON.parse(gs.match(/var VENUES = (\[[\s\S]*?\]);/)[1]);
const rule = JSON.parse(gs.match(/var WIN_RULE = (".*?");/)[1]);
const siteRule = window.OGD_FEES.winRule + window.OGD_FEES.tieRule;

const errs = [];
site.filter((x) => !form.includes(x)).forEach((x) => errs.push("表格缺少：" + x));
form.filter((x) => !site.includes(x)).forEach((x) => errs.push("網站沒有：" + x));
if (rule !== siteRule) errs.push("勝出規則不同：\n  表格：" + rule + "\n  網站：" + siteRule);

if (errs.length) {
  console.error("投票表格與網站不一致（改 form/build-vote-form.gs）：\n" + errs.join("\n"));
  process.exit(1);
}
console.log("投票表格的 " + form.length + " 個場地選項及勝出規則與網站一致。");
