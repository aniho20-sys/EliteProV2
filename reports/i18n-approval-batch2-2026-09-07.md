# 中英對照表（待批）—— Batch 2：發票 + 進度總覽 + 學生列表

**日期**：2026-09-07
**批核人**：Ani
**範圍**：`InvoicePage` 42 + `ClientProgressOverviewPage` 18 + `ClientsPage` 11 = **71 條**（另加運算式內 18 條，見各節末）
**規則**：跟 `zh-HK.js` 檔頭語域 —— 繁體書面語、「堂／教練／預約／剩餘」

**圖例**：♻️ = 沿用現有 key ｜ ⚠️ = 我想你特別睇 ｜ 🔵 = 運算式內，掃描器睇唔到嗰批

---

# A. InvoicePage（發票）

## A1. 列表頁

| # | English | 建議中文 | |
|---:|---|---|---|
| 1 | Invoices | 發票 | ♻️ `nav.invoices` |
| 2 | Track payments from your clients | 追蹤學生付款情況 | |
| 3 | New Invoice | 新增發票 | |
| 4 | Unpaid | 未付款 | |
| 5 | Overdue | 逾期 | |
| 6 | Paid This Month | 本月已收 | |
| 7 | Issued | 發出 | |
| 8 | · Due | · 到期 | |
| 9 | Print / Save as PDF | 列印／儲存為 PDF | |
| 10 | Pay Now | 立即付款 | |

## A2. 新增發票表單

| # | English | 建議中文 | |
|---:|---|---|---|
| 11 | Client | 學生 | ♻️ `common.client` |
| 12 | Select client | 選擇學生 | |
| 13 | Currency | 貨幣 | |
| 14 | Issue Date | 發出日期 | |
| 15 | Due Date | 到期日期 | |
| 16 | Items | 項目 | |
| 17 | Add Item | 新增項目 | |
| 18 | Total: | 總額： | |
| 19 | Notes (optional) | 備註（可選） | |
| 20 | Payment Link | 付款連結 | |
| 21 | (optional — PayMe / FPS / bank URL) | （可選 —— PayMe／轉數快／銀行網址） | ⚠️ 見下 |
| 22 | Cancel | 取消 | ♻️ `common.cancel` |
| 23 | Description〔placeholder〕 | 說明 | |
| 24 | Qty〔placeholder〕 | 數量 | |
| 25 | Price〔placeholder〕 | 單價 | |
| 26 | Payment instructions, bank details…〔placeholder〕 | 付款指示、銀行資料… | |
| 27 | Remove item〔aria-label〕 | 移除項目 | |

## A3. 發票內容（列印／PDF 版面）

| # | English | 建議中文 | |
|---:|---|---|---|
| 28 | Close | 關閉 | ♻️ `common.close` |
| 29 | Issue date | 發出日期 | |
| 30 | Due date | 到期日期 | |
| 31 | Bill to | 收件人 | |
| 32 | Description | 說明 | |
| 33 | Qty | 數量 | |
| 34 | Unit Price | 單價 | |
| 35 | Amount | 金額 | |
| 36 | Total | 總額 | |
| 37 | Notes | 備註 | |
| 38 | Payment | 付款 | |
| 39 | Pay Now → | 立即付款 → | |
| 40 | Status: | 狀態： | |

## A4. 🔵 運算式內（掃描器睇唔到）

| # | English | 建議中文 | |
|---:|---|---|---|
| 41 | All ({n}) | 全部（{n}） | |
| 42 | Unpaid ({n}) | 未付款（{n}） | |
| 43 | Overdue ({n}) | 逾期（{n}） | |
| 44 | Paid ({n}) | 已付款（{n}） | |
| 45 | Create Invoice〔空狀態按鈕〕 | 建立發票 | |

### ⚠️ 第 21 條要你決定

原文寫住 **PayMe / FPS / bank URL**。你而家兩個市場一齊推：

- 英國教練唔會用 PayMe，亦唔會用 FPS
- 香港教練唔會用 sort code

三個做法：**(a)** 照譯，兩地都見到全部字眼 ／ **(b)** 改成中性「付款連結（可選）」，唔列任何服務名 ／ **(c)** 跟教練 `currency` 顯示對應字眼（GBP 顯示 bank transfer，HKD 顯示 PayMe／轉數快）。

**我建議 (b)** —— 呢個係一個「貼連結入去」嘅欄位，列邊幾間服務對填寫冇幫助，反而喺另一個市場睇落似寫錯咗。(c) 最貼心但係新功能，唔應該收喺翻譯批次入面偷偷做。

---

# B. ClientProgressOverviewPage（進度總覽）

| # | English | 建議中文 | |
|---:|---|---|---|
| 46 | Progress Overview | 進度總覽 | ♻️ `nav.progress_overview` |
| 47 | client / clients | 位學生 | |
| 48 | Sort by: | 排序： | |
| 49 | Weight | 體重 | ♻️ `common.weight` |
| 50 | Body Fat | 體脂 | |
| 51 | Weight Trend | 體重走勢 | |
| 52 | Volume (30d) | 訓練量（30日） | ⚠️ 見下 |
| 53 | Sessions (30d) | 課堂（30日） | |
| 54 | workouts | 次訓練 | |
| 55 | Vol Trend | 訓練量走勢 | |
| 56 | Last workout: | 上次訓練： | |
| 57 | Next session: | 下一堂： | |
| 58 | new PR | 項新紀錄 | ⚠️ 見下 |
| 59 | (30d) | （30日） | |
| 60 | Unlimited | 無限 | |
| 61 | sessions | 堂 | |
| 62 | left | 剩餘 | ⚠️ 語序見下 |
| 63 | No clients yet〔title prop〕 | 尚未有學生 | ♻️ `tdash.no_clients_yet` |

## B1. 🔵 運算式內 —— Sort 掣（就係你張截圖嗰五個）

| # | English | 建議中文 |
|---:|---|---|
| 64 | Name | 姓名 |
| 65 | Last Active | 最近活躍 |
| 66 | Weight Change | 體重變化 |
| 67 | Volume | 訓練量 |
| 68 | New PRs | 新紀錄 |
| 69 | Sessions Left | 剩餘堂數 |

### ⚠️ 52／58／62 要你睇

- **52「Volume」→ 訓練量**：常規 #39 話 sets／reps／kg 呢類訓練詞彙唔譯。Volume 係「總重量」嘅統計，我當佢係統計標籤而唔係訓練詞彙。如果你覺得健身房講開就係 "Volume"，可以留返英文 —— 咁 55、67 都一齊留。
- **58「new PR」→ 項新紀錄**：學生端已經用緊 `dash.stat_prs` =「紀錄」，我跟返。但 "PR" 喺健身房係講開嘅英文，你可能寧願留 "PR"。
- **62「left」**：英文係 `23/45 sessions … 22 left`。中文語序唔同，我建議整句變成 **「剩餘 22 堂」**，唔好逐個字譯，否則會變成「22 剩餘」。

---

# C. ClientsPage（學生列表）

| # | English | 建議中文 | |
|---:|---|---|---|
| 70 | Clients | 學生 | ♻️ `nav.clients` |
| 71 | active | 位活躍學生 | |
| 72 | Your Invite Code | 你的邀請碼 | |
| 73 | Share this code with clients so they can sign up and connect to you. | 將此邀請碼分享給學生，他們就可以註冊並連接到你。 | |
| 74 | Share | 分享 | |
| 75 | Age: | 年齡： | |
| 76 | cm \| Joined: | cm｜加入日期： | |
| 77 | Weight: | 體重： | ♻️ 同 `common.weight` |
| 78 | kg \| BF: | kg｜體脂： | |
| 79 | Search clients...〔placeholder〕 | 搜尋學生… | |

## C1. 🔵 運算式內

| # | English | 建議中文 |
|---:|---|---|
| 80 | Invite code copied〔toast〕 | 已複製邀請碼 |
| 81 | Invite message copied〔toast〕 | 已複製邀請訊息 |
| 82 | No matching clients | 沒有符合的學生 |
| 83 | Copy Invite Code〔空狀態按鈕〕 | 複製邀請碼 |

---

# 批核方式

最快：**「全部照用，21 用 (b)」**

或者逐項改，例如：「52/55/67 Volume 留英文，58 留 PR，21 用 (c)，其餘照用」。

批完我一次過改三版，然後：

- 三個檔案由 `AWAITING` 移入 `TRANSLATED_FILES`
- 債務由 71 跌到 0
- 運算式嗰 18 條同時處理，唔會留手尾

---

## 順帶交數

**Sort 掣佔晒成屏個 bug 已修**（commit `3d3111b`）。根因係 `.filter-bar` 喺手機 media query 入面 `flex-direction: column` —— 呢個 class 本身係為咗下拉選單同搜尋框而設，但進度總覽攞佢嚟裝 chip 掣，column flex 令每個掣 stretch 到全闊。已經另開 `.sort-bar`，冇郁共用嗰個，另外兩版（動作庫、學生列表）唔受影響。

**呢個修改要你真機驗收**（#36）—— 我改嘅係 CSS，驗唔到手機上實際點排。

---
_內部工作文件，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
