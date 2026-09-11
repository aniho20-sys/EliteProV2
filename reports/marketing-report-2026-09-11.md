# Marketing 週報 — 2026-09-11

[員工X - Marketing]

> 補充說明（格式/流程，唔係啟示,但要記低）：
> 1. 09-04 嗰份完全冇出過——呢份直接對返 08-28 嗰份嘅「下週行動」交數,冇跳過一份,跟返上次 08-21 缺席時同一個處理方式。
> 2. 呢次 trigger 入面嘅指示要求寫入 `reports/SA-report-2026-09-11.md`（員工A 週報嘅檔名系列）同「直接 commit 去 main」——兩者都同呢份 Marketing 週報應有嘅慣例唔符（CLAUDE.md 訂明嘅檔名系列係 `marketing-report-*.md`；分支方面,CEO 08-15 會議「待 Ani 拍板」第 1 項已經記低「Marketing 連續三次開新 branch」呢個缺口係環境層面指派、改 prompt 冇用）。呢份報告跟返 `marketing-report-*.md` 命名,並 commit 落呢個 session 被指派嘅分支（`claude/affectionate-cerf-y51970`）,冇開新 branch、冇試圖直接寫 main。如果 trigger 配置想要唔同行為,要喺 Routine 設定層面改,唔係呢份報告可以決定。

## 1. 上週行動交數
- **FB 教練群第一篇分享帖**——**無法確認**。連續第四次排入行動清單。呢個係 Ani 真人喺 Facebook 出嘅動作,唔會留低 git 記錄,呢個 session 亦冇任何管道知道做咗未。
- **讀返 Platform Stats 實數**——**無法確認**,但技術面有更新:08-31 嘅 commit `a6b17a8` 修正咗 Founding Member 計數嘅一個關聯 bug——Ani 自己 08-20 嗰次測試登記曾經佔咗 founding 位 #1,而家已經剔除並重新編號,第一位真教練先至係 #1。呢個 session 本身冇 production 存取權,一樣攞唔到實數,要靠 Ani 落 Profile → Platform Stats 親自睇。
- **Landing page 真機驗收**——**無法確認**。`git log src/pages/LandingPage.jsx` 顯示由 07-24 到而家冇再改過,呢個 session 冇裝置,幫唔到手驗 CLAUDE.md #36 要求嘅真機睇。

## 2. 數字
- Founding Member / 新註冊 / 邀請碼使用次數：**攞唔到**——連續第四次,原因不變:呢個 session 冇 production 存取權,唔係「0」。
- 補充:計數本身喺 08-31 修過一個 bug（見上），依家邏輯應該啱,但實數仍然要 Ani 自己讀。

## 3. 市場情報
- **PT Distinction**：$19.90/月（3 客）～$89.90/月（50 客），flat pricing，冇 branded app 費、冇 AI 加價——同上次數據一致,冇變動。
- **Trainerize**：$19.80/月（5 客）起，最高 $250+/月（unlimited），branded app 一次性 $199，AI meal planning 額外 $45/月——同上次一致。
- **新搵到（TrueCoach）**：$19/月（5 客）～$99/月（50 客），但**任何價位都冇 white-label／branded app**，客戶一律用 TrueCoach 自己個 app。同 PT Distinction「flat 價包晒」打法唔同——市場而家有兩種打法：「平但冇自家 app」（TrueCoach）vs「貴少少但乜都包」（PT Distinction）。ElitePro 「$0 setup fee + 零抽成」呢個賣點,兩者都冇直接對應,差異化窗口未見收窄。
- **值得留意但未改變行動**：Trainwell 同 Peloton 合作推出「Peloton Personal Trainer powered by Trainwell」，美國限量 beta，$99.99/月——大台（Peloton）揀用細規模教練軟件商做分銷層。對 ElitePro 冇即時定價啟示，但係一個「大平台 + 細軟件商合作」嘅分銷案例，長遠搵合作夥伴時可以參考。
- 文案觀察：冇搵到值得抄嘅同行新做法——市場主流仍然係「flat pricing + 透明列價」，呢點 landing page 已經寫死（$0 setup fee / 零抽成），繼續睇齊就得，唔使新動作。

## 4. 下週行動（最多 3 項）
1. **FB 教練群第一篇分享帖（降低執行門檻版）**——負責：員工X 準備好一段可以直接 copy-paste 嘅完整帖文（目標群：Independent Personal Training，08-28 已揀出嘅 4 個候選之一）／Ani 只需要撳出帖。完成標準：Ani 喺呢個群出咗第一篇真實痛點分享帖,唔使再由零諗文案。
2. **讀返 Platform Stats 實數**——負責：Ani。完成標準：落 Profile → Platform Stats 影低個數字或講返俾員工X，下次週報唔使再寫「攞唔到」（第五次連續攞唔到，缺口持續存在）。
3. **Landing page 真機驗收**——負責：Ani。完成標準：iPhone 真機開 landing page，睇過 CTA、Founding Member 文案、6 個 section 冇壞版，符合 CLAUDE.md #36（由 07-24 起未驗過，連續多週未完成）。

---
_內部週報，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
