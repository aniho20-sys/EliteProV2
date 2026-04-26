# ElitePro 開發進度紀錄

> 最後更新：2026-04-26（Session 22）

---

## 🎯 產品策略

ElitePro 定位係「**完整 PT business 管理工具**」，唔只係 workout programming。

### 競品對比
| 功能 | Hevy Coach | ElitePro |
|------|-----------|---------|
| Workout programming | ✅ | ✅ |
| Client progress charts | ✅ | ✅ |
| Messaging | ✅ | ✅ |
| Rest Timer | ✅ | ✅ |
| Plan Templates | ❌ | ✅ |
| Session booking | ❌ | ✅ |
| 堂數管理 | ❌ | ✅ |
| Working hours | ❌ | ✅ |
| 收費 / Invoice | ❌ | ✅ Phase 1 |
| Workout Log 編輯 | ❌ | ✅ |
| Built-in exercise GIFs | ✅ | ❌ URL only |
| Native mobile app | ✅ | ⚠️ PWA only |

---

## ✅ 已完成功能

- React 19 + Vite 8 SPA（HashRouter）、Trainer / Client 雙角色
- Trainer Dashboard（stats + weekly chart + client activity）
- Client Dashboard（stats + sessions quota + Book Session CTA + 下次預約）
- Client 管理（搜尋、detail view、Remove Client）
- Workout Plan Builder（drag reorder、duplicate、custom exercises、exercise 搜尋、按 client 分組）
- **Plan Templates**（Save as Template、Templates section、Load from Template dropdown）
- Workout Log（auto-fill last session、PR tracking、skipped exercise display）
- **Workout Log 編輯**（學生可 edit 自己嘅歷史 log；教練可 edit 自己建立嘅 PT session logs；`createdBy` 欄位防止權限提升）
- **Rest Timer**（sticky bar、5個預設、Web Audio 響鈴、震動、pause/resume/reset）
- Schedule 日曆（conflict check、booking、working hours、Mark Complete 堂數追蹤）
- In-app Messaging（unread badges、real-time sync）
- Exercise Library（search、filter、YouTube + URL links）
- Body Stats / Progress（Recharts AreaChart、metric tiles、趨勢指示、edit measurement）
- Profile（edit、invite code、shareable link、working hours、connect to trainer）
- Global Search、EmptyState、Skeleton、Toast、Error Boundary
- **互動人體肌肉模型**（`react-body-highlighter` MIT 套件，正面 + 背面並排，灰色預設 / 藍色選中）
- Firebase Auth（Google、Email/Password、Forgot Password、Demo Coach）
- Firestore real-time sync（8 collections）、IndexedDB offline persistence
- FCM push notifications（code ready，待 VAPID key 啟動）
- PWA manifest + iOS Add to Home Screen
- Firebase Hosting + GitHub Actions CI（push to `claude/fitness-app-features-LbxtG` 自動部署 Hosting + Firestore Rules）
- **Invoice 收費管理 Phase 1**（生成 invoice、Unpaid/Paid/Overdue 狀態、Print/PDF export、逾期自動標記）
- **Trainer 全客戶進度概覽頁**（weight sparkline、last workout、next session、sessions quota、4種排序）
- **Client 標籤/分組**（自訂 labels、filter chips）
- **Plan Builder mobile ↑↓ 按鈕**（mobile 用 ↑↓ 取代 drag handle）
- **架構加固**：users listener 範圍限制、Timezone bug 修復（dateUtils.js）、GitHub Pages workflow 移除
- **Mobile More 抽屜**（底部導航 4個主要 tab + More slide-up sheet，包含 Invoices、Progress Overview、Plans、Exercises、Profile、Log Out）

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| `workoutLogs` + `messages` 禁止 delete | 保護訓練紀錄完整性；GDPR delete 靠 Cloud Function Admin SDK |
| `workoutLogs` 用 `createdBy` 做 edit 權限判斷 | `trainerId` 係 record-keeping 用途（client log 亦有 trainer UID），唔能用作權限判斷；`createdBy` 明確記錄建立者 |
| bodyStats 改 subcollection | 避免 1MB Firestore doc 上限 |
| HashRouter | Firebase Hosting SPA 需要 |
| `Date.now()` IDs | 低並發下足夠；將來可換 `crypto.randomUUID()` |
| templates 獨立 collection | trainer-scoped，client 無法存取 |
| Rest Timer 純前端 | Web Audio API + Vibration API，冇 backend 需求 |
| Exercise Library 靜態 defaults | 避免跨 trainer 污染 |
| Mobile nav 4 + More drawer | 底部 tab 上限 5 無法容納 8 個 trainer 頁面；More sheet 參考 Instagram 模式，UI/UX 優先 |
| CI 同時 deploy Hosting + Firestore Rules | 避免 rules 同 code 脫節；手機亦唔需要手動 deploy rules |
| MuscleSelector 用 `react-body-highlighter` 取代手寫 SVG | 手寫 SVG 路徑比例失真；開源套件（MIT）有精準人體路徑，支援 anterior/posterior 兩個 view |
| MuscleSelector silhouette fill 用 `var(--bg-input)` | `var(--surface)` 係 undefined，SVG 默認 black fill；`--bg-input` light:`#f0f2f7` / dark:`#252a38` |

---

## ⚠️ 待議事項

| 議題 | 狀態 | 摘要 |
|------|------|------|
| **學生改期次數限制** | 🟡 擱置 | Cancel-rebook 漏洞令次數限制無效；建議改為距 session 24hr 前截止改期；待真實用戶反饋 |

---

## 📋 待處理事項（優先次序）

### 🔴 高優先——安全 / 法律（推廣前必做）

| # | 任務 | 說明 |
|---|------|------|
| 1 | **Privacy Policy + Terms of Service** | 法律風險，任何公開推廣前必須到位；GDPR 違規罰款遠高於開發成本 |
| 2 | **Firebase App Check** | 冇保護任何人可以用你個 Firebase project quota；防止 API 濫用 |
| 3 | **GDPR Cloud Function 部署** | 用戶有權要求刪除所有帳號數據；Cloud Function code 已寫好，需要 Blaze plan + 部署 |

### 🟠 中高優先——Message Rate Limiting

| # | 任務 | 說明 |
|---|------|------|
| 4 | **Message rate limiting** | 惡意用戶可 spam Firestore；建議 Firestore rule 限制每分鐘寫入次數，或 Cloud Function 做 throttle |

### 🟡 中優先——核心體驗 & 儀式感

| # | 任務 | 說明 |
|---|------|------|
| 5 | **Push Notifications 啟動** | FCM code 已 ready，需要 VAPID key + 重新部署 Cloud Functions |
| 6 | **Workout Complete Screen** | 儲存 log 後顯示完成畫面：完成 exercises 數、破 PR 數、總 volume、RPE、closing message；有 PR 顯示特別慶祝動畫；純前端，難度低 |
| 7 | **獎章系統 Phase 1** | 訓練次數里程碑（10/50/100次）+ 相對進步里程碑（任何 exercise PR 突破 X%）；觸發後 notify 教練確認先 award；新 `badges/{clientId}` Firestore collection；難度中 |
| 8 | **Smart Progression Suggestions** | 教練開 client 計劃時，根據過去3次 log 自動建議「可以試加重 X kg」；純前端計算 workoutLogs 歷史；唔係 PT 界其他工具做到嘅功能，競爭優勢高 |
| 9 | **Session Recap（一鍵發送）** | Mark Complete 後生成 recap preview（今日 exercises、PRs、RPE、教練短評）→ 教練一 tap confirm → 自動發去 in-app message；取代 WhatsApp 手打 summary |
| 10 | **Set Completion Checkbox** | 做完一組 tick，即時視覺反饋 |
| 11 | **Volume Analytics Chart** | 週訓練量趨勢圖，學生睇到自己係咪進步緊 |
| 12 | **Business Analytics Dashboard** | 教練月收入趨勢、client retention rate、最忙時段；現有 invoice + schedule data 已足夠計算；難度低 |
| 13 | **Bulk Assign Plan to Multiple Clients** | 一次過 assign 同一個 plan 俾多個 client |

### 🟡 中優先——架構技術債

| # | 任務 | 說明 |
|---|------|------|
| 14 | **AppContext 拆分** | 660+ lines，難維護；建議拆成 AuthContext、DataContext、ActionContext |
| 15 | **Error handling 改善** | 部分 `catch {}` 靜默吞錯誤，debug 困難；加 console.error 或 error reporting |
| 16 | **`Date.now()` → `crypto.randomUUID()`** | 低風險但應及早處理，避免並發 ID 碰撞 |
| 17 | **Firestore workoutLogs index** | 用戶量大時 query 會慢；加 composite index（clientId + date） |
| 18 | **eslint-disable 清理** | 部分 `useEffect` dependencies 用 disable 屏蔽而非真正修復 |

### 🟢 低優先——加分項

| # | 任務 | 說明 |
|---|------|------|
| 19 | **獎章系統 Phase 2（Shareable 卡）** | CSS rendered 成就卡 + Web Share API 分享；DOM 完全隔離防止截圖洩露其他資料；只顯示 first name + badge 名 + ElitePro logo |
| 20 | **Modal Keyboard Trap（Accessibility）** | WCAG 合規；Tab 鍵應鎖定在 modal 內 |
| 21 | **Invoice UI 優化** | 功能夠用，視覺設計可以再 polish |
| 22 | **進度相片** | 學生 body transformation 可視化 |
| 23 | **Client Onboarding（PAR-Q）** | 專業教練標準流程，健康申報表 |
| 24 | **Data Export** | 教練 backup 學生資料（CSV / PDF）|
| 25 | **Landing Page** | 獨立推廣網址 |
| 26 | **GA4 / Firebase Analytics** | 用戶行為追蹤 |
| 27 | **Stripe 收費整合（Phase 2）** | Invoice Phase 1 穩定後才做 |
| 28 | **App Store 上架（Capacitor）** | PWA 先行，穩定後考慮 |

### 🎯 獲客工具

| # | 任務 | 說明 |
|---|------|------|
| 29 | **Hevy CSV Import** | 吸引 Hevy 用戶轉移；純前端（FileReader + fuzzy exercise matching）；需要 3-step UI（上載 → 預覽匹配 → 確認）；注意 duplicate detection + CSV sanitization |

---

## 🧠 產品策略討論紀錄（Session 22）

### 「教練絕對倚賴」三個層次
| 層次 | 做法 |
|------|------|
| 日常習慣 | 每日必開 Dashboard，一眼睇晒業務狀態（已有） |
| 工作流整合 | Session 完成→ recap → 扣堂 → reminder 一條龍 |
| 數據引力 | 歷史數據積累（workout logs、badges、PRs），轉移成本極高 |

### 獎章系統設計原則
- Phase 1：訓練次數里程碑 + 相對進步里程碑（避免 exercise 識別問題）
- 觸發後 **notify 教練確認**先 award，唔自動發出（防止數據錯誤）
- Badge 一旦 award 唔自動撤銷，只有教練人手移除
- Shareable 卡 Phase 2 才做，先確保 badge 邏輯穩定
- 儀式感設計原則：**克制而有意義**（Nike/Strava 風格，唔係 Duolingo 式誇張）
