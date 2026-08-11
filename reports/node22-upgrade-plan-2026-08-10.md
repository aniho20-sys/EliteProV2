# 升級方案：Node.js 20 → 22（+ firebase-functions / firebase-admin）

**日期**：2026-08-10
**角色**：員工A（SA）+ 員工B（Dev）
**狀態**：⏸ 方案階段，**未改任何 repo code**（`git status` 乾淨）
**死線**：2026-10-31 —— 之後 13 個 function 全部 deploy 唔到

> **本方案嘅所有結論都係實測得出，唔係抄官方 changelog。** 驗證方法：喺 scratch 目錄整咗一份 `functions/` 副本，裝上目標版本，逐個 API 用 `node -e` 探測，再對住 Firestore emulator 跑晒 35 條 test。

---

## 1. 版本對照

| 項目 | 而家 | 目標 | 理由 |
|---|---|---|---|
| **Node runtime** | 20 | **22** | 唯一有死線嗰樣 |
| `firebase-functions` | 5.1.1 | **6.6.0** | 跟上 admin 13；7.3.2 亦存在，見下 |
| `firebase-admin` | 12.7.0 | **13.5.0** | 配合 ff6；14.2.0 要 node≥22，跳太遠 |
| `@google-cloud/secret-manager` | 6.3.0 | **不變** | 冇必要郁，見第 6 節 |
| `firebase-functions-test` | 3.5.0 | **不變** | 實測同 ff6 相容 |
| CI `firebase-tools` | `@13` | **不變** | 已經支援 nodejs22 |

### Node 22 買到幾多時間（實證）

直接讀 `firebase-tools@13` 自己嘅 runtime 表：

```
nodejs20 {"status":"GA","deprecationDate":"2026-04-30","decommissionDate":"2026-10-31"}
nodejs22 {"status":"GA","deprecationDate":"2027-04-30","decommissionDate":"2027-10-31"}
```

同一個 CLI 亦報 `latest nodejs: nodejs22`。即係話：

- **升到 22 買返 14 個月**（下一個死線 2027-10-31）
- **CI 唔使改** —— workflow pin 住嘅 `firebase-tools@13` 本身已經識 deploy nodejs22

### 6 定 7？

兩個版本我都實測過 `firebase-functions/v1` subpath 仍然存在。**建議 6.6.0**：目標係拆彈，唔係現代化。7.x 多一批未驗證嘅改動，而佢解決唔到任何我哋而家有嘅問題。

---

## 2. firebase-functions breaking change —— 逐條對我哋 13 個 function 嘅實際影響

| # | Breaking change | 對我哋嘅影響 | 證據 |
|---|---|---|---|
| 1 | **v6 根 export 由 v1 改成 v2** | ✅ **零影響** | `index.js:2` 一開始就寫死 `require('firebase-functions/v1')`，唔係食根 export。實測 6.6.0 同 7.3.2 個 `/v1` subpath 都仲喺度 |
| 2 | `functions.config()` 淘汰 | ✅ **零影響** | 全 repo grep：零個 live 用法 |
| 3 | 要求 Node ≥ 18 | ✅ **符合** | 我哋去 22 |
| 4 | **admin 13 刪走 legacy messaging API**（`sendToDevice` / `sendMulticast` / `sendAll`） | ✅ **零影響，但係最貼身嗰條** | 實測 admin 13 只剩 `send()` / `sendEach()` / `sendEachForMulticast()`；`sendToDevice` grep 結果 = **0**。我哋 6 個 push function 全部用 `getMessaging().send()` → 保留咗 |

**第 4 條係唯一一條真係刪咗嘢嘅 breaking change**，啱啱好唔撞到我哋 —— 因為當初就係用返新 API。

### 我哋用到嘅 admin API，逐個實測仍然存在

```
initializeApp ✓  getFirestore ✓  getMessaging ✓
FieldValue.increment ✓  FieldValue.arrayRemove ✓
db.doc ✓  db.collection ✓  db.batch ✓  db.runTransaction ✓
```

---

## 3. Credit 兩個 function 特別檢查（真金白銀）

`onScheduleBooked` / `onScheduleCreditUpdate` 兩個都係 v1 Firestore trigger：

```js
exports.onScheduleBooked = functions.firestore
  .document('schedule/{schedId}')
  .onCreate(async (snap) => { ... });

exports.onScheduleCreditUpdate = functions.firestore
  .document('schedule/{schedId}')
  .onUpdate(async (change) => { const before = change.before.data(); ... });
```

| 檢查項 | 結果 | 證據 |
|---|---|---|
| `firestore.document()` 仲喺唔喺 | ✅ 在 | ff6.6.0 實測 `typeof v1.firestore.document === 'function'` |
| `.onCreate` / `.onUpdate` 仲喺唔喺 | ✅ 在 | 實測兩個都係 function |
| **Event 格式有冇變** | ✅ **冇變** | v1 trigger 嘅 event 格式同 runtime 版本無關；25 條 credit test 直接 `functionsTest.wrap()` 跑真 function 全綠 |
| **Handler 參數有冇變** | ✅ **冇變** | `snap.data()`、`change.before.data()`、`change.after.data()` 全部照用，test 全綠 |
| `runTransaction` 語意 | ✅ 冇變 | 透支上限、ledger 寫入都喺 transaction 入面，全部 test 綠 |
| 有冇 `region()` / `runWith()` 要跟住改 | ✅ 冇 | grep 零匹配，全部用預設 us-central1 |

**最有力嘅證據**：25 條 credit test 覆蓋透支、book-cancel-book、reopen、guardian，全部用 `wrap()` 直接調用真 function。**如果 event 格式或參數有任何改變，呢批 test 一定即刻紅。** 佢哋冇紅。

---

## 4. 35 條 test 使唔使改寫？→ **一行都唔使改**

實測：`functions/` 完整副本 + Node 22 + ff6.6.0 + admin13.5.0，test 檔完全冇改：

```
PASS test/gcOAuthNonce.test.js  (7.9 s)
PASS test/bookSession.test.js   (11.3 s)
Test Suites: 2 passed, 2 total
Tests:       35 passed, 35 total
```

Baseline 對照（現有 deps）：同樣 **35/35 通過**。即係前後一致，唔係「本來就有紅」。

`firebase-functions-test@3.5.0` 唔使升，`wrap()` 同 ff6 相容。

---

## 5. Rollback 方案

### 點 rollback

Firebase **冇「一鍵回滾 function」**。程序係：

1. 我做 `git revert` 個升級 commit
2. Push → CI 自動重新部署返 nodejs20 版本
3. 全程約 2–3 分鐘，Ani 只需要喺手機睇 GitHub Actions 綠燈

### ⚠️ 呢條退路有期限

**2026-10-31 之後 rollback 唔返去 Node 20** —— 嗰時 nodejs20 已經 decommission，revert 咗都 deploy 唔到。

**呢個係「早做」最實際嘅理由**：而家做，做壞咗有得退；10 月尾做，做壞咗就冇得退。

### 風險評估

| 風險 | 影響 | 緩解 |
|---|---|---|
| Function 起唔到 | 扣數唔會發生 —— **只會唔扣，唔會扣錯** | Ani 睇 remaining 冇跌就知有事，即刻叫我 revert |
| Firestore 數據 | ✅ 唔受影響 | Runtime 升級唔掂數據、唔改 rules |
| Credit 數字 | ✅ 唔受影響 | `totalSessions` / `sessionOffset` 都係 Firestore 欄位，唔喺 function 入面 |

### 部署行為會同平時唔同（預先講定）

- **13 個 function 全部會真正重新部署**，唔再係 `Skipped (No changes detected)` —— 因為 runtime 變咗。deploy 時間由 ~20 秒變 **2–4 分鐘**，屬正常
- **每個 function 第一次觸發會 cold start**（新 runtime container）。Ani 實測 book 嗰陣，**第一次扣數可能慢幾秒 —— 呢個唔係 bug**，第二次就正常

---

## 6. 第二件事：Secret 讀取方式確認

### 結論：**仍然正確，唔使改任何嘢。**

### 理由（結構性）

我哋讀 secret **唔係經 firebase-functions**，而係直接用 `@google-cloud/secret-manager` SDK（`gcSecrets.js`）。呢兩個係完全獨立嘅套件 —— **firebase-functions 升幾多版都影響唔到呢條路**。

呢個亦正正係 CLAUDE.md #29 當初嘅設計目的：唔綁死喺 Firebase 嘅 deploy-time 機制上面。今次升級反過來驗證咗個決定係啱嘅。

### 實測：Secret Manager client API 全部仍然存在

```
getSecret ✓  createSecret ✓  addSecretVersion ✓
accessSecretVersion ✓  deleteSecret ✓
```

（版本本身都唔郁，維持 6.3.0，所以連 SDK 都冇改動。）

### grep 確認冇違反 #29

全 `functions/` 搜 `defineSecret` / `runWith({secrets})` / `functions.config()`：

**零個 live 用法** —— 只有 `index.js:19` 同 `gcSecrets.js:5-6` 兩段註釋提過（解釋點解唔用）。

### 一個將來要留意嘅點

`@google-cloud/secret-manager@7.0.0` 嘅 `engines` 要 `node >= 22`。升咗 Node 22 之後呢道門就開咗，但**唔急升**，6.3.0 完全夠用。

---

## 7. 建議：A + B 一次過做

| | 內容 | 性質 |
|---|---|---|
| **Stage A** | `engines.node`: 20 → 22 | 🔴 死線必做，一行 |
| **Stage B** | ff 5→6、admin 12→13 | 🟠 跟上主流版本 |

**建議兩個一齊做**，理由：

1. 35 條 test 已經實測 A+B 一齊冇問題 —— 分開做唔會更安全
2. 分兩次 = **Ani 要做兩次真機測試**
3. B 唔做，就會停留喺一個冇人再修 bug 嘅大版本上

如果你想最保守，可以淨做 A（改一行）。兩個我都準備得到，你揀。

---

## 8. 執行次序（Ani 全程手機，唔使 terminal）

| 步驟 | 邊個做 | Ani 要做乜 |
|---|---|---|
| 1. 出方案 | 我 | **批准**（就係而家呢步） |
| 2. 改 code + 本地跑 35 條 test | 我 | 冇 |
| 3. 全綠先 commit + push（**呢個 commit 只做升級，唔夾其他嘢**） | 我 | 冇 |
| 4. CI 自動部署 | CI | 手機睇 GitHub Actions 三個 job 綠燈 |
| 5. 真機實測 | **Ani** | 見下面 checklist |
| 6. 確認正常先做其他嘢 | 全部 | —— |

### Ani 第 5 步嘅實測 checklist

| # | 測試 | 預期結果 |
|---|---|---|
| 1 | Book 一堂 | remaining 即刻跌 1（**第一次可能慢幾秒 = cold start，正常**）|
| 2 | 24 小時前取消 | remaining 加返 1 |
| 3 | Mark Complete 一堂新 booking | remaining **唔郁**（book 嗰時已經扣咗）|

任何一項唔對 → 即刻話我知，我 `git revert` + push，2–3 分鐘退返舊版本。

---

## 9. Commit 計劃

Ani 要求兩件事分開兩個 commit。實際情況：

- **Commit 1**：Node 22 + 套件升級（純升級，唔夾其他嘢）
- **Commit 2**：**唔需要** —— 第二件事（secret 讀取方式）驗證結果係「已經正確、零改動」。冇 code 改就冇 commit。驗證結論記錄喺本報告第 6 節。

如果你想連呢個結論都留喺 repo 入面（例如寫入 `PROGRESS.md` 或者 `gcSecrets.js` 註釋），我可以做第二個 commit —— 話我知。


---

## 附錄：部署後實測結果（2026-08-11 補回）

**CI run #473** —— 三個 job 全綠，`deploy_functions` 2 分 13 秒。Deploy log 逐個顯示 `updating Node.js 22 (1st Gen) function ...`，13/13 `Successful update operation`。`Runtime Node.js 20 was deprecated ... 2026-10-31` 警告已消失。

**Ani 真機實測 ✅ 三項全部通過**：book 扣數、24 小時前取消退款、Mark Complete 唔重複扣。

### ⚠️ 更正本報告一個錯誤預期

第 1 節同第 7 節原本寫升到 `firebase-functions` 6 可以「清走 deploy warning」。**實測冇清走** —— `package.json indicates an outdated version of firebase-functions` 喺升級後嘅 log 入面仍然出現。

原因：`firebase-tools` 係同**當時最新版**（7.3.2）比較，唔係同某個支援下限比。所以只要唔係最新大版本就一定繼續嘈，升到 6 一樣中招。

純屬 nag，唔影響任何功能，但呢個預期係錯嘅，兩處措辭已經改正。要真係滅佢就要升到 7（`/v1` subpath 實測仍在），係另一件事，另外評估。
