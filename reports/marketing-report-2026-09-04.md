# Marketing 週報 — 2026-09-04

[員工X - Marketing]

## 1. 上週行動交數
- **FB 教練群第一篇分享帖**——**仍然未做**。連續**四次**排入行動清單，repo/報告入面搵唔到任何已出帖嘅記錄。
- **讀返 Platform Stats 實數**——**未有記錄**顯示 Ani 已讀個數並講返俾員工X。但系統面有進展：08-31（`a6b17a8`）修正咗 Founding 計數 bug——Ani 自己 08-20 嗰個 test signup 之前錯佔緊 Founding 第 1 位，而家已剔除、後面編號自動遞補，並加咗 guardian test。下次讀個數應該係準。
- **Landing page 真機驗收**——`LandingPage.jsx` 由 08-20（`b7aaf5d`）之後冇再改過，冇證據顯示已經真機睇過（CLAUDE.md #36）。

## 2. 數字
- Founding Member / 新註冊 / 邀請碼使用次數：**依然攞唔到**——Platform Stats 係 owner-gated（只有 Ani 個 app 帳號睇到），呢個 session 冇 production/Firebase Auth 存取權，亦冇記錄顯示 Ani 已讀過再講返俾員工X。缺口已維持三個星期，唔係「0」。

## 3. 市場情報
1. Trainerize / Everfit / TrueCoach 依然係「低入場費 + 疊加收費」：nutrition +$33–45/月、automation +$24–29/月、payments +$8–9/月，50 客實報價 $134–200/月。對比 PT Distinction（$19.90–89.90 flat），我哋「$0 setup fee + 零抽成」單一定價仍然係差異化賣點，landing page 已寫死呢兩點，方向啱，繼續跟進。
2. 搜尋到幾個標榜「free tier / all-in-one for solo trainer」嘅新競爭者（如 FitFloww、WAGMI FIT），但資料來源係 SEO listicle 網站，可信度低，**未證實**，列為觀察，唔建議即刻反應。
3. Landing page 文案觀察：同行首屏普遍用「reclaim your time / stop chasing payments」呢類痛點式 headline；我哋而家用「Founding Member + 3 個月免費」早鳥優惠做主 CTA，方向唔同——佢哋賣「解決痛點」，我哋賣「限時優惠」。純觀察，唔建議今週改文案。

## 4. 定價觀察
見上面第 3 節第 1 點，數據已包含喺市場情報。**待 CEO 整合、Ani 拍板**：是否要喺 landing page 加一句同 Trainerize/Everfit「隱藏收費」嘅直接對比，強化「零疊加收費」呢個賣點。

## 5. 下週行動（最多 3 項）
1. **FB 教練群第一篇分享帖**——負責：Ani 出帖 / 員工X 出文案。連續四次零進度：4 個候選群同文案框架 08-28 已交（見上一份週報），如果下次週報仍然零進度，建議搬上 CEO 例會討論係咪換方式（例如員工X 先用自己身份做觀察帖探路）。
2. **讀返 Platform Stats 實數**——負責：Ani。計數 bug 已喺 08-31 修好，現在讀到嘅數應該準：落 Profile → Platform Stats 影低講返俾員工X，唔使再寫「攞唔到」。
3. **Landing page 真機驗收**——負責：Ani。iPhone 真機打開 landing page，確認 6 個 section、CTA、Founding Member 文案冇壞版，符合 CLAUDE.md #36。

---
_內部週報，Cantonese working doc — 見 CLAUDE.md「Working Rules」_
