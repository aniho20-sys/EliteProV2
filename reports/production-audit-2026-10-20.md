# B52 — 三項審查修正報告（2026-10-20）

Ani 2026-10-20 揀咗三項：**Stripe 收錢審查**、**上線前全 app 審查**、**無障礙／字體對比**。
專家只審唔改；agent 逐條核實（讀 code + 寫測試重現）先修。以下每項都有測試，而且**每條測試都做過注入驗證**（#40：先證明改壞咗檔案，再見到測試轉紅，再還原）。

Ani 喺過程中拍板兩項：品牌橙色**淨係字用深啲**（按鈕、漸變唔郁）；上堂提醒**暫時唔加開關**。

---

## 1. Stripe 收錢（`functions/stripe*.js`）

| # | 問題（審查員講法，已核實） | 修正 | 測試 |
|---|---|---|---|
| S1 | 第一張單喺 checkout 處理之前到，而返回頁剛好攞住個 claim → 回 `not_ours` 兼記錄咗，**嗰個月堂數永遠唔會加** | 改用 Stripe 自己 subscription 嘅 metadata 搵返個計劃，喺 transaction 入面連結 | `…even while the return page holds the plan's claim` |
| S2 | 撳兩下／舊 checkout 冇成功 expire → 學生可以**俾兩份錢** | 開新 checkout 之前逐個處理舊嘅：仲開住就 expire（expire 唔到就唔開新）；已經俾咗錢就啟用嗰個；仲喺度建緊就拒絕 | 4 條 `a client starts a plan` |
| S3 | 任何俾咗錢嘅 invoice 都加一個月堂數（教練改價嘅 proration 單、教練手開嘅單都會加） | 只有 `subscription_create` / `subscription_cycle` 先加堂；其他通知教練睇；100% 折扣嘅月份照加 | `needs a look`、`100% discount` |
| S4 | 月份日期用 UTC 嘅 `paid_at` | 用 subscription 行嘅 `period.start`，按教練時區計 | `coach's own date` |
| S5 | 遲到嘅舊月份付款會將計劃期數拉返轉頭、重新計 roll-over | 舊期付款照加堂，但唔郁期數 | `period never moves backwards` |
| S6 | 學生轉咗教練，舊計劃照扣錢、堂數仲會加落新教練度 | 新 trigger `onClientLeftTrainer` 停舊教練嘅計劃（兩個收款商都停）；遲到付款唔加堂，通知舊教練退款 | `client has since left`、`only the plan with that coach is stopped`（Stripe + GoCardless 各一） |
| S7 | 連接 GoCardless 會洗走教練嘅 Stripe 連接 | `replaceGcConnection` 保留 `stripe` 欄 | `gcDirect: keeps the coach's Stripe connection` |
| S8 | 測試轉正式後，用正式 key 取消測試計劃 = 404 = 當「已取消」，真訂閱照扣 | complete / cancel 遇到另一個模式嘅 key 直接拒絕 | `other mode's key`（兩條） |
| S9 | 正式上線後，舊測試計劃擋住學生開真計劃 | 自動退役（`sandbox_retired`） | `test-mode plan left over` |
| S10 | 拒付（dispute）、Stripe 放棄追數（unpaid）、首期從未成功（incomplete_expired）、教練喺 Stripe 斷開 ElitePro：全部冇處理 | 新增 `charge.dispute.created`、`customer.subscription.updated`、`account.application.deauthorized` | 4 條 |
| S11 | 同一事件同時送兩次，兩次都會處理（通知發兩次） | 改成 transaction claim；處理中嘅第二次回 500 叫 Stripe 遲啲再送；死咗嘅 claim 兩分鐘後失效 | 3 條 |
| S12 | 物件喺 Stripe 已刪 → 每次 500，Stripe 重試三日 | 404 記錄為 `gone` | `recorded as gone` |
| S13 | key 同 webhook secret 模式唔夾嗰陣嘅事件被記錄為「已處理」→ 永遠遺失 | 改為 500，夾返之後 Stripe 再送 | `sent back for retry` |
| S14 | 失敗通知照處理已作廢／已撇帳嘅單 | 只處理仍然 `open` 嘅單 | `voided or written off` |
| S15 | 刷新連接會重建已刪帳戶嘅 profile；Stripe 暫停教練收款就即刻收埋學生嘅計劃卡 | 先查係咪教練；只喺可以收款時寫，暫停時保留 | 3 條 |
| S16 | Bacs 冇睇貨幣 | 只限英國帳戶 + 英鎊 | `Bacs only for a UK account in pounds` |
| S17 | `stripeStatus` 任何登入者都問得；返回頁未驗 id 就讀 Secret Manager | 只限教練；先驗 id | — 純接線（index.js），冇 harness，靠 code review |

Stripe 設定指南同 app 入面嘅事件清單都由 5 個改做 **8 個**。**Ani 開 Stripe webhook 時要揀晒 8 個**（`reports/stripe-setup-guide.md` 第 4 步）。

另外：處理過嘅事件（`stripeEvents` / `gcEvents`）90 日後每日自動清（`cleanupProcessedEvents`）。

## 2. 全 app

| # | 問題 | 修正 | 測試 |
|---|---|---|---|
| A1 | ID 只用 `Date.now()`：一次封幾個鐘、一次派計劃俾幾個學生，同一毫秒 → **後一個覆蓋前一個，資料無聲消失** | `utils/ids.js` `newId()` 加 4 位隨機尾；AppContext 全部改用；試堂確認改用 `tx.create` | `ids.test.js`（含守門：AppContext 唔准再有淨時鐘 ID）、`two confirmed in the same millisecond` |
| A2 | 上堂提醒：改咗日期唔會再提；已轉教練嘅學生仍收舊教練提醒；一個推送失敗就成輪停 | marker 加日期時間；查 `trainerId`；逐個 try | 3 條 |
| A3 | 團體課嘅封鎖時段可以喺日程表直接刪 → 報咗名嘅人冇人通知 | 呢種時段唔顯示刪除掣（要經 Profile → 團體課取消） | `coachSetup: a group class's hour` |
| A4 | 刪除身體量度唔等結果，失敗都話「已刪除」 | await + 失敗提示 + 防撳兩下 | `ProgressView.test.jsx` |
| A5 | CI：網頁同 functions 平行 deploy，functions 失敗網頁照上 | hosting `needs: [test, deploy_functions]` | YAML 解析核對 |
| A6 | Landing 揀中文 → 撳登入 → 變返英文 | `keepOnLeave`；登入後用返佢自己儲存嘅語言 | `landing.test.jsx` 2 條 |
| A7 | 刪帳戶後，註冊記錄仲有姓名電郵；寄俾 Ani 嘅新教練電郵仲喺度；log 有電郵 | 註冊記錄匿名化（保留，因為計 founding 名額）；以後嘅通知電郵刪埋；log 改記 uid；GoCardless 自家帳戶 webhook secret 一齊刪 | `accountDeletion` 1 條 |
| A8 | 訊息頻率限制用咗一個要 composite index 嘅 query，index 從未 deploy → query 失敗 | 改單一欄位 range + JS 過濾（#34） | — 純接線，靠 code review |
| A9 | **學生主頁「剩餘 X 堂」字眼喺正式版唔見**（只得個數字）| 用真數字揀單複數 | `package card says "N sessions left"`（對舊 code 會紅） |

## 3. 無障礙

| # | 問題 | 修正 |
|---|---|---|
| X1 | 灰字 2.6–2.9:1；橙、綠、黃、紅字 2.0–3.6:1（標準 4.5:1） | 新增「淨係字用」嘅色：`--accent-text` `--primary-text` `--success-text` `--danger-text`，灰字加深；**201 處**文字顏色改用佢哋；按鈕、底色、漸變、邊框全部唔郁 |
| X2 | 字細過 12px（49 處） | 全部提到 12px；只有數字圓點同頭像字母唔郁（固定大小嘅圈） |
| X3 | 手機輸入格細過 16px，iPhone 會成頁放大 | 手機上所有輸入格 16px |
| X4 | 記錄訓練 +／− 掣得 22px 高 | 觸控範圍向上下伸到 **44px**（唔加闊，否則 320px 手機會爆行）；兩行之間撳中間唔會誤中 |
| X5 | 「完成」剔號未剔時用邊框色＝睇唔到；完成咗嘅組淡到 50% | 未剔用灰字色；完成組 75% |
| X6 | 頂部圖示掣、記錄格、+／− 掣冇名，讀屏只讀「button」 | 加名 |
| X7 | 冇鍵盤焦點框；冇「減少動態」 | 加 `:focus-visible` 框；跟手機「減少動態」設定 |

測試：`src/styles/contrast.test.js` 由真 CSS 讀色，兩個主題 × 8 個字色 × 4 個底色全部要 ≥4.5:1（守門時捉到黃字喺淺灰底得 4.48，已再加深）；另一條守門唔准再有字直接用品牌色。`SetInputs.test.jsx` 驗每個掣同格都有名。

**電腦驗證（Playwright，真 CSS，320／375px，深淺主題）**：每行冇爆出；輸入格 16px；+／− 觸控高度量到 44px；兩行之間撳中間唔會中任何一個掣。**未做：真機撳**（#36）——呢個要 Ani 部手機，見下。

## 4. 要 Ani 批嘅中文（4 句）

| key | 英文 | 中文 |
|---|---|---|
| `progress.delete_failed` | Couldn’t delete the measurement. Please try again. | 未能刪除量度紀錄，請再試一次。 |
| `nav.search` | Search | 搜尋 |
| `setinputs.decrease` | Decrease {what} | 減少 {what} |
| `setinputs.increase` | Increase {what} | 增加 {what} |

（`{what}` 係 kg / reps / sec / m，按 #39 唔翻譯。後三句只有讀屏聽到。）

## 5. 記入 BACKLOG、今次冇做（要決定或者唔係今次範圍）

- **App Check** 未開（公開 callable 可以被濫用）——要喺 Firebase console 開 reCAPTCHA key。
- 公開預約頁讀取冇上限（要 composite index 或者 cache）。
- 按 IP 限流可以用 `X-Forwarded-For` 呃；`reportClientError` 可以被灌。
- CI 用 `firebase-tools@latest`，應該鎖版本。
- 備份／Point-in-time recovery 未確認有冇開。
- Stripe API 版本未鎖。
- 刪教練帳戶時未喺 Stripe 斷開佢個帳戶。
- GoCardless webhook 嘅重複檢查同 Stripe 舊做法一樣唔係原子（今次只修咗 Stripe）。
- 320px 手機上記錄格顯示唔晒「102.5」（**舊問題**，今日之前已經係咁，要重新排版先解決到）。
