# Marketing 週報 — 2026-09-18

[員工X - Marketing]

> 補充說明（格式/流程，唔係啟示，但要記低）：呢次 trigger 入面嘅指示又再要求寫入 `reports/SA-report-2026-09-18.md`（員工A 檔名系列）、四節純觀察格式（冇上週交數、冇數字）、同「commit 去 main」——同 09-11 嗰份記錄嘅缺口一樣，Routine 設定層面未改（改 prompt 冇用，環境指派，見常規 #41/42）。呢份跟返 CLAUDE.md 訂明嘅 `marketing-report-*.md` 命名同交數格式，commit 落呢個 session 分支 `claude/affectionate-cerf-v0s5xa`，冇開新 branch。另：開工已跑咗常規 #42 嘅孤兒 branch 收割，`claude/magical-wright-yhpibq` 度搵到一份主線冇嘅 `SA-report-2026-09-14.md`，已一併收落呢個分支。

## 1. 上週行動交數
- **FB 教練群第一篇分享帖**——**未做，但封鎖已解除**。2026-09-16 Ani 澄清咗關鍵資訊：人喺**英國**、自己 studio 教、唔識其他教練。原本「香港教練唔用 FB」嘅否決只適用香港，市場搞錯咗，已重寫做 `BACKLOG.md` A1（英國 PT FB group），英文帖文、常見反應模板（問幾錢/問幾多人用緊）全部已經係 copy-paste 就用得嘅成品。呢個星期 Ani 仲未撳 join。
- **讀返 Platform Stats 實數**——**✅ 已完成（2026-09-17）**。Ani 一句直接答咗：教練 1（佢自己）、學生 9（全部英國）、外部教練 0。連續五份週報寫「攞唔到」，其實個數一直存在，缺口係冇人問，唔係冇 production 存取權——已寫入常規 #44，`BACKLOG.md` A2 已剷。
- **Landing page 真機驗收**——**仍未做**。`LandingPage.jsx` 由 07-24 起未再改過，`BACKLOG.md` A3 仍然 🔴，拖咗一個月。

## 2. 數字
- 教練：**1**（Ani 自己）／學生：**9**（全部英國）／外部教練：**0**——2026-09-17 Ani 直接答，唔使再等 production 存取權。
- Founding Member：**0**（同上，外部教練 0 = Founding Member 0）。
- 新註冊數、邀請碼使用次數：**仍未問到**。呢兩個唔屬於「等 Ani 做」嘅待辦（`BACKLOG.md` A2a 已標明係 agent 要開口問嘅嘢，唔係擺俾 Ani 嘅動作項）——喺呢度直接問：**Ani，新註冊數同邀請碼用咗幾多次，方唔方便順口講一句？** 如果連呢兩個都係「你自己都唔記得」，先算真缺口，交返技術面跟進讀數渠道。

## 3. 市場情報
1. **PT Distinction**：本週搜尋確認佢哋而家喺**全部方案**（唔止高階 tier）內建 AI Program Builder、AI Meal Planner、AI Marketing Assistant，唔當加購項——同 Trainerize 用 $45/月賣 AI meal planning 做對比，PT Distinction 用「AI 全包唔加價」做賣點。**啟示**：ElitePro 而家 0 個外部教練，未到追 AI 功能嘅階段，但差異化窗口要記住——「AI 全包」呢條路 PT Distinction 已經行緊，日後諗差異化唔好諗去呢個方向撞。
2. **新搵到 TeamUp**（UK 場館/教練管理常見選項）：計費模式係「active customer」（有活躍動作嘅客先計錢），唔係 flat tier；同樣主打「無 setup fee、無合約」。**啟示**：同 ElitePro「$0 setup fee + 零抽成」文案方向一致，但計費邏輯唔同（per-active-user vs 零抽成）——喺呢個新對手面前，ElitePro 「零抽成」呢句仍然係佢冇講嘅嘢，差異化未收窄，唔使改文案。
3. FitFloww / WAGMI FIT「solo trainer 永久免費層」——同上次一樣，來源仍然係 SEO listicle（部分嚟自佢自己網域），未證實，繼續觀察，唔建議反應。

**定價觀察**（待 CEO 整合、Ani 拍板）：市場出現「AI 全包免加價」（PT Distinction）同「per-active-customer」（TeamUp）兩種新定價敘事，同上次報告嘅「flat 包晒 vs 平但冇自家 app」兩分法唔完全重疊。純數據，唔建議本週改 landing page 文案。

## 4. 下週行動（最多 3 項）
1. **FB group A1**——負責：Ani。第一步：今晚 FB 搜尋 `personal trainer UK` → Groups tab → 揀 2-3 個成員 3,000–30,000、近日有post、冇明文禁 self-promotion → 撳 Join。完成標準：今晚撳咗 join（唔係「搵到」）；兩星期內最少一個 group 發咗帖（文案已喺 `BACKLOG.md` A1）。
2. **Landing page 真機驗收 A3**——負責：Ani。第一步：iPhone 開 `https://elitepro-16718.web.app/#/landing`，撳一次 CTA 確認去到 sign-up。完成標準：六個 section 冇壞版 + CTA 撳得通，符合常規 #36。
3. **新註冊數／邀請碼使用次數**——負責：Ani（一句答就得）。完成標準：下次週報唔使再寫「未問到」。

---
_內部週報，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
