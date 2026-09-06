# 收款 Provider 查證報告 —— 英國 + 香港雙市場

**日期**：2026-09-06
**要求人**：Ani
**範圍**：查證 only，**冇改任何 code**
**背景**：9 個真實學生（全部英國生活、英國銀行戶口）、1 個教練（Ani 本人）、0 個外部教練。目標係雙市場同步推。

---

## 摘要 —— 四條問題嘅答案

| # | 問題 | 答案 |
|---|---|---|
| 1 | GoCardless 支唔支援香港商戶？ | **唔支援。** 34 個商戶國家名單入面冇香港，8 隻支援貨幣入面冇 HKD。冇 workaround。 |
| 2 | Stripe 香港訂閱可唔可行？ | **可行，但淨係得信用卡。** 3.4% + HK$2.35，冇 FPS、冇任何香港銀行扣賬方式收客戶錢。 |
| 3 | eDDA 整合到唔到？ | **直接整合唔到**（要銀行/HKICL 核准 payee 資格）。但 **Airwallex 有 FPS 收款 + 支援 recurring**，係目前最接近嘅方案。 |
| 4 | 現有架構夾唔夾到第二個 provider？ | **模式夾得到，命名夾唔到。** 而家改係免費，遲啲改會被你自己嘅常規 #27 永久封死。 |

**一句結論**：香港做得到自動月費，但**唔係用銀行扣賬，係用信用卡**，而且成本大約係英國嘅 **3 倍**。呢個唔會殺死香港市場，但會改變定價。

---

## Q1 — GoCardless 香港：確認唔支援

GoCardless 官方 FAQ 列明商戶可註冊嘅國家共 **34 個**：

> Australia, Austria, Belgium, Bulgaria, Canada, Croatia, Cyprus, Czech Republic,
> Denmark, Finland, France, Germany, Hungary, Italy, Luxembourg, Malta,
> Netherlands, New Zealand, Norway, Poland, Portugal, Republic of Ireland,
> Romania, Slovakia, Slovenia, South Africa, Spain, Sweden, Switzerland,
> United Kingdom, United States

**冇香港。** 支援貨幣係 GBP / EUR / SEK / DKK / AUD / NZD / CAD / USD —— **冇 HKD**。

支援嘅扣賬計劃全部係區域性銀行網絡：Bacs（英國）、SEPA（歐元區）、Autogiro（瑞典）、Betalingsservice（丹麥）、BECS（澳洲/紐西蘭）、PAD（加拿大）、ACH（美國）。香港嘅 FPS/eDDA **唔喺名單入面，亦冇 roadmap 跡象**。

### 即係話

- Phase 3 現有嘅 GoCardless 整合 **永遠只服務英國（+ 上述 33 個國家）教練**
- 香港教練連 Connect 掣都撳唔落 —— 佢哋開唔到 GoCardless 帳號
- 呢個唔係「而家未支援，等下佢」，係架構性嘅：GoCardless 嘅產品本質係接駁各國**銀行扣賬清算網絡**，香港嗰個（HKICL FPS）佢哋冇接

### 英國側嘅好消息

GoCardless 英國 Bacs 收費係 **1% + 20p，封頂 £4**，冇月費、冇 setup 費（超過 £2,000 嘅交易另加 0.3%）。

用你自己 Phase 3 設計嘅數：Starter tier £281.67/月 → 收費 £3.02，即 **1.07%**。呢個對訂閱制嚟講係非常平。**英國側揀 GoCardless 係啱嘅決定，唔使改。**

---

## Q2 — Stripe 香港：得，但只有卡

### 支援情況

Stripe 喺香港正式營運，Stripe Billing（訂閱引擎）同 Stripe Connect（多商戶）都有香港版定價頁，即係**兩樣都用得**。

### 香港收款方式同費率

| 方式 | 費率 | 可否 recurring |
|---|---|---|
| 本地信用卡 | **3.4% + HK$2.35** | ✅ |
| 海外卡 | 再 +1% | ✅ |
| 跨幣種 | 再 +2% | ✅ |
| Alipay | 2.2% + HK$2.00 | 需確認 |
| WeChat Pay | 2.2% + HK$2.00 | 需確認 |
| **FPS** | **唔支援** | — |
| **香港銀行扣賬 / eDDA** | **唔支援（收客戶錢嗰面）** | — |

Stripe 喺香港嘅本地付款方式名單入面**冇任何銀行扣賬選項**。佢個 local payment methods 頁列咗 SEPA Direct Debit（歐洲）、韓國方式等等，香港就只有卡同兩個錢包。

### ⚠️ 一個好易踩嘅陷阱

搜尋「Stripe Hong Kong direct debit」會揾到 Stripe 官方支援文 **"Direct Debit Authorization for Hong Kong based Stripe accounts"**，睇個標題好似就係我哋要嘅嘢。

**唔係。** 打開睇實際內容係叫你去 **Dashboard → payout settings → 重新輸入自己個銀行戶口號碼** —— 佢係授權 **Stripe 扣返商戶自己個戶口**（處理退款、負結餘），**唔係**商戶扣客戶。同「收月費」完全無關。

呢個陷阱喺 Airwallex 都有一次（見 Q3），所以特別標出嚟。

### Stripe Connect 香港費率（多教練架構用）

- **「Stripe 處理定價」模式**：平台費 0、payout 費 0、帳戶費 0
- **「你自己處理定價」模式**：HK$15 / 每個月活躍帳戶 + payout 0.25% + HK$5 + 資金路由 0.25%

第一個模式（教練自己嘅 Stripe 帳號自己承擔手續費，ElitePro 一蚊唔抽）成本係零，**同你「零抽成」嘅賣點完全一致**，亦同現有 GoCardless 多租戶設計同一個哲學。

---

## Q3 — eDDA：技術上存在，實際上你入唔到閘

### eDDA 係咩

eDDA（電子直接扣賬授權）係 HKMA 轄下 HKICL 營運嘅 **FPS 增值服務**。同一般 FPS 轉數快（push，客戶自己撳去俾錢）相反，eDDA 係 **pull** —— 商戶主動由客戶戶口拉錢。客戶授權一次，可設定最高金額、日期範圍同頻率。

概念上呢個**正正就係香港版嘅 Bacs Direct Debit**，即係你要嘅嘢。

### 但係你入唔到閘

要用 eDDA 收錢，你必須係一個**核准 payee**，而 payee 資格係經**參與 FPS 嘅持牌銀行**取得 —— 商戶要有銀行關係、通過 AML/KYC、UBO 審查（香港對海外實體特別嚴，通常要公證同英譯文件）。

呢個係**銀行級 onboarding，唔係 API sign-up**。一個獨立教練、甚至一個早期 SaaS，實際上做唔到。而且就算 ElitePro 自己拎到 payee 資格，咁就變成 ElitePro 代收資金 —— 直接推翻你整個「教練自己收錢、平台零抽成、平台唔碰資金」嘅設計，同時引入資金牌照問題。

**結論：eDDA 直接整合，唔可行。**

### 但有一個第三方方案：Airwallex

Airwallex 嘅商戶收款方式名單入面，香港有 **FPS**，而且文件標明 **支援 recurring payments**（T+1 結算）。另外 AlipayHK 同 Airwallex Pay 都標明支援 recurring。費率方面 Airwallex Checkout 約 3.3% + HK$2.35，同 Stripe 相近。

呢個係目前唯一揾到、**香港銀行網絡 + 自動重複收費**兼得嘅方案。

**⚠️ 但要真人確認一件事**（desk research 答唔到）：Airwallex 個「FPS recurring」到底係
(a) 真正嘅無人值守 pull（似 mandate，客戶授權一次之後每月自動扣），定係
(b) 每個月推一個通知俾客戶，要佢自己撳確認。

如果係 (b)，佢就唔係「自動月費」，只係「自動提醒」，價值差好遠。呢個要直接問 Airwallex sales 或者開個 sandbox 試。

**同場再標一次陷阱**：Airwallex 文件另有一版 `HK_FPS_DEBIT`，睇落好似係答案，但我打開確認過 —— 佢係 **Global Treasury** 功能，用嚟由**你自己個銀行戶口**拉錢入**你自己個 Airwallex 戶口**（充值），**唔係**收客戶錢。同 Stripe 嗰個係一模一樣嘅命名陷阱。

---

## Q4 — 架構：模式夾得到，命名夾唔到

### 現有 Phase 3 設計嘅實際形狀

我讀咗 `functions/index.js`、`functions/gcSecrets.js`、`firestore.rules` 同 `reports/phase3-subscription-design.md`。核心模式係：

1. 教練經 OAuth 授權，連接**佢自己嘅** GoCardless 商戶帳號（多租戶）
2. Per-trainer access token 寫入 **Secret Manager**，key = `secretId(trainerId)`，**永遠唔入 Firestore**
3. 非敏感 metadata 入 `gcConnections/{trainerId}`，Admin SDK 寫（`allow write: if false`）
4. **ElitePro 由頭到尾唔碰資金**

### 好消息：呢個模式同 Stripe Connect 幾乎一比一

**Stripe Connect Standard 就係同一個形狀** —— OAuth 連接教練自己嘅 Stripe 帳號、平台唔持有資金、平台可選擇零抽成。你嗰四點設計原則搬過去 Stripe，一點都唔使改。

**你當初嘅架構判斷係啱嘅。** 呢個唔係要推翻重寫。

### 壞消息：命名同 GoCardless 焊死咗

| 層 | 現有名 | 問題 |
|---|---|---|
| Firestore collection | `gcConnections` | provider 寫死喺 collection 名 |
| Firestore collection | `gcOAuthNonces` | 同上 |
| `subscriptions` 欄位 | `gcMandateId`、`gcSubscriptionId` | Stripe 冇「mandate」呢個概念，佢係 `payment_method` |
| `gcConnections` 欄位 | `gcOrganisationId` | Stripe 係 `stripe_user_id` |
| Cloud Functions | `gcOAuthStart` / `gcOAuthCallback` / `gcDisconnect` | |
| 前端 | `startGcConnect()` / `handleGcConnect()` / `?gc=connected` | |
| Secret Manager | key 格式綁 `gc` | |

如果就咁加 Stripe，你會得到 `gcConnections` + `stripeConnections` 兩套平行嘅嘢、兩條 OAuth 流程、兩個 nonce collection、`subscriptions` 入面一半欄位得一個 provider 用 —— 即係你講嘅「一團糟」。

### 🔑 呢個係報告最重要嘅一點：而家改係免費，遲啲改係違規

`subscriptions` collection 而家係 **零文件**（`allow write: if false`，UI 未起，`src/` 入面零個 `.jsx` 提過 `subscription`）。`gcConnections` 最多得你自己一個 sandbox 文件。

而 **CLAUDE.md 常規 #27 寫明：歷史 Firestore 資料永遠唔可以批量改寫。**

即係：

> **今日**改成 provider-neutral（`paymentConnections/{trainerId}` + `provider` 欄位、`subscriptions.providerMandateId`）= 改幾個字串，零資料遷移，零風險。
>
> **有咗第一個真實訂閱之後**改 = 需要批量改寫歷史資料 = **被你自己嘅常規永久封死**，只能夠永遠孖住兩套。

呢個唔係「幾時做都得」嘅重構，佢有一個**單向閘門**，而閘門而家仲開住。

### 順帶一個發現

`functions/index.js:605` 嗰度 `environment: 'sandbox'` 係**寫死**嘅，冇 live 分支。即係話 Phase 3 唔止「冇 UI」——**佢由頭到尾未曾有能力處理一蚊真錢**。呢個同設計文件講嘅「sandbox only for now」一致，但週報從來冇講清楚呢一層。

---

## 對商業模式嘅影響

### 成本對照（用你自己嘅定價）

| | 英國（GoCardless Bacs） | 香港（Stripe 卡） |
|---|---|---|
| 月費金額 | £281.67（Starter） | 假設 HK$3,000 |
| 手續費 | £3.02 | HK$104.35 |
| **實際百分比** | **1.07%** | **3.48%** |
| 每個學生每年 | £36 | HK$1,252（≈£125） |

**香港嘅收款成本大約係英國嘅 3.2 倍**，而且冇得平 —— 因為香港冇銀行扣賬可用，只能用卡，而卡本身就貴。

### 呢個影響邊樣嘢

1. **「零抽成」個賣點唔受影響** —— 教練連自己嘅帳號，手續費係佢同 Stripe 之間嘅事，ElitePro 一蚊唔抽。呢句照講得。
2. **但香港教練嘅實際體感成本高好多**，推廣時唔可以照抄英國嗰套「自動月費好抵」嘅講法。
3. **香港側可能要兩條路並存更耐**：人手 FPS 過數（零手續費，教練自己收）vs 卡自動月費（3.4%，但唔使追數）。呢個係一個真實 trade-off，應該畀教練自己揀，唔應該由產品決定。
4. **Pack + 人手過數呢條路喺香港嘅價值比英國高**，因為佢係香港唯一零成本嘅選項。

---

## 待 Ani 拍板

| # | 決定 | 我嘅建議 |
|---|---|---|
| 1 | 香港側收款走邊條路：Stripe 卡（3.4%，穩陣）／ Airwallex FPS recurring（要先確認係咪真 pull）／ 只做人手 FPS | **先確認 Airwallex**，因為佢係唯一可能兼得「銀行網絡 + 自動」嘅選項；確認唔到就用 Stripe 卡 |
| 2 | **而家做 provider-neutral 改名？** | **做，而且要趁而家。** 呢個係單向閘門，過咗就永久封死（常規 #27） |
| 3 | 英國側 GoCardless 保唔保留 | **保留。** 1.07% vs 3.4%，英國側佢係明顯較好嘅選擇 |
| 4 | 要唔要我聯絡／查證 Airwallex 個 recurring 性質 | 我只可以做 desk research，真確認要開 sandbox 或者你直接問佢哋 sales |
| 5 | Phase 3 訂閱 UI 幾時開工 | 仍然建議暫緩，但**第 2 項唔應該一齊暫緩** —— 改名唔使等 UI |

---

## 查證方法同限制（老實講）

**已確認（一手來源）**：GoCardless 34 國名單同貨幣（官方 FAQ）、GoCardless 英國費率（官方定價頁）、Stripe 香港費率同本地付款方式名單（官方 en-hk 定價頁）、Stripe Connect 香港費率（官方）、Stripe/Airwallex 兩個「direct debit」陷阱頁（我逐版打開讀過內容，唔係睇標題）、現有 Phase 3 架構（直接讀 repo 源碼）。

**未確認（需要真人／sandbox）**：
- Airwallex FPS recurring 到底係無人值守 pull 定係要客戶每次確認 —— **呢個係最關鍵嘅未知數**
- Stripe 香港 Alipay/WeChat Pay 支唔支援訂閱式 recurring
- Airwallex 對獨立教練呢類小商戶嘅開戶難度同時間

**冇做**：冇聯絡任何 provider、冇開任何 sandbox 帳號、**冇改任何 code**（照你指示）。

---
_內部查證報告，Cantonese working doc — 見 CLAUDE.md「Working Rules」_

## 來源

- GoCardless 商戶支援國家：https://gocardless.com/faq/merchants/international-payments
- GoCardless 定價：https://gocardless.com/pricing/
- Stripe 香港本地付款方式：https://stripe.com/en-hk/pricing/local-payment-methods
- Stripe Connect 香港定價：https://stripe.com/en-hk/connect/pricing
- Stripe 香港 DDA 支援文（陷阱）：https://support.stripe.com/questions/direct-debit-authorization-for-hong-kong-based-stripe-accounts
- HKICL FPS 服務：https://fps.hkicl.com.hk/eng/fps/about_fps/what_fps_offers.php
- HKMA eDDA 驗證要求：https://www.hkma.gov.hk/eng/news-and-media/press-releases/2018/10/20181026-6/
- Airwallex 收款方式（香港 FPS + recurring）：https://www.airwallex.com/docs/payments/payment-methods
- Airwallex HK_FPS_DEBIT（陷阱，自家充值）：https://www.airwallex.com/docs/global-treasury/receive-funds/add-funds-via-direct-debits-from-linked-accounts/direct-debit-schemes-and-mandate-requirements/hong-kong-(hk_fps_debit)
