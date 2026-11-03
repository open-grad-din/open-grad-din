// 由網站收費頁截出「三個分擔方案」人形圖，給報名表格用（site/form/plans.png）。
// 圖直接截自 fees.html，所以與網站一字不差。用法：node shot.js <site 資料夾> <輸出 png>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const site = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 500, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await p.goto('file://' + site + '/fees.html');
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: `
    .reveal { opacity: 1 !important; transform: none !important; animation: none !important; }
    #plan-h, .vote-cue, .tabbar, nav { display: none !important; }
    .hint { font-size: 0 !important; margin: 0 0 14px !important; }
    .hint br { display: none; }
    .hint .key { font-size: 17px !important; margin: 0 !important; }
    section[aria-labelledby="plan-h"] { padding: 18px 16px 20px !important; margin: 0 !important; }
  ` });
  await p.waitForTimeout(500);
  const sec = await p.$('section[aria-labelledby="plan-h"]');
  await sec.screenshot({ path: out });
  await b.close();
})();
