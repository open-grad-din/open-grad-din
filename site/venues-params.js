// 場地及收費頁的場地資料（名單、報價、篩走原因）。收費數字在 fees-params.js。
//
// 名單、報價及篩走原因由籌委會提供。開放報名前（第 0 段）凍結：之後改動必須經 Pull Request 及統籌批准，
// 改動紀錄永遠公開。報價僅供參考，實際價錢及檔期以場地書面確認為準。
//
// 每位餐費 F 一律計入 10% 服務費（酒樓報價已含加一，Ken 2026-11-02 確認）；中式筵席按每席 12 位計。有範圍的（不同菜式或預計加價）寫 F 及 Fmax，頁面取中位數並寫明範圍。
// photos：場地相片 [{ src: "images/venues/xxx-1.jpg", alt: "…" }]。必須由籌委會自己拍攝或獲場地授權，不可從網上複製。
// 未有相片時頁面顯示示範圖片。
// grade：場地級別標籤。酒店星級一律照 Expedia 所列（Ken 2026-11-02 決定），gradeSrc 寫 Expedia 頁面；酒樓 Expedia 沒有星級，留空不顯示。
window.OGD_VENUES = {
  isDraft: false,             // 2026-11-02 籌委會已通過名單（Ken 轉達）。報價仍以場地書面確認為準，頁面照舊註明。
  version: "籌委會已通過",
  frozenDate: "",
  collected: "約 20 多間",     // 籌委會委員最初收集的數目
  history: "近年的畢業晚宴都在酒店舉行。酒樓只在很多年前辦過一次。",
  gradeNote: "酒店星級照 Expedia 網站所列（2026 年 11 月 2 日查閱），只供參考，不是官方評級；酒樓在 Expedia 沒有星級，所以不標示。",

  venues: [
    { type: "hotel", name: "康得思酒店", grade: "5 星", gradeSrc: "https://www.expedia.com/Kowloon-Hotels-Cordis.h990415.Hotel-Information", where: "旺角", url: "https://www.cordishotels.com/tc/hong-kong/",
      menus: [{ name: "自助餐", F: 537, quote: "每位 $488 另加一" }],
      chips: ["汽水、凍橙汁任飲 2 小時", "免費 LED 屏"], photos: [] },
    { type: "hotel", name: "唯港薈", grade: "5 星", gradeSrc: "https://www.expedia.com/Kowloon-Hotels-Hotel-ICON.h4247437.Hotel-Information", where: "尖東", url: "https://www.hotel-icon.com/zh-tw/",
      menus: [{ name: "自助餐", F: 758, quote: "每位 $758，已含加一" },
              // 2026-11-03 Ken 提供：用午餐自助餐菜單每位 $580 另加一（$638）；籌委回覆此菜單用在晚上，晚宴時間不變。
              { name: "自助餐（午餐菜單・晚上供應）", F: 638, quote: "每位 $580 另加一；午餐自助餐菜單，晚上供應" }],
      chips: ["橙汁 2 小時", "即影即有相攤", "標誌展示", "哈根達斯"], photos: [] },
    { type: "hotel", name: "美麗華酒店", grade: "5 星", gradeSrc: "https://www.expedia.com/Kowloon-Hotels-The-Mira-Hong-Kong-Hotel.h20879.Hotel-Information", where: "尖沙咀", url: "https://www.themirahotel.com/hong-kong/tc/",
      menus: [{ name: "中式筵席", F: 600, quote: "每圍 $7,200 淨價（12 位，已含加一）" },
              { name: "自助餐", F: 635, quote: "每位 $635 淨價" }],
      chips: ["全晚汽水、鮮橙汁任飲"], photos: [] },
    { type: "hotel", name: "千禧新世界香港酒店", grade: "5 星", gradeSrc: "https://www.expedia.com/Kowloon-Hotels-New-World-Millennium-Hong-Kong-Hotel.h2435.Hotel-Information", where: "尖東", url: "https://newworldmillenniumhotel.com/tc/",
      menus: [{ name: "自助餐", F: 670, Fmax: 689, quote: "現時每位 $580 另加一；2027 年預計加價 5–8%" }],
      chips: ["汽水、凍橙汁 2 小時"], photos: [] },
    { type: "hotel", name: "麗思卡爾頓", grade: "5 星", gradeSrc: "https://www.expedia.com/Kowloon-Hotels-The-Ritz-Carlton-Hong-Kong.h4011564.Hotel-Information", where: "西九龍", url: "https://www.ritzcarlton.com/en/hotels/hkgkw-the-ritz-carlton-hong-kong/overview/",
      menus: [{ name: "自助餐", F: 825, quote: "每位 $750 另加一" }],
      chips: ["每人 2 杯飲品"], photos: [] },
    { type: "hotel", name: "嘉里酒店", grade: "5 星", gradeSrc: "https://www.expedia.com/Kowloon-Hotels-Kerry-Hotel.h16209827.Hotel-Information", where: "紅磡", url: "https://www.shangri-la.com/hongkong/kerry/",
      menus: [{ name: "自助餐", F: 825, quote: "每位 $750 另加一" }],
      chips: ["每人 2 杯凍橙汁或汽水"], photos: [] },
    { type: "hotel", name: "九龍海逸君綽酒店", grade: "5 星", gradeSrc: "https://www.expedia.com/Kowloon-Hotels-Harbour-Grand-Kowloon.h19502.Hotel-Information", where: "紅磡", url: "https://www.harbourgrand.com/kowloon/",
      menus: [{ name: "自助餐", F: 669, quote: "每位 $608 起，另加服務費" }],
      chips: ["任飲 3 小時", "即影即有相攤 2 小時"], photos: [] },

    { type: "rest", name: "海月（煌府）", where: "中港城", seats: "可設 38–65 席", url: "https://palace-rest.com.hk/",
      menus: [{ name: "中式筵席", F: 332, Fmax: 724, quote: "每席 $3,988–$8,688（已含加一）" }], photos: [] },
    { type: "rest", name: "囍薈", where: "尖沙咀北京道 1 號 11 樓", seats: "可設 25–35 席", url: "https://vhsupreme.com.hk/hei-tsim-sha-tsui/",
      menus: [{ name: "中式筵席", F: 432, Fmax: 665, quote: "每席 $5,180–$7,980（已含加一）" }], photos: [] },
    { type: "rest", name: "彩福皇宴", where: "尖東", seats: "可設 16–60 席", url: "https://www.choifookent.com/%e5%b0%96%e6%9d%b1%e5%ba%97-%e5%bd%a9%e7%a6%8f%e7%9a%87%e5%ae%b4/#branch",
      menus: [{ name: "中式筵席", F: 415, Fmax: 665, quote: "每席 $4,980–$7,980（已含加一）" }], photos: [] },
    { type: "rest", name: "沙田美心皇宮", where: "沙田大會堂", seats: "可設 16–54 席", url: "https://www.maximschinese.com.hk/zh/brand/1",
      menus: [{ name: "中式筵席", F: 407, Fmax: 573, quote: "每席 $4,880–$6,880（已含加一）" }], photos: [] },
    { type: "rest", name: "中環美心皇宮", where: "中環大會堂", seats: "可設 27–50 席", url: "https://www.maximschinese.com.hk/zh/brand/1",
      menus: [{ name: "中式筵席", F: 648, Fmax: 807, quote: "每席 $7,780–$9,680（已含加一）" }], photos: [] }
  ],

  // 篩走的場地及原因（同一原因可合併一行）。
  excluded: [
    "尖沙咀喜來登：超出每位 $1,100 上限（自助餐每位約 $968，另加老師餐及雜費分擔）",
    "如心酒店：只有 7 月 16 日有檔期，不是晚宴日期",
    "海景嘉福：只可設 23 圍，坐不下全級",
    "尖沙咀凱悅：只可設 22 圍，坐不下全級",
    "沙田凱悅：只可設 30 圍，坐不下全級",
    "The Henderson：只容納 330 人，坐不下全級",
    "皇冠假日、W Hotel、Marco Polo、帝京酒店：人數負荷不足"
  ],
  excludeReasons: ["坐不下全級", "檔期不合", "超出 $1,100 上限"]
};
