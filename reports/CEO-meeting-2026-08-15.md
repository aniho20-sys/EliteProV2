# CEO 週例會 — 2026-08-15（補開）

**日期**：2026-08-15（星期六，補返 8/07 同 8/13 兩個冇 fire 過嘅星期四）
**主持**：CEO（策略顧問）
**出席**：員工A（SA）、員工B（Dev）、員工C（Reviewer）、員工D（UI/UX）、員工E（QA）、員工F（Security）、員工X（Marketing）
**上次例會**：`reports/CEO-meeting-2026-08-06.md`

---

## 📊 開會前功課（git log）

`claude/fitness-app-features-LbxtG`，2026-08-06 → 2026-08-15：

- **21 個 commit**，39 個檔案，**+3048 / −215** 行

| Commit | 日期 | 內容 |
|---|---|---|
| `0089ebb` | 08-14 | Marketing 週報（由孤兒分支 cherry-pick 過嚟） |
| `030c799` | 08-14 | Analytics retention 改用共用 helper + top-up 計入收入 |
| `e87c95e` | 08-13 | 套用 movement pattern 決定 + 批准畫面 |
| `e7cf25b` | 08-13 | `inferMovementPattern()` 關鍵字分類 |
| `fcde74f` | 08-13 | 修 Exercise Library filter chips 撳唔郁 |
| `c0e0aa1` | 08-13 | Military press 軟合併（令佢做得到而且正確） |
| `2ce37d5` | 08-13 | 三條新增動作路徑封鎖重複 |
| `41f2f18` | 08-11 | Cloud Functions 升 Node 22 / firebase-functions 6 / admin 13 |
| `4792bf8` | 08-11 | 首次完整 onboarding 真機走通 |
| 其餘 | | 報告、PROGRESS.md、CLAUDE.md 更新 |

**測試存量**：Cloud Functions 35、Firestore rules 45、前端 vitest 74（本週由 0 起步）。

---

## 【1. App 改善】

### 1.1 上週行動交數

| | 行動 | 結果 |
|---|---|---|
| 🥇 | 全新帳號行完整 onboarding | ✅ **完成**（08-11），6 步全過，含 invite code `3XQPKM` |
| 🥈 | Landing Page 文案改版 | ❌ **零進度**。`git log src/pages/LandingPage.jsx` 最後改動 **07-24**。Gate 08-11 已開，閒置 4 日 |
| 🥉 | 前端 E2E smoke path | 🟡 **一半**。vitest 建立、74 條 unit test，但**旅程測試零條**，Playwright script 未寫 |

### 1.2 各崗位發言

**[員工A - SA]** 本週最重要嘅系統事實：**Analytics 頁面所有數字之前都係錯嘅**，兩個 bug 疊埋 ——

1. retention 仲用緊 log-only 判斷，淨上堂唔自己 log 嘅學生被當 Inactive
2. 完全冇讀 `creditLedger`，續約 top-up 收入一蚊都冇計

第一個係 Session 35 修 dashboard 嗰陣漏低嘅**同一個 bug**。同一根因喺兩個頁面出現過，代表當初修得唔徹底。今次已 grep 全 repo 出清單，並加 guardian test。

**[員工C - Reviewer]** 我要點出一個**模式**，唔係單一 bug。本週修咗四個問題：filter chips 死咗三個星期、invite code 100% 失敗、Analytics 兩個。**四個全部由 Ani 真機揀到，自動化發現嘅係零。** 上次會議已經講過同一句，今個星期原封不動再講一次。

**[員工E - QA]** 補數字：後端 test 80 條（Functions 35 + rules 45），前端由 0 升到 74。但 74 條全部係**純函式** unit test。「新用戶入唔到門」、「filter 撳唔郁」呢類死法，74 條一條都捉唔到。測試金字塔而家係**底層厚、頂層空**。

**[員工D - UI/UX]** filter chips 嗰個我認 —— 當初用**靜態 mockup screenshot** 驗收密度就收貨，睇落靚，但冇人撳過。已寫入 CLAUDE.md #36，但寫規矩唔等於執行到；下次改互動元件我會列明實際撳咗邊幾下。

**[員工B - Dev]** 本週交付：Node 22 升級（13 個 function，真機驗過扣數／退款／mark complete）、動作重複防護三條路徑、軟合併 UI、`inferMovementPattern()`、Analytics 兩個修復 + guardian test（**實測過注入 bug 會 fail**）。技術債：226 個 ESLint error 仍凍結，係 08-04 嘅決定，冇郁。

**[員工F - Security]** 本週新增寫入路徑審過：`updateExercise` 寫 `mergedInto`、`getTrainerCreditLedger` 單欄位 query。兩者受現有 rules 約束，`trainerId` immutable 冇被繞過，**冇新增攻擊面**。`gcOAuthCallback` 仍然冇 rate limit（backlog #18，已批「唔急」）。

### 1.3 CEO 判斷

- 產品交付速度冇問題 —— 21 個 commit 全部有實質內容
- 質素把關**過度依賴 Ani 一個人做人肉 QA**，呢個係樽頸
- **但真正問題係：呢個星期 100% 時間喺改善一個冇用戶嘅 app**

---

## 【2. 用戶增長】

**[員工X - Marketing]**（詳見 `reports/marketing-report-2026-08-14.md`）

- Founding Member：**0**
- 新註冊 / 邀請碼使用次數：**攞唔到**（冇 Firebase Admin 存取權）—— 係缺口，唔係 0
- 上週兩項行動（FB 教練群、Landing Page 文案）：**兩項零進度**

市場情報一條：**PT Distinction 主打「flat pricing、無 branded app 費、無額外收費」**，同我哋計劃嘅「$0 setup fee + 零抽成」係同一賣點方向。**差異化窗口收窄緊。**

**[CEO]** 講白：**由 08-06 到今日，零個獲客動作。** 唔係做咗冇效果，係一件都冇做過。而 blocker 08-11 已經冇咗，所以呢個唔再係「未準備好」，係**冇人執行**。

**[員工A - SA]** 補系統角度嘅原因：**唔係 Ani 唔想做，係佢每星期都俾 bug 食晒時間。** 本週佢做咗四次真機測試、批咗六項決定 —— 全部必要，但全部向內。

**[員工E - QA]** 「攞唔到註冊數字」本身就係產品缺口 —— 教練連自己有幾多人註冊都睇唔到。

**[CEO]** 記低，但唔係今週優先。`/analytics` 只服務已有客戶嘅生意數字，冇一個地方答「有幾多人來過」。

---

## 【3. 本週行動清單】（主管 PM 整理）

> 上週三項：一項完成、一項零進度、一項一半。**今週唔加新嘢，三項有兩項係還債。**

### 🥇 行動一：Landing Page 文案**出街**

**負責**：員工B 執行 / 員工X 出文案 / **Ani 拍板 + 真機睇**

**點解排第一**：第二次上榜。Gate 08-11 已開，`LandingPage.jsx` 由 **07-24** 起冇郁過。競品已經開始講同一個賣點。

**完成標準**：
- 首 5 位 Founding Member + 3 個月免費，**單一** CTA
- 寫死兩點：**「$0 setup fee」**、**「收款零抽成」**
- **iPhone 真機睇過**（唔係 screenshot —— CLAUDE.md #36）
- **真係出街**，唔再係「準備好擺喺度」

---

### 🥈 行動二：FB 教練群第一篇分享帖

**負責**：**Ani 真人出帖**（員工X 出文案）

**點解**：第二次上榜。零風險、唔受任何 gate 阻，純粹冇做。

**完成標準**：
- 員工X 交 2-3 個目標群名單俾 Ani
- Ani 喺**最少一個**群出咗第一篇真實痛點分享帖
- 下週五週報要交數：睇咗幾多、有冇人問

---

### 🥉 行動三：一條 Playwright 旅程測試

**負責**：員工B 主力 / 員工E 定場景 / 員工C 審

**點解**：第三次上榜嘅一半。本週四個真機 bug、自動化發現零個。vitest 係好嘅一步，但守唔到「撳咗冇反應」呢類死法。

**完成標準**：
- 一條 script 跑完 onboarding 第 2-6 步（Chromium 已裝好，**唔好**跑 `playwright install`）
- **必須驗證有牙齒**：注入 filter chip 或 invite code 其中一個 bug，script 要 fail
- 唔追覆蓋率，只守「新用戶入唔到門」

---

## 【待 Ani 拍板】

| # | 事項 |
|---|---|
| 1 | **兩個 Routine 壞咗** —— CEO 例會兩星期冇 fire；Marketing 連續三次開新 branch（改 prompt 冇用，branch 係環境層面指派，要喺 Routine 設定改） |
| 2 | **撳合併** —— Exercise Library → Military press → Merge into… → Overhead Press |
| 3 | **撳 Scan My Library** —— Profile → Movement Pattern Auto-Classify，42 條自建動作分類 |
| 4 | **註冊數字渠道** —— 員工X 每週要交實數，而家攞唔到 |
| 5 | Phase 3 Step 3（GoCardless 訂閱 UI）幾時開工 |
| 6 | `/analytics` 加「有幾多人來過」呢類獲客指標（記低，非今週） |

---

**[CEO] 收會。**

> 一句總結：**產品側健康，增長側零。今個星期唔好再交付新功能 —— 三項行動有兩項係還債。**

_內部會議記錄，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
