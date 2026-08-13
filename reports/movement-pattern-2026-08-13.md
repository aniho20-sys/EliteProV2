# Exercise Library：Filter 死機修復 + movementPattern 自動分類

**日期**：2026-08-13
**角色**：員工B（Dev）
**Commit**：`fcde74f`（filter 修復）、`e7cf25b`（自動分類）
**分支**：`claude/fitness-app-features-LbxtG`
**狀態**：Code 已推、CI 自動部署；**Firestore 一個字都未寫，等 Ani 批**

---

## 0. 摘要

| 項目 | 結果 |
|---|---|
| Filter chips 撳唔郁 | ✅ 修好，真因係 CSS stacking context，唔關 JS 事 |
| 壞咗幾耐 | 由 `b67cf69`（2026-07-24 摺埋式重做）**第一日起就係死嘅** |
| `inferMovementPattern()` | ✅ 寫好，63 條 test 全綠 |
| Seed 24 條分類 | 21 高信心已寫入；1 中 + 2 低留空等批 |
| Ani 嗰 42 條 Firestore 動作 | 🔴 **出唔到表** —— agent 冇 Firestore 讀取權限 |
| 新增動作自動預填 | ✅ 做好，可改，一手動揀就唔再覆蓋 |

---

## 1. Bug：Exercise Library filter 撳咗完全冇反應

### 1.1 逐個排除 Ani 提出嘅四個方向

| # | 查問方向 | 查證結果 |
|---|---|---|
| 1 | onClick 有冇綁到 chips 度？ | **有**，`ExerciseLibraryPage.jsx:272` `onClick={e => handlePillClick(g.key, e)}`，摺埋式改版冇漏駁線 |
| 2 | State 更新咗但 list 冇 re-filter？ | **兩樣都冇問題**。`setValue` 用 functional update，`filtered` 直接讀三個 state，一改就 re-filter |
| 3 | 三組定某一組死？ | **三組全部死**，共同成因，唔係某一組特有 |
| 4 | 邊次 commit 開始壞？ | `b67cf69`（2026-07-24），即摺埋式 chip 重做嗰次。**由引入嗰日起就冇 work 過**，唔係後來嘅 `2ce37d5` / `c0e0aa1` 整爛 |

### 1.2 真因：stacking context 令 z-index 比錯對象

```
.ex-filter-pill-outer        position: sticky; z-index: 5     ← 開咗 stacking context
  └── .ex-filter-pill-dropdown              z-index: 20        ← 封印咗喺入面
.ex-filter-pill-backdrop     position: fixed;  z-index: 10     ← root 層兄弟
```

`position: sticky` **加** `z-index` 兩者夾埋會建立一個 stacking context。一旦建立，dropdown 個 `z-index: 20` 就只喺呢個 context 內部有效；對外面嚟講，成個 filter row 連同 dropdown 都只係「z-index 5」。

backdrop 係 root 層嘅 `z-index: 10`。**10 > 5**，所以佢鋪喺 dropdown 上面。因為佢全透明（冇 background）而且 `inset: 0`，視覺上完全睇唔出：

- dropdown **見到**（backdrop 透明）
- 撳落去實際撳中 backdrop → `setOpenFilter(null)` → dropdown 收埋，一個 filter 都冇設到

用戶角度就係「撳咗完全冇反應」。

### 1.3 點解一直冇人發現

Session 34 嗰次重做係用**靜態 mockup screenshot** 俾 Ani 驗收密度效果。冇人喺真機撳一個選項落去。呢個係「screenshot 驗收」同「真機驗收」嘅差別 —— 同 invite code bug 一樣，都係靠 Ani 真機實測先揪到。

### 1.4 順手揪到第二個問題

`STYLE.md:147` 明文寫住：

> **High-frequency buttons**（set-complete checkmarks, rest-timer controls, unit pills, **filter chips**）must have a visible `:active` press state in addition to `:hover` — mobile has no hover。

而 `.ex-filter-pill` 同 `.plan-equip-chip` **兩個都只有 `:hover`**。全 app 掃過，就得佢哋兩個違規（`.intake-chip` / `.session-date-chip` / `.picker-chip` / `.ex-dupe-match` 全部有 `:active`）。即係話就算冇 z-index 個 bug，撳落去都係零回饋，會加重「好似冇反應」嘅感覺。

### 1.5 修復內容

**`src/pages/ExerciseLibraryPage.jsx`**
- backdrop 由 `.ex-filter-pill-outer` 嘅**兄弟**搬入去做**子元素** —— 令佢同 dropdown 喺同一個 stacking context 入面比較，唔再同外層個 `z-index: 5` 比
- 清除掣由裸 `<X>` SVG 改做 `<span role="button" aria-label="Clear … filter">` 包住

**`src/styles/index.css`**
- `.ex-filter-pill-dropdown` `z-index: 20 → 21`
- `.ex-filter-pill-scroll` 加 `position: relative; z-index: 20` —— 令 pill 本身都企喺 backdrop 之上，**開住一個 dropdown 撳第二個 pill 可以直接轉組，唔使撳兩下**
- `.ex-filter-pill:active` / `.plan-equip-chip:active` → `transform: scale(0.96)`（補返 STYLE.md 要求）
- `.ex-filter-pill-clear`：由 12px 圖示加 `padding: 10px` + 負 margin 抵消 → **觸控範圍 ~32px，而 pill 高度完全唔變**

三處都留咗註釋寫低點解，特別係 backdrop 嗰段講明唔好搬返出去做 sibling。

### 1.6 Sticky 行為

**冇郁過。** `position: sticky` / `top: 0` / 手機 `top: calc(72px + env(safe-area-inset-top))` 原封不動，只係喺內層子元素加 `z-index`。不過改嘅正正就係層級，所以要真機捲一捲確認。

### 1.7 Uniqueness check 覆驗（同一頁，一次過驗埋）

Code 層面通：`handleSubmit` 喺 `addExercise` 之前攔（`:204`），撞到就收 modal + 跳去嗰條 + 紅色 toast；打字期間 `liveDuplicate` 即時出「already exists」+ Go to it，`familyVariants` 出「你已經有其他器材版本，加呢個係另一個 variant」。

⚠️ **真機測試注意**：呢個檢查係「**名 + 器材兩樣都填咗**」先觸發（就係 Ani 定嗰個定義）。淨係打名、未揀 Equipment 係唔會彈提示 —— **唔係壞咗**。Equipment 個 select 喺名下面幾行。

---

## 2. `inferMovementPattern()` 自動分類

### 2.1 優先規則提案（待批）

Ani 原則：「**以動作嘅主導髖膝動作為準**」。譯成：

```
Carry → Locomotion → Hinge → Squat → Rotation → Core → Push → Pull
```

| 層 | 類別 | 理由 |
|---|---|---|
| 1 | Carry / Locomotion | 關鍵字（carry, farmer, crawl, bear）形容成個動作，唔會係某個部件 |
| 2 | **Hinge / Squat** | **Ani 條規則**：下肢主導贏上肢 |
| 3 | Rotation / Core | 排 Push/Pull 之上，令 `Pallof press` → Core 而唔係 Push |
| 4 | Push / Pull | 兜底 |

實例：

| 動作名 | 命中 | 判定 |
|---|---|---|
| Squat push press | Squat + Push | **Squat** |
| Sumo deadlift high pull | Hinge + Pull | **Hinge** |
| Leg press | Squat + Push | **Squat** |
| Pallof press | Core + Push | **Core** |
| Landmine rotation press | Rotation + Push | **Rotation** |
| Suitcase carry lunge | Carry + Squat | **Carry** |
| Bear crawl push up | Locomotion + Push | **Locomotion** |

`Hinge > Squat` 同 `Push > Pull` 呢兩對內部次序，喺 24 條 seed 度一次都冇觸發過，純粹係兜底。

### 2.2 ⚠️ 改咗關鍵字表兩處（要 Ani 批）

呢兩個唔改會**高信心咁答錯**，而高信心正正係 Ani 話唔逐條睇嗰批 —— 等於靜靜雞入錯數：

| 關鍵字 | 問題 | 處理 |
|---|---|---|
| `kickback`（Hinge） | 「Tricep kickback」只命中 kickback → **高信心判 Hinge**，實際係 Push | 名入面有 `tricep` 就唔計 → 零命中 → **低信心，交 Ani 判** |
| `curl`（Pull） | 「Leg curl」「Nordic curl」只命中 curl → **高信心判 Pull**，實際係屈膝 | 名入面有 `leg` / `hamstring` / `nordic` 就唔計 → **低信心，交 Ani 判** |

設計原則：**由「肯定講錯」變成「唔識答，問人」**。`Cable glute kickback`、`Hammer curl`、`Barbell curl` 唔受影響，照樣命中（有 test 守住）。

### 2.3 ⚠️ `movementPatterns` 加咗 `Core`

原本個 enum 得 7 個（`Hinge/Squat/Push/Pull/Carry/Locomotion/Rotation`），**冇 Core**。Ani 條規則表有 Core，唔加就推斷得出但揀唔到、篩唔到。已加。

> 📌 CLAUDE.md 嘅 `exercises` schema 註釋仍然寫住舊嘅七個，下次順手更新。

### 2.4 技術決定：字頭比對，唔用 substring

呢個唔係細節，naive substring 會出事：

- `Medicine ball th`**`row`** → 命中 "row" → 判做 Pull ❌
- 字頭比對：`throw` 唔係由 `row` 開頭 → 唔命中 ✅

同時免費拎到複數同連寫字：`rows` `pullup` `pushdown` `crabwalk` `dips` 全部命中。多字詞組（`leg press`、`good morning`）要求相鄰同順序，最後一個字先准字頭比對，所以 `Single leg calf raise` 唔會當成 `leg raise`。

全部有 test。

### 2.5 信心定義

| 信心 | 定義 |
|---|---|
| 高 | **一個**類別認頭（同一類別命中幾個關鍵字都仍然算一次認頭，例如 `Lat pulldown` 命中 pull + pulldown 都係 Pull） |
| 中 | **兩個或以上**類別命中，要靠優先次序拆 |
| 低 | 零命中 |

### 2.6 Seed 24 條結果

```
信心   | 推斷      | 動作                     | 命中關鍵字
-------+-----------+--------------------------+------------------------------
high   | Push      | Bench Press              | Push:press
high   | Push      | Incline Dumbbell Press   | Push:press
high   | Push      | Cable Fly                | Push:fly
high   | Push      | Push Up                  | Push:push
high   | Push      | Overhead Press           | Push:press
high   | Push      | Lateral Raise            | Push:lateral raise
high   | Push      | Tricep Pushdown          | Push:push/pushdown
high   | Push      | Skull Crusher            | Push:skull crusher
high   | Pull      | Barbell Row              | Pull:row
high   | Pull      | Pull Up                  | Pull:pull
high   | Pull      | Lat Pulldown             | Pull:pull/pulldown
high   | Pull      | Face Pull                | Pull:pull/face pull
high   | Pull      | Barbell Curl             | Pull:curl
high   | Pull      | Hammer Curl              | Pull:curl
high   | Hinge     | Deadlift                 | Hinge:deadlift
high   | Hinge     | Romanian Deadlift        | Hinge:deadlift
high   | Squat     | Barbell Squat            | Squat:squat
high   | Squat     | Lunge                    | Squat:lunge
high   | Core      | Plank                    | Core:plank
high   | Core      | Cable Crunch             | Core:crunch
high   | Core      | Hanging Leg Raise        | Core:leg raise
-------+-----------+--------------------------+------------------------------
medium | Squat     | Leg Press                | Squat:leg press + Push:press
-------+-----------+--------------------------+------------------------------
low    | (冇)      | Leg Curl                 | — （curl 被擋，見 2.2）
low    | (冇)      | Calf Raise               | — 冇任何關鍵字命中
```

**21 高 / 1 中 / 2 低。**

**已經寫入 `exercises.js` 嘅：淨係 21 條高信心。** 理由：Ani 明講高信心批一次過唔逐條睇，而 seed 係 code 唔係 Firestore，`git revert e7cf25b` 即刻還原。

**留空等 Ani 逐個批**：

| 動作 | 信心 | 建議 |
|---|---|---|
| Leg Press | 中 | **Squat**（膝主導） |
| Leg Curl | 低 | Hinge？定開個新類（屈膝/膕繩）？ |
| Calf Raise | 低 | 冇一個現有類啱 |

### 2.7 新增動作自動預填

- 教練打名嘅同時 Movement Pattern 自動跳，下面細字 `Suggested from the name — change it if it's wrong.`
- **一手動揀過就永久停止覆蓋**（`patternTouched` flag），之後點改個名都唔會再覆寫佢嘅選擇
- 編輯已有動作：本身有 pattern 就唔郁；本身空白就照樣建議

---

## 3. 🔴 阻塞：Ani 嗰 42 條 Firestore 動作出唔到表

Agent 冇 Firestore 讀取權限，手上得 24 條 seed。要幫嗰 42 條分類，兩條路：

**A. Ani 匯出貼返** —— Profile → Exercise Library Backup → Copy Exercise Library as JSON → 貼喺對話。即刻出足 42 行嘅表。但批完之後**仍然需要一個寫入 UI**（#26：Ani 冇 terminal）。

**B. App 內預覽 + 批准畫面**（推薦）—— 喺 Profile 加一張卡，即場對整個 library 跑規則，按信心分三組列出（動作 / 推斷 / 命中關鍵字），每行一個 checkbox，高信心組有「全選」，撳 Apply 只寫剔咗嗰啲。跟返 Phase C「Apply Approved Cleanup」個做法。

B 好處：唔使 copy paste、將來加新動作可以再跑、批准同寫入喺同一個畫面。

無論邊條，**Firestore 一個字都未寫，亦唔會自動寫**。

---

## 4. 驗證

| 項目 | 結果 |
|---|---|
| `npm test`（vitest） | **63 / 63 綠**（原有 9 + 新 54） |
| `npx eslint src/` | 0 error（1 個 pre-existing warning） |
| `npm run build` | ✅ 通過 |
| Cloud Functions / rules test | 冇改到，未重跑 |

新 test 檔 `src/utils/movementPattern.test.js` 覆蓋：30 個單一關鍵字命中、8 個優先次序拆解、信心分級、字頭比對（`throw` 唔算 row、複數、連寫、連字號）、兩個擋格關鍵字（連同「唔應該擋」嘅反例）、零命中同 null 輸入。

---

## 5. 待 Ani 拍板

1. **優先次序** `Carry → Locomotion → Hinge → Squat → Rotation → Core → Push → Pull`
2. **兩個擋格關鍵字**（tricep kickback、leg/hamstring/nordic curl）
3. **加 `Core` 落 movementPatterns**（已做，可還原）
4. **21 條高信心 seed 已寫入**（已做，可還原）
5. **Leg Press / Leg Curl / Calf Raise** 三條逐個判
6. **42 條 Firestore 動作行 A 定 B**

## 6. 真機驗收清單

CI 部署完之後：

1. 三組 filter 各撳一個 → dropdown 開到，撳選項真係篩到
2. 組合篩選（Muscle + Equipment 同時揀）→ 開住一個 dropdown 直接撳第二個 pill，一下轉組
3. 清除篩選 → pill 上面粒 ✕（範圍大咗好多）＋ 零結果時 empty state 嘅「Clear Filters」
4. Scroll 落去，chips 仲黐喺 header 下面
5. Add Exercise → 打「Bulgarian Split Squat」→ Movement Pattern 應該自動跳 **Squat**
6. Add Exercise → 打一個已有嘅名 **＋ 揀返同一個器材** → 出「already exists」
