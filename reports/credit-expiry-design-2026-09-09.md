# 堂數到期日 — 系統分析方案（草案）

**狀態**：🔴 **待 Ani 拍板，未動工**
**日期**：2026-09-09
**作者**：員工A（SA）
**相關**：`ROADMAP.md` Phase 1、`reports/phase3-subscription-design.md`、常規 #26 / #27 / #33 / #35 / #36 / #37 / #38 / #40

> ⚠️ 呢份係**設計草案**，唔係已批准嘅規格。第 6 節六條問題全部未有答案，
> 未有答案之前唔可以動 code。

---

## 0. 事實校正

開會之前先校正三件事，避免方案建喺錯嘅前提上。

| 原本講法 | 查證結果 |
|---|---|
| 25 條 credit test | ✅ **準確**。`functions/test/bookSession.test.js` 正好 25 條（booking 3、cancellation 6、Mark Complete 3、reopen 2、overdraft 9、GUARDIAN 2） |
| 「Phase 6 訂閱制」 | ⚠️ `ROADMAP.md` 只有 Phase 1–5。訂閱制係 **Phase 3**，rollover / pause 設計喺 `reports/phase3-subscription-design.md`。本文一律叫 Phase 3 |
| 現有 9 個學生 | ⚠️ **未驗證**。本 session 冇 production 存取權（同 `reports/marketing-report-2026-08-28.md` 嘅「攞唔到」同一個限制）。下面問題 5 假設 9 個，實際數目要 Ani 喺 app 度確認 |

---

## 1. 核心發現 — 現有 schema 冇「批次」概念

現有 credit 係**兩個純量**，唔係一批批 package：

```js
users/{clientId}.totalSessions   // 買咗幾多堂（累加）
users/{clientId}.sessionOffset   // 用咗幾多堂（累加）
remaining = totalSessions - sessionOffset
```

`creditLedger` 記錄每次 top-up 嘅 `qty` / `rate`，**但扣數唔會歸屬去邊一次 top-up**。
`onScheduleBooked` 做嘅淨係 `sessionOffset + 1`（`functions/index.js:295`）——
佢唔知呢一堂食緊 45 堂嗰批定 10 堂嗰批。

**所以「45 堂同 10 堂唔同期限」呢個需求，現有 schema 根本表達唔到。**
呢個唔係加個欄位嘅事，係要唔要引入「批次（lot）」嘅架構分叉點。
第 2 節之後所有選項都由呢一點分開。

---

## 2. 六條設計問題

### 2.1 到期日由幾時起計

「第一堂當日開始計」對學生公平，**但有歧義**：現有 credit 係
**book 嗰刻扣，唔係上堂先扣**（Phase 1 已改成 `onScheduleBooked`）。

| 定義 | 觸發點 | 問題 |
|---|---|---|
| **1a. 第一次 book** | `onScheduleBooked` 第一次扣數 | 學生 book 一個月後嘅堂，期限即刻行 |
| **1b. 第一堂真正完成** | Mark Complete | new-model booking 嘅 Mark Complete 而家係 **no-op**（`bookSession.test.js:248`），要新開寫入路徑 |

**建議 1a。** 1b 有漏洞：學生一直唔上堂、或者教練唔撳 Mark Complete，
期限永遠唔開始，等於冇期限。1a 嘅不公平可以用「期限夠長」補償。

**追蹤「未開始」嘅複雜度：低。** 兩個 nullable 欄位：

```js
creditStartedAt: string | null    // null = 買咗未用過
creditExpiryDate: string | null   // 由 creditStartedAt + N 個月算出，寫死落 DB
```

`onScheduleBooked` 喺**同一個 transaction** 入面：若 `creditStartedAt == null`
就寫入今日 + 計 expiry。同扣數同一個 transaction，唔會出現「扣咗數但冇 set 開始日」。

⚠️ **邊界待決**：早取消退返嗰一堂，會唔會「取消」開始日？
建議**唔回退**（否則可以無限重置期限），但呢個係取捨。

---

### 2.2 期限長度邊個定 —— 三條路線

| | 做法 | 答唔答到「45 堂 vs 10 堂」 | 代價 |
|---|---|---|---|
| **A** | 全域設定（Profile 一個「有效期 N 個月」） | ❌ 答唔到 | 最平，25 條 test 改動極少 |
| **B** | Top-up 逐次填期限，**全客戶一個到期日**（多次 top-up 取最遲） | 🟡 半答 | 中等。10 堂嗰批會被拉長到 45 堂嗰批嘅期限 |
| **C** | 批次（lot）：每次 top-up 一批獨立堂數，各有 qty + 期限 + 已用量，扣數 FIFO | ✅ 完全答到 | **最貴 — 重寫 credit 核心** |

**方案 C 嘅真實代價（唔可以低估）**：

- `remaining` 唔再係 `totalSessions - sessionOffset`，變成「所有未過期 lot 剩餘總和」
- 三個 Cloud Function（`onScheduleBooked`、`onScheduleCreditUpdate`、`onSessionsLow`）全部要改
- **25 條 test 全部重寫**，唔係加幾條
- overdraft（常規 #33）要重新定義：透支嗰堂記喺邊個 lot？
- `creditLedger` 而家 append-only（`firestore.rules:134-135` 明文 `update: if false`），
  而 lot 要更新「已用量」→ **唔可以直接改 creditLedger**，要開新 collection `creditLots`
- 然後就有兩個真相來源（純量 vs lots）會 diverge 嘅風險

**建議：唔好一步跳去 C。** 先做 A 或 B 拎經驗，C 留返做獨立 Phase。
理由：而家零外部教練，per-package 期限係「客多先痛」嘅問題，
而重寫 credit 核心係「而家就可能整爛已上線功能」嘅風險。

---

### 2.3 過期堂數點處理（商業決定）

| | 選項 | 學生體驗 | 商業效果 |
|---|---|---|---|
| **3a** | 只提醒，永不作廢 | 最好 | 等於冇期限 |
| **3b** | 寬限期 N 日，之後**凍結**（唔畀 book，堂數仲喺度，可人手解凍） | 好 | 有催促力，唔會令學生覺得被搶錢 |
| **3c** | 寬限期 N 日，之後**作廢**（堂數歸零 + ledger entry） | 差 | 最強催促，最易收投訴 |
| **3d** | 過期轉「付費重啟」 | 中 | 有收入，但要收款機制（Phase 3 未通） |

**建議 3b**，理由係風險不對稱：

> 「凍結」錯咗，學生投訴，解凍就冇事。
> 「作廢」錯咗，學生已付嘅錢冇咗，賠唔返信任。

同常規 #35 同一種思維 —— 可逆嘅保守動作勝過唔可逆嘅自信動作。
而且第一批試呢個功能嘅係現有真學生，唔係測試帳號。

⚠️ **硬規矩（無論揀邊個）**：過期／凍結**必須寫一條 `creditLedger` entry**
（`type: 'expired'`），唔可以淨係喺 read-time 計出嚟就當發生咗。
堂數係已付款嘅嘢，一定要有可審計記錄 —— 同 overdraft 記債同一個道理（#33）。

---

### 2.4 同 Phase 3 訂閱制點互動

讀完 `phase3-subscription-design.md` §3 之後嘅結論可能同直覺相反：

> **訂閱制唔應該有到期日 —— 佢已經有一個到期機制，叫 rollover cap。**

設計文件寫明每月 grant = `tier + rolloverBanked`，而
`newRollover = min(未用完, floor(tier/2))`。即係用唔晒嘅堂每個月自動蒸發到最多一半。
**咁本身就係「用唔晒會冇」**，再加到期日係雙重懲罰，
而且兩套規則會打架（到期日話仲有 3 個月，rollover 話下個月剩一半）。

**建議：到期日只適用於 pack（買堂），訂閱制豁免。**
`ROADMAP.md` Phase 3 本身講明 pack 同 subscription 係
「permanent dual-mode structure」，規則唔同係合理嘅。

**Pause 順唔順延**：若採納上面豁免，呢條問題就唔存在。
但 dual-mode 容許一個客同時有 pack 堂數 + 訂閱，
咁 pause 期間 pack 到期日**應該順延** —— pause 期間佢冇得上堂，
唔順延即係罰緊佢用一個佢冇得用嘅期限。

---

### 2.5 現有學生點處理

底線（唔可以令佢哋啲堂突然過期）有一個乾淨做法：

```js
creditExpiryDate: null   // null = 永不過期
```

`null` 唔係「未設定」，係一個**有意義嘅值**：呢批堂冇到期日。
所有現有學生保持 `null`，現狀不變、零風險。
到期日只適用於功能上線之後嘅**新 top-up**。

好處：

- 唔使 migration script（#26 Ani 冇 terminal；#27 唔批量改歷史資料）
- 唔使一次過同 9 個學生解釋「你啲堂而家有期限」
- Ani 可以逐個客手動加期限，或者等佢哋下次 top-up 自然帶入

⚠️ **未解決**：現有學生下次 top-up 之後點算？
原本 20 堂（無限期）+ 新買 10 堂（3 個月期）——
純量模型表達唔到，即係問題 2 再出現一次。
A / B 之下建議：**新 top-up 唔會令舊堂變成有期限**，
個客整體維持 `null` 直到舊堂用完。對學生有利、實作簡單，
但代表 A / B 之下呢批客實際上一直冇期限。
**接受唔到呢點，就係第二個推去方案 C 嘅理由。**

---

### 2.6 顯示位置

| 位置 | 顯示 | 備註 |
|---|---|---|
| 學生 package 卡（`ClientDashboard.jsx:136`） | 剩餘堂數下面加「有效期至 YYYY-MM-DD」；未開始用顯示「首次上堂後開始計」 | 沿用 `getSessionColor()` 三色 |
| 教練 client detail | 同上 + 「延期 / 解凍」按鈕（若揀 3b） | |
| Needs Attention（`TrainerDashboard.jsx:317`） | 加第 5 類「快到期」 | ⚠️ 見下 |
| Push notification | 沿用 `onSessionsLow` 模式，到期前 30 / 7 日各推一次 | 需新 scheduled function |

⚠️ **UX 風險**：Needs Attention 而家預設只顯示 3 個（`cap()` at `TrainerDashboard.jsx:320`），
已有 4 類（owed / renewal / churn / trainingProfile）。加第 5 類會令原本嘅
owed / renewal 更易被擠走。**排序要員工D review**，唔應該由 SA 一個人定。

---

## 3. 推薦組合

**方案 B ＋ 3b 凍結 ＋ 訂閱制豁免 ＋ 現有客 `null`**

1. `users/{clientId}` 加三個 nullable 欄位：`creditStartedAt`、`creditExpiryDate`、`creditFrozenAt`
2. Top-up 對話框加「有效期」下拉（3 / 6 / 12 個月 / 無期限），逐次揀，預設值由 Profile 全域設定
3. 多次 top-up 取**最遲**嗰個到期日（對學生有利嘅方向取整）
4. `onScheduleBooked` 第一次扣數時，同一 transaction 寫 `creditStartedAt` + 計 `creditExpiryDate`
5. 每日 scheduled function 檢查過期 → 過寬限期 set `creditFrozenAt` + 寫 `creditLedger` entry
6. 凍結 = `onScheduleBooked` 拒絕新 booking（同 overdraft 上限同一個位置擋），**堂數數字唔郁**
7. 教練有「解凍 / 延期」按鈕

**點解 B 唔係 A**：B 只比 A 多一個下拉，但畀到 45 堂同 10 堂填唔同數字。
**點解唔係 C**：見 2.2。

---

## 4. 測試計劃

**驗收門檻：現有 25 條必須全綠、一條都唔改。**
若任何一條要改，代表改變咗現有 credit 行為，方案打回頭重諗。

新增（估算 14 條，全部 emulator，常規 #38）：

| 類別 | 條數 | 重點 |
|---|---|---|
| 開始日 | 3 | 第一次 book set 開始日；第二次唔覆蓋；早取消唔回退 |
| 到期計算 | 3 | 月尾邊界（1月31日 + 1個月）、跨年、`null` 永不過期 |
| 凍結 | 4 | 寬限期內照 book；過寬限期擋；凍結唔改堂數數字；解凍後可再 book |
| 互動 | 2 | 訂閱制客戶唔受影響；pause 期間順延 |
| **GUARDIAN** | 2 | **`creditExpiryDate: null` 嘅現有客永遠唔會被凍結或過期** |

最後兩條守 2.5 嘅底線，同 `bookSession.test.js` 現有 GUARDIAN describe 同一 pattern。

**常規 #40**：每條 guard 要實測注入 bug 令佢 fail，
而且注入之前先用 `git diff --stat` / `grep -c` **證明注入真係改到檔案** ——
唔可以見綠燈就當 guard 冇牙。

**常規 #36**：到期日下拉、解凍按鈕都係互動元件，
最後驗收**必須 Ani iPhone 真機撳過**，agent 做唔到呢一步。

---

## 5. 未解決 / 已知限制

- 現有學生實際數目未驗證（本 session 冇 production 存取權）
- A / B 之下，現有客實際上永久冇期限（見 2.5）
- 過期偵測要新 scheduled function；`cleanupExpiredGcNonces` 係現成先例
- 寬限期長度未定（建議 30 日）

---

## 6. 待 Ani 拍板 —— 六條答完先動工

| # | 問題 | 員工A 建議 |
|---|---|---|
| 1 | 開始日：**1a 第一次 book** 定 **1b 第一堂完成** | **1a** |
| 2 | 架構：**A 全域** / **B 逐次填** / **C 批次 FIFO** | **B** |
| 3 | 過期：**3a 只提醒** / **3b 凍結** / **3c 作廢** / **3d 付費重啟** | **3b** |
| 4 | 訂閱制豁免到期日？ | **豁免** |
| 5 | 現有客一律 `null` 永不過期？ | **係** |
| 6 | Needs Attention 加第 5 類？（要員工D review 排序） | **加，但要 D 睇過** |

附帶兩條：

- 早取消**唔回退**開始日 —— 接受？
- 寬限期 **30 日** —— 定 14 / 60？

---

_內部設計草案，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
