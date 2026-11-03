// 資料來源設定。這是唯一需要改的檔案。
//
// 兩個連結都是統籌在 Google Sheet 用「檔案 → 共用 → 發佈到網上」發佈的公開分頁 CSV：
// - summaryCsvUrl：每位收款人一行的總數（沒有任何家庭或學生的資料）。
// - infoCsvUrl：首頁文字，例如現階段、截止時間、各份正式文件的連結。
// 未正式啟用前，指向 repo 內的假資料。
//
// 這裏沒有任何密碼或密鑰。改動這個檔案必須經 Pull Request，
// 而網頁頁底會顯示正在使用的資料來源，任何人都看得到。
window.OGD_CONFIG = {
  // 2026-11-03：改為讀統籌試算表發佈的兩個分頁（「總數」及「公開資料」），報名連結亦由此讀取。
  summaryCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdA75CJjtyGfuL7qkRp6fYvAMXI12bGCh8h3wobneCDgp70PVr9otot3uJAM_oHVWyPxRvRyrnXQVN/pub?gid=0&single=true&output=csv",
  infoCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdA75CJjtyGfuL7qkRp6fYvAMXI12bGCh8h3wobneCDgp70PVr9otot3uJAM_oHVWyPxRvRyrnXQVN/pub?gid=2036440440&single=true&output=csv",
  isDemo: false
};
