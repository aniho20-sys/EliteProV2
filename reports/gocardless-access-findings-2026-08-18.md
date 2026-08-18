# GoCardless 存取查證：sandbox 註冊、partner 批核、fallback 方案

**日期**：2026-08-18
**角色**：員工B（Dev）
**觸發**：Ani 卡喺 GoCardless sandbox 註冊（撞到收費頁面），已拖兩週。改為先查證，唔再排「等 Ani 再試一次」
**狀態**：查證完成，**未有任何 code 改動**

> **一句總結**：Ani 嘅 blocker 唔係 partner 批核，係**入錯註冊網址**。Sandbox OAuth 完全自助、免費、即刻用得，唔使等任何人批。

---

## 0. 三條問題嘅答案

| # | 問題 | 答案 |
|---|---|---|
| 1 | Partner/OAuth 要唔要批核先用得？ | **Sandbox 唔使**（自助即開）。**Live 要**（compliance + self-assessment review）。批核時間 GoCardless 冇公佈 |
| 2 | Sandbox 註冊有冇收費？ | **冇**。撞到收費頁面係因為行咗主站 `gocardless.com` 嘅**真實商戶**註冊。Sandbox 係另一個 host |
| 3 | 有冇 fallback？ | **有，而且 token 嗰條線一行都唔使改**。但有兩個限制，見 §3.2 |

---

## 1. Partner / OAuth 批核

### 1.1 Sandbox：自助，零批核

喺 sandbox dashboard 自己開 partner app：

```
https://manage-sandbox.gocardless.com/developers/partners/apps/create
```

要填：

- **App name**
- **Description**
- **Homepage URL**（用戶了解你產品嘅網址）
- **至少一條 Redirect URL** —— 必須同 OAuth 請求嘅 `redirect_uri` 參數**逐字一樣**（最多可加 20 條）

開完之後喺 `https://manage-sandbox.gocardless.com/developers/partners` 見到個 app，入面就有 **Client ID** 同 **Client Secret**。

GoCardless partner 文件**冇提及 sandbox app 需要任何批核步驟**。

### 1.2 Live：有閘門

Partner 文件列明上線三步：

1. 開一個 **live app**（同 sandbox app 係兩個獨立 app，credentials 唔通用）
2. **Compliance checks**
3. **Self-assessment review**

同時 OAuth host 要由 `connect-sandbox.gocardless.com` 換去 `connect.gocardless.com`。

### 1.3 ⚠️ 查唔到嘅嘢

**批核需時幾耐，GoCardless 冇公佈任何官方數字。** 網上二手來源講法唔一，我唔會作一個數字寫落報告。

要準確答案，唯一辦法係開咗 sandbox partner app 之後直接問 GoCardless support。呢個唔阻住開發 —— 見 §1.4。

### 1.4 最重要嘅一點：批核係「上線」閘門，唔係「開發」閘門

Ani 原本嘅擔心（「係咪要批咗先用得」）**位置擺錯咗**。

Phase 3 Step 3（訂閱管理 UI + mandate 創建）全部可以喺 sandbox 起同測，**一格批核都唔使等**。批核只係喺真金白銀收錢嗰日先成為條件。

---

## 2. Sandbox 註冊：行錯咗入口

### 2.1 點解會撞到收費頁面

由 `gocardless.com` 主站撳 **Sign up**，行嘅係**真實商戶註冊** —— 會問公司資料、要揀 plan、有價錢。

**Sandbox 喺完全另一個 host。**

### 2.2 正確網址

```
https://manage-sandbox.gocardless.com/signup
```

（`/sign-up` 一樣得。兩條我都實際請求過，都返 **200**。）

### 2.3 預期流程

| 步 | 做乜 | 應該見到 |
|---|---|---|
| 1 | 打 email + 密碼 → 註冊 | 叫你去 email 收信 |
| 2 | 撳 email 入面條驗證連結 | 驗證成功 |
| 3 | 入到 sandbox dashboard | **冇 plan、冇信用卡、冇價錢** |

### 2.4 三樣要記住

- **日後登入去 `manage-sandbox.gocardless.com`**，唔好用主站 login（嗰度係 live 環境）
- **Sandbox 資料刪唔到、reset 唔到** —— 佢運作方式同 live 一樣。想由頭嚟過就要開一個新 sandbox 帳戶。測試完記得取消所有 mandate，否則會繼續收到 sandbox 通知 email
- Sandbox **預設開晒所有功能**（live 帳戶反而會按 plan 同 add-on 有限制）

### 2.5 測試銀行戶口

| 欄位 | 值 |
|---|---|
| Sort code | `20-00-00` |
| Account number | `55779911` |

---

## 3. Fallback：單一 access token 模式

### 3.1 好消息：token 嗰條線零改動

查咗 `functions/gcSecrets.js:83`：

```js
async function readGcAccessToken(trainerId) {
  const name = `projects/${projectId()}/secrets/gc-token-${trainerId}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload.data.toString('utf8');   // 純字串
}
```

**佢完全唔理個 token 由邊度嚟。** OAuth 嘅唯一職責就係去**寫**呢個 secret（`gcOAuthCallback` → `writeGcAccessToken`）。

所以單一 access token 模式：

| 步 | 做乜 | 喺邊做 |
|---|---|---|
| 1 | Developers → Create → **Access token**，改個名、揀 scope | Sandbox dashboard（瀏覽器） |
| 2 | **即刻 copy** —— GoCardless 唔會再顯示第二次 | — |
| 3 | Create secret，名 `gc-token-<Ani 嘅 Firebase UID>`，貼個 token | GCP Console → Secret Manager（瀏覽器，手機用得） |
| 4 | 完 | — |

之後所有 Phase 3 function 照 `readGcAccessToken()` 攞 token，行為同 OAuth 攞返嚟嘅**一模一樣**。

Firebase UID 喺 **Firebase Console → Authentication → Users** 度攞（瀏覽器）。

**將來 partner 批到**：行一次 OAuth flow，`gcOAuthCallback` 會覆寫同一個 secret 嘅新版本。其他嘢零改動。Architecture 本身已經係 OAuth-ready，唔使「將來再轉」。

> 順帶一提：呢個 fallback 之所以咁順，正正因為 CLAUDE.md #29 當初逼我哋用 Secret Manager SDK 喺 call time 讀，而唔係 `defineSecret()` 綁死。同一個決定第二次見返效。

### 3.2 ⚠️ 兩個限制，唔好當佢無縫

| 限制 | 影響 |
|---|---|
| Dashboard access token **只綁 Ani 自己一個商戶帳戶** | 代表唔到其他教練。夠用嚟起同測 Step 3，**唔係多教練 production 方案** |
| `gcConnections/{trainerId}` 文件唔會存在 | 佢係 `gcOAuthCallback` 專屬寫入（rules `allow write: if false`，Admin SDK 繞過）。任何靠佢判斷「已連結」嘅 UI 會顯示未連結 |

第二點需要**一個細改動（約 20 行）**，兩個做法：

- **(a) 推薦** —— 加一個 callable：教練 token 存在就寫返個 connection doc。改動細，將來 OAuth 上場唔使拆
- (b) Step 3 直接查 token 存唔存在而唔查 doc。但咁樣兩處判斷「已連結」嘅邏輯會分叉

---

## 4. 建議次序

**唔使行 fallback。** Blocker 係入錯 URL，唔係批核。

1. 開 sandbox 帳戶 —— `https://manage-sandbox.gocardless.com/signup`（5 分鐘，免費）
2. 開 partner app，redirect URL 填 `gcOAuthCallback` 條 URL（**待辦：員工B 查返確切嗰條俾 Ani**）
3. Client ID / Secret 放入 Secret Manager，名用 `GC_CLIENT_ID` / `GC_CLIENT_SECRET`（`gcSecrets.js:109` 已經讀緊呢兩個名，唔使改 code）
4. `gcOAuthStart` / `gcOAuthCallback` 本身已經指住 `connect-sandbox.gocardless.com`（`functions/index.js:32-33`），即刻試得

**Fallback 留住做後備**：如果第 2 步都有阻滯，即刻轉 access token 模式，唔會再卡住兩個禮拜。

---

## 5. 待 Ani 決定

| # | 事項 |
|---|---|
| 1 | 要唔要員工B 查返確切嘅 redirect URL 俾你填 |
| 2 | 要唔要更新 `reports/gocardless-sandbox-setup-guide.md`（嗰份寫喺 `defineSecret` 出事嗰陣，冇本報告呢啲資料，已過時） |
| 3 | 要唔要先寫低 §3.2 (a) 嗰 20 行，等 fallback 隨時撳得着 |

---

## 6. 資料來源

- [Partners: connecting your users](https://developer.gocardless.com/partners/connecting-your-users/) —— partner app 建立步驟、sandbox vs live host
- [Partners introduction](https://developer.gocardless.com/getting-started/partners/introduction/) —— 上線三步（live app / compliance / self-assessment）
- [Sandbox signup](https://manage-sandbox.gocardless.com/sign-up)
- [Sandbox accounts（support）](https://support.gocardless.com/hc/en-us/articles/212553869-Sandbox-accounts) —— 刪唔到資料、功能全開、測試銀行戶口
- [How to create an access token](https://support.gocardless.com/hc/en-gb/articles/17144828748444-How-to-create-an-access-token)

本報告嘅 code 引用（`gcSecrets.js:83` / `:109`、`index.js:32-33`）全部係直接讀本 repo 得出，唔係推測。
