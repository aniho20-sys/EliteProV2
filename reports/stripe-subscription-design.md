# Stripe 月費設計（B49，2026-10-15）

[員工A - SA] 起草。Ani 2026-10-15 決定：英國、香港（同將來其他國家）用同一樣嘢收月費 → Stripe 取代 GoCardless。

## 1. Ani 已拍板

| 事項 | 決定 |
|---|---|
| 收費商 | Stripe，全部國家一樣 |
| 教練點連 | 教練撳掣，喺 Stripe 開／連**自己**嘅戶口（Connect），錢直入教練戶口 |
| 英國學生點俾 | 學生自己揀：Bacs 銀行自動轉帳（1%，最少 20p，封頂 £4）或信用卡（1.5% + 20p） |
| 香港學生點俾 | 信用卡（本地卡 3.4% + HK$2.35） |
| Billing 費 | 另加 0.7%（Ani 已知，英國 £320／月約貴 £2） |
| 平台抽成 | **未決定**，預設 0；遲啲問 |
| GoCardless | Ani 已開正式戶口但冇學生用 → Stripe 上線後佢自己關，code 之後先拆 |

## 2. 錢點樣行（點解揀 direct charges）

Stripe Connect 有三種收錢方式。英國平台用「錢經平台再轉」（destination / separate charges）只可以轉去美、英、歐洲經濟區、加、瑞（`docs.stripe.com/connect/cross-border-payouts`）—— **香港唔喺入面**。

**Direct charges**：月費直接開喺教練自己嘅 Stripe 戶口（API call 帶 `Stripe-Account: acct_…` header），學生俾嘅錢直入教練戶口，平台只收（如果有）application fee。文件冇國家限制，Stripe 建議 SaaS 平台用（`docs.stripe.com/connect/direct-charges`）。connected account 可以開喺「Stripe’s global markets」任何一個國家（`docs.stripe.com/api/accounts/create` `country`），香港係其中之一。

**仍未證實**：英國平台開香港 connected account 實際行唔行得通 —— 平台測試戶口開咗之後，用 `country=HK` 開一個測試戶口實試。

教練戶口設定（`type` 已 deprecated，用 `controller`）：
```
controller[stripe_dashboard][type]=full      教練有自己完整 Stripe dashboard（等於以前 Standard）
controller[fees][payer]=account              Stripe 手續費由教練戶口俾
controller[losses][payments]=stripe          拒付損失由 Stripe 處理
controller[requirement_collection]=stripe    身份驗證 Stripe 自己問
```

## 3. 流程

1. **Ani（一次）**：開 Stripe 戶口 → 開 Connect → 喺 Profile 一個淨係佢見到嘅表格貼 secret key 同 webhook secret → 入 Secret Manager（`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`），唔入 Firestore、唔入 chat。測試定正式由 Stripe 自己答（`GET /v1/balance` 嘅 `livemode`），唔靠 key 個名。
2. **教練連接**：`stripeConnectStart` → 冇戶口就 `POST /v1/accounts`（上面 controller + 教練揀嘅國家）→ `POST /v1/account_links`（type `account_onboarding`）→ 教練喺 Stripe 頁填資料 → 返嚟 `stripeRefreshConnection` 讀 `GET /v1/accounts/{id}`：`charges_enabled` 先算 connected。
3. **學生開月費**：`stripeStartSubscription(tier)` → 價錢**伺服器**由教練 `subscriptionRate` 計（52 星期 ÷ 12，同 GoCardless 一樣）→ 寫 `pending` subscriptions doc → 喺教練戶口開 Checkout Session（`mode=subscription`，`price_data` inline，`payment_method_types`：GBP → `card` + `bacs_debit`；其他 → `card`）→ 學生去 Stripe 頁俾。
4. **返嚟**：`stripeSubscriptionReturn?sub=` → **唔信個 redirect**，問 Stripe：Checkout Session `status=complete` 同有 `subscription` 先轉 `active`。
5. **每月**：webhook `invoice.paid` → 用平台 key + `Stripe-Account` **再讀一次** invoice（`status=paid`）→ 沿用 GoCardless 嘅 `grantForPayment`：加堂、roll-over 最多轉半個月、ledger 用 invoice id 做 key（重複送都只會加一次）。
6. **扣款失敗**：`invoice.payment_failed` → `past_due`，通知教練同學生（同 GoCardless 一樣）。下一次 `invoice.paid` 轉返 `active`。
7. **取消**：學生或教練撳 → `DELETE /v1/subscriptions/{id}`；未完成嘅 Checkout 就 `POST /v1/checkout/sessions/{id}/expire`。`customer.subscription.deleted` webhook 都會標 `cancelled`。
8. **刪帳戶**：`onAccountDelete` 照取消佢所有 Stripe 月費（同 GoCardless 一樣，失敗就 email Ani）。

## 4. Webhook

一個平台 endpoint 收晒所有教練戶口嘅事件（Stripe「Events on Connected accounts」）。
- 驗證：`Stripe-Signature: t=…,v1=…`，HMAC-SHA256(`${t}.${rawBody}`)，5 分鐘時限，timing-safe 比較。
- 邊個教練：`event.account` → `paymentConnections` 入面 `stripe.accountId` 等於佢嘅**唯一**一個教練；冇或者多過一個就唔郁（唔估錢係邊個）。
- 租戶隔離：只可以郁嗰個教練自己嘅 subscriptions。
- 去重：`stripeEvents/{event.id}`（server-only）。

## 5. 資料

- `paymentConnections/{trainerId}.stripe`：`{ accountId, country, defaultCurrency, chargesEnabled, detailsSubmitted, environment, connectedAt }`（同 GoCardless 欄位分開，唔會互相覆蓋）。
- `users/{trainerId}.stripeEnvironment`：server 寫，學生讀嚟決定張卡講唔講「測試模式」。
- `subscriptions/{id}`：沿用現有 schema，`provider: 'stripe'`，`currency` 跟教練，`providerSubscriptionId` = `sub_…`，`checkoutSessionId` = `cs_…`。
- 試行期（`PILOT`）：同 GoCardless 一樣，只有教練標咗 `subscriptionTester` 嘅學生先開得。

## 6. 唔做（今次）

- 平台抽成（等 Ani 決定）。
- GoCardless code 拆走（Stripe 正式上線之後）。
- 暫停月費（GoCardless 版都未做）。
