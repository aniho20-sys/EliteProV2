# ElitePro 開發進度紀錄

> 最後更新：**2026-08-03**（Session 35-38 — exerciseOverrides、STYLE.md + Phase 2 執法、Phase 3 Step 1-2 上線、invoice PDF、code health audit、學生 onboarding 修復、credit 透支 booking、workout log/session 解耦規則）
>
> ⚠️ **所有 agent 開工前必讀。** 過時嘅 PROGRESS.md 曾經令 audit 判斷出錯，見「Phase 狀態速查」。

---

## 📍 Phase 狀態速查（agent 開工前先睇呢度）

對照 `ROADMAP.md` 嘅 5 個 Phase。**唔好靠讀舊 session 記錄推斷狀態** —— 2026-07-28 個 code health audit 就係因為 ROADMAP 仲寫住「Phase 3 冇任何 code」而差啲判斷錯。

| Phase | 狀態 | 實際情況（2026-08-03） |
|---|---|---|
| **1. Credit System UAT** | 🟡 部分完成 | Book 即扣、取消退款、早取消上限、透支 1 堂全部上線並有 test。透支兩條路徑已於 2026-08-04 真機實測通過。剩返 Top-Up rate 選擇器、續約提醒、Landing Page 全程 E2E 未實測 |
| **2. UI Cleanup** | ✅ 完成 | `STYLE.md` 建立並全app執法：session 顏色統一、hex 轉 variable、empty state 補 action、密度檢視、dark mode pass |
| **3. GoCardless 訂閱** | 🟡 Step 1-2 已上線 | schema + rules + OAuth connect 後端（4 個 function）**已部署 live**。Step 3（訂閱管理UI + mandate 創建）未開工。⚠️ Connect 掣未有真人試過 sandbox flow |
| **4. PWA / FCM Push** | ✅ 完成 live | PWA 可安裝、離線持久化、13 個 function 之中 6 個負責 push（訊息／排程／計劃／log／低堂數）|
| **5. Venue Marketplace** | ⬜ 未開始 | gym啦 Sprint 1 code 已寫但 `GYMLA_ENABLED=false` 隱藏緊。開之前必查 `isTrainer`/operator 三態問題（見 backlog #17）|

**現時測試覆蓋：** Cloud Functions 35 條（credit 25 + GoCardless nonce 10）、Firestore rules 37 條。全部要求 emulator 綠燈先當完成。

---

## 🚀 即時行動清單（推廣前必須完成）

> 目標：搵第一位 Founding Member 前，以下全部 ✅

| 優先 | 任務 | 負責 | 狀態 |
|------|------|------|------|
| 🔴 | 更新 Landing Page copy → 首5位 Founding Member，3個月免費 | 員工B | ⬜ |
| 🔴 | 手機打開 `/#/landing` 確認版面效果 | 自己 | ⬜ |
| 🔴 | Firebase Console → Functions 確認存在（而家係 **13 個** functions，含 `onScheduleBooked`/`onScheduleCreditUpdate` + 4 個 Phase 3 GoCardless） | 自己 | ✅ CI 自動部署持續成功（`Deploy Functions` 步驟），人手 Console 覆核可選做 |
| 🔴 | Firebase Console → Firestore Rules 確認係最新版本 | 自己 | ✅ CI `Deploy Firestore Rules` 步驟每次 push 都成功 |
| 🟠 | End-to-end 測試：Landing Page → Sign up → 加 client → Book session → Mark Complete → 確認堂數扣數 | 自己 | 🟡 部分完成——Book session 即扣/24小時前取消退款已由教練實測確認（見 Phase 1 Credit UAT），但未由 Landing Page signup 開始跑全程 |
| 🟠 | iOS Safari + Android Chrome 各測試一次 | 自己 | ⬜ |
| 🟡 | 寫 WhatsApp 邀請訊息，直接搵5個教練朋友 | 員工X + 自己 | ⬜ |

---

## 🎯 競品對比

| 功能 | Hevy Coach | ElitePro |
|------|-----------|---------|
| Workout programming | ✅ | ✅ |
| Client progress charts | ✅ | ✅ |
| Messaging | ✅ | ✅ |
| Rest Timer | ✅ | ✅ |
| Plan Templates | ❌ | ✅ |
| Session booking | ❌ | ✅ |
| 堂數管理（Top-Up + 自動扣） | ❌ | ✅ |
| Invoice / 收費 | ❌ | ✅ |
| Workout Log 編輯 | ❌ | ✅ |
| Workout Complete Screen | ❌ | ✅ |
| Smart Progression | ❌ | ✅ |
| Badge / 獎章系統 | ❌ | ✅ |
| Push Notifications | ✅ | ✅ |
| Built-in exercise GIFs | ✅ | ❌ |
| Excel / CSV 客戶匯入 | ❌ | 🔜 規劃中 |
| Apple Watch 整合 | ✅ | ⚠️ 需 Capacitor |
| Native mobile app | ✅ | ⚠️ PWA |

---

## ✅ 已完成功能

### 基礎架構
- React 19 + Vite 8 SPA（HashRouter）、Trainer / Client 雙角色
- Firebase Auth（Google、Email/Password、Forgot Password、Demo Coach）
- **Google 登入修復**（桌面 popup、手機/PWA redirect；`redirectChecked` 解決 race condition 閃屏問題）
- Firestore real-time sync（8 collections）、IndexedDB offline persistence
- PWA manifest + iOS Add to Home Screen（white-bg blue-swirl logo，no-cache headers）
- Firebase Hosting + GitHub Actions CI
- Privacy Policy + Terms of Service（GDPR compliant，contact: Elitepro616@gmail.com）
- Global Search（`useMemo` 優化）、EmptyState、Skeleton、Toast、Error Boundary

### 訓練管理
- Workout Plan Builder（drag reorder、duplicate、custom exercises、templates、equipment filter、per-exercise unit type + notes）
- **Plan editor 只訂 Reps / Time / Distance 目標**（移除 Wt+Reps pill；weight_reps 動作自動顯示 Reps）
- Workout Log（auto-fill、PR tracking、edit 權限用 `createdBy` 判斷、localStorage draft）
- **Trainer 可替 client 記錄 workout log**（ClientDetailPage → Log Session → WorkoutLogPage，含 rest timer）
- **Workout Log 快速輸入**（inputMode decimal/numeric、Enter 自動跳焦點、+/− Stepper、Fill 填入上次、Apply 套用進階建議、Add Set 複製上一 set）
- **Workout Complete Screen**（儲存後顯示 volume、exercises、RPE、new PRs、closing message）
- Rest Timer（sticky bar、5個預設、Web Audio、震動；trainer/client 通用）
- Smart Progression Suggestions（plateau 時顯示 +2.5kg 建議，可一鍵 Apply）
- **Bulk Assign Plan**（checkbox multi-select + `Promise.all` 批量建立）

### 排程 & 堂數
- Schedule 日曆（conflict check、working hours、可前後翻閱歷史日期）
- **Block Time 合併入 Book Session modal**（頂部 toggle：Book Session ｜ Block Time；共用日期 + 時段 picker；Blocked slot 若已有真實 session 自動隱藏）
- Session Recap 一鍵發送（Mark Complete → recap modal → 發送 message 給 client）
- ~~完成課堂自動扣堂數~~ **已被 Session 33「Book 即扣 Credit」取代**——而家扣數喺 book session 嗰刻已經發生，Mark Complete 只做狀態更新（舊有未打上 `deductedAtBooking` 標記嘅 booking 除外，見下面 Session 33 章節）
- **堂數 Top-Up 功能**（+5/+10/+20 快捷鍵 + 自訂數量 modal + rate 選擇——見 Session 33「Credit 續約提醒」）

### 客戶管理
- Client 管理（搜尋、detail view、labels/分組、Remove Client）
- Body Stats / Progress（Recharts AreaChart、趨勢指示、edit measurement）
- Per-exercise strength progression chart（ExerciseProgress component，auto-select most-logged）
- Volume Analytics Chart（ProgressPage + ClientDetailPage）
- Trainer 全客戶進度概覽頁（sparkline、排序）
- Badge System Phase 1（1/10/50/100 次里程碑；ClientDashboard + ClientDetailPage 顯示）

### 商業功能
- Invoice / 收費管理
- Business Analytics（/analytics：月收入、sessions、30日 retention、Top clients）
- **學生流失預警**（Trainer Dashboard：7 天無 workout log 標 `Inactive Xd`；sessions remaining ≤ 2 標紅；雙 tag 排序顯示最高風險客戶）
- In-app Messaging（unread badges、real-time sync、rate limiting 10條/分鐘）

### 其他
- Exercise Library（search、filter、YouTube links、Kettlebell + Other equipment）
- **Exercise Picker 優化**（橫向 muscle chip 篩選、高度自適應 `clamp()`；MuscleSelector 改為 chip 文字選擇）
- Profile（invite code、shareable link、working hours、connect to trainer）
- Trainer Dashboard（stats + weekly chart + client activity）
- Client Dashboard（stats + sessions quota + Book Session CTA）
- Mobile More 抽屜（底部導航 4 tab + slide-up sheet；Trainer 手機 Plans 升至主 tab）
- **FCM push notifications 代碼已完成**（VAPID key 已配置；Cloud Functions 已寫好；iOS 需 PWA 模式；實際運作待確認）
- **Landing Page**（`/#/landing`，CSS UI mockups，無需登入；待手機版面確認 + copy 更新，見即時行動清單）
- **Client Onboarding（IntakeFormPage）**（PAR-Q 式問卷）

### gym啦 Sprint 1（已完成 — commit 82306e3；現透過 `GYMLA_ENABLED=false` 暫時隱藏，見 Session 32）
整合入 ElitePro，共用 Firebase project `elitepro-16718`。Code 全部保留，`App.jsx` 將 `GYMLA_ENABLED` 設返 `true` 即可重新啟用。
- `operator` role routing + OperatorDashboard
- Studio 管理（新增 / 編輯 / 停用）
- Studio Slots 批量開放（1 小時一格）+ `runTransaction` 防 race condition booking
- 教練申請流程（TrainerApplicationPage）+ Operator 審核（approve / reject）
- TrainerDashboard gym啦 CTA card（`gymlaStatus === 'none'` 時顯示）
- Firestore rules（`studios`, `studioSlots`, `trainerApplications`）
- 新 Pages：`OperatorDashboard.jsx`, `StudioManagementPage.jsx`, `StudioBookingPage.jsx`, `TrainerApplicationPage.jsx`

### Credit 續約提醒（Session 33）
- **學生端**：credit card 剩 3 堂／1 堂各彈一次可關閉嘅提示卡（Firestore flag `renewalPrompt3Shown`/`renewalPrompt1Shown` 控制只彈一次，續約後自動 reset）；剩 2-3 堂期間常駐一行「Renew early to keep your current rate」取代舊有「Running low」字句（教練未設定 rate 時繼續顯示舊字句作 fallback）
- **Payment Sheet**：撳 Renew 彈出 bank details modal，逐行 copy + Copy all，reference 用學生 id 生成，寫明「rate confirmed when payment received while sessions remain」；純資訊性，唔會自動通知教練（教練話銀行自己會通知收款）
- **教練端**：ProfilePage 新增「Renewal Pricing」（current rate／renewed-after-exhausted rate）同「Bank Details」設定；ClientDetailPage Top-Up modal 加 rate 選擇（預設按 remaining>0 揀返現行 rate，用晒先揀加價 rate）
- **新 collection `creditLedger`**：每次 top-up 一條 append-only 記錄（`clientId, trainerId, date, qty, rate, addedBy`），trainer 建立、trainer + 該 client 可讀，唔可以 update/delete
- **`onSessionsLow` Cloud Function 今次無改**：獨立運作，未同呢個 in-app 提示統一文案（留待日後）

### Session Credit 喺 Book 果刻即扣（Session 33）
- Sessions ARE session credit：book session 成功即刻扣 1 堂（新 Cloud Functions `onScheduleBooked` + `onScheduleCreditUpdate`，server-side transaction，唔靠前端寫 `sessionOffset`）
- 24小時前取消退返 credit（每個學生每月上限 2 次免費早取消，用晒就算 24 小時前取消都照收）；24小時內取消照收
- 舊有（呢個 feature 上線前）已 book 但未完成嘅 session 冇 `deductedAtBooking` 標記，Mark Complete／late-cancel 會補扣一次，新舊自然共存唔會走數或者重複扣
- 順帶修埋兩個相關 bug：`updateClient()` 冇 optimistic local patch 導致教練自己畫面（Top-Up、Set Total、tag）寫入成功但唔即時反映；`handleTopUp` 錯誤提示冇顯示實際 Firebase error code

### Credit Cloud Function 自動化測試（Session 33）
- 新增 `functions/test/bookSession.test.js`：12 個 Jest test，跑真正 Firestore emulator（冇 mock），涵蓋 `onScheduleBooked`/`onScheduleCreditUpdate` 全部分支——book即扣、blocked slot/冇client doc 唔扣、24小時前退款、24小時內照收、每月2次上限、跨月reset、舊booking補扣（late-cancel/Mark Complete）、新booking Mark Complete唔重複扣
- `functions/` 新增 `jest`/`firebase-functions-test` devDependencies + `test`/`test:emulator` script（之前完全冇 test infra）
- 測試素材來源：喺分支清理過程搵到一條獨立、平行開發嘅「Session Credits」實作（`claude/review-claude-progress-docs-UvHbs`，改名UI、`creditBalance` 欄位、migration script），同 Session 33 呢個實作方式唔同、未 merge。已將個分支存做 `archive/parallel-credit-system-2026-07`（保留參考），攞返裡面嘅 test 檔案改寫做測試而家實際嘅實作（`sessionOffset`/`deductedAtBooking`），冇碰佢嘅 migration script 同改名部分。原分支已刪
- **分支清理完成**：連同其他 20 幾條 4-5 月遺留、內容已過時嘅 session 分支（同 main 冇 common ancestor，屬於 repo 早期 unrelated-histories merge 之前嘅舊 lineage），加埋幾條週報 branch 一齊處理咗；而家 remote 淨返 `main`（`claude/fitness-app-features-LbxtG`）、`archive/parallel-credit-system-2026-07`、`gh-pages` 三條

### Needs Attention 重新設計：報告板 → 待辦盒（Session 33）
- 拆返做兩個獨立分類，唔再撈埋：【續約】（sessions used up／≤2 堂，紅色，永遠排先）同【流失風險】（inactive 門檻由 7 日提高到 21 日，黃色）
- 每項有真正 primary action，唔淨係開 chat：續約 →「Send renewal reminder」一撳即送（沿用教練喺 Profile 設嘅 rate 文案），送出後自動 snooze 7 日；流失 →「Send a check-in」開返現有 quick-message modal（冇改動）
- 兩類都可以 Snooze 7／14／30 日，存喺 client doc 新欄位 `renewalSnoozedUntil`／`churnSnoozedUntil`（唔係 local state，換機都記得；到期用日期比較自動恢復，唔使 cron）
- 首頁最多顯示 3 項（續約優先塞滿），其餘用「View all」inline 展開；全部清晒顯示「All clear ✅」
- `firestore.rules` 冇改動——教練寫自己客戶 doc 本身已經冇欄位限制，已經涵蓋新欄位

### Needs Attention「流失風險」false positive 修復（Session 34）
- 員工B：發現 inactive 定義淨係計 `workoutLogs` 日數，令每星期上堂但唔記錄workout log 嘅活躍付費客被誤標「流失風險」
- 改做「最後活動」= max(最後 workout log 日期, 最後 `status:'completed'` 嘅 schedule 日期)，超過 21 日先算 inactive；`TrainerDashboard.jsx` 嘅 `churnClients` 同 `ClientDashboard.jsx`（學生端 Home）嘅「This Week」stat 都套用同一個邏輯（This Week 由淨計 log 改做計 distinct 訓練日：log 日期 ∪ 完成 session 日期）
- **順帶發現，未修**：`TrainerDashboard.jsx` 嘅 `ClientActivityList`（另一個獨立小組件，顯示每個客戶「Xd ago」）都係用返舊嘅 log-only 邏輯，同一個 root cause，但呢次冇喺批准範圍入面，未郁
- 學生端「上次活動」——搵過 `ClientDashboard.jsx`全文，暫時搵唔到獨立嘅「上次活動」stat（得返「This Week」／「Total」兩個 pill），已經連 This Week 一齊修；如果 Ani 講嘅係第度嘅 UI 元素，需要補充位置先可以修
- 12 個 credit emulator test 保持全綠；`npm run build` 通過
- **待 Ani 驗證**：邊個客戶會由清單度消失，取決於「有 completed session 但冇 log」嘅實際客戶名單，冇真實數據冇辦法離線比對，要 Ani 部署後喺真實 Needs Attention 面板前後對比

### Trainer 端 UX Audit + Top 5 首兩項修復（Session 33）
- 員工D+員工E 出咗 `reports/ux-audit-trainer-2026-07-14.md`，逐頁 audit TrainerDashboard/Clients/ClientDetailPage/WorkoutPlansPage/SchedulePage/Credit管理/NotesSection/ProfilePage/Navigation/通知鐘/Invoice/Analytics，40 個發現 + 完整 payment chain 追蹤（確認由頭到尾冇一步自動化）+ Top 5 優先榜
- 修咗 Top 5 首兩項（純 bug fix，未動其他建議）：
  - **ProfilePage crash bug**：「Connect to Coach」掣用咗冇 import 嘅 `<Link>` icon，令未連教練嘅學生打開自己個 Profile 會 `ReferenceError` crash；改用返已經 import 咗、風格一致嘅 `<Link2>`
  - **NotesSection 送唔到訊息風險**：`handleSend` 之前冇 `await`、冇 try/catch、冇 sending state（違反 CLAUDE.md 第11/14條），離線或者權限錯誤時輸入框會靜默清空，令人以為送咗但其實冇送到；已改做 `async`/`await`/try-catch/toast error/sending state 全套
- 發現全 repo 有 4 個唔同版本嘅「剩餘堂數」顏色門檻邏輯（`SchedulePage.jsx` 兩處、`sessionUtils.js`、`ClientProgressOverviewPage.jsx`）+ `BusinessAnalyticsPage` 完全冇讀 `creditLedger`（續約收嘅錢喺 Analytics 度會顯示錯）——呢兩點未修，留喺 audit 報告嘅「大項目」清單

### Exercise Library 重新設計 Phase A+B（Session 34）
- 員工A+員工D 出方案（版面 + 數據規範），Ani 批准 4 個開放問題後實裝：
  - **版面**：card grid 改做 list view（一行一動作 + tags + 🎥 icon），撳入去先開 detail modal 做 edit/delete/影片管理；頂部兩個 `<select>` filter 改做 muscle/equipment/movement pattern 三組 chips
  - **必填驗證**：新增動作要求至少 1 個 muscle group + 1 個 equipment type（`utils/exerciseUtils.js` 新增共用 `exerciseFieldsValid()`），套用去 Exercise Library 主 modal **同** `WorkoutPlansPage` 全部寫入 `exercises` collection 嘅路——`handleCreateCustomExercise` 同 submit-time 嘅 leftover-text auto-create 之前會靜默用 `muscle:'Custom', equipment:'Other'` 建立冇規範嘅動作，而家改咗做導向去要求填muscle+equipment 嘅完整表先可以建立；`ExerciseSwapModal` 嘅 Custom tab（本身完全冇寫入 `exercises` collection）留返第二階段，同「應唔應該存入 library」一齊傾
  - **名自動 title case**：新增 `titleCaseExerciseName()`，保留全大寫縮寫（如 RDL）唔會被強行改做 Rdl
  - **新分類軸「動作模式」**：`movementPatterns` 常數（Hinge/Squat/Push/Pull/Carry/Locomotion/Rotation），first-class filter chip，非必填
  - **aliases 欄位**：可加中文名/簡寫，search 同時比對 name + aliases
  - **影片 in-app 播放**：Detail modal 原有嘅 YouTube iframe embed（撳一下先播放）保留唔變；Add/Edit 表單而家貼 YouTube link 會即時顯示內嵌預覽（唔再係外開連結）
  - **formCues 決定**：重用現有 `instructions` 欄位顯示做「動作要點」，冇開新欄位；新增 `commonMistakes`（常見錯誤）欄位，得內容先顯示
  - `firestore.rules` 冇改動（`exercises` update 規則本身冇 field allowlist，已核實）
- **教練端新增「匯出動作庫」功能**（`ProfilePage.jsx`）：一撳將全部動作 copy 做 JSON 去 clipboard，貼返俾 AI 分析——因為 Ani 全程用手機，冇 terminal，呢個原則已寫入 CLAUDE.md 第26條
- **合併重複動作機制決定**（未實裝，留返 Phase C 之後）：唔用 batch rewrite 歷史數據，改用「軟合併」——舊 doc 標記 `mergedInto: 新ID`，`resolveExerciseName`/`ExerciseProgress` 讀取時跟呢個指針解析，PR 歷史自動冧埋計、可 undo；呢條原則已寫入 CLAUDE.md 第27條
- 12 個 credit emulator test 保持全綠（呢次改動完全喺 `exercises` collection + UI，冇掂 `functions/index.js`）；`npm run build` 通過

### Exercise Library Phase C：大掃除預覽 + 批准執行（Session 34）
- Ani 匯出真實 `exercises` 數據（42 條教練自建 + 22 條共用底版），出咗 artifact 版大掃除預覽表：19 項缺 tag/標籤唔規範、7 項命名唔規範、4 組疑似重複
- **查到「兜巴星」`custom--` 空白 ID 根源**：嚟自 2026年4月已刪走嘅舊 function（`'custom-' + name.replace(/[^a-z0-9]+/g,'-')`，ASCII-only regex 隔走晒中文字）；已核實現時 3 條建立動作嘅路全部用 timestamp 做 ID（唔睇個名），呢類 bug 結構上唔會再發生
- **已確認、寫落 CLAUDE.md 嘅決定**：22 條共用底版動作（冇 `trainerId`）係刻意設計；「Triceps extension」vs「Overhead Tricep extension」係兩個唔同動作，唔合併
- **軟合併機制正式實裝**：`utils/exerciseUtils.js` 新增 `canonicalExercise()`，跟 `mergedInto` 指針解析到最終存活嘅 exercise（`resolveExerciseName` 已套用）；`ExerciseProgress.jsx`（`exerciseOptions`/`buildHistory`）同 `AppContext.getPersonalRecords` 都改做用 canonical id 分組，舊 id 嘅歷史 log 會自動冧埋計落新 id，唔使改動任何 `workoutPlans`/`workoutLogs` 文件
- **一次性「Apply Approved Cleanup (Batch 1)」按鈕**（`ProfilePage.jsx`，Exercise Library Backup 卡下面）：執行 Ani 批准嘅 9 項操作——刪除「兜巴星」`custom--`、刪除「Core」`ex-1781006442488`、合併 Core boat（留 `custom-core-boat`）、合併 Hip abduction（留 `ex-1776704070364`）、5 項改名（KB Single Arm Row / Chest Press (Machine) / Walking Lunges / Hip Adduction (Machine) / Hip Abduction (Machine)）——因為冇 admin SDK 憑證，需要 Ani 喺 app 度親手撳一次先會真正寫入 Firestore；跑完之後會喺跟進 commit 度移除呢個按鈕
- **未處理，等 Ani 拍板**：`ex-1779565704448`「Mobility workout」——冇缺明確嘅改名/去留建議，Ani 呢次批准清單冇提到，留待下次
- 12 個 credit emulator test 保持全綠；`npm run build` 通過

### Exercise Library List View 密度重做（Session 34）
- Ani 驗收 Phase A+B 之後打回頭：list view 實際效果係「細張卡片」唔係真正 list——重做：
  - 每行實高 56px、細分隔線、`.exercise-list` 淨係外層一個 rounded container，行本身冇圓角/白卡/陰影
  - 動作名 semibold 做主角，肌群/器材/動作模式濃縮做一行細字（如「Core +3 · Bodyweight」），唔再用逐個 tag pill
  - 有片先顯示 lucide `Play` icon（細細個、右邊），移除晒 emoji 🎥
  - 3 組 filter（muscle/equipment/movement）由 3 行併做一行橫向 scroll，每組做 App Store 式摺埋 chip：撳先展開選項，揀咗變「Muscle: Core ✕」
- **過程中執到 2 個真 bug，已修**：
  1. Sticky filter row 嘅 breakpoint（768px）同真實 app `.mobile-header` 出現嘅 breakpoint（1024px）唔啱，窄啲嘅平板寬度會令 chips 匿埋喺 header 後面——已統一做 1024px
  2. Dropdown 展開嗰陣俾裁到得返一條線咁高——CSS 冷知識：淨係設 `overflow-x` 會強行將 `overflow-y` 都變做 `auto`，連累用嚟做橫向 scroll 嘅 container 裁走咗展開嘅 dropdown；改用 JS 量度按鈕位置嚟 position 個 dropdown（唔再靠 CSS `top:100%` 呢種相對定位）解決
- 用真實 `index.css` + 真實 post-cleanup 數據做靜態 mockup screenshot 俾 Ani 驗，確認密度（scroll少少即12+行可見）先 commit
- 12 個 credit emulator test 保持全綠；`npm run build` 通過

### 動作 list 全站 A-Z 排序（Session 34）
- 新增共用 `sortExercisesByName()`（`utils/exerciseUtils.js`，`localeCompare` + `sensitivity:'base'` 做 case-insensitive），喺 render 嗰刻排序，唔靠 Firestore 返嚟嘅次序
- 套用去 3 個顯示動作 list 嘅地方：`ExerciseLibraryPage.jsx`（Library 主頁）、`WorkoutPlansPage.jsx`（Add Exercises 搜尋結果）、`ExerciseSwapModal.jsx`（swap/add exercise picker，順便修埋一個小 bug：原本 `.slice(0,60)` 喺 sort 之前就切走，而家已經改做「先 sort 先 slice」，等頭 60 個真係 A-Z 頭 60 個）
- Filter 篩選完嘅結果、新增動作 submit 完，都會即時出現喺正確字母位置——因為排序喺 render 層做，唔靠儲存次序
- 12 個 credit emulator test 保持全綠；`npm run build` 通過

### `exerciseOverrides` 疊加機制（Session 34）
- 觸發：Ani 報告「Barbell Curl」改/刪唔到，查出真正原因——22 條 seed 動作純粹係 `data/exercises.js` 嘅靜態 JS 陣列，`AppContext.jsx` 每次都直接 `concat` 落 exercises state，**根本冇對應嘅 Firestore 文件**（之前 CLAUDE.md 寫錯咗，話係 rules `null==null` 巧合，已經改正）
- 新增 `exerciseOverrides/{overrideId}` collection：`trainerId`/`exerciseId`（建立後不可改）+ `videoMode`/`videoUrl` + `instructionsMode`/`instructions`，`videoMode`/`instructionsMode` 三態（`default`/`custom`/`hidden`），doc ID 用 deterministic `${trainerId}_${exerciseId}`；教練完全冇自訂 → 唔建立文件；撳「還原用底版」→ 直接刪走文件
- `AppContext.jsx`：新 listener 重用現有 exercises listener 嘅 `targetTrainerId` 邏輯（教練=自己，學生=自己教練）；`getExercises()` 喺 return 前 merge 埋 override；新增 `getExerciseOverride`/`upsertExerciseOverride`/`deleteExerciseOverride`
- **Merge 喺 AppContext 一層做**：`WorkoutPlansPage.jsx`/`ClientDetailPage.jsx`/`SessionDateList.jsx` 全部經 `getExercises()` 攞資料，plan/log 顯示動作自動跟到教練自訂內容，冇改任何頁面
- UI：`ExerciseLibraryPage.jsx` 按 `exercise.trainerId` 有冇分流——有（教練自建）照舊全表單 edit/delete；冇（seed 動作）撳 Edit 開新「Customize」panel，兩欄（影片/動作要點）都做一致嘅 3-way 選擇（用底版/自訂/唔顯示），Delete 掣對 seed 動作隱藏（seed 冇「刪除」概念）
- Rules：新增 `exerciseOverrides` match block——教練讀寫自己嘅，學生淨係讀自己教練嘅，`trainerId`/`exerciseId` 建立後不可改
- **新增自動化 rules 測試套件**（`firestore-tests/`，獨立於 `functions/` 嗰套 Cloud Functions Jest test，用 `@firebase/rules-unit-testing` + jest）：15 個測試，覆蓋教練A讀寫自己/教練B讀寫教練A嘅（全部拒絕）/學生讀自己教練嘅（准）讀第二個教練嘅（拒絕）任何寫（拒絕）/trainerId+exerciseId immutability，跑法 `cd firestore-tests && npm run test:emulator`
- 12 個 credit emulator test + 15 個新 rules test 全部保持全綠；`npm run build` 通過
- **待 Ani**：部署後用第二個真實帳號人手多撳一次做心理雙重確認（自動測試已經覆蓋咗核心矩陣，人手撳純粹係額外心安）
- 已開 2 個永久 QA 測試帳號（第二個教練 + 掛喺佢名下嘅學生），已寫入 CLAUDE.md「QA Test Accounts」，密碼淨係喺對話俾咗 Ani

### UI 語言規則：全站英文清查（Session 34）
- 新規矩寫入 CLAUDE.md 第28條：所有 app UI 文字（掣、標籤、提示、錯誤訊息、空狀態）一律英文，廣東話淨係用喺同 Ani 嘅內部溝通/報告/commit message，永遠唔可以出現喺 UI
- 即時修正：`ExerciseLibraryPage.jsx`（Customize panel 全部中文 → 英文：Default/Custom/Hidden、Coaching Cues、Common Mistakes、Reset to Default 等）、`ExerciseDetailModal.jsx`（Watch Demo、Add Demo Video、Coaching Cues、Common Mistakes）、`SchedulePage.jsx`（一個漏咗嘅 toast「課堂完成」→ "Session marked complete"）
- 掃咗成個 `src/` 搵晒所有 CJK 字元，發現 2 類睇落係**刻意**而唔係漏咗嘅：
  1. 「gym啦」呢個 gym啦 operator 功能嘅品牌名（`Navigation.jsx`/`TrainerApplicationPage.jsx`/`OperatorDashboard.jsx`/`StudioBookingPage.jsx`，全部依家喺 `GYMLA_ENABLED=false` 之下隱藏）+ `StudioManagementPage.jsx` 嘅地區名 placeholder（「旺角」）
  2. `LandingPage.jsx` 嘅全頁雙語（英文+廣東話）行銷文案設計
- 呢兩類未郁，留返俾 Ani 拍板係咪都要轉英文（詳情見對話回覆）
- 12 個 credit emulator test 保持全綠；`npm run build` 通過

### 「活躍」定義統一 + Client Activity 卡重新定位（Session 35）
- 舊 bug：Needs Attention 流失風險 / Client Activity / 學生端 This Week stat 淨係計 `workoutLogs`，令上堂為主、少自己 log 嘅學生（如 Wan、Timmy）被誤標做 inactive
- 新增 `src/utils/activityUtils.js`：`getLastActivity()` = max(最後 workout log 日期, 最後完成嘅 session 日期)；`getClientActivityDates()` 回傳 log 日期 + completed session 日期嘅聯集，供「本週活躍」類統計共用
- `TrainerDashboard.jsx`：`churnClients` 改用 `getLastActivity()`；舊 `ClientActivityList`（progress bar 列表）換做 `ClientActivitySummary`——首頁淨係一行「Active this week: X/Y clients」摘要，撳開先展開全清單（按最近活動排序，中性灰色日數，唔用紅黃綠警告色），位置搬去 Needs Attention 之下；「This Week's Sessions」獨立做返一張全寬卡
- `ClientDashboard.jsx`：「This Week」stat 改用共用嘅 `getClientActivityDates()`，唔再自己另外計 log-only 邏輯
- `index.css`：新增摘要卡 toggle/chevron/展開清單樣式，刪走舊 progress-bar 相關 CSS
- 12 個 credit emulator test 保持全綠；`npm run build` 通過
- 未驗證：邊啲學生實際上會由流失風險清單消失、7日活躍率實際數值——需要 Ani 喺真實 production 環境自己核實（sandbox 冇真實客戶資料）

### UI 統一規範 STYLE.md + Phase 2 執法（Session 36，員工D）
- 出咗 `STYLE.md`：色板（每個 semantic 色列明用途）、5級字級、8px 間距 scale、compact/regular/spacious 三檔密度 + 逐頁分類表、empty state 格式規範（icon+一句解釋+action 掣）、微交互標準、英文規矩重申、audit 已知債附錄。Ani 批准，門檻確認 ≤2 danger / ≤5 warning。
- **範疇1**：剩餘堂數顏色門檻由 5 個唔同版本（threshold 2/3/5 混用，「安全色」有 hardcode `#06d6a0`/`var(--success)`/`var(--text-muted)` 三種）統一做 `sessionUtils.js` 嘅 `getSessionColor()` + `SESSION_DANGER_THRESHOLD`/`SESSION_WARNING_THRESHOLD` 常數，5 個 call site 全部改用
- **範疇2**：hardcode hex 換 variable（新增 `--danger-light`、`--warning-dark`，dark theme 另有 override）；`.loading-screen` dark mode 閃白色 bug 修復（`#ffffff` → `var(--bg-card)`）；loading brand text 嘅一次性藍紫青漸層改用返同 `.sidebar-logo` 一致嘅 primary/accent brand token
- **範疇3**：5 個 empty state 補返 action 掣（ClientDashboard「No sessions today」→ Book a Session、ClientDetailPage「No workout logs」→ Log a Session、ExerciseProgress「No training data」→ Log a Workout、StudioManagementPage/StudioBookingPage 都補埋）
- **範疇4**：審視 ClientsPage 同 MessagesPage 嘅密度定位（同 Ani 確認）——MessagesPage contact-item 微調（avatar 42→38px, padding 12→10px），保留 2 行 preview；ClientsPage card grid **刻意保留**，因為顯示緊年齡/身高/體重/目標等資料，同 Exercise Library 純掃描列表性質完全唔同，`STYLE.md` 密度表已更新記錄呢個決定
- **範疇5**：Dark mode pass——刪走一條死 CSS（重複嘅 `.tag-warning` rule，第一條永遠俾第二條蓋過）；用 headless browser（Playwright + 預裝 chromium）實際截圖驗證 LoginPage/Privacy/Terms 喺 light+dark 兩個 theme 底下嘅顯示，順便發現同修咗一個真 bug：`.login-switch` 兩個 button 冇換行,「Sign up」同「Forgot password?」擠埋一行,改用 flex column + gap 令佢哋分行
- 已登入頁面（Dashboard/Schedule/Messages 等）需要真實 Firebase Auth 帳號先睇到,sandbox 冇密碼,未能實際截圖驗證——麻煩 Ani 上線後自己睇吓 dark mode 顯示
- 5 個細 commit,每個範疇獨立 push,12 個 credit emulator test 全程保持全綠,`npm run build` 全部通過

### Phase 3 訂閱制：設計 + Step 1-2 後端（Session 37）
- 商業條款全部拍板：£65/堂 base、52週年化、三檔（4/8/12堂）、pack 唔訂閱 £75/堂、roll-over 封頂一半、pause 每年2次1個月通知、取消1個月通知冇罰款、GoCardless multi-tenant OAuth 架構（每個教練自己connect，Ani 係第一個）。設計文件 `reports/phase3-subscription-design.md`
- **Step 1**：`subscriptions`/`gcConnections` schema + rules（全部 Cloud Function-only 寫入，money-moving state 唔准 client 寫）+ 13 個新 rules test
- **Step 2**：GoCardless OAuth connect 後端（`gcOAuthStart`/`gcOAuthCallback`/`gcDisconnect`）。員工F security review 揪出原設計用 `state=trainerId` 冇真正防CSRF，改用 `gcOAuthNonce.js`：256-bit crypto-random nonce、10分鐘過期、claim/release/finalize 三段式（下游失敗唔燒nonce，可以重試）。10個新 nonce test（forged/reused/expired三大攻擊情境 + release重試路徑）
- ProfilePage 加「GoCardless Connection」卡：三態（未連接/已連接顯示環境+日期/error類transient toast）、Connect+Disconnect（confirm彈窗講明會停晒訂閱扣數）
- **事故 + CLAUDE.md 新增第29條**：commit 892b2ba/e624944 令 deploy 死咗——根因唔止「secret未set」，係成個 GCP project 從未 enable Secret Manager API，`defineSecret()` 呢種 deploy-time 驗證機制一炒就拖埋 9 個舊 function 部署唔到（Hosting/Rules 冇事）。修法：徹底移除 `defineSecret()`/`runWith({secrets})`，改喺 call 嗰刻先讀 secret，讀唔到就回「not configured」，deploy 永遠成功。寫低做咗常規（同#26冇terminal、#27唔准batch rewrite 同級）：**外部服務配置缺失只可以喺call嗰刻報錯，唔可以影響部署**
- 已寫 `reports/gocardless-sandbox-setup-guide.md`——假設 Ani 冇 terminal，全部瀏覽器操作：GoCardless sandbox 開 Partner app、Google Cloud Console enable Secret Manager、建3個secret、IAM 加權限
- 22 個 functions test（12 credit + 10 nonce）、33 個 rules test 全過，`npm run build` 通過

### Invoice PDF：iOS 冇 window.print() → 客戶端生成 PDF（2026-07-29，Session 38）
- **發現一個平台級限制**：iOS Safari **從來冇實作過 `window.print()`** —— 唔止 standalone PWA，連普通 Safari 分頁都係 silent no-op。原本個 Print 掣喺 Ani 部機一直「撳咗冇反應」，唔係 CSS 問題
- 中途試過兩個錯方向（先以為係 standalone 限制加 escape link、再以為要出教學文字叫用戶自己撳 Safari Share），兩個都被 Ani 否決 —— **「將五步操作轉嫁俾用戶」唔算實現功能**
- 最終方案：`src/utils/invoicePdf.js` 用 `pdf-lib` 客戶端直接砌 PDF，再交俾 `navigator.share({files})` 彈原生分享頁（iOS 15+ 含 standalone 都支援），唔支援就 fallback 做 `<a download>`
- `pdf-lib` 用 **dynamic `import()`**，撳掣先載入，唔會入 InvoicePage 主 chunk（實測 436KB → 15KB）
- 檔名 `INV-0003-Vivian001.pdf`；PDF 內容含 business name/教練名 fallback、項目表（長文字自動換行、多項目自動分頁）、總額、付款狀態
- 新增 `businessName` 欄位（Profile → Business Details）
- **寫入 CLAUDE.md #30**：以後任何 print/PDF/export 功能一律唔准用 `window.print()`

### 學生 onboarding 全面修復 + Training Profile（2026-07-31，Session 38）
- **問卷版面重做**（員工D）：每題獨立 section（24px 間距）、所有選項統一做 44px 觸控 pill（experience 由細粒 radio 改晒）、分兩步（目標/頻率/經驗 → 傷患/身高體重）+ 進度指示、Skip 降級做純文字連結。出 mockup screenshot 俾 Ani 批先落實
- **`TrainingProfilePage` + `/training-profile` 路由**：學生**任何時候**都可以改問卷答案。之前 skip 咗就永久冇得填返，而入面有「傷患/身體狀況」呢啲教練安全資訊，唔可以永久缺失
- Profile 加入口：未完成顯示溫和提示（用 `--primary` 唔用 danger 色），已完成顯示「Edit Training Profile」
- **教練 Needs Attention 加「Training profile incomplete」類**：學生有 upcoming session 但未填 profile → 提醒跟進
- **順手修一個關聯 bug**：`saveIntakeForm` 之前每次 save 都會寫多一條 body stat，改成只喺首次完成先自動記錄
- 通知卡去 debug 化：「Send Test」「Re-register Token」改成教練專用，學生見到嘅係普通「Enable Notifications」
- 掃過全 app 有冇其他 debug UI 漏俾用戶睇到 —— 冇

### Code Health Audit + Top 5 修復（2026-07-28，員工C + 員工A）
報告：`reports/code-health-audit-2026-07-28.md`

三大類：重複邏輯、死 code、過期文檔。**查證方法係全 repo grep + 逐個 call site 驗行為差異**，唔係靠眼睇。

已完成（Ani 批准 Top 5 + 追加）：
- `badgeUtils.js` UTC 日期 bug（撞正 CLAUDE.md #18 自己寫低嘅反面教材）
- ROADMAP.md Phase 3 狀態更新（原本仲寫住「冇任何 code」，實際已部署）
- CLAUDE.md 補齊：9 → 13 functions、`subscriptions`/`gcConnections`/`gcOAuthNonces` 三個 collection schema、4 個 context function、3 個檔案
- `TrainerDashboard` 用返 `SESSION_DANGER_THRESHOLD` 常數
- `/apply` 路由補返 `GYMLA_ENABLED` gate（全 app gym啦 gating 唯一唔一致嗰處）
- **貨幣統一**：新建 `utils/currencyUtils.js` 嘅 `formatCurrency()`，取代三套唔一致實現。其中 `PaymentSheetModal.jsx` 寫死「£」係**真 bug** —— 非 GBP 教練嘅學生會見到錯符號。分兩次修完（第一次掃漏咗 3 處，8-01 補齊）
- **寫入 CLAUDE.md #31**：金額一律經 `formatCurrency`，唔准手寫 `.toFixed(2)` 或者寫死符號

查證後確認**唔使做**嘅：死掣（grep 過零匹配）、完全冇 import 嘅檔案（static + dynamic import 雙重掃描，零孤兒）

### 續約提示改為持續顯示（2026-08-01）
- 原本 3 堂／1 堂各彈一次就永遠唔再出（`renewalPrompt3Shown`/`renewalPrompt1Shown`）。學生 dismiss 咗或者當日冇處理，之後堂數跌到零都唔會再見到優惠提示
- 改成 **≤5 堂每次開主頁都彈**，直到教練收到錢手動 top up（堂數升返上去自動消失）。Dismiss 只收起當次
- **book session 嗰刻都提示**（8 秒 toast）—— book 就係堂數真正跌嘅時刻
- 順手修：0 堂嘅情況舊 code 當「Last session left」（即「仲有最後一堂」），實際已經用晒
- 拆走嗰個一次性機制順帶清咗 `ClientDashboard` 唯一一個 `set-state-in-effect` lint error
- 舊 Firestore 欄位保留唔動（跟 #27），只係唔再讀寫

### Credit 透支 + Session complete 觸發條件（2026-08-01）
設計文件：`reports/credit-overdraft-and-session-complete-design.md`（Ani 批准後動工）

- **透支 booking**：1 堂硬上限，詳情見下面「Credit 透支」章節
- **Needs Attention 加第四類「Session owed」**：`--danger` 色、排最前（欠緊錢急過快用完）、冇 snooze。已欠款嘅學生會**排除喺 Renewal 類之外**，避免同一個人為同一件事出現兩次
- **CLAUDE.md #32（workout log ↔ session 狀態必須解耦）**：查證咗現狀本身已經係啱嘅（`WorkoutLogPage` 完全冇掂 schedule、`addWorkoutLog` 只寫 `workoutLogs`、`onNewWorkoutLog` 只 send push），所以**冇改任何 production code**，加嘅係規則同守門員 test
- **Guardian test 驗證過真係有牙齒**：暫時將「log 咗就自動 complete 同日 session」呢個典型「順手優化」注入 `onNewWorkoutLog`，兩條 guardian test 即刻 fail（`Expected "confirmed" / Received "completed"`），還原後回復綠燈。一個 fail 唔到嘅守門員 test 冇價值，所以實測過而唔係靠估
- **Reopen（撤銷 Mark Complete）+ 揪出一個真 bug**：completed session 本身冇路徑改返，撳錯只可以刪成條 booking。加 Reopen 掣嗰陣發現舊模式 booking（冇 `deductedAtBooking`）complete 會扣一堂、reopen 唔會退、再 complete 會**再扣多一次** —— 一堂收兩次錢。`onScheduleCreditUpdate` 加咗 reopen 退款令收費對稱
- Test：12 → **32**（新增 6 條透支、2 條 reopen、2 條 guardian，其餘為原有）；8-02 真機修復後再加到 **35**

### 🔴 學生輸入 invite code 連唔到教練（2026-08-04）
完整報告：`reports/invite-code-bug-2026-08-04.md`

- **真因唔係 rules、唔係大小寫、唔係 code 過期**（三個都逐一查證洗脫）：`connectToTrainer()` 淨係喺 AppContext 個 **in-memory `users` 陣列**度搵教練。而個陣列對一個未連結嘅學生嚟講**得佢自己一個 doc** —— 教練根本唔喺記憶體度，所以任何 code 都必然搵唔到 → 一律「Invalid invite code」。**100% 必然失敗**，唔係間歇性
- 呢個 bug 由第一版寫落去就存在，唔係 regression
- 修復：in-memory 搵唔到就發真 Firestore query。**刻意用單欄位 query**（只 filter `inviteCode`，`role` 喺 JS 過濾）—— 兩個 equality filter 可能需要 composite index，production 冇就會 `failed-precondition`，等於用另一種方式再壞一次
- 錯誤訊息分開三種：`invalid` / `permission` / `network`，唔再將網絡問題顯示成「code 唔啱」
- 新 `utils/inviteCodeUtils.js`：剝走 zero-width joiner、non-breaking space 等貼上時帶入嘅隱形字元
- 順手揪到：註冊時打錯 code 原本係**靜靜雞當冇打過**（profile 照建、`trainerId` 留 null，學生以為連結咗）；`handleConnect` 冇 try/catch 會卡死粒掣；`completeProfile` fallback 讀成個 users collection
- Test：新增 8 條 rules test（37 → **45**），含完整流程「學生輸 code → 寫 trainerId → 教練 client list 見到佢」
- **誠實備註**：呢 8 條 test 唔會因為原本個 bug 而 fail（bug 喺 JS 層，repo 冇前端 test runner）。真正證實新舊行為差異嘅係一個用完即刪嘅 emulator repro harness。呢批 test 守嘅係「將來有人收緊 `users` read rule」呢個未來風險
- **寫入 CLAUDE.md #34**：`AppContext` 個 `users` 只包含「同自己有關係嘅人」，任何要查「未有關係嘅用戶／場地」嘅功能唔可以靠佢 —— Phase 5 場地市集一開工就會踩中

### 透支 booking 真機測試：兩個 bug（2026-08-02）
Ani 用真學生帳號實測，揪出兩個自動化 test 覆蓋唔到嘅問題：

- **Bug 1（UI 時序）**：學生 0 credit 撳 Book → 好似完全冇反應 → 關咗 booking 表單先見到確認窗。根因唔係 state 次序，係 **CSS 層級**：透支確認 modal 同 booking 表單 modal 同時 render，後者蓋住前者。呢個 bug 直接製造重複撳 Book 嘅行為，亦即 Bug 2 嘅溫床
- **Bug 2（漏數，真金白銀）**：book（透支）→ 取消 → 再 book，第二次唔計透支。根因係取消嗰陣**沖返沖多咗** —— 退 credit 之餘冇正確還原狀態，令下一次 book 睇唔到欠款。修完之後 book-cancel-book 連環做都對得返
- **最重要嘅發現**：呢兩個 bug 合埋證明咗 client-side-only 攔截喺**誠實用戶**手上都會爆（見上面「Credit 透支」章節嘅決定推翻記錄），所以 `onScheduleBooked` 加咗 server-side 硬上限
- 新增 3 條 test：book-cancel-book 完整情境、連環 cancel ledger 一致性、two rapid bookings 唔可以同時透支
- 順手修：`.modal-overlay` 喺手機由 `align-items: flex-start` 改成 `margin: auto` 置中（auto margin 喺內容過高時自動收成 0，所以長 modal 仍然由頂部捲，唔會俾裁走）—— 影響全 app 所有 modal，唔止透支嗰個

### 🔴 嚴重bug修復：新學生完全用唔到onboarding問卷（2026-07-29）
- **根因**：`firestore.rules` 嘅 `users/{userId}` self-update用緊field allowlist（`hasOnly([...])`），`intakeCompleted` 完全冇喺個list度——`saveIntakeForm()` 每次 `updateDoc` 都俾rules拒絕，`IntakeFormPage.jsx` 撳Submit定Skip都一樣彈「Failed to save, please try again」，`intakeCompleted` 永遠設唔到`true`，新學生100%困死喺問卷畫面，出唔到主app
- **順手發現**：今日先加嘅 `businessName`（Business Details）同 `currency`（Renewal Pricing）**兩個都犯咗一模一樣嘅gap**——教練撳Save其實一直俾rules拒絕，一齊修埋
- **修復**：`intakeCompleted`/`businessName`/`currency` 加入allowlist；新增 `firestore-tests/userSelfUpdate.rules.test.js`（4個test：client設intakeCompleted、trainer設businessName/currency、確認totalSessions/sessionOffset依然鎖死）；全部37個rules test（33舊+4新）通過
- **教訓**：呢類「field allowlist漏咗新field」嘅bug，build/lint測唔到，只有實際against emulator/production嘅rules test先驗到得——日後加任何新嘅self-update field，一定要記得同步加入呢個allowlist，並且落emulator跑一次rules test先當完成

### Dashboard 全面改版（6月10-11日）
- 新增 design tokens：`--brand-gradient`、`--font-display`（Bricolage Grotesque）、`--radius-lg`/`--radius-xl`，疊加喺現有 token 之上（唔係開一套新 token）
- Stat card 全面轉用 stat-strip/stat-pill 精簡橫向排列（TrainerDashboard、ClientDashboard、BusinessAnalyticsPage、InvoicePage 都套用）
- 新 hero-card 元件：TrainerDashboard「Up Next」顯示下一堂 + 即時倒數；ClientDashboard「Your package」堂數卡改用漸層 progress bar
- TrainerDashboard「Needs attention」panel 取代舊 at-risk 名單：severity 顏色分邊、avatar、快速訊息按鈕
- 全站 primary button 統一用 brand gradient
- Dark mode bug 修復：`index.html` 硬 code 白色背景搞到啲透明漸層喺 dark mode 穿色，而家 paint 前就設定 `data-theme`
- Design-ref prototype（`design-ref/coach-dashboard.jsx`、`design-ref/student-dashboard.jsx`）只做參考，未匯入正式 app

### Firestore 安全性強化
- `workoutLogs` rules 收緊：`create` 時 `trainerId` 必須係 null 或者學生真正教練；`update` 時 `clientId`/`trainerId`/`createdBy` 唔可以再改（防止學生亂咁改自己個 log 嘅 clientId 污染第二人紀錄）；已用 Firestore emulator 做 3個合法操作+3個攻擊情景嘅自動化測試驗證
- `users` doc self-update 收緊做淨係 profile 欄位（`totalSessions`/`sessionOffset` 唔可以自己改），防止學生自己派堂數畀自己（7月2日）

### 細節修復同體驗優化
- Session 日期 chip 可以撳開睇返嗰日訓練詳情（exercises/sets/volume/notes）
- 手機版 workout log 嘅 weight/reps 輸入框過窄問題修復
- 「Last time」carry-over hint 加落 free workout（之前得 plan-based workout 先有），同埋改做成成行可撳嘅顯眼樣式
- Monthly Report：月份下拉選單漏咗當月嘅 bug 修復 + 加咗 per-session Volume 欄（預設開）
- This Week's Sessions 計算修復：剔除 block-time slot 同已取消 session
- 清走 dead code（`getBadges`/`findTrainerByCode` 冇用嘅 export）、修返幾個 `react-hooks/exhaustive-deps` lint warning

### onSessionsLow 擴展（學生端 + UI 顯示，6月下旬）
- Push 通知擴展：之前得教練收到「堂數不足」提示，而家學生本身喺剩 ≤3 堂時都會收到（教練仍然係 ≤2 堂先收到）
- ClientDashboard 堂數卡喺 ≤3 堂時會變成警示樣式（顏色由紅色/warning icon 調淡做 amber，避免俾人一種「出錯」嘅感覺）
- 提示文案由中文改做英文，同全站 UI 語言一致
- **呢個功能同 Session 33 新增嘅「Credit 續約提醒」係獨立運作**，冇整合文案/邏輯（見上面 Credit 續約提醒 章節備註）

### Firebase Billing 短暫波動（6月21-22日，已解決）
- 6月21日 Blaze billing 一度被降級做 Spark（linked Cloud Billing account 斷咗），CI 一度將 `Deploy Functions` 失敗改做非阻擋性（warning）避免拖累 Hosting/Rules 部署
- 6月22日 Blaze billing 修復，CI 已改返做「Deploy Functions 失敗就整條 workflow fail」嘅嚴格模式，之後所有 deploy（包括 Session 33 呢批）都持續成功

### WorkoutLog 最新改善（Session 31）
- **REST TIMER 清理**：移除 ActiveWorkoutView inline RestTimerBar + 移除概覽畫面頂部 REST TIMER block；只保留底部 floating pill
- **Floating pill 改良**：尺寸放大（padding 14×22px，時間字體 1.5rem）；時間數字可點擊輸入自訂分:秒（edit 模式，分:秒雙 input）
- **訓練日誌儲存錯誤**：`catch {}` 靜默吞錯改為 `catch(err)` + toast 顯示實際 error code；guard undefined exerciseId 防止 Firestore 拒寫
- **Client Dashboard**：體重迷你趨勢圖（Sparkline）+ 「今日訓練」CTA（有計劃直接開始 / 無計劃自由訓練）
- **ProfilePage**：Founding Member banner（Free tier trainer 限定）

### Rest Timer + Workout Log + 通知大修（Session 32）
- **Rest Timer 全面修復**：
  - 改用 wall-clock（`endTimeRef` 絕對時間戳）取代 decrement `setInterval`，screen-off / app 背景後自動校正剩餘時間
  - `visibilitychange` / `focus` / `pageshow` 監聽：app 喚醒時若已過期立即播放完成音效
  - 完成音效改用預先生成嘅 WAV（`public/sounds/timer-done.wav`，3聲遞增 beep），透過 `AudioBufferSource` 播放（iOS 最穩定方式）；Web Audio oscillator 保留做 fallback
  - iOS AudioContext keep-alive：每 20 秒播放 1-sample 靜音 buffer，防止背景自動 suspend
  - 計時器 end time 持久化到 `sessionStorage`，確保 process suspend 後都可以恢復
- **Custom Exercise + Wt+Dist Unit Type**：
  - 計劃內 workout 都可以「+ Add Exercise」加入 custom 動作（exercise picker 新增 'Custom' tab，輸入名稱即建立 `custom-{timestamp}` ID）
  - 新增 `weight_distance`（Wt+Dist）unit type：kg + metres，顯示為「40kg × 200m」，`formatSet`/`stringifySet`/`hasValue`/`emptySet` 全部支援
- **Workout Log 可移除 set**：2 個或以上 set 時顯示 × remove 按鈕，最少保留 1 個；移除後 completed-set 索引自動重排
- **Session 扣數 UX 全面改善**：
  - Mark Complete 按鈕喺 `pending` 同 `confirmed` 狀態都顯示（之前只限 confirmed）
  - Recap modal 顯示「X / Y 剩餘 → 完成後 Z 堂」，扣數成功/失敗分開處理並有明確 toast（含 error code）
  - 扣數失敗時唔再 navigate 走，trainer 留喺 schedule page
  - Firestore rules：trainer 即使喺 client 被 remove（`trainerId` 變 `null`）後，仍可以 `+1` increment `sessionOffset`
- **堂數不足 Push 通知**（新 Cloud Function `onSessionsLow`）：client 剩餘堂數首次 ≤ 2 時推送 `⚠️ 堂數不足` 畀 trainer，只觸發一次（避免重複扣數時連環推送）—— Cloud Functions 數量由 6 個增至 **7 個**
- **月度訓練報告**：ClientDetailPage 新增「Monthly Report」modal，整合該月 sessions、workout logs、總訓練量、PRs、體態變化，可選擇附加收費摘要；用瀏覽器 print 對話框輸出 PDF（零依賴），全英文版面
- **iOS / Android Input 防自動放大**：所有觸控斷點（≤1024px）套用 `max(16px, 1rem)` font-size + `text-size-adjust: 100%`
- **Code Review 修復（8 項）**：operator 路由收緊（唔再拎到 client-only routes）、`/log` 限 trainer+client、GlobalSearch 篩選 operator precedence bug、StudioBookingPage 24h cutoff 用實際時段時間、SchedulePage 加 `savingRecap` guard 防 double-submit 重複扣數、firestore.rules 容許 trainer 取消自己 booked 嘅 studio slot
- **gym啦 功能暫時隱藏**：`App.jsx` 新增 `GYMLA_ENABLED = false`，operator routes / `/apply` / `/studios/book` 全部收起，operator 當 client 處理 nav；code 全部保留，設返 `true` 即可重新啟用

---

## 📋 待處理事項

### 🔴 P1 — 必須處理

| # | 任務 | 詳情 |
|---|------|------|
| 1 | ~~Push 通知實際運作確認~~ | ✅ 已解決——GitHub Actions `Deploy Functions` 持續成功，Blaze billing 穩定；剩返「雙方去 Profile → Enable Notifications」呢個純用戶操作步驟，唔算開發待辦 |
| 2 | **Excel / CSV 客戶匯入** | 教練上傳 Excel → 解析 → 建立 ghost client profiles；提供模板下載；預覽確認後批量建立 |
| 3 | **訓練日誌儲存錯誤確認** | Fix 已部署（commit aa8a90e + Session 32 進一步修復：`completedSets` 持久化、`l.entries` null guard），等待用戶測試回報確認根治——長時間冇再收到相關回報，但未正式 close |
| 4 | **Phase 1 Credit UAT 收尾**（見下面新增章節） | Session 33 兩個 credit 相關 feature（Book 即扣 + 續約提醒）已部署，仲差幾個場景未實測 |

### 🟠 P2 — 高優先

| # | 任務 | 詳情 |
|---|------|------|
| 5 | **公開教練 Profile 頁** | 可分享 URL（`/#/coach/{inviteCode}`）；顯示教練名、speciality、匿名化成果；作為獲客工具 |

### 🟡 P3 — 中優先

| # | 任務 | 詳情 |
|---|------|------|
| 6 | **Referral 系統** | 現有 client 分享 referral link 介紹新 client；教練可設 referral 獎勵（如送 1 堂） |
| 7 | **iOS Shortcuts Webhook** | 每位教練生成專屬 webhook URL；iOS Shortcut 自動 POST Apple Health 數據；免 Capacitor 實現部分健康數據同步 |
| 8 | **Google Fit / Health Connect OAuth** | Android 平台；授權後定時同步體重、活動數據至 bodyStats |

### 🟢 低優先（長遠）

| # | 任務 |
|---|------|
| 9 | **獎章 Shareable 卡 Phase 2**（Web Share API） |
| 10 | **進度相片**（Firebase Storage） |
| 11 | **Data Export（CSV / PDF）**（GDPR 合規） |
| 12 | **Stripe 收費整合**（目前 invoice 係 PDF，收錢靠線下——**注意**：Phase 3 GoCardless 訂閱billing 一旦推行，呢個項目範圍要重新評估） |
| 13 | **Hevy CSV Import**（教練從 Hevy 帶走客戶數據） |
| 14 | **Trainer announcements / broadcast**（群發訊息） |
| 15 | **Group Class 管理**（多 client 同一 session） |
| 16 | **Capacitor 原生化 + App Store 上架**（Apple Watch HealthKit、Sign in with Apple） |
| 17 | **Gym啦 Sprint 2+**（Flow B 學生搵教練 Directory + In-App Booking；曝光追蹤；盲評系統；Sprint 1 已完成，現透過 `GYMLA_ENABLED=false` 暫時隱藏）。**打開`GYMLA_ENABLED`之前必查**（2026-07-28 audit發現）：全app約12個檔案各自宣告`isTrainer = currentUser.role === 'trainer'`，未計`operator`呢個第三角色——`{isTrainer ? <TrainerView/> : <ClientView/>}`呢類二元判斷，會將operator當client嚟render。而家冇事（`RoleSelectPage`根本冇俾人揀operator），但開關嗰日要重新audit呢12個檔案 |
| 18 | **`gcOAuthCallback` rate limit**（Phase 3）——而家個 public HTTP endpoint 冇 rate limit，但 256-bit random nonce 空間本身已令 brute force 無意義，Ani 已確認唔急，記錄喺度日後想加先加 |
| 20 | **ESLint 覆蓋範圍修正**（2026-08-04 修 invite code bug 時發現）——`npm run lint` 而家有 **226 個 pre-existing error**，全部係 `functions/` 同 `firestore-tests/` 嘅 Node/Jest 檔案報 `'test' is not defined` / `'expect' is not defined`（`eslint.config.js` 淨係設咗 `globals.browser`，冇為呢兩個 folder 設 Node/Jest globals）。**風險**：lint 長期紅色，新嘅真錯誤會完全被淹沒。**Ani 決定（2026-08-04）：而家唔好掂** —— 清理會製造大 diff 冚住真正嘅功能改動。將來做嗰陣，建議係為嗰兩個 folder 補返 Node/Jest globals，**唔好**一刀切加 ignore（咁會連 `functions/` 入面嘅真問題都一齊隱藏）。現階段驗證用 `npx eslint src/` 睇前端部分（現時 0 error） |
| 19 | **Badges/Milestones 最小顯示UI**（2026-07-28 code health audit發現）——`checkAndAwardBadges` 寫入邏輯正常運作，`users/{clientId}.badges` 已經有真實數據，但成個app冇任何UI讀取/顯示過。Ani 決定：寫入邏輯照留，唔刪，補一個最小UI（學生 profile 顯示已解鎖 badge）先，唔急 |

---

## 🧪 Phase 1 — Credit System Acceptance Testing 進度

> 對應 `ROADMAP.md` Phase 1。呢度追蹤實際落地功能 vs. 仲差邊啲場景未經真人測試。

### ✅ 已實測確認（人手）
- **Book session 即扣 credit**：教練已實測、確認學生 book 完之後 remaining 堂數即刻跌一格
- **24小時前取消退款**：教練已實測、確認退返 credit（見對話紀錄「成功左」）
- **Top-Up 寫入即時反映**：`updateClient` optimistic patch fix 已確認解決「教練撳完 Top Up 個畫面唔郁」嘅 bug
- **透支 booking 確認窗即時彈出**（2026-08-04 Ani 真學生帳號實測通過）：0 credit 撳 Book，確認窗即刻見到，唔再要關咗 booking 表單先出現。修復見 commit `6ec24a1`（z-index / render 次序）
- **book → cancel → book 仍然計透支**（2026-08-04 Ani 真學生帳號實測通過）：繞過路徑已封，Needs Attention 正常顯示 Session owed。server-side 上限（`onScheduleBooked`）確認喺真實環境有效

### ✅ 已用自動化測試驗證（12 個 Jest test，`functions/test/bookSession.test.js`，跑真 Firestore emulator）
- 24小時內取消（late-cancel）照收（新 booking 分支）
- 每月 2 次免費早取消上限，包括「用晒上限」同「跨月reset」兩個邊界情況
- 舊 booking（冇 `deductedAtBooking` 標記）Mark Complete／late-cancel 補扣一次
- 新 booking Mark Complete 唔會重複扣
- blocked slot / 冇 client doc 唔會扣數或者 crash
- 呢批已經有自動化測試覆蓋，唔再列入「未實測」——但仲未經**真人教練**用真實帳號操作確認，如果想要真人再過一次都得，睇 Ani 需要

### ⬜ 未實測 / 待驗證
| 場景 | 詳情 |
|------|------|
| Top-Up 新 rate 選擇器 + `creditLedger` 寫入 | Session 33 尾段先加，仲未見教練確認測試（要先喺 Profile 設定 Renewal Pricing 先會顯示） |
| Credit 續約提醒（3堂/1堂提示、常駐 banner、payment sheet） | 已部署，教練未回報測試結果 |
| 從 Landing Page signup 開始嘅全程 E2E | 見即時行動清單，未做過 |

**Reschedule cap 已澄清（2026-07-20，Ani 確認）**：`ROADMAP.md` Phase 1 提到嘅「reschedule cap」即係現有嘅「每月2次早取消上限」，唔係獨立功能，唔使另開。呢個場景已經有 12 個自動化測試入面嘅「早取消上限」相關 case 覆蓋（見上面「已用自動化測試驗證」一節），移出「未實測」清單。

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| HashRouter | Firebase Hosting SPA 需要 |
| `workoutLogs` + `messages` 禁止 delete | 保護紀錄完整性；GDPR delete 靠 Cloud Function |
| `workoutLogs` 用 `createdBy` 做 edit 權限 | `trainerId` 係 record-keeping，唔能做權限判斷 |
| `badges` 一旦 award 唔自動撤銷 | 防止數據錯誤誤撤；只有教練人手移除 |
| Mobile nav 4 + More drawer | 底部 tab 上限 5，無法容納全部頁面 |
| 移除 Firebase App Check | reCAPTCHA 喺 iOS Safari 載唔到，令 Google 登入完全失效 |
| authDomain 用 `firebaseapp.com`（非 `.web.app`） | Firebase 自動 register 呢個 domain 嘅 Google OAuth redirect URI |
| Google 登入：手機/PWA 用 redirect、桌面用 popup | iOS PWA 喺 popup 開啟時會 suspend 主進程，popup 完成後 token 遺失 |
| `getRedirectResult` 先 resolve 才設 `authReady` | `onAuthStateChanged` 喺 redirect 返回前 fire `null` → 閃現 Login 頁；加 `redirectChecked` state 解決 |
| MuscleSelector 改為 chip 文字選擇 | SVG body model UX 唔好（細位難 tap）；chip list 更快更清晰 |
| VAPID key hardcode 為 fallback | VAPID Web Push public key 非 secret，可安全 hardcode；`VITE_VAPID_KEY` env var 優先 |
| Session credit 喺 book session 嗰刻即扣（唔再等 Mark Complete） | Sessions ARE session credit；改由 Cloud Function（`onScheduleBooked`/`onScheduleCreditUpdate`，admin SDK，伺服器端 transaction）統一處理扣數/24小時前取消退款(每月上限2次)/舊 booking 補扣，避免前端直接寫 `sessionOffset` 帶嚟嘅安全隱患 |
| Apple Watch 整合需 Capacitor 原生化 | PWA 無法存取 iOS HealthKit；Android Health Connect 只支援原生 app |
| Rest Timer 用 wall-clock（絕對 end time）非 decrement interval | `setInterval` 喺 screen-off / app 背景時會被瀏覽器 throttle 或暫停，wall-clock 喺喚醒後可自我校正 |
| 計時完成音效用預生成 WAV + `AudioBufferSource`，每 20s 播靜音 buffer keep-alive | iOS 會喺無聲約 30s 後自動 suspend AudioContext；`resume()` 喺非手勢 callback 入面唔可靠；靜音 buffer 維持 'running' 狀態 |
| Toast 錯誤訊息顯示 6 秒（成功訊息 3 秒） | 錯誤內容（含 error code）通常較長，需要更多時間閱讀 |
| ~~Firestore rules 容許任何 trainer 對 client doc `sessionOffset` `+1`~~（Session 33 已移除呢條 rule） | 呢個 workaround 本身係為咗俾前端 `incrementSessionOffset()` 喺 client 被 remove 後都寫得入；Session 33 將全部扣數/退款邏輯搬去 Cloud Function（admin SDK，唔受 rules 限制），前端已經冇再直接寫 `sessionOffset`，呢條 rule 變成多餘，已刪走收窄攻擊面 |
| gym啦 用 `GYMLA_ENABLED` flag 控制顯示，唔刪 code | 功能未到launch時機，但要保留已完成嘅 Sprint 1 開發成果，方便日後一鍵重新啟用 |

---

## 📐 參考資訊

### 導航架構

| 平台 | 主導航（常顯） | More 抽屜 |
|------|------------|---------|
| **Trainer 桌面 sidebar** | Dashboard, Clients, Schedule, Messages | Progress Overview, Workout Plans, Invoices, Analytics, Exercise Library |
| **Trainer 手機底部** | Home, Clients, Plans, Messages | Schedule, Invoices, Analytics, Progress Overview, Exercise Library, Profile |
| **Client 桌面 sidebar** | Dashboard, Workout Log, Progress, Messages | My Plans, Schedule, Exercise Library |
| **Client 手機底部** | Home, Log, Schedule, Messages | My Plans, My Progress, Exercise Library, Profile |

### Exercise Unit Types

| `unit` 值 | 輸入欄位 | 顯示格式 |
|-----------|---------|---------|
| `weight_reps`（預設）| kg + reps | `80kg × 10` |
| `reps_only` | reps only | `× 20` |
| `time` | seconds | `60s` |
| `distance` | metres | `400m` |
| `weight_distance`（Wt+Dist） | kg + metres | `40kg × 200m` |

### Session 堂數欄位說明

| Firestore 欄位 | 意思 | 誰改 |
|---------------|------|------|
| `totalSessions` | 學員購買總堂數（可 Top-Up）| 教練（Set Total / Top-Up） |
| `sessionOffset` | 已用堂數（= 已扣嘅 session credit）| **自動**：Cloud Function `onScheduleBooked` 喺 book session 嗰刻即刻 `+1`（sessions ARE session credit）；`onScheduleCreditUpdate` 處理取消退款/舊 booking 補扣；教練亦可手動覆蓋 |
| remaining | `totalSessions - sessionOffset` | 系統自動計算，唔儲存 |
| `schedule.deductedAtBooking` | 呢條 booking 係咪已經喺 book 嗰刻扣咗 credit（新模式）| 系統自動（Cloud Function 寫入），冇呢個 flag = 舊模式 booking（Mark Complete/24小時內取消先扣） |
| `earlyCancelMonth` / `earlyCancelCount` | 學員本月已用咗幾多次「24小時前免費取消」（上限2次，跨月reset）| 系統自動（`onScheduleCreditUpdate`） |
| `schedule.bookedOnCredit` | 呢條 booking 係咪喺零 credit 情況下透支 book 嘅 | 系統自動（`onScheduleBooked`）；用嚟喺取消退款嗰陣準確判斷要唔要沖返 ledger |

### Credit 透支：1 堂上限（2026-08-01）

學生 credit 用完（`remaining === 0`）仍然可以 book 多一堂，計入下次續約；到 `remaining === -1` 就真正 block。透支唔用新欄位表示，純粹係 `remaining`（`totalSessions - sessionOffset`）變負數 —— 所以「續約自動扣返欠嗰堂」係現有算式自然做到，零新 code：top-up 加 `totalSessions`，`remaining` 由 `-1` 變 `qty - 1`。

欠款記錄由 `onScheduleBooked` 喺**扣數同一個 transaction** 入面寫入 `creditLedger`（`{type:'overdraft', qty:-1}`），唔可以 client-side 寫 —— `firestore.rules` 本身只准教練建立 `creditLedger` doc，而且畀學生自己寫自己嘅欠款記錄本身就唔對。透支嗰條 booking 24 小時前取消會退返 credit，同時 append 一條 `{type:'overdraft_reversed', qty:+1}` 沖返（唔刪原entry，跟常規 #27 append-only），令 ledger 逐筆對得返 `remaining`。

**決定記錄：由 client-side-only 改為 server-side 強制（2026-08-01 決定 → 2026-08-02 推翻）**

原本決定係淨係喺 `SchedulePage.jsx` 攔截，理由係「就算有人繞過，Needs Attention 一定見到」——個威脅模型假設咗要**刻意**砌 API call 先繞得到。

**2026-08-02 Ani 真機測試推翻咗呢個假設。** 實際上唔需要任何惡意行為：client-side 讀嘅 `remaining` 嚟自 Firestore listener，落後於 `onScheduleBooked` 呢個 background trigger。學生連續撳兩次 Book，兩次都讀到扣數前嘅數字、兩次都過到 client-side 檢查——實測 `remaining` 去到 **-2**，突破 1 堂上限。而且同場嗰個 modal 蓋住 bug（confirmation 窗俾 booking 表單遮住，學生以為冇反應而重複撳）正正大量製造呢個情境。

即係話個 cap 對**誠實用戶**都攔唔住，唔係單純嘅安全邊界問題。所以 `onScheduleBooked` 加咗 server-side 強制：一個 booking 如果會令 `newOffset > total + OVERDRAFT_LIMIT`，直接 `tx.delete(snap.ref)` 且唔扣數——Cloud Function 係唯一有一致 balance 視角嘅地方。Client-side 檢查保留做 UX 層（即時反饋、confirmation 文案），但唔再係唯一防線。

Test cover：`two rapid bookings at 0 credit cannot both overdraw (the real bypass)`。

Phase 5 仍然要重新評估 `firestore.rules` 層面要唔要再加一層（rules 到而家依然冇檢查 credit），但「正常用都會爆」呢個洞已經堵咗。

### Node 22 升級（2026-08-10）
方案：`reports/node22-upgrade-plan-2026-08-10.md`

- **點解要做**：`nodejs20` runtime **2026-10-31 停用**，之後 13 個 function 一個都 deploy 唔到（Firebase 一個 codebase 當一個單位 deploy，見常規 #29）。升到 `nodejs22` 將死線推去 2027-10-31
- 同場升 `firebase-functions` 5.1.1 → 6.6.0、`firebase-admin` 12.7.0 → 13.10.0。CI 唔使改 —— pin 住嘅 `firebase-tools@13` 本身已經支援 nodejs22
- **零 source 改動**，35 條 test 一行都冇改照樣全綠
- 唯一一條真係刪咗嘢嘅 breaking change 係 admin 13 剷走 legacy messaging API（`sendToDevice`/`sendMulticast`/`sendAll`），而我哋 6 個 push function 全部用 `getMessaging().send()`，冇撞到
- **rollback 有期限**：10-31 之後 revert 咗都 deploy 唔返 nodejs20。所以呢類 runtime 升級一定要喺死線前幾個月做，唔可以拖到最後

#### Secret 讀取方式：升級唔受影響（驗證 CLAUDE.md #29 個設計係啱）

**結論：GoCardless secret 嘅讀取路徑完全唔受 firebase-functions 升級影響，零改動。**

原因係結構性嘅：`gcSecrets.js` 直接用 **`@google-cloud/secret-manager` SDK** 讀 secret，唔係經 firebase-functions 嘅 `defineSecret()`。兩個係完全獨立嘅套件 —— **firebase-functions 升幾多個大版本都掂唔到呢條路**。實測 Secret Manager client 五個 method（`getSecret` / `createSecret` / `addSecretVersion` / `accessSecretVersion` / `deleteSecret`）全部仍在，而且個套件版本本身都唔使郁（維持 6.3.0）。

**點解值得記低**：常規 #29（外部服務 config 唔可以係 deploy-time 依賴）當初係為咗解決「Secret Manager 未 enable 就冧咗成個 deploy」嗰單嘢而寫嘅。今次升級意外證實咗佢有第二重好處 —— **唔綁死喺 Firebase 嘅機制上面，等於連 Firebase 自己嘅 breaking change 都免疫**。如果當初用咗 `defineSecret()`，今次就要一齊驗證埋 secret binding 喺 v6 有冇改語意。呢個係「鬆耦合」嘅實際回報，唔係理論。

（順帶記低：`@google-cloud/secret-manager@7.0.0` 要 `node >= 22`，升咗 Node 22 之後呢道門開咗，但 6.3.0 完全夠用，唔急升。）

### CI / Deployment 限制

**Workflow 結構（Session 37 起，`.github/workflows/firebase-hosting.yml`）：** Hosting / Firestore Rules / Functions 而家係 **3 個獨立 job**（`deploy_hosting`、`deploy_rules`、`deploy_functions`），唔再係同一個 job 入面順序執行嘅步驟。改嘅原因：舊結構試過因為新增 `gcOAuthCallback`（第一個公開 HTTP function）撞到 IAM 權限問題，成個 job（連埋已經成功嘅 Hosting/Rules 步驟）一齊被打做紅色——雖然 Hosting/Rules 實際上已經部署成功，但 GitHub Actions 個 UI 會顯示成個 run 失敗，容易誤會做「乜都冧咗」。拆開之後三者互相獨立：一個壞唔會拖冧第二個嘅狀態顯示，各自嘅 CI 綠燈/紅燈準確反映自己嘅部署結果。

**（已解決，2026-07-29）** CI service account（`FIREBASE_SERVICE_ACCOUNT`）權限缺口：
- Cloud Functions：部署**新嘅公開 HTTP function**（`onRequest`，例如 `gcOAuthCallback`）需要 `cloudfunctions.functions.setIamPolicy` 權限——2026-07-25 首次撞到（之前 9 個 function 全部係 Firestore trigger，唔需要呢個權限，所以未爆過），連續 4 次 deploy_functions run（#435-438）都係同一個 error，因為之前加錯咗 role 落唔啱嘅 account
- **實際 CI 用嘅 service account**：`firebase-adminsdk-fbsvc@elitepro-16718.iam.gserviceaccount.com`（用臨時 debug step 喺 workflow 印出 `client_email` 確認，唔係之前假設嘅名）——加咗 **Cloud Functions Admin** 呢個 role 落呢個 account 之後，run #441 三個 job（deploy_hosting/deploy_rules/deploy_functions）全部 success，`gcOAuthStart`/`gcOAuthCallback`/`gcDisconnect`/`cleanupExpiredGcNonces` 正式上線
- **教訓**：日後再撞到類似 IAM 權限錯誤，如果加咗 role 都仲係唔得，第一時間應該用 debug step 確認實際 service account email，唔好假設個名

### Push Notifications 配置

| 項目 | 狀態 | 詳情 |
|------|------|------|
| VAPID Key | ✅ 已配置 | hardcode fallback 於 `NotificationContext.jsx`；`VITE_VAPID_KEY` env var 優先 |
| Cloud Functions | ✅ CI 確認持續成功 | 而家 **13 個** functions（6 個負責 push）；`deploy_functions` job 自 2026-07-29 修好 IAM 之後連續綠燈，人手 Firebase Console 覆核可選做 |
| iOS 支援 | ⚠️ 限制 | 需 PWA 模式（Add to Home Screen）；Safari 16.4+ 才支援 Web Push |
| Android Chrome | ✅ 直接支援 | 無需 PWA 模式 |
| Blaze Plan | ✅ 已啟用 | 用戶確認 |
| 用戶 FCM token | ⚠️ 需手動 | 教練 + 學生須各自去 Profile → Enable Notifications |
