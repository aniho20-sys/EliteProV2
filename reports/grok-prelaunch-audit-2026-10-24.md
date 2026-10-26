# Grok Bot 上架前檢查報告（2026-10-24，全文）

> 檢查日期：2026-10-24（英國時間）。代碼版本：部署分支 `claude/fitness-app-features-LbxtG` 嘅 `826e0b4`（PR #4 合併後）。只讀檢查。
> 原本放喺 Grok Bot 網頁（https://cursor.com/canvas/store-39fa263d-4f1d-46ba-90ab-1306cf5b5930/4721e8ee-337e-44ae-98de-952fe602d1b7）。`reports/grok-prelaunch-review-2026-10-24.md` 係 Claude 抄嘅問題清單副本；呢份係全文，加咗編號、付款測試步驟、教練月費規則分析同 2026-10-26 狀態。
> Claude 對照 code 核實嘅結果見 `reports/BACKLOG.md` B75。按 CLAUDE.md「Grok Bot 同 Claude 分工」，呢份報告只係建議，唔好當事實；每項改之前先核實，再問 Ani。

## 狀態更新（2026-10-26）

以 `origin/claude/fitness-app-features-LbxtG`（`b9824fb`）對過 code 同 BACKLOG。

**已修**
- **#26 前教練睇到舊訓練記錄**：已修（`7d73f02`）。`firestore.rules:341` 而家係「學生本人或者 `isTrainerOf(clientId)`」，教練 app 改為逐個學生聽記錄（BACKLOG B75）。
- **#28 冇教練嘅學生自己加嘅動作**：已修（`7d73f02`），學生 app 同時聽教練同自己 id 嘅動作。
- **#14 安全 headers**：已修（`7d73f02`）。`firebase.json` 加咗 nosniff、`X-Frame-Options: SAMEORIGIN`、`frame-ancestors`、`Referrer-Policy`。完整 CSP 未加（要先用 report-only 試）。
- **#48 無用 `MuscleSelector` import**：已修（`96ced8f`，B75 cherry-pick 上線）。

**部分處理**
- **#17 Stripe 退款**：`7d73f02` 加咗 `charge.refunded`（`functions/stripeWebhooks.js:257`）：退款後通知教練金額同邊個學生，**堂數同計劃唔郁**，教練自己去學生頁調整。呢個係 Ani 2026-10-24 揀嘅做法（「只通知教練」），唔係漏咗。Stripe webhook 而家要剔 **9 個** events（下面付款步驟原本寫 8 個）。

**同 Ani 決定相撞，唔係必做（CLAUDE.md 規則：Ani 嘅決定只有 Ani 改得）**
- **#2 Sign in with Apple、#3 iOS popup 再登入**：唔係阻礙。Ani 2026-10-23 決定 iOS 版淨係用 email + 密碼，唔做 Google 登入（BACKLOG B61）。Apple 4.8 只係喺有第三方登入時先要求 Apple 登入。刪帳戶前用密碼再登入已經有（`src/pages/ProfilePage.jsx:526`，`EmailAuthProvider`）。B61 仲有自己嘅工作：Google 用戶「加密碼」、iOS 版收埋 Google 掣、伺服器 `deleteMyAccount`（同 #23 有關）。
- **#19 月費 52 堂錢俾 48 堂**：待 Ani 拍板（B73，「月費嗰度要再諗諗」）。code 仍然係 `× 13 ÷ 12`（`functions/gcSubscriptions.js:67`）。
- **#20 收起 GoCardless、上架只用 Stripe**：Ani 從來冇決定過，唔係任務。
- **#9、#10 教練月費同 IAP**：Ani 未決定收唔收教練錢（B63）。
- **#22 香港 Stripe**：Ani 2026-10-15 擱置。

**仍然未做（重點）**
- **#27 健康資料同意**：教練一連接就睇到身體數據同問卷，仍然冇告知或同意步驟。
- **#12 邀請碼可以被估**：`functions/inviteCodes.js` 仍然冇限速，全 app 仍然冇 App Check（#13）。
- 其餘大部分項目未做，好多已經喺 BACKLOG B64 至 B71 排住（每項狀態見下表最後一欄）。iOS 相關項目要等 Ani 開 Apple Developer 帳戶（B62）。

**報告之後新增嘅相關項目**
- **B76 教練主頁學生多就慢**：修 #26 之後教練 app 逐個學生聽記錄，學生多就多即時同步。B76 兩步已經 2026-10-25 上線（只載最近 60 日、伺服器摘要；100 個學生同步由 214 個變 14 個）。仲剩：100 個學生主頁要 5.5 秒（主頁計算），同埋真機未撳（#36）。

## 摘要

**結論（2026-10-24）：未可以上 App Store／Google Play。** 網頁版本身大致穩陣（所有自動測試全部通過，付款 code 寫得小心），但有 8 項「必須修正」：未有 iOS／Android 包裝、冇 Apple 登入（之後見 B61，唔係阻礙）、iOS 入面刪唔到帳戶、收錢流程從未試過、私隱政策同條款要重寫、測試開關未關、商店素材未有。最大風險係付款：從未真正試過。

必須修正 8 項、高 19 項、中 16 項、低 8 項，合共 51 項。

「邊個做」：要你做 = 要 Ani 本人登入或者操作；要你決定 = 要 Ani 揀方向；agent 可代改 = 叫 agent 改 code；agent 起草，你批 = agent 寫，Ani 批。

## 全部問題

| # | 嚴重 | 類別 | 問題 | 位置（檔案:行） | 建議修正 | 邊個做 | 2026-10-26 狀態 |
|---|---|---|---|---|---|---|---|
| 1 | 必須修正 | 上架要求 | 未有 iOS／Android app 包裝：冇 Capacitor 專案，冇 Google Play 用嘅 TWA（冇 assetlinks.json）。而家只係網頁 PWA。 | capacitor.config（不存在）、public/.well-known（不存在） | iOS 用 Capacitor 包；Android 用 TWA（Bubblewrap）或 Capacitor | agent 可代改 | 未做（BACKLOG B64；B62 Ani 未有 Apple Developer 帳戶） |
| 2 | 必須修正 | 上架要求 | 有「用 Google 登入」但冇「Sign in with Apple」，Apple 規則 4.8 一定要有。 | src/pages/LoginPage.jsx | Firebase Auth 加 Apple 登入 | agent 可代改 | ⚪ 唔係阻礙：同 Ani 2026-10-23 決定（B61，iOS 淨係 email + 密碼）相撞 |
| 3 | 必須修正 | 上架要求 | Google 登入同「刪帳戶前再登入一次」都用 popup，喺 iOS app 殼入面會失效 → 用戶喺 app 內刪唔到帳戶（Apple 5.1.1(v) 要求一定刪到）。 | src/pages/ProfilePage.jsx:524（reauthenticateWithPopup）、src/context/AppContext.jsx | 改用原生登入插件 + 伺服器端「刪我嘅帳戶」function | agent 可代改 | ⚪ 唔係阻礙：同 B61 相撞；密碼再登入已有（ProfilePage.jsx:526 EmailAuthProvider） |
| 4 | 必須修正 | 付款 | 收錢流程（Stripe、GoCardless）從來未試過由頭到尾；Stripe 測試 key 好大機會仲未設定。 | functions/stripe*.js、functions/gc*.js | 跟下面「付款流程」嘅手機測試步驟試一次 | 要你做 | 未做（要 Ani 開 Stripe 測試 key） |
| 5 | 必須修正 | 上架要求 | 私隱政策內容唔準：話有用 App Check／reCAPTCHA（其實冇）、冇提 Stripe／GoCardless／銀行資料、冇香港 PDPO、資料控制者寫「Elitepro Team」唔係真實身份、只有英文。 | src/pages/PrivacyPolicyPage.jsx:7、93、118、153 | 重寫（英國 UK GDPR + 香港 PDPO），出中文版 | agent 起草，你批 | 未做（B68） |
| 6 | 必須修正 | 上架要求 | 服務條款冇講付款、月費、取消、退款；「管轄法律」寫 applicable international law（冇效）；冇講清楚錢係直接俾教練、ElitePro 唔係收款方；2026-04-26 之後冇更新。 | src/pages/TermsPage.jsx:204 | 改英格蘭及威爾斯法律；分開教練條款同學生條款；加付款／取消／退款 | agent 起草，你批 | 未做 |
| 7 | 必須修正 | 上架要求 | 試行開關仲開住（PILOT = true、SANDBOX = true），學生會見到「測試模式」字眼；審核員見到測試功能會拒（Apple 2.2）。 | functions/stripeSubscriptions.js、functions/gcSubscriptions.js、src/components/SubscriptionCard.jsx | 測試完先關；或者送審版本暫時收起月費 | 要你決定 | 未做（B64）；PILOT 仍然 = true |
| 8 | 必須修正 | 上架要求 | 商店素材未有：1024px app icon（而家最大 512px）、手機截圖、support 網址、App Store「私隱標籤」、Google Play「Data safety」表。 | public/manifest.json | agent 出 icon 同截圖；你喺 App Store Connect／Play Console 填表 | 要你做 | 未做（B70）；manifest 最大仍係 512px |
| 9 | 高 | 上架要求 | ElitePro 向教練收月費嘅功能完全未有（code 入面冇任何平台收費、冇 IAP）。stripeSubscriptions.js 只係「學生俾錢教練」。 | functions/stripeSubscriptions.js（只限學生→教練） | 用 ElitePro 自己嘅 Stripe 帳戶（唔係 Connect）整網頁訂閱；見「教練月費」一節 | 要你決定 | ⚫ 待 Ani 決定（B63：收唔收教練錢未決定） |
| 10 | 高 | 上架要求 | 如果喺 iOS app 內賣教練月費，一定要用 Apple IAP（規則 3.1.1）；英國同香港都唔准喺 app 內放「去網站付款」連結或者講網頁價錢。 | （將來嘅收費畫面） | 網頁收費、app 內唔提價錢；預備 IAP 做後備 | 要你決定 | ⚫ 待 Ani 決定（B63） |
| 11 | 高 | 上架要求 | iOS app 殼入面網頁推送（FCM web push）唔會運作，要原生推送（APNs）。（推斷） | src/context/NotificationContext.jsx | Capacitor Push 插件 + Apple APNs key | agent 可代改 | 未做（B64） |
| 12 | 高 | 安全 | 邀請碼冇限速、冇 App Check：6 位碼可以被程式大量估，估中就連上教練、睇到教練收款銀行資料。 | functions/inviteCode.js、functions/inviteCodes.js（resolveInviteCode、connectWithInviteCode） | 每用戶／每 IP 限速 + App Check + 教練確認新學生 | agent 可代改 | 🔴 未做：仍然冇限速、冇 App Check |
| 13 | 高 | 安全 | 全 app 冇 App Check，任何人可以繞過 app 直接叫 functions。 | 全 app | 開 App Check（網頁 reCAPTCHA Enterprise；iOS App Attest；Android Play Integrity） | agent 可代改 | 未做（B67、B69） |
| 14 | 高 | 安全 | 網站冇安全 headers：冇 CSP、冇 X-Frame-Options／frame-ancestors（可被人嵌入做 clickjacking）、冇 X-Content-Type-Options、冇 Referrer-Policy。 | firebase.json | 加 headers（先用 report-only 試 CSP） | agent 可代改 | ✅ 已修（7d73f02；完整 CSP 未加） |
| 15 | 高 | 安全 | react-router 7.13.2 有嚴重安全通告（7.18.2+ 修正）。你用純前端 HashRouter，實際影響應該好細（推斷），但要升級。 | package.json | 升 react-router | agent 可代改 | 未做（B71 npm 升級） |
| 16 | 高 | 安全 | functions 依賴有 1 個 critical（proxy-addr，同 IP 被偽造有關）+ 9 個 high。 | functions/package.json | npm audit fix、升 firebase-functions／firebase-admin，再跑 emulator 測試 | agent 可代改 | 未做（B71 npm 升級） |
| 17 | 高 | 付款 | Stripe 退款冇處理（冇 charge.refunded）：教練退咗錢，學生堂數仍然喺度。 | functions/stripeWebhooks.js | 處理 charge.refunded：扣返堂或者提醒教練 | agent 可代改 | 🟡 部分處理（7d73f02：通知教練，堂數唔郁，Ani 揀） |
| 18 | 高 | 付款 | GoCardless 冇處理 billing_requests.fulfilled：學生授權完即刻關瀏覽器，計劃會一直「處理中」，直到有人撳「再檢查」。（推斷，未實試） | functions/gcWebhooks.js、functions/gcSubscriptions.js（completeSubscription） | webhook 收到就自動完成 | agent 可代改 | 未做（未核實） |
| 19 | 高 | 付款 | 月費收 52 堂嘅錢、只俾 48 堂（B73，你未決定）；學生發現會投訴或者拒付。 | functions/gcSubscriptions.js:67（monthlyAmountPence） | 決定公式（例如每月 = 每堂價 × 堂數） | 要你決定 | ⚫ 待 Ani 拍板（B73） |
| 20 | 高 | 付款 | GoCardless「partner 連接」寫死 sandbox，其他教練連唔到正式 GoCardless；正式只可以貼 API token，對普通教練太技術。 | functions/index.js（gcOAuthCallback） | 上架只用 Stripe；GoCardless 只留俾你自己 | 要你決定 | ⚪ 唔係任務：Ani 冇決定過收起 GoCardless |
| 21 | 高 | 付款 | 喺 iOS app 殼入面跳去 Stripe／GoCardless 付款頁再返嚟會斷（返回網址開咗 Safari）。（推斷） | src/components/SubscriptionCard.jsx（返回網址） | 用 in-app browser + universal link 返 app | agent 可代改 | 未做（B64） |
| 22 | 高 | 付款 | 香港：伺服器支援 HK，但教練卡只俾揀英國（你 10-15 擱置）；「英國平台可唔可以開香港 connected account」未實試。 | src/components/StripeConnectCard.jsx:19（COUNTRY_OPTIONS） | 用測試模式開一個香港測試教練試，成功先加返 HK | 要你決定 | ⚫ Ani 2026-10-15 擱置 |
| 23 | 高 | 安全 | 刪帳戶次序：先刪 Firestore 資料再刪登入，中途失敗會留低「冇資料嘅帳戶」；冇伺服器端刪帳戶。 | src/context/AppContext.jsx（deleteAccount） | 改做一個伺服器 function 一次過處理 | agent 可代改 | 未做（B61 伺服器 deleteMyAccount） |
| 24 | 高 | 上架要求 | 健康資料（傷患、身體數據）嘅「明確同意」同註冊綁埋一齊；UK GDPR 第 9 條要分開、主動剔。（推斷，唔係法律意見） | src/pages/PrivacyPolicyPage.jsx:111、src/pages/IntakeFormPage.jsx | 問卷前加獨立同意剔格，可隨時撤回 | agent 起草，你批 | 🔴 未做 |
| 25 | 高 | 上架要求 | 資料控制者冇真實身份；英國處理健康資料一般要向 ICO 交 data protection fee。（推斷） | src/pages/PrivacyPolicyPage.jsx:7 | 寫你本人／公司名同聯絡地址；ICO 登記 | 要你做 | 未做（要 Ani 做） |
| 26 | 高 | 安全 | 前教練仲睇到學生舊訓練記錄：學生斷開或者轉教練之後，舊教練照樣讀到佢以前嘅 workout logs，因為讀取權限睇每條記錄上面寫低嘅 trainerId，而唔係「而家係咪佢教練」（已讀 rules 確認）。 | firestore.rules:337–338（workoutLogs read）、src/context/AppContext.jsx:177 | read 改為 clientId 本人或 isTrainerOf(clientId)；斷開時清走舊 trainerId（伺服器做） | agent 可代改 | ✅ 已修（7d73f02） |
| 27 | 高 | 上架要求 | 學生一連接教練，教練即刻讀到學生全部身體數據同入會問卷（包括傷患等健康資料），連接之前嘅舊記錄都睇到，冇任何告知或同意步驟（UK GDPR 第 9 條／PDPO 敏感資料）。（已讀 rules 確認；法律評估係推斷） | firestore.rules:299–310（bodyStats）、508–510（intakeForms）、isTrainerOf | 連接時顯示「你嘅教練會睇到：身體數據、問卷…」並要學生主動同意；可選唔分享舊記錄 | agent 起草，你批 | 🔴 未做 |
| 28 | 中 | Bug | 冇教練嘅學生自己加嘅動作載入唔到：exercises 監聽遇到冇 trainerId 就即刻停；之後連接教練，佢自己加過嘅動作喺 app 消失（資料仲喺資料庫，冇刪）。（已讀 code 確認） | src/context/AppContext.jsx:206–207（exercises listener）、1028–1032（addExercise） | 學生冇教練時用自己 id 查；連接後一併載入自己嘅動作 | agent 可代改 | ✅ 已修（7d73f02） |
| 29 | 中 | 付款 | 冇檢查「教練貨幣」同 Stripe 國家一致：英國教練揀咗 HKD 就會用 HKD 收、要換匯（反之亦然）。 | functions/stripeSubscriptions.js:55、functions/stripeConnect.js:19 | 貨幣跟國家鎖定（GB→GBP、HK→HKD） | agent 可代改 | 未做 |
| 30 | 中 | 付款 | Stripe invoice.voided 冇處理 → 作廢咗嘅單會令計劃永遠「逾期」。 | functions/stripeWebhooks.js | 處理 voided | agent 可代改 | 未做（B71） |
| 31 | 中 | 付款 | Stripe API 版本冇鎖，Stripe 改版可能令回覆格式唔同。 | functions/stripeApi.js | 加 Stripe-Version header | agent 可代改 | 未做（B52 跟進） |
| 32 | 中 | 付款 | GoCardless webhook 密碼（GC_WEBHOOK_SECRET）2026-10-02 仲未設定（B34）；冇佢 GoCardless 收到錢 app 都唔知，堂數唔會自動加。 | Secret Manager（BACKLOG B34） | 跟 reports/gocardless-sandbox-setup-guide.md 第 7 節 | 要你做 | 未做（B34） |
| 33 | 中 | 安全 | 公開預約頁限流靠 IP，可以偽造（中2）。 | functions/publicBooking.js | App Check 或者驗證碼 | agent 可代改 | 未做（B67） |
| 34 | 中 | 安全 | firebase SDK 間接帶入 protobufjs、websocket-driver（critical）同 @grpc/grpc-js（high）。 | package-lock.json | 升 firebase | agent 可代改 | 未做（B71 npm 升級） |
| 35 | 中 | UI·UX | 約 45 句提示（toast）寫死英文，中文用戶會見到英文。 | WorkoutPlansPage.jsx（13）、TrainingProfilePage.jsx（5）、IntakeFormPage.jsx（5）、ProgressPage.jsx（3）、ProfilePage.jsx（3）、MessagesPage.jsx（2） | 搬入字典，你批中文 | agent 起草，你批 | 未做（B65） |
| 36 | 中 | UI·UX | 私隱政策同條款喺中文介面都只有英文（已實測截圖）；PDPO 要用對方明白嘅語言講收集目的。 | src/pages/PrivacyPolicyPage.jsx、src/pages/TermsPage.jsx | 出繁體中文版 | agent 起草，你批 | 未做 |
| 37 | 中 | UI·UX | 訓練計劃卡「掣入面有掣」（button 包住 button）：無效 HTML，讀屏軟件會混亂，React 有警告（已實測）。 | src/pages/WorkoutPlansPage.jsx:452–460 | 拆開成兩個獨立元素 | agent 可代改 | 未做 |
| 38 | 中 | UI·UX | 約 23 個彈出視窗只有 1 個有 role="dialog"，讀屏用戶唔知開咗視窗。 | src/components/*Modal* | 加 role、aria-modal、焦點鎖定 | agent 可代改 | 未做（B66） |
| 39 | 中 | UI·UX | 提示訊息冇 aria-live，讀屏讀唔到（中10）。 | src/context/ToastContext.jsx | 加 aria-live="polite" | agent 可代改 | 未做（B66）；ToastContext 仍然冇 aria-live |
| 40 | 中 | Bug | 預約類型永遠顯示「60 min」，唔理實際時長（中9）。 | src/i18n/en.js:277（sched.type_duration） | 用真實時長 | agent 可代改 | 未做（B65） |
| 41 | 中 | Bug | 部分伺服器推送通知仍然係英文（中8）。 | functions/index.js | 跟收件人語言 | agent 可代改 | 未做（B65） |
| 42 | 中 | 上架要求 | 資料喺美國：Functions 喺 us-central1（已證實）；Firestore 位置 repo 冇寫，要喺 Firebase console 睇。私隱政策要講清楚跨境轉移保障。 | firebase.json、Firebase console | 私隱政策寫明 Google 嘅 UK 轉移保障（IDTA／UK Extension） | agent 起草，你批 | 未做 |
| 43 | 中 | 上架要求 | Apple 4.2：純網頁包殼有被拒風險，要有 app 先有嘅功能（原生推送、Apple 登入等）。（推斷） | （冇特定檔案） | 同 Capacitor 一齊做原生推送 | agent 可代改 | 未做（B64） |
| 44 | 低 | UI·UX | 登入頁「深色模式」掣冇名稱，讀屏只讀「button」（axe 實測）。 | src/pages/LoginPage.jsx:98 | 加 aria-label | agent 可代改 | 未做（B66） |
| 45 | 低 | UI·UX | 首頁（landing）有一個可捲動區域用鍵盤去唔到（axe 實測）。 | src/pages/LandingPage.jsx | 加 tabIndex | agent 可代改 | 未做 |
| 46 | 低 | Bug | 截圖工具壞咗：缺 LanguageProvider，一開就 crash，landing 截圖重整唔到（實測）。 | mock/main.jsx | 包 LanguageProvider | agent 可代改 | 未做；mock/main.jsx 仍然冇 LanguageProvider |
| 47 | 低 | Bug | lint 有 1 個警告，唔影響使用。 | src/hooks/useRestTimer.js:159 | 保留或者重構 | agent 可代改 | 未做 |
| 48 | 低 | Bug | 「刪無用 import」改動（b777dd2）未上線，因為 PR #4 早咗 merge。 | src/pages/ClientDetailPage.jsx | 開新 PR | 要你決定 | ✅ 已修（96ced8f） |
| 49 | 低 | 安全 | ProfilePage 直接 import auth，繞過 context。 | src/pages/ProfilePage.jsx:7 | 經 AppContext | agent 可代改 | 未做（B71） |
| 50 | 低 | 安全 | GoCardless 重複通知檢查唔係完全原子（加堂本身已經喺 transaction 入面，所以唔會加兩次）。 | functions/gcWebhooks.js | 用 transaction 寫 gcEvents | agent 可代改 | 未做（B71） |
| 51 | 低 | 上架要求 | 聯絡 email 係 Gmail；商店要 support 網址，最好用自己網域。 | PrivacyPolicyPage.jsx、TermsPage.jsx | 開 support 頁 + 自己網域 email | 要你做 | 未做（B70） |

## 付款流程

**一句講晒：** code 寫得好小心（簽名驗證、同一筆錢唔會加兩次堂、會再向 Stripe／GoCardless 核實先加堂、教練之間互相隔離），但從來未真正試過，而且有幾個漏洞：退款冇處理（之後見 #17 狀態）、GoCardless 學生關咗瀏覽器會卡住、月費 52／48 堂未決定、iOS 入面跳轉會斷。

### 測試 key／設定有冇？

Secret Manager 入面嘅嘢睇唔到，以下係根據 repo 記錄推斷，冇印出任何 key。

| 項目 | 情況 |
|---|---|
| Stripe 測試 key | 好大機會未設定。BACKLOG（B49、B56，最後 2026-10-23）仍然寫「等 Ani 開 Stripe 測試帳戶、貼 key」。可以自己查：Profile「ElitePro 的 Stripe」卡，見到「已設定」同「測試模式」先算有。 |
| Stripe webhook | 未知；要喺 Stripe 揀 events（2026-10-24 起係 9 個），網址係 stripeWebhook（見 `reports/stripe-setup-guide.md`）。 |
| GoCardless sandbox 連接 | 有：2026-09-23 Ani 真機撳 Connect 成功（BACKLOG A6）。 |
| GoCardless webhook 密碼 | 2026-10-02 記錄仲未做（B34）。冇佢，sandbox 收到錢 app 都唔會加堂。 |
| GoCardless 正式戶口 | Ani 話開咗（B37），但冇學生用。 |
| 測試／正式切換 | Stripe 由 key 開頭（sk_test／sk_live）自動分，並向 Stripe 核實；GoCardless 每個教練連接自己記住 sandbox／正式；轉正式時會自動作廢 sandbox 計劃（有測試）。 |

### 每條路線檢查結果

| 路線 | 情況 | 結果 |
|---|---|---|
| 開付款頁（Checkout） | 只有標記咗 subscriptionTester 嘅學生可以開；金額用整數便士計；GBP 教練 + 英國戶口先有 Bacs，其他只有卡。 | 大致 OK |
| Webhook 簽名 | Stripe：HMAC-SHA256、5 分鐘時限、timingSafeEqual。GoCardless：timingSafeEqual，錯就回 498。 | OK（已讀 code） |
| 重複／遲到通知 | 每筆付款喺 transaction 入面寫 creditLedger/subpay-&lt;id&gt;，重複唔會加兩次；GoCardless 會再查一次付款狀態先郁。 | OK（有測試） |
| 加堂 | Stripe 同 GoCardless 共用 grantForPayment；roll-over 已改用 chargedSession（舊高 2 已修）。 | OK |
| 退款 | Stripe 冇處理 charge.refunded；GoCardless 有處理 charged_back。 | 有漏洞（2026-10-24 改為通知教練，見 #17） |
| 扣款失敗 | Stripe invoice.payment_failed、GoCardless payments.failed：逾期 + 通知。 | OK |
| 作廢單 | Stripe invoice.voided 冇處理，可能永遠逾期。 | 有漏洞 |
| 取消／mandate 取消 | GoCardless subscriptions.cancelled、mandates.cancelled／failed／expired；Stripe subscription.deleted。教練斷開會先取消計劃（舊高 1 已修）。 | OK |
| 拒付（dispute） | Stripe charge.dispute.created 會通知。 | OK |
| GoCardless 授權完成 | 冇 billing_requests.fulfilled；靠返回網址或者「再檢查」。 | 有漏洞 |
| 金額 | monthlyAmountPence = 每堂價 × 堂數 × 13 ÷ 12，四捨五入到便士，即係一年收 52 堂錢、俾 48 堂。 | 要 Ani 決定（B73） |
| 貨幣 | Stripe：GBP／HKD／USD／EUR／SGD／AUD（全部 2 位小數，計法啱）；GoCardless 只限 GBP。冇檢查貨幣同國家一致。 | 小問題 |

### 英國同香港教練用 Stripe Connect（多教練平台）

| 項目 | 而家 code 點做 | 意思 |
|---|---|---|
| 戶口類型 | 用 controller 設定開戶：教練有完整 Stripe dashboard、Stripe 收費由教練戶口俾、Stripe 負責虧損、身份審核由 Stripe 收（等同以前嘅 Standard 戶口）。收費係 direct charge，錢直入教練戶口，唔經 ElitePro。 | ElitePro 唔係收款方；教練自己對學生負責。 |
| 拒付／負結餘 | losses.payments = stripe；拒付費同退款由教練戶口扣。 | 教練承擔拒付；教練走數嘅話係 Stripe 承擔，唔係 Ani。要喺教練條款講明。 |
| 平台費 | 冇 application_fee，ElitePro 喺付款度一分錢都唔收。 | 收入要靠「教練月費」（下一節）。 |
| 身份審核（KYC） | requirement_collection = stripe，教練喺 Stripe 自己嘅頁面填資料，ElitePro 唔掂身份證。只有 charges_enabled 先當「已連接」。 | 好。香港教練可能要香港身份證、商業登記證（BR）同香港銀行戶口（推斷，以 Stripe 頁面為準）。 |
| 香港 HKD 流程 | 伺服器支援 HK 用 HKD，卡付款（冇 Bacs）；UI 收起咗。香港卡手續費約 3.4% + HK$2.35，加 Billing 0.7%，約 4%（BACKLOG 記錄）。 | 技術上差唔多可以開，但「英國平台開唔開到香港戶口」未實試。測試模式試一次就知。 |
| GoCardless | 只限英國、只限 GBP（Bacs）。其他教練要正式用，一係等 GoCardless 批 partner app，一係自己貼 API token。 | 對其他教練唔實際。 |

**原報告建議：上架只用 Stripe，GoCardless 收起。** ⚪ 2026-10-26 註：Ani 冇決定過收起 GoCardless，呢個唔係任務（見狀態更新）。

### 手機測試步驟：Stripe 測試模式（唔涉及真錢）

1. **開 Stripe 測試帳戶，貼 key**：跟 `reports/stripe-setup-guide.md`：dashboard 保持 Test mode，複製測試 secret key，加 webhook（Events from 揀 Connected accounts，揀晒指南列嘅 events，而家係 9 個），喺 app Profile「ElitePro 的 Stripe」貼 key 同 webhook 密碼。見到「已設定」同「測試模式」先繼續。key 唔好貼落 chat。
2. **連自己嘅教練戶口**：Profile「每月計劃」，揀英國，跟 Stripe 頁面填（測試模式可以用假資料），返 app 見到「已連接」。
3. **整一個測試學生**：用另一個 email 喺私密瀏覽視窗註冊做學生，用自己嘅邀請碼連。返教練帳戶，學生頁撳「月費測試」掣（subscriptionTester）。
4. **成功付款**：學生帳戶月費卡揀計劃，Stripe 頁面輸入卡號 4242 4242 4242 4242、任何未來日期（例如 12/34）、任何 3 位 CVC、任何郵編。返 app：計劃變「生效」，堂數加咗。
5. **3D Secure 驗證卡**：取消後再試，用 4000 0025 0000 3155，彈出驗證頁撳 Complete／Fail 兩個都試。
6. **被拒絕嘅卡**：4000 0000 0000 0002（一般拒絕）、4000 0000 0000 9995（餘額不足）：應該唔會開到計劃，app 唔會加堂。
7. **之後扣款失敗**：用 4000 0000 0000 0341（卡可以存，但扣錢會失敗）：計劃應該變「逾期」，教練同學生都收到通知。
8. **英國 Bacs（如果有）**：揀 Bacs，sort code 10-88-00、account 00012345（成功）。Bacs 測試付款要一陣先「成功」，堂數等收到錢先加。
9. **重複通知**：Stripe dashboard → Developers → Webhooks，揀一個 invoice.paid，撳 Resend。返 app：堂數唔應該再加。
10. **退款**：Stripe dashboard → Connect → 測試教練戶口 → Payments，揀一筆撳 Refund。2026-10-24 之後預期：教練收到「Refund sent」通知，堂數同計劃唔變（Ani 揀嘅做法）。
11. **取消**：學生 app 撳取消月費：Stripe 入面訂閱應該變 canceled，app 計劃變「已取消」，已加嘅堂保留。
12. **香港（可選）**：用另一個教練測試帳戶揀香港（要先加返 HK 選項），睇下 Stripe 肯唔肯開。教練貨幣設 HKD，用 4242 卡試。

### 手機測試步驟：GoCardless sandbox（如果仲想保留）

1. **設定 webhook 密碼（B34）**：跟 `reports/gocardless-sandbox-setup-guide.md` 第 7 節。完成標準：GoCardless sandbox 嘅 webhook 記錄顯示 200（503 = 未設密碼；498 = 密碼錯）。
2. **測試學生訂閱**：學生帳戶揀 GoCardless 月費，銀行資料用 sandbox 測試戶口：sort code 20-00-00、account 55779911，名同地址隨便。
3. **授權完即刻關瀏覽器**：睇下計劃係咪卡住「處理中」（預期會，證實 billing_requests.fulfilled 漏洞）；再撳「再檢查」應該會好返。
4. **模擬收到錢／失敗**：manage-sandbox.gocardless.com → Developers → Scenario simulators：模擬付款成功，堂數加；模擬付款失敗，計劃逾期 + 通知；模擬 mandate 取消，計劃取消。
5. **重複通知**：喺 GoCardless 嘅 webhook 記錄撳 retry，堂數唔應該再加。

## 教練月費（App Store／Google Play 規則）

⚫ 2026-10-26 註：收唔收教練錢 Ani 未決定（B63）。以下係規則分析，唔係任務。

**而家 code 有咩：** 冇。成個 repo 冇任何「教練俾錢 ElitePro」嘅功能（冇平台 Stripe 訂閱、冇 Apple IAP、冇 Google Play Billing、冇 RevenueCat）。stripeSubscriptions.js 同 gcSubscriptions.js 只係「學生俾錢教練」。

| 收邊種錢 | Apple App Store | Google Play |
|---|---|---|
| 學生俾教練上堂錢（真人面對面／實時一對一） | 唔使、亦唔可以用 IAP：屬「app 以外嘅實體服務」（3.1.3(e)）同一對一實時服務（3.1.3(d)）。現有 Stripe／GoCardless 做法 OK。 | 實體服務唔使用 Play Billing，OK。 |
| 教練俾 ElitePro 嘅月費（用 app 功能＝數碼服務） | 喺 app 入面賣就一定要 IAP（3.1.1），Apple 收 15%（細公司計劃）或者 30%。只喺網頁賣、app 入面完全唔提價錢、唔放連結，屬「多平台服務」（3.1.3(b)），但條文寫明同一樣嘢「亦要喺 app 入面有 IAP」，所以單靠網頁有被拒風險（推斷：好多商業工具咁做都過到，但冇保證）。 | 喺 app 入面賣要用 Play Billing；英國由 2026-06-30 起可以參加「billing choice」計劃，用自己 Stripe 或者網頁連結，但一定要同時俾用戶揀 Play Billing；月費服務費 10%（用 Play Billing 再加 5%）。香港冇呢個計劃。只喺網頁賣、app 入面唔提，一般可以。 |
| 可唔可以喺 app 入面寫「去網站訂閱」？ | 英國：唔可以。CMA 嘅 steering 規定 2026 年 6 至 7 月先諮詢，以 2026-10 計未生效。香港：唔可以。只有美國 App Store 現時准放外部付款連結。 | 英國：參加 billing choice 計劃就可以（有費用）。香港：唔可以。 |

**建議（短）：** 第一步：教練月費只喺網頁（elitepro-16718.web.app）用 ElitePro 自己嘅 Stripe 帳戶收（Stripe Billing，唔係 Connect）；iOS／Android app 只係「登入已有帳戶」，入面唔出價錢、唔出「訂閱」掣、唔放連結。伺服器記低每個教練嘅「有效計劃」，以後 IAP 都寫入同一個位置。第二步：同時預備 Apple IAP（可以用 RevenueCat 管理），萬一 Apple 審核要求就即刻加；申請 Apple 細公司計劃（15%）。第三步：英國 CMA 規定生效後，再考慮 app 內連去網頁付款。學生俾教練嘅錢維持 Stripe，唔受影響。

## 安全

**做得好：** Firestore rules 有 205 條 emulator 測試全部通過；所有 callable 都檢查登入，owner 功能用 isOwnerToken；Stripe／GoCardless webhook 驗簽名；src 入面冇 dangerouslySetInnerHTML；預約頁預覽有 escape HTML；repo 入面冇搵到真 key（只係檢查格式嘅 regex）。

**上次審查（`reports/appstore-security-audit-2026-10-23.md`）：** 致命 1（owner 判斷）、致命 2（isTrainerOf 檢查計劃同發票）、高 1、高 2、中 7、低 1、E1 至 E3，睇 code 確認已修。仍未修：App Check（中3）、IP 限流可偽造（中2）、私隱政策（中6）、硬寫英文（高6 部分）、推送英文（中8）、60 min（中9）、Toast aria-live（中10）、iOS 刪帳戶（致命5）、測試字眼（致命6）、Stripe voided（低6）。

**最要緊（2026-10-24）：** 前教練仲讀到學生舊訓練記錄（已修，#26）、教練一連接就睇晒健康資料而冇同意步驟（#27，未做）、邀請碼可以被估（#12，未做）、冇安全 headers（已修，#14）、依賴有 critical 通告（#15、#16、#34，未做）。

## Bug

- lint 0 個錯誤、1 個警告；build 成功；前端 614／614、functions 370／370、rules 205／205 全部通過（2026-10-24 數字）。
- 實際跑 app（390×844 手機尺寸，中英文）：首頁、登入、私隱、條款、預約頁（連結失效時）冇 JavaScript 錯誤、冇橫向溢出。
- 發現：訓練計劃卡掣入面有掣（React 警告）；截圖工具 mock/main.jsx 會 crash；60 min 寫死；部分推送英文。
- 時區：預約頁英國教練寫明「英國時間」；提醒按教練時區計（有 zonedTime 測試）。冇發現新問題。離線／PWA：有 OfflineBanner 同 workbox 預載；冇實機測試離線。

## UI·UX

- 登入頁（中文）：排版清楚、全部中文、字夠大；但深色模式掣冇名稱。（原報告話冇 Apple 登入掣，見 B61，唔係阻礙。）
- 私隱政策／條款頁：中文介面打開都係全英文（截圖已確認）。預約頁失效時有清楚中文訊息「此預約頁面暫不可用」。
- 約 45 句提示仍然英文；彈出視窗大部分冇 dialog 標記；Toast 讀屏讀唔到。
- 截圖冇放入 repo。登入後嘅訓練畫面因為截圖工具 crash 冇影到。

## 上架要求同法律

| 項目 | 情況 | 狀態 |
|---|---|---|
| iOS 包裝（Capacitor） | 未有。Apple Developer 帳戶 US$99／年要 Ani 開（B62：未有）。 | 未做 |
| Google Play（TWA 或 Capacitor） | 未有 assetlinks.json、未有專案。Play 帳戶 US$25 一次過。 | 未做 |
| Sign in with Apple | 原報告寫「必須」。⚪ 2026-10-26：同 Ani 決定（B61，iOS 淨係 email + 密碼）相撞，唔係必須。 | 唔使做 |
| App 內刪帳戶 | 網頁有；原報告話 iOS 殼入面會因為 popup 失效。iOS 冇 Google 登入就用密碼再登入（已有）；伺服器 deleteMyAccount 仍然未做（B61）。 | 要改 |
| 私隱標籤／Data safety | 未填。要申報：電郵、名、健康及健身資料、付款資料（由 Stripe 處理）、錯誤報告。 | 未做 |
| Icon、截圖、support 網址 | icon 最大 512px，要 1024px；截圖未有。 | 未做 |
| 私隱政策：UK GDPR | 有基本架構（法律依據表、權利、保留期），但內容有錯、控制者身份唔清、健康資料同意綁埋註冊、冇 ICO 登記。 | 要改 |
| 私隱政策：香港 PDPO | 完全冇提。需要收集個人資料聲明（PICS）、用途、轉移對象、查閱及更正權利，最好中文。香港暫時冇強制限制資料傳去海外（第 33 條未生效）。（推斷，唔係法律意見） | 未做 |
| 條款：教練 vs 學生 | 而家一份條款包晒。建議分開：教練條款（教練係收款方、自己負責退款／拒付、Stripe 戶口條款、平台月費）；學生條款（月費、取消、退款、英國消費者法 14 日冷靜期）。 | 要改 |
| 資料所在地 | Functions 喺美國 us-central1（已證實）；Firestore 位置要喺 Firebase console 睇（建立後改唔到）。私隱政策要寫清楚轉移保障。 | 要寫清楚 |

## 測試結果（2026-10-24）

| 項目 | 結果 | 備註 |
|---|---|---|
| ESLint | 0 錯誤、1 警告 | useRestTimer.js:159 |
| Build（vite） | 成功 | |
| 前端測試（vitest，Node 22） | 614 / 614 | Node 20 會因 jsdom 失敗，CI 已用 Node 22 |
| Functions 測試（emulator） | 370 / 370（20 組） | 其中付款相關 167 條：stripe 73、gcSubscriptions 37、gcWebhooks 25、gcDirect 13、gcOAuthNonce 10、gcOAuthErrors 6、gcSecrets 3 |
| Firestore rules 測試（emulator） | 205 / 205（14 組） | 只用 emulator，冇掂正式資料 |
| npm audit（前端，正式依賴） | 6 項：2 critical、3 high、1 moderate | react-router + firebase SDK 間接依賴 |
| npm audit（前端，全部） | 25 項 | 包括開發工具 |
| npm audit（functions） | 24 項：1 critical、9 high | proxy-addr、body-parser、form-data、protobufjs |
| Playwright 手機實跑（390×844，中／英） | 冇 JS 錯誤、冇溢出 | 首頁、登入、私隱、條款、預約頁 |
| axe 無障礙（WCAG 2 AA） | 2 項 | 登入頁掣冇名稱；首頁捲動區鍵盤用唔到 |
| Stripe／GoCardless 真實流程 | 未測 | 要 Ani 跟上面步驟用手機試 |

## 已驗證 vs 推斷

- **已驗證（跑過或讀過 code）：** 所有測試數字、npm audit、lint／build、安全 headers 缺失、App Check 缺失、邀請碼冇限速、Stripe／GoCardless 處理咗同冇處理嘅 events、金額公式、HK 選項被收起、冇平台收費 code、私隱政策／條款內容、掣入面有掣、截圖工具 crash、axe 結果。
- **推斷（未實試）：** GoCardless 關瀏覽器會卡住、iOS 殼入面 popup／推送／付款跳轉會壞、react-router 通告實際影響細、Stripe 測試 key 未設定（靠 BACKLOG 記錄）、香港 Stripe 開戶要咩文件、Apple 對「只喺網頁收費」嘅取態、所有法律要求（GDPR、PDPO、ICO、消費者法；唔係法律意見，正式上架前最好問律師）。
- **冇做：** 檢查期間冇改任何 GitHub 嘢、冇讀 Secret Manager、冇印任何 key。
