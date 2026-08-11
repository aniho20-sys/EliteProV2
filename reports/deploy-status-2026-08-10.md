# 部署狀態核查報告：deploy_functions + GoCardless functions

**日期**：2026-08-10
**角色**：員工B（Dev）
**核查對象**：CI run **#470**（commit `e25f990`，2026-08-10 09:08–09:09 UTC）
**結論**：三項全部通過，但揪到一個有硬死線嘅新風險

---

## 1. deploy_functions 綠咗未？ → ✅ 綠

Run #470 三個 job 全部 `success`：

| Job | 結果 | 用時 |
|---|---|---|
| `deploy_functions` | ✅ success | 37s |
| `deploy_rules` | ✅ success | 26s |
| `deploy_hosting` | ✅ success | 38s |

**連續紀錄**：自 2026-07-29 修好 IAM（Cloud Functions Admin 落 `firebase-adminsdk-fbsvc@elitepro-16718.iam.gserviceaccount.com`）之後，`deploy_functions` **連續 10 次綠燈** —— #455、#457–#461、#463、#464、#466–#470，中間冇紅過。

呢個問題可以正式 close。

---

## 2. 四個 GoCardless function 係咪真係上咗線？ → ✅ 係

**冇用「deploy 成功」呢個結論推斷**，而係讀返實際 deploy log。Firebase 逐個列出 **13 個** function：

```
✔ functions[onAccountDelete]          Skipped (No changes detected)
✔ functions[onNewMessage]             Skipped (No changes detected)
✔ functions[onNewSchedule]            Skipped (No changes detected)
✔ functions[onScheduleUpdate]         Skipped (No changes detected)
✔ functions[onNewWorkoutPlan]         Skipped (No changes detected)
✔ functions[onNewWorkoutLog]          Skipped (No changes detected)
✔ functions[onScheduleBooked]         Skipped (No changes detected)
✔ functions[onScheduleCreditUpdate]   Skipped (No changes detected)
✔ functions[onSessionsLow]            Skipped (No changes detected)
✔ functions[gcOAuthStart]             Skipped (No changes detected)   ←
✔ functions[gcOAuthCallback]          Skipped (No changes detected)   ←
✔ functions[gcDisconnect]             Skipped (No changes detected)   ←
✔ functions[cleanupExpiredGcNonces]   Skipped (No changes detected)   ←
✔ Deploy complete!
```

### 點解「Skipped」反而係證據

Firebase 係攞本地源碼同**已經部署喺 production 嗰個版本**逐個比對，一致先會 skip。一個唔存在嘅 function 冇嘢可以比對，只會顯示 `creating`。

所以四個 GoCardless function 確實存在於線上環境，唔止係「deploy 指令 exit code 0」。

### ⚠️ 但要分清楚：上線 ≠ 試過

`gcOAuthStart` / `gcOAuthCallback` **從來冇真人行過 sandbox flow**。Connect 掣撳落去會點，仍然係未知數。

呢點喺兩份獨立文件都被列為 Phase 3 Step 3 嘅前置條件：
- `reports/CEO-meeting-2026-08-06.md` —— 待 Ani 拍板第 1 項
- `reports/SA-report-2026-08-10.md` —— 下週優先第 1 項「風險最高」

---

## 3. 刪走 debug step → ✅ 早已刪除，今次無須動作

Debug step 喺 **2026-07-29 12:18** 已經移除，commit `1f7cdcf`「Remove temporary debug step — service account confirmed」。

現時 `.github/workflows/firebase-hosting.yml` grep `debug` / `client_email` / `service account` —— **零匹配**。

---

## 4. 🔴 新發現：Node.js 20 runtime 有硬死線

Deploy log 入面嘅警告：

```
⚠ functions: Runtime Node.js 20 was deprecated on 2026-04-30 and will be
  decommissioned on 2026-10-31, after which you will not be able to deploy
  without upgrading.
```

### 影響

**2026-10-31 之後，13 個 function 全部 deploy 唔到。** 由今日（8-10）計，剩返約 **2.5 個月**。

呢個唔係「有 warning 但照行得」—— 一過期 `deploy_functions` job 直接 fail。而按 CLAUDE.md #29，Firebase 係將成個 codebase 嘅 function 當一個單位 deploy，所以一冧就 **13 個一齊冧**，包括 credit 扣數（`onScheduleBooked` / `onScheduleCreditUpdate`）呢啲核心商業邏輯。

### 同場另外兩個警告

| 警告 | 嚴重程度 | 說明 |
|---|---|---|
| `firebase-functions` 套件版本過舊 | 🟠 中 | Firebase 明講升級會有 breaking change。同 Node 升級係同一件事，要一齊做 |
| `Unhandled error cleaning up build images` | 🟢 低 | 殘留 build image 累積，會產生小額月費。可喺 Cloud Console 手動清 |

### 建議

**唔好拖到 10 月先做。** 理由：

1. Node 20 → 22 一定會撞到 `firebase-functions` 升級嘅 breaking change，兩件事綁埋
2. 改完要跑 35 條 Cloud Functions test 驗證，唔係改個版本號就算
3. 10 月尾先做等於冇緩衝 —— 一撞到問題就係 production 部署完全癱瘓

**建議時間：9 月頭**，留足夠時間驗證。

---

## 待 Ani 拍板

| # | 事項 | 狀態 |
|---|---|---|
| 1 | Node 20 升級要唔要即刻記入 `PROGRESS.md` P1（附 10-31 死線）？ | 未決 —— 我未擅自寫入，等你話事 |
| 2 | 幾時做升級？（建議 9 月頭） | 未決 |
| 3 | GoCardless Connect sandbox 實測幾時做？ | 未決 —— CEO 會同 SA 報告都列為 Phase 3 最高風險前置 |
