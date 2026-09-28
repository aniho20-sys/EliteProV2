# 中英對照表（待批）—— 月度報告 PDF

**日期**：2026-09-28
**原則**（Ani 2026-09-28 定）：PDF 跟**學生**語言。學生冇設定 → 跟教練語言（`resolveRecipientLanguage`）。
**唔譯**（#39）：動作名、RPE、kg、教練自己寫嘅嘢（目標、付款方式、課堂類型）。
**點解要批**：翻譯規則（#28）—— 中文只可以放已批嘅句子；而語言掣已經開放俾教練，所以一句未批，CI 就唔俾上線。

`{name}` `{client}` `{date}` `{month}` `{goal}` `{info}` 係數據，唔譯。

## A. 教練睇到嘅（報告視窗）

| # | key | English | 建議中文 |
|---:|---|---|---|
| 1 | report.share_pdf | Create PDF | 建立 PDF |
| 2 | report.creating_pdf | Creating PDF… | 正在建立 PDF… |
| 3 | report.share_hint | Opens the share sheet — save the PDF or send it straight to {client}. | 開啟分享選單，可儲存 PDF 或直接傳送給 {client}。 |
| 4 | report.toast_pdf_failed | Could not create the PDF. Check your connection and try again. | 未能建立 PDF，請檢查網絡連線後再試。 |

## B. 學生睇到嘅（PDF 內容）

| # | key | English | 建議中文 |
|---:|---|---|---|
| 5 | rpdf.title | Monthly Training Report | 月度訓練報告 |
| 6 | rpdf.subtitle | Progress summary | 進度摘要 |
| 7 | rpdf.goal | Goal: {goal} | 目標：{goal} |
| 8 | rpdf.period | Report period | 報告期間 |
| 9 | rpdf.greeting | Great work this month, {name}! | {name}，本月表現出色！ |
| 10 | rpdf.stat_sessions | Sessions completed | 已完成課堂 |
| 11 | rpdf.stat_attendance | Attendance | 出席率 |
| 12 | rpdf.stat_logs | Workout logs | 訓練紀錄 |
| 13 | rpdf.stat_volume | Total volume | 總訓練量 |
| 14 | rpdf.body_title | Body composition | 身體數據 |
| 15 | rpdf.body_snapshot_note | No measurements this month — showing the latest available. | 本月未有量度紀錄，以下為最近一次數據。 |
| 16 | rpdf.col_measurement | Measurement | 項目 |
| 17 | rpdf.col_start | Start ({date}) | 期初（{date}） |
| 18 | rpdf.col_end | End | 期末 |
| 19 | rpdf.col_end_dated | End ({date}) | 期末（{date}） |
| 20 | rpdf.col_latest | Latest ({date}) | 最近一次（{date}） |
| 21 | rpdf.pr_title | All-time personal bests | 歷來個人最佳紀錄 |
| 22 | rpdf.col_exercise | Exercise | 動作 |
| 23 | rpdf.col_best | Best weight | 最佳重量 |
| 24 | rpdf.col_achieved | Achieved | 達成日期 |
| 25 | rpdf.sessions_title | Sessions | 課堂 |
| 26 | rpdf.col_date | Date | 日期 |
| 27 | rpdf.col_time | Time | 時間 |
| 28 | rpdf.col_type | Type | 類型 |
| 29 | rpdf.workouts_title | Workout summary | 訓練摘要 |
| 30 | rpdf.col_exercises | Exercises | 動作 |
| 31 | rpdf.col_volume | Volume | 訓練量 |
| 32 | rpdf.col_intensity | Intensity | 強度 |
| 33 | rpdf.no_data | No training recorded for this month yet. | 本月尚未有訓練紀錄。 |
| 34 | rpdf.fee_title | Fee summary | 費用摘要 |
| 35 | rpdf.fee_line | {month} training | {month}訓練費用 |
| 36 | rpdf.fee_due | Due date | 到期日 |
| 37 | rpdf.fee_payment | Payment: {info} | 付款方式：{info} |
| 38 | rpdf.footer_left | Made with ElitePro | 由 ElitePro 製作 |
| 39 | rpdf.footer_right | Questions? Ask your coach. | 如有疑問，請聯絡你的教練。 |

身體數據嘅欄名（體重、體脂…）用返已批嘅 `metric.*`，唔使再批。

## 批完之後 agent 會做

1. 將批咗嘅句子放入 `src/i18n/zh-HK.js`（改咗邊句就用你嘅版本）
2. 將暫存喺 `claude/import-agent-files-6qv25g` 嘅報告 code 合併返主線，跑齊測試，上線
