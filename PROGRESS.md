# ElitePro 開發進度紀錄

> 最後更新：2026-05-13（Session 29）

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
| 堂數管理（Top-Up + 手動計算） | ❌ | ✅ |
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

- React 19 + Vite 8 SPA（HashRouter）、Trainer / Client 雙角色
- Trainer Dashboard（stats + weekly chart + client activity）
- Client Dashboard（stats + sessions quota + Book Session CTA）
- Client 管理（搜尋、detail view、labels/分組、Remove Client）
- Workout Plan Builder（drag reorder、duplicate、custom exercises、templates、equipment filter、per-exercise unit type + notes）
- Workout Log（auto-fill、PR tracking、edit 權限用 `createdBy` 判斷、localStorage draft）
- **Trainer 可替 client 記錄 workout log**（ClientDetailPage → Log Session → WorkoutLogPage，含 rest timer）
- **Workout Complete Screen**（儲存後顯示 volume、exercises、RPE、new PRs、closing message）
- Rest Timer（sticky bar、5個預設、Web Audio、震動；trainer/client 通用）
- Schedule 日曆（conflict check、booking、working hours、Mark Complete、可前後翻閱歷史日期）
- In-app Messaging（unread badges、real-time sync、rate limiting 10條/分鐘）
- Exercise Library（search、filter、YouTube links、Kettlebell + Other equipment）
- Body Stats / Progress（Recharts AreaChart、趨勢指示、edit measurement）
- Per-exercise strength progression chart（ExerciseProgress component，auto-select most-logged）
- Volume Analytics Chart（ProgressPage + ClientDetailPage）
- Business Analytics（/analytics：月收入、sessions、30日 retention、Top clients）
- Profile（invite code、shareable link、working hours、connect to trainer）
- Smart Progression Suggestions（plateau 時顯示 +2.5kg 建議，可一鍵 Apply）
- **Workout Log 快速輸入**（inputMode decimal/numeric、Enter 自動跳焦點、+/− Stepper、Fill 填入上次、Apply 套用進階建議、Add Set 複製上一 set）
- **Exercise Picker 優化**（橫向 muscle chip 篩選、高度自適應 `clamp()`、空結果提示、自訂動作兩步確認）
- **iOS 字型放大修復**（`@media ≤640px font-size: 16px`）
- **Trainer 手機主導航**（Plans 升至主 tab，Schedule 移至 More）
- Session Recap 一鍵發送（Mark Complete → recap modal → 發送 message 給 client）
- Badge System Phase 1（1/10/50/100 次里程碑；ClientDashboard + ClientDetailPage 顯示）
- Trainer 全客戶進度概覽頁（sparkline、排序）
- Mobile More 抽屜（底部導航 4 tab + slide-up sheet）
- Global Search（`useMemo` 優化、clients 穩定 ref）、EmptyState、Skeleton、Toast、Error Boundary
- Privacy Policy + Terms of Service（GDPR compliant，contact: Elitepro616@gmail.com）
- Firebase Auth（Google、Email/Password、Forgot Password、Demo Coach）
- Firestore real-time sync（8 collections）、IndexedDB offline persistence
- **FCM push notifications 已啟用**（VAPID key 已配置；Cloud Functions 已部署；iOS 需 PWA 模式）
- PWA manifest + iOS Add to Home Screen（white-bg blue-swirl logo，no-cache headers）
- Firebase Hosting + GitHub Actions CI
- **Google 登入修復**（桌面 popup、手機/PWA redirect；`redirectChecked` 解決 race condition 閃屏問題）
- **堂數 Top-Up 功能**（+5/+10/+20 快捷鍵 + 自訂數量 modal；預覽 remaining 計算）
- **堂數「Sessions used」直接手動輸入**（移除 auto-count from schedule completions；`used = sessionOffset` 教練直接控制）
- **MuscleSelector 改為 chip 文字選擇**（移除 SVG body model；predefined chips + custom input；同一 API）

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| `workoutLogs` + `messages` 禁止 delete | 保護紀錄完整性；GDPR delete 靠 Cloud Function |
| `workoutLogs` 用 `createdBy` 做 edit 權限 | `trainerId` 係 record-keeping，唔能做權限判斷 |
| `badges` 一旦 award 唔自動撤銷 | 防止數據錯誤誤撤；只有教練人手移除 |
| MuscleSelector 改為 chip 文字選擇（Session 29） | SVG body model UX 唔好（細位難 tap）；chip list 更快更清晰；custom input 保留靈活性 |
| HashRouter | Firebase Hosting SPA 需要 |
| CI deploy Hosting only | Service account HTTP 403（缺 Cloud Datastore Admin 角色）；Firestore rules 需手動在 Firebase Console 發布。Functions 改用 `FIREBASE_TOKEN` 認證 |
| Firestore rules 手動發布 | Test Mode 90天限制；rules 已在 Firebase Console 更新；完整版待 CI 權限修復 |
| Mobile nav 4 + More drawer | 底部 tab 上限 5，無法容納全部頁面 |
| 移除 Firebase App Check | reCAPTCHA 喺 iOS Safari 載唔到，令 Google 登入完全失效 |
| authDomain 用 `firebaseapp.com`（非 `.web.app`） | Firebase 自動 register 呢個 domain 嘅 Google OAuth redirect URI |
| Google 登入：手機/PWA 用 redirect、桌面用 popup（Session 29） | iOS PWA 喺 popup 開啟時會 suspend 主進程，popup 完成後 token 遺失；redirect 係最可靠方案 |
| `getRedirectResult` 先 resolve 才設 `authReady`（Session 29） | `onAuthStateChanged` 喺 redirect 返回前 fire `null` → 閃現 Login 頁；加 `redirectChecked` state 解決 |
| Session 堂數計算純手動（Session 29） | 自動從 schedule completions 計算 + 教練手動改兩個來源衝突，容易對唔到數；純手動 `sessionOffset` 最清晰 |
| VAPID key hardcode 為 fallback（Session 29） | VAPID Web Push public key 非 secret，可安全 hardcode；`VITE_VAPID_KEY` env var 優先，fallback 確保 push 可用 |
| Apple Watch 整合需 Capacitor 原生化 | PWA 無法存取 iOS HealthKit；Android Health Connect 只支援原生 app；Capacitor 係最低成本路徑 |

---

## 📋 待處理事項

### 🔴 P1 — 必須修復（本週）

| # | 任務 | 詳情 |
|---|------|------|
| 1 | ~~**Badge CSS 缺失**~~ ✅ 已確認 CSS 存在（tracking 文件錯誤，非真實 bug） |
| 2 | ~~**NotesSection stale closure**~~ ✅ 已修復：`useEffect` 補加 `currentUser.id`、`otherUserId` 依賴 |
| 3 | ~~**Client 記錄 workout 後 Trainer 無通知**~~ ✅ 已加 `onNewWorkoutLog` Cloud Function |
| 4 | ~~**Session booking 無提示給 Trainer**~~ ✅ 已更新 `onNewSchedule` — 同時通知 client + trainer |
| 5 | ~~**Cloud Functions 部署**~~ ✅ | Service account 加 `roles/editor` + `roles/iam.serviceAccountUser`；CI 成功部署所有 6 個 Cloud Functions |
| 6 | ~~**Google 登入失效**~~ ✅（Session 29）| 桌面 popup + 手機/PWA redirect；`redirectChecked` 解決 auth race condition |
| 7 | **學生流失預警** | Trainer Dashboard 顯示 N 天無 workout 的客戶清單；sessions remaining ≤ 2 時標紅；一鍵發 message follow up |
| 8 | **堂數用完自動 Push 通知** | Cloud Function：client sessions remaining ≤ 2 時自動 push 通知 trainer；需更新 `onNewSchedule` 或獨立 scheduled function |
| 9 | **Excel / CSV 客戶匯入** | 教練上傳 Excel → 解析 → 建立 ghost client profiles（Firestore `users` docs，無 Firebase Auth）；提供模板下載；預覽確認後批量建立；大幅降低新教練 onboarding 摩擦 |

### 🟠 P2 — 高優先（本月）

| # | 任務 | 詳情 |
|---|------|------|
| 10 | ~~**Double-submit protection 缺口**~~ ✅ | SchedulePage `updateStatus` 加 `updatingStatus` state；InvoicePage `handleMarkPaid/Unpaid` 加 `markingPaid` state |
| 11 | ~~**Form validation UX**~~ ✅ | 加 `.form-input.error`、`.form-select.error`、`.form-textarea.error`、`.form-field-error` CSS |
| 12 | ~~**Firestore onSnapshot 錯誤處理**~~ ✅ | `onErr()` helper 統一處理；`dataError` 狀態暴露；App.jsx 頂部顯示紅色 banner + Refresh 按鈕 |
| 13 | ~~**無障礙（Accessibility）**~~ ✅ | SchedulePage/InvoicePage icon buttons 加 `aria-label`；error banner 加 `role="alert"` |
| 14 | ~~**Session quota 未執行**~~ ✅ | `handleAdd` 喺 SchedulePage 加 quota check，超額時 toast 錯誤並 return |
| 15 | ~~**SchedulePage conflict 邏輯**~~ ✅ N/A | 檢查代碼後確認 `hasConflict` 已先驗證 working hours 再 check overlap，邏輯正確 |
| 16 | ~~**Push Notifications 啟動**~~ ✅（Session 29）| VAPID key 已配置；iOS 需 PWA 模式（Add to Home Screen）；Android Chrome 直接支援 |
| 17 | **月度進度報告自動生成** | 每月自動整合：新 PRs、體重變化、sessions 完成數、訓練量趨勢；一鍵以 Message 發送給 client；提升 renewal 動力 |
| 18 | **公開教練 Profile 頁** | 可分享 URL（`elitepro-16718.web.app/#/coach/{inviteCode}`）；顯示教練名、speciality、匿名化成果（「10位學員平均減重 X kg」）；作為獲客工具 |

### 🟡 P3 — 中優先

| # | 任務 | 詳情 |
|---|------|------|
| 19 | ~~**Navigation array 整合**~~ ✅ | 8個獨立 array → `LINK_DEFS` 單一 source of truth + `NAV_CONFIG` + `makeLinks()`，Navigation.jsx 大幅簡化 |
| 20 | ~~**VAPID key 移入 .env**~~ ✅ | `VAPID_KEY = import.meta.env.VITE_VAPID_KEY \|\| 'z6wTBniu9...'`（hardcode fallback） |
| 21 | ~~**Message rate limiter cleanup**~~ ✅ N/A | 審查代碼確認 `msgTimestampsRef` 每次 `sendMessage` 都 filter + reassign，最多保留 10 條，無實際累積問題 |
| 22 | ~~**Bulk Assign Plan**~~ ✅ | WorkoutPlansPage 加 `bulkAssign` toggle + checkbox multi-select + `Promise.all` 批量建立；有 2+ 客戶時顯示 "Bulk Assign" 按鈕 |
| 23 | ~~**AppContext 拆分**~~ ✅ | `seedDemoDataForCoach`（80行）提取至 `context/demoSeed.js`；badge 邏輯提取至 `context/badgeUtils.js`；AppContext 精簡 ~90 行 |
| 24 | **Referral 系統** | 現有 client 分享 referral link 介紹新 client；教練可設 referral 獎勵（如送 1 堂）；追蹤 referral 來源 |
| 25 | **iOS Shortcuts Webhook** | 每位教練生成專屬 webhook URL；iOS Shortcut 自動 POST Apple Health 數據（步數、心率、體重）；免 Capacitor 實現部分健康數據同步 |
| 26 | **Google Fit / Health Connect OAuth** | Android 平台；授權後定時同步體重、活動數據至 bodyStats；需 Firebase Functions 做 token refresh |

### 🟢 低優先（長遠）

| # | 任務 |
|---|------|
| 27 | **獎章 Shareable 卡 Phase 2**（Web Share API） |
| 28 | **進度相片**（Firebase Storage） |
| 29 | **Client Onboarding（PAR-Q）**（法律保護） |
| 30 | **Data Export（CSV / PDF）**（GDPR 合規） |
| 31 | **Landing Page**（獲客） |
| 32 | **Stripe 收費整合 Phase 2** |
| 33 | **Hevy CSV Import**（獲客工具：教練從 Hevy 帶走客戶數據） |
| 34 | **Capacitor 原生化 + App Store 上架**（Apple Watch HealthKit、Sign in with Apple、iOS/Android push 更可靠） |
| 35 | **Trainer announcements / broadcast**（群發訊息） |
| 36 | **Group Class 管理**（多 client 同一 session） |

---

## 📐 參考資訊

### 導航架構

| 平台 | 主導航（常顯） | More 抽屜 |
|------|------------|---------|
| **Trainer 桌面 sidebar** | Dashboard, Clients, Schedule, Messages | Progress Overview, Workout Plans, Invoices, Exercise Library |
| **Trainer 手機底部** | Home, Clients, Plans, Messages | Schedule, Invoices, Progress Overview, Exercise Library, Profile |
| **Client 桌面 sidebar** | Dashboard, Workout Log, Progress, Messages | My Plans, Schedule, Exercise Library |
| **Client 手機底部** | Home, Log, Schedule, Messages | My Plans, My Progress, Exercise Library, Profile |

### Exercise Unit Types

| `unit` 值 | 輸入欄位 | 顯示格式 |
|-----------|---------|---------|
| `weight_reps`（預設）| kg + reps | `80kg × 10` |
| `reps_only` | reps only | `× 20` |
| `time` | seconds | `60s` |
| `distance` | metres | `400m` |

### Session 堂數欄位說明

| Firestore 欄位 | 意思 | 誰改 |
|---------------|------|------|
| `totalSessions` | 學員購買總堂數（可 Top-Up）| 教練（Set Total / Top-Up） |
| `sessionOffset` | 已用堂數（手動填）| 教練（Sessions used input） |
| remaining | `totalSessions - sessionOffset` | 系統自動計算，唔儲存 |

> Mark Complete（Schedule）只係歷史記錄，**不再影響堂數計算**。

### CI / Deployment 限制

CI service account（`FIREBASE_SERVICE_ACCOUNT`）只有 **Firebase Hosting Admin** 權限：
- Firestore rules 部署：HTTP 403 → **需人手在 Firebase Console 發布**
- Cloud Functions 部署：需另加 **Cloud Functions Admin** + **Cloud Run Admin** 角色

**永久修復方式：** Google Cloud Console → IAM → 找到 CI service account → 加 Cloud Datastore Index Admin、Cloud Functions Admin、Cloud Run Admin 角色

### Push Notifications 配置

| 項目 | 狀態 | 詳情 |
|------|------|------|
| VAPID Key | ✅ 已配置 | hardcode fallback 於 `NotificationContext.jsx`；`VITE_VAPID_KEY` env var 優先 |
| Cloud Functions | ✅ 已部署 | `onNewWorkoutLog` + `onNewSchedule` + 4個其他 functions |
| iOS 支援 | ⚠️ 限制 | 需 PWA 模式（Add to Home Screen）；Safari 16.4+ 才支援 Web Push |
| Android Chrome | ✅ 直接支援 | 無需 PWA 模式 |
| Blaze Plan | ✅ 已啟用 | Cloud Functions 已部署 |
