// 收費詳細頁的數字。這是詳細頁唯一需要改的檔案。
//
// 每個數字都要寫明來源，並由籌委會通過。第 0 段通過後，這個檔案凍結：
// 改動必須經 Pull Request 及統籌批准，網頁會顯示新的版本編號及日期，舊版本永遠留在改動紀錄。
// Form 內的例子金額必須照抄這一頁顯示的數字。
//
// 目前全部是示範數字（isDemo: true），不是真實報價。
window.OGD_FEES = {
  isDemo: true,
  version: "示範版",          // 凍結後改為「第 1 版」等
  frozenDate: "",             // 凍結日期，YYYY-MM-DD

  // 已投票決定的每位預算範圍（只用作提示，不影響計算）。
  budgetPerHead: { min: 900, max: 1100 },
  depositPerHead: 550,

  // 雜費計法投票怎樣定勝出、平手怎樣處理。由籌委會決定後填寫；留空則顯示「待籌委會決定」。
  winRule: "",
  tieRule: "",

  // 教職員人數 S：由學校提供。
  staff: { value: 15, source: "示範數字" },

  // 預計雜費 M：參考上屆實際報銷。實際收費按實際雜費計，決算時公布單據總額。
  incidentals: { value: 20000, source: "示範數字（日後改為上屆實際報銷）" },

  // 預計出席畢業生 G 及預計出席總人數 N（包括畢業生）。只用來估算；實際按截止時的核實人數計。
  graduates: { value: 100, source: "示範數字" },
  attendees: { value: 300, source: "示範數字（假設平均每家 3 人）" },

  // 場地及每位餐費 F：場地也是投票決定，所以每個場地各列一次。
  venues: [
    { name: "場地甲", perHead: 780, source: "示範報價" },
    { name: "場地乙", perHead: 880, source: "示範報價" }
  ],

  // 家庭例子：n = 出席人數（包括畢業生）。
  examples: [
    { label: "1 大 1 小", n: 2 },
    { label: "2 大 1 小", n: 3 },
    { label: "2 大 2 小", n: 4 },
    { label: "4 大 1 小", n: 5 }
  ]
};
