# ElitePro 開發進度紀錄

> 最後更新：2026-05-23（Session 31）

---

## 🚀 即時行動清單（推廣前必須完成）

> 目標：搵第一位 Founding Member 前，以下全部 ✅

| 優先 | 任務 | 負責 | 狀態 |
|------|------|------|------|
| 🔴 | 更新 Landing Page copy → 首5位 Founding Member，3個月免費 | 員工B | ⬜ |
| 🔴 | 手機打開 `/#/landing` 確認版面效果 | 自己 | ⬜ |
| 🔴 | Firebase Console → Functions 確認 6 個 functions 存在 | 自己 | ⬜ |
| 🔴 | Firebase Console → Firestore Rules 確認係最新版本 | 自己 | ⬜ |
| 🟠 | End-to-end 測試：Landing Page → Sign up → 加 client → Book session → Mark Complete → 確認堂數扣數 | 自己 | ⬜ |
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
| Push Notifications | ✅ | ⚠️ 待確認 |
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
- **完成課堂自動扣堂數**（Mark Complete → Firestore `increment(1)` 原子操作；教練仍可在 ClientDetailPage 手動覆蓋）
- **堂數 Top-Up 功能**（+5/+10/+20 快捷鍵 + 自訂數量 modal）

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

### gym啦 Sprint 1（已完成 — commit 82306e3）
整合入 ElitePro，共用 Firebase project `elitepro-16718`。
- `operator` role routing + OperatorDashboard
- Studio 管理（新增 / 編輯 / 停用）
- Studio Slots 批量開放（1 小時一格）+ `runTransaction` 防 race condition booking
- 教練申請流程（TrainerApplicationPage）+ Operator 審核（approve / reject）
- TrainerDashboard gym啦 CTA card（`gymlaStatus === 'none'` 時顯示）
- Firestore rules（`studios`, `studioSlots`, `trainerApplications`）
- 新 Pages：`OperatorDashboard.jsx`, `StudioManagementPage.jsx`, `StudioBookingPage.jsx`, `TrainerApplicationPage.jsx`

### WorkoutLog 最新改善（Session 31）
- **REST TIMER 清理**：移除 ActiveWorkoutView inline RestTimerBar + 移除概覽畫面頂部 REST TIMER block；只保留底部 floating pill
- **Floating pill 改良**：尺寸放大（padding 14×22px，時間字體 1.5rem）；時間數字可點擊輸入自訂分:秒（edit 模式，分:秒雙 input）
- **訓練日誌儲存錯誤**：`catch {}` 靜默吞錯改為 `catch(err)` + toast 顯示實際 error code；guard undefined exerciseId 防止 Firestore 拒寫
- **Client Dashboard**：體重迷你趨勢圖（Sparkline）+ 「今日訓練」CTA（有計劃直接開始 / 無計劃自由訓練）
- **ProfilePage**：Founding Member banner（Free tier trainer 限定）

---

## 📋 待處理事項

### 🔴 P1 — 必須處理

| # | 任務 | 詳情 |
|---|------|------|
| 1 | **Push 通知實際運作確認** | GitHub Actions → Deploy Functions 確認冇 error；Firebase Console → Functions 確認 6 個 functions 存在；確認 VAPID key 吻合；雙方去 Profile → Enable Notifications |
| 2 | **堂數用完自動 Push 通知** | Cloud Function：client sessions remaining ≤ 2 時自動 push 通知 trainer |
| 3 | **Excel / CSV 客戶匯入** | 教練上傳 Excel → 解析 → 建立 ghost client profiles；提供模板下載；預覽確認後批量建立 |
| 4 | **訓練日誌儲存錯誤確認** | Fix 已部署（commit aa8a90e），等待用戶測試回報。若 toast 顯示實際 error code，再進一步診斷根本原因 |

### 🟠 P2 — 高優先

| # | 任務 | 詳情 |
|---|------|------|
| 5 | **月度進度報告自動生成** | 每月整合：新 PRs、體重變化、sessions 完成數、訓練量趨勢；一鍵以 Message 發送給 client |
| 6 | **公開教練 Profile 頁** | 可分享 URL（`/#/coach/{inviteCode}`）；顯示教練名、speciality、匿名化成果；作為獲客工具 |

### 🟡 P3 — 中優先

| # | 任務 | 詳情 |
|---|------|------|
| 7 | **Referral 系統** | 現有 client 分享 referral link 介紹新 client；教練可設 referral 獎勵（如送 1 堂） |
| 8 | **iOS Shortcuts Webhook** | 每位教練生成專屬 webhook URL；iOS Shortcut 自動 POST Apple Health 數據；免 Capacitor 實現部分健康數據同步 |
| 9 | **Google Fit / Health Connect OAuth** | Android 平台；授權後定時同步體重、活動數據至 bodyStats |

### 🟢 低優先（長遠）

| # | 任務 |
|---|------|
| 10 | **獎章 Shareable 卡 Phase 2**（Web Share API） |
| 11 | **進度相片**（Firebase Storage） |
| 12 | **Client Onboarding（PAR-Q）**（法律保護） |
| 13 | **Data Export（CSV / PDF）**（GDPR 合規） |
| 14 | **Landing Page**（獲客） |
| 15 | **Stripe 收費整合**（目前 invoice 係 PDF，收錢靠線下） |
| 16 | **Hevy CSV Import**（教練從 Hevy 帶走客戶數據） |
| 17 | **Trainer announcements / broadcast**（群發訊息） |
| 18 | **Group Class 管理**（多 client 同一 session） |
| 19 | **Capacitor 原生化 + App Store 上架**（Apple Watch HealthKit、Sign in with Apple） |
| 20 | **Gym啦 Sprint 2+**（Flow B 學生搵教練 Directory + In-App Booking；曝光追蹤；盲評系統；Sprint 1 已完成） |

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
| Mark Complete 自動扣堂數（Firestore `increment`） | 原子操作避免 race condition；比先讀後寫穩陣；教練仍可手動覆蓋 |
| Apple Watch 整合需 Capacitor 原生化 | PWA 無法存取 iOS HealthKit；Android Health Connect 只支援原生 app |

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
| `sessionOffset` | 已用堂數 | **自動**：Mark Complete `+1`（`increment`）；教練亦可手動覆蓋 |
| remaining | `totalSessions - sessionOffset` | 系統自動計算，唔儲存 |

### CI / Deployment 限制

CI service account（`FIREBASE_SERVICE_ACCOUNT`）權限：
- Firestore rules：`continue-on-error: true`，失敗唔報紅，**需人手在 Firebase Console 確認**
- Cloud Functions：同上，需在 Firebase Console → Functions 確認 6 個 functions 存在

**永久修復方式：** Google Cloud Console → IAM → 找到 CI service account → 加 Cloud Functions Admin + Cloud Run Admin 角色

### Push Notifications 配置

| 項目 | 狀態 | 詳情 |
|------|------|------|
| VAPID Key | ✅ 已配置 | hardcode fallback 於 `NotificationContext.jsx`；`VITE_VAPID_KEY` env var 優先 |
| Cloud Functions | ⚠️ 待確認 | 需在 Firebase Console → Functions 確認 6 個 functions 存在 |
| iOS 支援 | ⚠️ 限制 | 需 PWA 模式（Add to Home Screen）；Safari 16.4+ 才支援 Web Push |
| Android Chrome | ✅ 直接支援 | 無需 PWA 模式 |
| Blaze Plan | ✅ 已啟用 | 用戶確認 |
| 用戶 FCM token | ⚠️ 需手動 | 教練 + 學生須各自去 Profile → Enable Notifications |
