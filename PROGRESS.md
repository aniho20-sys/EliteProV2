# ElitePro 開發進度紀錄

> 最後更新：2026-04-26（Session 23）

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
| Smart Progression | ❌ | 🔜 |
| Badge / 獎章系統 | ❌ | 🔜 |
| Built-in exercise GIFs | ✅ | ❌ |
| Native mobile app | ✅ | ⚠️ PWA |

---

## ✅ 已完成功能

- React 19 + Vite 8 SPA（HashRouter）、Trainer / Client 雙角色
- Trainer Dashboard（stats + weekly chart + client activity）
- Client Dashboard（stats + sessions quota + Book Session CTA）
- Client 管理（搜尋、detail view、labels/分組、Remove Client）
- Workout Plan Builder（drag reorder、duplicate、custom exercises、templates）
- Workout Log（auto-fill、PR tracking、edit 權限用 `createdBy` 判斷）
- Rest Timer（sticky bar、5個預設、Web Audio、震動）
- Schedule 日曆（conflict check、booking、working hours、Mark Complete）
- In-app Messaging（unread badges、real-time sync）
- Exercise Library（search、filter、YouTube links）
- Body Stats / Progress（Recharts AreaChart、趨勢指示、edit measurement）
- Profile（invite code、shareable link、working hours、connect to trainer）
- 互動人體肌肉模型（`react-body-highlighter`，正面 + 背面並排）
- Firebase Auth（Google、Email/Password、Forgot Password、Demo Coach）
- Firestore real-time sync（8 collections）、IndexedDB offline persistence
- FCM push notifications（code ready，待 VAPID key）
- PWA manifest + iOS Add to Home Screen
- Firebase Hosting + GitHub Actions CI
- Invoice 收費管理 Phase 1（Unpaid/Paid/Overdue、Print/PDF）
- Trainer 全客戶進度概覽頁（sparkline、排序）
- Mobile More 抽屜（底部導航 4 tab + slide-up sheet）
- Global Search、EmptyState、Skeleton、Toast、Error Boundary
- Message rate limiting（10條/分鐘 sliding window + Firestore rules 欄位校驗）
- Firebase App Check（reCAPTCHA v3，dev debug mode，prod 用 VITE_RECAPTCHA_SITE_KEY）

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| `workoutLogs` + `messages` 禁止 delete | 保護紀錄完整性；GDPR delete 靠 Cloud Function |
| `workoutLogs` 用 `createdBy` 做 edit 權限 | `trainerId` 係 record-keeping，唔能做權限判斷 |
| `badges` 一旦 award 唔自動撤銷 | 防止數據錯誤誤撤；只有教練人手移除 |
| MuscleSelector 用 `react-body-highlighter` | 手寫 SVG 比例失真；MIT 套件有精準人體路徑 |
| HashRouter | Firebase Hosting SPA 需要 |
| CI deploy Hosting only | Service account 缺 Firebase Rules Admin 權限；rules 需手動 deploy |
| Mobile nav 4 + More drawer | 底部 tab 上限 5，無法容納全部頁面 |

---

## 📋 待處理事項

### 🔴 必做（推廣前）

| # | 任務 |
|---|------|
| 1 | **Privacy Policy + Terms of Service** |
| 2 | ~~**Firebase App Check**（防 API 濫用）~~ ✅ 已完成 |
| 3 | **GDPR Cloud Function 部署**（需 Blaze plan）|
| 4 | ~~**Message rate limiting**~~ ✅ 已完成 |

### 🟠 高優先——倚賴度功能

| # | 任務 | 說明 |
|---|------|------|
| 5 | **Workout Complete Screen** | 儲存 log 後顯示完成畫面（PRs、volume、closing message）；純前端 |
| 6 | **Smart Progression Suggestions** | 根據過去3次 log 自動建議加重；純前端；競爭對手做唔到 |
| 7 | **Session Recap 一鍵發送** | Mark Complete → 生成 recap → 教練 confirm → 發去 in-app message |
| 8 | **獎章系統 Phase 1** | 訓練次數里程碑（10/50/100次）+ 相對 PR 進步；教練確認後 award |
| 9 | **Business Analytics** | 月收入趨勢、retention rate；現有 invoice + schedule data 已足夠 |

### 🟡 中優先

| # | 任務 |
|---|------|
| 10 | **Push Notifications 啟動**（需 VAPID key + Blaze）|
| 11 | **Set Completion Checkbox** |
| 12 | **Volume Analytics Chart** |
| 13 | **Bulk Assign Plan to Multiple Clients** |
| 14 | **AppContext 拆分**（660+ lines）|
| 15 | **Firestore workoutLogs composite index** |

### 🟢 低優先

| # | 任務 |
|---|------|
| 16 | **獎章 Shareable 卡 Phase 2**（Web Share API，DOM 隔離）|
| 17 | **進度相片** |
| 18 | **Client Onboarding（PAR-Q）** |
| 19 | **Data Export（CSV / PDF）** |
| 20 | **Landing Page** |
| 21 | **Stripe 收費整合 Phase 2** |
| 22 | **Hevy CSV Import**（獲客工具）|
| 23 | **App Store 上架（Capacitor）** |
