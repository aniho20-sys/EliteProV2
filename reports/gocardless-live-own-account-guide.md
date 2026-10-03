# GoCardless 正式收錢：用你自己嘅戶口（B36 捷徑）

**寫於 2026-10-03。** Ani 2026-10-02 揀咗「捷徑」：用自己嘅 GoCardless 正式商戶戶口收自己學生嘅月費，唔使等 GoCardless 批 ElitePro 做平台。

ElitePro 嗰邊已經全部做好、上咗線：

- 連接表格
- 學生取消月費
- 扣款失敗提示
- 「測試模式」標籤只喺 sandbox 顯示

**以下係淨係你做得到嘅部分**，因為要用你本人身份同銀行戶口。全部喺手機做得到，大約 15 分鐘，唔計 GoCardless 審核時間。

> ⚠️ **兩樣嘢永遠唔好貼落 chat：** access token 同 webhook secret。佢哋只會貼入 ElitePro 嗰個表格。

---

## 開始之前：收費（GoCardless 收，唔係 ElitePro）

Standard plan：**每筆 1% + 20p，每筆最多 £4**。冇開戶費、冇月費、冇合約期。

以 £65/堂嘅月費計：

| 計劃 | 每月 | GoCardless 每月收 |
|---|---|---|
| 4 堂 | £281.67 | 約 £3.02 |
| 8 堂 | £563.33 | £4（封頂） |
| 12 堂 | £845.00 | £4（封頂） |

開戶時佢可能推介其他 plan。**揀唔揀由你決定**，以上只係 Standard 嘅數。
來源：多個比較網站引用 gocardless.com/pricing（2026 年 4 月）。開戶時以佢頁面上嘅數為準。

---

## 第 1 步：開正式戶口

1. 用手機瀏覽器開 **manage.gocardless.com/signup**（正式環境）。
   - 唔係 manage-sandbox，嗰個係測試用。
2. 填 email、密碼，揀業務類型。
   - **個人／sole trader** 或 **limited company**，揀你實際嗰種。
3. GoCardless 會核實身份：姓名、出生日期、住址。
   - 電子核實唔過，就要上載證件，例如護照或者駕照，加住址證明，例如銀行月結單或者水電費單。
4. 加銀行戶口，即係收錢嗰個。
   - 戶口名要係你本人或者你嘅營業名稱。
   - 可能要上載 6 個月內嘅銀行文件。

**審核需時：** GoCardless 冇講實數。審核完成之前，學生已經可以登記；但收到嘅錢會俾 GoCardless 暫時扣住，審核完成先發放。ElitePro 會喺你個 GoCardless 卡顯示「仍在驗證」。

---

## 第 2 步：喺 ElitePro 攞你嘅通知地址

1. ElitePro → **Profile** → GoCardless 卡。
2. 撳 **「使用你自己的 GoCardless 帳戶」**。
3. 撳第 1 步旁邊嘅 **Copy**，複製通知地址。
   - 格式係 `…/gcWebhook/` 加你自己嘅 ID。
4. 呢頁唔好閂，第 4 步要返嚟貼嘢。

## 第 3 步：喺 GoCardless 開 webhook 同 access token

喺 manage.gocardless.com：

1. **Developers → Webhooks → Create**
   - 貼上第 2 步複製嘅地址，儲存。
   - 打開嗰個 webhook，**複製佢嘅 secret**。如果見到「Reveal」，先撳一下先 copy。
2. **Developers → API settings → Create → Access token**
   - 權限揀 **read-write**。
   - **複製個 token。** 可能只會顯示一次，未貼好入 ElitePro 之前唔好閂嗰頁。

## 第 4 步：貼入 ElitePro

返去 ElitePro 第 2 步嗰頁：

1. Webhook secret 貼入第 2 格。
2. Access token 貼入第 3 格。
3. 撳 **「連接我的帳戶」**。

成功會見到「已連接你的 GoCardless 帳戶」，同埋 **live** 標籤。

**連接一刻 ElitePro 會自動做：**
- 舊嘅 sandbox 連接會被取代。
- 任何仲開住嘅 sandbox 測試計劃會自動作廢。佢哋冇收過錢，唔使理。

## 第 5 步：揀一兩個學生試

1. 檢查 Profile → GoCardless 卡入面嘅**每堂月費**啱唔啱。
2. Clients → 揀學生 → 搵「每月計劃測試者」→ 撳 **「標記為測試者」**。
   - 只有你撳咗嘅學生先會見到月費選項。
3. 叫嗰個學生喺佢 app 嘅 Profile 揀計劃，然後喺 GoCardless 頁面填銀行資料。

---

## 可能遇到嘅問題

| 你見到 | 原因 | 點做 |
|---|---|---|
| 「GoCardless 不接受這個 access token」 | 複製咗唔完整，或者複製咗標籤 | 重新 Create 一個 token，copy 完整個值 |
| 「內容看來不對」 | 貼咗標籤（例如 "Access token" 幾隻字）唔係個值 | 同上 |
| 「GoCardless 仍在驗證你的帳戶」 | 第 1 步審核未完 | 唔使做嘢，等佢批 |
| 學生見唔到月費選項 | 未撳「測試者」，或者未設月費 | 第 5 步 |
| 學生扣款失敗 | 學生戶口唔夠錢，或者取消咗 Direct Debit | 你首頁「扣款失敗」會列出嚟；同學生傾 |

**完成標準：** Profile 個 GoCardless 卡顯示 **live**，冇「仍在驗證」字樣，而且有一個學生成功設定咗月費。

## 來源

- [GoCardless fees in 2026 (WorldFirst)](https://www.worldfirst.com/uk/blog/global-business-tips/go-cardless-fees/)
- [GoCardless Review UK 2026 (MerchantHQ)](https://merchanthq.co.uk/online-payments/gocardless/)
- [Individual/sole trader (UK) — GoCardless setup](https://setup.gocardless.com/hc/en-gb/articles/360020017494-Individual-sole-trader-UK-)
- [Verifying your account — GoCardless support](https://support.gocardless.com/hc/en-gb/articles/115005890945-Verifying-your-account)
- [Banking document FAQs — GoCardless support](https://support.gocardless.com/hc/en-gb/articles/115005891085-Banking-document-FAQs)
- [How to create an access token — GoCardless support](https://support.gocardless.com/hc/en-gb/articles/17144828748444-How-to-create-an-access-token)
- [Webhooks reference — GoCardless docs](https://docs.gocardless.com/docs/api-reference/webhooks)
