# ElitePro - Fitness Training Platform

## Project Overview
ElitePro is a web-based fitness training platform designed for personal trainers and their clients. It enables trainers to manage clients, create workout plans, schedule sessions, and communicate with clients. Clients can view their workouts, log training sessions, track body stats progress, and message their coach.

## Tech Stack
- **Framework**: React 19 + Vite
- **Routing**: React Router v7 (HashRouter)
- **Icons**: Lucide React
- **Backend**: Firebase (Firestore + Firebase Auth)
- **Offline Support**: IndexedDB persistence via Firebase SDK
- **Styling**: Custom CSS with CSS variables (light/dark theme toggle)

## Commands
- `npm install` — Install dependencies
- `npm run dev` — Start dev server (port 5173)
- `npm run build` — Production build to `dist/`
- `npm run build:gh` — GitHub Pages build (`DEPLOY_TARGET=gh-pages`)
- `npm run preview` — Preview production build
- `npm run deploy` — Build + full Firebase deploy
- `npm run deploy:hosting` — Build + deploy Firebase hosting only
- `npm run deploy:rules` — Deploy Firestore rules only
- `npm run lint` — Run ESLint

## Project Structure
```
src/
├── components/
│   ├── Navigation.jsx    # Sidebar + mobile bottom nav
│   ├── GlobalSearch.jsx  # Global search across clients/plans/exercises
│   ├── NotesSection.jsx  # Reusable notes component
│   └── ErrorBoundary.jsx # Top-level React error boundary
├── context/
│   ├── AppContext.jsx    # Global state management (React Context)
│   ├── ToastContext.jsx  # Toast notification system
│   └── ThemeContext.jsx  # Light/dark theme management (localStorage)
├── data/
│   ├── exercises.js      # Exercise library data
│   └── sampleData.js     # Demo data (users, plans, logs, etc.)
├── pages/
│   ├── LoginPage.jsx           # Authentication (email/password, Google Sign-In)
│   ├── RoleSelectPage.jsx      # Role selection after first sign-in
│   ├── TrainerDashboard.jsx    # Trainer home (overview stats)
│   ├── ClientDashboard.jsx     # Client home (overview stats)
│   ├── ClientsPage.jsx         # Trainer: client list + add
│   ├── ClientDetailPage.jsx    # Trainer: client detail (stats, plans, logs)
│   ├── WorkoutPlansPage.jsx    # Create/view workout plans
│   ├── SchedulePage.jsx        # Session scheduling + calendar
│   ├── MessagesPage.jsx        # In-app messaging
│   ├── ExerciseLibraryPage.jsx # Exercise database with filters
│   ├── MyWorkoutsPage.jsx      # Client: view assigned plans
│   ├── WorkoutLogPage.jsx      # Client: log workout sessions
│   ├── ProgressPage.jsx        # Client: body stats tracking
│   └── ProfilePage.jsx         # Profile settings, invite codes, account management
├── styles/
│   └── index.css         # Global styles
├── firebase.js           # Firebase app init (Firestore + Auth)
├── App.jsx               # Root component + routing
└── main.jsx              # Entry point
```

## Firebase Config Files (root)
- `firebase.json` — Firebase project config
- `.firebaserc` — Firebase project alias
- `firestore.rules` — Firestore security rules

## Features
### Trainer
- Dashboard with stats overview (clients, sessions, messages)
- Client management (add, view details, track progress)
- Workout plan builder (drag exercises, set reps/sets/rest)
- Session scheduling with date picker
- In-app messaging with clients
- Global search across clients, plans, and exercises
- Invite code generation to onboard new clients

### Client
- Dashboard with workout summary and body stats
- View assigned workout plans with exercise details
- Log workouts (weight, reps per set, RPE, notes)
- Track body measurements (weight, body fat, circumferences)
- Book sessions and message coach
- Connect to trainer via invite code

### Shared
- Exercise library with search and muscle/equipment filters
- Responsive design (desktop sidebar + mobile bottom nav)
- Light/dark theme toggle (persisted in localStorage)
- Toast notifications
- Profile page: edit profile, change email/password, reset data, delete account
- Firebase Auth: email/password, Google Sign-In, password reset

## Demo Accounts
| Role    | Email               | Password |
|---------|---------------------|----------|
| Trainer | coach@elitepro.com  | demo123  |
| Client  | david@example.com   | demo123  |
| Client  | sarah@example.com   | demo123  |
| Client  | michael@example.com | demo123  |

> Demo accounts use seeded Firestore data and have limited account management options (no password change, no delete).

## Team Structure & Working Rules

### 團隊成員
| 職位 | 代號 | 職責 |
|------|------|------|
| PM（主管） | — | 帶領團隊、最終總結、確保回覆清晰 |
| 員工 A | SA - 系統分析 | App 邏輯、資料庫設計、功能流程 |
| 員工 B | Dev - 核心開發 | 編寫程式碼、處理 API 串接 |
| 員工 C | Reviewer - 審核 | Code Review、檢查 Bug、安全性和效能 |
| 員工 D | UI/UX - 設計 | 介面、配色、排版，運用心理學效應優化體驗 |
| 員工 E | QA - 測試與合規 | 搵 Bug、寫測試報告、處理合規問題（如 SAR）|

### 工作規範
- 內部討論必須使用**廣東話（繁體字）**
- 每位員工發言前標註職位，例如：`[員工 B - Dev]`
- 主管負責最後總結

## Architecture Notes
- **Database**: Firebase Firestore (primary storage); IndexedDB used for offline persistence
- **Auth**: Firebase Authentication (email/password + Google Sign-In)
- **State**: React Context (`AppContext`) wraps the app; `ToastContext` for notifications; `ThemeContext` for theme
- **Routing**: HashRouter (supports GitHub Pages / Firebase Hosting static deploys)
- **Role-based routing**: Trainers and clients see different navigation and pages; `RoleSelectPage` shown after first sign-in if profile is incomplete
- **Sample data**: Auto-seeded into Firestore on first load for demo accounts; "Reset Data" restores defaults
- **Theme**: Stored in `localStorage` under key `elitepro_theme`; applied via `data-theme` attribute on `<html>`
- **Error handling**: Top-level `ErrorBoundary` component wraps the entire app
