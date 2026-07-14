# Trainer 端 UX Audit（員工D - UI/UX + 員工E - QA）

> 日期：2026-07-14 ｜ 範圍：TrainerDashboard、Clients/ClientDetailPage（全部 tab）、
> WorkoutPlansPage、SchedulePage、Credit 管理（Top-Up + PaymentSheetModal）、
> quick message（NotesSection/quick-msg modal）、ProfilePage/settings、Navigation、
> NotificationCenter、Invoice/Analytics（資訊斷層對照用）。
>
> 方法：逐檔案讀 code（非人手操作截圖），對照 CLAUDE.md 視覺/coding convention 同
> `getSessionColor`/`btn-icon`/EmptyState 等既定 pattern。兩個最可疑嘅發現（ProfilePage
> crash bug、NotesSection fire-and-forget）已經人手覆查 code 確認屬實，唔係 false positive。
>
> **Top 5 排序原則**：呢份報告嘅「Top 5」用「對 solo 教練日常影響 ÷ 工作量」（即 ROI）排，
> 唔係影響力愈大排愈前——一個要幾日先做完嘅大手術，就算影響力勁大，都可能輸俾一個
> 十分鐘就修得好、但每日都會撞到嘅細 bug。真係大工程嘅項目（例如成條收款鏈自動化）
> 會喺 Top 5 之後獨立列出嚟，等 Ani 決定幾時排。

---

## 一、Payment Chain 全鏈追蹤（續約 → 過數 → 確認 → 加 credit）

呢條鏈**由頭到尾冇任何一步自動化**，每一個交接位都靠人手：

| 步驟 | 現狀 | 檔案:行 |
|---|---|---|
| 1. 教練撳「傳送續約提醒」 | 即刻發訊息 + 自動 snooze 7日,冇留低「已提醒未收錢」呢個中間狀態——淨係得「snoozed」,睇唔出學生係咪已讀不回 | `TrainerDashboard.jsx:200-212` |
| 2. 學生睇 Payment Sheet | 純資訊性(bank details + reference),**冇任何按鈕可以通知教練**;學生要自己記得用另一個方法(例如 chat)通知教練已過數 | `PaymentSheetModal.jsx`(comment 6-7 行已經寫明呢個係刻意設計) |
| 3. 教練確認收錢 | 完全喺 app 外面(自己睇銀行戶口),App 冇任何地方記錄「收到咗邊次過數」 | — |
| 4. 教練手動 Top-Up | `handleTopUp` → `addCreditLedgerEntry`,ledger entry 得 `{clientId, trainerId, date, qty, rate, addedBy}`,**冇 reference 欄**,冇辦法對得返學生個 payment sheet reference | `ClientDetailPage.jsx:234-249`；`AppContext.jsx:438-453` |
| 5. 平行嘅 Invoice 系統 | `InvoicePage.jsx` 自己一套「已找數」狀態,同 credit ledger 完全冇連接——同一筆真實收款,教練可能要分別喺兩個地方各自標記一次 | `InvoicePage.jsx` |
| 6. Monthly Report「fee summary」 | 睇落似張發票,但淨係印 PDF,**由頭到尾冇寫入任何 Firestore**(唔會 call `addInvoice`/`addCreditLedgerEntry`),modal 一 close 啲資料就冚咗 | `MonthlyReportModal.jsx:118-149, 239-247` |

**備註**：第2步「Payment Sheet 冇通知教練功能」呢點,喺 Credit 續約提醒 feature 設計階段已經同 Ani 傾過(你話「就算加左意義不大，銀行本身會通知收款未」),**係刻意決定,唔係漏咗**——呢度重提純粹係因為要完整交代成條鏈,唔係話返轉頭建議加返。

**同 Roadmap 嘅關係**：Phase 3(GoCardless Direct Debit)一旦推行,會用月費訂閱**結構性取代**成條「bank transfer + 人手核數」鏈,即係話上面 1-4 步理論上會被淘汰。但 Phase 3 未上線之前,依家呢條鏈就係教練實際日常用緊嘅嘢,第5、6步(Invoice/Monthly Report 兩個獨立系統冇連接)**唔會**因為 Phase 3 而自動解決,要獨立處理。

---

## 二、逐頁發現

### TrainerDashboard.jsx

| # | 問題 | 影響邊個日常動作 | 建議修法 | 工作量 |
|---|---|---|---|---|
| 1 | 「傳送續約提醒」一撳即發,冇預覽/編輯步驟,同旁邊流失類「傳送問候」(有得改先送)唔一致——撳錯掣冇得返轉頭 | 每日 Needs Attention triage | 加一個確認步驟,或者都改做開 modal 俾教練睇一眼先送 | S |
| 2 | 撳「Unread」stat pill 或者未讀訊息卡,跳去 `/messages` 但冇揀返實際個 contact,教練要自己再搵一次 | 回覆學生訊息 | `MessagesPage` 加 route state/param 支援 preselect contact | S/M |
| 3 | 冇「幾時提醒過邊個」嘅紀錄,淨係得「snoozed」狀態,睇唔出已讀不回定未到期 | 續約 follow-up 判斷 | UI 顯示返 snoozed-until 日期,或者加返一個「最後提醒日」timestamp | S |
| 4 | Dashboard stat strip 冇任何收入/欠款資訊(Clients/Today/Unread/Plans 四項完全唔涉及錢) | 每日想知「我今個月賺咗幾多」 | 見底下 Top 5 / 大項目 | M/L |
| 5 | 續約提醒文案硬 code `£`,但 Invoice/Monthly Report 支援 12 種貨幣(HKD 為主) | 非英國教練嘅續約訊息會顯示錯貨幣符號 | 由教練 profile 讀返貨幣設定,或者聲明呢個功能暫時只支援單一貨幣 | S |

### ClientsPage.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 6 | 客戶卡片顯示年齡/身高/目標等,但冇顯示堂數/續約風險,要開 Dashboard 先睇到邊個要跟進 | 掃視客戶清單做 triage | 加一個小 badge/tag(reuse `getSessionColor`) | S/M |

### ClientDetailPage.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 7 | Top-Up modal 冇 reference/收據欄,冇辦法對返 Payment Sheet 個 reference | 核對過數金額 | 加一個 optional「reference/note」輸入,寫入 `creditLedger` | M |
| 8 | 「Save as Plan」每次都提供,唔理個 log 之前係咪已經存過 template,有機會整重複 | 保存訓練計劃做 template | 檢查係咪已存過(名稱比對或者加 flag) | S |
| 9 | Tag 移除「×」按鈕冇定寬高(得 `padding:0`),喺一堆 wrap 緊嘅 tag 中間,mobile 好易撳錯隔籬 | 管理客戶 tag | CSS 補返 min-width/height(~36-40px) | S |
| 10 | Edit Log 每個 set 嘅移除掣,mobile CSS 縮到 28×28px,低過全站 `.btn-icon` 預設 44px | 編輯訓練紀錄(常用功能) | CSS 改返最少 ~36px | S |
| 11 | Tab bar(overview/progress/plans/logs/notes/intake)橫向滑動但冇任何提示話你知重有隱藏 tab | 搵「Notes」/「Intake」 | 加漸變邊緣或者箭嘴提示 | S |
| 12 | Top-Up rate 標籤都係硬 code `£`(同 #5 同一批) | 同 #5 | 同 #5 一齊做 | S |

### MonthlyReportModal.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 13 | 「Fee summary」睇落似開發票,實情淨係印 PDF,冇寫入任何資料庫 | 教練可能誤以為已經「開咗張數」 | 要麼接埋 `addInvoice`,要麼改文案講明「純打印用途」 | M |
| 14 | Print 掣如果瀏覽器擋咗 popup,**完全靜默失敗**,冇 toast 提示 | 每月出報告(mobile/PWA 尤其常見) | 加返 error toast fallback | S |
| 15 | 貨幣選單預設 HKD + FPS/PayMe 選項,同續約流程硬 code GBP 唔一致 | 貨幣顯示混亂 | 需要全站貨幣邏輯統一(較大範圍任務) | M |

### NotesSection.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 16 | `sendMessage` 冇 `await`、冇 try/catch、冇 sending state——違反 CLAUDE.md 第11/14條;離線或者權限錯誤時,輸入框會靜默清空,教練/學生以為已送出 | 教練學生日常最常用嘅溝通渠道(包括續約跟進) | 改做 `async` + `await` + try/catch + saving state,跟返全站慣例 | S |
| 17 | Notes tab 標題寫「Notes & Messages」,但實際同 Messages 頁係同一條 thread,冇分別提示 | 搞唔清訊息紀錄住喺邊 | 細節文案調整 | S |

### PaymentSheetModal.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 18 | 冇「我已經過數」呢類通知教練嘅按鈕(**已知決定,見上面Payment Chain備註,唔係新建議**) | — | — | — |
| 19 | 教練未設定 bank details 時,顯示純文字「請直接聯絡教練」,冇任何按鈕帶去 Messages | 學生想續約但教練未設定資料嗰陣 | 加一個「Message your trainer」按鈕 | S |

### WorkoutPlansPage.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 20 | `saveAsTemplate`/`getTemplates`/`deleteTemplate` 喺 `AppContext.jsx` 完整實作咗,但成個 UI 搵唔到任何入口撳到——後台功能完全「死咗」 | 想將計劃儲存做 template 重用 | 補返「Save as Template」掣 + template 選擇器 | M |
| 21 | 兩條唔同嘅 custom exercise 路徑(自動存 Library / 揀先至存),資料形狀唔同,搞到之後 PR/progression 追蹤唔到 plan-local 嘅動作 | 自訂動作 + 之後嘅 PR 追蹤 | 統一行為或者加清晰文案解釋分別 | M |
| 22 | Mobile 版排序掣縮到 20×20px,同 trash icon 埋得好近 | Plan builder 手機排序動作 | CSS 修返合理大小 | S |
| 23 | 每個動作嘅 unit-type pill 高度得 ~24-26px,一行擠幾個 | 手機改動作單位 | CSS 修返 | S |

### SchedulePage.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 24 | 頁頭「Book Session」掣唔會帶埋已揀日期,但日曆內某一日嘅 empty-state CTA 就會——兩個入口行為唔一致 | 每日 book session(最常用動作) | 兩個入口都帶埋 `selectedDate` | S |
| 25 | Pending session 嘅普通 Cancel(X)完全冇確認,隔籬嘅 Delete(垃圾桶)就有 confirm modal——兩個destructive動作安全程度唔一致 | 取消堂(一撳錯冇得返轉頭) | Cancel 都加返輕量確認 | S/M |
| 26 | Pending session 最多4粒 icon 掣擠埋一齊(綠剔/紅叉/綠圈剔/紅垃圾桶),圖示相似度高,易撳錯 | 日常管理堂表 | 加大間距或者icon辨識度、或者收埋做選單 | M |
| 27 | Mark Complete recap modal 喺 `SchedulePage.jsx` 同 `TrainerDashboard.jsx` 各寫一份,**內容唔一致**(Schedule版有「剩餘堂數」警示,Dashboard版冇) | 教練由邊一頁完成堂,見到嘅資訊都唔同 | 抽出做共用 component | M |
| 28 | 「剩餘堂數」顏色/門檻邏輯全 repo 有**4個唔同實作**(`SchedulePage.jsx` 兩個唔同版本、`sessionUtils.js`、`ClientProgressOverviewPage.jsx`),仲有硬 code hex 色(`#06d6a0`)違反 CSS variable convention | 同一個剩4堂嘅學生,唔同頁面顯示緊唔同顏色 | 統一用返 `getSessionColor` util,清走硬 code hex | M |
| 29 | Mark Complete 完成 toast 用咗中文「課堂完成」,呢頁其他地方全部英文 | 完成堂(常用動作) | 一行文案改英文 | S |

### ProfilePage.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 30 | **已確認嘅 crash bug**:第513行用咗 `<Link size={16} />`,但 import 列表(第4行)得 `Link2`,冇 import `Link`(`react-router-dom` 嘅 `Link` 都冇 import)——學生冇連教練時撳「Connect」呢個 block 會 `ReferenceError` 令 Profile 頁 crash | 任何未連教練嘅學生打開自己個 Profile 頁 | import 返正確嘅 icon(可能想用嘅係 `Link2`) | S(但屬於**真實 crash**,唔係普通UX建議,優先級要提高) |
| 31 | Renewal Pricing / Bank Details(續約提醒 feature 核心設定)冇任何入門提示,對比 Working Hours 喺 SchedulePage 有 dismissible banner 提醒去設定 | 教練可能用幾個月都唔知去設定,續約 feature 靜默完全冇效 | 跟返 Working Hours 個 pattern 加提示 banner | S/M |

### Navigation.jsx

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 32 | Invoices/Analytics(僅有嘅收入視角)手機版收埋喺 More 入面,要2下先撳到 | 想每日check收入 | 見底下 Top 5 / 大項目 | S(nav 調整)/更大(如果要加 widget) |
| 33 | Profile 同時出現喺 header icon 同 More 清單,數據模型上重複(實際唔影響用戶,純代碼衛生) | 冇實際影響 | 清理 nav config | S |

### NotificationCenter.jsx / NotificationContext.jsx(通知鐘)

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 34 | 通知鐘同真正 FCM push 系統係兩套完全冇關係嘅嘢(鐘淨係本地 derive 自 Firestore + localStorage 記「睇過未」),教練可能以為兩者相關 | 對「通知」呢個概念嘅心智模型混亂 | 分開命名/講解清楚(例如鐘叫「Activity」),或者長遠整合兩者 | M |
| 35 | ProfilePage「Send Test」掣淨係測試瀏覽器 Notification API,冇測試真正 Cloud Function → FCM 全鏈,可能俾人錯覺已經全鏈確認咗 | 教練驗證 push 通知運作 | 文案講清楚呢個淨係本機測試 | S |
| 36 | 通知鐘按鈕 ~32px,同手機頭條同一行嘅其他 icon(44px)大小唔一致 | Mobile header 一致性 | CSS 修返 | S |
| 37 | 又一個硬 code hex(`#22c55e`)違反 convention | 代碼衛生 | 改用 CSS variable | S |

### InvoicePage.jsx / BusinessAnalyticsPage.jsx(資訊斷層對照)

| # | 問題 | 影響 | 建議 | 工作量 |
|---|---|---|---|---|
| 38 | Dashboard 完全冇收入/欠款視角,要教練自己記得去 `/invoices` 或者 `/analytics`(兩個都收埋喺 More,2下先到) | 每日想知邊個未找數 | 見底下 Top 5 / 大項目 | M/L |
| 39 | Analytics 頁「⚠ 欠款」係純文字,冇連結去 Invoice 頁篩選畫面 | 跟進欠款 | 加 onClick 跳轉 | S |
| 40 | **BusinessAnalyticsPage 完全冇讀 `creditLedger`**,收入數字全部靠 `getInvoices` 計——但依家個續約 feature(呢個 project 今個 session 主力建嘅嘢)嘅真金白銀係記喺 `creditLedger` 度嘅!淨用續約收款、冇開正式 Invoice 嘅教練,個「本月收入」會顯示錯(偏低甚至 £0),明明有真實收入 | 教練最信任嘅財務數字**係錯嘅** | 將 `creditLedger` 收入併入 Analytics 計算 | L |

---

## 三、Top 5 優先榜(對日常影響 ÷ 工作量)

| 排名 | 發現 | 影響 | 工作量 | 點解排呢個位 |
|---|---|---|---|---|
| **1** | #30 ProfilePage `Link` 冇 import 嘅 crash bug | 高(令個頁面直接壞咗) | **S**(一行 import) | 呢個唔係「UX 建議」,係真係壞咗嘅 code,修復成本近乎零,理應優先過所有其他 UX 討論 |
| **2** | #16 NotesSection `sendMessage` 冇 await/try-catch | 高(核心溝通渠道靜默send失敗風險,續約跟進都靠呢度) | **S** | 修法好簡單(加 async/await/try-catch/saving state),但避免嘅係「教練以為送咗但其實冇送到」呢種高殺傷力嘅信任問題 |
| **3** | #31 Renewal Pricing/Bank Details 冇設定提示 | 高(直接影響 Credit 續約提醒 feature 有冇效——依家個 feature 可能有教練完全唔知要去設定) | **S/M**(照抄現有 Working Hours banner pattern) | 保護緊今個 session 先至上線嘅核心 feature 唔好靜默無效 |
| **4** | 手機 tap target 一次過掃(#9、#10、#22、#23、#36 五個位) | 中高(solo 教練成日用手機單手操作,呢啲全部係常用動作) | **S**(全部純 CSS,可以一個 PR 一次過改晒) | 五個獨立發現但修法完全同類型,合埋做一個批次任務,CP值極高 |
| **5** | #28「剩餘堂數」顏色/門檻4個唔同實作 + 硬 code hex | 中(視覺唔一致會蝕教練信任度,亦係實質 bug 風險——邏輯本身都唔一致) | **M** | 需要少少重構(統一用 `getSessionColor`),但一次過解決成個 repo 嘅顏色矛盾,順便清埋 hardcoded hex 違規 |

### 大項目(超出 Top 5 嘅工作量,但唔可以唔提)

| 項目 | 備註 |
|---|---|
| **成條 Payment Chain 自動化** | 結構性由 **Phase 3 GoCardless** 解決(訂閱月費會取代人手過數確認),Phase 3 上線之前呢個係現實限制,唔建議依家大改 |
| **#40 BusinessAnalytics 冇讀 creditLedger,收入數字錯** | **唔在任何 roadmap phase 覆蓋範圍**,建議獨立排做真正任務——依家個續約 feature 收嘅錢,Analytics 見唔到 |
| **#38 Dashboard 冇收入/欠款一眼睇晒嘅位** | 同 #40 相關,建議一齊做:整合 Invoice + creditLedger 做一個 Dashboard revenue widget |
| **#20 WorkoutPlansPage 冇 Save as Template UI** | 後台完整、前端完全冇入口嘅「死功能」,值得補完 |
| **#27 Mark Complete modal 兩份唔同內容** | 建議抽做共用 component,一次過解決重複維護同資訊唔一致問題 |

---

## 四、同現有 Roadmap 嘅關係

- **Phase 2(UI Cleanup,狀態:to be confirmed)**:呢份 audit 入面大部分「一致性」類發現(#5、#12、#15 貨幣、#28 顏色門檻、#34/36/37 通知鐘、mobile tap target 一批)本質上就係 Phase 2 想做嘅嘢,建議直接編入 Phase 2 範圍,唔使開新 phase
- **Phase 3(GoCardless)**:會結構性取代成條人手 payment chain(第一節),上線之前呢啲發現屬於「現實限制」而非「bug」
- **Phase 4(PWA/FCM,狀態:已上線)**:通知鐘(#34-37)嘅問題**唔屬於 Phase 4 範圍**——Phase 4 係做好 push 通知底層,通知鐘本身係另一套獨立、本地 derive 嘅 UI,兩者要分開睇
