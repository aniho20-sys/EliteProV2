# 自訂域名設定指引（全程手機瀏覽器，唔使 terminal）

**日期**：2026-08-15
**寫俾**：Ani
**現況**：`https://elitepro-16718.web.app` 已經上線正常
**目標**：換成 `elitepro.app` 或者 `elitepro.co.uk`

> ⚠️ 呢份嘢**唔使識技術**。逐格照抄就得。每一步都寫咗「你應該見到乜」，唔對就停低問我。

---

## 第 0 步：先揀 .app 定 .co.uk

| | `.app` | `.co.uk` |
|---|---|---|
| 感覺 | 一個產品、一個工具 | 一間英國公司 |
| 價錢（每年） | 約 US$14–20 | 約 £8–12 |
| 強制 HTTPS | ✅ 係（`.app` 由 Google 營運，全 TLD 預載 HSTS） | 唔強制 |
| 適合 | 賣 SaaS 俾教練 | 本地服務生意 |

**建議 `.app`。** 你賣嘅係一個 app 俾教練用，唔係本地服務。而且 `.app` 強制 HTTPS 呢點對信任度有幫助（Firebase 本身就免費出 SSL，所以對我哋零成本）。

> 如果 `elitepro.app` 已經俾人買咗，試 `getelitepro.app`、`eliteproapp.com`、`elitepro.coach`。**唔好**加符號或者數字（`elite-pro.app`、`elitepro1.app`）—— 講電話嗰陣講唔清楚。

---

## 第 1 步：買域名

### 推薦：**Porkbun**（[porkbun.com](https://porkbun.com)）

點解揀佢：

- **續期價 = 首年價**。Namecheap 首年平、第二年跳價，Porkbun 唔玩呢味
- **WHOIS 隱私免費** —— 唔使你個住址同電話公開喺網上（有啲 registrar 收錢賣呢樣）
- 手機網頁介面正常用得，唔使裝 app
- `.app` 同 `.co.uk` 兩樣都買得

> 如果你最後揀 `.co.uk`：**Namecheap** 對英國域名支援好啲，可以考慮。
> **唔好用 Cloudflare Registrar** —— 佢好多 TLD 只接受轉入唔接受新註冊，而且 DNS 有個「橙色雲」代理功能，開咗會令 Firebase 驗證失敗。對你嚟講係多餘嘅陷阱。

### 買嘅步驟

1. 手機開 [porkbun.com](https://porkbun.com)
2. 搜尋格打 `elitepro.app` → 撳搜尋
3. 見到綠色 **Available** → 撳 **Add to Cart**
4. 撳 **Checkout**
5. 開帳戶（email + 密碼）
6. 付款（信用卡）
7. ⚠️ **開 Auto-Renew**（自動續期）—— 忘記續期會俾人搶咗個域名，搶返可以好貴

**你應該見到**：Porkbun 個 **Domain Management** 頁，列住 `elitepro.app`。

⚠️ 買完會收到一封 **ICANN 驗證 email**，**一定要撳入面條連結**。唔撳，個域名 15 日後會俾人停用。

---

## 第 2 步：喺 Firebase 加自訂域名

1. 手機開 [console.firebase.google.com](https://console.firebase.google.com)
2. 揀 project **elitepro-16718**
3. 左邊選單 → **Build** → **Hosting**
   - 手機版可能要撳左上角 **☰** 先見到選單
4. 揾到 **Add custom domain** 掣 → 撳
5. 打 `elitepro.app`（**唔好**打 `https://`，**唔好**打 `www.`）
6. 下面有個 checkbox「Redirect… 」→ **唔好剔**，我哋之後再處理 www
7. 撳 **Continue**

**你應該見到**：一個畫面叫你加一條 **TXT** record，有一串好長嘅值，類似 `google-site-verification=aBcD1234...`

📸 **喺呢一步截圖**，因為下一步要抄呢串嘢。

---

## 第 3 步：加驗證用嘅 TXT record

轉返去 Porkbun：

1. **Domain Management** → 揾到 `elitepro.app` → 撳 **DNS**
2. 撳 **Add Record**（或者 **+**）
3. 照下面填：

| 格 | 填乜 |
|---|---|
| **Type** | `TXT` |
| **Host** | **留空**（Porkbun 留空 = 個域名本身） |
| **Answer / Value** | Firebase 俾你嗰串 `google-site-verification=...`（**全個** copy） |
| **TTL** | `600`（有 default 就唔使改） |

4. 撳 **Add** / **Save**

**你應該見到**：DNS 清單多咗一行 TXT。

⏱ **等 5–30 分鐘**（Firebase 話最多 24 小時，實際通常好快）。

5. 返 Firebase 個畫面 → 撳 **Verify**

- ✅ 成功 → 跳去下一步
- ❌ 失敗 → **唔好慌，唔好改嘢**，再等 15 分鐘撳多次。DNS 本身就係慢

---

## 第 4 步：加 A records（真正指去 Firebase）

驗證成功之後，Firebase 會顯示 **兩條 A record 嘅 IP 地址**。

> ⚠️ **一定要抄 Firebase 畫面上顯示嗰兩個 IP**，唔好用網上搵返嚟嘅。Firebase 改過 IP，網上啲舊教學嘅數字係錯嘅。畫面上通常係兩個 `151.101.x.x` 咁嘅地址。

返 Porkbun DNS 頁，加**兩條**：

**第一條**

| 格 | 填乜 |
|---|---|
| Type | `A` |
| Host | **留空** |
| Answer | Firebase 第一個 IP |
| TTL | `600` |

**第二條**

| 格 | 填乜 |
|---|---|
| Type | `A` |
| Host | **留空** |
| Answer | Firebase 第二個 IP |
| TTL | `600` |

### 順便加埋 www（好過日後補）

| 格 | 填乜 |
|---|---|
| Type | `CNAME` |
| Host | `www` |
| Answer | `elitepro.app` |
| TTL | `600` |

> 加完之後，返 Firebase 再 **Add custom domain** 一次，今次打 `www.elitepro.app`，並且**剔**「Redirect to elitepro.app」。咁樣有人打 `www.` 都去到啱嘅地方。

### ⚠️ 記住刪走 Porkbun 送嘅預設 record

Porkbun 買完會自動加一條指去佢自己 parking 頁嘅 **A** record（Host 留空）。**如果唔刪，你個域名會一時去 Firebase 一時去 parking 頁**，時好時壞，仲難查。

只留低你自己加嗰啲。**唔好掂** `NS` 同 `SOA`（呢兩樣係域名嘅根基）。

---

## 第 5 步：等 SSL

Firebase Hosting 頁面上，個域名旁邊個狀態會咁行：

| 狀態 | 意思 | 要等幾耐 |
|---|---|---|
| **Needs setup** | 未見到你嘅 DNS | 加完 record 後 5–60 分鐘 |
| **Pending** | 見到了，出緊 SSL 證書 | 通常幾個鐘 |
| **Connected** ✅ | 搞掂 | — |

**官方講最多 24 小時**，實際通常 **1–4 個鐘**。

> 😤 **等嘅時候唔好郁啲 DNS record。** 改嚟改去只會令個計時器重新開始。加完就收機，隔一兩個鐘睇一次。

**測試方法**（手機）：Safari **無痕視窗**開 `https://elitepro.app`。

- 見到 landing page + 網址列有鎖頭 = ✅ 成功
- 見到「唔安全」警告 = SSL 未出好，再等
- 見到 Porkbun parking 頁 = 你未刪走第 4 步講嗰條預設 record

---

## 第 6 步：⚠️ 換完域名之後一定要話我知

以下幾樣**寫死咗舊網址**，唔改嘅話會靜靜雞壞：

| 位置 | 而家係乜 | 點解要改 |
|---|---|---|
| `index.html` 嘅 `og:image` / `og:url` | `elitepro-16718.web.app` | 唔改，WhatsApp 預覽卡就搵唔到張圖 |
| 邀請連結 | `elitepro-16718.web.app/#/?invite=XXXXXX` | 學生仲會收到舊網址 |
| `CLAUDE.md` / `PROGRESS.md` | 舊網址 | 文件過時 |

**你只需要話我知新域名，我一次過改晒。** 舊網址永遠都會繼續 work，唔會有嘢壞，只係唔靚同埋預覽卡會失效。

---

## 費用總結

| 項目 | 費用 |
|---|---|
| 域名（`.app`，每年） | 約 **US$14–20** |
| Firebase Hosting | **$0**（免費額度夠用好耐） |
| SSL 證書 | **$0**（Firebase 自動出） |
| **總共** | **每年約 US$15–20** |

---

## 搞唔掂嗰陣

| 症狀 | 點解 | 點做 |
|---|---|---|
| Verify 一直失敗 | DNS 未散播 | 等，唔好改嘢。過咗 2 個鐘都唔得先揾我 |
| 見到 Porkbun parking 頁 | 預設 A record 未刪 | 返第 4 步最後一節 |
| 「連線唔安全」 | SSL 未出好 | 等，最多 24 鐘頭 |
| `www.` 唔 work 但主域名 work | CNAME 未加 / 未喺 Firebase 加第二個域名 | 返第 4 步 |
| 完全打唔開 | 可能刪錯咗 NS record | **即刻揾我**，唔好再自己試 |

---

## 資料來源

- [Firebase Hosting — Connect a custom domain](https://firebase.google.com/docs/hosting/custom-domain)
- [Porkbun](https://porkbun.com)
- [Namecheap](https://www.namecheap.com)（`.co.uk` 備選）
