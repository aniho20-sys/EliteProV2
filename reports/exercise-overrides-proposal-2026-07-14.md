# Exercise Overrides 疊加機制 — 設計方案

**狀態**：待批准，未動 code
**負責**：員工A（SA）+ 員工B（Dev）
**日期**：2026-07-14
**背景 repo**：ElitePro（`aniho20-sys/EliteProV2`），branch `claude/fitness-app-features-LbxtG`

---

## 0. 觸發原因

Ani 報告：Exercise Library 主頁撳入 detail modal 嘅 Edit/Delete 掣，「Barbell Curl」呢類動作改唔到、刪唔到，出現 `Failed to update/delete`。

需求隨即擴展為一個新功能：**共用底版動作要俾每個教練自訂影片/要點，互不相干**——

- 22 條 seed 動作係公家 base，所有教練共見，冇人改到底版本身（維持現狀）
- 每個教練可以喺 base 動作上面「疊」自己嘅內容（影片 link、動作要點），只有自己 + 自己嘅學生見到，其他教練完全見唔到亦改唔到
- 教練自建動作（有 `trainerId` 嗰批）照舊直接 edit，唔行呢套疊加機制

---

## 1. ⚠️ 先糾正一個之前講錯嘅結論

之前（同一 session 早段）我判斷「22 條底版動作係真實 Firestore 文件，冇 `trainerId` 因為 rules 嘅 `null==null` 巧合先變成全教練共用、亦冇人編輯/刪除得到」。查返 `src/context/AppContext.jsx` 第189-200行之後發現呢個判斷錯咗：

```js
// --- Exercises: role-aware listener (trainer sees own; client sees trainer's) ---
useEffect(() => {
  if (!currentUser?.id) return;
  const targetTrainerId = currentUser.role === 'trainer' ? currentUser.id : currentUser.trainerId;
  if (!targetTrainerId) return;
  const unsub = onSnapshot(
    query(collection(db, 'exercises'), where('trainerId', '==', targetTrainerId)),
    (snap) => setExercises([...snap.docs.map(d => ({ ...d.data(), id: d.id })), ...defaultExercises]),
    () => setExercises(defaultExercises),
  );
  return () => unsub();
}, [currentUser?.id, currentUser?.role, currentUser?.trainerId]);
```

**真相**：`defaultExercises`（22 條）是 `src/data/exercises.js` 入面嘅**靜態 JS 陣列**，每次都喺前端直接 `concat` 落 `exercises` state，**根本冇對應嘅 Firestore 文件**。Firestore 查詢本身用 `where('trainerId','==',targetTrainerId)` 過濾，永遠唔會撈到呢 22 條（佢哋冇 `trainerId` 呢個欄位，查詢比對唔到）——佢哋純粹係每次都手動 append 落結果陣列。

呢個發現解釋咗「Barbell Curl 改/刪唔到」個 bug 嘅真正原因：唔係 rules 阻止（Ani 嘅 `trainerId` 明明啱），而係 `updateExercise('barbell-curl', ...)` / `deleteExercise('barbell-curl')` 嘗試操作一個**根本唔存在**嘅 Firestore 文件，SDK/rules 見到冇對應資源，直接拒絕/報錯。

呢個修正**支持而唔係推翻**而家嘅 override 方案設計方向：底版動作冇文件可以直接「疊」內容上去，所以必須開一個新 collection 嚟承載每個教練嘅自訂內容。

**待做**：批准之後，CLAUDE.md 入面之前寫錯嘅「22條共用動作靠 rules null==null 巧合」段落要改返做呢個正確解釋。

---

## 2. `exerciseOverrides` Schema

```js
exerciseOverrides/{overrideId} {
  id: string,
  trainerId: string,              // 擁有者教練 UID，建立後不可改
  exerciseId: string,             // 對應靜態 seed id（如 'bench-press'），建立後不可改
  videoMode: 'default' | 'custom' | 'hidden',   // 冇呢份 doc = 全部當 'default'
  videoUrl: string,                // 淨係 videoMode==='custom' 先有意思
  instructionsMode: 'default' | 'custom' | 'hidden',
  instructions: string,             // 淨係 instructionsMode==='custom' 先有意思
}
```

設計取捨（同 Ani 原本提議嘅欄位唔完全一樣，需要確認）：
- 用 `videoMode`/`instructionsMode` 三態 enum，取代單純 boolean + 空字串——避免「空字串」同「刻意隱藏」搞唔清
- 教練完全冇自訂任何嘢 → **唔建立 override 文件**（避免大量空文件）
- 撳「還原用底版」→ 直接**刪走**成份 override 文件，唔係寫返 `default` 值（keep collection 乾淨）
- Doc ID 建議用 deterministic key `${trainerId}_${exerciseId}`，方便 `setDoc` upsert，保證每對 (trainer, exercise) 淨係一條文件

---

## 3. 讀取 + Merge 邏輯（喺 `AppContext.jsx` 做，唔喺頁面層做）

新增第二個 listener，重用現有 `exercises` listener嘅**一模一樣** `targetTrainerId` 邏輯（教練=自己 UID，學生=`currentUser.trainerId`）：

```js
const unsub = onSnapshot(
  query(collection(db, 'exerciseOverrides'), where('trainerId', '==', targetTrainerId)),
  (snap) => setExerciseOverrides(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
  () => setExerciseOverrides([]),
);
```

`getExercises()` 喺 return 之前 merge：

```js
const getExercises = () => {
  const base = exercises.length > 0 ? exercises : defaultExercises;
  return base.map(ex => {
    const ov = exerciseOverrides.find(o => o.exerciseId === ex.id);
    if (!ov) return ex;
    return {
      ...ex,
      videoUrl: ov.videoMode === 'hidden' ? '' : ov.videoMode === 'custom' ? ov.videoUrl : ex.videoUrl,
      instructions: ov.instructionsMode === 'hidden' ? '' : ov.instructionsMode === 'custom' ? ov.instructions : ex.instructions,
    };
  });
};
```

**關鍵好處**：`WorkoutPlansPage.jsx`、`ClientDetailPage.jsx`、`SessionDateList.jsx` 全部都經 `getExercises()` / `exerciseLibrary.find()` 攞動作資料——merge 喺呢一層做完，plan/log 顯示自動跟到教練嘅自訂內容，唔使逐個頁面改。

Plan 本身已有嘅「per-exercise 自訂 video URL」（`plan-video-input-row`，喺 `WorkoutPlansPage.jsx` 建 plan 嗰陣可以override individual exercise 嘅片）優先級唔變：plan 自己個 `videoUrl` 一向優先於 library default，而家淨係「library default」呢一層由「seed 原值」變做「seed + 教練 override」，優先鏈冇斷。

---

## 4. UI 設計

按 `exercise.trainerId` 有冇分流：

| | 有 `trainerId`（教練自建） | 冇 `trainerId`（seed 動作） |
|---|---|---|
| Edit 掣 | 完全冇改，照舊全欄位表單直接 `updateExercise` | 開新「自訂教學內容」panel（細個），只有 videoUrl + 動作要點兩欄 |
| Delete 掣 | 照舊 | **移除**（seed 動作冇「刪除」概念，淨係自訂/還原） |

新 panel 內容：
- 頂部提示文案：「呢個係你自己嘅自訂內容，只有你同你嘅學生見到」
- 影片：3-way 選擇（用底版 / 自訂連結 / 唔顯示），揀「自訂連結」先出到輸入框
- 動作要點：3-way 選擇（用底版 / 自訂文字 / 唔顯示），揀「自訂文字」先出到 textarea
- 底部「還原用底版」一鍵刪走個 override 文件

**待 Ani 確認的一點**：Ani 原本嘅描述淨係提到「唔顯示影片」一個選項，但 schema 要求（第3點）兩個欄都要三態。我哋建議兩欄都用一致嘅 3-way 控制（唔係得影片有「隱藏」，要點淨係文字框冇「隱藏」）。是否同意兩欄都做一致嘅 3-way？

---

## 5. Firestore Rules

```
match /exerciseOverrides/{overrideId} {
  allow read: if isAuth() && (
    resource.data.trainerId == request.auth.uid ||
    userTrainerId() == resource.data.trainerId
  );
  allow create: if isAuth() && isTrainer() && request.resource.data.trainerId == request.auth.uid;
  // trainerId / exerciseId 建立後不可改
  allow update: if isAuth() && resource.data.trainerId == request.auth.uid
    && request.resource.data.trainerId == resource.data.trainerId
    && request.resource.data.exerciseId == resource.data.exerciseId;
  allow delete: if isAuth() && resource.data.trainerId == request.auth.uid;
}
```

- 教練只可讀寫 `trainerId == 自己 uid` 嘅 override
- 學生只可讀（唔可以寫）自己教練嘅 override
- `isTrainer()` / `userTrainerId()` 沿用 `firestore.rules` 已有嘅 helper function，唔使新寫

---

## 6. Rules 驗證方式（回應「學返 rules silent fail 教訓」）

單靠人手用第二個帳號撳一次，得個心安，冇長效保障。建議加一個**自動化 rules 測試**：

- 新技術棧：`@firebase/rules-unit-testing`（同而家 `functions/test/` 嗰套針對 Cloud Functions 嘅 Jest test 唔同機制，需要新增 devDependency + 新 script `test:rules`）
- 用 Firestore emulator 直接程式化驗證：
  1. 教練 A 寫/讀自己 override ✅
  2. 教練 B 讀/寫教練 A 嘅 override ❌（必須畀 rules 拒絕，測試 assert 呢個拒絕）
  3. 學生讀自己教練嘅 override ✅、讀第二個教練嘅 ❌、任何 write ❌
- 呢個測試檔案長期留喺 repo，每次改 rules 都可以重跑，唔止得一次性人手驗證

部署後仍然建議 Ani 用第二個真實帳號人手撳一次做心理雙重確認，但唔應該係唯一防線。

---

## 7. Edge Cases（逐條回應 Ani 提出嘅問題）

| 問題 | 答案 |
|---|---|
| 學生端 `ExerciseDetailModal` 而家點攞教練 ID 做 merge | 完全重用現有 `targetTrainerId`（`exercises` listener 嗰句邏輯），加多個 `exerciseOverrides` listener 用返同一個值，冇新邏輯 |
| Workout plan 顯示動作嗰陣有冇跟 override | 有，自動跟——全部頁面都經 `getExercises()` 攞資料，merge 喺 `AppContext` 呢層做一次就通晒，plan 自己嘅 per-exercise video override 優先級不變 |
| 教練刪咗 override 之後 cache/即時更新點處理 | `onSnapshot` 即時 listener，刪咗即刻反映落 local state，`getExercises()` 下一次 render 就跟手 fallback 返 seed 內容，唔使 refresh／手動 invalidate |

---

## 8. 會改嘅 File 清單

| File | 改動 |
|---|---|
| `firestore.rules` | 新增 `exerciseOverrides` match block |
| `src/context/AppContext.jsx` | 新 state + listener（跟 `targetTrainerId`）、`getExercises()` 加 merge、新增 `upsertExerciseOverride`/`deleteExerciseOverride` |
| `src/components/ExerciseDetailModal.jsx` | 按 `trainerId` 分流：自建走原有流程，seed 動作走新「自訂教學內容」panel |
| `src/pages/ExerciseLibraryPage.jsx` | `openEdit` 分流；seed 動作隱藏 Delete |
| `src/styles/index.css` | 新 3-way 選擇控制樣式 |
| 新增 `firestore-tests/exerciseOverrides.rules.test.js`（路徑待定） | 自動化 rules 驗證（新 `@firebase/rules-unit-testing` 依賴） |
| `CLAUDE.md` | 修正之前錯嘅「rules loophole」解釋做返啱嘅「靜態數據冇對應文件」；補寫 `exerciseOverrides` schema |

**不受影響**：12 個 credit emulator test（`functions/test/bookSession.test.js`）——呢次改動完全喺 exercises/override 範圍，冇掂 `functions/index.js`。

---

## 9. 待 Ani 拍板嘅兩點

1. **UI 一致性**：影片同動作要點兩欄，係咪都要做 3-way（用底版/自訂/隱藏）？定係精簡返，淨係影片有「隱藏」，要點淨係得「用底版/自訂」兩態？
2. **額外工程範圍**：新增 `@firebase/rules-unit-testing` 自動化測試套件（新 devDependency + 新 script + 新測試檔），係咪都喺呢次批准範圍入面？定係想第一階段淨係做功能、rules 驗證淨係人手做？

---

*本文件為設計提案，尚未實裝任何 code。批准後方會動工。*
