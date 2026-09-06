# 中英對照表（待批）—— 教練首頁 TrainerDashboard

**日期**：2026-09-06
**批核人**：Ani
**規則**：跟 `zh-HK.js` 檔頭語域規則 —— 繁體書面語、唔用口語字、「堂／教練／預約／剩餘」
**現況**：呢一版 **59 條**（54 條 JSX 文字 + 5 條 props），另加 8 條收埋喺 JS 運算式、掃描器睇唔到嘅

> **點解淨係出呢一版，唔係一次過出 547 條**：547 行對照表喺手機上冇可能逐句睇得完，而「批得馬虎」比「未批」更差 —— 上次 movement pattern 就係高信心嗰批被批量放行先出事（#35）。所以分頁出，你逐頁批。次序建議見審計報告尾。
>
> **未批就唔會入 `zh-HK.js`**（#28）。你可以逐行改、逐行刪。

**圖例**：♻️ = 沿用現有 key，唔使新增，改嘅話會連帶影響學生端

---

## 1. 起步卡（新教練未有學生時先出現）

| # | English | 建議中文 | |
|---:|---|---|---|
| 1 | Get Started | 開始使用 | |
| 2 | Your training platform — 3 steps to go live: | 你的訓練平台 —— 三步即可啟用： | |
| 3 | Share your invite code with clients: | 向學生分享你的邀請碼： | |
| 4 | Copy | 複製 | |
| 5 | Client enters code to connect | 學生輸入邀請碼連接 | |
| 6 | Assign a workout plan | 指派訓練計劃 | |
| 7 | Book your first session | 預約第一堂 | |

## 2. 四格數字

| # | English | 建議中文 | |
|---:|---|---|---|
| 8 | Clients | 學生 | ♻️ `nav.clients` |
| 9 | Today | 今日 | |
| 10 | Unread | 未讀 | |
| 11 | Plans | 計劃 | ♻️ `nav.plans_short` |

## 3. 下一堂

| # | English | 建議中文 | |
|---:|---|---|---|
| 12 | Up next | 下一堂 | |
| 13 | min | 分鐘 | |
| 14 | No sessions scheduled today | 今日沒有安排課堂 | |
| 15 | Book a session | 預約課堂 | ♻️ `dash.book_a_session` |
| 16 | Active this week: | 本週活躍： | |
| 17 | clients | 位學生 | |

## 4. 需要跟進（Needs attention）

| # | English | 建議中文 | |
|---:|---|---|---|
| 18 | Needs attention | 需要跟進 | |
| 19 | All clear ✅ — no clients need attention right now. | 一切正常 ✅ —— 暫時沒有學生需要跟進。 | |
| 20 | View all | 查看全部 | ♻️ `common.view_all` |
| 21 | Show less | 收起 | |

### 4a. 欠堂

| # | English | 建議中文 | |
|---:|---|---|---|
| 22 | Session owed | 欠一堂 | |
| 23 | Owes | 欠 | |
| 24 | session | 堂 | |
| 25 | /session | /堂 | ♻️ `common.per_session` |
| 26 | Top up | 增加堂數 | |

### 4b. 續堂

| # | English | 建議中文 | |
|---:|---|---|---|
| 27 | Renewal | 續堂 | |
| 28 | · Renewal due | · 需要續堂 | |
| 29 | Sessions used up | 堂數已用完 | ⚠️ 藏喺運算式 |
| 30 | {n} session(s) left | 剩餘 {count} 堂 | ♻️ `dash.sessions_left_count_other` ⚠️ 藏喺運算式 |
| 31 | Send renewal reminder | 發送續堂提醒 | ⚠️ 藏喺運算式 |
| 32 | Sending… | 發送中… | ⚠️ 藏喺運算式 |
| 33 | Snooze | 暫緩 | |
| 34 | days | 日 | |

### 4c. 流失風險

| # | English | 建議中文 | |
|---:|---|---|---|
| 35 | At risk of churn | 有流失風險 | |
| 36 | No activity yet | 尚未有訓練紀錄 | ⚠️ 藏喺運算式 |
| 37 | Inactive {n} day(s) | 已 {count} 日沒有訓練 | ⚠️ 藏喺運算式 |
| 38 | Send a check-in | 發送關心訊息 | |

### 4d. 訓練資料未完成

| # | English | 建議中文 | |
|---:|---|---|---|
| 39 | Training profile incomplete | 訓練資料未完成 | |
| 40 | Has upcoming session, no profile | 已預約課堂，但未填訓練資料 | |
| 41 | Ask to complete profile | 提醒填寫訓練資料 | |

## 5. 今日課堂

| # | English | 建議中文 | |
|---:|---|---|---|
| 42 | Today's Schedule | 今日課堂 | ♻️ `dash.todays_schedule` |
| 43 | View All | 查看全部 | ♻️ `common.view_all` |
| 44 | No clients yet | 尚未有學生 | prop |
| 45 | Invite your first client to see their activity here. | 邀請第一位學生，這裡就會顯示他們的訓練動態。 | prop |
| 46 | No sessions today | 今日沒有課堂 | ♻️ `dash.no_sessions_today` prop |
| 47 | Enjoy the rest day, or book a new session from the Schedule page. | 好好休息，或在「課堂」頁預約新課堂。 | prop |
| 48 | Mark as complete | 標記為完成 | prop |

## 6. 未讀訊息

| # | English | 建議中文 | |
|---:|---|---|---|
| 49 | Unread Messages | 未讀訊息 | |
| 50 | All caught up! | 全部已讀！ | prop |
| 51 | No unread messages from your clients right now. | 暫時沒有學生的未讀訊息。 | prop |

## 7. 本週課堂

| # | English | 建議中文 | |
|---:|---|---|---|
| 52 | This Week's Sessions | 本週課堂 | |
| 53 | Schedule | 課堂 | ♻️ `nav.schedule` |
| 54 | {n} session(s) this week | 本週 {count} 堂 | |
| 55 | confirmed | 已確認 | |

## 8. 跟進訊息 modal

| # | English | 建議中文 | |
|---:|---|---|---|
| 56 | Follow-up Message | 跟進訊息 | |
| 57 | To: | 收件人： | |
| 58 | Cancel | 取消 | ♻️ `common.cancel` |

## 9. 完成課堂 modal

| # | English | 建議中文 | |
|---:|---|---|---|
| 59 | Complete Session | 完成課堂 | |
| 60 | Client | 學生 | ♻️ `nav.clients` |
| 61 | Date | 日期 | |
| 62 | Type | 類型 | |
| 63 | Message to client (optional) | 給學生的訊息（可選） | |
| 64 | Send recap message to client | 傳送課堂總結給學生 | |

---

## 我特別想你留意嘅四條

| # | 位置 | 問題 |
|---|---|---|
| 22–24 | 欠堂 | 「Session owed」我譯咗「欠一堂」——透支上限係一堂（#33），所以寫死「一」比「欠課堂」清楚。但如果你將來放寬上限，呢句要改。要唔要保守啲用「欠堂」？ |
| 27 | Renewal | 學生端已經用緊「續堂」（`dash.renew`）。教練端跟同一個字，定係教練端想用「續約」（偏商業）？ |
| 38 | Send a check-in | 「關心訊息」係我加咗語氣。中性啲可以係「發送問候」。你揀。 |
| 47 | 休息日空狀態 | 原文「Enjoy the rest day」帶少少輕鬆語氣，中文譯到會變得好平。「好好休息」已經係我覺得最自然嘅版本，但如果你想更直接，可以剩返「今日沒有課堂，可在「課堂」頁預約。」 |

## 批核方式

直接喺對話講就得，例如：
- 「全部照用」
- 「22 用『欠堂』，38 用『發送問候』，其餘照用」
- 「1–21 批咗，其餘遲啲再睇」

批完我先寫入 `zh-HK.js`，同時將 `TrainerDashboard.jsx` 全部字串經 `t()`，然後 `AWAITING` 個 59 跌到 0、檔案轉入 `TRANSLATED_FILES`。

---
_內部工作文件，Cantonese working doc — 見 CLAUDE.md「Working Rules」_

---
---

# 附錄 A —— ProfilePage 四條「藏喺運算式」嘅字串（一併待批）

Ani 2026-09-06 指示：第三層盲點暫時唔用 regex 捉，但 **ProfilePage 已知嗰批照修**。

呢四條嘅特別之處：**`ProfilePage.jsx` 已經喺 `TRANSLATED_FILES` 入面、eslint 綠燈、掃描器報 0 條** —— 但佢仍然會向教練彈英文。因為佢哋唔係 JSX 文字，係 JS 運算式，三個機制全部睇唔到。

| # | 位置 | English | 建議中文 |
|---:|---|---|---|
| A1 | `:215` toast | GoCardless isn't set up yet — check back soon. | GoCardless 尚未設定完成，請稍後再試。 |
| A2 | `:216` toast | Could not start GoCardless connection | 無法開始連接 GoCardless |
| A3 | `:295` 分享標題 | Join me on ElitePro | 邀請你使用 ElitePro |
| A4 | `:296` 分享內文 | Your coach has invited you to ElitePro! Use invite code: {code} or tap the link. | 你的教練邀請你使用 ElitePro！邀請碼：{code}，或直接點擊連結。 |

### ⚠️ A3／A4 有個設計問題要你決定

呢兩句係**教練喺自己部機按「分享」時產生**，但**讀嘅人係未註冊嘅學生**。

所以佢會跟**教練嘅語言設定**，唔係讀者嘅。即係話：一個英文介面嘅教練分享出去，收到嘅香港學生見到英文；一個中文介面嘅教練分享出去，收到嘅英國學生見到中文。

三個做法：

| | 做法 | 代價 |
|---|---|---|
| **(a)** | 照跟教練語言（最簡單，就係上面個建議） | 收件人可能睇唔明 |
| **(b)** | 永遠英文（當佢係對外文案，唔入字典） | 中文教練分享出去係英文，感覺唔一致 |
| **(c)** | 中英雙語一次過寫晒 | 訊息長一倍，但兩邊都讀得明 |

**我建議 (c)**，因為呢條訊息嘅唯一用途就係俾一個你未知佢用咩語言嘅人睇 —— 呢個係少數「雙語」真係比「揀一種」好嘅情況。但呢個係你嘅品牌決定，唔係技術決定。

### 一個排序限制要講清楚

`CLIENT_ONLY_UNTIL_TRAINER_TRANSLATED` 而家係 `false`（語言掣已對教練開放），所以 `dictionary.test.js` 個 gate 要求 **`en.js` 每一條 key 都必須有中文**。

即係話：**新增 en key 同寫入中文必須喺同一個 commit**，唔可以「先改 code、中文遲啲補」—— 中間嗰個狀態會直接 build fail。

所以呢四條同 TrainerDashboard 嗰 64 條一樣，**要你批咗我先郁 code**。冇批之前我唔會改 `ProfilePage.jsx`。

---
---

# 附錄 B —— 教練端全部工作量（Ani 要求，用嚟排次序）

用同一個掃描器計。「唯一」= 去重之後嘅條數（實際要諗嘅翻譯數）；長度分佈用嚟估難度 —— **短標籤快而且大量可以沿用，長句先係真正花時間嗰啲**。

## 教練專用（339 條）

| 頁面 | 總數 | 唯一 | 短(≤2字) | 中(3-6) | 長(>6) | 註 |
|---|---:|---:|---:|---:|---:|---|
| **TrainerDashboard** | **59** | — | — | — | — | 🔵 對照表已出，等你批 |
| ClientDetailPage | 114 | 97 | 82 | 28 | 4 | 數字最大，但 82 條係一兩個字嘅標籤 |
| PlatformStatsCard | 56 | 52 | 35 | 10 | **11** | 每條最重 —— 11 條長句 |
| InvoicePage | 42 | 37 | 36 | 5 | 1 | 幾乎全部短標籤，最易做 |
| BusinessAnalyticsPage | 18 | 18 | 8 | 9 | 1 | |
| ClientProgressOverviewPage | 18 | 18 | 17 | 1 | 0 | 全部短標籤 |
| ClientsPage | 11 | 11 | 7 | 3 | 1 | |
| MonthlyReportModal | 10 | 10 | 4 | 5 | 1 | |
| MovementPatternScanner | 8 | 8 | 2 | 4 | 2 | |
| NotesSection | 3 | 3 | 0 | 3 | 0 | |

## 共用（179 條）—— 譯咗兩邊都受惠

| 頁面 | 總數 | 唯一 | 短 | 中 | 長 |
|---|---:|---:|---:|---:|---:|
| WorkoutPlansPage | 59 | 52 | 43 | 13 | 3 |
| ExerciseLibraryPage | 56 | 48 | 29 | 21 | 6 |
| ProgressView | 22 | 18 | 21 | 1 | 0 |
| ExerciseProgress | 11 | 11 | 9 | 2 | 0 |
| SessionDateList | 10 | 10 | 8 | 2 | 0 |
| ExerciseDetailModal | 8 | 8 | 7 | 1 | 0 |
| NotificationCenter | 4 | 3 | 3 | 1 | 0 |
| GlobalSearch / MuscleSelector / MessagesPage | 各 3 | 各 3 | | | |

## 睇數字之後我改咗睇法

**「條數大」唔等於「工夫大」。** `ClientDetailPage` 114 條睇落最嚇人，但入面 82 條係一至兩個字嘅標籤（Age、Goals、Notes、Plans…），大部分同 `nav.*` 或者已有 key 重複，實際要諗嘅新翻譯遠少過 97。

反而 `PlatformStatsCard` 得 56 條但有 **11 條長句**，每條都要斟酌語氣 —— 佢係「每條最貴」嗰版。

### 建議次序（你拍板）

| 順序 | 內容 | 條數 | 理由 |
|---|---|---:|---|
| 1 | **TrainerDashboard** + 附錄 A 四條 | 63 | 你日日開，對照表已出 |
| 2 | InvoicePage + ClientProgressOverview + ClientsPage | 71 | **三頁 71 條入面 60 條係短標籤** —— 投入產出比最高，一批清三版 |
| 3 | ClientDetailPage | 114 | 你第二常用；短標籤為主，做得快 |
| 4 | 共用兩大頁（WorkoutPlans + ExerciseLibrary） | 115 | 順手修好學生端一半 |
| 5 | PlatformStatsCard | 56 | 長句最多，留返最後慢慢斟 |
| 6 | 其餘散件 | 66 | |

**我建議第 2 項排喺 ClientDetailPage 之前** —— 一次過清三版，你落任何一版都唔會再見到半中半英，心理上比「一版大嘅做到一半」好好多。
