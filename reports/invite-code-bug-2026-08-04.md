# 緊急 Bug 報告：學生輸入教練 invite code 連唔到

**日期**：2026-08-04
**角色**：員工B（Dev）+ 員工E（QA）
**Commit**：`c433aeb`
**嚴重程度**：🔴 Blocker —— 學生 onboarding 第一步，撳唔通等於個 app 對佢完全冇用
**狀態**：✅ **已修復並經真機驗證通過**（2026-08-11，見第 9 節）

---

## 1. 現象

Ani 真機實測（真學生帳號、iPhone Safari Private 視窗、`elitepro-16718.web.app`）：

> Profile → Connect to Coach → 輸入 `3XQPKM` → 撳 Connect → 紅色 toast「Invalid invite code」

`3XQPKM` 係 Ani 自己教練帳號嘅真實 invite code。

---

## 2. 查證結果：四個懷疑方向全部洗脫

| # | 懷疑 | 結果 | 證據 |
|---|---|---|---|
| 1 | 大小寫敏感／冇 trim 空格／隱形字元 | ❌ 唔係真因 | `findTrainerByCode` 本身有 `.toUpperCase()`，call site 有 `.trim()`。（但確實有隱患，見 §4.3） |
| 2 | Code 有效期／一次性／已被用過 | ❌ 唔係 | 全 codebase 搜過：invite code **冇任何** expiry / used / consumedAt 欄位。永久有效、可重複使用 |
| 3 | **Firestore rules 擋住**（Ani 判斷嘅最大嫌疑） | ❌ **洗脫嫌疑** | `firestore.rules` 嘅 `match /users/{userId}` 寫住 `allow read: if isAuth()` —— 任何已登入用戶（包括未連結學生）都讀得。近排幾次 rules 改動全部喺 `update` 分支，冇掂過 `read` |
| 4 | 最後幾時改過 | —— | `git log -- src/context/AppContext.jsx`：呢個功能**由頭到尾冇改過**，係一開始寫落去就錯。唔係 regression |

---

## 3. 真因：查嘅地方根本冇資料

```js
const connectToTrainer = async (clientId, inviteCode) => {
  const trainer = findTrainerByCode(inviteCode);   // ← 淨係查 in-memory `users`
  if (!trainer) return { success: false, error: 'Invalid invite code' };
  ...
};

const findTrainerByCode = (code) => {
  if (!code) return null;
  return users.find(u => u.role === 'trainer' && u.inviteCode === code.toUpperCase()) || null;
};
```

`findTrainerByCode` 只喺 AppContext 個 **in-memory `users` 陣列**度搵。而個陣列係由兩個 listener 砌出嚟（`AppContext.jsx` 主 listener effect）：

| Listener | 學生角色拎到咩 |
|---|---|
| `where('id', '==', uid)` | 自己嗰份 doc |
| `where('trainerId', '==', uid)` | 自己嘅學生 → **學生角色永遠係空** |

（另外仲有一個 listener 會載入「自己教練嘅 doc」，但佢嘅 guard 係 `if (!currentUser.trainerId) return` —— 未連結就唔會行。）

**結論：一個未連結任何教練嘅學生，個 `users` 陣列入面得佢自己一個人。** 佢想連結嗰個教練嘅 doc 由頭到尾唔喺記憶體度，所以無論打乜 code 都一定搵唔到，一律跌落 `Invalid invite code`。

呢個唔係間歇性、唔關網絡事、唔關 code 本身事 —— **係 100% 必然失敗**。

### 3.1 實測驗證（唔係靠讀 code 判斷）

喺 Firestore emulator 起返完全相同嘅場景（教練 `inviteCode: '3XQPKM'`、學生 `trainerId: null`），用**原封不動嘅舊實現**跑：

```
>>> in-memory users: ["clientRepro(client)"]     ← 得學生自己，冇任何 trainer
>>> old lookup result: null                       ← 必然 null → "Invalid invite code"
>>> new lookup result: Coach Ani                  ← 修完搵到
```

---

## 4. 修復內容

### 4.1 真正去 Firestore 查（核心修復）

新增 `findTrainerByCodeRemote()`：in-memory 搵唔到就發一個真 Firestore query。

**刻意用單欄位 query（只 filter `inviteCode`），`role` 喺 JS 度過濾。** 原因：Firestore 自動為每個單一欄位建 index，但兩個 equality filter 有機會需要 composite index —— production 冇嗰個 index 就會掟 `failed-precondition`，等於用另一種方式再壞一次。呢個位唔值得賭。

### 4.2 錯誤訊息分得出三種情況（Ani 要求）

`connectToTrainer` 而家回傳 `reason`：`invalid` / `permission` / `network`。

| 情況 | 學生見到 |
|---|---|
| Code 真係唔啱 | `Invalid invite code` |
| 權限／網絡失敗 | `Could not check that code right now. Check your connection and try again.` |
| Code 啱但寫入失敗 | `Code is valid, but saving failed. Check your connection and try again.` |

原本三種情況全部顯示「Invalid invite code」，會令學生去搵一個根本唔存在嘅打字錯誤。

### 4.3 隱形字元防禦（雖然唔係今次真因）

新增 `src/utils/inviteCodeUtils.js`：

```js
export function normalizeInviteCode(code) {
  if (typeof code !== 'string') return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
```

由 WhatsApp／分享頁貼過嚟嘅 code 可能帶住 zero-width joiner、non-breaking space、directional mark —— 螢幕上完全睇唔到但字串比對必死。Invite code 本身係 6 位大階英數字，剝走其餘一切係安全嘅。

### 4.4 順手揪到三個同源問題

| 問題 | 影響 | 修法 |
|---|---|---|
| **註冊時打錯 code 係靜靜雞當冇打過** | `completeProfile` 搵唔到教練就照建 profile、`trainerId` 留 null。學生入到 app 以為連結咗但其實冇，之後乜都見唔到 | `RoleSelectPage` 喺**建 profile 之前**先驗證 code，錯就攔住並提示（或者留空遲啲再連） |
| `handleConnect` 冇 try/catch | 一 throw 就 `setConnecting(false)` 永遠唔行，粒 Connect 掣卡死喺 disabled 狀態 | 加 `try/catch/finally` |
| `completeProfile` fallback 讀成個 users collection | 每次註冊都 O(全部用戶) 咁讀落嚟再喺 JS filter | 換成同一個 targeted query |

---

## 5. 測試（rules suite 37 → 45）

新增 `firestore-tests/inviteCode.rules.test.js`，8 條：

**Lookup（4 條）**
1. 未連結學生查得到 invite code
2. 查到嘅係啱嗰個教練（唔會撈錯人）
3. 未知 code 係「真係冇 match」，唔係俾 rules 擋 —— 呢條釘住「invalid 同 permission 唔可以再混淆」
4. 未登入人士查唔到

**完整流程 end-to-end（4 條）**

5. **學生輸入有效 code → 寫 trainerId → 教練 client list 見到佢**（第 3 步用返 AppContext 真正跑嗰條 `where('trainerId','==',uid)` query，即係話過到呢條 = 教練真係見到）
6. 唔會走錯去第二個教練個 client list
7. 連結時仍然升唔到 trainer 權限（防權限提升）
8. 連結時仍然派唔到堂數俾自己（防自己送堂）

**驗證結果**：45 條全綠、`npm run build` 通過、`eslint src/` 0 error（1 個 pre-existing warning）。

### 5.1 呢批 test 嘅真實限制（唔想講大咗）

呢 8 條 test 釘住嘅係**修復所倚賴嘅前提**（rules 准查、trainerId 寫得入、教練 list 見到、安全邊界冇鬆），但佢哋**唔會**因為原本嗰個 bug 而 fail —— bug 喺 JS 層（查記憶體定查 Firestore），而個 repo 冇前端 unit test runner。

所以另外整咗 §3.1 嗰個 emulator repro harness 直接證實新舊行為差異，驗完就刪咗。呢個係現時測試架構嘅真實限制，唔應該包裝成「有 test cover 晒」。

**價值仍然喺**：如果將來有人收緊 `users` 嘅 read rule（例如改成「只准睇有關係嘅人」），呢 4 條 lookup test 會即刻紅，而唔係學生 onboarding 喺 production 靜靜雞死多次。

---

## 6. 附帶發現（未改，待 Ani 拍板）

`npm run lint` 而家有 **226 個 pre-existing error** —— eslint config 冇排除 `functions/` 同 `firestore-tests/`，所有 Node/Jest 檔案都報 `'test' is not defined` / `'expect' is not defined`。

**風險**：lint 一直係紅嘅，等於新嘅真錯誤會完全被淹沒，冇人會為咗 227 定 251 個 error 而停低。

**修法**：config 加兩行 ignore。但要留意會唔會順手隱藏咗 `functions/` 入面嘅真問題 —— 建議加 ignore 嘅同時為嗰兩個 folder 補返 Node/Jest globals，而唔係一刀切唔睇。

---

## 7. 待辦

- [ ] **Ani 真機覆測**：同一個學生帳號、同一個 code `3XQPKM`。（只改咗前端 JS，冇改 rules，所以只需要 Hosting deploy，CI 自動跑）
- [ ] 如果仲係失敗，話返睇到**邊一句**訊息 —— 三種訊息而家分開咗，睇到邊句就即刻知死喺邊個環節
- [ ] 決定 §6 個 lint 問題做唔做

---

## 8. 教訓

**`AppContext` 嘅 `users` 陣列只包含「同自己有關係嘅人」，唔係全站用戶。** 任何需要查「同我未有關係嘅人」嘅功能（invite code 係最典型例子，Phase 5 場地市集搵教練／搵場地會係下一個），都**唔可以**靠 in-memory 陣列，必須發真 query。

呢條同 CLAUDE.md #26/#27/#29/#30 同一類 —— 係結構性前提，唔係一個 bug。建議下次 SA 週會考慮寫入 CLAUDE.md 做常規。


---

## 9. 真機驗證結果（2026-08-11 補回）

**✅ 通過。**

Ani 用**全新 email**（唔係現有帳號）喺 iPhone Safari 由 Landing Page 行足六步：註冊 → **輸入 invite code `3XQPKM`** → 填問卷 → 教練端 client list 見到新學生 → Book 一堂 → Mark Complete。**全程成功。**

第 2 步（輸入 invite code）就係本報告修復嗰個 bug —— 修復 commit `c433aeb`，喺 production 確認生效。

同一次 walkthrough 亦順帶驗證咗 2026-07-29 嗰個問卷 rules allowlist 修復（`1dfcaa3`）：新學生填完問卷出到主 app，冇再永久卡死。

**兩個一星期內爆嘅 🔴 blocker，而家兩個都喺真實環境確認修好。**
