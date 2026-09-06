# i18n 覆蓋率審計 —— 「教練端中文出咗半桶水」根因調查

**日期**：2026-09-06
**觸發**：Ani 喺真機發現底部導航譯咗，但 TrainerDashboard 成版英文
**結論**：**個 gate 由第一日起就量錯嘢。445/445 = 100% 呢個數係真嘅，但佢答緊嘅唔係我哋以為嗰條問題。**

---

## Q1 —— 全 app 掃描結果

用**同一條 `react/jsx-no-literals` 規則**（由 `eslint.config.js` 直接讀出嚟，唔係另寫一份，避免兩份定義各講各話）掃全部 `src/**/*.jsx`，另加規則本身睇唔到嘅可見 props（`placeholder` / `aria-label` / `title` / `alt`）。

**總計 993 條未經 `t()` 嘅使用者可見英文字串。**

| 分類 | 條數 | 備註 |
|---|---:|---|
| 教練專用頁 | **339** | |
| 教練學生共用頁 | **179** | |
| 學生專用頁 | **143** | ⚠️ 第一階段其實都未做完 |
| 全 app 外殼 | **29** | |
| **教練撳得到嘅小計** | **547** | 339 + 179 + 29 |
| 豁免（法律／未登入／gym啦 dead code） | 303 | 見下 |

### 教練專用（339）

| 檔案 | 條數 |
|---|---:|
| `ClientDetailPage.jsx` | 114 |
| `TrainerDashboard.jsx` | **59** |
| `PlatformStatsCard.jsx` | 56 |
| `InvoicePage.jsx` | 42 |
| `BusinessAnalyticsPage.jsx` | 18 |
| `ClientProgressOverviewPage.jsx` | 18 |
| `ClientsPage.jsx` | 11 |
| `MonthlyReportModal.jsx` | 10 |
| `MovementPatternScanner.jsx` | 8 |
| `NotesSection.jsx` | 3 |

### 共用（179）

`WorkoutPlansPage` 59 · `ExerciseLibraryPage` 56 · `ProgressView` 22 · `ExerciseProgress` 11 · `SessionDateList` 10 · `ExerciseDetailModal` 8 · `NotificationCenter` 4 · `GlobalSearch` 3 · `MuscleSelector` 3 · `MessagesPage` 3

### ⚠️ 學生專用（143）—— 呢個係報告最意外嘅一格

`WorkoutLogPage` 26 · `ActiveWorkoutView` 22 · `IntakeFormPage` 22 · `TrainingProfilePage` 19 · `SetInputs` 18 · `ProgressPage` 15 · `ExerciseSwapModal` 12 · `WorkoutCompleteScreen` 9

**第一階段從來冇做完。** 一個學生揀咗中文之後，落「記錄訓練」、「進度」、「訓練資料」呢三頁一樣係英文。呢個由 09-03 上線到今日冇任何報告提過 —— 因為同一個 gate 一樣睇唔到。

### 全 app 外殼（29）

`InstallPrompt` 17 · `ErrorBoundary` 8 · `NotifPrompt` 2 · `App.jsx` 1（"Refresh" 掣）· `OfflineBanner` 1

### 豁免（303）

| 檔案 | 條數 | 理由 |
|---|---:|---|
| `PrivacyPolicyPage` | 106 | 法律文本 —— 翻譯即係改變咗使用者同意咗嘅內容，要律師唔係翻譯 |
| `TermsPage` | 73 | 同上 |
| `LandingPage` | 27 | 未登入，讀者仲未有 profile，冇語言設定可讀 |
| `StudioManagementPage` / `TrainerApplicationPage` | 各 29 | gym啦，`GYMLA_ENABLED=false`（#25），到唔到 |
| `OperatorDashboard` | 24 | 同上 |
| `StudioBookingPage` | 15 | 同上 |

---

## Q2 —— 「151 條入面點解冇 TrainerDashboard？」

**兩個答案都唔係。唔係漏咗，亦唔係當咗第一階段做過 —— 佢由頭到尾冇資格入嗰張表。**

嗰 151 條係**字典行數**，即係「`en.js` 入面有、但 `zh-HK.js` 仲未有中文」嗰批 key 嘅翻譯。張批核表係由 `en.js` 生成嘅。

而 `TrainerDashboard.jsx` **一次 `t()` 都冇叫過**。冇 `t()` 就冇 key 入 `en.js`，冇 key 入 `en.js` 就永遠唔會出現喺任何一張由 `en.js` 生成嘅表入面。

**張表嘅範圍係「我哋已經決定要譯嘅字」，唔係「教練實際見到嘅字」。** 兩者之間嘅差距，就係呢 547 條。

---

## Q3 —— 個 gate 點解捉唔到（你嘅診斷完全正確）

### 量錯咗乜

`dictionary.test.js` 個 gate 嘅核心係一行：

```js
const untranslated = [...enBases].filter(k => !zhBases.has(k));
```

佢問嘅係：**「`en.js` 入面每條 key 有冇中文？」**

佢冇問、亦冇能力問：**「教練見到嘅每句嘢，係咪都喺 `en.js` 入面？」**

所以一個完全冇叫過 `t()` 嘅頁面，貢獻 0 條 key、亦即貢獻 **0 條「未譯」** —— 喺個 gate 眼中，**一個零翻譯嘅頁面同一個完美翻譯嘅頁面一模一樣**。445/445 係誠實嘅計算，但佢量緊嘅係分母，而分母正正就係漏咗嗰樣嘢。

### 兩個機制都係 opt-in，冇人管入唔入到閘

| 機制 | 覆蓋範圍 | 漏咗乜 |
|---|---|---|
| `react/jsx-no-literals`（eslint） | 只跑 `TRANSLATED_FILES` 呢張手寫清單 | TrainerDashboard 唔喺清單，所以零 error |
| prop guardian（dictionary.test.js） | 一樣只跑 `TRANSLATED_FILES` | 同上 |
| coverage gate | `en.js` ↔ `zh-HK.js` | 見上 |

**冇任何一樣嘢問過「呢個檔案應唔應該喺清單入面」。** 兩個 opt-in 機制，零個清單維護機制。

### 第三層盲點（呢個你未提，但更麻煩）

字串收埋喺 **JS 運算式**入面 —— 三元運算、template literal、object 屬性 —— 對上面三個機制**全部隱形**，連已經列管嘅檔案都捉唔到。實例：

| 位置 | 內容 | 狀態 |
|---|---|---|
| `TrainerDashboard.jsx:492` | `remaining === 0 ? 'Sessions used up' : \`${remaining} session… left\`` | 未列管檔案 |
| `TrainerDashboard.jsx:504` | `sendingReminderFor ? 'Sending…' : 'Send renewal reminder'` | 同上 |
| `TrainerDashboard.jsx:74` | `return 'No activity yet'` | 同上 |
| **`ProfilePage.jsx:215-216`** | `'GoCardless isn't set up yet — check back soon.'` / `'Could not start GoCardless connection'` | **已列管，但仍然係英文** |
| **`ProfilePage.jsx:295`** | `title: 'Join me on ElitePro'`（原生分享面板標題） | **已列管，但仍然係英文** |

即係話 `ProfilePage` 雖然喺 `TRANSLATED_FILES` 入面、雖然 eslint 綠燈，佢仍然會向教練彈出英文 toast。

---

## 已經做咗嘅修正

新增 `src/i18n/coverage.test.js`，**將規則反轉**：

> 唔再問「清單上嘅檔案乾唔乾淨」，而係問「**每一個仲有英文嘅檔案，有冇人交代過佢嘅狀態**」。

每個 `.jsx` 檔如果仲有可見英文，必須出現喺以下其中一張表，否則個 build 即刻紅：

1. `TRANSLATED_FILES` —— 已譯（同時斷言佢真係 0 條，唔止係「列咗喺度」）
2. `AWAITING` —— 連同確實條數嘅**債務帳**
3. `EXEMPT` —— **必須寫理由**（冇理由嘅豁免就係上次個窿點解可以開三個星期）

`AWAITING` 個數字**只可以跌唔可以升**，而且跌咗之後唔改就會 fail —— 所以帳簿唔會發霉。

### 牙齒驗證（#37.6，唔係「跑得過就算」）

| 注入嘅 bug | 結果 |
|---|---|
| 新建一個帶 hardcode 英文、冇入任何清單嘅頁面 | ✅ **紅** —— `ZzTempPage.jsx (2 strings)` |
| 喺 TrainerDashboard 加多一句英文（59 → 60） | ✅ **紅** —— `gained 1 untranslated string(s) (59 -> 60)` |
| 兩樣還原 | ✅ 綠（38/38） |

> **老實補一筆**：第二個牙齒測試我第一次跑係綠嘅 —— 因為我個 `sed` 揀錯咗 class 名（`stat-label` 而唔係 `stat-pill-label`），根本冇改到檔案。如果我當時信咗「綠 = 冇事」就會得出「呢條 guard 冇牙」嘅相反結論。改啱之後先真係紅。呢個正正係「一條從來冇 fail 過嘅 test 證明唔到任何嘢」嗰句嘅實例。

### 未修（明講）

**第三層盲點（JS 運算式入面嘅字串）呢次冇處理。** 用 regex 去捉會噪音極大（`type: 'Blocked'` 係寫入 Firestore 嘅資料，唔係 UI 文字，唔應該譯），而一條吵到冇人睇嘅 test 等於冇 test。建議做法係逐頁人手處理，喺翻譯每一頁嗰陣一併清 —— 上面 `ProfilePage` 嗰三條係已知清單，唔係「將來再算」。

---

## 建議次序（待 Ani 拍板）

| 順序 | 內容 | 條數 | 理由 |
|---|---|---:|---|
| 1 | **TrainerDashboard** | 59 | 你日日見，而且係教練登入第一版嘢。對照表已出 |
| 2 | 學生端補完（4 頁 + 4 元件） | 143 | **有 9 個真實學生正在使用**，佢哋而家見到嘅係半中半英 |
| 3 | ClientDetailPage | 114 | 教練第二常用 |
| 4 | 共用頁（WorkoutPlans / ExerciseLibrary） | 115 | 兩邊都受惠 |
| 5 | 其餘教練頁 | 155 | |

**我建議第 2 項升到第 1 位。** 你係一個人，可以忍英文；嗰 9 個學生係真實用戶，而佢哋當中揀咗中文嘅人而家見到嘅係半桶水 —— 而呢件事我哋到今日先知。

---
_內部審計報告，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
