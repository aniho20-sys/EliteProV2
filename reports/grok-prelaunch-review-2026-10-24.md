# Grok Bot 上架前檢查報告（2026-10-24）— 副本

> 來源：https://elitepro-fypg.pages.grok.bot/ （Ani 2026-10-24 貼）。Grok Bot 對 826e0b4 做嘅只讀檢查。呢度只抄問題清單，原文仲有付款測試步驟同教練月費規則分析。
> Claude 2026-10-24 對照 code 核實咗嘅項目見 BACKLOG B75。

| 嚴重 | 類別 | 問題 | 位置 | 建議 | 邊個做 |
|---|---|---|---|---|---|
| 必須修正 | 上架要求 | 未有 iOS／Android app 包裝：冇 Capacitor 專案，冇 Google Play 用嘅 TWA（冇 assetlinks.json）。而家只係網頁 PWA。 | capacitor.config（不存在）、public/.well-known（不存在） | iOS 用 Capacitor 包；Android 用 TWA（Bubblewrap）或 Capacitor | agent 可代改 |
| 必須修正 | 上架要求 | 有「用 Google 登入」但冇「Sign in with Apple」，Apple 規則 4.8 一定要有。 | src/pages/LoginPage.jsx | Firebase Auth 加 Apple 登入 | agent 可代改 |
| 必須修正 | 上架要求 | Google 登入同「刪帳戶前再登入一次」都用 popup，喺 iOS app 殼入面會失效 → 用戶喺 app 內刪唔到帳戶（Apple 5.1.1(v) 要求一定刪到）。 | src/pages/ProfilePage.jsx:524（reauthenticateWithPopup）、src/context/AppContext.jsx | 改用原生登入插件 + 伺服器端「刪我嘅帳戶」function | agent 可代改 |
| 必須修正 | 付款 | 收錢流程（Stripe、GoCardless）從來未試過由頭到尾；Stripe 測試 key 好大機會仲未設定。 | functions/stripe*.js、functions/gc*.js | 跟下面「付款流程」嘅手機測試步驟試一次 | 要你做 |
| 必須修正 | 上架要求 | 私隱政策內容唔準：話有用 App Check／reCAPTCHA（其實冇）、冇提 Stripe／GoCardless／銀行資料、冇香港 PDPO、資料控制者寫「Elitepro Team」唔係真實身份、只有英文。 | src/pages/PrivacyPolicyPage.jsx:7、93、118、153 | 重寫（英國 UK GDPR + 香港 PDPO），出中文版 | agent 起草，你批 |
| 必須修正 | 上架要求 | 服務條款冇講付款、月費、取消、退款；「管轄法律」寫 applicable international law（冇效）；冇講清楚錢係直接俾教練、ElitePro 唔係收款方；2026-04-26 之後冇更新。 | src/pages/TermsPage.jsx:204 | 改英格蘭及威爾斯法律；分開教練條款同學生條款；加付款／取消／退款 | agent 起草，你批 |
| 必須修正 | 上架要求 | 試行開關仲開住（PILOT = true、SANDBOX = true），學生會見到「測試模式」字眼；審核員見到測試功能會拒（Apple 2.2）。 | functions/stripeSubscriptions.js、functions/gcSubscriptions.js、src/components/SubscriptionCard.jsx | 測試完先關；或者送審版本暫時收起月費 | 要你決定 |
| 必須修正 | 上架要求 | 商店素材未有：1024px app icon（而家最大 512px）、手機截圖、support 網址、App Store「私隱標籤」、Google Play「Data safety」表。 | public/manifest.json | agent 出 icon 同截圖；你喺 App Store Connect／Play Console 填表 | 要你做 |
| 高 | 上架要求 | ElitePro 向教練收月費嘅功能完全未有（code 入面冇任何平台收費、冇 IAP）。stripeSubscriptions.js 只係「學生俾錢教練」。 | functions/stripeSubscriptions.js（只限學生→教練） | 用 ElitePro 自己嘅 Stripe 帳戶（唔係 Connect）整網頁訂閱；見「教練月費」一節 | 要你決定 |
| 高 | 上架要求 | 如果喺 iOS app 內賣教練月費，一定要用 Apple IAP（規則 3.1.1）；英國同香港都唔准喺 app 內放「去網站付款」連結或者講網頁價錢。 | （將來嘅收費畫面） | 網頁收費、app 內唔提價錢；預備 IAP 做後備 | 要你決定 |
| 高 | 上架要求 | iOS app 殼入面網頁推送（FCM web push）唔會運作，要原生推送（APNs）。（推斷） | src/context/NotificationContext.jsx | Capacitor Push 插件 + Apple APNs key | agent 可代改 |
| 高 | 安全 | 邀請碼冇限速、冇 App Check：6 位碼可以被程式大量估，估中就連上教練、睇到教練收款銀行資料。 | functions/inviteCode.js、functions/inviteCodes.js（resolveInviteCode、connectWithInviteCode） | 每用戶／每 IP 限速 + App Check + 教練確認新學生 | agent 可代改 |
| 高 | 安全 | 全 app 冇 App Check，任何人可以繞過 app 直接叫 functions。 | 全 app | 開 App Check（網頁 reCAPTCHA Enterprise；iOS App Attest；Android Play Integrity） | agent 可代改 |
| 高 | 安全 | 網站冇安全 headers：冇 CSP、冇 X-Frame-Options／frame-ancestors（可被人嵌入做 clickjacking）、冇 X-Content-Type-Options、冇 Referrer-Policy。 | firebase.json | 加 headers（先用 report-only 試 CSP） | agent 可代改 |
| 高 | 安全 | react-router 7.13.2 有嚴重安全通告（7.18.2+ 修正）。你用純前端 HashRouter，實際影響應該好細（推斷），但要升級。 | package.json | 升 react-router | agent 可代改 |
| 高 | 安全 | functions 依賴有 1 個 critical（proxy-addr，同 IP 被偽造有關）+ 9 個 high。 | functions/package.json | npm audit fix、升 firebase-functions／firebase-admin，再跑 emulator 測試 | agent 可代改 |
| 高 | 付款 | Stripe 退款冇處理（冇 charge.refunded）：教練退咗錢，學生堂數仍然喺度。 | functions/stripeWebhooks.js | 處理 charge.refunded：扣返堂或者提醒教練 | agent 可代改 |
| 高 | 付款 | GoCardless 冇處理 billing_requests.fulfilled：學生授權完即刻關瀏覽器，計劃會一直「處理中」，直到有人撳「再檢查」。（推斷，未實試） | functions/gcWebhooks.js、functions/gcSubscriptions.js（completeSubscription） | webhook 收到就自動完成 | agent 可代改 |
| 高 | 付款 | 月費收 52 堂嘅錢、只俾 48 堂（B73，你未決定）；學生發現會投訴或者拒付。 | functions/gcSubscriptions.js:67（monthlyAmountPence） | 決定公式（例如每月 = 每堂價 × 堂數） | 要你決定 |
| 高 | 付款 | GoCardless「partner 連接」寫死 sandbox，其他教練連唔到正式 GoCardless；正式只可以貼 API token，對普通教練太技術。 | functions/index.js（gcOAuthCallback） | 上架只用 Stripe；GoCardless 只留俾你自己 | 要你決定 |
| 高 | 付款 | 喺 iOS app 殼入面跳去 Stripe／GoCardless 付款頁再返嚟會斷（返回網址開咗 Safari）。（推斷） | src/components/SubscriptionCard.jsx（返回網址） | 用 in-app browser + universal link 返 app | agent 可代改 |
| 高 | 付款 | 香港：伺服器支援 HK，但教練卡只俾揀英國（你 10-15 擱置）；「英國平台可唔可以開香港 connected account」未實試。 | src/components/StripeConnectCard.jsx:19（COUNTRY_OPTIONS） | 用測試模式開一個香港測試教練試，成功先加返 HK | 要你決定 |
| 高 | 安全 | 刪帳戶次序：先刪 Firestore 資料再刪登入，中途失敗會留低「冇資料嘅帳戶」；冇伺服器端刪帳戶。 | src/context/AppContext.jsx（deleteAccount） | 改做一個伺服器 function 一次過處理 | agent 可代改 |
| 高 | 上架要求 | 健康資料（傷患、身體數據）嘅「明確同意」同註冊綁埋一齊；UK GDPR 第 9 條要分開、主動剔。（推斷，唔係法律意見） | src/pages/PrivacyPolicyPage.jsx:111、src/pages/IntakeFormPage.jsx | 問卷前加獨立同意剔格，可隨時撤回 | agent 起草，你批 |
| 高 | 上架要求 | 資料控制者冇真實身份；英國處理健康資料一般要向 ICO 交 data protection fee。（推斷） | src/pages/PrivacyPolicyPage.jsx:7 | 寫你本人／公司名同聯絡地址；ICO 登記 | 要你做 |
| 高 | 安全 | 前教練仲睇到學生舊訓練記錄：學生斷開或者轉教練之後，舊教練照樣讀到佢以前嘅 workout logs，因為讀取權限睇每條記錄上面寫低嘅 trainerId，而唔係「而家係咪佢教練」（已讀 rules 確認）。 | firestore.rules:337–338（workoutLogs read）、src/context/AppContext.jsx:177 | read 改為 clientId 本人或 isTrainerOf(clientId)；斷開時清走舊 trainerId（伺服器做） | agent 可代改 |
| 高 | 上架要求 | 學生一連接教練，教練即刻讀到學生全部身體數據同入會問卷（包括傷患等健康資料），連接之前嘅舊記錄都睇到，冇任何告知或同意步驟（UK GDPR 第 9 條／PDPO 敏感資料）。（已讀 rules 確認；法律評估係推斷） | firestore.rules:299–310（bodyStats）、508–510（intakeForms）、isTrainerOf | 連接時顯示「你嘅教練會睇到：身體數據、問卷…」並要學生主動同意；可選唔分享舊記錄 | agent 起草，你批 |
| 中 | Bug | 冇教練嘅學生自己加嘅動作載入唔到：exercises 監聽遇到冇 trainerId 就即刻停；之後連接教練，佢自己加過嘅動作喺 app 消失（資料仲喺資料庫，冇刪）。（已讀 code 確認） | src/context/AppContext.jsx:206–207（exercises listener）、1028–1032（addExercise） | 學生冇教練時用自己 id 查；連接後一併載入自己嘅動作 | agent 可代改 |
| 中 | 付款 | 冇檢查「教練貨幣」同 Stripe 國家一致：英國教練揀咗 HKD 就會用 HKD 收、要換匯（反之亦然）。 | functions/stripeSubscriptions.js:55、functions/stripeConnect.js:19 | 貨幣跟國家鎖定（GB→GBP、HK→HKD） | agent 可代改 |
| 中 | 付款 | Stripe invoice.voided 冇處理 → 作廢咗嘅單會令計劃永遠「逾期」。 | functions/stripeWebhooks.js | 處理 voided | agent 可代改 |
| 中 | 付款 | Stripe API 版本冇鎖，Stripe 改版可能令回覆格式唔同。 | functions/stripeApi.js | 加 Stripe-Version header | agent 可代改 |
| 中 | 付款 | GoCardless webhook 密碼（GC_WEBHOOK_SECRET）2026-10-02 仲未設定（B34）；冇佢 GoCardless 收到錢 app 都唔知，堂數唔會自動加。 | Secret Manager（BACKLOG B34） | 跟 reports/gocardless-sandbox-setup-guide.md 第 7 節 | 要你做 |
| 中 | 安全 | 公開預約頁限流靠 IP，可以偽造（中2）。 | functions/publicBooking.js | App Check 或者驗證碼 | agent 可代改 |
| 中 | 安全 | firebase SDK 間接帶入 protobufjs、websocket-driver（critical）同 @grpc/grpc-js（high）。 | package-lock.json | 升 firebase | agent 可代改 |
| 中 | UI·UX | 約 45 句提示（toast）寫死英文，中文用戶會見到英文。 | WorkoutPlansPage.jsx（13）、TrainingProfilePage.jsx（5）、IntakeFormPage.jsx（5）、ProgressPage.jsx（3）、ProfilePage.jsx（3）、MessagesPage.jsx（2） | 搬入字典，你批中文 | agent 起草，你批 |
| 中 | UI·UX | 私隱政策同條款喺中文介面都只有英文（已實測截圖）；PDPO 要用對方明白嘅語言講收集目的。 | src/pages/PrivacyPolicyPage.jsx、src/pages/TermsPage.jsx | 出繁體中文版 | agent 起草，你批 |
| 中 | UI·UX | 訓練計劃卡「掣入面有掣」（button 包住 button）：無效 HTML，讀屏軟件會混亂，React 有警告（已實測）。 | src/pages/WorkoutPlansPage.jsx:452–460 | 拆開成兩個獨立元素 | agent 可代改 |
| 中 | UI·UX | 約 23 個彈出視窗只有 1 個有 role="dialog"，讀屏用戶唔知開咗視窗。 | src/components/*Modal* | 加 role、aria-modal、焦點鎖定 | agent 可代改 |
| 中 | UI·UX | 提示訊息冇 aria-live，讀屏讀唔到（中10）。 | src/context/ToastContext.jsx | 加 aria-live="polite" | agent 可代改 |
| 中 | Bug | 預約類型永遠顯示「60 min」，唔理實際時長（中9）。 | src/i18n/en.js:277（sched.type_duration） | 用真實時長 | agent 可代改 |
| 中 | Bug | 部分伺服器推送通知仍然係英文（中8）。 | functions/index.js | 跟收件人語言 | agent 可代改 |
| 中 | 上架要求 | 資料喺美國：Functions 喺 us-central1（已證實）；Firestore 位置 repo 冇寫，要喺 Firebase console 睇。私隱政策要講清楚跨境轉移保障。 | firebase.json、Firebase console | 私隱政策寫明 Google 嘅 UK 轉移保障（IDTA／UK Extension） | agent 起草，你批 |
| 中 | 上架要求 | Apple 4.2：純網頁包殼有被拒風險，要有 app 先有嘅功能（原生推送、Apple 登入等）。（推斷） | — | 同 Capacitor 一齊做原生推送 | agent 可代改 |
| 低 | UI·UX | 登入頁「深色模式」掣冇名稱，讀屏只讀「button」（axe 實測）。 | src/pages/LoginPage.jsx:98 | 加 aria-label | agent 可代改 |
| 低 | UI·UX | 首頁（landing）有一個可捲動區域用鍵盤去唔到（axe 實測）。 | src/pages/LandingPage.jsx | 加 tabIndex | agent 可代改 |
| 低 | Bug | 截圖工具壞咗：缺 LanguageProvider，一開就 crash，landing 截圖重整唔到（實測）。 | mock/main.jsx | 包 LanguageProvider | agent 可代改 |
| 低 | Bug | lint 有 1 個警告，唔影響使用。 | src/hooks/useRestTimer.js:159 | 保留或者重構 | agent 可代改 |
| 低 | Bug | 「刪無用 import」改動（b777dd2）未上線，因為 PR #4 早咗 merge。 | src/pages/ClientDetailPage.jsx | 開新 PR | 要你決定 |
| 低 | 安全 | ProfilePage 直接 import auth，繞過 context。 | src/pages/ProfilePage.jsx:7 | 經 AppContext | agent 可代改 |
| 低 | 安全 | GoCardless 重複通知檢查唔係完全原子（加堂本身已經喺 transaction 入面，所以唔會加兩次）。 | functions/gcWebhooks.js | 用 transaction 寫 gcEvents | agent 可代改 |
| 低 | 上架要求 | 聯絡 email 係 Gmail；商店要 support 網址，最好用自己網域。 | PrivacyPolicyPage.jsx、TermsPage.jsx | 開 support 頁 + 自己網域 email | 要你做 |
