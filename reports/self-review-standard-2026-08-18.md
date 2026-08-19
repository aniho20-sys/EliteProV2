# 自審標準寫入 CLAUDE.md #37 + 常規重疊審查

**日期**：2026-08-18
**角色**：員工B（Dev）
**Commit**：`eea1bb1`
**分支**：`claude/fitness-app-features-LbxtG`

---

## 0. 摘要

| 項目 | 結果 |
|---|---|
| 七條自審標準 | ✅ 寫入做 **CLAUDE.md #37**（一條 convention、七個子項） |
| CLAUDE.md 常規總數 | **37 條**（`grep` 出 39 係連埋 Authentication Flow 嗰個 1–4 清單，嗰啲唔係 convention） |
| 矛盾 | **零條真矛盾** |
| 重疊 | 7 組，全部係「舊條文＝具體做法 / 新條文＝總則」嘅關係 |
| 需要標明嘅張力 | **1 個**（第 6 條 × #36） |
| 需要標明嘅表面矛盾 | **1 個**（第 2 條 × `src/firebase.js`），已喺 #37 內文寫死係故意例外 |

---

## 1. Landing page 上線確認

換域名之前嘅正式網址：

```
https://elitepro-16718.web.app/
```

未登入直接見到 landing page（`07a2b97` 嘅 routing 改動）。逐條 curl 過：

| 路徑 | HTTP |
|---|---|
| `/` | **200** |
| `/screens/dashboard.png` | **200** |
| `/screens/sessions.png` | **200** |
| `/screens/plan.png` | **200** |
| `/og-image.png` | **200** |

⚠️ 見到舊版就 hard refresh 或者用 Private 視窗 —— PWA service worker 會 cache。

---

## 2. 寫入內容

七條原文照收，每條下面補咗**對應嘅現有 convention 編號**，等下一個 agent 唔使自己估「唔好寫死」具體指乜：

| # | 標題 | 補充咗嘅指向 |
|---|---|---|
| 1 | Error cases handled | #11（await + try/catch + 使用者見到失敗）、#14（防重複提交） |
| 2 | Nothing hardcoded that should not be | #8（顏色用 CSS 變數）、#31（金額用 `formatCurrency`）、#29（secret call-time 讀） |
| 3 | No duplicated logic | `ProgressView` #20、`ExerciseProgress` #21、`workoutUtils` #24、`activityUtils`、`sessionUtils`、`dateUtils` |
| 4 | A newcomer can read it | 例子用咗 `daysSinceLog`（實際包含 session 嘅值卻叫 Log） |
| 5 | Boundaries: zero, one, many | 「零」嗰個 case 要有真 `EmptyState` + action（#12） |
| 6 | Tests exist, or the reason stated | 守門員 test 必須實測過會 fail（`bookSession.test.js`、`renewalPrompt.test.js` 個做法） |
| 7 | No other convention violated | #26 冇 terminal、#27 唔改寫歷史、#28 UI 全英文、#29 配置唔阻部署 |

### 另外加咗兩段（你冇明講，但唔補會出事）

**「Reporting rule」** —— 交嘅時候要講**點驗證**：跑咗咩指令、試咗咩 case、查咗邊個檔案。你原話係「唔可以只答『過』」，我寫死埋「一堆冇證據嘅剔都唔算」。

**「Where this stops」** —— 見第 4 節。

---

## 3. 重疊審查（7 組，全部相容）

| 新七條 | 重疊嘅現有 convention | 關係 |
|---|---|---|
| 1 錯誤處理 | #11、#14 | 舊嗰兩條係具體手法；新第 1 條係總則，再加空白輸入／格式錯／離線 |
| 2 唔好寫死 | #8、#29、#31 | 三條都係第 2 條嘅實例 |
| 3 唔好重複 | #20、#21、#23、#24 | 同上。#37 內文補咗一句：**log-only 活躍度個 bug 就係「一條規則兩份實現」嘅後果，而且出現咗兩次** |
| 4 可讀性 | 冇 | 全新，唔重疊任何一條 |
| 5 邊界 0/1/多 | #12 | #12 係「零」呢個 case 嘅 UI 要求；互補，唔重複 |
| 6 要有 test | #32、#33（guardian test）、#36 | 見第 4 節 ⚠️ |
| 7 唔准違反其他常規 | #26、#27、#28、#29 | 純指針，本身唔新增要求 |

---

## 4. ⚠️ 一個張力：第 6 條 × #36

**#36 明文**：唔准淨係憑 build 過、screenshot、或者純函式 unit test 就寫「已驗證」。

**所以第 6 條唔可以讀成「有 test = 搞掂」。**

同時你寫「任何一項唔過就唔准交」。照字面執行會出現一個死結：

> 第 5 條（邊界試過未）同第 6 條（有 test）對 UI 改動嚟講，最終要 #36 嗰下真機撳先算數 —— 而 **agent 撳唔到你部電話**。即係任何 UI 改動都永遠交唔到。

**處理方法**（已寫入 #37 尾段 "Where this stops"）：

- 自審負責關晒**所有喺 agent 呢邊查得到**嘅嘢
- 真機嗰步**明確列做未完成項交俾 Ani**，唔准靜靜雞當佢過咗
- 兩者係疊加，唔係二選一

呢個就係我平時講「呢個係推理，唔係實測」嘅原則，而家由習慣升格做規則。

---

## 5. ⚠️ 一個表面矛盾：第 2 條 × `src/firebase.js`

第 2 條寫「唔好寫死 key」，但 `src/firebase.js` **故意**寫死 Firebase config。

佢係 **public client-side key**，寫死係正確做法（CLAUDE.md 開頭本身已經註明）。

**風險**：第一個認真跟第 2 條嘅 agent 會去「修」佢，然後整爛 Firebase 初始化。

**已處理**：#37 第 2 項內文加咗
> *Known deliberate exception: the Firebase config in `src/firebase.js` is a public client-side key and stays literal — do not "fix" it.*

---

## 6. 驗證（依 #37 自己嘅 Reporting rule 交數）

呢次改動只動咗 `CLAUDE.md`（純文件），所以逐條交代：

| # | 項目 | 點驗證 |
|---|---|---|
| 1 | 錯誤處理 | N/A —— 冇 code 改動，冇執行路徑 |
| 2 | 唔好寫死 | N/A（文件）；反而係喺文件度**記錄**咗 `src/firebase.js` 呢個故意例外 |
| 3 | 唔好重複 | 逐條對照過現有 36 條，見第 3 節；冇新增重複規則，只加指向 |
| 4 | 可讀性 | 七項各自一句標題 + 一句理由，唔使揭第二個檔案 |
| 5 | 邊界 | N/A（文件） |
| 6 | Test | **唔需要，理由**：純文件，冇可執行邏輯。跑咗 `npm test` 確認 **93/93** 冇被影響 |
| 7 | 其他常規 | `grep -c "^[0-9]\+\. \*\*"` = 39（37 條 convention + Auth Flow 個 1–4 清單）；#37 內文冇同任何一條抵觸，兩處潛在衝突已於第 4、5 節明列 |

**未完成項（交俾 Ani）**：無。呢次冇 UI 改動，所以冇真機待驗項目。

---

## 7. 生效範圍

由 `eea1bb1` 起，每次交 code 都會**逐條講點驗證**，唔使 Ani 每次提。
