# ElitePro 開發進度紀錄

> 最後更新：2026-05-03（Session 25）

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
- Schedule 日曆（conflict check、booking、working hours、Mark Complete、**可前後翻閱歷史日期**）
- In-app Messaging（unread badges、real-time sync）
- Exercise Library（search、filter、YouTube links、**Kettlebell + Other equipment**）
- Body Stats / Progress（Recharts AreaChart、趨勢指示、edit measurement）
- Profile（invite code、shareable link、working hours、connect to trainer）
- 互動人體肌肉模型（`react-body-highlighter`，正面 + 背面並排）
- Firebase Auth（Google、Email/Password、Forgot Password、Demo Coach）
- Firestore real-time sync（8 collections）、IndexedDB offline persistence
- FCM push notifications（code ready，待 VAPID key）
- PWA manifest + iOS Add to Home Screen（white-bg blue-swirl logo，no-cache headers）
- Firebase Hosting + GitHub Actions CI（`npm ci --legacy-peer-deps` 修復 vite@8 peer dep 衝突）
- Invoice 收費管理 Phase 1（Unpaid/Paid/Overdue、Print/PDF、zero-total validation）
- Trainer 全客戶進度概覽頁（sparkline、排序）
- Mobile More 抽屜（底部導航 4 tab + slide-up sheet）
- Global Search、EmptyState、Skeleton、Toast、Error Boundary
- Message rate limiting（10條/分鐘 sliding window + Firestore rules 欄位校驗）
- Privacy Policy + Terms of Service（GDPR compliant，contact: Elitepro616@gmail.com）
- Smart Progression Suggestions（plateau 時顯示 +2.5kg 建議）
- Session Recap 一鍵發送（Mark Complete → recap modal → 發送 message 給 client）
- Badge System Phase 1（1/10/50/100 次里程碑；ClientDashboard + ClientDetailPage 顯示）
- Business Analytics（/analytics：月收入、sessions、30日 retention、Top clients）
- Volume Analytics Chart（ProgressPage + ClientDetailPage）

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| `workoutLogs` + `messages` 禁止 delete | 保護紀錄完整性；GDPR delete 靠 Cloud Function |
| `workoutLogs` 用 `createdBy` 做 edit 權限 | `trainerId` 係 record-keeping，唔能做權限判斷 |
| `badges` 一旦 award 唔自動撤銷 | 防止數據錯誤誤撤；只有教練人手移除 |
| MuscleSelector 用 `react-body-highlighter` | 手寫 SVG 比例失真；MIT 套件有精準人體路徑 |
| HashRouter | Firebase Hosting SPA 需要 |
| CI deploy Hosting only | Service account HTTP 403 on `serviceusage.googleapis.com`（缺 Cloud Datastore Admin 角色）；Firestore rules 需手動在 Firebase Console 發布 |
| Firestore rules 手動發布 | Test Mode 90天限制；rules 已在 Firebase Console 更新為 `auth != null` 簡化版；完整版待 CI 權限修復後自動部署 |
| Mobile nav 4 + More drawer | 底部 tab 上限 5，無法容納全部頁面 |
| 移除 Firebase App Check | reCAPTCHA 喺 iOS Safari 載唔到，令 popup 內部 auth 被 block，導致 Google 登入完全失效 |
| authDomain 用 `firebaseapp.com`（非 `.web.app`） | Firebase 自動 register 呢個 domain 嘅 Google OAuth redirect URI，唔需要人手設定 |

---

## 📋 待處理事項

### 🔴 必做（推廣前）

| # | 任務 |
|---|------|
| 1 | ~~**Privacy Policy + Terms of Service**~~ ✅ 已完成 |
| 2 | ~~**Firebase App Check**~~ 已移除（令 iOS 登入正常） |
| 3 | **GDPR Cloud Function 部署**（需 Blaze plan）|
| 4 | ~~**Message rate limiting**~~ ✅ 已完成 |
| 5 | **修復 CI service account 權限**（Google Cloud Console → IAM → 加 Cloud Datastore Admin → Firestore rules 自動部署）|

### 🟠 高優先——倚賴度功能

| # | 任務 | 說明 |
|---|------|------|
| 6 | ~~**Workout Complete Screen**~~ ✅ 已完成 | 儲存後顯示 PRs、volume、closing message |
| 7 | ~~**Smart Progression Suggestions**~~ ✅ 已完成 | 分析最近3次 log；plateau 時顯示 +2.5kg 建議 |
| 8 | ~~**Session Recap 一鍵發送**~~ ✅ 已完成 | Mark Complete → recap modal → 發送 message 給 client |
| 9 | ~~**獎章系統 Phase 1**~~ ✅ 已完成 | 1/10/50/100 次里程碑 badge；ClientDashboard + ClientDetail 顯示 |
| 10 | ~~**Business Analytics**~~ ✅ 已完成 | /analytics 頁面：月收入、sessions、30日 retention、Top clients |
| 11 | ~~**Trainer 替 client 記錄 workout**~~ ✅ 已完成 | ClientDetailPage → Log Session → WorkoutLogPage（含 rest timer） |
| 12 | ~~**Schedule 歷史日期查閱**~~ ✅ 已完成 | 前後翻閱任意日期 |
| 13 | ~~**Workout Plan UX 改善**~~ ✅ 已完成 | Equipment filter、per-exercise unit type + notes、unit-aware set inputs |

### 🟡 中優先

| # | 任務 |
|---|------|
| 14 | **Push Notifications 啟動**（需 VAPID key + Blaze）|
| 15 | **Set Completion Checkbox** |
| 16 | ~~**Volume Analytics Chart**~~ ✅ 已完成 |
| 17 | **Bulk Assign Plan to Multiple Clients** |
| 18 | **AppContext 拆分**（660+ lines）|
| 19 | **Firestore workoutLogs composite index** |

### 🟢 低優先

| # | 任務 |
|---|------|
| 20 | **獎章 Shareable 卡 Phase 2**（Web Share API，DOM 隔離）|
| 21 | **進度相片** |
| 22 | **Client Onboarding（PAR-Q）** |
| 23 | **Data Export（CSV / PDF）** |
| 24 | **Landing Page** |
| 25 | **Stripe 收費整合 Phase 2** |
| 26 | **Hevy CSV Import**（獲客工具）|
| 27 | **App Store 上架（Capacitor）** |
