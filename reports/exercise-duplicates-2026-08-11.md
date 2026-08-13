# 動作重複定義修正 + 新增唯一性檢查

**日期**：2026-08-11
**角色**：員工B（Dev）
**Commit**：`2ce37d5`
**狀態**：✅ Code 已完成並推上 `claude/fitness-app-features-LbxtG`　⏸ 審視表待資料

> **本文件寫俾接手嘅 agent 讀（Fable）。** 讀之前先讀 `CLAUDE.md`（特別係 #27 soft-merge、#28 全英文 UI）同 `PROGRESS.md`。下面第 5 節係你要接手做嘅嘢，附可以直接跑嘅 script。

---

## 1. 定義（Ani 2026-08-11 落實，唔准自行詮釋）

> **重複 = 同一個動作 + 同一款器材。**

| 情況 | 判定 | 處理 |
|---|---|---|
| Shoulder Press **Barbell** vs Shoulder Press **Dumbbell** | ✅ **唔係重複** | 合法嘅獨立 variant，**唔准合併**。兩者入同一個 family |
| Shoulder Press **Dumbbell** ×2 | 🔴 **真重複** | 建議合併，**逐個交 Ani 批**，唔准自動合併 |

**呢個定義推翻咗之前「同名就係重複」嘅做法。** 之前嗰種判法會將器材 variant 誤報成重複，一合併就會失去「同一動作唔同器材」呢個真實訓練資訊。

---

## 2. 定義寫咗入 code

新檔案：**`src/utils/exerciseDuplicates.js`**（單一事實來源，唔好喺 page 入面再寫一套）

兩個 key 刻意分開，呢個就係成個模組嘅骨架：

```js
familyKey(name)              // 忽略器材 → variants 歸埋同一 family
duplicateKey(name, equipment) // 包含器材 → 只有真重複先會撞
```

### Public API

| Function | 用途 | 回傳 |
|---|---|---|
| `normalizeExerciseName(name)` | 小寫化、標點/空格正規化 | string |
| `normalizeEquipment(equipment)` | 器材正規化 | string |
| `familyKey(name)` | family 分組 key | string |
| `duplicateKey(name, equipment)` | 真重複 key | string |
| `exerciseNameKeys(ex)` | 該動作所有叫法（name + aliases） | `Set<string>` |
| **`findDuplicateExercise(library, candidate, excludeId?)`** | **真重複偵測**（名或 alias 撞 **且** 器材相同） | 撞到嗰條 or `null` |
| **`findFamilyVariants(library, candidate, excludeId?)`** | 同動作、**唔同**器材嘅兄弟 | `Exercise[]` |
| **`findByExerciseName(library, name)`** | 純名字查（跨器材），俾冇器材欄位嘅路徑用 | `Exercise[]` |
| **`groupExerciseFamilies(library)`** | **審視表分組** | 見下 |

`groupExerciseFamilies` 每個 family 回傳：

```js
{
  familyKey, name,
  variants: [{ equipment, entries: [...], isDuplicate }],  // 每款器材一行
  trueDuplicates: [...],        // 只有 entries.length > 1 嗰啲
  hasTrueDuplicates: boolean,   // ← 審視表要 filter 呢個
}
```

### 三個實作決定（唔好無意識咁改走）

1. **大小寫／空格／標點唔敏感** —— `"Bulgarian Split-Squat"`、`"bulgarian split squat"`、`"Bulgarian  Split Squat"` 當同一個動作
2. **Aliases 雙向比對** —— 新動作叫「BSS」而現有記錄將「BSS」列做 alias，一樣算重複
3. **跳過 soft-merge tombstone**（`mergedInto` 有值嗰啲）—— 呢啲係指向 survivor 嘅墓碑（見 CLAUDE.md #27）。唔跳過就會：(a) 將墓碑報做 survivor 嘅重複，(b) 有人重新輸入同名時被導去一條已死嘅記錄

---

## 3. 三條新增路徑嘅唯一性檢查

| 路徑 | 檔案 | 行為 |
|---|---|---|
| **Exercise Library** | `src/pages/ExerciseLibraryPage.jsx` | 打字期間 inline 警告；撳 Save **直接擋** + 關 form 跳去現有嗰條（`setDetailExercise`）。同名唔同器材只出**灰色 hint**（`--text-muted`，唔用警告色），照放行 |
| **Workout Plans 自訂動作** | `src/pages/WorkoutPlansPage.jsx` | **只喺勾咗 `saveToLibrary` 先檢查** —— 冇勾嘅只入 plan，唔會進入 library，冇嘢可以撞。撞到就**直接將現有嗰條加入 plan**（用家本來就係想要嗰條），出 info toast |
| **Exercise Swap Modal** | `src/components/workout/ExerciseSwapModal.jsx` | ⚠️ **特殊**，見下 |

### ⚠️ SwapModal 嘅結構性差異（接手前必讀）

**呢個 tab 根本冇器材輸入欄位**，而且佢建嘅係 `custom-${Date.now()}` 嘅 ad-hoc entry，**唔係 library 記錄**。所以「名 + 器材」喺呢度物理上做唔到。

現時做法：用 `findByExerciseName` 做**純名字**比對，撞到就列出**所有同名 variant 做掣**俾用家揀，同時 disable「Add」掣。

**冇加器材選擇器落去**，因為嗰度係訓練途中快速換動作嘅位，加欄位會拖慢流程。**呢個取捨已同 Ani 講明，佢未表示要改。** 如果之後要改，要先問過先。

### UI 樣式

`src/styles/index.css` 新增：`.ex-dupe-warn`（硬擋，`--danger` 邊框）、`.ex-dupe-link`、`.ex-dupe-hint`（軟提示，muted）、`.ex-dupe-matches` / `.ex-dupe-match`（44px 觸控目標，跟 STYLE.md）。

**警告色同提示色刻意分開** —— 硬擋先用 danger，合法 variant 用 muted。唔好統一佢哋。

---

## 4. 驗證結果

冇前端 test runner（見 `PROGRESS.md` backlog #20 附近嘅記錄），所以喺 scratch 目錄用 `node` 直接跑純 util 驗定義。**九條全過**：

```
✓ 同名同器材 = 重複（擋）                    → 'sp-bb'
✓ 同名唔同器材 = 唔算重複（放行）            → null      ← Ani 舉嘅例
✓ 大小寫/空格唔同一樣當重複                  '  shoulder   PRESS ' → 'sp-bb'
✓ 撞 alias 都算重複                          'BSS' → 'bss'
✓ 撞 alias 但器材唔同 = 放行                 → null
✓ 已 merge 嘅 tombstone 唔會當重複           → 'dead-new'（survivor，唔係墓碑）
✓ 編輯自己唔會撞自己                          → null
✓ family variants 列得出
✓ SwapModal 名字查（跨器材）                 → ['sp-bb','sp-db','sp-db2']
```

分組輸出示範：

```
🟢 正常   | Bulgarian Split Squat | Dumbbell×1
🟢 正常   | Deadlift              | Barbell×1
🔴 真重複 | Shoulder Press        | Barbell×1, Dumbbell×2
                                    ↑合法variant  ↑呢個先要合併
```

`npx eslint src/` 0 error、`npm run build` 通過。

---

## 5. ⏸ 未完成：審視表（接手嘅嘢喺呢度）

### 點解出唔到

**動作庫係 per-trainer 存喺 Firestore，agent 睇唔到。** Repo 入面只有 `src/data/exercises.js` 嗰批 seed 動作 —— 我已經用新定義跑過：

> **24 條 seed 動作，零個同名 family，零個重複。**

即係話所有重複一定喺 Ani 自己建嘅 Firestore 記錄入面。

（附帶：`CLAUDE.md` 多處寫住 seed 有 **22** 條，實際係 **24**。已向 Ani 提出，未拍板改。）

### 攞資料嘅方法（Ani 手機一步，跟 CLAUDE.md #26 —— 佢冇 terminal）

> **Profile → Export Exercise Library → Copy**，然後貼返落對話

`ProfilePage.jsx` 已經有呢粒掣，會將成個動作庫 copy 做 JSON。**唔好叫 Ani 行任何 CLI／Firebase Console／script。**

### 攞到 JSON 之後點做

直接餵落已經寫好嘅 `groupExerciseFamilies`，唔好另寫一套判重邏輯：

```js
// node --input-type=module
import { groupExerciseFamilies } from './src/utils/exerciseDuplicates.js';
const library = JSON.parse(/* Ani 貼嘅 JSON */);

const fams = groupExerciseFamilies(library);

console.log('=== 🔴 真重複（同名同器材 ≥2）→ 逐個交 Ani 批合併 ===');
fams.filter(f => f.hasTrueDuplicates).forEach(f => {
  f.trueDuplicates.forEach(v => {
    console.log(`${f.name} · ${v.equipment} ×${v.entries.length}  →  ${v.entries.map(e => e.id).join(', ')}`);
  });
});

console.log('=== 🟢 同名唔同器材 → 標做同 family variants，唔係問題 ===');
fams.filter(f => !f.hasTrueDuplicates && f.variants.length > 1).forEach(f => {
  console.log(`${f.name}: ${f.variants.map(v => v.equipment).join(' | ')}`);
});
```

### 出表要求（Ani 明確講過）

- **兩欄分開**：🔴 真重複（建議合併，**逐個俾佢批**）／🟢 同名唔同器材（**標做 variants 就得，唔好建議合併**）
- **唔准自動合併任何嘢** —— Ani 逐個批
- 合併時**必須用 soft-merge**（寫 `mergedInto` 指標），**唔准 rewrite** `workoutPlans` / `workoutLogs` 入面嘅 `exerciseId` —— 見 **CLAUDE.md #27**，呢條係硬規則。讀取端已經有 `canonicalExercise()`（`src/utils/exerciseUtils.js`）跟指標解析

---

## 6. 接手清單

| # | 事項 | 狀態 |
|---|---|---|
| 1 | 向 Ani 攞 Export Exercise Library 嘅 JSON | ⬜ 未做 |
| 2 | 用 `groupExerciseFamilies` 出兩欄審視表 | ⬜ 等資料 |
| 3 | 真重複逐條交 Ani 批 | ⬜ |
| 4 | 批咗嘅用 soft-merge（`mergedInto`）執行，唔准 batch rewrite | ⬜ |
| 5 | Ani 真機驗一次三條新增路徑嘅擋重複行為 | ⬜ 未做 |
| 6 | `CLAUDE.md` seed 動作數目 22 → 24 | ⬜ 待 Ani 拍板 |

**唔好做嘅嘢**：唔好自己判定邊個係「主要」動作然後自動合併；唔好因為兩條動作同名就當重複（呢個就係今次修正嘅錯）；唔好喺 page 入面另寫判重邏輯。
