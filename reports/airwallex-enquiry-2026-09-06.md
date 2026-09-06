# Airwallex 查詢 email 草稿

**日期**：2026-09-06
**用途**：由 Ani 自己 send 俾 Airwallex sales / support
**目標**：拎到**白紙黑字**答案 —— 佢哋香港嘅 FPS recurring 到底係 merchant-initiated pull（真自動扣），定係每個週期都要客戶撳確認
**點解要問**：`reports/payment-provider-research-2026-09-06.md` Q3。呢個係整份收款查證入面最關鍵嘅未知數 —— 如果答案係「要客戶每次撳」，佢就唔係自動月費，香港側就只剩 Stripe 卡一條路。

---

## 用法

- **收件人**：Airwallex 香港 sales（網站 "Contact sales" 表格）或 support@airwallex.com
- 兩個地方都 send 一次，邊個先覆用邊個
- **標題**：`Pre-sales question: does HK FPS support unattended recurring pull?`
- 下面 `---` 之間嗰段直接 copy paste，**唔使改**（除非你想改簽名）
- 覆到之後**唔好只睇結論**，睇佢有冇正面答到第 1 條 A/B —— sales 好容易用「我哋支援 recurring payments」呢種空泛講法帶過，嗰句唔算答案

---

## Email 正文（copy 由呢條線開始）

---

Subject: Pre-sales question: does HK FPS support unattended recurring pull?

Hi,

I run a small personal-training business and I'm evaluating Airwallex for
recurring subscription billing. Before I go any further I need to confirm one
specific technical point, because it decides whether Airwallex fits my use
case at all.

**My use case**

- Customers are individuals in Hong Kong with HK bank accounts
- I need to charge each of them a fixed amount, once a month, automatically
- Once a customer signs up, I want zero action required from them on each
  subsequent monthly charge

**My question**

Your payment methods documentation lists FPS as available for shoppers in
Hong Kong and marks "recurring payments" as supported. I want to be precise
about what "recurring" means there. Which of these two is it?

- **(A) Merchant-initiated pull.** The customer authorises once at sign-up.
  Every following month my system calls your API and the funds are debited
  from their bank account with no action and no confirmation tap from the
  customer.

- **(B) Customer-confirmed each cycle.** Every month the customer receives a
  request or notification and must approve the payment (in their banking app,
  or via a link) before the funds move.

I am specifically looking for (A). If Hong Kong FPS is actually (B), please
say so plainly — that is a useful answer and it saves us both time.

**Follow-up questions, assuming the answer is (A)**

1. Is this backed by eDDA (Electronic Direct Debit Authorization) over FPS, or
   by some other mechanism? If eDDA, do I need my own approved-payee status
   with a participant bank, or does Airwallex provide that?
2. How long does the customer's authorisation remain valid? Does it expire,
   and is there a maximum amount or frequency fixed at sign-up?
3. What happens on a failed charge (insufficient funds)? Is there automatic
   retry, and how am I notified?
4. Which API objects/endpoints are involved in creating the authorisation and
   in charging against it later? A documentation link is fine.
5. Are there eligibility restrictions for this payment method — minimum
   volume, business type, industry, or an application/approval process beyond
   normal account onboarding?
6. What is the fee for an FPS recurring charge in HKD, and how does settlement
   timing work?

**One clarification on my side**

I have already read your `HK_FPS_DEBIT` documentation under Global Treasury.
As I understand it, that is for pulling funds from my *own* linked bank
account into my Airwallex account, not for charging third-party customers.
Please confirm that is correct, and that my question above concerns a
different product.

Could you reply in writing rather than arranging a call? I need a record of
the answer for a technical decision.

Thanks very much,

Ani
ElitePro

---

## 覆咗之後點做

| 佢答 | 後果 |
|---|---|
| **(A) 真 pull** | Airwallex 重新入局，成為香港側自動月費嘅首選（銀行網絡、費率同 Stripe 相若）。要再排一次同 Stripe 卡嘅比較 |
| **(B) 要客戶每次確認** | Airwallex 出局，香港側自動月費**只剩 Stripe 卡**一條路。人手 FPS 仍然係第一階段 |
| **答得模糊 / 淨係講「支援 recurring」** | 當佢冇答。追問第 1 條嘅 A 定 B，唔好自己幫佢詮釋 |
| **要你開會先講** | 你已經喺信入面講明要書面答覆。如果佢堅持開會，呢個本身就係一個訊號 —— 通常代表答案唔係乾淨嘅 (A) |

---
_內部工作文件，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
