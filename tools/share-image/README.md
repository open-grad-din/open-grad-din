# 分享預覽圖及網站圖示

在 WhatsApp 等分享網址時顯示的圖（`site/og.png`，1200×630）及瀏覽器／手機主畫面圖示（`site/favicon.svg`、`site/favicon-32.png`、`site/apple-touch-icon.png`）由這裏的檔案製作。

- `og.html`：分享圖的版面，小朋友插畫與首頁相同。字型是粉圓（Huninn，SIL OFL 1.1，見 `site/fonts/OFL.txt`）只含圖中文字的子集 `font/huninn-sub.woff2`。改字要重新製作子集。
- `favicon.svg`：圖示原稿（中間那位戴畢業帽的小朋友）。

重新製作（需要 Node 及 Playwright）：

```sh
cd tools/share-image
node shot.js "$PWD/og.html" "$PWD/../../site/og.png"
node fav.js && mv favicon-32.png apple-touch-icon.png ../../site/ && cp favicon.svg ../../site/ && rm -f icon-512.png
```

主要內容要放在中間 600px：WhatsApp 等會把圖裁成正方形小縮圖。分享圖網址帶部署編號（`og.png?v=…`），改圖後新分享的連結會讀新圖；舊對話的預覽仍可能是舊圖。
