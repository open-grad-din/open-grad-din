// 資料來源設定。這是唯一需要改的檔案。
//
// csvUrl：統籌在 Google Sheet 用「檔案 → 共用 → 發佈到網上」發佈的
// 公開分頁 CSV 連結（只含 學生名、班別、出席人數、核實狀態）。
// 未正式啟用前，指向 repo 內的假資料 data/demo.csv。
//
// 這裏沒有任何密碼或密鑰。改動這個檔案必須經 Pull Request，
// 而網頁頁底會顯示正在使用的資料來源，任何人都看得到。
window.OGD_CONFIG = {
  csvUrl: "data/demo.csv",
  isDemo: true
};
