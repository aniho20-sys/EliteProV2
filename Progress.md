# ElitePro — 開發進度記錄

> 最後更新：2026-05-23

---

## 🚀 已完成功能（按時間順序）

### 核心平台（早期 Sprint）
- Firebase Auth（Google、Email/Password、Demo Coach）
- Firestore 資料模型（users、bodyStats、workoutPlans、workoutLogs、schedule、messages、exercises、invoices、templates）
- TrainerDashboard + ClientDashboard
- 客戶管理（ClientsPage、ClientDetailPage）
- 訓練計劃建立 + 分配（WorkoutPlansPage）
- 課堂排程 + 日曆（SchedulePage）
- 即時訊息（MessagesPage）
- 運動資料庫（ExerciseLibraryPage）
- 發票管理（InvoicePage）
- 個人進度追蹤（ProgressPage、ProgressView）
- 體能數據 + 體重趨勢圖（BodyStats）
- 邀請碼系統（Trainer → Client 連接）
- PWA 支援（manifest + iOS splash screens + install prompt）
- 深色 / 淺色主題切換

### 近期功能（最新 Sprint）

#### 音效 + 計時器
- Floating REST TIMER pill（固定在底部，不受 scroll 影響）
- Rest timer beep 音效（AudioContext，完成時提示音）
- Timer pill 改良：可點擊時間數字手動輸入分鐘:秒

#### 訓練日誌（WorkoutLog）
- 拆分為模組化組件（`ActiveWorkoutView`, `SetInputs`, `ExerciseSwapModal`）
- 支援 4 種 set 單位：weight+reps / reps only / time / distance
- LocalStorage 草稿自動保存
- 運動換置（Exercise Swap）
- 自由訓練模式（Free Workout，無需計劃）
- 個人最佳記錄（PR）偵測 + Trophy 顯示
- 進階建議（Progression Suggestion：+2.5kg 提示）
- 最後一次訓練參考 + Fill 按鈕
- Set 完成打勾 → 自動啟動 Rest Timer

#### 數據可視化
- VolumeChart 重新設計（每 session 一條 bar，星期一起算週期）
- ClientDetailPage 訓練日誌 tab 加入 session stats bar
- ClientProgressOverviewPage（所有客戶進度總覽）
- ExerciseProgress 組件（每個動作的力量進展折線圖）

#### UI/UX 改善
- Session 日期顯示修復（日期 chip 間距）
- EmptyState 組件統一化
- Skeleton 載入動畫
- PayMe/FPS 付款連結加入發票

#### Client Dashboard 改進
- 體重迷你趨勢圖（Sparkline）
- 「今日訓練」CTA（有計劃 → 直接開始；無計劃 → 自由訓練）

#### Trainer Onboarding
- ProfilePage Founding Member banner（Free tier trainer 限定顯示）
- PWA install prompt 改善（更顯眼）

---

## 🏗️ gym啦 Sprint 1（已完成 — commit 82306e3）

整合入 ElitePro，共用 Firebase project `elitepro-16718`。

### 已實作功能

| 功能 | 狀態 |
|------|------|
| `operator` role routing | ✅ |
| OperatorDashboard | ✅ |
| Studio 管理（新增/編輯/停用） | ✅ |
| Studio Slots 批量開放（1小時一格） | ✅ |
| Slot booking（教練 book 時段）+ transaction 防 race condition | ✅ |
| 教練申請表（TrainerApplicationPage） | ✅ |
| Operator 審核申請（approve / reject） | ✅ |
| TrainerDashboard gym啦 CTA card | ✅ |
| Firestore rules（studios, studioSlots, trainerApplications） | ✅ |

### 新 Firestore Collections
- `studios/{studioId}` — 場地資料
- `studioSlots/{slotId}` — 時段（available / booked）
- `trainerApplications/{uid}` — 教練申請

### 新 Pages
- `OperatorDashboard.jsx`
- `StudioManagementPage.jsx`
- `StudioBookingPage.jsx`
- `TrainerApplicationPage.jsx`

---

## 🐛 已修復 Bugs（最新 Sprint）

| Bug | 修復 | Commit |
|-----|------|--------|
| 訓練日誌儲存失敗（錯誤被靜默吞掉，toast 顯示無意義訊息） | 改為 `catch(err)` + 顯示實際 error code/message | aa8a90e |
| undefined exerciseId 導致 Firestore 拒絕寫入 | filter + name fallback 防止 undefined 欄位 | aa8a90e |
| 客戶/運動/計劃 filter 遇 null entries 崩潰 | 加 null guards | c218d20 |
| Active workout 畫面有兩個 REST TIMER（重複） | 移除 inline RestTimerBar | d47f5bd |
| 訓練日誌概覽畫面（選計劃畫面）有多餘 REST TIMER | 移除整個 timer block | 036be2e |
| Floating pill 太細，難閱讀 | padding + 字體放大 | 4400349 |
| Floating pill 時間不可輸入 | 加 tappable time edit（分:秒 inputs） | 4400349 |
| VolumeChart 以週日起算（錯誤） | 改為週一起算 | de5694c |
| Rest timer beep 在 iOS Safari 無聲 | AudioContext pre-warm on user gesture | da857ee |

---

## 📋 待辦 / 下一步

### 訓練日誌儲存問題（待確認）
- **狀態**：Fix 已部署（aa8a90e），等待用戶測試後回報
- 修復後應在 toast 顯示實際 Firestore 錯誤（如 `permission-denied`、`invalid-argument` 等）
- 如有新錯誤訊息，需進一步診斷根本原因

### Sprint 1 訂閱模型（待實作）
- Firestore `users/{uid}.subscription` 欄位設計（見計劃文件）
- Free tier 限制：3 客戶 / 5 計劃 / 3 發票每月
- Operator 手動升級用戶（先不接 Stripe）
- TrainerDashboard 加月收入概覽 card

### gym啦 Sprint 2（未開始）
- 曝光追蹤（`trainerImpressions` collection）
- 公開教練 Directory（`/directory`，無需登入）
- 學生 in-app booking flow
- 配對後自動建立 ElitePro 師生關係

### gym啦 Sprint 3（未開始）
- 盲評系統
- 後果機制（投訴 → 暫停 → 賠償）
- Operator stats dashboard

---

## 🔧 技術架構筆記

- **CI/CD**：push to `claude/fitness-app-features-LbxtG` → GitHub Actions 自動 build + deploy Hosting
- **Firestore Rules**：`npm run deploy:rules` 單獨部署，或 `npm run deploy` 全部部署
- **operator 帳號設置**：Firebase Console → Firestore → `users/{uid}` → 手動加 `role: "operator"`
- **markLoaded threshold**：目前追蹤 8 個 collections；新增 listener 需同步增加 threshold
- **REST TIMER 架構**：`useRestTimer` hook + 單一 floating pill（WorkoutLogPage）；ActiveWorkoutView 不再有 inline timer
