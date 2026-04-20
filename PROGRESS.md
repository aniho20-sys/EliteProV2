# ElitePro 開發進度紀錄

> 最後更新：2026-04-20（Session 18）

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
| 收費 / Invoice | ❌ | ❌ 未做 |
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
- **Rest Timer**（sticky bar、5個預設、Web Audio 響鈴、震動、pause/resume/reset）
- Schedule 日曆（conflict check、booking、working hours、Mark Complete 堂數追蹤）
- In-app Messaging（unread badges、real-time sync）
- Exercise Library（search、filter、YouTube + URL links）
- Body Stats / Progress（Recharts AreaChart、metric tiles、趨勢指示、edit measurement）
- Profile（edit、invite code、shareable link、working hours、connect to trainer）
- Global Search、EmptyState、Skeleton、Toast、Error Boundary
- 互動人體肌肉模型（SVG 正面 + 背面）
- Firebase Auth（Google、Email/Password、Forgot Password、Demo Coach）
- Firestore real-time sync（8 collections）、IndexedDB offline persistence
- FCM push notifications（code ready，待 VAPID key 啟動）
- PWA manifest + iOS Add to Home Screen
- Firebase Hosting + GitHub Actions CI（push to `claude/fitness-app-features-LbxtG` 自動部署）

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| `workoutLogs` + `messages` 禁止 delete | 保護訓練紀錄完整性；GDPR delete 靠 Cloud Function Admin SDK |
| bodyStats 改 subcollection | 避免 1MB Firestore doc 上限 |
| HashRouter | Firebase Hosting SPA 需要 |
| `Date.now()` IDs | 低並發下足夠；將來可換 `crypto.randomUUID()` |
| templates 獨立 collection | trainer-scoped，client 無法存取 |
| Rest Timer 純前端 | Web Audio API + Vibration API，冇 backend 需求 |
| Exercise Library 靜態 defaults | 避免跨 trainer 污染 |

---

## ⚠️ 待議事項

| 議題 | 狀態 | 摘要 |
|------|------|------|
| **學生改期次數限制** | 🟡 擱置 | Cancel-rebook 漏洞令次數限制無效；建議改為距 session 24hr 前截止改期；待真實用戶反饋 |

---

## 📋 Roadmap（優先次序）

### 🔴 高優先（核心體驗 / 差異化）
| 功能 | 說明 |
|------|------|
| **Invoice / 收費管理（Phase 1）** | Invoice 生成 + 狀態追蹤（Unpaid/Paid/Overdue）+ PDF export；trainer 自己收款，App 只記帳 |
| **Push Notifications 啟動** | FCM code 已ready，需要 VAPID key + 重新部署 Cloud Functions |
| **Privacy Policy + Terms of Service** | 全球推廣前必做，法律保障 |

### 🟡 中優先（學生留存）
| 功能 | 說明 |
|------|------|
| **Workout 完成 Summary 頁面** | 儲存後顯示總結（PRs、完成率），增加成就感 |
| **學生 Dashboard 顯示下次預約** | Client 一打開 app 就知下次 session 幾時 |
| **Volume Analytics Chart** | 週訓練量趨勢圖，學生睇到自己係咪進步緊 |
| **Set Completion Checkbox** | 做完一組 tick，視覺反饋更清晰 |

### 🟡 中優先（教練效率）
| 功能 | 說明 |
|------|------|
| **Bulk Assign Plan to Multiple Clients** | 一次過 assign 同一個 plan 俾多個 client |
| **Mobile Exercise Reorder ↑↓ Buttons** | 手機 drag reorder 體驗差，加 ↑↓ 按鈕 |
| **Trainer 今日待辦** | Dashboard 直接顯示今日 sessions + 待確認 bookings |

### 🟢 低優先（加分項）
| 功能 | 說明 |
|------|------|
| **進度相片** | 學生 body transformation 可視化 |
| **Client Onboarding（PAR-Q）** | 專業教練標準流程，健康申報表 |
| **Data Export** | 教練 backup 學生資料（CSV / PDF）|
| **Landing Page** | 獨立推廣網址 |
| **GA4 / Firebase Analytics** | 用戶行為追蹤 |
| **Stripe 收費整合（Phase 2）** | Invoice Phase 1 穩定後才做 |
| **App Store 上架（Capacitor）** | PWA 先行，穩定後考慮 |

### 🔧 架構加固
| 任務 | 類型 |
|------|------|
| AppContext 拆分（過大，660+ lines）| 重構 |
| Collection listeners 加 query filter | 效能 |
| Firebase App Check | 安全 |
| Timezone bug 修復（跨時區預約）| Bug |
