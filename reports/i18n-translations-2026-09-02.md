# 中英對照表 — 第一階段（學生端）

**日期：** 2026-09-02 ｜ **狀態：** 等 Ani 逐句批核。**批咗先寫入 `zh-HK.js`。**

---

## 語域規則（每一句都要跟）

**1. 一律用繁體中文書面語，唔用廣東話口語。**

| ✗ 唔要 | ✓ 要 |
|---|---|
| 仲有 7 堂 | 剩餘 7 堂 |
| book 堂 | 預約課堂 |
| 冇堂數 | 沒有剩餘堂數 |

**2. 四個指定用詞（香港慣用）**

| 用 | 唔用 |
|---|---|
| **堂** | 課時 |
| **教練** | 私教 |
| **預約** | 預定 |
| **剩餘** | 剩下 |

**3. 唔翻譯（呢啲係數據，唔會出現喺呢張表）**
動作名（Bench Press、RDL）、sets / reps / kg / RPE / tempo、肌群／器材／movement pattern 標籤、教練自己寫嘅 plan 名同 notes、`DELETE` 確認字、ElitePro 品牌名。

> 呢兩條規則已經寫入 `src/i18n/dictionary.test.js` 做機械檢查 —— 口語字或者四個「唔用」嘅詞入到字典，test 即刻紅，過唔到 CI。所以你批嘅嘢先入得。

---

## 點樣批

- **逐行睇「建議中文」一欄**，OK 就唔使講；要改就話我知邊條 key + 改成點
- **⚠️ 記號** = 我唔肯定，想你特別睇。我唔係香港人，語域錯咗嘅中文比英文更難頂
- `{name}` `{count}` 呢啲括號係變數，位置可以移，但**唔可以刪**

**教練端唔喺呢張表。** 第一階段教練維持英文，`profile.*` 同 `sched.*` 入面嘅教練專用字（invite code、working hours、business details、renewal pricing、bank details、GoCardless、backup）已經入咗 `en.js` 但唔會翻譯，唔使你批。

---

## 1. 首頁（Client Dashboard）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `dash.greeting_morning` | Morning | 早晨 | 頁頂問候，「早晨，Ani」 |
| `dash.greeting_afternoon` | Afternoon | 午安 | 同上 |
| `dash.greeting_evening` | Evening | 晚安 | 同上 |
| `dash.onboarding_title` | Welcome! Get started: | 歡迎！由呢度開始： | 新用戶三步卡標題 |
| `dash.onboarding_step1` | Check your workout plans | 查看訓練計劃 | 三步卡第 1 步 |
| `dash.onboarding_step2` | Log your first workout | 記錄第一次訓練 | 第 2 步 |
| `dash.onboarding_step3` | Track your body stats | 記錄身體數據 | 第 3 步 |
| `dash.stat_this_week` | This Week | 本週 | 四格數字條第 1 格 |
| `dash.stat_total` | Total | 總數 | 第 2 格 |
| `common.weight` | Weight | 體重 | 第 3 格；身體數據格 |
| `dash.stat_prs` | PRs | 個人紀錄 | ⚠️ 第 4 格。英文 3 字元，中文 4 字，格仔最窄嗰個 |
| `dash.start_today` | Start today's training | 開始今日訓練 | 大按鈕（未記錄過今日） |
| `dash.log_another` | Log another session | 再記錄一節 | 大按鈕（今日已記錄過） |
| `dash.your_package` | Your package | 你的堂數 | ⚠️ 堂數卡標題。直譯係「套餐」，但「你的堂數」讀落自然啲 |
| `dash.sessions_left_word_other` | sessions left | 堂剩餘 | ⚠️ 接喺數字後面：「7 堂剩餘」。定係改成「剩餘 7 堂」？咁就要調轉個 layout，話我知 |
| `dash.renew_early` | Renew early to keep your current rate | 提早續堂可保持現有價格 | 堂數卡內連結（堂數低時） |
| `dash.running_low` | Running low — contact your trainer to top up | 堂數不足 —— 請聯絡教練增加堂數 | 堂數卡（教練未設定價格時） |
| `dash.sessions_used` | {used} of {total} sessions used | 已使用 {used} / {total} 堂 | 堂數卡底部 |
| `dash.book_session` | Book Session | 預約課堂 | 堂數卡按鈕 |
| `dash.no_sessions_left` | No sessions left | 沒有剩餘堂數 | 續堂提示卡標題 |
| `dash.last_session_left` | Last session left | 剩餘最後一堂 | 續堂提示卡標題 |
| `dash.sessions_left_count_other` | {count} sessions left | 剩餘 {count} 堂 | 續堂提示卡標題 |
| `dash.renew_none_pre` | You've used all your sessions. Renew now at␣ | 你已用完所有堂數。現在續堂價格為␣ | 續堂提示卡內文（後面接粗體價格） |
| `dash.renew_last_pre` | This is your final session at␣ | 這是你最後一堂，價格為␣ | 續堂提示卡內文 |
| `dash.renew_last_post` | . Renew now to lock in your rate before it moves to {next}. | 。現在續堂可鎖定此價格，之後將調整為 {next}。 | 接上句 |
| `dash.renew_soon_pre` | Renew before they run out to keep your current rate␣ | 在用完之前續堂即可保持現有價格␣ | 續堂提示卡內文 |
| `dash.renew_soon_post` | . After that, renewal is {next}/session. | 。之後續堂價格為每堂 {next}。 | 接上句 |
| `dash.renew` | Renew | 續堂 | 續堂提示卡按鈕 |
| `dash.dismiss` | Dismiss | 關閉 | 續堂提示卡 X 掣（screen reader） |
| `dash.todays_schedule` | Today's Schedule | 今日課堂 | 卡標題 |
| `common.view_all` | View All | 查看全部 | 多張卡右上角 |
| `dash.no_sessions_today` | No sessions today | 今日沒有課堂 | 今日課堂空狀態 |
| `dash.schedule_clear` | Your schedule is clear. | 你今日沒有安排。 | 同上 |
| `dash.book_a_session` | Book a Session | 預約課堂 | 同上按鈕 |
| `dash.minutes_short` | {n}min | {n} 分鐘 | ⚠️ 課堂時長。英文冇空格，中文加空格睇落順啲 |
| `dash.my_plans` | My Workout Plans | 我的訓練計劃 | 卡標題 |
| `dash.no_plans_yet` | No plans assigned yet | 教練未安排訓練計劃 | 訓練計劃空狀態 |
| `dash.no_plans_coach_soon` | Your coach will add a plan soon. | 教練很快會為你安排。 | 同上 |
| `dash.no_plans_connect` | Connect to a coach first from your profile. | 請先在個人檔案連接教練。 | 同上（未連接教練） |
| `dash.connect_coach` | Connect Coach | 連接教練 | 同上按鈕 |
| `dash.plan_meta` | {day} - {count} exercises | {day}．{count} 個動作 | ⚠️ 計劃列表副標題。`{day}` 係教練自己改嘅名（例如 "Day 1"），唔翻譯 |
| `dash.body_stats` | Body Stats | 身體數據 | 卡標題 |
| `dash.details` | Details | 詳細 | 身體數據卡右上角 |
| `dash.body_fat` | Body Fat | 體脂 | 身體數據格 |
| `dash.chest` | Chest | 胸圍 | ⚠️ 身體數據格。呢度係「圍度」唔係肌群 —— 肌群嘅 Chest 唔會翻譯 |
| `dash.waist` | Waist | 腰圍 | 身體數據格 |
| `dash.arms` | Arms | 手臂圍 | ⚠️ 同上，圍度 |
| `dash.legs` | Legs | 腿圍 | ⚠️ 同上 |
| `dash.recent_workouts` | Recent Workouts | 最近訓練 | 卡標題 |
| `dash.custom_workout` | Custom Workout | 自訂訓練 | 訓練記錄冇對應計劃時 |
| `dash.log_meta` | {date} - RPE: {rpe}/10 | {date}．RPE：{rpe}/10 | 訓練記錄副標題（RPE 唔翻譯） |
| `common.done` | Done | 完成 | 訓練記錄標籤 |
| `dash.partial` | Partial | 未完成 | 訓練記錄標籤 |
| `dash.personal_records` | Personal Records | 個人紀錄 | 卡標題 |
| `dash.pr_count` | {count} PRs | {count} 項紀錄 | 個人紀錄卡標籤 |
| `dash.custom_exercise` | Custom exercise | 自訂動作 | 個人紀錄（動作已刪除時） |
| `dash.coach_notes` | Coach Notes | 教練備註 | 卡標題 |

---

## 2. Schedule（學生見到嘅部分）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `sched.title` | Schedule | 課堂 | ⚠️ 頁面標題。「課堂」定「日程」？我傾向「課堂」，同 nav 一致 |
| `sched.subtitle` | Manage your appointments | 管理你的課堂 | 頁面副標題 |
| `sched.book_session` | Book Session | 預約課堂 | 右上角主按鈕 |
| `sched.connect_coach_first` | Connect a coach first | 請先連接教練 | 按鈕 disabled 時嘅提示 |
| `sched.prev_week` | Previous week | 上一週 | 日期列左箭嘴 |
| `sched.next_week` | Next week | 下一週 | 日期列右箭嘴 |
| `sched.today` | Today | 今日 | 日期列 |
| `sched.none_title` | No sessions on this day | 這天沒有課堂 | 空狀態 |
| `sched.none_desc` | Tap below to book a session for this date. | 按下方預約這天的課堂。 | 空狀態 |
| `sched.book_a_session` | Book a Session | 預約課堂 | 空狀態按鈕 |
| `sched.type_duration` | {type} - 60 min | {type}．60 分鐘 | 課堂列表副標題（`{type}` 教練自訂，唔翻譯） |
| `sched.status_pending` | pending | 待確認 | 課堂狀態標籤 |
| `sched.status_confirmed` | confirmed | 已確認 | 課堂狀態標籤 |
| `sched.status_completed` | completed | 已完成 | 課堂狀態標籤 |
| `sched.status_cancelled` | cancelled | 已取消 | 課堂狀態標籤 |
| `sched.late_cancel` | late cancel | 逾時取消 | 課堂狀態標籤 |
| `common.cancel` | Cancel | 取消 | 學生取消課堂按鈕；所有 modal |
| `sched.blocked` | Blocked | 不可預約 | ⚠️ 教練封鎖嘅時段。學生都見到 |
| `sched.unavailable` | unavailable | 不可預約 | 同上標籤 |
| **透支（0 堂仍要預約）** | | | |
| `sched.no_sessions_left_title` | You have no sessions left | 你已沒有剩餘堂數 | 透支確認 modal 標題 |
| `sched.overdraft_pre` | You can still book this one — it will be added to your next renewal | 你仍可預約這一堂，費用將計入下次續堂 | modal 內文 |
| `sched.overdraft_at` | ␣at␣ | ，價格為␣ | 接粗體價格 |
| `sched.overdraft_post` | . After this you'll need to top up before booking again. | 。之後必須先增加堂數才可再預約。 | 接上句 |
| `sched.booking` | Booking… | 預約中… | 按鈕 loading |
| `sched.book_anyway` | Book anyway | 仍然預約 | modal 確認按鈕 |
| **已欠一堂，封鎖** | | | |
| `sched.blocked_title` | Can't book — 1 session already owed | 無法預約 —— 已欠 1 堂 | 封鎖 modal 標題 |
| `sched.blocked_body` | You've already booked one session on credit. Message your coach to top up your sessions before booking again. | 你已經預支了一堂。請聯絡教練增加堂數後再預約。 | modal 內文 |
| `common.close` | Close | 關閉 | modal 按鈕 |
| `sched.message_coach` | Message coach | 聯絡教練 | modal 按鈕 |
| **逾時取消** | | | |
| `sched.late_title` | Late Cancellation Notice | 逾時取消通知 | modal 標題 |
| `sched.late_starts_pre` | This session starts in less than␣ | 這堂將於少於␣ | 接粗體「24 小時」 |
| `sched.late_24h` | 24 hours | 24 小時 | 粗體 |
| `sched.at` | at | 於 | ⚠️ 「2026-09-05 於 10:00」。中文日期時間之間可能唔使字，你話事 |
| `sched.late_policy_pre` | Per our cancellation policy,␣ | 根據取消政策，␣ | modal 內文 |
| `sched.late_policy_bold` | the full session fee still applies | 仍需支付全額堂費 | 粗體 |
| `sched.late_policy_post` | ␣for cancellations made within 24 hours of the scheduled time. Your trainer will be notified. | ，適用於課堂開始前 24 小時內的取消。教練將收到通知。 | 接上句 |
| `sched.go_back` | Go Back | 返回 | modal 按鈕 |
| `sched.cancelling` | Cancelling… | 取消中… | 按鈕 loading |
| `sched.cancel_anyway` | Cancel Anyway | 仍然取消 | modal 確認按鈕 |
| **刪除課堂** | | | |
| `sched.delete_session_title` | Delete Session | 刪除課堂 | modal 標題 |
| `sched.delete_session_body` | This will permanently remove this session. This cannot be undone. | 這將永久刪除此課堂，且無法復原。 | modal 內文 |
| `sched.delete` | Delete | 刪除 | modal 按鈕 |
| `sched.removing` | Removing… | 刪除中… | 按鈕 loading |
| `sched.delete_session_aria` | Delete session | 刪除課堂 | 垃圾桶掣（screen reader） |
| **預約表單** | | | |
| `sched.coach` | Coach | 教練 | 表單欄位標籤 |
| `sched.your_coach` | Your Coach | 你的教練 | 教練未有名時 |
| `sched.sessions_label` | Sessions: | 堂數： | 表單內堂數提示 |
| `sched.remaining` | {n} remaining | 剩餘 {n} 堂 | 同上 |
| `sched.date` | Date | 日期 | 表單欄位 |
| `sched.time` | Time | 時間 | 表單欄位 |
| `sched.select_time` | Select time | 選擇時間 | 時間下拉預設 |
| `sched.type` | Type | 類型 | 表單欄位 |
| `sched.book` | Book | 預約 | 表單提交按鈕 |
| **提示訊息（toast）** | | | |
| `sched.toast_booked` | Session booked | 已預約課堂 | 成功 toast |
| `sched.toast_confirmed` | Session confirmed | 課堂已確認 | toast |
| `sched.toast_cancelled` | Session cancelled | 課堂已取消 | toast |
| `sched.toast_late_cancelled` | Session cancelled — the full session fee still applies per our policy. | 課堂已取消 —— 根據政策仍需支付全額堂費。 | 逾時取消後 toast |
| `sched.err_connect_first` | Connect to a coach first from your Profile before booking | 請先在個人檔案連接教練才可預約 | 錯誤 toast |
| `sched.err_time_conflict` | Time conflict! There is already a session at this time. | 時間衝突！這個時段已有課堂。 | 錯誤 toast |
| `sched.err_save_prompt` | Could not save that — you may see this again next time. | 無法儲存 —— 下次可能會再次顯示。 | 錯誤 toast |
| `sched.err_book_failed` | Failed to book session: {msg} | 預約失敗：{msg} | ⚠️ 錯誤 toast。`{msg}` 係 Firebase 英文錯誤訊息，唔翻譯 |
| `sched.err_failed` | Failed: {msg} | 失敗：{msg} | 同上 |
| `sched.err_update_failed` | Failed to update: {msg} | 更新失敗：{msg} | 同上 |
| `sched.err_delete_failed` | Failed to delete: {msg} | 刪除失敗：{msg} | 同上 |
| `sched.unknown_error` | unknown error | 不明錯誤 | 上面 `{msg}` 嘅後備值 |

---

## 3. My Workouts（我的訓練）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `plans.title` | My Workouts | 我的訓練 | 頁面標題 |
| `plans.subtitle` | {count} workout plans assigned by your coach | 教練安排了 {count} 個訓練計劃 | 頁面副標題 |
| `plans.none_title` | No workout plans assigned yet | 教練未安排訓練計劃 | 空狀態 |
| `plans.none_desc_connected` | Your coach hasn't assigned any plans yet. Message them to get started. | 教練尚未安排訓練計劃。可以聯絡教練開始。 | 空狀態 |
| `plans.none_desc_unconnected` | Connect to a coach first — they will assign workout plans for you. | 請先連接教練 —— 教練會為你安排訓練計劃。 | 空狀態 |
| `plans.connect_cta` | Connect to a Coach | 連接教練 | 空狀態按鈕 |
| `plans.message_cta` | Message Your Coach | 聯絡教練 | 空狀態按鈕 |
| `plans.start_workout` | Start Workout | 開始訓練 | 每個計劃卡按鈕 |
| `plans.sets_count` | {count} sets | {count} 組 | ⚠️ 動作組數（每組 reps 唔同時）。「組」係香港健身房用語，但 sets 本身唔翻譯 —— 呢度係句子唔係標籤，所以譯咗。你決定 |
| `plans.watch_demo` | Watch Demo | 觀看示範 | 動作示範影片連結 |

---

## 4. Profile（學生見到嘅部分）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `profile.title` | Profile | 個人檔案 | 頁面標題 |
| `role.client` | Client | 學生 | ⚠️ 姓名旁邊嘅角色標籤。「學生」定「學員」？我用咗「學生」跟你平時講法 |
| `auth.email` | Email | 電郵 | 個人資料欄位 |
| `sched.coach` | Coach | 教練 | 個人資料欄位 |
| `profile.not_connected` | Not connected | 未連接 | 未連接教練時 |
| `profile.age` | Age | 年齡 | 個人資料欄位 |
| `profile.height` | Height | 身高 | 個人資料欄位 |
| `profile.height_cm` | Height (cm) | 身高（cm） | 編輯表單欄位（cm 唔翻譯） |
| `profile.goals` | Goals | 目標 | 個人資料欄位 |
| `profile.joined` | Joined | 加入日期 | 個人資料欄位 |
| `profile.edit_profile` | Edit Profile | 編輯個人檔案 | 按鈕 |
| `profile.name` | Name | 姓名 | 編輯表單欄位 |
| `profile.managed_by` | (managed by {provider}) | （由 {provider} 管理） | 電郵欄位旁註 |
| `profile.provider_google` | Google | Google | 唔翻譯（品牌） |
| `profile.provider_login` | login provider | 登入服務 | 同上，非 Google 時 |
| `common.save` | Save | 儲存 | 編輯表單按鈕 |
| **連接教練** | | | |
| `profile.connect_coach` | Connect to Coach | 連接教練 | 卡標題 |
| `profile.connect_desc` | Enter your coach's invite code to connect. | 輸入教練的邀請碼即可連接。 | 卡內文 |
| `profile.code_placeholder` | Enter 6-digit code | 輸入 6 位邀請碼 | 輸入框 |
| `profile.connect` | Connect | 連接 | 按鈕 |
| `profile.connecting_dots` | Connecting... | 連接中… | 按鈕 loading |
| `profile.toast_connected_coach` | Connected to Coach {name}! | 已連接教練 {name}！ | 成功 toast |
| **訓練檔案** | | | |
| `profile.training_profile` | Training Profile | 訓練檔案 | 卡標題 |
| `profile.training_desc` | Your goals, experience, and any injuries your coach should know about. | 你的目標、經驗，以及教練需要知道的傷患。 | 卡內文 |
| `profile.edit_training` | Edit Training Profile | 編輯訓練檔案 | 按鈕 |
| `profile.complete_training_title` | Complete your training profile | 完成你的訓練檔案 | 未填寫時卡標題 |
| `profile.complete_training_desc` | Help your coach plan your sessions safely — takes 2 minutes. | 幫助教練安全地安排課堂 —— 只需 2 分鐘。 | 未填寫時內文 |
| `profile.complete_training_cta` | Complete Training Profile | 完成訓練檔案 | 按鈕 |
| **通知** | | | |
| `profile.notifications` | Notifications | 通知 | 卡標題 |
| `profile.enabled` | Enabled | 已啟用 | 標籤 |
| `profile.notif_enabled_desc` | You'll receive push notifications for messages and session updates | 你將收到訊息及課堂更新的推送通知 | 卡內文 |
| `profile.notif_unsupported` | Push notifications are not supported on this browser. Try adding the app to your home screen first. | 此瀏覽器不支援推送通知。請先將應用程式加入主畫面。 | 卡內文 |
| `profile.notif_not_setup` | Notifications aren't fully set up on this device yet. | 此裝置的通知尚未完成設定。 | 卡內文 |
| `profile.enable_notifications` | Enable Notifications | 啟用通知 | 按鈕 |
| `profile.notif_blocked` | Notifications blocked | 通知已封鎖 | 卡內文 |
| `profile.notif_blocked_desc` | To enable, go to your browser settings and allow notifications for this site. | 請在瀏覽器設定中允許此網站發送通知。 | 卡內文 |
| `profile.notif_prompt_desc` | Get notified when you receive messages or when sessions are scheduled. | 收到訊息或課堂安排時通知你。 | 卡內文 |
| `profile.enable_push` | Enable Push Notifications | 啟用推送通知 | 按鈕 |
| **安裝應用程式** | | | |
| `profile.install_title` | Install as App | 安裝為應用程式 | 卡標題 |
| `profile.install_sub` | Use offline · Faster · Feels native | 離線可用．更快．更順暢 | 卡副標題 |
| `profile.app_installed` | App Installed | 已安裝 | 已安裝時卡標題 |
| `profile.app_installed_desc` | ElitePro is running as a native app on your device. | ElitePro 正以應用程式形式運行。 | 已安裝時內文 |
| `profile.ios_tap_the` | Tap the | 按 | iOS 安裝步驟 1 |
| `profile.share` | Share | 分享 | iOS 步驟 1（粗體） |
| `profile.button_in_safari` | button in Safari | 按鈕（Safari） | ⚠️ iOS 步驟 1。中文語序同英文唔同，呢句可能要重寫成「在 Safari 按分享按鈕」 |
| `profile.scroll_tap` | Scroll down and tap | 向下捲動並按 | iOS 步驟 2 |
| `profile.add_to_home` | "Add to Home Screen" | 「加入主畫面」 | iOS 步驟 2（粗體） |
| `profile.tap` | Tap | 按 | iOS 步驟 3 |
| `profile.add_quoted` | "Add" | 「加入」 | iOS 步驟 3（粗體） |
| `profile.top_right` | in the top-right corner | 右上角 | iOS 步驟 3 |
| `profile.open_browser` | Open the browser | 開啟瀏覽器 | Android 步驟 1 |
| `profile.browser_menu` | menu (⋮) | 選單（⋮） | Android 步驟 1（粗體） |
| `profile.or` | or | 或 | Android 步驟 2 |
| `profile.install_app_quoted` | "Install App" | 「安裝應用程式」 | Android 步驟 2（粗體） |
| `profile.confirm_install` | Confirm to install — look for the banner at the top of this page too | 確認安裝 —— 本頁頂部亦會顯示提示 | Android 步驟 3 |
| **帳戶** | | | |
| `profile.account` | Account | 帳戶 | 卡標題 |
| `profile.role` | Role | 身分 | 帳戶欄位 |
| `nav.role_client` | client | 學生 | 帳戶欄位值 |
| `profile.signin_method` | Sign-in method | 登入方式 | 帳戶欄位 |
| `profile.send_reset` | Send Password Reset Email | 發送重設密碼電郵 | 按鈕 |
| `nav.log_out` | Log Out | 登出 | 按鈕 |
| **危險區域** | | | |
| `profile.danger_zone` | Danger Zone | 危險操作 | 卡標題 |
| `profile.danger_text` | Permanently delete your account. Your profile and body stats will be removed. Workout logs and message history will remain as orphan data for your coach's records. | 永久刪除你的帳戶。個人檔案及身體數據將被移除。訓練記錄及訊息記錄會保留，作為教練的紀錄。 | 卡內文 |
| `profile.danger_bold` | ␣This action cannot be undone. | ␣此操作無法復原。 | 粗體 |
| `profile.delete_account` | Delete Account | 刪除帳戶 | 按鈕 / modal 標題 |
| `profile.delete_about_pre` | You are about to permanently delete the account␣ | 你將永久刪除此帳戶：␣ | modal 內文 |
| `profile.delete_li_profile` | Your profile and login will be removed | 個人檔案及登入將被移除 | modal 清單 |
| `profile.delete_li_stats` | Your body stats will be deleted | 身體數據將被刪除 | modal 清單 |
| `profile.delete_li_logs` | Workout logs and messages will remain (orphaned) | 訓練記錄及訊息將會保留 | modal 清單 |
| `profile.enter_password` | Enter your password to confirm | 輸入密碼以確認 | modal 表單 |
| `profile.password_placeholder` | Your password | 你的密碼 | 輸入框 |
| `profile.type_pre` | Type | 輸入 | modal，後面接 `DELETE` |
| `profile.type_post` | to confirm: | 以確認： | 接上句（`DELETE` 唔翻譯） |
| `profile.deleting` | Deleting... | 刪除中… | 按鈕 loading |
| `profile.permanently_delete` | Permanently Delete | 永久刪除 | modal 確認按鈕 |
| `profile.toast_updated` | Profile updated | 個人檔案已更新 | toast |
| `profile.toast_account_deleted` | Account deleted | 帳戶已刪除 | toast |
| `profile.toast_delete_failed` | Failed to delete account. Please try again. | 刪除帳戶失敗，請再試一次。 | 錯誤 toast |
| `profile.toast_generic_error` | Something went wrong. Please try again. | 發生錯誤，請再試一次。 | 錯誤 toast |
| `common.copy_failed` | Failed to copy | 複製失敗 | 錯誤 toast |

---

## 5. Login（登入／註冊）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `auth.tagline` | Fitness Training Platform | 健身訓練平台 | Logo 下方 |
| `auth.google_continue` | Continue with Google | 使用 Google 繼續 | Google 按鈕 |
| `auth.google_signing_in` | Signing in… | 登入中… | Google 按鈕 loading |
| `auth.google_redirecting` | Redirecting to Google… | 正在前往 Google… | Google 按鈕 loading（手機） |
| `auth.or` | or | 或 | 分隔線 |
| `auth.email` | Email | 電郵 | 表單欄位 |
| `auth.email_placeholder` | Enter your email | 輸入電郵地址 | 輸入框 |
| `auth.password` | Password | 密碼 | 表單欄位 |
| `auth.password_placeholder_signin` | Enter your password | 輸入密碼 | 輸入框（登入） |
| `auth.password_placeholder_signup` | At least 6 characters | 至少 6 個字元 | 輸入框（註冊） |
| `auth.sign_in` | Sign In | 登入 | 提交按鈕 |
| `auth.create_account` | Create Account | 建立帳戶 | 提交按鈕（註冊） |
| `auth.no_account` | Don't have an account? Sign up | 未有帳戶？立即註冊 | 切換連結 |
| `auth.have_account` | Already have an account? Sign in | 已有帳戶？立即登入 | 切換連結 |
| `auth.forgot` | Forgot password? | 忘記密碼？ | 連結 |
| `auth.legal_pre` | By continuing, you agree to our | 繼續即表示你同意我們的 | 頁腳 |
| `auth.terms` | Terms of Service | 服務條款 | 頁腳連結 |
| `auth.and` | and | 及 | 頁腳 |
| `auth.privacy` | Privacy Policy | 私隱政策 | ⚠️ 頁腳連結。香港用「私隱」唔用「隱私」—— 幫我確認 |
| `auth.reset_title` | Reset Password | 重設密碼 | modal 標題 |
| `auth.reset_intro` | Enter the email you signed up with. We'll send you a link to reset your password. | 輸入你註冊時使用的電郵，我們會發送重設密碼連結給你。 | modal 內文 |
| `auth.reset_email_placeholder` | you@example.com | you@example.com | 唔翻譯（電郵格式範例） |
| `auth.send_reset` | Send Reset Link | 發送重設連結 | modal 按鈕 |
| `auth.sending` | Sending... | 發送中… | 按鈕 loading |
| `common.cancel` | Cancel | 取消 | modal 按鈕 |
| `auth.err_enter_email` | Please enter your email | 請輸入電郵地址 | 錯誤 |
| `auth.err_password_short` | Password must be at least 6 characters | 密碼至少需要 6 個字元 | 錯誤 |
| `auth.err_google` | Google sign-in failed. Please try again. | Google 登入失敗，請再試一次。 | 錯誤 |
| `auth.err_generic` | Authentication failed. Please try again. | 登入失敗，請再試一次。 | 錯誤 |
| `auth.err_reset_failed` | Failed to send reset email. Please try again. | 發送重設電郵失敗，請再試一次。 | 錯誤 |

---

## 6. RoleSelect（首次登入設定）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `role.title` | Welcome! Set up your profile | 歡迎！設定你的個人檔案 | 標題 |
| `role.signed_in_as` | Signed in as | 已登入： | 副標題 |
| `role.trainer` | Trainer | 教練 | 身分卡 |
| `role.trainer_desc` | Manage clients & create plans | 管理學生及制定訓練計劃 | 身分卡 |
| `role.client` | Client | 學生 | 身分卡 |
| `role.client_desc` | Track workouts & progress | 記錄訓練及進度 | 身分卡 |
| `role.display_name` | Display Name | 顯示名稱 | 表單欄位 |
| `role.name_placeholder` | Your name | 你的名稱 | 輸入框 |
| `role.invite_code` | Invite Code | 邀請碼 | 表單欄位 |
| `common.optional` | (optional) | （可選） | 邀請碼欄位旁 |
| `role.code_placeholder` | e.g. AX7K2M | 例如 AX7K2M | 輸入框 |
| `role.code_prefilled` | Pre-filled from your coach's invite link | 已從教練的邀請連結自動填入 | 提示 |
| `role.code_hint` | Ask your coach for their 6-digit code, or skip and connect later in Profile. | 向教練索取 6 位邀請碼，或跳過並稍後在個人檔案連接。 | 提示 |
| `role.get_started` | Get Started | 開始使用 | 提交按鈕 |
| `role.creating` | Creating... | 建立中… | 按鈕 loading |
| `role.use_different_account` | Sign out and use a different account | 登出並使用其他帳戶 | 底部連結 |
| `role.err_select_role` | Please select a role | 請選擇身分 | 錯誤 |
| `role.err_enter_name` | Please enter your name | 請輸入名稱 | 錯誤 |
| `role.err_code_check` | Could not check that invite code. Check your connection and try again. | 無法驗證邀請碼，請檢查網絡連線後再試。 | 錯誤 |
| `role.err_code_invalid` | Invalid invite code. Check it with your coach, or leave it blank and connect later from your profile. | 邀請碼無效。請向教練確認，或留空並稍後在個人檔案連接。 | 錯誤 |
| `role.err_create_failed` | Failed to create profile. Please try again. | 建立個人檔案失敗，請再試一次。 | 錯誤 |

---

## 7. 導航（學生見到嘅）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `nav.dashboard` | Dashboard | 主頁 | 側邊欄 |
| `nav.home` | Home | 主頁 | 手機底部 |
| `nav.workout_log` | Workout Log | 訓練記錄 | 側邊欄 |
| `nav.log_short` | Log | 記錄 | 手機底部 |
| `nav.schedule` | Schedule | 課堂 | 導航 |
| `nav.my_plans` | My Plans | 我的計劃 | 導航 |
| `nav.progress` | Progress | 進度 | 側邊欄 |
| `nav.my_progress` | My Progress | 我的進度 | 手機 More |
| `nav.exercise_library` | Exercise Library | 動作庫 | ⚠️ 導航。動作**名**唔翻譯，但個功能名要 |
| `nav.profile` | Profile | 個人檔案 | 導航 |
| `nav.more` | More | 更多 | 手機底部第 5 格 + More 面板標題 |
| `nav.dark_mode` | Dark Mode | 深色模式 | 側邊欄按鈕 |
| `nav.light_mode` | Light Mode | 淺色模式 | 側邊欄按鈕 |
| `nav.log_out` | Log Out | 登出 | 側邊欄 + More 面板 |

---

## 8. 續堂 modal ＋ 付款資料（PaymentSheet）

| Key | 英文原文 | 建議中文 | 出現位置 |
|---|---|---|---|
| `renewal.on_credit` | This session is on credit | 這一堂為預支 | 續堂 modal 標題 |
| `renewal.was_last` | That was your last session | 這是你最後一堂 | 續堂 modal 標題 |
| `renewal.overdraft_pre` | Your sessions have run out, so this booking will be added to your next renewal at␣ | 你的堂數已用完，這次預約將計入下次續堂，價格為␣ | modal 內文 |
| `renewal.overdraft_post` | . Renewing now settles it and puts credit back on your account. | 。現在續堂即可結清並補回堂數。 | 接上句 |
| `renewal.keep_rate_pre` | Renew now to keep your current rate of␣ | 現在續堂可保持現有價格␣ | modal 內文 |
| `renewal.keep_rate_mid` | . Once your sessions run out, renewal moves to␣ | 。堂數用完後，續堂價格將調整為␣ | 接上句 |
| `renewal.renew_now` | Renew now | 立即續堂 | modal 主按鈕 |
| `renewal.remind_later` | Remind me later | 稍後提醒我 | modal 次按鈕 |
| `renewal.snooze_note` | Remind me later hides this for {days} days. | 選擇稍後提醒將隱藏此提示 {days} 天。 | modal 底部說明 |
| `common.saving` | Saving… | 儲存中… | 按鈕 loading |
| `common.per_session` | /session | ／堂 | ⚠️ 接喺價格後面：「HK$400／堂」。用全形斜線定半形？ |
| `pay.title` | Renew with {name} | 向 {name} 續堂 | 付款資料 modal 標題 |
| `pay.your_coach` | your coach | 你的教練 | 教練未有名時 |
| `pay.intro` | Transfer to the details below, then send your trainer the reference so they can match your payment. | 請轉帳至以下帳戶，然後將參考編號發送給教練以便核對。 | modal 內文 |
| `pay.locks_in` | Locks in {rate}/session | 鎖定價格 {rate}／堂 | 標籤 |
| `pay.no_bank` | Your trainer hasn't added bank details yet — message them directly to arrange renewal. | 教練尚未提供銀行資料 —— 請直接聯絡教練安排續堂。 | modal 內文 |
| `pay.account_name` | Account name | 戶口名稱 | ⚠️ 資料列。香港用「戶口」唔用「帳戶」—— 幫我確認 |
| `pay.sort_code` | Sort code | Sort Code | ⚠️ 英國銀行編碼，香港冇對應概念。建議保留英文 |
| `pay.account_number` | Account number | 戶口號碼 | 資料列 |
| `pay.reference` | Reference | 參考編號 | 資料列 |
| `pay.copy_all` | Copy all | 複製全部 | 按鈕 |
| `common.done` | Done | 完成 | 按鈕 |
| `common.copy_x` | Copy {label} | 複製{label} | 每行複製掣（screen reader） |
| `pay.copied` | Payment details copied | 已複製付款資料 | toast |
| `pay.rate_note` | Your rate is confirmed once payment is received while you still have sessions remaining | 在仍有剩餘堂數期間收到付款，價格即告確認 | modal 底部說明 |
| `pay.rate_note_more` | ␣— if your credit runs out first, renewal moves to {rate}/session. | ␣—— 若堂數先用完，續堂價格將調整為 {rate}／堂。 | 接上句 |

---

## ⚠️ 集中一覽 —— 我唔肯定，想你特別睇（14 項）

| # | Key | 我嘅疑問 |
|---|---|---|
| 1 | `dash.stat_prs` | 「個人紀錄」4 個字塞入 390px 螢幕嘅四分之一格。要唔要縮短做「紀錄」？ |
| 2 | `dash.sessions_left_word_other` | 「7 堂剩餘」語序怪。想改成「剩餘 7 堂」就要調 layout —— 值唔值得？ |
| 3 | `dash.your_package` | 「你的堂數」vs 直譯「套餐」 |
| 4 | `dash.chest` / `arms` / `legs` | 我譯咗「胸圍／手臂圍／腿圍」（圍度）。合唔合香港健身房講法？ |
| 5 | `dash.minutes_short` | 「60 分鐘」加空格 vs「60分鐘」 |
| 6 | `sched.title` | 「課堂」定「日程」？ |
| 7 | `sched.at` | 「2026-09-05 於 10:00」—— 中文可能唔使個「於」 |
| 8 | `sched.blocked` / `unavailable` | 兩個都譯咗「不可預約」，重複。要唔要分開？ |
| 9 | `plans.sets_count` | 「3 組」—— sets 標籤唔翻譯，但呢度係句子。譯定唔譯？ |
| 10 | `role.client` | 「學生」定「學員」？ |
| 11 | `auth.privacy` | 「私隱政策」（香港）vs「隱私政策」（台灣） |
| 12 | `pay.account_name` | 「戶口名稱」（香港）vs「帳戶名稱」 |
| 13 | `pay.sort_code` | 建議保留英文 —— 香港冇 Sort Code |
| 14 | `common.per_session` | 「／堂」全形斜線 vs「/堂」半形 |

---

## 未翻譯、留英文嘅（唔使你批，但講清楚）

| 項目 | 點解 |
|---|---|
| **Firebase Auth 錯誤訊息**（`utils/authErrors.js`） | 由 Firebase SDK 傳返嘅 error code 對應嘅訊息。呢批係獨立一組 ~10 句，我建議下一步一併處理 —— 而家會 fallback 英文 |
| **密碼重設提示**（`utils/passwordReset.js`） | 同上，~6 句 |
| **教練端所有頁面** | 第一階段範圍外 |
| **Schedule 教練專用**：Block Time、Working Hours banner、Complete Session recap、Mark Complete | 學生見唔到 |
| **Profile 教練專用**：邀請碼、Working Hours、Business Details、Renewal Pricing、Bank Details、GoCardless、Exercise Library Backup | 學生見唔到 |
| **教練寫嘅 recap 訊息預設文字**（"Great session today, X! 💪"） | 教練寫俾學生嘅訊息內容，唔係 UI |
| **動作名、sets / reps / kg / RPE、肌群／器材／pattern 標籤、plan 名、notes** | CLAUDE.md #39 —— 係數據唔係 UI |
| **`DELETE`** | 用戶要照打嘅確認字，譯咗就打唔到 |
| **ElitePro、gym啦、Google、Sort Code** | 品牌／專有名詞 |
