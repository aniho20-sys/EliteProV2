# ElitePro 開發進度紀錄

> 最後更新：2026-04-13（Session 7）

---

## Phase 1 狀態：✅ 已完成

Phase 1（上線前必做）所有 8 個步驟已全部完成。

---

## 已完成功能

### Core Platform
- [x] React 19 + Vite 8 SPA（HashRouter）
- [x] Trainer / Client 雙角色系統
- [x] Trainer Dashboard（stats overview + weekly sessions chart + client activity）
- [x] Client Dashboard（workout summary + body stats）
- [x] Client 管理頁（搜尋、detail view、body stats、plans、logs、**Remove Client with confirmation**）
- [x] Workout Plan Builder（drag reorder、duplicate、custom exercises、**Add Link per exercise**）
- [x] Workout Log（auto-fill last session、PR tracking）
- [x] Schedule 日曆（date picker、conflict check、booking）
- [x] In-app Messaging（unread badges、real-time sync）
- [x] Exercise Library（search、filter by muscle/equipment、**YouTube + 任意 URL 連結、+ Add Link 快速入口**）
- [x] Body Stats / Progress 頁（SVG trend charts、chest/waist/hips/arms/legs）
- [x] Profile 頁（edit profile、invite code、connect to trainer）
- [x] Global Search（clients、plans、exercises）
- [x] Toast notification system
- [x] Error Boundary（防白畫面）

### Firebase Backend
- [x] Firestore 作為 primary database（取代 localStorage）
- [x] Real-time sync（onSnapshot listeners — 7 collections）
- [x] IndexedDB offline persistence
- [x] Firebase Auth：Google Sign-In（+ iOS Safari redirect fallback）
- [x] Firebase Auth：Email / Password 註冊 + 登入
- [x] Forgot Password 流程（LoginPage modal → Firebase reset email）
- [x] Demo Coach 帳號（自動 Firebase Auth signup + seed ghost clients）
- [x] Trainer-Client 邀請碼系統（6-char code、connect flow）
- [x] Delete Account 功能（GDPR right to erasure）
- [x] Firestore Security Rules（pragmatic model：authed read、per-doc write）

### UI/UX（Phase 1 Step 7 新增）
- [x] Light / Dark 主題（CSS variables、localStorage persist）
- [x] 全 responsive（desktop sidebar + mobile bottom nav）
- [x] Custom Exercise 建立（inline quick-add + structured form with muscle groups）
- [x] Plan exercises 顯示 Sets x Reps + Weight(kg)
- [x] **EmptyState 通用組件**（icon + title + description + action CTA）
- [x] **Skeleton 載入組件**（SkeletonLine、SkeletonCard、SkeletonList、SkeletonStatGrid）
- [x] **10 個頁面 empty state 升級**（每頁都有專屬 icon + 情境化描述 + CTA 按鈕）

### 寫操作審計修復（Phase 1 Step 8 新增）
- [x] SchedulePage：所有寫操作改為 async/await + try/catch + error toast
- [x] SchedulePage：`saving` state 防 double-submit
- [x] SchedulePage：Client 冇 trainer 時禁止 Book Session（button disabled + form guard）
- [x] SchedulePage：`updateStatus` helper 統一狀態更新錯誤處理
- [x] MessagesPage：`sending` state 防重複發送
- [x] MessagesPage：2000 字元上限 + 空白訊息檢查
- [x] MessagesPage：`markMessagesRead` useEffect 包 `.catch()` 防 unhandled rejection
- [x] MessagesPage：Send 按鈕 disabled 邏輯（sending || empty text）

### Push Notifications（✅ 完整部署）
- [x] `NotificationContext.jsx`：FCM token 管理 + 前景訊息處理（VAPID key 已設定）
- [x] `functions/index.js`：Cloud Functions（onNewMessage、onNewSchedule、onScheduleUpdate、**onAccountDelete GDPR**）
- [x] `public/firebase-messaging-sw.js`：Service Worker 處理背景通知
- [x] `public/manifest.json`：PWA manifest（SVG + PNG 192/512 圖示）
- [x] Firebase Blaze plan 已升級

### PWA（iOS Home Screen 支援）
- [x] `public/icon-192.png` + `icon-512.png`（純 Node.js 生成，無外部依賴）
- [x] `index.html`：`apple-touch-icon`、`apple-mobile-web-app-capable`、`apple-mobile-web-app-title`
- [x] Android Chrome：無需放桌面，直接收通知
- [x] iOS Safari：需 Add to Home Screen（iOS 16.4+）

### DevOps
- [x] Firebase Hosting config（`firebase.json`、`.firebaserc`）
- [x] GitHub Actions — Firebase Hosting 自動部署
- [x] GitHub Actions — **Cloud Functions 自動部署**（新增）
- [x] GitHub Actions — GitHub Pages 部署
- [x] Vite base path 切換（`DEPLOY_TARGET=gh-pages`）

---

## Session 7 完成嘅工作（2026-04-13）

### Phase 3 安全任務（F + A + C + B）

| # | 任務 | 詳情 |
|---|------|------|
| 1 | Firestore rules 讀取收緊 | `workoutPlans`、`workoutLogs`、`schedule` read 由 `isAuth()` 改為只有 `trainerId`/`clientId` 係自己先可讀；AppContext 4 個 listeners 加 `or()` query filter（`workoutPlans`、`workoutLogs`、`schedule`、`messages`）；`addWorkoutLog` + seed data 加 `trainerId` 字段 |
| 2 | Exercise Library trainerId 隔離 | Exercises listener 移到 `currentUser` effect：trainer 讀自己嘅 exercises，client 讀 trainer 嘅 exercises；default exercises 純靜態 JS，唔再入 Firestore；刪除 `seedExercisesIfEmpty()`；rule 改為 `trainerId == uid || userDoc().trainerId == trainerId` |
| 3 | Schedule clientId ownership 驗證 | `allow create` 加兩層驗證：trainer 只能為自己 client 預約（`get(users/clientId).trainerId == uid`）；client 只能預約自己嘅 trainer（`userDoc().trainerId == trainerId`） |

### Phase 3 剩餘任務

| 優先級 | 任務 | 狀態 |
|--------|------|------|
| ✅ 完成 | Firestore rules 讀取收緊 | 完成 |
| ✅ 完成 | Exercise Library trainerId 隔離 | 完成 |
| ✅ 完成 | Schedule clientId ownership 驗證 | 完成 |
| 🟡 中 | Progress 圖表升級（Recharts） | 待做 |
| 🟡 中 | bodyStats 遷移 subcollection | 待做（長遠）|
| 🟢 低 | i18n 中文支援 | 待做 |

---

## Phase 3 前全員會議（2026-04-12 Session 6）

> Phase 3 執行前，全隊對 app 現況進行評估。每位員工列出 3 個好嘅地方、3 個唔好嘅地方、2 個有問題嘅地方，PM 最後總結解決方案。

---

### [員工A - SA] 系統架構評估

**👍 3個好：**
1. **實時同步** — Firestore `onSnapshot` 做得好，多裝置即時更新，trainer 同 client 睇到一樣嘅資料
2. **離線支援** — IndexedDB persistence 設計正確，網絡斷咗照用
3. **身份驗證完整** — Google 登入、Email 登入、Demo 模式三路齊備，Auth flow 清晰

**👎 3個唔好：**
1. **Firestore listener 冇 filter** — 訂閱整個 collection，用戶多咗會讀取大量無關數據，scalability 差
2. **Exercise Library 無隔離** — 所有 trainer 睇同一堆 exercises，互相混雜
3. **冇 pagination** — workout logs、messages 唔限數量全部 load，長遠會卡

**⚠️ 2個有問題：**
1. `workoutLogs` 同 `messages` **無法刪除**（Firestore rules 設定），GDPR 刪帳戶時靠 Cloud Function 繞過，但日常清理做唔到
2. **Schedule 冇驗證 clientId owner**，理論上可以 assign 任何人做 client

---

### [員工B - Dev] 程式碼實作評估

**👍 3個好：**
1. **Code splitting 成功** — 809KB → 258KB，lazy loading 做得正，初次載入快咗 3 倍
2. **AppContext 架構統一** — 所有 Firestore 操作集中管理，唔洗係 component 直接 import db
3. **Toast + EmptyState + Skeleton** — UI feedback 系統完整，用戶體驗一致

**👎 3個唔好：**
1. **IDs 用 `Date.now()`** — 高並發下有碰撞風險，應改用 `crypto.randomUUID()`
2. **`functions/index.js` 批次 delete 冇限制** — `onAccountDelete` 用 batch 但 Firebase batch 上限 500 docs，大帳戶會 crash
3. **Push notification 只有 new message trigger** — schedule 提醒本來有寫 Cloud Function 但未部署

**⚠️ 2個有問題：**
1. **Demo reset 流程殘缺** — `resetData()` 無法刪 workoutLogs/messages，demo 數據越積越多
2. **`markLoaded` 硬編碼 count=7** — 新增 collection listener 時容易忘記改呢個數字，靜默 bug

---

### [員工C - Reviewer] Code Review 評估

**👍 3個好：**
1. **Error boundary 存在** — React class ErrorBoundary 包住整個 app，crash 唔會白頁
2. **Double-submit protection** — 所有 async 操作都有 `saving`/`sending` state，冇重複提交問題
3. **Firestore rules 有基本保護** — auth required、role check、ownership check 都有

**👎 3個唔好：**
1. **Firestore rules 讀取太寬鬆** — `bodyStats`、`workoutLogs`、`schedule` 全部 `any auth can read`，A 的 trainer 可以讀 B client 的數據
2. **`connectToTrainer` 無 race condition 保護** — 兩個人同時用同一 invite code 可能出問題
3. **`deleteAccount()` 冇等 Cloud Function 完成** — 前端刪 Auth user，但後端 GDPR Function 係 async trigger，時序問題

**⚠️ 2個有問題：**
1. **exercises collection 寫入規則剛加 `trainerId` check**，但舊數據冇 `trainerId` 字段，update/delete 會被 block
2. **`loadedRef` 唔係 React state**，某些 edge case 下 `loading` 可能唔會更新 UI

---

### [員工D - UI/UX] 介面體驗評估

**👍 3個好：**
1. **Light/dark theme** — CSS variables 設計優雅，切換流暢，持久化到 localStorage
2. **Mobile navigation** — bottom nav + sidebar 雙佈局，手機電腦都適配
3. **Skeleton loading** — 有 loading state 唔係白頁，體驗專業

**👎 3個唔好：**
1. **Progress 圖表太簡陋** — 用原生 `<canvas>` 手寫，缺 interactivity，對比 Fitbit/MyFitnessPal 差好遠
2. **唔支援中文/廣東話** — 所有介面英文，目標用戶係廣東話用家
3. **PWA icon 係純色方塊** — 192×192 純藍色，冇品牌感，App Store / Home Screen 睇落業餘

**⚠️ 2個有問題：**
1. **Messages 頁面冇顯示 timestamp** — 唔知幾時發嘅訊息，用戶體驗差
2. **Workout log 入面 exercise name 要查 library** — 顯示 `exerciseId` 而唔係 name，用戶睇唔明

---

### [員工E - QA] 測試與合規評估

**👍 3個好：**
1. **Demo coach 功能** — 一鍵試用，seed 數據齊全，新用戶 onboarding 順暢
2. **Invite code 系統** — 6 位英數字母，cryptographically secure（已修復），trainer-client 連接簡單
3. **CI/CD 完整** — push 到 branch 自動 deploy hosting + functions，唔使手動操作

**👎 3個唔好：**
1. **冇任何 automated tests** — 零 unit tests、零 integration tests，改一樣嘢唔知有冇 break 其他
2. **錯誤訊息唔夠 friendly** — Firebase error codes 直接 show 出來（如 `auth/wrong-password`），用戶唔明
3. **Session 過期冇 graceful 處理** — Firebase token expire 後某些操作會 silent fail

**⚠️ 2個有問題：**
1. **Trainer 刪帳戶後，佢嘅 clients 變成孤兒** — `trainerId` 指向唔存在嘅 user，clients 頁面可能 crash
2. **`bodyStats` 用 entries array** — 無限增長，Firestore doc limit 1MB，積累幾年 stats 會超限

---

### [員工F - Security] 滲透測試評估

**👍 3個好：**
1. **XSS 防護已加** — videoUrl 用 `isSafeUrl()` whitelist `https?://`，防止 `javascript:`/`data:`/`vbscript:` 注入
2. **Invite code 已改用 `crypto.getRandomValues()`** — 唔可以被預測
3. **Firebase Auth 做 authentication** — 唔係自己管密碼，delegated 到 Google，安全性有保障

**👎 3個唔好：**
1. **Firebase config hardcoded 係 client-side** — API key 雖然係 public 設計，但 Project ID / Sender ID 全部 exposed，Firestore rules 係唯一防線，一旦 rules 有漏洞就係大問題
2. **Firestore rules 讀取太鬆** — 任何登入用戶可以讀所有人嘅 schedule、workoutLogs，privacy 問題
3. **Cloud Functions 冇 rate limiting** — `sendNotificationOnMessage` 可被濫用，每條 message 觸發一次 FCM call

**⚠️ 2個有問題：**
1. **`findTrainerByCode(code)` 全表掃描** — 攻擊者可以暴力枚舉所有 invite codes，搵出所有 trainer
2. **Demo 帳戶 `coach@elitepro.com` 係固定密碼 `demo123`** — 任何人都可以登入 demo，如果 rules 有漏洞就可以讀真實數據

---

### [PM 總結] Phase 3 解決方案優先排序

| 優先級 | 問題 | 解決方案 |
|--------|------|----------|
| 🔴 高 | Firestore rules 讀取太鬆 | 收緊 rules：只有本人/trainer 可讀自己數據 |
| 🔴 高 | Exercise Library 冇隔離 | 加 trainerId filter，每個 trainer 獨立 |
| 🔴 高 | Firestore listeners 冇 filter | 加 query filter，只讀相關數據 |
| 🟡 中 | Schedule clientId ownership | Firestore rules 加驗證 |
| 🟡 中 | bodyStats entries array 上限 | 遷移到 subcollection（長遠方案）|
| 🟡 中 | Progress 圖表簡陋 | 換 Recharts，加互動 |
| 🟢 低 | 中文 i18n | 加語言切換 |
| 🟢 低 | PWA icon 優化 | 加真實 logo |

**Phase 3 執行順序：**
1. Firestore rules 收緊（安全問題，優先）
2. Exercise isolation + listener query filter（架構改動，影響其他功能）
3. Schedule ownership validation（安全）
4. Recharts 進度頁（用戶體驗）
5. i18n（如有時間）

---

## 最近 Session 完成嘅工作（2026-04-12 Session 5）

### Blaze Plan 升級後任務（F + A + B）

| # | 任務 | 詳情 |
|---|------|------|
| 1 | GDPR cascaded delete Cloud Function | `onAccountDelete`（onUserDeleted trigger）用 Admin SDK 刪除 messages、workoutLogs、schedule、workoutPlans、exercises；繞過 Firestore rules |
| 2 | CI 加 Functions 自動部署 | GitHub Actions workflow 加 `google-github-actions/auth` + `npx firebase-tools deploy --only functions`；唔需要本機 Firebase CLI |
| 3 | Push Notifications VAPID key 啟動 | `NotificationContext.jsx` 填入正式 VAPID key；FCM token 註冊 + 推播全線啟用 |
| 4 | PWA icons + iOS meta tags | 純 Node.js 生成 icon-192.png / icon-512.png；index.html 加 apple-mobile-web-app 系列 meta tags；iOS Add to Home Screen 體驗完整 |

---

## 最近 Session 完成嘅工作（2026-04-12 Session 4）

### Phase 2 任務（F + A + B）

| # | 任務 | 詳情 |
|---|------|------|
| 1 | Firestore rules：messages read 收緊 | `allow read` 改為只有 sender/recipient（`from == uid \|\| to == uid`）；關閉 F1 漏洞 |
| 2 | Firestore rules：bodyStats read 收緊 | `allow read` 改為 `isOwner(clientId) \|\| isTrainerOf(clientId)`；關閉 F2 漏洞 |
| 3 | Bundle code-splitting（React.lazy） | App.jsx 14 個 pages 全改 lazy import + Suspense；主 bundle 809KB → **258KB**（gzip 238KB → **82KB**） |
| 4 | Invite code 改 `crypto.getRandomValues()` | 取代 `Math.random()`，cryptographically secure；關閉 F5 漏洞 |
| 5 | Schedule delete 功能 | AppContext 加 `deleteScheduleItem()`；SchedulePage 每個 session 加 Trash2 刪除鈕 + confirm modal + deleting state |

---

## 最近 Session 完成嘅工作（2026-04-12 Session 3）

### 即時修 + Phase 2 先行項（F + A + C + D + B）

| # | 任務 | 詳情 |
|---|------|------|
| 1 | XSS：videoUrl scheme 過濾 | `isSafeUrl()` whitelist `https?://`；擋住 `javascript:`/`data:`/`vbscript:` 等；ExerciseLibraryPage + WorkoutPlansPage 兩處 `<a href>` + preview link 全部修正 |
| 2 | Firestore rules：exercises ownership | create 要求 `trainerId == uid`；update/delete 要求 owner 或 legacy（無 `trainerId` field）；`addExercise` 自動寫入 `trainerId: currentUser.id` |
| 3 | `deleteWorkoutPlan` async/await | 補 `await` + try/catch + `deleting` state 防 double-submit（原為 fire-and-forget） |
| 4 | 清 lint errors | 22 errors → **0 errors**, 2 warnings（pre-existing）；修項包括 unused vars、setState-in-effect、fast-refresh、globals、NotificationContext TDZ + ref-in-render |
| 5 | Delete Plan 確認 modal | 新增確認 modal，行為與 Remove Client 一致；Cancel + Delete(disabled on deleting) |
| 6 | Messages scroll-to-bottom | `prevContactRef` 追蹤前一個 contact；contact 切換 → `instant` 跳底；新訊息到達 → `smooth` 捲底；依賴 `contactMessages.length` 觸發 |

---

## 最近 Session 完成嘅工作（2026-04-12 Session 2）

### UI Bug Fixes（D + B）

| # | 問題 | 修復 |
|---|------|------|
| 1 | iOS Safari 滑動體驗差，頁面難以拉到底 | `#root` 改用 `overflow-x: clip`（避免 scroll container BFC）；body 加 `-webkit-overflow-scrolling: touch`；modal 加 `overscroll-behavior: contain` |
| 2 | Trainer 無法移除 Client | AppContext 新增 `removeClient()`（`updateDoc` 設 `trainerId: null`，繞過 Firestore 不能 delete user doc 限制）；ClientDetailPage 加確認 modal + `removing` double-submit 保護 |
| 3 | Exercise Library 連結功能不易發現 | Card 無 URL 時顯示虛線「+ Add Link」按鈕（`btn-add-link` CSS）；點擊開 Edit modal 並 auto-focus URL 欄位（`useRef` + 150ms timeout）；非 YouTube URL 顯示藍色「Open Link」按鈕（`btn-link-ref` CSS）|
| 4 | Workout Plans 頁完全無加連結入口 | 每條 exercise row 顯示「+ Add Link」按鈕（trainer only）；點擊彈出 mini modal 直接儲存；YouTube 顯示紅 Play icon，其他 URL 顯示藍 ExternalLink icon |

### CLAUDE.md 更新（SA + PM）
- 新增 `## Deployment` 詳細說明（CI branch、auto-deploy）
- 新增 `## Git Workflow Rules`（禁止開新 branch、直接 work on CI branch）
- 更新 `## Team Structure` + `## Working Rules`（按指定格式重寫）

---

## 最近 Session 完成嘅工作（2026-04-12 Session 1）

### Step 7：Loading Skeleton / Empty States（D + B）
**新檔案：**
- `src/components/EmptyState.jsx` — 可重用 empty state 組件，支援 icon、title、description、action（Link 或 button）、compact mode、inCard wrapper
- `src/components/Skeleton.jsx` — Skeleton 載入動畫組件（shimmer effect）

**更新咗嘅頁面（10 個）：**
| 頁面 | Empty State Icon | CTA |
|------|-----------------|-----|
| TrainerDashboard | CalendarOff / MailCheck / Users | 各自導航 |
| ClientDashboard | CalendarOff / ClipboardList | Connect Coach |
| ClientsPage | UserPlus | Copy Invite Code |
| ClientDetailPage | UserX / LineChart / ClipboardList / NotebookPen | 對應操作 |
| WorkoutPlansPage | Dumbbell | Create Plan（trainer only）|
| WorkoutLogPage | NotebookPen | 睇 plan 先 |
| MyWorkoutsPage | ClipboardList | Connect Coach |
| ProgressPage | LineChart | Add Measurement |
| ExerciseLibraryPage | SearchX | Clear Filters |

**CSS 新增：**
- `.empty-state` 系列樣式（icon-wrap、compact、action）
- `@keyframes skeleton-shimmer` 動畫
- `.skeleton-line`、`.skeleton-circle`、`.skeleton-card` 樣式

### Step 8：Schedule / Message 寫操作審計（A + E）
**發現並修復 5 個問題：**

| # | Bug | 位置 | 修復方式 |
|---|-----|------|---------|
| 1 | Fire-and-forget write — 成功 toast 喺 Firestore 失敗時都會出 | SchedulePage `handleAdd` | 改用 async/await + try/catch |
| 2 | 冇 double-submit 保護 — 用戶快速撳兩次可以 book 兩個 session | SchedulePage | 加 `saving` state + button disabled |
| 3 | Client 冇 trainer 可以開 booking form → `trainerId: undefined` 寫入 Firestore | SchedulePage | Form guard + header button disabled |
| 4 | Fire-and-forget message send — 同上問題 | MessagesPage `handleSend` | async/await + `sending` state |
| 5 | `markMessagesRead` 喺 useEffect 入面可能 unhandled rejection | MessagesPage useEffect | `Promise.resolve(...).catch(() => {})` |

---

## 全員會議紀錄（2026-04-12）

> 針對 app 所有面向嘅全隊狀況匯報，共 6 名員工 + PM 參與。

### [員工A - SA] 系統架構

| 項目 | 狀況 | 備註 |
|------|------|------|
| Firestore 7 collections + onSnapshot | ✅ 穩健 | AppContext 係唯一入口，冇頁面直接碰 `db` |
| Collection 監聽冇 query filter | ⚠️ 風險 | 監聽整個 collection，所有資料落晒 client 記憶體，scale 後係瓶頸 |
| Exercises 所有 trainer 共享 | ⚠️ 設計缺陷 | A trainer 改動作名，B trainer 都受影響 |
| `markLoaded` 靜默失敗處理 | ℹ️ 可接受 | 失敗當 loaded，user 唔知成功定失敗，但防止 stuck loading |
| `Date.now()` ID collision | ℹ️ 極低風險 | 同一毫秒兩個寫操作理論上會 collision |

整體評級：**B+**，可以上線，規模化前需要 query-level filtering。

---

### [員工B - Dev] 程式碼實作

**Build 狀況：**
```
JS bundle：807 KB（gzip 238 KB）  ⚠️ 超標（Vite 警告 >500KB）
CSS：        42 KB（gzip   8 KB）  ✅ 正常
Build time： 1.81s                  ✅
```

14 頁面全部 eager-loaded，冇任何 `React.lazy`。

**發現問題：**
- `WorkoutPlansPage.jsx:280` — `deleteWorkoutPlan(p.id)` **fire-and-forget**，冇 `await`，冇 `try/catch`，toast 無論成功定失敗都出（Phase 1 Step 8 審計漏咗）
- `useRef` + 150ms auto-focus 係 workaround，modal CSS transition 超過 150ms 就會 fail

---

### [員工C - Reviewer] Code Review

**Lint 現狀：22 errors，2 warnings**（預計 30 分鐘可全部清）

| 嚴重度 | 位置 | 問題 |
|--------|------|------|
| Medium | `WorkoutPlansPage.jsx:280` | `deleteWorkoutPlan` fire-and-forget |
| Low | `ClientDetailPage.jsx:270` | `j` unused variable |
| Low | `WorkoutLogPage.jsx:178,186` | `exercise` + `j` unused variables |
| Low | `RoleSelectPage.jsx:23` | `err` unused in catch block |
| Low | `vite.config.js:7` | `process` not defined（加 `/* eslint-env node */` 即修）|
| Info | `ThemeContext` / `ToastContext` | Fast-refresh warning（export non-component）|
| Info | `NotificationContext` | Fast-refresh + immutability warnings |
| Info | `AppContext` | setState-in-effect warning（currentUser sync）|

---

### [員工D - UI/UX] 介面體驗

**已完成：** iOS scroll 修復、empty states、skeleton、+ Add Link 兩個頁面一致

**待改善：**
| 優先 | 問題 |
|------|------|
| 高 | Delete Plan 冇確認 modal（Remove Client 有，行為不一致，易誤刪）|
| 高 | Messages 頁冇 scroll-to-bottom（新訊息唔會自動捲落底）|
| 中 | ClientDetailPage tab 切換冇 loading indicator |
| 中 | Mobile Plan Builder modal 太長，需要大量滑動 |
| 低 | 進度頁純 CSS/SVG 圖表，視覺質素可以更好 |

---

### [員工E - QA] 測試與合規

**本 Session 已驗證：**
- ✅ iOS scroll 修復
- ✅ Remove Client → confirmation → orphan → navigate
- ✅ Exercise Library + Add Link → auto-focus
- ✅ Workout Plans + Add Link → updateExercise

**未測試 / 風險：**
| 優先 | 問題 |
|------|------|
| 高 | GDPR `deleteAccount` 不完整 — `messages`、`workoutLogs`、`schedule` 殘留（rules 禁刪）|
| 高 | Demo `resetData` 同樣問題 — logs + messages 刪唔到，reset 後殘留舊資料 |
| 中 | 真實 multi-user test 未做（兩個 trainer 同時用 exercise 共享）|
| 中 | 238KB gzip，3G 網絡約需 3-4 秒首次載入 |

合規評級：**符合基本要求，GDPR delete 係唯一未解決嘅合規缺口。**

---

### [員工F - Security] 滲透測試

**🔴 高風險（需即時修）**

| # | 漏洞 | 位置 | 攻擊方式 |
|---|------|------|---------|
| F1 | 任何登入用戶可讀取**所有人私訊** | `firestore.rules` messages read | `getDocs(collection(db, 'messages'))` dump 全部對話 |
| F2 | 任何登入用戶可讀取**所有人體測數據** | `firestore.rules` bodyStats read | 體重、體脂、三圍全部外洩 |
| F3 | **XSS via `javascript:` URL** | `ExerciseLibraryPage`、`WorkoutPlansPage` videoUrl href | 輸入 `javascript:alert(1)` 做 videoUrl，trainer/client 點擊即執行 |

**🟡 中風險**

| # | 漏洞 | 位置 | 說明 |
|---|------|------|------|
| F4 | **Exercise 冇 ownership check** | `firestore.rules` exercises update/delete | 任何 trainer 可改刪其他 trainer 嘅整個動作庫 |
| F5 | Invite code 用 `Math.random()` | `AppContext.jsx generateInviteCode()` | 非 cryptographically secure，Firestore 冇 rate limiting，理論上可暴力破解 |
| F6 | Schedule `clientId` 冇驗證係 trainer 自己嘅 client | `firestore.rules` schedule create | 任何 trainer 可將任何用戶加入自己日程表 |

**🟢 低風險 / 設計限制**

| # | 說明 |
|---|------|
| F7 | Firebase config hardcoded public key — 正常設計，配合 Firestore rules 可接受 |
| F8 | Demo `coach@elitepro.com` / `demo123` 係已知帳號，任何人可用 demo coach 登入 |

---

### [PM 總結] 行動優先級

**即時修（下次 session）：**
| # | 問題 | 負責 |
|---|------|------|
| 1 | XSS：videoUrl 加 `javascript:` scheme 過濾 | F + B |
| 2 | Firestore rules：exercises 加 ownership check | F + A |
| 3 | `deleteWorkoutPlan` 補 async/await + try/catch | C + B |
| 4 | 清 22 個 lint errors | C + B |
| 5 | Delete Plan 加確認 modal | D + B |

**Phase 2 新增項目：**
| # | 問題 | 負責 |
|---|------|------|
| 6 | Firestore rules：messages / bodyStats read 收緊至 owner + trainer only | F + A |
| 7 | Bundle code-splitting（React.lazy per page）| B |
| 8 | Messages scroll-to-bottom | D + B |
| 9 | GDPR cascaded delete via Cloud Functions | E + B |
| 10 | Invite code 改用 `crypto.getRandomValues()` | F + B |

**Phase 3 新增項目：**
| # | 問題 |
|---|------|
| 11 | Exercises per-trainer 隔離 |
| 12 | Collection listeners 加 query filter（限制讀取量）|
| 13 | Schedule clientId ownership validation |

---

## 已知問題 / 遺留事項

### 🔴 安全（會議後新增）
1. **XSS via javascript: URL** — videoUrl input 冇 scheme 驗證，`<a href>` 可執行任意 JS
2. **Messages + bodyStats 任何登入用戶可讀** — Firestore rules `allow read: if isAuth()` 過於寬鬆
3. **Exercise 冇 ownership check** — 任何 trainer 可改刪其他 trainer 嘅動作

### 嚴重
4. **Bundle size 過大**（807KB / gzip 238KB）— Vite 已警告，首次載入慢
   - 建議：React.lazy code-splitting per page
5. **Firebase Service Account secret 未確認**
   - 需要用戶去 Firebase Console 生成 + 加入 GitHub Secrets (`FIREBASE_SERVICE_ACCOUNT`)
   - 未確認 GitHub Actions 首次部署是否成功
6. **Firestore Rules 未經 production 真機驗證**
   - Rules 寫好但需要真實 multi-user test 確認權限正確

### 中度
7. **Push Notifications 未完成部署**（代碼已寫好，需要以下步驟）
   - 升級 Firebase 到 Blaze plan（需綁 credit card，免費 quota 內唔收費）
   - 從 Firebase Console 攞 VAPID key → 貼入 `src/context/NotificationContext.jsx`
   - 執行 `firebase deploy --only functions` 部署 Cloud Functions
   - 需要生成正式 PNG icons（192x192、512x512）替代 manifest.json placeholder
8. **GDPR deleteAccount 不完整** — messages / workoutLogs / schedule 殘留（rules 禁刪），需要 Cloud Functions cascaded delete
9. **iOS Safari Google Sign-In 未做真機 full regression**
10. **Schedule 時間衝突檢查**只係本地比較，multi-device 可能 race condition
11. **Delete Plan 冇確認 modal** — 容易誤刪，與 Remove Client 行為不一致
12. **Messages 頁冇 scroll-to-bottom** — 新訊息唔會自動捲落底

### 輕微 / Nice-to-have
13. 無 i18n — 純英文 UI（主要用戶係廣東話）
14. 進度頁圖表純 CSS/SVG — 可以用 Recharts 美化
15. 舊 sample data 用 `rest` field，新 plan 用 `weight` — 混合 data 可能喺 display 上出現空白
16. Invite code 用 `Math.random()`（非 cryptographically secure）
17. Schedule create 冇驗證 clientId 係 trainer 自己嘅 client

### Pre-existing Lint Errors（22 errors, 2 warnings）
- `WorkoutPlansPage.jsx:280`：`deleteWorkoutPlan` fire-and-forget（**新發現**）
- `ClientDetailPage.jsx:270`：unused `j` variable
- `WorkoutLogPage.jsx:178,186`：unused `exercise` + `j`
- `RoleSelectPage.jsx:23`：unused `err`
- `vite.config.js:7`：`process` not defined（加 `/* eslint-env node */` 即修）
- `context/AppContext.jsx`：setState-in-effect warnings
- `context/NotificationContext.jsx`：fast-refresh warnings
- `context/ThemeContext.jsx` / `ToastContext.jsx`：fast-refresh warnings

---

## 重要決定紀錄

| 日期 | 決定 | 原因 |
|------|------|------|
| 2026-04-09 | Firestore Rules 用 pragmatic model（authed read all） | 簡單 fitness app 唔需要 row-level read security |
| 2026-04-09 | workoutLogs + messages 禁止 delete | 保護訓練紀錄完整性 |
| 2026-04-10 | Per-set weight 取代 per-exercise weight | 用戶需要逐 set 記錄唔同重量（e.g. pyramids） |
| 2026-04-12 | EmptyState 做成通用組件而非每頁 inline | 10 個頁面共用，減少重複代碼 |
| 2026-04-12 | 所有寫操作必須 await + try/catch | Fire-and-forget 會導致錯誤 toast 誤導用戶 |
| 2026-04-12 | Phase 1 做完先諗 Blaze upgrade | 用戶明確指示：「做哂 phase 1 野先再諗 blaze」 |

---

## 開發階段 Roadmap

### Phase 1 — 上線前必做 ✅ 全部完成
| # | 任務 | 狀態 | 負責 |
|---|------|------|------|
| 1 | Firestore Rules + code alignment | ✅ 完成 | C + B |
| 2 | Demo 帳號改用 Firebase Auth | ✅ 完成 | B |
| 3 | Delete Account (GDPR) | ✅ 完成 | B + D |
| 4 | Forgot Password 流程 | ✅ 完成 | B + D |
| 5 | Merge 其他 session 嘅 bug fixes | ✅ 完成 | C |
| 6 | Plan exercises 改用 weight(kg) | ✅ 完成 | B |
| 7 | Loading skeleton / empty states | ✅ 完成 | D + B |
| 8 | 全 app 寫操作 re-audit | ✅ 完成 | A + E |

### 即時修（會議後新增）⚡
| # | 任務 | 狀態 | 負責 |
|---|------|------|------|
| 1 | XSS：videoUrl whitelist `https?://` scheme | ✅ 完成 | F + B |
| 2 | Firestore rules：exercises 加 trainer ownership check | ✅ 完成 | F + A |
| 3 | `deleteWorkoutPlan` 補 async/await + try/catch | ✅ 完成 | C + B |
| 4 | 清 22 個 lint errors | ✅ 完成（0 errors, 2 warnings） | C + B |
| 5 | Delete Plan 加確認 modal | ✅ 完成 | D + B |

### Phase 2 — 品質提升
| # | 任務 | 狀態 | 負責 |
|---|------|------|------|
| 1 | Firestore rules：messages / bodyStats read 收緊 | ✅ 完成 | F + A |
| 2 | Bundle code-splitting（React.lazy per page）| ✅ 完成 | B |
| 3 | Messages scroll-to-bottom | ✅ 完成 | D + B |
| 4 | GDPR cascaded delete via Cloud Functions | ✅ 完成 | E + B |
| 5 | Invite code 改用 `crypto.getRandomValues()` | ✅ 完成 | F + B |
| 6 | 真機 QA：iPhone Safari + Android Chrome | ⏸️ 需真機 | E |
| 7 | Push notifications 完成部署（Blaze + VAPID + Functions deploy）| ✅ 完成 | B |
| 8 | Schedule delete 功能 | ✅ 完成 | B |

### Phase 3 — 加分項
| # | 任務 | 狀態 |
|---|------|------|
| 1 | Exercise Library per-trainer 隔離 | 未開始 |
| 2 | Collection listeners 加 query filter（限制讀取量）| 未開始 |
| 3 | Schedule clientId ownership validation | 未開始 |
| 4 | PWA icons 正式版（192 + 512 PNG）| 未開始 |
| 5 | Recharts 美化進度頁 | 未開始 |
| 6 | 中文 / 廣東話 i18n | 未開始 |

---

## 技術架構摘要

```
Frontend: React 19 + Vite 8 + React Router v7 (HashRouter)
Backend:  Firebase Firestore (real-time) + Firebase Auth
Notify:   FCM + Cloud Functions (code ready, not deployed)
Styling:  Custom CSS + CSS Variables (light/dark theme)
Hosting:  Firebase Hosting (primary) / GitHub Pages (alt)
CI/CD:    GitHub Actions (auto-deploy on push)
Offline:  IndexedDB persistence via Firebase SDK
```

### 檔案架構（最新）
```
src/
├── components/
│   ├── EmptyState.jsx       # ⭐ 通用空狀態組件（icon + CTA）
│   ├── Skeleton.jsx         # ⭐ 載入骨架動畫組件
│   ├── NotesSection.jsx     # Client notes section
│   ├── ErrorBoundary.jsx    # React class error boundary
│   ├── GlobalSearch.jsx     # Search bar
│   └── Navigation.jsx       # Sidebar + header + bottom nav
├── context/
│   ├── AppContext.jsx        # Global state + Firestore ops
│   ├── NotificationContext.jsx # ⭐ FCM push notification（待部署）
│   ├── ThemeContext.jsx      # Light/dark theme
│   └── ToastContext.jsx      # Toast notifications
├── data/
│   ├── exercises.js
│   └── sampleData.js
├── pages/                    # 14 pages（全部有 empty states）
├── styles/
│   └── index.css             # 含 skeleton shimmer + empty state 樣式
├── firebase.js
├── App.jsx
└── main.jsx

functions/                    # ⭐ Cloud Functions（待部署到 Blaze）
├── index.js                  # sendNotificationOnMessage + sendNotificationOnSchedule
└── package.json

public/
├── firebase-messaging-sw.js  # ⭐ FCM Service Worker
└── manifest.json             # ⭐ PWA manifest（需要正式 icons）
```

### Firestore Collections
| Collection | Doc ID | 用途 |
|---|---|---|
| users | Firebase Auth UID | 用戶 profile（trainer / client）|
| bodyStats | clientId | 體重、體脂、圍度紀錄 |
| workoutPlans | plan-{timestamp} | 訓練計劃模板 |
| workoutLogs | log-{timestamp} | 訓練紀錄（不可刪除）|
| schedule | sched-{timestamp} | 預約時間表 |
| messages | msg-{timestamp} | 對話訊息（不可刪除）|
| exercises | exercise ID | 動作庫 |

### Git Commit History（最近）
```
0cbc2cc docs: update PROGRESS.md for Session 2 (2026-04-12)
b563cf5 docs: add Employee F (Security) to Team Structure in CLAUDE.md
d866fd8 docs: update CLAUDE.md Team Structure & Working Rules sections
d35dcd3 feat: Add "+ Add Link" button to exercises in Workout Plans view
2cf9804 feat: Exercise Library — add link discoverability + non-YouTube URL support
[prev]  fix: remove client feature + iOS scroll fix + CLAUDE.md deployment rules
012ab02 feat: empty states with icons + schedule/message write audit fixes
36f8190 feat: push notifications via FCM + Cloud Functions
f83b6b2 refactor: per-set UX redesign with +New Set button
c5a4316 feat: per-set weight support for workout plans
6553d69 fix: 5 audit issues — async/await, CSS vars, race condition, error handling
5857d6e docs: add PROGRESS.md tracking development status and roadmap
```

### 團隊分工
| 代號 | 職責 |
|------|------|
| PM | 帶領團隊、排優先、最終決策 |
| A - SA | 系統分析、資料庫設計、功能流程 |
| B - Dev | 核心開發、API 串接 |
| C - Reviewer | Code Review、Bug 檢查、安全性 |
| D - UI/UX | 介面設計、配色、用戶體驗 |
| E - QA | 測試、Bug 報告、合規（GDPR 等）|
| F - Security | 滲透測試、漏洞審查、認證機制、資料保護（paranoid hacker 思維）|
