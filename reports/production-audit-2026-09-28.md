# Production audit — 2026-09-28

**Production audit：55/100，有風險（Risky）。** 有四個權限漏洞已經喺模擬資料庫（emulator）證實，其中兩個直接關錢。未修好之前唔好轉 GoCardless live，亦唔好大規模招學生。

用咗嘅 skill：`production-audit`（整體）、`firebase-security-rules-auditor`（`firestore.rules`）、`frontend-a11y`（量度基線）。
分數上限：規則寫明「敏感資料冇權限保護」就封頂 69 分；再加上付款通知（Step 4）未做、冇錯誤監察，所以係 55 分。

---

## Blockers（上 live 前一定要修）

每一項都用 emulator 證實過（臨時 probe 測試，跑完已刪，冇 commit）。

| # | 漏洞 | 證據 | 後果（講人話） |
|---|---|---|---|
| **P1** | 註冊時建立 `users` 文件完全冇限制 | 以新帳戶身份寫入 `role: 'operator'`、`totalSessions: 1000`、`subscriptionTester: true`：**成功** | 任何人註冊時可以自封 operator（gym啦 權限：改場地、睇晒教練申請資料），或者送自己 1000 堂免費堂數 |
| **P2** | 學生可以自己改 `trainerId` 做任何教練 | 被移除嘅學生將 `trainerId` 改返做教練 A，然後讀教練 A 嘅文件：**成功讀到銀行戶口號碼** | 你踢走嘅學生可以自己連返你，睇到你嘅銀行資料、你所有學生嘅時間表 |
| **P3** | 任何教練可以將自己嘅邀請碼改成同你一樣 | 教練 B 將 `inviteCode` 改做教練 A 嘅碼：**成功** | 新學生輸入你嘅邀請碼，有機會連咗去另一個教練度，仲會俾錢佢 |
| **P4** | 學生可以改自己堂嘅日期，再取消 | 學生將一堂**已完成**嘅堂改去 12 月再取消：rules **准**；`onScheduleCreditUpdate` 將 `sessionOffset` 由 5 變 4（**退返一堂**）| 學生上完堂之後可以攞返堂數，每月最多兩堂 |

### 建議修法

- **P1**：`users` create 規則加限制：`role` 只准 `trainer` 或 `client`；`totalSessions`、`sessionOffset` 唔准有或者要係 0；唔准有 `subscriptionTester`。
- **P2 + P3（同一個根源）**：「連接教練」同「邀請碼」改成由伺服器做。
  - 新增 callable：驗證邀請碼，再用 Admin SDK 寫入 `trainerId`。
  - 學生只准將 `trainerId` 改成 `null`（即離開）。
  - 邀請碼由伺服器產生，並用獨立文件保證唯一。
  - 呢個改動最大，要一併改 `RoleSelectPage` 同 `connectToTrainer()`。
- **P4**：
  - rules：學生只准將 `status` 改成 `cancelled`，唔准改 `date` / `time`。
  - 函數：遲取消用**修改前**嘅日期時間判斷。
  - 兩層都要改，因為教練亦可以改日期。

每項修正都要附一條 rules／functions 測試，並示範喺修正前會失敗（CLAUDE.md #37 第 6 項、#40）。

---

## High-value fixes（下一步）

1. **冇錯誤監察**：`src/` 冇任何 crash reporting。用戶部電話白畫面，我哋唔會知。
2. **遲取消用 UTC 計**：`new Date('YYYY-MM-DDTHH:MM:00')` 喺 Cloud Functions 係 UTC。英國夏令時間 (GMT+1) 會差一粒鐘：23 小時前取消都會當「早取消」。
3. **教練改學生文件冇欄位限制**：教練可以改自己學生嘅 email、名，甚至將學生轉去第二個教練。只影響自己學生，屬中等風險。
4. **同一教練嘅學生睇得到對方嘅堂**：`schedule` 讀取規則准「同一個教練嘅學生」讀晒所有堂，包括其他學生嘅 `clientId` 同 `notes`。用途係顯示空檔，但 notes 都一齊露咗。
5. **無障礙基線**：132 個 `<label>`，`htmlFor` 係 **0** 個；有 78 個 `<div>`／`<span>` 用 `onClick` 扮掣。
6. **冇 component 測試**：282 條前端測試，模擬撳掣嘅係 **0** 條。（同日開咗第一個：`src/context/AppContext.invite.test.jsx`，註冊＋連接教練，B21）
7. **Step 4 付款通知**（未起）：簽名驗證、同一通知收兩次唔好重複加堂、次序亂咗點處理。

---

## Evidence checked

- `firestore.rules`（406 行，全讀）
- `functions/index.js`：24 個 export 逐個睇 auth 檢查；`onScheduleCreditUpdate` 取消邏輯
- `functions/gcSubscriptions.js`：`SANDBOX = true`、`GC_API_BASE` 係 sandbox
- `dist/` bundle：搜尋 secret／token，只見 Firebase SDK 自己嘅欄位名，冇外洩
- `.github/workflows/firebase-hosting.yml`：run 596 test job 綠，四關全過
- Emulator probe：P1–P4 四條 rules 測試 + 一條 functions 測試（P4 退堂）

## Evidence missing

- **Firestore 備份**：GCP console 有冇開 PITR 或定時 export，呢個 session 睇唔到
- **App Check 有冇 enforce**：`.env.example` 有設定步驟，但 console 狀態睇唔到
- **真機**：上面所有 UI 相關嘅嘢都要 Ani 用手機實際撳過先算（CLAUDE.md #36）

## 跟進（同日）

- **P4、P5、P1 已修**（B18、B19）。P5 係修 P4 時發現：學生新預約預先寫 `deductedAtBooking: true`，`onScheduleBooked` 會跳過扣堂。
- P2 + P3 已修（B20）：連接教練同邀請碼改由伺服器處理；B21 改由 component test 驗。
- High-value 2（遲取消用 UTC）已修（B22）：用教練時區計。

## Next action

先修 **P4 同 P1**：兩個都細，而且一個直接關錢。之後做 **P2 + P3**（伺服器負責連接教練），要改埋註冊流程，需要 Ani 真機試一次邀請碼。
