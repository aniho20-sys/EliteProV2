# 中英對照表 — 第三階段（教練端 + 系統訊息）

**日期：** 2026-09-02 ｜ **狀態：** 等 Ani 逐句批核。**批咗先寫入 `zh-HK.js`。**

**共 151 條** —— 教練端 126 條 + 認證錯誤 18 條 + 密碼重設 7 條。

---

## 語域規則（同上次一樣，冇變）

**1. 一律用繁體中文書面語，唔用廣東話口語。**

| ✗ 唔要 | ✓ 要 |
|---|---|
| 仲有 7 堂 | 剩餘 7 堂 |
| book 堂 | 預約課堂 |
| 由呢度開始 | 由此開始 |

**2. 四個指定用詞（香港慣用）**

| 用 | 唔用 |
|---|---|
| **堂** | 課時 |
| **教練** | 私教 |
| **預約** | 預定 |
| **剩餘** | 剩下 |

**3. 唔翻譯：** 動作名、sets / reps / kg / RPE / tempo、肌群／器材／pattern 標籤、教練自己寫嘅 plan 名同 notes、`DELETE`、品牌名（ElitePro、Google、GoCardless、WhatsApp）。

**4. 沿用第一階段已定嘅譯法：** 學生 / 教練 / 課堂 / 預約 / 堂數 / 續堂 / 個人檔案 / 訓練計劃。

---

## 為咗 100% 覆蓋率而必須有值嘅「保留英文」條目

呢批唔係翻譯，係**明確決定唔譯**。但因為你要求教練端覆蓋率 100%，佢哋要有值先過到 test —— 所以我會將英文原文照抄入中文字典，並喺旁邊寫低理由。**要你確認呢個做法。**

| Key | 值 | 點解保留英文 |
|---|---|---|
| `pay.sort_code` | Sort Code | 英國銀行編碼，香港冇對應概念（你上次已批） |
| `profile.provider_google` | Google | 品牌 |
| `auth.reset_email_placeholder` | you@example.com | 電郵格式範例 |
| `profile.sort_placeholder` | e.g. 12-34-56 | ⚠️ 純數字範例。要唔要改成「例如 12-34-56」？ |
| `profile.acct_placeholder` | e.g. 12345678 | ⚠️ 同上 |

---

## 1. 導航（教練專用）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `nav.clients` | Clients | 學生 | 側邊欄 / 手機底部 |
| `nav.plans_full` | Workout Plans | 訓練計劃 | 側邊欄 |
| `nav.plans_short` | Plans | 計劃 | 手機底部 |
| `nav.progress_overview` | Progress Overview | 進度總覽 | 側邊欄 More |
| `nav.invoices` | Invoices | 發票 | 側邊欄 More |
| `nav.analytics` | Analytics | 數據分析 | 側邊欄 More |
| `nav.messages` | Messages | 訊息 | 導航（現時隱藏） |
| `nav.studios` | Studios | 場地 | gym啦（現時隱藏） |
| `nav.book_studio` | Book Studio | 預約場地 | gym啦（現時隱藏） |
| `nav.role_trainer` | trainer | 教練 | 側邊欄底部姓名下方 |
| `nav.role_operator` | operator | 場地管理員 | ⚠️ gym啦 角色。現時隱藏，但要有值 |

---

## 2. Schedule（教練專用部分）

### 2.1 工作時間提示條

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `sched.wh_banner` | Set your working hours so clients can only book within your availability. | 設定工作時間，學生就只能在你有空的時段預約。 | 頁頂提示條 |
| `sched.set_hours` | Set Hours | 設定時間 | 提示條按鈕 |
| `sched.dismiss` | Dismiss | 關閉 | 提示條 X 掣 |
| `sched.dismiss_banner` | Dismiss banner | 關閉提示 | 同上（screen reader） |

### 2.2 課堂列表操作

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `sched.n_left` | {n} left | 剩 {n} 堂 | ⚠️ 學生名旁邊嘅細字。空間好窄，所以用「剩」唔用「剩餘」 |
| `sched.confirm` | Confirm | 確認 | 剔號掣 |
| `sched.confirm_aria` | Confirm session | 確認課堂 | 同上（screen reader） |
| `sched.cancel_session_aria` | Cancel session | 取消課堂 | X 掣（screen reader） |
| `sched.mark_as_complete` | Mark as complete | 標記為完成 | 完成掣 |
| `sched.mark_complete_aria` | Mark session complete | 標記課堂為完成 | 同上（screen reader） |
| `sched.undo_complete` | Undo Mark Complete | 取消完成標記 | 重開掣 |
| `sched.reopen` | Reopen | 重開 | 已完成課堂嘅按鈕 |
| `sched.remove_block_aria` | Remove block | 移除封鎖 | 封鎖時段嘅垃圾桶掣 |
| `sched.remove_block_title` | Remove Block | 移除封鎖 | 確認 modal 標題 |
| `sched.remove_block_body` | This time slot will become available again. | 此時段將重新開放預約。 | 確認 modal 內文 |
| `sched.remove` | Remove | 移除 | 確認 modal 按鈕 |

### 2.3 完成課堂（recap modal）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `sched.complete_session` | Complete Session | 完成課堂 | modal 標題 |
| `sched.client` | Client | 學生 | modal 資料列 |
| `sched.sessions` | Sessions | 堂數 | modal 資料列 |
| `sched.used_no_quota` | Used: {used} · No quota set | 已使用：{used}．未設定堂數 | 未買堂嘅學生 |
| `sched.remaining_after` | {remaining} remaining → after: {after} | 剩餘 {remaining} → 完成後：{after} | modal 資料列 |
| `sched.low` | ⚠️ Low | ⚠️ 偏低 | 堂數低時嘅警告 |
| `sched.message_optional` | Message to client (optional) | 給學生的訊息（可選） | modal 表單 |
| `sched.note_placeholder` | Add a note for the client… | 為學生加一句備註… | 輸入框 |
| `sched.send_recap` | Send recap message to client | 將總結訊息發送給學生 | 勾選框 |
| `sched.mark_complete` | Mark Complete | 標記完成 | modal 確認按鈕 |

### 2.4 封鎖時段（Block Time）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `sched.block_time` | Block Time | 封鎖時段 | 切換掣 / modal 標題 |
| `sched.duration_per_slot` | Duration per slot | 每節時長 | 表單欄位 |
| `sched.minutes` | {n} min | {n} 分鐘 | 時長下拉選項 |
| `sched.time_slots` | Time Slots | 時段 | 表單欄位 |
| `sched.n_selected` | {n} selected | 已選 {n} 個 | 時段標籤旁 |
| `sched.label` | Label | 標籤 | 表單欄位 |
| `sched.label_placeholder` | e.g. Lunch, Personal, Meeting | 例如：午膳、私人、會議 | 輸入框 |
| `sched.blocking` | Blocking… | 封鎖中… | 按鈕 loading |
| `sched.block_n_slots_other` | Block {count} Slots | 封鎖 {count} 個時段 | 提交按鈕 |
| `sched.select_client` | Select client | 選擇學生 | 預約表單下拉預設 |

### 2.5 教練端提示訊息

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `sched.err_select_date` | Please select a date | 請選擇日期 | 錯誤 toast |
| `sched.err_select_slot` | Please select at least one time slot | 請至少選擇一個時段 | 錯誤 toast |
| `sched.err_select_client` | Please select a client | 請選擇學生 | 錯誤 toast |
| `sched.err_owes_session` | This client already owes a session — top them up before booking again | 此學生已欠 1 堂 —— 請先增加堂數才再預約 | 錯誤 toast |
| `sched.toast_slots_blocked_other` | {count} time slots blocked | 已封鎖 {count} 個時段 | 成功 toast |
| `sched.err_block_failed` | Failed to block time: {msg} | 封鎖時段失敗：{msg} | 錯誤 toast |
| `sched.toast_block_removed` | Block removed | 已移除封鎖 | toast |
| `sched.toast_session_deleted` | Session deleted | 已刪除課堂 | toast |
| `sched.toast_status` | Session {status} | 課堂{status} | ⚠️ `{status}` 已經係中文（已完成／已取消），所以中間唔加字 |
| `sched.err_complete_failed` | Failed to complete session: {msg} | 完成課堂失敗：{msg} | 錯誤 toast |
| `sched.toast_marked_complete` | Session marked complete | 已標記課堂為完成 | 成功 toast |

---

## 3. Profile（教練專用部分）

### 3.1 個人資料

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.speciality` | Speciality | 專長 | 個人資料欄位 + 編輯表單 |

### 3.2 邀請學生

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.invite_clients` | Invite Clients | 邀請學生 | 卡標題 |
| `profile.invite_desc` | Share your invite link so clients can connect to you instantly. | 分享邀請連結，學生即可連接到你。 | 卡內文 |
| `profile.share_whatsapp` | Share via WhatsApp | 透過 WhatsApp 分享 | 按鈕（WhatsApp 唔譯） |
| `profile.copy_link` | Copy Link | 複製連結 | 按鈕 |
| `profile.copy_code` | Copy Code | 複製邀請碼 | 按鈕 |
| `profile.copied` | Copied! | 已複製！ | 按鈕（複製後） |
| `profile.more_share` | More share options | 更多分享方式 | 分享掣（screen reader） |
| `profile.toast_code_copied` | Invite code copied! | 已複製邀請碼！ | toast |
| `profile.toast_link_copied` | Invite link copied! | 已複製邀請連結！ | toast |

### 3.3 工作時間

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.working_hours` | Working Hours | 工作時間 | 卡標題 |
| `profile.working_hours_desc` | Set your available hours so clients can only book within this window. | 設定你有空的時段，學生只能在此範圍內預約。 | 卡內文 |
| `profile.start` | Start | 開始 | 表單欄位 |
| `profile.end` | End | 結束 | 表單欄位 |
| `profile.save_hours` | Save Hours | 儲存時間 | 按鈕 |
| `profile.saving_dots` | Saving... | 儲存中… | 所有教練卡嘅按鈕 loading |
| `profile.toast_end_before_start` | End time must be after start time | 結束時間必須晚於開始時間 | 錯誤 toast |
| `profile.toast_hours_saved` | Working hours saved | 已儲存工作時間 | toast |
| `profile.toast_hours_failed` | Failed to save working hours | 儲存工作時間失敗 | 錯誤 toast |

### 3.4 業務資料

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.business_details` | Business Details | 業務資料 | 卡標題 |
| `profile.business_desc` | Shown on printed invoices. Leave blank to use your name instead. | 顯示於發票上。留空則使用你的姓名。 | 卡內文 |
| `profile.business_name` | Business name | 業務名稱 | 表單欄位 |
| `profile.business_placeholder` | e.g. Peak Form Personal Training | 例如：Peak Form Personal Training | ⚠️ 範例名保留英文，只譯「例如」 |
| `profile.save_business` | Save Business Name | 儲存業務名稱 | 按鈕 |
| `profile.toast_business_saved` | Business name saved | 已儲存業務名稱 | toast |
| `profile.toast_business_failed` | Failed to save business name | 儲存業務名稱失敗 | 錯誤 toast |

### 3.5 續堂定價

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.renewal_pricing` | Renewal Pricing | 續堂定價 | 卡標題 |
| `profile.renewal_desc` | Shown to clients when they run low on sessions, so they know what renewing now vs. later costs. | 學生堂數不足時會看到，讓他們知道現在續堂與稍後續堂的價格差別。 | 卡內文 |
| `profile.current_rate` | Current rate (per session) | 現有價格（每堂） | 表單欄位 |
| `profile.rate_after` | Rate after sessions run out | 堂數用完後的價格 | 表單欄位 |
| `profile.currency` | Currency | 貨幣 | 表單欄位 |
| `profile.save_rates` | Save Rates | 儲存價格 | 按鈕 |
| `profile.toast_rates_invalid` | Enter both rates as numbers greater than 0 | 兩個價格都必須是大於 0 的數字 | 錯誤 toast |
| `profile.toast_rates_saved` | Renewal rates saved | 已儲存續堂價格 | toast |
| `profile.toast_rates_failed` | Failed to save renewal rates | 儲存續堂價格失敗 | 錯誤 toast |

### 3.6 銀行資料

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.bank_details` | Bank Details | 銀行資料 | 卡標題 |
| `profile.bank_desc` | Shown to clients in the renewal payment sheet so they can pay you directly. | 顯示於學生的續堂付款資料中，方便他們直接付款給你。 | 卡內文 |
| `profile.bank_name_placeholder` | Name on your bank account | 你銀行戶口上的名稱 | 輸入框 |
| `profile.save_bank` | Save Bank Details | 儲存銀行資料 | 按鈕 |
| `profile.toast_bank_saved` | Bank details saved | 已儲存銀行資料 | toast |
| `profile.toast_bank_failed` | Failed to save bank details | 儲存銀行資料失敗 | 錯誤 toast |

### 3.7 GoCardless

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.gc_title` | GoCardless Connection | GoCardless 連接 | 卡標題（品牌唔譯） |
| `profile.gc_desc` | Connect your own GoCardless account to enable subscription billing for your clients. | 連接你自己的 GoCardless 帳戶，即可為學生開啟訂閱收費。 | 卡內文 |
| `profile.connected` | Connected | 已連接 | 狀態標籤 |
| `profile.connected_on` | Connected on {date} | 連接日期：{date} | 卡內文 |
| `profile.connect_gc` | Connect GoCardless | 連接 GoCardless | 按鈕 |
| `profile.disconnect` | Disconnect | 中斷連接 | 按鈕 |
| `profile.disconnecting` | Disconnecting... | 中斷連接中… | 按鈕 loading |
| `profile.gc_disconnect_title` | Disconnect GoCardless? | 確定中斷 GoCardless 連接？ | 確認 modal 標題 |
| `profile.gc_disconnect_body` | This will stop all subscription payment collection for your clients immediately. Existing subscriptions will need to be reconnected before payments can resume — this does not cancel them in GoCardless itself. | 這會立即停止向所有學生收取訂閱費用。現有訂閱必須重新連接才可恢復收款 —— 但不會在 GoCardless 中取消訂閱本身。 | 確認 modal 內文 |
| `profile.toast_gc_connected` | GoCardless connected | 已連接 GoCardless | toast |
| `profile.toast_gc_cancelled` | You cancelled the GoCardless connection — you can try again anytime. | 你取消了 GoCardless 連接 —— 隨時可以再試。 | toast |
| `profile.toast_gc_failed` | GoCardless connection failed — please try again. | GoCardless 連接失敗 —— 請再試一次。 | 錯誤 toast |
| `profile.toast_gc_disconnected` | GoCardless disconnected | 已中斷 GoCardless 連接 | toast |
| `profile.toast_gc_disconnect_failed` | Failed to disconnect — please try again | 中斷連接失敗 —— 請再試一次 | 錯誤 toast |

### 3.8 動作庫備份（只有你見到）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.backup_title` | Exercise Library Backup | 動作庫備份 | 卡標題 |
| `profile.backup_desc` | Export your exercise library as JSON for safekeeping. | 將動作庫匯出為 JSON 備份。 | 卡內文（JSON 唔譯） |
| `profile.copy_library` | Copy Exercise Library as JSON | 複製動作庫為 JSON | 按鈕 |
| `profile.toast_exported` | Copied {count} exercises as JSON | 已複製 {count} 個動作為 JSON | toast |

### 3.9 其他

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.delete_li_clients` | Your clients will be disconnected from you | 你的學生將與你解除連接 | 刪除帳戶 modal 清單（教練專用嗰行） |
| `profile.toast_test_notif` | Test notification sent! | 已發送測試通知！ | toast（dev-only，但要有值） |

---

## 4. 認證錯誤訊息（學生教練都會見到）

> ⚠️ **呢組要改 code，唔止改字。** 而家 `utils/authErrors.js` 直接 return 英文字串，冇經過 `t()`。批咗之後我會改成由 component 用明文 `t()` 對應 —— 因為 `t()` 唔接受變數 key（就係阻止動作名被翻譯嗰條 lint 規則）。

| Firebase 錯誤碼 | 英文原文 | 建議中文 | 幾時出現 |
|---|---|---|---|
| `user-not-found` | No account found with this email. | 找不到使用此電郵的帳戶。 | 登入 |
| `wrong-password` | Incorrect password. Please try again. | 密碼不正確，請再試一次。 | 登入 |
| `invalid-credential` | Invalid email or password. | 電郵或密碼不正確。 | 登入 |
| `invalid-login-credentials` | Invalid email or password. | 電郵或密碼不正確。 | 登入 |
| `email-already-in-use` | This email is already registered. Try signing in instead. | 此電郵已註冊，請改為登入。 | 註冊 |
| `weak-password` | Password must be at least 6 characters. | 密碼至少需要 6 個字元。 | 註冊 |
| `invalid-email` | Please enter a valid email address. | 請輸入有效的電郵地址。 | 登入／註冊／重設 |
| `missing-email` | Please enter your email address. | 請輸入電郵地址。 | 重設 |
| `too-many-requests` | Too many attempts. Please wait a moment and try again. | 嘗試次數過多，請稍候再試。 | 登入 |
| `network-request-failed` | Network error. Please check your connection and try again. | 網絡錯誤，請檢查連線後再試。 | 任何時候 |
| `requires-recent-login` | For security, please sign out and sign in again before doing this. | 為安全起見，請先登出再重新登入。 | 刪除帳戶 |
| `user-disabled` | This account has been disabled. Please contact support. | 此帳戶已被停用，請聯絡客戶支援。 | 登入 |
| `operation-not-allowed` | This sign-in method is not enabled. | 此登入方式未啟用。 | 登入 |
| `unauthorized-domain` | This domain is not authorised for sign-in. Please contact support. | 此網域未獲授權登入，請聯絡客戶支援。 | 登入 |
| `internal-error` | An internal error occurred. Please try again. | 發生內部錯誤，請再試一次。 | 任何時候 |
| `popup-blocked` | popup blocked — please allow popups and try again | 彈出視窗被封鎖 —— 請允許彈出視窗後再試 | Google 登入 |
| `web-storage-unsupported` | Your browser blocks required storage. Try disabling private mode or use a different browser. | 你的瀏覽器封鎖了必要的儲存功能。請關閉私密瀏覽模式或改用其他瀏覽器。 | 登入 |
| （後備） | Something went wrong. Please try again. | 發生錯誤，請再試一次。 | 未知錯誤碼 |

> `popup-closed-by-user` 同 `cancelled-popup-request` 刻意冇訊息（用戶自己撳走，唔應該彈錯誤），維持現狀。

---

## 5. 密碼重設訊息（學生教練都會見到）

| Key | 英文原文 | 建議中文 | 幾時出現 |
|---|---|---|---|
| （提示尾句） | It can take a few minutes. Check your spam folder, and search for "password reset" — the sender may not say ElitePro. | 可能需要幾分鐘。請檢查垃圾郵件資料夾，並搜尋「password reset」—— 寄件人未必顯示 ElitePro。 | ⚠️ 兩個提示都用。**搜尋字眼保留英文** —— Firebase 寄出嘅信係英文，搜中文搵唔到 |
| （已知帳戶） | Password reset email sent to {email}. | 重設密碼電郵已發送至 {email}。 | Profile 撳重設（帳戶一定存在） |
| （未知帳戶） | If an account exists for {email}, a reset link is on its way. | 如果 {email} 有帳戶，重設連結將會發送。 | 登入頁撳忘記密碼 |
| （未知帳戶尾句） | If nothing arrives, the address may be different from the one you signed up with. | 如果收不到，可能與你註冊時使用的電郵不同。 | 同上 |
| `quota-exceeded` | Too many reset emails have been sent today. Please try again tomorrow, or ask your coach to reach you another way. | 今日發送的重設電郵已達上限，請明天再試，或請教練用其他方式聯絡你。 | 全站每日上限 |
| `too-many-requests` | Too many attempts from this device. Please wait a few minutes and try again. | 此裝置嘗試次數過多，請稍候幾分鐘再試。 | 同一部機頻繁重試 |
| `network-request-failed` | No connection. Check your internet and try again — nothing has been sent yet. | 沒有網絡連線。請檢查網絡後再試 —— 目前尚未發送任何電郵。 | 斷網 |

---

## ⚠️ 集中一覽 —— 我唔肯定，想你特別睇（9 項）

| # | Key | 我嘅疑問 |
|---|---|---|
| 1 | 「保留英文」5 條 | 將英文原文抄入中文字典嚟滿足 100% 覆蓋率 —— 呢個做法你接受嗎？ |
| 2 | `nav.clients` | 「學生」定「客戶」？教練端叫「客戶」可能更商業，但同學生端「學生」唔一致 |
| 3 | `nav.role_operator` | 「場地管理員」—— gym啦 現時隱藏，我照譯，你有更好叫法就話我知 |
| 4 | `sched.n_left` | 空間好窄（學生名旁邊），用咗「剩 3 堂」唔用「剩餘」。破例可以嗎？ |
| 5 | `sched.remaining_after` | 「剩餘 5 → 完成後：4」—— 箭嘴保留，讀唔讀得順？ |
| 6 | `profile.speciality` | 「專長」定「專項」？ |
| 7 | `profile.business_placeholder` | 範例公司名保留英文，只譯「例如：」。定係整個換成中文例子？ |
| 8 | `profile.sort_placeholder` / `acct_placeholder` | 「e.g.」要唔要譯做「例如」？ |
| 9 | 密碼重設搜尋字眼 | 「搜尋『password reset』」保留英文 —— 因為 Firebase 封信本身係英文。同意嗎？ |

---

## 批准之後我會做嘅（次序）

1. 將批咗嘅 151 條寫入 `zh-HK.js`
2. 改 `authErrors.js` / `passwordReset.js` 嘅 code —— 由 return 英文字串改成 return 錯誤碼，再由 component 用明文 `t()` 對應
3. 跑 test 確認覆蓋率 **100%**
4. **最後先**將 `LanguagePicker.jsx` 嘅 `CLIENT_ONLY_UNTIL_TRAINER_TRANSLATED` 改做 `false`

第 4 步係最後 —— 而且**唔止係我記得**：`dictionary.test.js` 已經加咗一條 gate，只要嗰個常數變 `false` 而覆蓋率唔係 100%，個 build 就會直接 fail。我試過改做 `false`，test 即刻報：

```
LanguagePicker is open to trainers but 124 keys have no Chinese
```

即係話，**開語言掣同譯完呢兩件事已經綁死咗，唔可能行錯次序。**
