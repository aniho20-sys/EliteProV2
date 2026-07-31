# Code Health Audit — 2026-07-28

**角色**：員工C（Reviewer）+ 員工A（SA）
**範圍**：`src/`、`functions/`、`CLAUDE.md`/`STYLE.md`/`ROADMAP.md`/`PROGRESS.md`
**方法**：全repo grep + 手動追蹤每個call site嘅實際行為（唔止數「幾多個」，仲驗證咗有冇行為差異）；file-level同export-level嘅死code用static+dynamic import掃描驗證，唔係靠眼睇
**唔准改code** — 呢份純粹係報告，每項等你批先動工

---

## 1. 重複邏輯（最高優先）

### 1.1 Session remaining「危險閾值」殘留一個獨立實現
- **邊度**：`src/pages/TrainerDashboard.jsx:267`
- **實現數量**：STYLE.md §8.1 嗰次consolidation已經將5個「顏色」實現統一晒去 `sessionUtils.js` 嘅 `getSessionColor()`（`SESSION_DANGER_THRESHOLD=2`）。但呢一處唔係做顏色，係做「trigger續約提示卡」嘅門檻判斷，用緊寫死嘅 `remaining <= 2`，冇 import `SESSION_DANGER_THRESHOLD`。
- **行為差異**：**暫時冇**——兩者數值啱啱好都係2。但呢個係「靠橋啱」，唔係「保證啱」：如果第日改`SESSION_DANGER_THRESHOLD`（例如改做3），呢處會靜靜雞唔跟住變，續約提示卡同「Low」顏色標籤會對唔上。
- **風險**：低（今日冇bug，純粹drift風險）
- **建議動作**：`import { SESSION_DANGER_THRESHOLD } from '../utils/sessionUtils'`，將 `<= 2` 改做 `<= SESSION_DANGER_THRESHOLD`
- **工作量**：5分鐘

### 1.2 金額/貨幣顯示 —— 3個獨立實現，行為唔一致
- **實現1**：`src/utils/invoicePdf.js`（3處）+ `src/pages/InvoicePage.jsx`（4處）——`${currency} ${amount.toFixed(2)}`，恆定2位小數，冇千分位
- **實現2**：`src/pages/BusinessAnalyticsPage.jsx`（4處）——`${currency} ${amount.toLocaleString()}`，有千分位但小數位數睇個amount本身（例如1925顯示「1,925」冇`.00`）
- **實現3**：`src/components/PaymentSheetModal.jsx`（2處）——直接寫死 `£{rate}`，完全冇讀`invoice.currency`或者任何貨幣欄位，亦冇小數格式化
- **行為差異**：**確實不一致，實現3仲係疑似bug**——如果教練用嘅唔係GBP（`InvoicePage.jsx`嘅`CURRENCIES`陣列支援HKD/USD/GBP/EUR/SGD/AUD），續約付款表仍然會顯示錯誤嘅「£」符號。目前現存嘅sample data見到Ani自己用緊GBP,所以未爆出嚟,但呢個設計本身就係錯嘅。
- **風險**：中——對非GBP教練係實質顯示錯誤；對所有教練嚟講，Invoice頁同Analytics頁「同一件事」睇落唔一致
- **建議動作**：起一個 `formatMoney(amount, currency)` util（放`invoiceUtils.js`或者新開`moneyUtils.js`），統一小數位/千分位規則；`PaymentSheetModal.jsx`要先解決一個schema問題——`renewalRate`/`renewalRateNext`而家冇儲貨幣，需要你確認：續約價錢係咪應該跟返個教練最近一張invoice嘅currency，定係要喺Profile度加返一個「預設貨幣」欄位
- **工作量**：1.5-2小時（包含schema決策，需要你先拍板先可以落code）

### 1.3 本地日期字串formatter —— dateUtils.js 內部版本冇export，3處各自重寫
- **邊度**：
  - `src/utils/dateUtils.js`（`fmtDate`，內部函數，**冇export**）——完整 `YYYY-MM-DD`
  - `src/pages/ProgressPage.jsx:20`——原樣重寫多一次完整 `YYYY-MM-DD` 版本
  - `src/components/MonthlyReportModal.jsx:11` 同 `src/pages/BusinessAnalyticsPage.jsx:21`——各自重寫 `YYYY-MM`（月份）版本
- **行為差異**：暫時冇——3個重寫版本邏輯同`fmtDate`一致，都係正確用local時間嘅getter，冇UTC bug
- **風險**：低（純DRY問題，未見行為錯）
- **建議動作**：`dateUtils.js`加`export`俾`fmtDate`（或者加返一個`formatMonth`變種），3個call site改用返呢個共用function
- **工作量**：20分鐘

### 1.4 `badgeUtils.js` 撞正CLAUDE.md自己寫低嘅UTC日期反面教材
- **邊度**：`src/context/badgeUtils.js:10`
- **實際code**：`const awardedAt = new Date().toISOString().split('T')[0];`
- **行為差異**：**呢個係真bug**，唔止係debt——CLAUDE.md convention #18原文明講「DO NOT use new Date().toISOString().split('T')[0] — 呢個會攞UTC日期，喺UTC以東嘅時區（例如HKT）唔啱」。`localToday()`就係為解決呢個問題而建，但`badgeUtils.js`冇用。目前呢個bug嘅影響被2.1（下面）遮住咗——因為冇任何UI顯示badges，所以個錯日期冇人見到。但如果2.1嗰個功能第日補返UI，呢個日期會即刻錯。
- **風險**：低（暫時無人睇到），但屬於「明知故犯個已寫低嘅規則」，零成本修
- **建議動作**：`new Date().toISOString().split('T')[0]` 改做 `localToday()`（要`import`）
- **工作量**：2分鐘

### 1.5 `isTrainer` 判斷喺12個檔案各自宣告，未考慮 `operator` 呢個第三角色
- **邊度**：`NotificationCenter.jsx`、`GlobalSearch.jsx`、`NotesSection.jsx`、`ExerciseDetailModal.jsx`、`App.jsx`、`ExerciseLibraryPage.jsx`、`ProfilePage.jsx`、`SchedulePage.jsx`、`WorkoutLogPage.jsx`、`MessagesPage.jsx`、`WorkoutPlansPage.jsx` 等（`const isTrainer = currentUser.role === 'trainer'` 或加`?.`）
- **行為差異**：**目前冇**——`RoleSelectPage.jsx`根本冇俾用戶揀`operator`呢個選項，所以現實入面冇任何真實帳戶嘅`role`會係`'operator'`（要人手改Firestore先得到）。但一旦`GYMLA_ENABLED`第日打開，凡係用`{isTrainer ? <TrainerView/> : <ClientView/>}`呢種二元判斷嘅頁面，會將operator當做client嚟render，因為`isTrainer`對operator嚟講都係`false`
- **風險**：今日=無風險（純理論）；`GYMLA_ENABLED`打開嗰刻=中高風險（UI錯配）
- **建議動作**：**唔建議而家改**——12個檔案逐個改而家冇實際得益，仲會加無謂改動。建議記錄做「打開GYMLA_ENABLED前必查清單」嘅一項，去到嗰日先做一次針對性audit
- **工作量**：而家=0（淨係記錄）；打開flag嗰陣=需要重新evaluate，估計2-3小時

### 1.6 已核實：Session顏色（5合1）同活躍度/inactive判斷（log-only vs getLastActivity）——**已喺之前Session修好，冇殘留**
- 你提到「已知5個版本」「已知有log-only同getLastActivity兩套並存」——查證確認呢兩樣**已經喺之前嘅Session度修晒**：
  - `getSessionColor()`而家係4個頁面（`SchedulePage`/`ClientDashboard`/`ClientDetailPage`/`ClientProgressOverviewPage`）嘅唯一顏色來源
  - `getLastActivity()`/`getClientActivityDates()`而家係3個頁面（`ClientDashboard`/`TrainerDashboard`/`ClientProgressOverviewPage`）嘅唯一活躍度來源，冇搵到殘留嘅log-only版本
- 呢兩項**唔需要再做嘢**，喺度純粹係俾你知道呢個audit有認真查證過，唔係跳過

---

## 2. 死Code

### 2.1 Badges/Milestones功能——寫入路徑齊全，但UI永遠冇顯示過
- **邊度**：`src/context/badgeUtils.js`（全檔）、`AppContext.jsx`嘅`checkAndAwardBadges`、`users/{uid}.badges`欄位、`WorkoutLogPage.jsx:210`嘅call site
- **證據鏈**：`WorkoutLogPage.jsx`每次save workout都call `checkAndAwardBadges()` → 寫入真實Firestore data（`users/{clientId}.badges`）→ 結果放入 `completedData.newBadges` → 傳落去 `WorkoutCompleteScreen.jsx` → **但呢個component淨係render `data.newPRs`，`newBadges`呢個prop接咗但從未render過**
- **定性**：**疑似但要確認**——唔係「完全冇被reference嘅死code」（佢實際執行緊、實際寫緊Firestore），係「半成品功能」：學員今日已經默默儲緊「🏆 Century Club」呢類里程碑，但佢哋（同教練）睇唔到。淨係`BADGE_MILESTONES`呢個named export真正冇被reference（`getNewBadges`有被用）
- **風險**：低（唔會crash，純粹浪費寫入同認知負擔）
- **建議動作**：兩選一，要你決定——(a) 補返UI（`WorkoutCompleteScreen`加個badge彈出動畫/list，可能仲要喺`ClientDetailPage`/Profile度顯示歷史badges），或者 (b) 徹底移除（`badgeUtils.js`、`checkAndAwardBadges`、`WorkoutLogPage`嗰個call、`newBadges`嘅prop傳遞、Firestore入面已經寫低嘅`badges`歷史data點處理要諗清楚——按CLAUDE.md常規#27,唔准batch rewrite/delete歷史數據,所以就算揀(b)都應該淨係stop寫新嘅,舊data留低唔理)
- **工作量**：補UI ≈ 2-4小時；移除 ≈ 30分鐘（且要決定歷史data點處理）

### 2.2 `/apply` 路由冇跟返`GYMLA_ENABLED`個gate
- **邊度**：`src/App.jsx:106`
- **實際code**：`{(isTrainer || isOperator) && <Route path="/apply" element={<TrainerApplicationPage />} />}`
- **對比**：其餘3個gym啦路由（`/operator/studios`、`/studios/book`）都清楚淨係用`isOperator`（本身已經`GYMLA_ENABLED && role==='operator'`）嚟gate；呢一條就用埋`isTrainer`，完全繞過`GYMLA_ENABLED`
- **定性**：**確定安全刪**（改做同其餘3條一致嘅gate方式）——`Navigation.jsx:36`嘅comment都寫明「gym啦 hidden — remove '/apply' ... from nav」，證明呢個係刻意隱藏但漏咗連route都一齊gate。冇nav link指向呢度，`operator`角色現實中又選唔到（見1.5），所以風險純粹係「識打URL嘅人可以见到個表單」，冇任何教練工作流程依賴住呢條路由開放
- **風險**：低（但係全app裡面gym啦 gating 邏輯**唯一唔一致**嘅位）
- **建議動作**：改做 `{isOperator && <Route path="/apply" .../>}`（同其餘3條一致），或者如果`/apply`本身係想俾trainer都申請開自己studio，就要喺comment度講清楚呢個係刻意例外，唔係漏咗
- **工作量**：5分鐘

### 2.3 死掣（有UI冇功能）——**掃描咗，冇搵到**
- 掃描咗：`onClick={() => {}}`、`onClick` call console.log-only、`alert()`、TODO/FIXME/coming-soon/not-implemented字眼、恆定`disabled`嘅掣——全部**零匹配**
- 呢個係confirm咗嘅negative result，唔係「冇仔細查」

### 2.4 完全冇被import嘅檔案——**掃描咗，冇搵到**
- 用static import（`from '...'`）+ dynamic import（`import('...')`）雙重regex掃描全部`src/**/*.{js,jsx}`，每一個檔案都至少喺另一個地方被reference（大部分page都係經`App.jsx`嘅`lazy(() => import(...))`）
- 冇發現任何完全孤立嘅檔案

### 2.5 完全冇被使用嘅export——只有`BADGE_MILESTONES`
- 見2.1，呢個同badges功能綁埋一齊處理

---

## 3. 過期文檔

### 3.1 ROADMAP.md Phase 3狀態講「未有code」——而家已經錯
- **位置**：`ROADMAP.md:43-44`
- **原文**：「No GoCardless integration or subscription code exists in the repository yet.」
- **實況**：Step 1（schema+rules）同Step 2（OAuth backend）已經寫咗、測試咗、**啱啱（今日）confirm咗deploy成功**——4個新Cloud Function（`gcOAuthStart`/`gcOAuthCallback`/`gcDisconnect`/`cleanupExpiredGcNonces`）已經live
- **風險**：中——CLAUDE.md自己講明「ROADMAP.md 係development phases嘅source of truth」，呢句過期描述會誤導任何之後打開嚟睇嘅人（包括第日嘅AI session）以為Phase 3仲未動工
- **建議動作**：更新做「Step 1-2已完成並部署，Step 3（訂閱管理UI/mandate創建）未開始」
- **工作量**：10分鐘

### 3.2 CLAUDE.md「9 functions」——而家係13個
- **位置**：`CLAUDE.md` 第104行（file tree comment）、第138行提及
- **實況**：`functions/index.js` grep確認實際有13個`exports.`——原本9個 + `gcOAuthStart`/`gcOAuthCallback`/`gcDisconnect`/`cleanupExpiredGcNonces`
- **風險**：中——CLAUDE.md係俾未來AI/開發者睇嘅第一手參考，數字錯+漏咗個public HTTP endpoint（`gcOAuthCallback`）冇被列出，容易令人漏咗個安全考量點（呢個係全app**唯一**一個公開、冇Firebase Auth context嘅HTTP endpoint）
- **建議動作**：更新file tree comment列晒13個function名
- **工作量**：15分鐘

### 3.3 CLAUDE.md Firestore Data Model漏咗3個而家live緊嘅collection
- **位置**：CLAUDE.md「Firestore Data Model」/「Firestore Security Rules Summary」兩個section
- **實況**：`subscriptions`、`gcConnections`、`gcOAuthNonces`三個collection已經有真實嘅`firestore.rules`（confirm咗`match /subscriptions/{subId}`、`match /gcConnections/{trainerId}`、`match /gcOAuthNonces/{nonce}`都存在），亦有對應嘅rules-test，但完全冇喺CLAUDE.md嘅schema文檔出現過
- **風險**：中高——呢個係最實質嘅文檔缺口：第日有人（人類或AI）要再改Firestore rules或者接手Phase 3，冇文檔會唔知呢3個collection嘅shape、由邊個function寫/讀
- **建議動作**：參考`reports/phase3-subscription-design.md`同`firestore-tests/subscriptions.rules.test.js`，將3個collection嘅schema同權限規則寫入CLAUDE.md
- **工作量**：30-45分鐘

### 3.4 CLAUDE.md「Available context functions」漏咗4個新function
- **位置**：CLAUDE.md「State Management (AppContext)」section
- **實況**：`getGcConnection`、`startGcConnect`、`disconnectGc`、`checkAndAwardBadges`全部已經係`AppContext.jsx`真實export緊嘅function，但成個「Available context functions」list冇提過
- **風險**：低中
- **建議動作**：加返4行落個list（`checkAndAwardBadges`視乎2.1點處理，可能連埋刪）
- **工作量**：10分鐘

### 3.5 CLAUDE.md file tree/Tech Stack漏咗3個檔案+1個dependency
- **位置**：CLAUDE.md「Project Structure」`utils/`部分、「Tech Stack」section
- **實況**：`invoicePdf.js`、`workoutShareUtils.js`、`badgeUtils.js`三個真實存在且被使用嘅檔案冇出現喺file tree；`pdf-lib`呢個新dependency冇出現喺Tech Stack
- **風險**：低
- **建議動作**：補返file tree同Tech Stack兩行
- **工作量**：10分鐘

---

## 建議即做 Top 5（出錯風險 × 工作量排序，唔係按絕對風險）

呢5項揀嘅原則：**平、快，但避免咗實質誤導或者靜默drift**——大工程（貨幣統一、badges去留、operator全面audit）刻意冇入呢個list，因為需要你先拍板方向，唔係純技術決定。

| # | 項目 | 對應章節 | 工作量 | 唔做嘅代價 |
|---|------|---------|--------|-----------|
| 1 | `badgeUtils.js` 改用 `localToday()` | 1.4 | 2分鐘 | 已知UTC bug，一旦badges UI補返就會即刻錯 |
| 2 | ROADMAP.md Phase 3狀態更新做「Step 1-2已部署」 | 3.1 | 10分鐘 | 「source of truth」文檔講大話，誤導未來任何人（包括AI）嘅判斷 |
| 3 | CLAUDE.md：9→13 functions + 補返 subscriptions/gcConnections/gcOAuthNonces schema | 3.2+3.3 | 45分鐘 | 未來改rules/接手Phase 3嘅人完全唔知呢3個collection存在，亦唔知有個public HTTP endpoint |
| 4 | `TrainerDashboard.jsx` 用返 `SESSION_DANGER_THRESHOLD` 常數 | 1.1 | 5分鐘 | 之前3個Session先啱啱做完嘅「單一顏色來源」consolidation，留低一個漏網之魚會令個工作唔完整 |
| 5 | `/apply` 路由gate改做同其餘3條gym啦路由一致 | 2.2 | 5分鐘 | 全app gym啦 gating邏輯裡面唯一唔一致嘅位，收窄咗會令個flag更加名副其實 |

**冇入Top 5但值得你決定方向嘅3件事**（唔係唔重要，係做之前要你揀路）：
- **貨幣格式統一**（1.2）——`PaymentSheetModal.jsx`寫死「£」係真bug，但點修要睇你點答「續約價錢跟邊個貨幣」呢條schema問題
- **Badges功能去留**（2.1）——補UI定刪code，純product決定
- **`isTrainer`/`operator`三態判斷**（1.5）——而家唔使郁，但建議記落PROGRESS.md做「打開GYMLA_ENABLED前必查清單」，唔好等到開關嗰日先發現
