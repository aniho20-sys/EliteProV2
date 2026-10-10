# 動作庫：同一個動作嘅 Barbell／Dumbbell／Cable／Machine 版本（2026-10-10）

[員工A - SA]

**Ani 要求**：好似 Bicep Curl 咁，一個動作可以用 Machine、Cable、Dumbbell、Barbell 做。查清楚邊啲動作有呢啲版本，加入動作庫，並按器材分類。

## 資料來源

- **free-exercise-db**（github.com/yuhonas/free-exercise-db，876 個動作，public domain／Unlicense，每個動作標咗器材）。用程式將同一個動作嘅唔同器材版本歸埋一齊，再逐個人手核對。
- ExRx.net 擋外部讀取（HTTP 403），冇用到。
- 呢個資料庫偏舊，新式器械（例如 Machine Lateral Raise、Hip Thrust 機）收錄唔齊。呢類喺下表標 ◇，意思係「健身室常見，但資料庫冇收錄」——係 agent 判斷，唔係資料證實。

**標記**：✓ = 資料庫有收錄（括號係佢嘅名）；◇ = 常見但資料庫冇；— = 唔常見，唔加。
**Smith machine** 歸入 Machine（app 嘅器材分類冇 Smith 呢一格）。
**已有** = 而家起始動作庫已經有嘅版本（唔會刪，亦唔會改 id，舊紀錄照樣指住佢）。

## 手臂

| 動作 | Barbell | Dumbbell | Cable | Machine | 已有 |
|---|---|---|---|---|---|
| Bicep Curl | ✓ (Barbell Curl) | ✓ (Dumbbell Bicep Curl) | ✓ (Standing Biceps Cable Curl) | ✓ (Machine Bicep Curl) | Barbell Curl |
| Hammer Curl | — | ✓ (Hammer Curls) | ✓ (Cable Hammer Curls – Rope) | — | Hammer Curl (Dumbbell) |
| Preacher Curl | ✓ | ✓ | ✓ | ✓ | — |
| Reverse Curl | ✓ | ✓ | ✓ | — | — |
| Wrist Curl | ✓ | ✓ | ✓ | — | — |
| Overhead Tricep Extension | ✓ | ✓ | ✓ (Rope) | ✓ (Machine Triceps Extension) | — |
| Lying Tricep Extension（Skull Crusher） | ✓ | ✓ | ✓ | — | Skull Crusher (Barbell) |
| Tricep Kickback | — | ✓ | ◇ | — | — |

## 膊頭

| 動作 | Barbell | Dumbbell | Cable | Machine | 已有 |
|---|---|---|---|---|---|
| Shoulder Press | ✓ | ✓ | ✓ | ✓ | Overhead Press (Barbell) |
| Lateral Raise | — | ✓ | ✓ | ◇ | Lateral Raise (Dumbbell) |
| Front Raise | ◇ | ✓ | ✓ | — | — |
| Rear Delt Fly | — | ✓ (Reverse Flyes) | ✓ | ✓ (Reverse Machine Flyes) | — |
| Upright Row | ✓ | ✓ | ✓ | ✓ (Smith) | — |
| Shrug | ✓ | ✓ | ✓ | ✓ (Leverage Shrug) | — |

## 胸

| 動作 | Barbell | Dumbbell | Cable | Machine | 已有 |
|---|---|---|---|---|---|
| Bench Press | ✓ | ✓ | — | ✓ (Machine Bench Press) | Bench Press (Barbell) |
| Incline Bench Press | ✓ | ✓ | — | ✓ (Incline Chest Press) | Incline Dumbbell Press |
| Chest Fly | — | ✓ (Dumbbell Flyes) | ✓ | ✓ (Butterfly／Pec Deck) | Cable Fly |

## 背

| 動作 | Barbell | Dumbbell | Cable | Machine | 已有 |
|---|---|---|---|---|---|
| Row | ✓ (Bent Over Row) | ✓ (One-Arm Row) | ✓ (Seated Cable Row) | ✓ (Iso Row) | Barbell Row |
| Lat Pulldown | — | — | ✓ | ◇（plate-loaded） | Lat Pulldown (Cable) |
| Pullover | ✓ | ✓ | ✓ (Straight-Arm Pulldown) | — | — |

## 腳

| 動作 | Barbell | Dumbbell | Cable | Machine | 已有 |
|---|---|---|---|---|---|
| Squat | ✓ | ✓ | — | ✓ (Smith／Hack) | Barbell Squat |
| Romanian Deadlift | ✓ | ✓ (Stiff-Legged) | — | ✓ (Smith) | Romanian Deadlift (Barbell) |
| Lunge | ✓ | ✓ | — | — | Lunge (Dumbbell) |
| Split Squat | ✓ | ✓ | — | ✓ (Smith) | — |
| Step Up | ✓ | ✓ | — | — | — |
| Hip Thrust | ✓ | ◇ | — | ◇ | — |
| Calf Raise | ✓ | ✓ | — | ✓ | Calf Raise (Machine) |
| Glute Kickback | — | — | ✓ | ◇ | — |

## 核心

| 動作 | Barbell | Dumbbell | Cable | Machine | 已有 |
|---|---|---|---|---|---|
| Crunch | — | — | ✓ | ✓ (Ab Crunch Machine) | Cable Crunch |
| Side Bend | ✓ | ✓ | — | — | — |
| Wood Chop | — | ◇ | ✓ | — | — |

## 數量

30 個動作。全部加入嘅話總共 91 個版本，其中 15 個已經喺起始動作庫，要新加 76 個（◇ 嗰 8 個包埋在內）。

## 唔加嘅（只有一種器材）

Leg Extension、Leg Curl（淨係 Machine）、Tricep Pushdown（淨係 Cable）、Deadlift（Barbell 為主）、Pull Up／Push Up／Plank 等徒手動作。

## 每個新動作會有乜

- 名、器材、主要肌肉、動作模式（Push／Pull／Squat／Hinge／Core）、一句英文簡介。
- **冇 YouTube 片**：76 條片 agent 冇辦法逐條核實；Ani 可以用現有嘅「自訂影片」功能自己加。
- **唔使翻譯**：動作名係訓練術語，唔經 `t()`（CLAUDE.md #39），所以冇新中文句要批。
