# 🔴 學生收唔到 password reset email — 調查同修復

> ## ⚠️ 更正（2026-08-23,原報告出咗之後）
>
> **真因唔係下面 §2 講嗰個。**
>
> Ani 之後同嗰個學生確認：**封信有寄出,學生亦都收到咗** —— 只不過**寄件人名唔係「ElitePro」**（Firebase 預設用 project id / `noreply@` 地址),所以學生喺 inbox 掃過都認唔出,以為冇收到。
>
> **即係話**：
> - §2 講嘅 enumeration protection **依然係一個真實嘅缺陷**（app 講咗一句自己證明唔到嘅嘢),但**佢唔係今次呢單嘢嘅成因**
> - 我當時將「Google 註冊冇密碼」列為兩個可能成因之一,**呢個亦都未經證實**,而 Ani 本人（Google 註冊)收得到 reset link 已經同佢有張力
> - 真正嘅成因係**寄件人身份唔可辨認** —— 一個純粹嘅品牌／deliverability 問題,唔喺 code 入面
>
> **原報告以下內容全部保留唔改**,因為佢記錄咗當時查到嘅嘢同點解咁判斷。呢個更正框係要令任何人一打開就知結論改咗,唔使睇到 §8 先發現。修正後嘅行動見文末 §9。



**日期**：2026-08-23
**角色**：員工B（Dev）+ 員工E（QA）
**Commit**：`bc24230`
**分支**：`claude/fitness-app-features-LbxtG`
**嚴重性**：用戶入唔到自己個 account

---

## 0. 一句總結

**唔係死掣,唔係靜靜雞失敗。** 個掣真係 call、真係 await、真係有 try/catch。

**真因**：Firebase 嘅 email enumeration protection 令 `sendPasswordResetEmail()` 對「唔存在嘅地址」**resolve 成功但乜都唔寄**,而我哋照樣顯示「Password reset email sent」—— **個 app 講咗一句自己查證唔到嘅嘢**。

---

## 1. 逐條排除（你提出嘅六個方向）

| # | 方向 | 結果 | 證據 |
|---|---|---|---|
| 1 | 個掣有冇真係 call? | ✅ **有** | `LoginPage.jsx:55`、`ProfilePage.jsx:233` 都入到 `AppContext.sendPasswordReset` → `sendPasswordResetEmail(auth, email)` |
| 2 | 有冇 await + try/catch? | ✅ **兩處都有** | 成功／失敗都有 UI 反饋,錯誤經 `friendlyAuthError` 對映。**唔屬 CLAUDE.md #11 嗰類** |
| 6 | 最後幾時改過? | `b67cf69`（2026-07-24) | 同 filter chips 死機同一個 commit,但入面呢段 reset code 本身係啱嘅 |
| 3 | Console template | ❌ **查唔到** | Agent 冇 Firebase Console 存取權。要 Ani 自己開，見 §6 |
| 4 | 免費額度／寄信限制 | ❌ **查唔到** | 同上。但已加 `auth/quota-exceeded` 專屬處理,撞到會明講 |
| 5 | Spam | ⚠️ **排除唔到,亦唔可以當結論** | 新文案兩個版本都叫用戶睇 spam,但真因喺下面 §2 |

> **重點**：方向 1、2 排除得好乾淨。呢個月已經撞過三個死掣（filter chips、invite code、renewal toast),所以要明講：**呢次唔係第四個**。

---

## 2. 真因：Firebase 靜靜雞成功

Google 官方文件原文（實際 fetch 過核實,唔係靠記憶）：

> **Email enumeration protection** 對 **2023-09-15 或之後建立嘅 project 預設開啟**。
> 開啟後，「**只有當個 email 地址存在先會寄出驗證郵件…兩種情況都冇任何特定錯誤訊息指出郵件冇寄出**」。
> 同時 `fetchSignInMethodsForEmail` **唔會再回傳** sign-in methods。

`elitepro-16718` 肯定係 2023-09-15 之後開嘅 → **保護預設開住**。

### 後果

| 情況 | Firebase 做咗乜 | 舊版 app 顯示 |
|---|---|---|
| 地址有帳號 | 寄出 | 「已寄出」✅ |
| **地址打錯 / 冇帳號** | **乜都唔寄、唔 throw、resolve 成功** | **「已寄出」** ❌ |
| **用 Google 註冊冇密碼** | 同上 | **「已寄出」** ❌ |

學生見到「Password reset email sent to xxx@gmail.com」,然後等一封**從來冇存在過**嘅信。同你報嘅症狀完全對得上。

**呢個亦係一個真缺陷,唔止係診斷**：無論嗰個學生最後真因係咩,個 app 都唔應該講一句佢查證唔到嘅嘢。

---

## 3. 修咗乜

### 3.1 唔再講大話（核心修復）

| 位置 | 新文案 | 點解 |
|---|---|---|
| **登入頁**（用戶自己打 email) | 「**If an account exists for xxx**, a reset link is on its way. It can take a few minutes — check your spam folder. **If nothing arrives, the address may be different from the one you signed up with, or you may have signed up with Google.**」 | 應許唔起就唔應許,同時指出兩個真實成因 |
| **Profile**（自己個帳號) | 照舊明確「Password reset email sent to xxx」 | 呢個地址係登入緊嘅本人,**帳號一定存在**,應許得起 |

呢個分別係刻意嘅：**知得到就講死,唔知就唔好扮知。**

### 3.2 錯誤分得開

| 錯誤 | 訊息 |
|---|---|
| `auth/quota-exceeded`（每日額度爆） | 「Too many reset emails have been sent **today**… try again **tomorrow**」 |
| `auth/too-many-requests`（呢部機太頻密） | 「Too many attempts from this device… wait a **few minutes**」 |
| `auth/invalid-email` | 「That does not look like a valid email address」 |
| `auth/network-request-failed` | 「No connection… **nothing has been sent yet**」 |
| `auth/user-not-found`（保護關咗嘅 project 先會出) | 「No account uses that email address」 |

⚠️ 頭兩個之前**撈埋一齊**（同一句「Too many attempts」）。「等幾分鐘」同「聽日先得」係兩個完全唔同嘅答案。有 test 守住唔准再合併。

### 3.3 補返防重複撳

`ProfilePage` 粒 reset 掣之前**冇 loading state**（違反 #14）。已加 `resettingPassword` 鎖 + `disabled`。

---

## 4. 🔑 查真相嘅工具：`lookupAccountByEmail`

Admin SDK **唔受** enumeration protection 限制。新 owner-only callable,俾一個 email 就答：

| 回傳 | 用嚟答 |
|---|---|
| `exists` | 個地址到底有冇帳號 |
| `providers` | `password` 定 `google.com` |
| **`canResetPassword`** | **佢有冇密碼可以 reset** |
| `createdAt` / `lastSignIn` | 幾時開、幾時最後用 |
| `hasProfile` / `role` | 有冇 Firestore profile |

⚠️ **Owner 限定** —— 公開版本就正正係 Firebase 呢個保護要防嘅 **enumeration oracle**（俾人逐個 email 試出邊個有帳號）。

> **重要 sub-case**：如果嗰個學生係用 **Google 註冊**,佢**根本冇密碼可以 reset**。叫佢撳 reset 由頭到尾都係錯指示,而個 app 亦從來冇提示過佢。呢個係另一個要修嘅嘢,等查完先決定。

⚠️ **UI 未做** —— 要 Ani 先講擺邊（Profile 卡定 Platform Stats 入面）。

---

## 5. 順便查：其他 email 路有冇同樣問題

**冇。**

```
grep sendEmailVerification / verifyBeforeUpdateEmail  →  全 repo 零命中
```

- **Invite** 係 app 入面顯示 code + 連結,**唔經 email**
- **Password reset 係 Firebase Auth 唯一會寄嘅 email**

所以就算 Firebase email 設定真係有事,**壞嘅只有呢一條**,冇隱藏嘅第二條。

---

## 6. 驗證（跟 CLAUDE.md #37 逐條交數）

| # | 項目 | 點驗證 |
|---|---|---|
| 1 | 錯誤處理 | 四種失敗各有訊息;網絡失敗明講未寄出（可安全重試);Profile 加咗 in-flight 鎖 |
| 2 | 唔好寫死 | 所有文案集中喺 `utils/passwordReset.js`,兩頁共用,冇散落字串 |
| 3 | 唔好重複 | `passwordResetError` 只補 reset 專屬 code,其餘 fall through 去現有 `friendlyAuthError` —— **冇第二份 error map** |
| 4 | 可讀性 | `accountKnown` 一個參數講清「知唔知呢個地址真係存在」;檔頭寫低 Google 文件連結 + 8-22 個案 |
| 5 | 邊界 0/1/多 | 已知帳號 / 未知帳號 / 五種 error code / 無法辨識 code / `undefined` 全部有 test |
| 6 | **Test** | **有,109 條（+16)**,含 4 條 guardian |
| 7 | 其他常規 | UI 全英文（#28）✅ owner 檢查喺 server ✅ 冇假設 terminal（#26）✅ |

### Guardian test 實測過會 fail

將舊嗰句 `Password reset email sent to ${forgotEmail}` 塞返落 `LoginPage`：

```
× neither caller claims an email was sent to an unverified address
  Tests  1 failed | 108 passed (109)
```

還原後 **109/109**。四條 guardian 守住：

1. 兩個 caller 都必須 `await sendPasswordReset(` 喺 try/catch 入面
2. 唔准再對未驗證地址講「sent」
3. Profile 掣必須有防重複撳
4. `lookupAccountByEmail` 必須存在**而且**必須 owner-gated

其餘：`npx eslint src/` **0 error**、`npm run build` ✅。

---

## 7. ⚠️ 未完成 —— 交俾 Ani（agent 做唔到）

### 7.1 真機驗收（#36）

登入頁 → **Forgot password** → 打自己 email → 應該見到新文案（「If an account exists…」)。

### 7.2 Firebase Console 兩樣（瀏覽器,手機做得）

| 睇邊度 | 睇乜 |
|---|---|
| **Authentication → Templates → Password reset** | 有冇 enable、sender 地址係咩 |
| **Authentication → Settings → User actions** | **Email enumeration protection** 係咪真係開住 —— 呢個直接印證 §2 個判斷 |

### 7.3 最快查到嗰個學生

**同我講佢個 email**,我用 `lookupAccountByEmail` 查 —— 一次過睇到「地址啱唔啱」同「佢係咪 Google 註冊、根本冇密碼」。

---

## 8. 記低

呢次同今個月頭三個 bug（filter chips、invite code、renewal toast）唔同：

- 嗰三個係**壞咗**
- 呢個係**運作正常,但講咗一句唔真實嘅說話**

第二種更難捉 —— 冇 error、冇 log、build 過、test 過、code review 都睇唔出,因為每一行 code 都係啱嘅。捉到佢嘅唯一方法係**問一句：呢個訊息係咪我證明得到?**

呢個問題值得喺每次寫「成功」訊息嗰陣問一次。

---

## 9. 更正後嘅真因同行動（2026-08-23 補）

### 9.1 真因

**封信寄咗、學生收咗、但認唔出。**

Firebase 預設寄件身份係 `noreply@elitepro-16718.firebaseapp.com`,顯示名係 **project id 而唔係 ElitePro**。一封由陌生寄件人寄嚟、講緊「重設密碼」嘅信,喺 inbox 入面同釣魚信冇分別 —— 學生掃過都唔會撳。

### 9.2 已修（code）

Reset 之後嘅提示,兩個版本都加咗**點樣搵**：

> 「It can take a few minutes. Check your spam folder, and **search for "password reset" — the sender may not say ElitePro**.」

⚠️ **刻意唔寫死實際寄件地址**：寄件人名係 Firebase Console 嘅設定,一改呢句就會過時。講「可能唔係 ElitePro」對兩種情況都啱。

同時新增一條 test 守住呢句唔可以被刪。

### 9.3 ⚠️ 未做 —— 要 Ani 喺 Console 改（agent 做唔到）

呢個先係根治：

| 去邊 | 改乜 |
|---|---|
| **Firebase Console → Authentication → Templates → Password reset** | 撳鉛筆 icon → 改 **sender name** 做 `ElitePro`;順便睇下 subject 有冇寫住 ElitePro |
| （可選,長遠） | 設 **custom sender domain**,由 `noreply@elitepro.app` 寄,deliverability 同信任度都會好啲 —— 要買咗域名同設 DNS 先做得 |

改完寄一封俾自己,確認 inbox 見到嘅係「ElitePro」。

### 9.4 呢次學到嘅

原報告 §8 講「呢個 bug 係運作正常但講咗唔真實嘅嘢」。更正之後,真正嘅教訓再深一層：

**「用戶收唔到」同「用戶搵唔到」係兩件事,而由 code 嗰邊睇落去一模一樣。** 兩者嘅 log、error、test 結果全部相同。分辨得到嘅唯一方法係**問返用戶本人**,而唔係喺 code 度再查落去。

我當時查完 code、查完 Google 文件,得出一個**技術上正確但事實上唔啱**嘅結論,而且寫得幾肯定。下次遇到「用戶話收唔到」呢類報告,第一個動作應該係叫用戶**搵下** —— 唔係即刻拆 code。
