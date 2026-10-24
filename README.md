# ElitePro

ElitePro is a mobile-first web app for independent personal trainers. It brings client management, programming, scheduling and payments into one place, and it can be installed on a phone like a native app. Available in English and Traditional Chinese (Hong Kong).

ElitePro 是專為獨立私人教練而設的手機網頁應用程式，將客戶管理、訓練計劃、預約安排及收款集中於一處，並可像一般 App 一樣安裝到手機。支援英文及繁體中文（香港）。

## For trainers 教練功能

- Manage clients and their progress in one dashboard 一個介面管理所有客戶及其進度
- Build workout plans and assign them to clients 設計訓練計劃並分配給客戶
- Manage your session schedule and bookings 管理課堂時間表及預約
- Track session credits, send invoices and take payments via Stripe and GoCardless 追蹤課堂套票、發出發票，並透過 Stripe 及 GoCardless 收款

## For clients 客戶功能

- Join your trainer with a 6-character invite code 輸入 6 位邀請碼加入教練
- Log workouts and track body stats 記錄訓練及追蹤身體數據
- Book sessions with your trainer 向教練預約課堂

## Live app 正式版

[elitepro-16718.web.app](https://elitepro-16718.web.app)

## Built with 技術

React and Vite, with Firebase for sign-in, Firestore database, Cloud Functions and hosting.

前端使用 React 及 Vite，登入、Firestore 資料庫、Cloud Functions 及網站寄存均使用 Firebase。

## Running locally 本機運行 (Node 22)

```bash
npm install
npm run dev
```

`npm test` runs the tests, `npm run lint` checks the code.

`npm test` 執行測試，`npm run lint` 檢查程式碼。

## Deployment 部署

Every push to the deploy branch runs the tests on GitHub Actions and, if they pass, deploys automatically to Firebase Hosting.

每次推送到部署分支，GitHub Actions 會先執行測試，通過後自動部署到 Firebase Hosting。
