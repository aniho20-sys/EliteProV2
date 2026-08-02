# 設計方案：Credit 透支 Booking + Session Complete 觸發條件

**日期**：2026-08-01
**狀態**：⏳ 待 Ani 批准，未動工
**角色**：員工A（SA）分析 + 員工B（Dev）實作方案

---

## 開工前嘅三個關鍵發現

### 發現 1 —— 功能【2】基本上已經係啱嘅，唔使改 code

我 grep 咗全 repo 搵所有會令 session 變 `completed` 嘅路徑，**得兩個**，兩個都係教練專用流程：

| 位置 | 觸發者 |
|---|---|
| `SchedulePage.jsx:272` | 教練撳 session 上面個 ✓ 掣 → recap modal → 「Mark Complete」 |
| `TrainerDashboard.jsx:163` | 教練喺 dashboard 撳 complete → 同一個 recap 流程 |

而且：
- `WorkoutLogPage.jsx` **完全冇** import 或者 call 過 `updateScheduleItem`，一行都冇掂過 schedule
- `addWorkoutLog()`（AppContext）淨係寫 `workoutLogs` collection，冇掂 schedule
- Cloud Function `onNewWorkoutLog` 淨係 send 個 push 俾教練，冇改任何 credit 或者 session 狀態

**即係話：學生 log workout 而家已經完全唔會觸發 session complete，亦唔會扣 credit。** 你要嘅行為已經係現狀。

所以功能【2】嘅實際工作 = **寫規則入 CLAUDE.md + 加 regression test 鎖死佢**，唔使改 production code。呢個比預期細好多，好消息。

### 發現 2 —— 「保留手動 override」呢樣係要新建，而家冇

`SchedulePage.jsx:421-433` 顯示：session 一旦變 `completed`，剩返嘅掣**得一個 Delete**。冇任何路徑可以由 `completed` 改返 `confirmed`。撳錯咗唯一做法係刪咗成條 booking 再 book 過——會連 credit 記錄一齊搞亂。

所以呢樣係真‧新功能，唔係「保留」。

### 發現 3 —— 「續約自動扣返欠嗰堂」唔使寫新 code，現有算式已經做到

`getSessionStats` 係 `remaining = totalSessions - sessionOffset`。透支就係 `sessionOffset > totalSessions`，`remaining` 自然變負數。

Top-up 加嘅係 `totalSessions`，所以：

```
透支後：  total=10, used=11  →  remaining = -1
入 10 堂：total=20, used=11  →  remaining =  9   ← 自動已經扣返欠嗰堂
```

`addCreditLedgerEntry` 現有邏輯已經係加 `totalSessions`，**唔使改**。呢個要求零新 code。

---

## 功能【1】Credit 透支 Booking

### 1.1 資料表示

唔加新欄位。透支 = `remaining` 變負數，靠現有 `totalSessions - sessionOffset` 算式表達。

- `remaining === 0`：啱啱用完，仲 book 得（book 完變 -1）
- `remaining === -1`：已透支一堂，**block**
- 上限硬性一堂 = 拒絕任何令 `remaining < -1` 嘅 booking

### 1.2 邊度攔截

現有 `SchedulePage.jsx:184` 係 `remaining <= 0` 就 block。改做 `remaining <= -1` 先 block。

**⚠️ 要你知嘅安全限制**：呢個攔截**淨係 client-side**。`firestore.rules` 嘅 schedule create 規則完全冇檢查 credit（我睇過，只檢查師生關係）。即係話一個識用 API 嘅人理論上可以繞過去 book 無限堂。

呢個係**現狀已經存在**嘅情況，唔係我新引入。三個選擇：

| 選項 | 做法 | 代價 |
|---|---|---|
| **A（建議）** | 維持 client-side 攔截 | 零額外成本。威脅要學生刻意砌 API call，而且教練喺 Needs Attention 一定見到，追得返 |
| B | `onScheduleBooked` 偵測到超額就自動 `status: 'cancelled'` | 要處理「已經 book 咗又被彈返」嘅 UX，複雜 |
| C | Firestore rules 用 `get()` 讀 user doc 比對 | 每次 booking 多一次 read 收費，rules 邏輯難維護 |

我建議 A，但呢個係你嘅風險決定，唔係純技術決定。

### 1.3 學生 book 嗰陣嘅提示

`remaining === 0` 而仲 book 得嗰陣，**唔可以靜靜雞 book 咗就算**。加一個確認彈窗（唔係 toast——呢個係涉及錢嘅確認，必須要撳）：

> **You have no sessions left**
> This session will be added to your next renewal at
> {formatCurrency(renewalRateNext)}/session.
> [ Cancel ] [ Book anyway ]

`remaining === -1` 撳 book 嗰陣：

> **Can't book — 1 session already owed**
> You've already booked one session on credit. Message your
> coach to top up before booking again.
> [ Message coach ] [ Close ]

（「Message coach」直接跳去 `/messages`，唔好淨係叫佢「聯絡教練」但唔畀路徑。）

### 1.4 creditLedger 記錄

**寫入者必須係 Cloud Function，唔可以 client-side。** 原因：`firestore.rules:89` 嘅 `creditLedger` create 規則係 `allow create: if isTrainer()` —— 學生**根本冇權**寫。而且就算改咗規則，畀學生自己寫自己嘅欠款記錄本身就唔對。

`onScheduleBooked` 已經係 server-side transaction 度加 `sessionOffset`，喺同一個 transaction 入面判斷「呢次 booking 令佢超咗 total」就順手寫 ledger entry —— 原子性有保證，篡改唔到。

Schema 加一個 `type` 欄位（現有 entry 當 `'topup'`，唔使 migrate 舊資料）：

```js
{
  clientId, trainerId,
  date: 'YYYY-MM-DD',
  type: 'overdraft',        // 新；舊 entry 冇呢個欄位 = 'topup'
  qty: -1,
  rate: null,               // 實際收幾多要等 top-up 嗰陣先定
  schedId: '<booking id>',  // 新；指返邊條 booking 造成
  addedBy: 'system',
}
```

**⚠️ 一個你要決定嘅 edge case**：學生透支咗，然後 24 小時前免費取消。現有退款邏輯會 `sessionOffset - 1`，`remaining` 返返 0 —— 佢實際上唔再欠嘢。但 ledger 嗰條 `-1` 仲喺度，會令帳目同實際 balance 對唔上。

兩個做法：
- **(i)（建議）** 退款嗰陣寫一條 `type: 'overdraft_reversed', qty: +1` 沖返，ledger 永遠對得返數
- (ii) 唔理，當 ledger 純粹係「發生過咩」嘅流水帳，balance 一律以 `remaining` 為準

我建議 (i)，因為你睇 ledger 嘅目的就係對數。

### 1.5 教練 Needs Attention

加第四類（現有三類：Renewal / At risk of churn / Training profile incomplete）：

```
● Session owed                                    (1)
┌────────────────────────────────────────────┐
│ [V] Vivian001                              │
│     Owes 1 session · GBP 75.00/session     │
│     [ Top up ]  [ Send reminder ]          │
└────────────────────────────────────────────┘
```

- 用 `--danger` 色（涉及錢，比 churn 嘅 warning 重）
- 排喺 Renewal 之上（欠緊錢比快用完更急）
- 顯示 `renewalRateNext`（佢已經用完，照定義用 after-run-out 價）
- **冇 snooze** —— 同 Training profile 一樣，唯一解決方法係真係收到錢 top up
- 「Top up」直接跳去 `/clients/{id}` 嘅 top-up 區

---

## 功能【2】Session Complete 觸發條件

### 2.1 寫規則入 CLAUDE.md（新增第 32 條）

> **32. Workout log 同 session 狀態係兩件完全獨立嘅嘢，永遠唔可以互相觸發。**
> 學生喺 `WorkoutLogPage` log workout 係佢自己嘅訓練記錄（包括自己去 gym 練），
> **永遠唔會**令任何 `schedule` doc 變 `completed`，亦**永遠唔會**扣 session credit。
> 唯一令 session 變 `completed` 嘅入口係教練撳 recap modal 嘅 Mark Complete
> （`SchedulePage.jsx` / `TrainerDashboard.jsx`，兩者都 `isTrainer` gated）。
> 呢個係刻意嘅產品設計，唔係漏做——見到「學生 log 咗就自動 mark 返 session complete
> 咁咪方便啲」呢類「優化」提議，一律拒絕。有 regression test
> （`functions/test/bookSession.test.js`）鎖住呢個行為，改壞會 fail。

### 2.2 手動 override（新功能）

completed session 加一個「Reopen」掣（教練專用），改返 `confirmed`。

**⚠️ 呢度有個真 bug 風險必須處理**：`onScheduleCreditUpdate` 而家淨係處理 `cancelled` 同 `completed` 兩個狀態。如果 reopen 一條 **legacy booking**（冇 `deductedAtBooking` flag 嗰啲，即係喺 pay-at-booking 模式之前 book 嘅）：

1. 第一次 complete → 冇 flag → 扣 1 堂
2. Reopen → `after.status === 'confirmed'` → 現有 code 乜都唔做，**冇退返**
3. 再 complete → 又係冇 flag → **再扣多一堂** ← 重複收費

處理方法：reopen 一條冇 `deductedAtBooking` 嘅 booking 時退返 1 堂，同 charge 對稱。新模式 booking（有 flag）complete/reopen 兩邊都係 no-op，本身已經安全。

呢個 case 一定要有 test cover。

### 2.3 掣文案

你講「Finish workout」，但現有掣實際寫住 **「Mark Complete」**。要唔要順手統一改做「Finish Workout」？（純文案，5 分鐘）

---

## Test 計劃

現有 12 個 test 必須全綠。新增：

| # | Test | 驗證 |
|---|---|---|
| 1 | `remaining === 0` 時 book → `sessionOffset` 加到 `total + 1`，`remaining` 變 -1 | 透支一堂行得通 |
| 2 | 透支 booking 會寫低 `type: 'overdraft'` 嘅 creditLedger entry | 唔會靜靜雞當免費 |
| 3 | `remaining === -1` 時再 book → 被 block，`sessionOffset` 唔變 | 硬上限一堂 |
| 4 | 透支後 top-up N 堂 → `remaining === N - 1` | 續約自動扣返欠嗰堂 |
| 5 | 透支後 24h 前取消 → `remaining` 返 0 + 寫 `overdraft_reversed` entry | edge case (i) |
| 6 | 建立 workout log → 同日 session 嘅 `status` 同 client 嘅 `sessionOffset` 都完全冇變 | **學生 log 唔觸發 session / 唔扣 credit（最重要嗰條）** |
| 7 | Legacy booking：complete → reopen → complete，淨係扣咗 1 堂 | 防重複收費 |
| 8 | 新模式 booking：complete → reopen → complete，credit 完全冇變 | reopen 對新模式安全 |

Test 6 係你特別強調嗰條規則嘅守門員 —— 將來有人「順手優化」加咗耦合，呢條會即刻 fail。

---

## 需要你拍板嘅 4 樣嘢

1. **§1.2** 攔截層級 —— 建議 **A（client-side，維持現狀）**，定要 B / C？
2. **§1.4** 取消透支之後 ledger 點處理 —— 建議 **(i) 寫沖返 entry**，定 (ii) 唔理？
3. **§2.3** 掣文案改唔改做「Finish Workout」？
4. 功能【2】確認咗**唔使改 production code**（淨係加規則 + test），你 OK 嗎？

---

## 落地次序（批准後）

1. CLAUDE.md 第 32 條 + Test 6（先鎖死最重要嗰條規則，獨立 commit）
2. 透支 booking：Cloud Function + ledger + client 確認彈窗 + Test 1/2/3/5
3. Needs Attention 第四類
4. Reopen override + Test 7/8
5. PROGRESS.md 記錄

每步細 commit，每步跑齊 build / lint / 全部 functions test。
