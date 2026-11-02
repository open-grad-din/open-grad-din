# 標題字型

`ogd-kai.woff2` 是 [霞鶩文楷 TC（LXGW WenKai TC）](https://github.com/lxgw/LxgwWenkaiTC) 粗體（SIL Open Font License 1.1，見 `OFL.txt`）的子集，只保留網站標題、數字及場地名稱用到的字，約 50KB。

放在 repo 內，是為了不連接任何外部網站（不會把家長的瀏覽紀錄交給字型供應商），亦不會因外部網站失效而變樣。

如標題出現新字（例如場地名單更新），新字會自動用手機內置字型顯示，不影響閱讀；要統一字型，可重新製作子集（`pyftsubset`，`--text` 加入新字，`--flavor=woff2`）。
