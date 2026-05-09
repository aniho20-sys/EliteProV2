# ElitePro 開發進度紀錄

> 最後更新：2026-05-09（Session 28）

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
| 堂數管理 | ❌ | ✅ |
| Invoice / 收費 | ❌ | ✅ |
| Workout Log 編輯 | ❌ | ✅ |
| Workout Complete Screen | ❌ | ✅ |
| Smart Progression | ❌ | ✅ |
| Badge / 獎章系統 | ❌ | ✅ |
| Built-in exercise GIFs | ✅ | ❌ |
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
- **互動人體肌肉模型**（vulovix/body-muscles Apache 2.0 SVG 路徑 + 完整身體輪廓 silhouette，front + back 各 6 形狀連接，肌肉組別深灰/輪廓淺灰形成對比）
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
- FCM push notifications（code ready，待 VAPID key + Blaze）
- PWA manifest + iOS Add to Home Screen（white-bg blue-swirl logo，no-cache headers）
- Firebase Hosting + GitHub Actions CI

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| `workoutLogs` + `messages` 禁止 delete | 保護紀錄完整性；GDPR delete 靠 Cloud Function |
| `workoutLogs` 用 `createdBy` 做 edit 權限 | `trainerId` 係 record-keeping，唔能做權限判斷 |
| `badges` 一旦 award 唔自動撤銷 | 防止數據錯誤誤撤；只有教練人手移除 |
| MuscleSelector 換成完全自定義 SVG | `react-body-highlighter` 座標系固定，無法對準真實解剖圖；Session 28 改用 vulovix/body-muscles（Apache 2.0）SVG 路徑 + 6個幾何輪廓形狀（head + torso + 2 arms + 2 legs）組成完整 silhouette |
| HashRouter | Firebase Hosting SPA 需要 |
| CI deploy Hosting only | Service account HTTP 403（缺 Cloud Datastore Admin 角色）；Firestore rules 需手動在 Firebase Console 發布。Functions 改用 `FIREBASE_TOKEN` 認證 |
| Firestore rules 手動發布 | Test Mode 90天限制；rules 已在 Firebase Console 更新；完整版待 CI 權限修復 |
| Mobile nav 4 + More drawer | 底部 tab 上限 5，無法容納全部頁面 |
| 移除 Firebase App Check | reCAPTCHA 喺 iOS Safari 載唔到，令 Google 登入完全失效 |
| authDomain 用 `firebaseapp.com`（非 `.web.app`） | Firebase 自動 register 呢個 domain 嘅 Google OAuth redirect URI |

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

### 🟠 P2 — 高優先（本月）

| # | 任務 | 詳情 |
|---|------|------|
| 6 | **Double-submit protection 缺口** | ClientDetailPage、SchedulePage、MessagesPage、InvoicePage、WorkoutLogPage 儲存按鈕可能 race |
| 7 | **Form validation UX** | 無 inline field error（`.form-input.error` 樣式），錯誤只在頂部 div 顯示 |
| 8 | **Firestore onSnapshot 錯誤處理** | 8個 listener 在 error 時都 mark loaded → 顯示空白而非 error message |
| 9 | **無障礙（Accessibility）** | Icon-only buttons 缺 `aria-label`；form inputs 缺 `id`/`htmlFor`；error 無 `role="alert"` |
| 10 | **Session quota 未執行** | Quota 已計算但未 enforce，教練可超額預訂 |
| 11 | **SchedulePage conflict 邏輯** | `hasConflict` 未先驗證 working hours 邊界才 check overlap |
| 12 | **Push Notifications 啟動** | 需 VAPID key + Blaze plan |

### 🟡 P3 — 中優先

| # | 任務 | 詳情 |
|---|------|------|
| 13 | **Navigation array 整合** | 4個獨立 link array（desktop/mobile × trainer/client）有重複 |
| 14 | **VAPID key 移入 .env** | FCM VAPID key 現時 hardcode 在 NotificationContext，應改為 `VITE_VAPID_KEY` |
| 15 | **Message rate limiter cleanup** | `msgTimestampsRef` 在 session 生命週期持續累積 |
| 16 | **Bulk Assign Plan** | 無法一次過將 plan assign 給多個 clients |
| 17 | **AppContext 拆分** | 現時 660+ lines，應按功能域拆分 |

### 🟢 低優先（長遠）

| # | 任務 |
|---|------|
| 18 | **獎章 Shareable 卡 Phase 2**（Web Share API） |
| 19 | **進度相片** |
| 20 | **Client Onboarding（PAR-Q）** |
| 21 | **Data Export（CSV / PDF）** |
| 22 | **Landing Page** |
| 23 | **Stripe 收費整合 Phase 2** |
| 24 | **Hevy CSV Import**（獲客工具）|
| 25 | **App Store 上架（Capacitor）** |
| 26 | **Trainer announcements / broadcast**（群發訊息） |

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

### CI / Deployment 限制

CI service account（`FIREBASE_SERVICE_ACCOUNT`）只有 **Firebase Hosting Admin** 權限：
- Firestore rules 部署：HTTP 403 → **需人手在 Firebase Console 發布**
- Cloud Functions 部署：需另加 **Cloud Functions Admin** + **Cloud Run Admin** 角色

**永久修復方式：** Google Cloud Console → IAM → 找到 CI service account → 加 Cloud Datastore Index Admin、Cloud Functions Admin、Cloud Run Admin 角色
