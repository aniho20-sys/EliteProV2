# ElitePro 開發進度紀錄

> 最後更新：2026-04-12（Session 2）

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

### Push Notifications 基礎建設（已寫好，未部署）
- [x] `NotificationContext.jsx`：FCM token 管理 + 前景訊息處理
- [x] `functions/index.js`：Cloud Functions（sendNotificationOnMessage、sendNotificationOnSchedule）
- [x] `public/firebase-messaging-sw.js`：Service Worker 處理背景通知
- [x] `public/manifest.json`：PWA manifest 基礎結構
- [x] `firebase.json`：Functions config 已加入

### DevOps
- [x] Firebase Hosting config（`firebase.json`、`.firebaserc`）
- [x] GitHub Actions — Firebase Hosting 自動部署
- [x] GitHub Actions — GitHub Pages 部署
- [x] Vite base path 切換（`DEPLOY_TARGET=gh-pages`）

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

## 已知問題 / 遺留事項

### 嚴重
1. **Bundle size 過大**（~760KB gzip ~225KB）— Vite 已警告，首次載入慢
   - 建議：React.lazy code-splitting per page
2. **Firebase Service Account secret 未確認**
   - 需要用戶去 Firebase Console 生成 + 加入 GitHub Secrets (`FIREBASE_SERVICE_ACCOUNT`)
   - 未確認 GitHub Actions 首次部署是否成功
3. **Firestore Rules 未經 production 真機驗證**
   - Rules 寫好但需要真實 multi-user test 確認權限正確

### 中度
4. **Push Notifications 未完成部署**（代碼已寫好，需要以下步驟）
   - 升級 Firebase 到 Blaze plan（需綁 credit card，免費 quota 內唔收費）
   - 從 Firebase Console 攞 VAPID key → 貼入 `src/context/NotificationContext.jsx`
   - 執行 `firebase deploy --only functions` 部署 Cloud Functions
   - 需要生成正式 PNG icons（192x192、512x512）替代 manifest.json placeholder
5. **iOS Safari Google Sign-In 未做真機 full regression**
6. **Schedule 時間衝突檢查**只係本地比較，multi-device 可能 race condition
7. **Exercise Library 權限**
   - 所有 trainer 共享同一個 exercise collection，互相可以改刪

### 輕微 / Nice-to-have
8. 無 i18n — 純英文 UI（主要用戶係廣東話）
9. 進度頁圖表純 CSS/SVG — 可以用 Recharts 美化
10. 舊 sample data 用 `rest` field，新 plan 用 `weight` — 混合 data 可能喺 display 上出現空白

### Pre-existing Lint Errors（22 errors, 3 warnings — 非本次引入）
- `functions/index.js`：require/exports 未定義（需要 eslint CommonJS config）
- `context/AppContext.jsx`：setState-in-effect warnings
- `context/NotificationContext.jsx`：fast-refresh warnings
- `pages/ClientDetailPage.jsx:248`：unused `j` variable

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

### Phase 2 — 品質提升
| # | 任務 | 狀態 |
|---|------|------|
| 1 | Bundle code-splitting（React.lazy per page）| 未開始 |
| 2 | 真機 QA：iPhone Safari + Android Chrome | 未開始 |
| 3 | Push notifications 完成部署（Blaze + VAPID + Functions deploy）| 未開始 |
| 4 | Schedule delete 功能 | 未開始 |
| 5 | Fix pre-existing lint errors（22 errors）| 未開始 |

### Phase 3 — 加分項
| # | 任務 | 狀態 |
|---|------|------|
| 1 | PWA icons 正式版（192 + 512 PNG）| 未開始 |
| 2 | Recharts 美化進度頁 | 未開始 |
| 3 | 中文 / 廣東話 i18n | 未開始 |
| 4 | Exercise Library per-trainer 隔離 | 未開始 |

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
