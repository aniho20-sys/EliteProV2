# 上架 App Store 前審查 + 保安審查（2026-10-23）

**範圍**：成個 repo（`src/`、`functions/`、`firestore.rules`、CI）。**只出報告，冇改任何 app code。** 今次 commit 嘅只有呢份報告、`reports/BACKLOG.md`，同埋新測試 `firestore-tests/attack.rules.test.js`。所有測試都喺模擬器（emulator）跑，冇掂過 `elitepro-16718`（#38）。

**邊個做咗咩**（每項 finding 後面都標住）：

| 標記 | 來源 |
|---|---|
| 〔PA〕 | skill `production-audit`（agent 本人跑） |
| 〔RA〕 | skill `firebase-security-rules-auditor` + 模擬器攻擊測試（agent 本人） |
| 〔RC〕 | skill `firestore-rules-creation`（只出草稿，冇套用） |
| 〔IA〕 | agent `ext-identity-access` |
| 〔PB〕 | agent `ext-payments-billing` |
| 〔VC〕 | agent `ext-vibe-code-auditor` |
| 〔E2E〕 | agent `ext-e2e-test` + skill `webapp-testing` |
| 〔A11Y〕 | skill `frontend-a11y`（agent 本人） |
| 〔I18N〕 | agent `ext-i18n` |

每個 agent 嘅結論，agent 本人都抽查過最嚴重嗰幾項（見每項「核實」）；冇核實到嘅會寫明。

---

## 0. 先更正兩個前提

1. **Repo 入面仲未有 iOS／Capacitor。** 冇 `ios/` 資料夾、冇 `capacitor.config`、`package.json` 冇 Capacitor。所以下面所有 iOS 項目都係「iOS 版上架之前要做到嘅嘢」，唔係「iOS 版而家壞咗」。
2. **App 入面冇「教練每月 £19」嘅訂閱。** 〔PB〕查過：冇 coach subscription、冇 in-app purchase、冇 Stripe application fee。`SubscriptionCard` 係**學生**俾錢**教練**買面對面堂（月費計劃）。唯一暗示 ElitePro 將來會收教練錢嘅，係 landing page「首五位教練，免費三個月」（`LandingPage.jsx:160-163`）——呢個要 Ani 決定（見第 7 節 Q3）。

---

## 1. 總評

〔PA〕**網頁版：Production audit 74/100，launchable with caveats。** CI 綠（最近三次 deploy 全部 success：`18a68cc`、`154e924`、`72aaa38`）。上限冇封頂喺 69，因為 webhook 有冪等、冇 secret 外洩；但有兩個保安洞（下面「致命」1、2）要先修。

**iOS 版：而家上唔到架（Blocked）。** 原因唔係 code 差，而係 iOS 外殼未做、Google 登入喺 iOS 內嵌瀏覽器用唔到、冇 Sign in with Apple、冇 1024 icon。

### 1.1 App Store 檢查表〔PA〕（PASS / RISK / FAIL）

| 檢查 | 結果 | 證據 | 見 |
|---|---|---|---|
| 4.2 最低功能（唔只係網站） | RISK | 而家係網站包一層；冇原生推送／震動 | 高 3 |
| Google 登入喺 WKWebView | FAIL | `AppContext.jsx:365-389` popup／redirect；`ProfilePage.jsx:524` `reauthenticateWithPopup` | 致命 3、5 |
| 4.8 Sign in with Apple | FAIL（如果保留 Google） | 冇 Apple provider | 致命 4、Q1 |
| 3.1.1 數碼購買要 IAP | PASS | 冇數碼商品、冇教練訂閱（〔PB〕全 repo 查過） | 高 4 |
| 3.1.3(e) 學生俾錢教練上面對面堂 | PASS（可以保留，仲必須唔用 IAP） | `SubscriptionCard`、`PaymentSheetModal` 等 24 個畫面 | 高 4 |
| 2.2 唔可以有測試版 UI | RISK | 「Test mode」「Sandbox」「tester」 | 致命 6 |
| 5.1.1(v) app 內刪帳戶 | 網頁 PASS／iOS FAIL（Google 用戶） | `ProfilePage.jsx:518-545` → `AppContext.jsx:452-476` → `onAccountDelete` | 致命 5 |
| 私隱政策（app 內 + 公開） | PASS（`/#/privacy` 唔使登入）但內容 RISK | `PrivacyPolicyPage.jsx` | 中 6 |
| Service worker 唔可以喺 native 註冊 | FAIL | `dist/index.html` 注入 `registerSW.js`；`NotificationContext.jsx:39` | 中 1 |
| FCM web push 喺 iOS app | FAIL | 同上 | 中 1 |
| `window.print`（#30） | PASS | 全部用 `pdf-lib` + `navigator.share`，冇 `window.print()` | — |
| 付款／OAuth／外部連結用系統瀏覽器 | RISK | `SubscriptionCard.jsx:90`、`StripeConnectCard.jsx:75`、`ProfilePage.jsx:269, 426` | 高 5 |
| 1024 icon | FAIL | 最大 512（`manifest.json:44`） | 低 2 |
| 截圖 | FAIL | 冇 iPhone 尺寸 | 低 3 |
| 審查員示範登入 | RISK | CLAUDE.md 有 QA 帳戶（`test-coach-b@elitepro.test`、`test-student-b@elitepro.test`），密碼喺 Ani 度；要確認學生唔係 tester、教練冇連測試模式 | 致命 6 |
| 支援網址 | FAIL | 冇 | 低 4 |

### 1.2 App Store 私隱標籤草稿〔PA〕〔VC〕〔PB〕（由 code 實際收集嘅資料推出）

全部「連結到用戶身份」、用途「App 功能」、**冇用嚟追蹤**（tracking）。冇 analytics（`getAnalytics`／`gtag` grep 0 hits）。

| Apple 類別 | 收集咩 | 來源 |
|---|---|---|
| 聯絡資料：姓名、Email | 帳戶、教練通知 | `users` |
| 聯絡資料：電話號碼 | 公開預約頁陌生人留嘅聯絡方法 | `trialRequests.contact`、`users.contact` |
| 健康與健身：健身 | 訓練記錄、計劃 | `workoutLogs`、`workoutPlans` |
| 健康與健身：健康 | 體重、體脂、圍度；受傷資料（PAR-Q） | `bodyStats`、`intakeForms.injuries` |
| 財務資料：其他財務資料 | 教練銀行戶口（俾學生轉帳用） | `users.bankDetails` |
| 購買記錄 | 堂數增值、月費計劃 | `creditLedger`、`subscriptions` |
| 用戶內容：其他 | 留言、計劃備註、堂後小結 | `messages`、`workoutPlans` |
| 識別碼：用戶 ID | Firebase uid | 全 app |
| 診斷：當機資料 | 錯誤 stack、網址、瀏覽器資料、uid | `clientErrors`（中 5） |

付款卡資料**唔經 ElitePro**（Stripe／GoCardless 自己嘅頁面），所以唔使報「付款資料」，但私隱政策要講（中 6）。推送 token 係咪要報做「裝置 ID」——**未確定**，交審前再查 Apple 最新說明。

---

## 2. 致命（上架會被拒 / 有保安漏洞）

### 致命 1：任何人都可以搶走 Ani 嘅「新教練註冊」同「錯誤報告」通知〔IA〕
- **證據**：`functions/index.js:877-880` `findOwner()` 用 `users` 入面第一個 `email == 'aniho20@gmail.com'` 嘅文件做「owner」。`firestore.rules:95-99`（新增）同 `:128-131`（自己更新）准任何人喺自己 profile 寫任何 email。
- **核實**：agent 本人寫咗攻擊測試，喺模擬器證實兩個寫入都會成功：`attack.rules.test.js` → 「HOLE: a new account cannot put the owner’s address in its own profile」、「HOLE: an existing account cannot change its email to the owner’s address」（用反向測試證明寫入真係成功，唔係 setup 出錯）。
- **影響**：攻擊者註冊幾個帳戶，只要其中一個嘅 uid 排喺 Ani 前面，佢部手機就會收到每個新教練嘅姓名同 email，同埋錯誤報告；Ani 自己就收唔到。Owner 專用頁面（Platform Stats、錯誤報告）**唔受影響**，因為佢哋查嘅係登入 token（測試「the owner-only collections still check the sign-in token」）。
- **修法**：`findOwner()` 改用 Ani 嘅 Auth uid；rules 要求 `users.email` 必須等於登入 token 嘅 email（或者唔准自己改 email）。
- **工作量**：2–3 小時（連 rules 測試）。

### 致命 2：一個教練可以將「訓練計劃」同「發票」塞俾**另一個教練嘅學生**〔RA〕
- **證據**：`firestore.rules` workoutPlans create／update 同 invoices create／update 只查作者係咪教練、`trainerId` 係咪自己，**冇查 `clientId` 係咪自己學生**。學生 app 會列出所有 `clientId` 係自己嘅計劃（`AppContext`）同發票（`AppContext.jsx:195`）。
- **核實**：模擬器攻擊測試，3 個全部成功：「HOLE: B cannot create a workout plan addressed to A’s client」、「HOLE: B cannot re-address B’s own plan to A’s client」、「HOLE: B cannot create an invoice addressed to A’s client」；加埋「A’s client really would see such a plan」證明學生真係睇到。
- **影響**：任何人註冊做教練，就可以向其他教練嘅學生發一份寫住自己銀行戶口嘅「發票」，或者一份寫住電話／連結嘅「計劃」——即係釣魚。要知對方 uid，但 uid 會出現喺其他地方（例如學生曾經係呢個教練嘅學生）。
- **修法（草稿〔RC〕，冇套用）**：create 要求 `isTrainerOf(clientId)`；update 准 `clientId` 唔變或者改去自己另一個學生；計劃名同動作數量加上限。**草稿已喺模擬器驗證**：暫時套用後，4 個洞全部封咗，其餘 198 個 rules 測試全部仍然綠；之後 rules 檔已還原，同 HEAD 一模一樣。草稿 patch 見附錄 A。
- **工作量**：1–2 小時（草稿已有）。

### 致命 3（iOS）：Google 登入喺 iOS app 入面用唔到〔IA〕
- **證據**：`AppContext.jsx:365-389` 用 popup／redirect。Google 唔准喺 app 內嵌瀏覽器（WKWebView）登入（`disallowed_useragent`）；Capacitor 入面 `isStandalone()` 係 false，會行 popup，失敗。
- **影響**：淨係用 Google 登入嘅帳戶（Ani 自己都係）喺 iOS app 登入唔到。
- **修法**：`@capacitor-firebase/authentication` 用原生 Google 登入，攞 token 再 `signInWithCredential`。或者 iOS 版淨係提供 email + 密碼（見 Q1）。
- **工作量**：8–12 小時（要先有 iOS 外殼）。

### 致命 4（iOS，Guideline 4.8）：有 Google 登入就一定要有 Sign in with Apple〔IA〕
- **修法**：Firebase 開 Apple provider；Apple Developer 開 App ID capability、Services ID（return URL 用 `/__/auth/handler`）、.p8 key、私人轉發 email 來源；app 加「用 Apple 登入」同 Profile「連結 Apple ID」（唔係會開出一個新嘅空帳戶）。
- **工作量**：code 10–16 小時 + Ani 喺 Apple Developer 網站約 2 小時（只有佢做到，要用佢本人帳戶，#47.3）。**如果 iOS 版唔提供 Google 登入（Q1 揀 B），呢項就唔使做。**

### 致命 5（iOS，Guideline 5.1.1(v)）：Google 用戶喺 iOS app 刪唔到帳戶〔IA〕〔PA〕
- **證據**：`ProfilePage.jsx:524` 刪帳戶前用 `reauthenticateWithPopup`，WKWebView 入面失敗。另外 `AppContext.jsx:452-476` 先刪 Firestore profile、後刪 Auth 帳戶：如果第二步失敗，就會變成「profile 冇咗但帳戶仲喺度」，伺服器嘅清理（`onAccountDelete`）唔會行。
- **修法**：加一個伺服器 callable `deleteMyAccount`（伺服器刪 Auth 帳戶 → 觸發現有清理）；有 Apple 登入就要撤銷 Apple token。
- **工作量**：4–6 小時。

### 致命 6（iOS，Guideline 2.2）：審查員可能見到「測試模式」〔PB〕〔I18N〕
- **證據**：`SubscriptionCard.jsx:136`「Test mode — no real money is taken」、`StripeConnectCard.jsx:98`「Test mode」、`ProfilePage.jsx:863`「Sandbox」、`ClientDetailPage.jsx:587-600`「Monthly plan tester」開關。月費計劃仲係 pilot（`PILOT`／`SANDBOX = true`）。
- **影響**：Apple 唔接受測試版／beta 功能上架。
- **修法**：俾 Apple 嘅示範帳戶**唔可以**係 tester，示範教練**唔可以**連住測試模式嘅 Stripe／GoCardless；或者等 Stripe 正式上線、pilot 關咗先交審。審查備註寫明 3.1.3(e)（見高 4）。
- **工作量**：0（揀啱示範帳戶）至 1 小時。

---

## 3. 高

### 高 1：教練斷開 GoCardless，學生照樣俾錢但冇堂、亦取消唔到〔PB〕
- **證據**：`functions/index.js:685-706` `gcDisconnect` 刪咗 token，但冇取消學生嘅計劃；之後 webhook 503、冇加堂；學生撳取消會失敗（token 冇咗）。Stripe 嗰邊教練喺 Stripe 斷開 ElitePro 時（`stripeConnect.js:175-182` `markDisconnected`）計劃都仍然係 `active`。確認文字 `en.js:463` 前後矛盾（話「即刻停止收款」，又話「唔會喺 GoCardless 取消」）。
- **核實**：agent 本人讀過 `gcDisconnect`，確認冇取消計劃。
- **修法**：斷開前先取消計劃；改確認文字；Stripe 撤銷時將計劃標 cancelled。
- **工作量**：3–4 小時。

### 高 2：月費計劃嘅 roll-over 會沒收學生已經俾咗錢嘅堂〔PB〕
- **證據**：`gcWebhooks.js:120-122` 計「用咗幾多堂」時排除所有已取消嘅堂，但遲取消嘅堂係照扣嘅（`index.js:384-410`）。例：每月 8 堂，book 咗 6 堂、其中 4 堂遲取消 → 程式沒收 2 堂，正確應該係 0。現有測試 `gcWebhooks.test.js:152` 將呢個錯當咗啱。Stripe 同 GoCardless 都受影響。
- **核實**：agent 本人讀過兩段 code，邏輯確認。
- **修法**：遲取消（同超出每月免費次數嘅早取消）要計入「用咗」；改返嗰條測試。
- **工作量**：2–3 小時。

### 高 3（iOS，Guideline 4.2）：功能太似網站〔PA〕
- **現況**：iOS 版會係網站包一層。Apple 會問「有咩係網站做唔到嘅」。
- **平嘅原生功能**：原生推送（APNs，同時解決中 3）、原生分享表（PDF 已經用 `navigator.share`）、撳掣震動（haptics）、Face ID 登入（可選）。
- **工作量**：推送 6–10 小時；震動 1–2 小時。

### 高 4（iOS，Guideline 3.1）：收錢畫面可以保留，但要寫清楚〔PB〕
- **結論**：〔PB〕查過現行 Guideline 原文：學生俾錢教練上**面對面**堂，屬於 **3.1.3(e)「Goods and Services Outside of the App」**（唔係 3.1.5，3.1.5 係加密貨幣），而且原文係「**必須**用 in-app purchase 以外嘅方法」——即係 Stripe／GoCardless 係啱嘅做法。冇任何數碼商品或解鎖功能要收錢，所以**今日冇嘢一定要 IAP**。
- **要收埋（只限 iOS）**：測試模式／tester UI（致命 6）、GoCardless token 表格（`ProfilePage.jsx:851`）、Owner 專用卡、landing page（`App.jsx:75-77`，iOS 版應該直接去登入頁，因為「免費三個月」暗示將來收教練錢）。
- **可以保留**：學生月費卡、續堂／付款表（銀行資料）、教練設定價錢同銀行、連接 Stripe、公開預約頁同團體課價錢。
- **工作量**：iOS 判斷 + 收埋 2–3 小時（要先有 iOS 外殼）；審查備註 0.5 小時。

### 高 5（iOS）：Stripe／GoCardless 付款完返嚟會去錯地方〔PB〕〔PA〕
- **證據**：`SubscriptionCard.jsx:90`、`StripeConnectCard.jsx:75`、`ProfilePage.jsx:269` 用 `window.location.href` 去付款頁，返回網址係 `web.app`。喺 iOS app 入面，佢會喺 Safari 打開，返嚟時學生會喺 Safari 嘅網站版（未登入），唔係 app。`ProfilePage.jsx:426` WhatsApp 用 `window.open`。
- **修法**：用 `@capacitor/browser`（SFSafariViewController）開，加 Universal Link 返 app；返 app 時重新讀狀態。
- **工作量**：4–6 小時。

### 高 6：學生 app 嘅訓練計劃頁、通知、Dashboard 標題有好多英文寫死〔I18N〕
- **證據**：`WorkoutPlansPage.jsx`（標題 :554、儲存 :803、約 20 個 toast :175-371）、`TrainerDashboard.jsx:371-372`（日期寫死 `en-US`、「Morning／Afternoon」）、`WorkoutLogPage.jsx:349/342/222/211`（「Custom Workout」寫入 Firestore）、`NotificationCenter.jsx`（「just now」、通知標題）、`NotifPrompt` 副標題。中文審查員一定見到。
- **點解 CI 冇捉到**：`react/jsx-no-literals` 唔捉三元式（`a ? 'x' : 'y'`）同 `toast()` 入面嘅字。
- **工作量**：約 1 日（六成已經有中文 key，只係未接上）+ Ani 批新中文。

---

## 4. 中

| # | 問題 | 來源 | 證據 | 修法 | 工作量 |
|---|---|---|---|---|---|
| 中 1 | **iOS 推送用唔到**：web push（FCM + service worker）喺 iOS app 入面唔 work | 〔PA〕 | `NotificationContext.jsx:39-48` `serviceWorker.register('/firebase-messaging-sw.js')`；`dist/index.html` 注入 `registerSW.js`（`vite.config.js` `VitePWA registerType: 'autoUpdate'`） | iOS 版唔註冊 service worker；改用 `@capacitor/push-notifications`（APNs），伺服器 `sendPush` 支援 APNs token | 6–10 小時 |
| 中 2 | **公開預約頁每日上限可以呃**：用假 `X-Forwarded-For` 當自己係唔同訪客 | 〔IA〕〔VC〕 | `functions/index.js:1241` hash `rawRequest.ip`；functions 有 `proxy-addr` critical advisory。**未核實**（要喺已部署嘅測試 function 印一次 IP 先確認） | 按教練限流已經有（每日 20、未覆 10）；加 App Check；IP 用最右邊嗰個 | 2–3 小時 |
| 中 3 | **冇 App Check**，邀請碼可以暴力估，估中可以睇到教練銀行資料 | 〔IA〕〔VC〕 | `src/`、`functions/` 搵唔到 `app-check`；CI 有 `VITE_RECAPTCHA_SITE_KEY` 但冇人用 | 先 monitor 模式，再逐步 enforce（公開 callable → 邀請碼 → 其他）；webhook 永遠唔 enforce；公開 function 加 `maxInstances` | web 6–10 小時 + Ani console 1 小時 |
| 中 4 | **`reportClientError` 唔使登入**就可以將任意文字推送去 Ani 部手機；一日 2000 份嘅總額人人共用 | 〔IA〕〔VC〕 | `functions/index.js:1319`、`clientErrors.js:26-30` | 未登入嘅來源只發中性通知、唔發佢嘅字；按來源限流 | 2–3 小時 |
| 中 5 | **錯誤報告留住個人資料**：無限期、刪帳戶後仲喺度、私隱政策冇講 | 〔VC〕 | `clientErrors.js:98-115`（最多 20 個 uid）、`index.js:1330-1363`（email 有名同 uid）、`cleanUrl` 保留 `#/clients/<uid>` | 90 日自動刪；刪帳戶時清走 uid；email 標 `aboutUserId`；私隱政策加一段 | 3–4 小時 |
| 中 6 | **私隱政策唔準**：寫咗用 App Check + reCAPTCHA（其實冇用），冇寫 Stripe、GoCardless、教練銀行資料、錯誤報告、Trigger Email | 〔PA〕〔PB〕 | `PrivacyPolicyPage.jsx:90-98, 130-172` | 改寫第 2、4 節；日期更新（而家係 4 October 2026） | 1–2 小時 + Ani 過目 |
| 中 7 | **GoCardless 付款失敗／退款會「復活」已取消嘅計劃** | 〔PB〕 | `gcWebhooks.js:203-220` 冇查計劃是否已完結（Stripe 嗰邊有：`stripeWebhooks.js:174`） | 加同 Stripe 一樣嘅檢查 + 測試 | 1.5 小時 |
| 中 8 | **伺服器推送文字全部英文**（除咗上堂提醒） | 〔I18N〕 | `functions/index.js:203-212, 237-238, 265, 289, 497, 512`；付款通知 | 用 `sessionReminders.js` 嘅語言表 | 約 1 日 |
| 中 9 | **「60 min」寫死**：30 分鐘嘅堂都顯示 60 min | 〔I18N〕 | `en.js:277`／`zh-HK.js:120` `sched.type_duration`，`SchedulePage.jsx:489` | 用真 duration | 0.5 小時 |
| 中 10 | **VoiceOver**：登入頁 email／密碼 label 冇連到輸入格；所有彈出視窗冇 `role="dialog"`；toast 冇 `aria-live`（成功／錯誤讀屏聽唔到） | 〔A11Y〕 | `LoginPage.jsx:133-143, 192`（3 個 label、0 個 `htmlFor`）；全 app 只有 `SubscriptionCard` 有 `role="dialog"`；`ToastContext.jsx` 冇 `aria-live` | label 加 `htmlFor`；modal 加 `role="dialog" aria-modal`；toast 容器加 `role="status" aria-live="polite"` | 3–4 小時 |
| 中 11 | **示範帳戶用錯會曝光開發者表格**：GoCardless token 表格對所有教練顯示（未設 Stripe 時） | 〔PB〕 | `ProfilePage.jsx:851` | 唔好用 Ani 帳戶做示範；iOS 收埋 | 0 |
| 中 12 | **API key 未知有冇限制** | 〔IA〕〔VC〕 | code 睇唔到 console 設定 | Web key 限 referrer + API；iOS 另開 key（限 bundle id）；WebView 用一條只限 API 嘅 key | Ani console 1 小時 |

---

## 5. 低

| # | 問題 | 來源 | 證據 | 修法 | 工作量 |
|---|---|---|---|---|---|
| 低 1 | 教練可以刪學生嘅身體數據主文件（rules 註解話淨係學生刪得） | 〔RA〕 | `firestore.rules` bodyStats `allow write` 包埋 delete；測試「HOLE: the coach cannot delete their client’s body-stats document」 | 改成 `allow create, update`（附錄 A） | 0.2 小時 |
| 低 2 | 冇 1024×1024 App icon（最大得 512） | 〔PA〕 | `public/icon-512-v3.png`、`manifest.json:44` | 由現有設計出 1024 無透明版本 | 0.5 小時 |
| 低 3 | 冇 App Store 截圖尺寸；`public/screens/` 得 3 張網站用嘅 | 〔PA〕 | `public/screens/dashboard.png` 等 | 6.7"／6.5" iPhone 截圖，用示範資料 | 2 小時 |
| 低 4 | 冇支援網址（support URL）；私隱聯絡係 gmail | 〔PA〕 | `PrivacyPolicyPage.jsx:6` | 開一個簡單支援頁（例如 `/#/support`） | 1 小時 |
| 低 5 | GoCardless 重複事件檢查唔係原子 → 最多重複發「付款失敗」通知（堂數唔會重複加） | 〔PB〕 | `gcWebhooks.js:233-247` | 抄 Stripe 嘅 claim transaction | 1 小時 |
| 低 6 | 教練作廢失敗單，Stripe 計劃會永遠 `past_due` | 〔PB〕 | `stripeWebhooks.js:197-211` | 處理 `invoice.voided` | 1 小時 |
| 低 7 | `gcWebhook/<任何嘢>` 未驗簽就讀 Secret Manager | 〔IA〕〔PB〕 | `index.js:994-997` | 先驗 uid 格式同用戶存在 | 0.5 小時 |
| 低 8 | GoCardless OAuth 冇綁定開始嗰個瀏覽器 | 〔IA〕 | `gcOAuthNonce.js:20-30` | 加短期 cookie | 1–2 小時 |
| 低 9 | 預約表格 email 可以夾帶 `?subject=` | 〔VC〕 | `publicBooking.js:84`、`contactLinks.js:24` | email 檢查拒絕 `?&#/%`，連結 encode | 0.5 小時 |
| 低 10 | CI 用 `firebase-tools@latest`；`g.sh` 俾 service account `roles/editor` | 〔VC〕〔PA〕 | `.github/workflows/firebase-hosting.yml:94, 121` | 鎖版本；權限收窄；刪 `g.sh` | 1–2 小時 |
| 低 11 | npm audit：root 23（2 critical）、functions 24（1 critical）、firestore-tests 9。**大部分係 build／server-only，打包後嘅 app 冇** | 〔VC〕 | `dist/` grep 0 hits；functions `proxy-addr` 同中 2 有關 | root 升 react-router-dom ≥7.18.2、vite、vitest；functions `npm update`，firebase-admin 14 另做 | 1 + 2–4 小時 |
| 低 12 | Owner 檢查（`isOwnerToken`）今日安全，但建議綁 uid + 要求最近 5 分鐘登入 | 〔IA〕 | `functions/ownerAuth.js:13-18` | 加 uid 同 `auth_time` | 1–2 小時 |
| 低 13 | `ProfilePage.jsx` 直接 import `auth`（違反 #1） | 〔PA〕 | `ProfilePage.jsx:7` | 經 AppContext | 0.5 小時 |
| 低 14 | 「Three months free」同「Starting price: Free」放埋一齊，iOS 審查員會以為將來收費 | 〔PB〕 | `LandingPage.jsx:160-163` | 見 Q3 | — |

---

## 6. 測試同驗證

### 6.1 新增攻擊測試〔RA〕
`firestore-tests/attack.rules.test.js`，模擬器，49 條：
- **已經安全（回歸保護，一定要保持綠）**：未登入讀唔到任何嘢；學生改唔到自己堂數、`role`、`trainerId`、tester；學生唔可以免費 book、唔可以寫自己 credit ledger、唔可以移已上堂去「早取消」；學生讀唔到另一個教練嘅任何資料；教練 B 讀唔到、改唔到、book 唔到、加唔到堂、send 唔到訊息俾教練 A 嘅學生；Owner 頁面查 token 唔查 profile。
- **發現嘅洞（`test.failing`，6 條）**：今日會「通過」因為洞仲喺度；修好 rules 之後會轉紅，嗰陣改返做 `test(...)`。每一條都用反向測試證明過寫入真係會成功（唔係 setup 錯誤）。

### 6.2 驗證輸出（skill `verification-before-completion`）
全部喺 2026-10-23 跑，原文：
- `npx eslint .` → `✖ 1 problem (0 errors, 1 warning)`（警告係舊嘅 `useRestTimer.js:159` 多餘 eslint-disable）
- `npx vitest run` → `Test Files  49 passed (49)` / `Tests  612 passed (612)`
- `cd functions && npx jest --testPathPattern=test/` → `Test Suites: 20 passed, 20 total` / `Tests:       362 passed, 362 total`
- `cd firestore-tests && npx jest --testPathPattern=.` → `Test Suites: 14 passed, 14 total` / `Tests:       205 passed, 205 total`（原有 156 + 新攻擊測試 49）
- `npx vitest run src/i18n`（〔I18N〕跑）→ `Tests  150 passed (150)`

兩件要老實講嘅事：
1. 第一輪 functions 測試因為模擬器死咗而失敗（見附錄 A 注意），已經喺新模擬器重跑，上面係重跑嘅結果。
2. 寫報告期間，agent 用錯咗一個 shell 指令格式，令報告入面引號內嘅測試指令（eslint、vitest、兩個 jest suite）被意外執行多一次。全部係本機／模擬器測試（測試檔寫死 `localhost`），冇掂 production；報告內容已檢查冇被污染。

### 6.3 互動測試〔E2E〕
Playwright（Chromium）390×844，project `demo-elitepro`，Auth + Firestore + Functions 全部喺模擬器，瀏覽器封鎖所有非本機網址；repo 冇改、冇 commit。**呢個唔等於真機撳（#36）**——iPhone 驗收仍然係 Ani 嘅。截圖 53 張、腳本 `flow.py` 留喺 agent scratchpad。

**流程（最後一輪 14/14 步通過）**：教練註冊 → 揀角色 → 主頁 ✅；學生用邀請碼註冊、`connectWithInviteCode` 連到教練、跳過問卷 ✅；教練 book 堂，`onScheduleBooked` 扣 1 堂 ✅；學生記錄自由訓練（60 kg × 9，有 PR），堂嘅狀態冇被改（#32）✅；付款畫面：教練價錢同銀行資料、續堂付款表、公開預約頁（陌生人送出試堂、同 IP 重覆送被「今日太多」擋住）✅；學生刪帳戶：密碼錯有提示，正確就刪咗登入、`onAccountDelete` 喺模擬器行咗、教練名單冇咗佢 ✅。

**新發現**（已核實 code）：
- **E1（中）新教練第一次入主頁見唔到自己嘅邀請碼**（3 次註冊 3 次都係）：`SetupChecklist.jsx:23` 只問一次，第一次問時新 profile 未到伺服器，403 之後就唔再問；要去「學生」頁再返主頁先見到。0.5–1 小時。
- **E2（高，iOS 版更嚴重）提示 banner 遮住頁底最後一粒掣**：新用戶嘅「加入主畫面」同「開啟通知」banner 貼住底部選單，頁面冇預留位置 → 記錄訓練頁底部「儲存」撳唔到；Profile 嘅「刪除帳戶」要兩個 banner 都關咗先撳到（審查員要測 5.1.1(v)！）；通知 banner 仲遮住安裝 banner 自己嘅「關閉」。**iOS app 入面「加入主畫面」banner 根本唔應該出現**（`isStandalone()` 喺 Capacitor 係 false）。1–2 小時。
- **E3（中）刪帳戶視窗講錯**：`en.js:493, 499` 話「訓練記錄同訊息會保留（orphaned）」，但 `accountDeletion.js` 會刪走佢哋（只保留財務記錄）。Apple 5.1.1(v) 要求講清楚刪咗咩。0.5 小時 + Ani 批中文。
- **E4（要 Ani 決定，Q5）月費金額同堂數對唔上**：£40／堂、每月 4 堂，卡寫「GBP 173.33/month」= 按一年 52 堂收錢（`gcSubscriptions.js:67` `× 13 / 12`），但每次付款只加 4 堂（一年 48 堂）。設計文件都係咁。要改字眼定改收費／加堂，係定價決定。
- **E5（低）** 密碼錯會關埋刪帳戶視窗、清走輸入；`getPlatformStats` 對非 owner 喺 console 出 403（預期中，只係雜訊）；冇未處理嘅頁面錯誤。
- **E6（中）撳掣大細**：全 app 大部分掣 36–38px 高（Apple 建議 44）。最細：訓練中 kg／reps −／+ 24×24（10-20 加咗觸控範圍去 44 高，但闊度仍然 24）、休息計時 Start／Pause 33×16、RPE 滑桿 16px 高、文字連結約 15px 高、checkbox 18×18、學生主頁留言「send」掣冇 label。

**冇測到**：Google 登入、真 GoCardless／Stripe 連接同付款、推送、排程 function、教練確認／拒絕試堂、刪教練帳戶、任何 iOS 專有行為。

---

## 7. 要 Ani 決定嘅嘢

淨係問真係要佢拍板嘅嘢（#47）。其他全部 agent 自己做得到，佢批咗就做。

**Q1：iOS 版點樣登入？**（決定致命 3、4、5 嘅工作量）
- **A（建議）：iOS 版淨係提供 email + 密碼。** 唔使做 Sign in with Apple（4.8 只係喺有第三方登入時先要求），唔使做原生 Google 登入。用 Google 登入嘅人（包括你）喺網站 Profile 加一個密碼一次，之後 iOS 用 email + 密碼登入。agent 會做：網站 Profile「加密碼」功能、iOS 版收埋 Google 掣、伺服器刪帳戶 callable。約 8–10 小時。
- **B：iOS 版保留 Google，再加 Sign in with Apple。** 最順手，但要你喺 Apple Developer 網站做約 2 小時設定，code 約 22–34 小時。
- 揀咗之後：agent 寫做法同測試，先俾你睇，唔會直接上 iOS。

**Q2：而家（未做 iOS 之前）修唔修網頁版嘅保安洞、收錢 bug 同測試搵到嘅 bug？**（致命 1、致命 2、高 1、高 2、中 7、低 1，加 E1 邀請碼、E2 banner 遮掣、E3 刪帳戶字眼）
- **A（建議）：全部即刻修。** 呢幾項同 iOS 無關，網頁版今日已經受影響。約 1.5–2 日，每項都有測試同注入驗證，修好先上線；E3 有新中文要你批。
- B：只修保安（致命 1、2、低 1），收錢 bug（高 1、高 2、中 7）遲啲。
- C：遲啲一齊做。

**Q3：ElitePro 將來會唔會收教練錢？**（landing page 寫「首五位教練，免費三個月」）
- **A：唔收（或者未諗好）→ 改走「三個月」字眼**，iOS 版唔使做 in-app purchase。
- **B：會收 → iOS 版要用 Apple in-app purchase 收（Apple 抽 15–30%），或者 iOS 版唔賣、只喺網站收。**
- **C（建議）：而家唔使決定**，iOS 版直接去登入頁、唔顯示 landing page（高 4 已包括），將來決定先處理。

**Q5：月費計劃收 52 堂嘅錢、俾 48 堂（E4）**
- **A（建議）：改成按每月實際堂數收**（£40 × 4 = £160），簡單、學生一睇就明。agent 改公式同測試；而家冇真學生用緊，唔影響任何人。
- B：保留收費，改成每次付款加 4.33 堂（一年 52 堂），要處理小數堂。
- C：保留現狀，卡上寫清楚「按一年 52 堂計，每月平均收費」。

**Q4（資訊，唔係決定）：你有冇 Apple Developer 帳戶（每年 US$99）？有冇 Mac？**
- iOS app 一定要喺 macOS 上面 build。agent 嘅環境係 Linux，做唔到；可以用 GitHub Actions 嘅 macOS 機 build，但簽名要你嘅 Apple 帳戶證書。

**只有你做得到嘅 console 工作**（唔係決定，係將來嘅動作，已入 BACKLOG）：API key 限制（中 12）、App Check（中 3）、Apple Developer 設定（如果 Q1 揀 B）、App Store Connect 填私隱標籤同截圖。

---

## 附錄 A：Rules 修正草稿〔RC〕（冇套用）

暫時套用落 `firestore.rules` 喺模擬器驗證過：4 個 rules 洞（致命 2 嘅 3 個 + 低 1）全部封咗，其餘 198 個測試仍然綠；之後已還原（`git diff --quiet firestore.rules` 確認同 HEAD 一樣）。致命 1（owner email）嘅 rules 部分未包括喺呢個草稿，要同 `findOwner()` 一齊改。

**注意（模擬器陷阱）**：模擬器會監察 `firestore.rules`，檔案一改就重新載入；今次兩次重新載入都經 proxy 出錯令模擬器死咗，令其中一輪測試結果作廢（已重跑）。之後驗證 rules 草稿，應該用測試自己載入嘅 rules 內容，唔好喺模擬器開住時改真檔。

```diff
diff --git a/firestore.rules b/firestore.rules
index 16a9ca3..0a9b6b2 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -287,7 +287,8 @@ service cloud.firestore {
     // Only the client themselves or their trainer can read/write entries
     match /bodyStats/{clientId} {
       allow read: if isOwner(clientId) || isTrainerOf(clientId);
-      allow write: if isOwner(clientId) || isTrainerOf(clientId);
+      // DRAFT (audit 2026-10-23): `write` included delete, so the coach could delete it too.
+      allow create, update: if isOwner(clientId) || isTrainerOf(clientId);
       allow delete: if isOwner(clientId);
       match /entries/{entryId} {
         allow read: if isOwner(clientId) || isTrainerOf(clientId);
@@ -301,13 +302,25 @@ service cloud.firestore {
     // Only the trainer who owns or the assigned client can read.
     match /workoutPlans/{planId} {
       allow read: if isAuth() && (resource.data.trainerId == request.auth.uid || resource.data.clientId == request.auth.uid);
-      allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid;
+      // DRAFT (audit 2026-10-23): the plan's client must be the author's own client.
+      allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid
+        && isTrainerOf(request.resource.data.clientId)
+        && isValidPlan(request.resource.data);
       // trainerId is immutable after creation
       allow update: if isAuth() && resource.data.trainerId == request.auth.uid
-        && request.resource.data.trainerId == resource.data.trainerId;
+        && request.resource.data.trainerId == resource.data.trainerId
+        && (request.resource.data.clientId == resource.data.clientId
+            || isTrainerOf(request.resource.data.clientId))
+        && isValidPlan(request.resource.data);
       allow delete: if isAuth() && resource.data.trainerId == request.auth.uid;
     }
 
+    // DRAFT (audit 2026-10-23): size limits so one write cannot fill a 1 MB document.
+    function isValidPlan(d) {
+      return d.name is string && d.name.size() <= 200
+        && (!('exercises' in d) || (d.exercises is list && d.exercises.size() <= 100));
+    }
+
     // ── Workout Logs ──
     // Only the client or their trainer can read.
     match /workoutLogs/{logId} {
@@ -467,11 +480,15 @@ service cloud.firestore {
         resource.data.trainerId == request.auth.uid ||
         resource.data.clientId == request.auth.uid
       );
-      allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid;
+      // DRAFT (audit 2026-10-23): addressed to the author's own client only.
+      allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid
+        && isTrainerOf(request.resource.data.clientId);
       // trainerId is immutable after creation
       allow update: if isTrainer()
         && resource.data.trainerId == request.auth.uid
-        && request.resource.data.trainerId == resource.data.trainerId;
+        && request.resource.data.trainerId == resource.data.trainerId
+        && (request.resource.data.clientId == resource.data.clientId
+            || isTrainerOf(request.resource.data.clientId));
       allow delete: if isTrainer() && resource.data.trainerId == request.auth.uid;
     }
 
```
