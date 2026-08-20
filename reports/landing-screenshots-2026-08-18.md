# Landing page 截圖：用真 component render，同途中揪到嘅六個 bug

**日期**：2026-08-18
**角色**：員工D（UI/UX）+ 員工B（Dev）
**Commits**：`58f261a`（建立 render 機制）、`2cf6550`（改用教練端畫面 + 兩個 bug）、`4162020`（對比度 bug）
**分支**：`claude/fitness-app-features-LbxtG`

---

## 0. 摘要

| 項目 | 結果 |
|---|---|
| 截圖 slot 數目 | **3 個**（唔係 5 個 —— `SOLUTIONS` 陣列得三項） |
| 做法 | 真 component + 真 `index.css` + 假數據，Playwright render |
| Demo 帳號 / 真數據 | **零**。stub `AppContext`，唔經 Firebase |
| 第 2、3 張 | 一開始擺錯咗學生端，**Ani 捉到，已改成教練端** |
| 途中揪到嘅真 bug | **6 個**（7 個位置），全部已修 |
| 未修、等 Ani 決定 | 3 項（見 §6） |

---

## 1. 三個 slot 對應邊段文案

| 檔案 | Landing page 第 3 段嘅文案 | 而家影邊版 |
|---|---|---|
| `plan.png` | **"Write the plan once. They see it instantly."** | 教練 **Workout Plans**：Create Plan、按學生分組、逐個 plan 有編輯／複製／刪除 |
| `sessions.png` | **"Session credits count themselves."** | 教練 **Client Detail → Summary 卡**：`10 / 12`、`2 remaining`、**+ Top Up** |
| `dashboard.png` | **"The dashboard tells you who to chase."** | 教練 **Dashboard → Needs Attention**，四種狀態齊 |

### 1.1 一開始擺錯咗

第一版嘅 `sessions.png` 用咗學生嘅「Your package」堂數卡，`plan.png` 用咗學生嘅 My Workouts。

**Ani 指出**：教練端根本冇呢兩版。成版 landing page 係賣俾教練睇，一個教練評估緊個產品，見到兩張佢自己登入之後永遠見唔到嘅畫面。

已改。`dashboard.png` 一開始就係教練端，冇改動。

---

## 2. Render 機制（`mock/`）

新目錄 `mock/`，一個 Vite entry：

- mount **真嘅** `TrainerDashboard` / `ClientDetailPage` / `WorkoutPlansPage`
- 塞一個 **stub 咗嘅 `AppContext`**（假數據，唔經 Firebase）
- import **真 `src/styles/index.css`**
- Playwright 截圖，每張裁到對應文案講緊嗰段為止

### 2.1 點解要咁做而唔係另畫一套

class name 一改，下次 re-render 就會跟住變。手畫嘅 mockup 第一次改 CSS 就開始同真實產品脫節。

**而且**：呢個做法本身就係一個偵錯器。§3 嗰六個 bug **全部係 render 出嚟見到嘅**，唔係睇 code 睇出嚟。

### 2.2 唔會出街

Vite build 只食 root `index.html`，`mock/` 唔係 build entry。驗證方法：`npm run build` 之後 `ls dist/mock` → 唔存在。

### 2.3 假數據

| 角色 | 名 | 用嚟示範 |
|---|---|---|
| 教練 | Jordan Blake | — |
| 學生 1 | **Alex Chen** | Session owed（透支 1 堂） |
| 學生 2 | **Sam Reid** | Renewal（剩 2 堂） |
| 學生 3 | **Jamie Wu** | At risk of churn（27 日冇活動） |
| 學生 4 | Priya Nair | Training profile incomplete |

Ani 指定咗頭三個名。**Priya Nair 係我加嘅** —— Needs Attention 有四類，四個狀態要四個人先展示得晒。

### 2.4 「View all」係真實 UI 狀態

Needs Attention 摺埋狀態**最多只顯示 3 行**（`TrainerDashboard.jsx:315` 個 `cap`）。四類要全部見到，就要撳「View all」。

所以 render script 喺截圖前**真係撳咗嗰粒掣**。呢個係真實 UI 狀態，唔係造假 —— 真機撳都係一樣。

---

## 3. 途中揪到嘅六個 bug（全部已修）

> 六個入面有五個係**「讀一個唔存在嘅欄位／傳錯參數，然後靜靜雞出錯值」**。呢類 bug build 過、lint 過、test 過，全部照樣過關 —— 只有真 render 出嚟先見到。

### 3.1 🔴 `TrainerDashboard.jsx:62` —— 「Active this week」永遠 0

```js
const weekStart = localDateAdd(today, -7);   // ❌ localDateAdd 只收一個參數
```

`days` 收到嘅係個日期字串 → `weekStart` = **`"NaN-NaN-NaN"`**。而 `"2026-08-14" >= "NaN-NaN-NaN"` 對**任何**真實日期都係 `false`（`'2'` 嘅碼位細過 `'N'`）。

**影響**：每個教練首頁嘅「Active this week」由第一日起就係 `0/N`。

**呢個係第二次出現** —— `ClientDashboard.jsx:52` 同一個誤用，8-15 已修。

### 3.2 🔴 `ClientDashboard` Body Stats 出「undefined」

```js
{ label: 'Body Fat', value: `${latestStat.bodyFat}%` },
```

冇 guard。學生淨係磅重、唔度圍度（好常見），塊 dashboard 就會寫住 **`undefined%`**、**`undefinedcm`**。

同一張卡上面個 stat pill 本身已經有 `'--'` fallback，格仔冇跟。已補。

### 3.3 🔴 `ClientDetailPage:427` —— 教練見到「Id」同「AddedBy」做體測指標

```js
Object.entries(latestStat).filter(([k]) => k !== 'date')
```

只濾走 `date`，但每條 bodyStat 仲有 **`id`** 同 **`addedBy`**（`addBodyStat` 寫入）。

**教練望住學生嘅體測卡，會見到一格寫住 `b2cm` 標籤係 `Id`，另一格 `selfcm` 標籤 `AddedBy`。**

改成由 `data/metrics.js` 嘅 `METRICS` 驅動（本身就係權威清單，#37 第 3 項），缺值出 `--`。順手解決埋同一張卡嘅 `undefinedcm`。

### 3.4 🔴 `ClientDetailPage:447` —— 「Completed Workouts」永遠 0

```js
logs.filter(l => l.completed).length
```

`workoutLogs` 文件**根本冇 `completed` 呢個欄位** —— 只有入面每一組 set 先有。Grep 過全 repo，冇任何地方寫過。

改成 `logs.length`：存低咗一份 log 就係做完一次訓練，同 `ClientDashboard` 個 Total 用同一個算法，兩個畫面唔會再打對台。

### 3.5 🟡 `StudioBookingPage` ×2 —— 同一個 `localDateAdd` 誤用

第 71、89 行。`GYMLA_ENABLED=false` 之下未爆，但開關嗰日就會。

**根因**：`dateUtils` **一直缺一個「由某日加 N 日」嘅 helper**，只有 `localDateAdd(days)`（相對今日）。大家想要後者行為就照傳日期字串入去，靜靜雞變 `NaN`。

已加 `addDays(dateStr, days)`，三處改晒，`renewalPrompt.js` 入面嗰個私人副本亦都收返埋一齊。**呢個係修根，唔係修症狀。**

### 3.6 🔴 `.plan-card-toggle` —— plan 名黑字深色卡

```css
.plan-card-toggle { background: none; border: none; /* 冇 color */ }
```

`.plan-card-toggle` 係個 **`<button>`**。Button **唔繼承 `color`** —— UA stylesheet 硬套 `buttontext`（接近全黑）。入面個 plan 名係 `<h3 class="card-title">`，而 **`.card-title` 自己都冇設 `color`**，於是繼承咗個 button 嘅黑色。

**Light mode 完全睇唔出**（黑字白卡本身就啱），所以一直冇人發現。

修法：`color: inherit`。

**瀏覽器實測 computed style**：

| | 前 | 後 |
|---|---|---|
| 文字 | `rgb(0,0,0)` | `rgb(232,234,240)` = `var(--text)` |
| 背景 | `rgb(26,29,40)` | 同上 |
| **對比度** | **1.19 : 1** ❌ | **13.96 : 1** ✅ |

WCAG AA 要 4.5:1、AAA 要 7:1。

**掃埋同類**（`background: none` + `border: none` + 冇 `color`），五個：

| Class | 判定 |
|---|---|
| **`.plan-card-toggle`** | 🔴 真壞，已修 |
| `.swap-exercise-item` | ✅ 子元素 `.swap-ex-name` 自己設 `var(--text)` |
| `.progression-hint-btn` | ✅ 自己設 `var(--accent)` |
| `.bottom-nav-more-btn` | ✅ 同一元素有 `.bottom-nav-link` 供色 |
| `.exercise-picker-item` | ⚪ 死 CSS，全 repo 冇 JSX 用過 |

所以只改一行，冇亂噴。

---

## 4. 驗證（跟 CLAUDE.md #37 逐條交數）

| # | 項目 | 點驗證 |
|---|---|---|
| 1 | 錯誤處理 | 六個修復全部係讀取／顯示路徑；缺值一律出 `--`，用 mock 缺欄位實測過 |
| 2 | 唔好寫死 | 顏色用 `inherit` → `var(--text)`，冇寫死 hex（#8）；指標清單用返 `data/metrics.js` |
| 3 | 唔好重複 | 用 `METRICS` 而唔係第二份 label/unit 對照表；`Completed Workouts` 對齊 `ClientDashboard` 算法；新增 `addDays` 取代三處各自誤用 |
| 4 | 可讀性 | 每個修復都留咗註釋寫明**原本錯喺邊**（例如「button 唔繼承 color」） |
| 5 | 邊界 0/1/多 | 0 = 缺值出 `--`；1 = 得 weight 嗰個 case（就係 3.2 個 bug）；多 = 六個指標齊。三個 plan 名逐個量對比度 |
| 6 | Test | **冇加，理由**：六個全部係 presentation-only 嘅 render 修正，冇可抽取邏輯；CSS 顏色喺 vitest（無 DOM/CSSOM）測唔到，改為喺瀏覽器實測 computed style。`npm test` **93/93** 確認冇 regression |
| 7 | 其他常規 | UI 文字全英文（#28）✅；冇改寫歷史數據（#27）✅；`mock/` 唔入 build（`dist/` 驗過）✅；冇假設有 terminal（#26）✅ |

其他：`npx eslint src/ mock/` **0 error**（1 個 pre-existing warning）、`npm run build` ✅。

### ⚠️ 未完成項（交俾 Ani，唔當過咗）

跟 #36：以下要真機撳過先算數，agent 做唔到。

1. 教練端 **`/plans`** —— plan 名而家清唔清楚（呢個修復影響**成個 Workout Plans 頁**，唔止 landing page 張圖）
2. 教練端 **Client Detail** —— Body Stats 冇再出 `Id` / `AddedBy`；Completed Workouts 有正常數字
3. 教練 **首頁** —— 「Active this week」唔再係 `0/N`
4. 學生端 **首頁** —— Body Stats 冇再出 `undefined`

---

## 5. 睇邊到

```
https://elitepro-16718.web.app/
```

未登入直接見到 landing page。⚠️ PWA service worker 會 cache，用 **Private 視窗** 最穩陣。

---

## 6. 等 Ani 決定

| # | 事項 | 我嘅睇法 |
|---|---|---|
| 1 | **`.card-title` 根因未修** —— 佢自己冇設 `color`，靠繼承。下次再有人用 button／有自己顏色嘅容器包住佢，3.6 同一個 bug 會再出現 | 徹底修法係俾 `.card-title` 加 `color: var(--text)`，但會影響**全 app 每張卡標題**。咁大範圍嘅視覺改動我驗證唔到（#36），所以冇擅自做 |
| 2 | 教練未填學生 age/height/goals 時，Client Detail 標題下面出一行空標籤：`Age: | Height: cm | Goals:` | 細嘢，但望落似壞咗。要修就一併處理缺值顯示 |
| 3 | `WorkoutPlansPage` 有 nested `<button>` 嘅 HTML 結構警告 | 唔影響功能，但 React 會喺 console 嘈，而且 nested button 嘅點擊行為喺唔同瀏覽器有分歧 |

---

## 7. 一句記低

呢次真正嘅收穫唔係三張圖，係**「用真 component render 假數據」呢個做法本身**：六個 bug 入面五個係 build／lint／test 全部過關、但一 render 就見到嘅。以後想加新截圖或者換數據，改 `mock/main.jsx` 再跑一次就得，唔使開帳號。
