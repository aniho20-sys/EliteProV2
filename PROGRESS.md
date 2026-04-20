# ElitePro 開發進度紀錄

> 最後更新：2026-04-20（Session 17）

---

## 🎯 產品策略：打敗 Hevy Coach

ElitePro 定位係「**完整 PT business 管理工具**」，唔只係 workout programming。

### 差異化優勢（ElitePro 獨有）
- 預約 + 堂數系統（Hevy Coach 冇）
- Working hours 設定（Hevy Coach 冇）
- Body stats 完整管理 + Coach/Self 標記
- 收費 / Invoice 管理（未做，機會）

### 主要競品
| 功能 | Hevy Coach | ElitePro |
|------|-----------|---------|
| Workout programming | ✅ | ✅ |
| Client progress charts | ✅ | ✅ |
| Messaging | ✅ | ✅ |
| Session booking | ❌ | ✅ |
| 堂數管理 | ❌ | ✅ |
| Working hours | ❌ | ✅ |
| Built-in exercise GIFs | ✅ | ❌ URL only |
| 收費 / Invoice | ❌ | ❌ 未做 |
| Native mobile app | ✅ | ⚠️ PWA only |
| 收費 | $20–40/月 | TBD |

---

## ✅ 已完成功能概覽

### Core Platform
- React 19 + Vite 8 SPA（HashRouter）、Trainer / Client 雙角色
- Trainer Dashboard（stats + weekly chart + client activity，stat cards 可點擊）
- Client Dashboard（stats + sessions quota card + Book Session CTA）
- Client 管理（搜尋、detail view、Remove Client）
- Workout Plan Builder（drag reorder、duplicate、custom exercises、exercise 搜尋、按 client 分組 + 可摺疊）
- Workout Log（auto-fill last session、PR tracking、Start Workout 一鍵入口from MyWorkoutsPage）
- Schedule 日曆（conflict check、booking、教練自訂營業時間、**Mark Complete 堂數追蹤**）
- In-app Messaging（unread badges、real-time sync、scroll-to-bottom）
- Exercise Library（search、filter、YouTube + URL links、+ Add Link 快速入口）
- Body Stats / Progress（Recharts AreaChart、metric tiles、趨勢指示、Coach/Self 標記、**edit measurement**）
- ProgressView 通用組件（clientId + canDelete + onEdit props）
- Profile（edit、invite code、shareable link、working hours、connect to trainer）
- Global Search（clients、plans、exercises）
- EmptyState + Skeleton 通用組件（全頁面覆蓋，CTA 導向清晰）
- Toast notifications、Error Boundary
- 互動人體肌肉模型（SVG 正面 + 背面）

### Firebase Backend
- Firestore real-time sync（7 collections，onSnapshot + query filter）
- IndexedDB offline persistence
- Firebase Auth：Google Sign-In（iOS Safari redirect fallback）、Email/Password、Forgot Password
- Demo Coach（auto seed ghost clients）
- Trainer-Client 邀請碼系統（6-char、shareable link、auto-fill on signup）
- Delete Account（GDPR，Cloud Function cascaded delete）
- Firestore Security Rules（per-doc ownership、trainerId isolation、schedule ownership）
- Firebase Auth 錯誤訊息 friendly 化
- bodyStats subcollection（取代 array，避免 1MB 上限）

### Push Notifications & PWA
- FCM push notifications（NotificationContext + Cloud Functions + Service Worker）
- Firebase Blaze plan 已升級
- PWA manifest + icons（192 + 512 PNG）、iOS Add to Home Screen meta tags

### DevOps
- Firebase Hosting + GitHub Actions CI（push to `claude/fitness-app-features-LbxtG` 自動部署）
- Cloud Functions 自動部署

---

## 🔴 重要技術決定紀錄

| 決定 | 原因 |
|------|------|
| `workoutLogs` + `messages` 禁止 delete | 保護訓練紀錄完整性；GDPR delete 靠 Cloud Function Admin SDK 繞過 |
| bodyStats 改 subcollection | 舊 array 結構有 1MB Firestore doc 上限風險 |
| HashRouter | Firebase Hosting SPA 需要，唔可改 BrowserRouter |
| `Date.now()` IDs | 簡單，低並發下碰撞風險極低；將來可換 `crypto.randomUUID()` |
| `markLoaded` count = 7 | 新增 collection listener 時記得更新此數字 |
| Demo data 用 trainerId prefix | 多個 demo 用戶間資料隔離 |
| Session 完成狀態 | `getSessionStats()` 只 count `status === 'completed'`，Trainer 需手動 Mark Complete |
| Exercise Library 靜態 defaults | 唔入 Firestore，避免跨 trainer 污染；每個 trainer 有獨立 custom exercises |

---

## ⚠️ 待議事項

| 議題 | 狀態 | 摘要 |
|------|------|------|
| **學生改期次數限制** | 🟡 擱置 | Cancel-rebook 漏洞令次數限制無效；時間限制（24hr截止）更合理；待真實用戶反饋。備選：距 session 24hr 前截止改期（前端 check）|

---

## 📋 Roadmap

### Phase 3 — 架構加固（未開始）
| # | 任務 | 類型 |
|---|------|------|
| 1 | Exercise Library per-trainer Firestore 隔離 | 架構 |
| 2 | Collection listeners 加 query filter（限制讀取量） | 效能 |
| 3 | Timezone bug 修復（跨時區預約） | Bug |
| 4 | Firebase App Check（防 abuse） | 安全 |

### 差異化新功能
| 優先 | 功能 | 說明 |
|------|------|------|
| 🔴 高 | **Rest Timer** | 訓練必備，Hevy 強項 |
| 🔴 高 | **收費 / Invoice 管理** | Hevy Coach 完全冇，教練最大痛點 |
| 🟡 中 | **Volume analytics** | 週訓練量圖表 |
| 🟡 中 | **Client onboarding（PAR-Q）** | 專業教練流程 |
| 🟢 低 | **Workout calendar heatmap** | Consistency 可視化 |

### 全球推廣前置
| 優先 | 任務 |
|------|------|
| 🔴 必做 | Privacy Policy + Terms of Service |
| 🔴 必做 | Landing page（獨立網址） |
| 🔴 必做 | GA4 / Firebase Analytics 整合 |
| 🟡 | Product Hunt 準備 |
| 🟢 | Stripe 收費整合 |
| 🟢 | App Store 上架（Capacitor） |
