# CEO 週例會 — 2026-08-06（星期四）

**主持**：CEO（策略顧問）
**出席**：員工A（SA）、員工B（Dev）、員工C（Reviewer）、員工D（UI/UX）、員工E（QA）、員工F（Security）、員工X（Marketing）
**最終決策權**：Ani（Owner）
**涵蓋期**：2026-07-31 → 2026-08-06

> 備註：呢個係 CEO 週例會第一次留低正式紀錄 —— 之前 `reports/` 入面一份都冇，即係個 Routine 由頭到尾未成功跑過。

---

## 開會前功課

`git log claude/fitness-app-features-LbxtG`：本週 **33 個 commit、34 個檔案、+2,443 / −233 行**。

四大主題：

| 主題 | 內容 |
|---|---|
| Code health audit Top 5 | `badgeUtils` UTC bug、ROADMAP/CLAUDE.md 同步、`/apply` gate、貨幣統一（`formatCurrency`）|
| 學生 onboarding | 🔴 問卷卡死修復、問卷版面重做、`TrainingProfilePage`、通知卡去 debug 化 |
| Credit 透支 | 1 堂上限、ledger 記錄、Reopen + legacy 重複收費修復、真機兩個 bug → server-side 強制 |
| Invite code | 🔴 學生連唔到教練修復、CLAUDE.md #34 |

**本週開場關鍵數據 —— 一個星期內兩個同類型 🔴 blocker：**

| 日期 | Bug | 影響 | 點樣發現 |
|---|---|---|---|
| 07-29 | `intakeCompleted` 唔喺 rules allowlist | 新學生 **100%** 卡死喺問卷，出唔到 app | Ani 真機 |
| 08-04 | invite code 查 in-memory 陣列 | 新學生 **100%** 連唔到教練 | Ani 真機 |

兩個都係必然失敗（唔係間歇性）、兩個都喺學生 onboarding 前兩步、兩個都逃過 build / lint / CI / 全部自動化 test。

**呢個唔係巧合，係一個模式。**

---

## 【1. App 改善】

**[員工A - SA]** 兩個 bug 有同一個根：**條 onboarding 路徑冇人由頭行到尾行過一次**。Pre-launch checklist 嘅「Landing Page → Sign up → 加 client → Book session → Mark Complete」由寫低嗰日到今日仍然係 🟡。兩個 blocker 就正正瞓喺呢條未行過嘅路上面。我哋一直測「功能」，冇測「旅程」。

**[員工B - Dev]** 技術上兩個 bug 唔同源（rules allowlist vs 查錯資料源），但發現方式一模一樣。本週加咗兩條防線（`userSelfUpdate.rules.test.js`、`inviteCode.rules.test.js`）。但要老實講：invite code 嗰 8 條 test **唔會**因為原本個 bug 而 fail，因為 bug 喺 JS 層而 repo 冇前端 test runner。佢守嘅係未來風險，唔係今次個 bug。

**[員工C - Reviewer]** 呢點正正係技術債所在。而家有 35 條 Cloud Functions test、45 條 rules test，但 **`src/` 底下零測試覆蓋** —— 所有前端邏輯（包括「去邊度攞資料」呢類最易錯嘅嘢）完全冇網。另外 `npm run lint` 有 226 個 pre-existing error，紅到冇人會睇，新錯誤會直接被淹冇。Ani 已決定暫時唔清（避免大 diff 冚住真改動），但要記住呢個係一個**失效咗嘅安全網**，唔係小事。

**[員工E - QA]** 數據：本週兩個 blocker + 8-02 兩個透支 bug = **四個真機發現嘅問題，零個由自動化測試發現**。我唔係話 test 冇用（guardian test 同 server-side cap 都實實在在擋住嘢），但我哋嘅測試策略偏食：**後端厚、前端薄、旅程零**。最應該補嘅唔係更多 unit test，係一條走得通嘅 E2E smoke path。

**[員工D - UI/UX]** 共通點：**兩個 bug 對用戶嘅呈現都係「講大話」**。問卷顯示「Failed to save, please try again」—— 重試一萬次都冇用。Invite code 顯示「Invalid invite code」—— 個 code 明明啱。用戶會怪自己、會重試、會放棄，而唔會 report。本週將 invite code 訊息拆成 invalid / permission / network 三種，呢個應該推廣做全站原則：**錯誤訊息唔可以話一件我哋唔肯定嘅事**。

**[員工F - Security]** `users` 條 rule 而家係 `allow read: if isAuth()` —— 今次幫咗手（invite code 查得到），但代價係**任何登入用戶都讀得晒全部 user doc**，包括第二個教練嘅學生名單同 email。而家用戶少睇唔出，Phase 5 有外部教練入場就係真問題。建議唔好而家改（一改就會再撞死 invite code），但要而家記低：Phase 5 開工前必須設計一個「查得到 invite code 但掃唔到全表」嘅方案。

**[CEO]** 第一節總結：**本週唔應該再加新功能。** 技術債入面最貴嗰件唔係 lint、唔係重複邏輯，係「onboarding 冇人行過」。

---

## 【2. 用戶增長】

**[員工X - Marketing]** 市場數據：同行入門價集中 $19-20/月，但**隱藏成本係今年最大痛點** —— TrueCoach 收款抽 5%、Trainerize 收款功能 +$10/月、setup fee $164-197，多篇 2026 評測特登踢爆。ElitePro **零抽成、零 setup fee**，係現成嘅對比賣點，Landing Page 應該直接寫死。

獲客方面最有力嘅數據：**50%+ 獨立教練話首要客源係口碑轉介**，社交媒體排第二。所以建議唔係落廣告，係兩件近乎零成本嘅事：(1) 滲透 2-3 個活躍 Facebook 教練群，以教練身份分享真實痛點故事；(2) 轉介機制（介紹一位同行，雙方各送一個月）。

**[CEO]** Founding Members 進度：**0**。Pre-launch checklist 三項 🔴/🟡 全部未做 —— Landing Page copy 未改、手機未睇過版面、WhatsApp 邀請訊息未寫。

**[員工X - Marketing]** 自我批評：出咗三份週報講競品同定價，但**冇一份轉化成實際行動**。分析唔等於推廣。

**[員工A - SA]** 要插一句風險：**而家唔應該急住拉 Founding Member 入嚟。** 一個星期爆咗兩個令新學生完全用唔到嘅 bug。教練帶學生入嚟，學生第一步撞牆，教練會即刻走，而且唔會返轉頭。**第一印象只有一次。**

**[員工E - QA]** 同意。呢兩個 bug 都係 Ani 自己撞到嘅。外部教練唔會逐個 debug 俾我哋聽，佢哋只會靜靜雞消失。

**[CEO]** 本週最關鍵嘅判斷點，拍板：**推廣唔停，但次序倒轉。** 唔係「唔好拉人」，係「拉人之前先自己行一次條路」。呢件事只需要 Ani 一個鐘，但佢係所有增長行動嘅前置條件。文案同群組名單可以並行準備 —— 準備係零風險嘅，發出去先係。

---

## 【3. 本週行動清單】（主管 PM 整理）

### 🥇 行動一：用全新帳號行一次完整 onboarding（唯一前置條件）

**負責**：Ani（真機，iPhone Safari）
**點解排第一**：本週兩個 blocker 都瞓喺呢條路上，而呢條路從來冇人由頭行到尾。冇行過之前，任何拉客行動都係喺未驗證嘅地基上做。

**完成標準** —— 用**全新 email**（唔好用現有帳號），順序完成：

| # | 步驟 | 通過條件 |
|---|---|---|
| 1 | 開 `/#/landing` | 手機版面唔爆、CTA 撳得到 |
| 2 | 新 email 註冊做學生 | 入到 RoleSelect |
| 3 | 輸入 invite code `3XQPKM` | **連結成功**（08-04 修復，未驗證）|
| 4 | 填問卷（唔好 Skip） | 出到主 app |
| 5 | 教練端睇 client list | 見到呢個新學生 |
| 6 | 教練 Book 一堂 → Mark Complete | 堂數扣一格 |

**任何一步失敗即刻停低回報，唔好自己 workaround 行落去** —— workaround 會遮住真實體驗。

---

### 🥈 行動二：Landing Page 文案改版（可與行動一並行準備）

**負責**：員工B 執行 / 員工X 出文案 / Ani 拍板

**完成標準**：
- 首 5 位 Founding Member、3 個月免費 —— 寫得清楚、有明確單一 CTA
- 加入員工X 本週兩個實證賣點：**「$0 setup fee」** 同 **「收款零抽成」**（同行分別收 $164-197 setup fee 同 5% 抽成）
- 手機真機睇過一次，唔止桌面
- **未過行動一之前唔好對外發佈** —— 準備好擺喺度

---

### 🥉 行動三：補一條前端 E2E smoke path

**負責**：員工B 主力 / 員工E 定場景 / 員工C 審

**點解**：本週四個真機 bug、零個由自動化發現。呢個唔係「加多啲 test」，係補返一個**類別**嘅測試 —— 而家後端厚、前端薄、旅程零。

**完成標準**：
- 一條自動化 script 跑得完行動一嘅第 2-6 步（Playwright，環境已裝好 Chromium）
- **必須驗證佢有牙齒**：將今次兩個 bug 其中一個注入回去，個 script 要 fail —— 跟返 08-01 guardian test 嘅做法。一條未 fail 過嘅 test 等於冇 test
- 唔使貪心追覆蓋率，只要守住「新用戶入唔到門」呢一種死法

---

## 📌 待 Ani 拍板

| # | 事項 | 背景 |
|---|---|---|
| 1 | **Phase 3 Step 3 幾時開？** | Step 1-2 已 live，但 GoCardless Connect 掣**未有真人試過 sandbox flow**。建議先實測再開 Step 3，否則係喺未驗證地基上再起一層 |
| 2 | **Phase 5 前 `users` read rule 收窄方案** | 員工F 提出：而家任何登入用戶讀得晒全部 user doc。今次幫咗手，但外部教練入場後係真風險。而家唔好改（一改再撞死 invite code），排入 Phase 5 前置 |
| 3 | **轉介機制**（介紹同行，雙方各送一個月） | 員工X 建議，貼合「50%+ 教練靠口碑」嘅數據。要唔要做、送幾多，商業決定 |

---

## CEO 結語

**我哋今個星期修得好，但發現得太遲。三件行動嘅共同目的只有一個 —— 由「Ani 撞到先知」變成「出街之前就知」。**
