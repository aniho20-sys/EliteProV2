# Stripe 測試戶口設定步驟（Ani 做，B49）

**點解要你做**：開 Stripe 戶口要用你本人 email 同身份，agent 做唔到。
**測試模式**：唔使身份證明、唔涉及真錢，只要 email。正式收錢先要補資料（到時另外講）。
**大約時間**：15–20 分鐘，手機做得到。
**⚠️ Key 同 secret 唔好貼落 chat** —— 只貼入 app 嘅表格。

## 1. 開戶口
1. 手機開 **dashboard.stripe.com/register**
2. 填 email、名、密碼；國家揀 **United Kingdom**
3. 驗證 email。入到 dashboard 右上角／頂部會見到 **Test mode／Sandbox**，保持喺測試模式。

## 2. 開 Connect（教練連自己戶口要用）
1. Dashboard 搜尋欄打 **Connect** → **Get started**
2. 問你點樣用：揀 **Platform**（軟件平台，畀用戶收錢），用戶自己有完整 Stripe dashboard
3. 如果要填 platform profile，照實填：ElitePro，健身教練軟件，教練向學生收月費

## 3. 攞 Secret key
1. **Developers → API keys**
2. **Secret key**（`sk_test_` 開頭）→ **Reveal** → 複製
3. 暫時唔好關呢頁

## 4. 開 Webhook
1. **Developers → Webhooks**（新版可能叫 **Workbench → Webhooks**）→ **Add destination／Add endpoint**
2. 「Events from」揀 **Connected accounts**（唔係 Your account）
3. 揀以下 9 個 events（app 入面張卡有同一張清單）：
   - `account.updated`
   - `account.application.deauthorized`
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.dispute.created`
   - `charge.refunded`（2026-10-24 加：你退錢俾學生時通知你，堂數唔會自動郁）
4. Endpoint URL：`https://us-central1-elitepro-16718.cloudfunctions.net/stripeWebhook`（app 入面張卡有「複製」掣）
5. 建立之後，撳入去 → **Signing secret**（`whsec_` 開頭）→ Reveal → 複製

## 5. 貼入 app
1. ElitePro → **Profile** → 拉落去 **「ElitePro 的 Stripe」**（淨係你見到）
2. 貼 Secret key、Signing secret → **儲存密鑰**
3. 見到「已儲存 —— Stripe 目前為測試模式」就完成

## 6. 之後 agent 做
- 用測試教練（英國 + 香港）試連接、測試卡（4242 4242 4242 4242）試月費、試扣款失敗、試取消
- 確認英國平台開唔開到香港教練戶口（設計文件 §2 未證實嗰項）

## 障礙同應對
| 撞到 | 點算 |
|---|---|
| 畫面同上面寫嘅唔一樣 | Stripe 成日改介面 —— 截圖俾我，我話你撳邊 |
| Connect 要你填好多資料先開到 | 測試模式通常唔使；如果真係要，截圖俾我 |
| 表格話「Stripe 不接受這組資料」 | 多數係複製少咗字或者多咗空格 —— 重新 Reveal 再複製一次 |
| 撳錯咗 Live mode | 冇問題，表格會自己認出係測試定正式；測試期間用 `sk_test_` |

## 完成標準
Profile「ElitePro 的 Stripe」張卡顯示 **「已設定 —— 測試模式」**。
