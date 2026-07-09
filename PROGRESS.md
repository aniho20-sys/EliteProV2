# ElitePro 開發進度紀錄

> 最後更新：2026-06-10（Session 32）

---

## 🚀 即時行動清單（推廣前必須完成）

> 目標：搵第一位 Founding Member 前，以下全部 ✅

| 優先 | 任務 | 負責 | 狀態 |
|------|------|------|------|
| 🔴 | 更新 Landing Page copy → 首5位 Founding Member，3個月免費 | 員工B | ⬜ |
| 🔴 | 手機打開 `/#/landing` 確認版面效果 | 自己 | ⬜ |
| 🔴 | Firebase Console → Functions 確認 7 個 functions 存在（含新增 onSessionsLow） | 自己 | ⬜ |
| 🔴 | Firebase Console → Firestore Rules 確認係最新版本 | 自己 | ⬜ |
| 🟠 | End-to-end 測試：Landing Page → Sign up → 加 client → Book session → Mark Complete → 確認堂數扣數 | 自己 | ⬜ |
| 🟠 | iOS Safari + Android Chrome 各測試一次 | 自己 | ⬜ |
| 🟡 | 寫 WhatsApp 邀請訊息，直接搵5個教練朋友 | 員工X + 自己 | ⬜ |

---

## 🎯 競品對比

| 功能 | Hevy Coach | ElitePro |
|------|-----------|---------|
| Workout programming | ✅ | ✅ |
| Client progress charts | ✅ | ✅ |
| Messaging | ✅ | ✅ |
| Rest Timer | ✅ | ✅ |
| Plan Templates | ❌ | ✅ |
| Session booking | ❌ | ✅ |
| 堂數管理（Top-Up + 自動扣） | ❌ | ✅ |
| Invoice / 收費 | ❌ | ✅ |
| Workout Log 編輯 | ❌ | ✅ |
| Workout Complete Screen | ❌ | ✅ |
| Smart Progression | ❌ | ✅ |
| Badge / 獎章系統 | ❌ | ✅ |
| Push Notifications | ✅ | ⚠️ 待確認 |
| Built-in exercise GIFs | ✅ | ❌ |
| Excel / CSV 客戶匯入 | ❌ | 🔜 規劃中 |
| Apple Watch 整合 | ✅ | ⚠️ 需 Capacitor |
| Native mobile app | ✅ | ⚠️ PWA |

---

## ✅ 已完成功能

### 基礎架構
- React 19 + Vite 8 SPA（HashRouter）、Trainer / Client 雙角色
- Firebase Auth（Google、Email/Password、Forgot Password、Demo Coach）
- **Google 登入修復**（桌面 popup、手機/PWA redirect；`redirectChecked` 解決 race condition 閃屏問題）
- Firestore real-time sync（8 collections）、IndexedDB offline persistence
- PWA manifest + iOS Add to Home Screen（white-bg blue-swirl logo，no-cache headers）
- Firebase Hosting + GitHub Actions CI
- Privacy Policy + Terms of Service（GDPR compliant，contact: Elitepro616@gmail.com）
- Global Search（`useMemo` 優化）、EmptyState、Skeleton、Toast、Error Boundary

### 訓練管理
- Workout Plan Builder（drag reorder、duplicate、custom exercises、templates、equipment filter、per-exercise unit type + notes）
- **Plan editor 只訂 Reps / Time / Distance 目標**（移除 Wt+Reps pill；weight_reps 動作自動顯示 Reps）
- Workout Log（auto-fill、PR tracking、edit 權限用 `createdBy` 判斷、localStorage draft）
- **Trainer 可替 client 記錄 workout log**（ClientDetailPage → Log Session → WorkoutLogPage，含 rest timer）
- **Workout Log 快速輸入**（inputMode decimal/numeric、Enter 自動跳焦點、+/− Stepper、Fill 填入上次、Apply 套用進階建議、Add Set 複製上一 set）
- **Workout Complete Screen**（儲存後顯示 volume、exercises、RPE、new PRs、closing message）
- Rest Timer（sticky bar、5個預設、Web Audio、震動；trainer/client 通用）
- Smart Progression Suggestions（plateau 時顯示 +2.5kg 建議，可一鍵 Apply）
- **Bulk Assign Plan**（checkbox multi-select + `Promise.all` 批量建立）

### 排程 & 堂數
- Schedule 日曆（conflict check、working hours、可前後翻閱歷史日期）
- **Block Time 合併入 Book Session modal**（頂部 toggle：Book Session ｜ Block Time；共用日期 + 時段 picker；Blocked slot 若已有真實 session 自動隱藏）
- Session Recap 一鍵發送（Mark Complete → recap modal → 發送 message 給 client）
- **完成課堂自動扣堂數**（Mark Complete → Firestore `increment(1)` 原子操作；教練仍可在 ClientDetailPage 手動覆蓋）
- **堂數 Top-Up 功能**（+5/+10/+20 快捷鍵 + 自訂數量 modal）

### 客戶管理
- Client 管理（搜尋、detail view、labels/分組、Remove Client）
- Body Stats / Progress（Recharts AreaChart、趨勢指示、edit measurement）
- Per-exercise strength progression chart（ExerciseProgress component，auto-select most-logged）
- Volume Analytics Chart（ProgressPage + ClientDetailPage）
- Trainer 全客戶進度概覽頁（sparkline、排序）
- Badge System Phase 1（1/10/50/100 次里程碑；ClientDashboard + ClientDetailPage 顯示）

### 商業功能
- Invoice / 收費管理
- Business Analytics（/analytics：月收入、sessions、30日 retention、Top clients）
- **學生流失預警**（Trainer Dashboard：7 天無 workout log 標 `Inactive Xd`；sessions remaining ≤ 2 標紅；雙 tag 排序顯示最高風險客戶）
- In-app Messaging（unread badges、real-time sync、rate limiting 10條/分鐘）

### 其他
- Exercise Library（search、filter、YouTube links、Kettlebell + Other equipment）
- **Exercise Picker 優化**（橫向 muscle chip 篩選、高度自適應 `clamp()`；MuscleSelector 改為 chip 文字選擇）
- Profile（invite code、shareable link、working hours、connect to trainer）
- Trainer Dashboard（stats + weekly chart + client activity）
- Client Dashboard（stats + sessions quota + Book Session CTA）
- Mobile More 抽屜（底部導航 4 tab + slide-up sheet；Trainer 手機 Plans 升至主 tab）
- **FCM push notifications 代碼已完成**（VAPID key 已配置；Cloud Functions 已寫好；iOS 需 PWA 模式；實際運作待確認）
- **Landing Page**（`/#/landing`，CSS UI mockups，無需登入；待手機版面確認 + copy 更新，見即時行動清單）
- **Client Onboarding（IntakeFormPage）**（PAR-Q 式問卷）

### gym啦 Sprint 1（已完成 — commit 82306e3；現透過 `GYMLA_ENABLED=false` 暫時隱藏，見 Session 32）
整合入 ElitePro，共用 Firebase project `elitepro-16718`。Code 全部保留，`App.jsx` 將 `GYMLA_ENABLED` 設返 `true` 即可重新啟用。
- `operator` role routing + OperatorDashboard
- Studio 管理（新增 / 編輯 / 停用）
- Studio Slots 批量開放（1 小時一格）+ `runTransaction` 防 race condition booking
- 教練申請流程（TrainerApplicationPage）+ Operator 審核（approve / reject）
- TrainerDashboard gym啦 CTA card（`gymlaStatus === 'none'` 時顯示）
- Firestore rules（`studios`, `studioSlots`, `trainerApplications`）
- 新 Pages：`OperatorDashboard.jsx`, `StudioManagementPage.jsx`, `StudioBookingPage.jsx`, `TrainerApplicationPage.jsx`

### Credit 續約提醒（Session 33）
- **學生端**：credit card 剩 3 堂／1 堂各彈一次可關閉嘅提示卡（Firestore flag `renewalPrompt3Shown`/`renewalPrompt1Shown` 控制只彈一次，續約後自動 reset）；剩 2-3 堂期間常駐一行「Renew early to keep your current rate」取代舊有「Running low」字句（教練未設定 rate 時繼續顯示舊字句作 fallback）
- **Payment Sheet**：撳 Renew 彈出 bank details modal，逐行 copy + Copy all，reference 用學生 id 生成，寫明「rate confirmed when payment received while sessions remain」；純資訊性，唔會自動通知教練（教練話銀行自己會通知收款）
- **教練端**：ProfilePage 新增「Renewal Pricing」（current rate／renewed-after-exhausted rate）同「Bank Details」設定；ClientDetailPage Top-Up modal 加 rate 選擇（預設按 remaining>0 揀返現行 rate，用晒先揀加價 rate）
- **新 collection `creditLedger`**：每次 top-up 一條 append-only 記錄（`clientId, trainerId, date, qty, rate, addedBy`），trainer 建立、trainer + 該 client 可讀，唔可以 update/delete
- **`onSessionsLow` Cloud Function 今次無改**：獨立運作，未同呢個 in-app 提示統一文案（留待日後）

### Session Credit 喺 Book 果刻即扣（Session 33）
- Sessions ARE session credit：book session 成功即刻扣 1 堂（新 Cloud Functions `onScheduleBooked` + `onScheduleCreditUpdate`，server-side transaction，唔靠前端寫 `sessionOffset`）
- 24小時前取消退返 credit（每個學生每月上限 2 次免費早取消，用晒就算 24 小時前取消都照收）；24小時內取消照收
- 舊有（呢個 feature 上線前）已 book 但未完成嘅 session 冇 `deductedAtBooking` 標記，Mark Complete／late-cancel 會補扣一次，新舊自然共存唔會走數或者重複扣

### WorkoutLog 最新改善（Session 31）
- **REST TIMER 清理**：移除 ActiveWorkoutView inline RestTimerBar + 移除概覽畫面頂部 REST TIMER block；只保留底部 floating pill
- **Floating pill 改良**：尺寸放大（padding 14×22px，時間字體 1.5rem）；時間數字可點擊輸入自訂分:秒（edit 模式，分:秒雙 input）
- **訓練日誌儲存錯誤**：`catch {}` 靜默吞錯改為 `catch(err)` + toast 顯示實際 error code；guard undefined exerciseId 防止 Firestore 拒寫
- **Client Dashboard**：體重迷你趨勢圖（Sparkline）+ 「今日訓練」CTA（有計劃直接開始 / 無計劃自由訓練）
- **ProfilePage**：Founding Member banner（Free tier trainer 限定）

### Rest Timer + Workout Log + 通知大修（Session 32）
- **Rest Timer 全面修復**：
  - 改用 wall-clock（`endTimeRef` 絕對時間戳）取代 decrement `setInterval`，screen-off / app 背景後自動校正剩餘時間
  - `visibilitychange` / `focus` / `pageshow` 監聽：app 喚醒時若已過期立即播放完成音效
  - 完成音效改用預先生成嘅 WAV（`public/sounds/timer-done.wav`，3聲遞增 beep），透過 `AudioBufferSource` 播放（iOS 最穩定方式）；Web Audio oscillator 保留做 fallback
  - iOS AudioContext keep-alive：每 20 秒播放 1-sample 靜音 buffer，防止背景自動 suspend
  - 計時器 end time 持久化到 `sessionStorage`，確保 process suspend 後都可以恢復
- **Custom Exercise + Wt+Dist Unit Type**：
  - 計劃內 workout 都可以「+ Add Exercise」加入 custom 動作（exercise picker 新增 'Custom' tab，輸入名稱即建立 `custom-{timestamp}` ID）
  - 新增 `weight_distance`（Wt+Dist）unit type：kg + metres，顯示為「40kg × 200m」，`formatSet`/`stringifySet`/`hasValue`/`emptySet` 全部支援
- **Workout Log 可移除 set**：2 個或以上 set 時顯示 × remove 按鈕，最少保留 1 個；移除後 completed-set 索引自動重排
- **Session 扣數 UX 全面改善**：
  - Mark Complete 按鈕喺 `pending` 同 `confirmed` 狀態都顯示（之前只限 confirmed）
  - Recap modal 顯示「X / Y 剩餘 → 完成後 Z 堂」，扣數成功/失敗分開處理並有明確 toast（含 error code）
  - 扣數失敗時唔再 navigate 走，trainer 留喺 schedule page
  - Firestore rules：trainer 即使喺 client 被 remove（`trainerId` 變 `null`）後，仍可以 `+1` increment `sessionOffset`
- **堂數不足 Push 通知**（新 Cloud Function `onSessionsLow`）：client 剩餘堂數首次 ≤ 2 時推送 `⚠️ 堂數不足` 畀 trainer，只觸發一次（避免重複扣數時連環推送）—— Cloud Functions 數量由 6 個增至 **7 個**
- **月度訓練報告**：ClientDetailPage 新增「Monthly Report」modal，整合該月 sessions、workout logs、總訓練量、PRs、體態變化，可選擇附加收費摘要；用瀏覽器 print 對話框輸出 PDF（零依賴），全英文版面
- **iOS / Android Input 防自動放大**：所有觸控斷點（≤1024px）套用 `max(16px, 1rem)` font-size + `text-size-adjust: 100%`
- **Code Review 修復（8 項）**：operator 路由收緊（唔再拎到 client-only routes）、`/log` 限 trainer+client、GlobalSearch 篩選 operator precedence bug、StudioBookingPage 24h cutoff 用實際時段時間、SchedulePage 加 `savingRecap` guard 防 double-submit 重複扣數、firestore.rules 容許 trainer 取消自己 booked 嘅 studio slot
- **gym啦 功能暫時隱藏**：`App.jsx` 新增 `GYMLA_ENABLED = false`，operator routes / `/apply` / `/studios/book` 全部收起，operator 當 client 處理 nav；code 全部保留，設返 `true` 即可重新啟用

---

## 📋 待處理事項

### 🔴 P1 — 必須處理

| # | 任務 | 詳情 |
|---|------|------|
| 1 | **Push 通知實際運作確認** | GitHub Actions → Deploy Functions 確認冇 error；Firebase Console → Functions 確認 7 個 functions 存在（新增 `onSessionsLow`）；確認 VAPID key 吻合；雙方去 Profile → Enable Notifications |
| 2 | **Excel / CSV 客戶匯入** | 教練上傳 Excel → 解析 → 建立 ghost client profiles；提供模板下載；預覽確認後批量建立 |
| 3 | **訓練日誌儲存錯誤確認** | Fix 已部署（commit aa8a90e + Session 32 進一步修復：`completedSets` 持久化、`l.entries` null guard），等待用戶測試回報確認根治 |

### 🟠 P2 — 高優先

| # | 任務 | 詳情 |
|---|------|------|
| 4 | **公開教練 Profile 頁** | 可分享 URL（`/#/coach/{inviteCode}`）；顯示教練名、speciality、匿名化成果；作為獲客工具 |

### 🟡 P3 — 中優先

| # | 任務 | 詳情 |
|---|------|------|
| 5 | **Referral 系統** | 現有 client 分享 referral link 介紹新 client；教練可設 referral 獎勵（如送 1 堂） |
| 6 | **iOS Shortcuts Webhook** | 每位教練生成專屬 webhook URL；iOS Shortcut 自動 POST Apple Health 數據；免 Capacitor 實現部分健康數據同步 |
| 7 | **Google Fit / Health Connect OAuth** | Android 平台；授權後定時同步體重、活動數據至 bodyStats |

### 🟢 低優先（長遠）

| # | 任務 |
|---|------|
| 8 | **獎章 Shareable 卡 Phase 2**（Web Share API） |
| 9 | **進度相片**（Firebase Storage） |
| 10 | **Data Export（CSV / PDF）**（GDPR 合規） |
| 11 | **Stripe 收費整合**（目前 invoice 係 PDF，收錢靠線下） |
| 12 | **Hevy CSV Import**（教練從 Hevy 帶走客戶數據） |
| 13 | **Trainer announcements / broadcast**（群發訊息） |
| 14 | **Group Class 管理**（多 client 同一 session） |
| 15 | **Capacitor 原生化 + App Store 上架**（Apple Watch HealthKit、Sign in with Apple） |
| 16 | **Gym啦 Sprint 2+**（Flow B 學生搵教練 Directory + In-App Booking；曝光追蹤；盲評系統；Sprint 1 已完成，現透過 `GYMLA_ENABLED=false` 暫時隱藏） |

---

## 🔴 重要技術決定

| 決定 | 原因 |
|------|------|
| HashRouter | Firebase Hosting SPA 需要 |
| `workoutLogs` + `messages` 禁止 delete | 保護紀錄完整性；GDPR delete 靠 Cloud Function |
| `workoutLogs` 用 `createdBy` 做 edit 權限 | `trainerId` 係 record-keeping，唔能做權限判斷 |
| `badges` 一旦 award 唔自動撤銷 | 防止數據錯誤誤撤；只有教練人手移除 |
| Mobile nav 4 + More drawer | 底部 tab 上限 5，無法容納全部頁面 |
| 移除 Firebase App Check | reCAPTCHA 喺 iOS Safari 載唔到，令 Google 登入完全失效 |
| authDomain 用 `firebaseapp.com`（非 `.web.app`） | Firebase 自動 register 呢個 domain 嘅 Google OAuth redirect URI |
| Google 登入：手機/PWA 用 redirect、桌面用 popup | iOS PWA 喺 popup 開啟時會 suspend 主進程，popup 完成後 token 遺失 |
| `getRedirectResult` 先 resolve 才設 `authReady` | `onAuthStateChanged` 喺 redirect 返回前 fire `null` → 閃現 Login 頁；加 `redirectChecked` state 解決 |
| MuscleSelector 改為 chip 文字選擇 | SVG body model UX 唔好（細位難 tap）；chip list 更快更清晰 |
| VAPID key hardcode 為 fallback | VAPID Web Push public key 非 secret，可安全 hardcode；`VITE_VAPID_KEY` env var 優先 |
| Session credit 喺 book session 嗰刻即扣（唔再等 Mark Complete） | Sessions ARE session credit；改由 Cloud Function（`onScheduleBooked`/`onScheduleCreditUpdate`，admin SDK，伺服器端 transaction）統一處理扣數/24小時前取消退款(每月上限2次)/舊 booking 補扣，避免前端直接寫 `sessionOffset` 帶嚟嘅安全隱患 |
| Apple Watch 整合需 Capacitor 原生化 | PWA 無法存取 iOS HealthKit；Android Health Connect 只支援原生 app |
| Rest Timer 用 wall-clock（絕對 end time）非 decrement interval | `setInterval` 喺 screen-off / app 背景時會被瀏覽器 throttle 或暫停，wall-clock 喺喚醒後可自我校正 |
| 計時完成音效用預生成 WAV + `AudioBufferSource`，每 20s 播靜音 buffer keep-alive | iOS 會喺無聲約 30s 後自動 suspend AudioContext；`resume()` 喺非手勢 callback 入面唔可靠；靜音 buffer 維持 'running' 狀態 |
| Toast 錯誤訊息顯示 6 秒（成功訊息 3 秒） | 錯誤內容（含 error code）通常較長，需要更多時間閱讀 |
| Firestore rules 容許任何 trainer 對 client doc `sessionOffset` `+1` | client 被 `removeClient`（`trainerId` 設 `null`）後，舊 schedule 仍需可以 Mark Complete 扣數 |
| gym啦 用 `GYMLA_ENABLED` flag 控制顯示，唔刪 code | 功能未到launch時機，但要保留已完成嘅 Sprint 1 開發成果，方便日後一鍵重新啟用 |

---

## 📐 參考資訊

### 導航架構

| 平台 | 主導航（常顯） | More 抽屜 |
|------|------------|---------|
| **Trainer 桌面 sidebar** | Dashboard, Clients, Schedule, Messages | Progress Overview, Workout Plans, Invoices, Analytics, Exercise Library |
| **Trainer 手機底部** | Home, Clients, Plans, Messages | Schedule, Invoices, Analytics, Progress Overview, Exercise Library, Profile |
| **Client 桌面 sidebar** | Dashboard, Workout Log, Progress, Messages | My Plans, Schedule, Exercise Library |
| **Client 手機底部** | Home, Log, Schedule, Messages | My Plans, My Progress, Exercise Library, Profile |

### Exercise Unit Types

| `unit` 值 | 輸入欄位 | 顯示格式 |
|-----------|---------|---------|
| `weight_reps`（預設）| kg + reps | `80kg × 10` |
| `reps_only` | reps only | `× 20` |
| `time` | seconds | `60s` |
| `distance` | metres | `400m` |
| `weight_distance`（Wt+Dist） | kg + metres | `40kg × 200m` |

### Session 堂數欄位說明

| Firestore 欄位 | 意思 | 誰改 |
|---------------|------|------|
| `totalSessions` | 學員購買總堂數（可 Top-Up）| 教練（Set Total / Top-Up） |
| `sessionOffset` | 已用堂數（= 已扣嘅 session credit）| **自動**：Cloud Function `onScheduleBooked` 喺 book session 嗰刻即刻 `+1`（sessions ARE session credit）；`onScheduleCreditUpdate` 處理取消退款/舊 booking 補扣；教練亦可手動覆蓋 |
| remaining | `totalSessions - sessionOffset` | 系統自動計算，唔儲存 |
| `schedule.deductedAtBooking` | 呢條 booking 係咪已經喺 book 嗰刻扣咗 credit（新模式）| 系統自動（Cloud Function 寫入），冇呢個 flag = 舊模式 booking（Mark Complete/24小時內取消先扣） |
| `earlyCancelMonth` / `earlyCancelCount` | 學員本月已用咗幾多次「24小時前免費取消」（上限2次，跨月reset）| 系統自動（`onScheduleCreditUpdate`） |

### CI / Deployment 限制

CI service account（`FIREBASE_SERVICE_ACCOUNT`）權限：
- Firestore rules：`continue-on-error: true`，失敗唔報紅，**需人手在 Firebase Console 確認**
- Cloud Functions：同上，需在 Firebase Console → Functions 確認 7 個 functions 存在

**永久修復方式：** Google Cloud Console → IAM → 找到 CI service account → 加 Cloud Functions Admin + Cloud Run Admin 角色

### Push Notifications 配置

| 項目 | 狀態 | 詳情 |
|------|------|------|
| VAPID Key | ✅ 已配置 | hardcode fallback 於 `NotificationContext.jsx`；`VITE_VAPID_KEY` env var 優先 |
| Cloud Functions | ⚠️ 待確認 | 需在 Firebase Console → Functions 確認 7 個 functions 存在 |
| iOS 支援 | ⚠️ 限制 | 需 PWA 模式（Add to Home Screen）；Safari 16.4+ 才支援 Web Push |
| Android Chrome | ✅ 直接支援 | 無需 PWA 模式 |
| Blaze Plan | ✅ 已啟用 | 用戶確認 |
| 用戶 FCM token | ⚠️ 需手動 | 教練 + 學生須各自去 Profile → Enable Notifications |
