# Marketing 週報 — 2026-08-21

[員工X - Marketing]

## 1. 上週行動交數
- **Landing Page 文案出街**（08-14 訂嘅完成標準）——**✅ 完成**。08-15 全面重寫（英文、六段、定價經核實，源自各競品官網），08-20 再加一步：全部 CTA 改導去 sign-up（唔再開 email）、新教練註冊即時三重通知 Ani（Firestore 記錄＋push＋email）、加咗 `getPlatformStats` + Profile page 嘅 PlatformStatsCard 俾 Ani 自己睇註冊數。已核實呢批 commit（`b7aaf5d`）確實喺 CI deploy 分支 `claude/fitness-app-features-LbxtG` 度，唔係擺喺孤島分支冇出街。呢項第三次上榜先完成。
- **FB 教練群第一篇分享帖**——**❌ 仍未做**。Git log / reports 查唔到任何名單、加群或出帖記錄。**呢項已經連續第四份週報（07-31→08-07→08-14→今次）原封不動**。呢個係零風險、純粹靠 Ani 真人出帖嘅行動，唔受任何技術 gate 阻。

## 2. 數字
- Founding Member：**仍攞唔到實數**——但缺口已經部分解決：08-20 加咗嘅 PlatformStatsCard 令 Ani 自己登入 Profile page 就睇到，唔使再靠員工X 呢邊查 Firebase Admin（本 session 都仲係冇呢個權限）。
- 新註冊 / 邀請碼使用次數：同上，**待 Ani 開 app 睇一次交數**，下次週報先寫得出實數。

## 3. 市場情報
搜尋咗 TrueCoach、PT Distinction、Trainerize 本週定價，數字同上週報告一致（TrueCoach $29.98/5位起、PT Distinction flat pricing 冇 hidden fee），**冇新變動**，唔重複寫。上週提出嘅「無 hidden fee」差異化窗口，Landing Page 出街後已經填咗，本週冇新增情報要寫。

## 4. 下週行動（最多 3 項）
1. **FB 教練群第一篇分享帖**——負責：Ani 真人出帖 / 員工X 出文案。第四次上榜，呢次直接俾具體目標：「香港私人教練交流」類群 + "Personal Trainers Elite" 類教練專屬群，二揀一，唔使再等名單。完成標準：最少一個群出咗一篇真實痛點分享，附邀請碼連結。
2. **Founding Member 實數回報**——負責：Ani。完成標準：登入 Profile page 讀 PlatformStatsCard 數字，交俾下次週報，唔再寫「攞唔到」。
3. **Landing Page 真機驗收**——負責：Ani。完成標準：iPhone 真機打開 `/#/landing`，撳一次 CTA 確認去到 sign-up（唔係死 link），呼應 CLAUDE.md #36（screenshot 唔算驗收）。

---
_內部週報，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
