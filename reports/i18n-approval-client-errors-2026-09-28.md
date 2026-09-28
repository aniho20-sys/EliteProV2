# 中英對照表（待批）—— 「App 錯誤」卡（B25）

**日期**：2026-09-28
**邊個睇**：只有 Ani（Profile 頁，教練身份）。
**點解要批**：翻譯規則（#28），語言掣開放俾教練，一句未批 CI 就唔俾上線。
`{count}` `{when}` `{people}` 係數據，唔譯。「Claude」係名，唔譯。

| # | key | English | 建議中文 |
|---:|---|---|---|
| 1 | errors.title | App errors | App 錯誤 |
| 2 | errors.desc | Crashes and failures from everyone's phones, newest first. Copy one and paste it into a Claude chat to get it fixed. | 所有用戶手機上出現的錯誤，最新的排最前。複製其中一項，貼到 Claude 對話即可跟進修正。 |
| 3 | errors.empty_title | No errors reported | 未有錯誤報告 |
| 4 | errors.empty_desc | If the app crashes on anyone's phone, it appears here and you get a notification. | 如果 app 在任何人的手機上出錯，會在此顯示，你亦會收到通知。 |
| 5 | errors.load_failed | Could not load the error reports. Check your connection and try again. | 未能載入錯誤報告，請檢查網絡連線後再試。 |
| 6 | errors.seen | Seen {count}× · last {when} | 出現 {count} 次 · 最近一次 {when} |
| 7 | errors.affected | Accounts affected: {people} | 受影響帳戶：{people} |
| 8 | errors.details | Details | 詳情 |
| 9 | errors.copy | Copy for Claude | 複製給 Claude |

## 批完之後 agent 會做

放入 `src/i18n/zh-HK.js`，將暫存喺 `claude/import-agent-files-6qv25g` 嘅卡合併返主線，跑齊測試，上線。
