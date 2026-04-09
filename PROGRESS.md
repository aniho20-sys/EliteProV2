# ElitePro 開發進度紀錄

> 最後更新：2026-04-09

---

## 已完成功能

### Core Platform
- [x] React 19 + Vite 8 SPA（HashRouter）
- [x] Trainer / Client 雙角色系統
- [x] Trainer Dashboard（stats overview + weekly sessions chart + client activity）
- [x] Client Dashboard（workout summary + body stats）
- [x] Client 管理頁（搜尋、detail view、body stats、plans、logs）
- [x] Workout Plan Builder（drag reorder、duplicate、custom exercises）
- [x] Workout Log（auto-fill last session、PR tracking）
- [x] Schedule 日曆（date picker、conflict check、booking）
- [x] In-app Messaging（unread badges、real-time sync）
- [x] Exercise Library（search、filter by muscle/equipment、video links）
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

### UI/UX
- [x] Light / Dark 主題（CSS variables、localStorage persist）
- [x] 全 responsive（desktop sidebar + mobile bottom nav）
- [x] Custom Exercise 建立（inline quick-add + structured form with muscle groups）
- [x] Plan exercises 顯示 Sets x Reps + Weight(kg)

### DevOps
- [x] Firebase Hosting config（`firebase.json`、`.firebaserc`）
- [x] GitHub Actions — Firebase Hosting 自動部署
- [x] GitHub Actions — GitHub Pages 部署
- [x] Vite base path 切換（`DEPLOY_TARGET=gh-pages`）

---

## 已知問題 / 未解決

### 嚴重
1. **Bundle size 過大**（~760KB gzip ~225KB）— Vite 已警告，首次載入慢
   - 建議：React.lazy code-splitting per page
2. **Firebase Service Account secret 未確認**
   - 需要用戶去 Firebase Console 生成 + 加入 GitHub Secrets (`FIREBASE_SERVICE_ACCOUNT`)
   - 未確認 GitHub Actions 首次部署是否成功
3. **Firestore Rules 未經 production 真機驗證**
   - Rules 寫好但需要真實 multi-user test 確認權限正確

### 中度
4. **Loading skeleton / empty state 未做**
   - Firestore 首次 load 時用戶見到空白，唔知係 loading 定係冇 data
5. **Messages 未有即時通知提示**
   - Firestore listener 已有 real-time，但缺 sound / tab title 閃爍
6. **iOS Safari Google Sign-In 未做真機 full regression**
7. **Schedule 時間衝突檢查**只係本地比較，multi-device 可能 race condition
8. **Exercise Library 權限**
   - 所有 trainer 共享同一個 exercise collection，互相可以改刪

### 輕微 / Nice-to-have
9. 無 PWA manifest / offline icon — 裝上 iPhone home screen 會冇 icon
10. 無 i18n — 純英文 UI（主要用戶係廣東話）
11. 進度頁圖表純 CSS/SVG — 可以用 Recharts 美化
12. 舊 sample data 用 `rest` field，新 plan 用 `weight` — 混合 data 可能喺 display 上出現空白

---

## 開發階段 Roadmap

### Phase 1 — 上線前必做（進行中）
| # | 任務 | 狀態 | 負責 |
|---|------|------|------|
| 1 | Firestore Rules + code alignment | ✅ 完成 | C + B |
| 2 | Demo 帳號改用 Firebase Auth | ✅ 完成 | B |
| 3 | Delete Account (GDPR) | ✅ 完成 | B + D |
| 4 | Forgot Password 流程 | ✅ 完成 | B + D |
| 5 | Merge 其他 session 嘅 bug fixes | ✅ 完成 | C |
| 6 | Plan exercises 改用 weight(kg) | ✅ 完成 | B |
| 7 | Loading skeleton / empty states | 未開始 | D + B |
| 8 | 全 app 寫操作 re-audit | 未開始 | A + E |

### Phase 2 — 品質提升
| # | 任務 | 狀態 |
|---|------|------|
| 1 | Bundle code-splitting（React.lazy per page）| 未開始 |
| 2 | 真機 QA：iPhone Safari + Android Chrome | 未開始 |
| 3 | Messages 即時通知（sound / tab flash）| 未開始 |
| 4 | Schedule delete 功能 | 未開始 |

### Phase 3 — 加分項
| # | 任務 | 狀態 |
|---|------|------|
| 1 | PWA manifest + icons | 未開始 |
| 2 | Recharts 美化進度頁 | 未開始 |
| 3 | 中文 / 廣東話 i18n | 未開始 |
| 4 | Push notifications | 未開始 |

---

## 技術架構摘要

```
Frontend: React 19 + Vite 8 + React Router v7 (HashRouter)
Backend:  Firebase Firestore (real-time) + Firebase Auth
Styling:  Custom CSS + CSS Variables (light/dark theme)
Hosting:  Firebase Hosting (primary) / GitHub Pages (alt)
CI/CD:    GitHub Actions (auto-deploy on push)
Offline:  IndexedDB persistence via Firebase SDK
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

### 團隊分工
| 代號 | 職責 |
|------|------|
| PM | 帶領團隊、排優先、最終決策 |
| A - SA | 系統分析、資料庫設計、功能流程 |
| B - Dev | 核心開發、API 串接 |
| C - Reviewer | Code Review、Bug 檢查、安全性 |
| D - UI/UX | 介面設計、配色、用戶體驗 |
| E - QA | 測試、Bug 報告、合規（GDPR 等）|
