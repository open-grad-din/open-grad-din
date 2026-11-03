# 報名表格的方案圖

報名表格「老師餐及雜費怎樣分擔？」一題上面的人形圖（`site/form/plans.png`），直接截自網站「費用」頁（`fees.html`）的三個方案，所以與網站一字不差。`form/build-form.gs` 建立表格時從網站讀取這張圖。

收費頁的方案圖或文字改了，要重新製作（需要 Node 及 Playwright）：

```sh
node tools/form-image/shot.js site site/form/plans.png
```

已建立的表格不會自動更新，要在表格內人手換圖。
