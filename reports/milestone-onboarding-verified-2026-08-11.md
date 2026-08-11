# 里程碑報告：Onboarding 全程打通 + Node 22 升級完成

**日期**：2026-08-11
**角色**：員工A（SA）+ 員工B（Dev）
**性質**：里程碑 / 狀態總結
**一句話**：**兩個 🔴 blocker 喺真實環境確認修好，onboarding 第一次由頭行到尾，CEO 會嗰道增長 gate 開咗。**

---

## 1. 今日達成咗乜

### 1.1 🎉 完整 onboarding walkthrough 通過

Ani 用**全新 email**（唔係現有帳號）、iPhone Safari、由 Landing Page 開始行足六步：

| # | 步驟 | 結果 |
|---|---|---|
| 1 | 開 `/#/landing` | ✅ |
| 2 | 新 email 註冊做學生 | ✅ |
| 3 | **輸入 invite code `3XQPKM`** | ✅ |
| 4 | 填問卷 | ✅ |
| 5 | 教練端 client list 見到新學生 | ✅ |
| 6 | Book 一堂 → Mark Complete | ✅ |

**由 app 開始寫到而家，呢條路第一次有人由頭行到尾。**

### 1.2 一次過驗證咗三樣嘢

| 項目 | 之前狀態 | 而家 |
|---|---|---|
| **Invite code 修復**（`c433aeb`）| 報告標住「待真機覆測」 | ✅ production 確認生效 |
| **問卷 rules allowlist 修復**（`1dfcaa3`）| 只有 rules test 證明 | ✅ 新學生真係出到主 app |
| **完整 onboarding 路徑** | 從來冇人行過 | ✅ 六步全通 |

**呢個月爆嘅兩個令新學生 100% 用唔到嘅 blocker，兩個都喺真實環境確認修好。**

### 1.3 Node 22 升級完成並驗收

| 項目 | 結果 |
|---|---|
| 🔴 **2026-10-31 死線** | **拆咗** —— 下一個 2027-10-31，買返 14 個月 |
| Source code 改動 | **零**（只有 `package.json` + lockfile）|
| Deploy | 13/13 `Successful update operation`，log 逐個顯示 `Node.js 22 (1st Gen)` |
| Node 20 deprecation 警告 | 完全消失 |
| 35 條 test | 全綠，一行都冇改 |
| 真機三項複測 | ✅ book 扣數 / 24 小時前取消退款 / Mark Complete 唔重複扣 |

---

## 2. 呢個解鎖咗乜

CEO 會（2026-08-06）將 onboarding walkthrough 定為**所有增長行動嘅前置條件**，原話：

> 一個星期爆咗兩個令新學生完全用唔到嘅 bug。教練帶學生入嚟，學生第一步就撞牆，教練會即刻走，而且唔會返轉頭。**第一印象只有一次。**

呢道 gate 而家開咗：

- ✅ **Founding Member 招募解封**
- ✅ **行動二（Landing Page 文案）由「準備好但唔好發佈」變成可以真出**

---

## 3. 現時整體狀態

### Phase 進度

| Phase | 狀態 | 備註 |
|---|---|---|
| 1. Credit System UAT | 🟡 | 透支、book 扣數、取消退款、E2E 全部實測過；剩 Top-Up rate 選擇器、續約提醒未測 |
| 2. UI Cleanup | ✅ | |
| 3. GoCardless | 🟡 | Step 1-2 live；**Connect 掣仍然未有真人試過 sandbox** |
| 4. PWA / FCM | ✅ | |
| 5. Venue Marketplace | ⬜ | 未開始 |

### 測試覆蓋

| 套件 | 數量 |
|---|---|
| Cloud Functions（emulator） | **35** |
| Firestore rules（emulator） | **45** |
| 前端（`src/`） | **0** ← 唯一嘅空白 |

### 平台狀態

- CI：`deploy_functions` 由 7-29 起連續 11 次綠燈
- Runtime：Node 22，13 個 function 全部 live
- iOS Safari ✅ / Android Chrome ⬜（未測過）

---

## 4. 未清嘅嘢

| # | 項目 | 嚴重度 |
|---|---|---|
| 1 | **前端零測試覆蓋** —— 呢個月四個真機 bug、零個由自動化發現 | 🟠 中 |
| 2 | GoCardless Connect sandbox 未有真人試過（Phase 3 Step 3 前置） | 🟠 中 |
| 3 | Android Chrome 未測過 | 🟢 低 |
| 4 | 226 個 pre-existing ESLint error（Ani 已批暫不清，backlog #20） | 🟢 低 |
| 5 | `firebase-functions` 未去 7，deploy nag 仍在（純美觀） | 🟢 低 |
| 6 | 孤兒分支 `claude/affectionate-cerf-qlhyuu` 可刪（內容已全搬 production） | 🟢 低 |

---

## 5. 建議下一步

| 次序 | 行動 | 理由 |
|---|---|---|
| 🥇 | **Landing Page 文案**（$0 setup fee + 零抽成） | Gate 開咗，呢個係招募嘅第一件實物。競品收 $164-197 setup fee 同 5% 抽成，呢個對比係現成賣點 |
| 🥈 | **前端 E2E smoke path** | 將 Ani 今日手動行嗰六步自動化。要求：必須注入今個月其中一個 bug 驗證佢真係 fail 得（跟 guardian test 做法）|
| 🥉 | **GoCardless Connect sandbox 實測** | Phase 3 Step 3 唯一前置，SA 報告列為風險最高 |

---

## 6. 一句總結

CEO 會嗰句係「由『Ani 撞到先知』變成『出街之前就知』」。今日行完 walkthrough 係**證明咗而家嘅嘢係好嘅**，但佢係人手做嘅 —— 下次改嘢一樣要人手再行一次。

**建議 🥈 排喺 🥉 之前**，就係為咗令呢條驗證由「靠人記得行」變成「每次 push 自動行」。呢個先係真正兌現嗰句說話。
