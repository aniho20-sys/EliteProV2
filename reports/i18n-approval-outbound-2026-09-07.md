# 中英對照表（待批）—— 對外文字：訊息模板 + 發票

**日期**：2026-09-07
**原則**（Ani 已定）：**跟讀嘅人**。學生冇設定 `language` → fallback 用教練語言，唔可以靜靜雞當英文。
**地基**：已完成（`fb58403`）—— `resolveRecipientLanguage()` + `translatorFor()`，261/261 綠

---

# 🔴 先講一個會令 PDF 直接爆嘅發現

**列印發票嗰個 PDF 而家用 `pdf-lib` 嘅 `StandardFonts.Helvetica`。呢隻字體用 WinAnsi 編碼，根本冇能力載中文字。**

我實測過，唔係靠估：

```
page.drawText('發出日期', { font: Helvetica })
→ ✅ 確認 throw: WinAnsi cannot encode "發" (0x767c)
```

**即係話：如果我照直譯咗發票標籤，中文學生撳「儲存為 PDF」會直接失敗，唔係「排版醜咗」，係整份 PDF 生成唔到。**

呢個係我提議譯之前一定要揾出嚟嘅嘢 —— 如果照做，你會喺學生報 expense 嗰刻先發現。

## 三個做法

| | 做法 | 代價 |
|---|---|---|
| **(a)** | **只喺目標語言係中文時，先載一隻繁中字體落 PDF**（`@pdf-lib/fontkit` + subset） | 英文發票**零成本**；中文發票要下載一隻字體檔（數 MB 級，subset 後細好多）。要實測真實大小 |
| (b) | PDF 標籤永遠英文，淨係畫面預覽用中文 | 零成本，但你講到學生要攞去俾公司財務睇 —— 財務睇嘅正正就係 PDF |
| (c) | PDF 標籤中英並排（`發出日期 / Issue date`） | 一樣要中文字體，冇慳到，而且行闊咗 |

**我建議 (a)**，因為成本係**有條件**嘅 —— 你英國嗰邊嘅學生一個 byte 都唔使多載，只有真係要中文發票先付。

**但呢個要你拍板**，因為佢係一個新依賴 + 一次額外下載，唔應該收喺「翻譯」入面偷偷做。

## 而畫面上嘅發票預覽冇呢個問題

HTML 預覽（`InvoicePrint`）batch 2 已經全部經 `t()`，**改成跟學生語言只係改幾行 code，唔使新文案、零技術風險**。呢部分我可以即刻做。

---

# A. 訊息模板（7 條，教練發、學生讀）

`{name}` = 學生名（數據，唔譯）·`{n}` = 堂數 ·`{rate}` = 已格式化銀碼

| # | 場景 | English | 建議中文 |
|---:|---|---|---|
| 1 | 堂數不足（快速訊息 + 續堂 fallback） | Hey {name}, just a heads-up — you've got {n} sessions remaining. Ready to top up? 💪 | {name}，提提你，你仲剩 {n} 堂。要唔要而家增加堂數？💪 |
| 2 | 未填訓練資料 | Hey {name}, could you fill out your training profile when you get a sec? It helps me plan your sessions safely (goals, experience, any injuries) 🙏 | {name}，得閒可唔可以填一填你的訓練資料？（目標、訓練經驗、有冇受過傷）咁我可以安全地為你編排課堂 🙏 |
| 3 | 一段時間冇活動 | Hey {name}, just checking in! Haven't seen a workout log in a while — everything okay? 🏋️ | {name}，關心一下！有一段時間見唔到你的訓練紀錄，一切還好嗎？🏋️ |
| 4 | 續堂提醒（有價目） | Hey {name}, you've got {n} sessions left — renew now to keep your current rate ({rate}/session)! After that, renewal moves to {next}/session. | {name}，你仲剩 {n} 堂 —— 而家續堂可保持現價（{rate}/堂）！之後續堂價格將調整為 {next}/堂。 |
| 5 | 課堂總結預設內容 | Great session today, {name}! 💪 | 今日課堂做得好，{name}！💪 |
| 6 | 課堂總結訊息標題 | 📋 Session Recap — {date} {time} | 📋 課堂總結 —— {date} {time} |
| 7 | 課堂總結類型行 | Type: {type} | 類型：{type} |

## ⚠️ 三條想你睇

| # | 事項 |
|---|---|
| **1、3** | 我用咗「提提你」「關心一下」—— 呢兩個係口語邊緣。`zh-HK.js` 語域規則要求書面語，但**呢啲係你傳俾學生嘅私人訊息，唔係介面文字**，太書面反而似機械人。你話要唔要收緊。**呢個係整份表最需要你判斷嘅一條。** |
| 2 | 「得閒」都係同一個問題。書面版可以係「方便時」。 |
| 7 | `{type}` 係你自己輸入嘅課堂類型（例如 "Training Session"），屬數據，**唔會譯**（#39）。所以中文訊息入面呢個字會維持你打嗰個字。 |

## 冇名時嘅 fallback

原文用 `there`（"Hey there"）。中文建議用「你好」，即 1–5 條開頭變成「你好，提提你…」。

---

# B. 發票 —— 分兩部分

## B1. 畫面預覽（HTML）—— 可即刻做，零風險

Batch 2 已譯，只需改成跟學生語言。**唔使新文案。**

## B2. PDF —— 等你決定 (a)/(b)/(c)

如果揀 (a)，我會先**實測 subset 後嘅真實檔案大小**再報你，唔會就咁加落去。PDF 標籤本身得 8 個字（`BILL TO` / `DESCRIPTION` / `QTY` / `UNIT PRICE` / `AMOUNT` / `NOTES` / `Total` / `Issue date` / `Due date` / `Status: PAID/UNPAID`），文案唔難，難嘅係字體。

---

# 批核方式

例如：

> 「訊息模板全部照用，1/2/3 保持口語（私人訊息唔使咁書面）；PDF 揀 (a)，先報我字體大小；B1 即刻做」

或者逐條改。

---
_內部工作文件，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
