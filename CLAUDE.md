# ElitePro - Fitness Training Platform

## Project Overview
ElitePro is a web-based fitness training platform designed for personal trainers and their clients. It enables trainers to manage clients, create workout plans, schedule sessions, and communicate with clients. Clients can view their workouts, log training sessions, track body stats progress, and message their coach.

## Tech Stack
- **Framework**: React 19 + Vite
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Storage**: localStorage (no backend required)
- **Styling**: Custom CSS with CSS variables (dark theme)

## Commands
- `npm install` — Install dependencies
- `npm run dev` — Start dev server (port 5173)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build

## Project Structure
```
src/
├── components/        # Shared UI components
│   └── Navigation.jsx # Sidebar + mobile bottom nav
├── context/
│   └── AppContext.jsx  # Global state management (React Context)
├── data/
│   ├── exercises.js    # Exercise library data
│   └── sampleData.js   # Demo data (users, plans, logs, etc.)
├── pages/
│   ├── LoginPage.jsx          # Authentication (demo accounts)
│   ├── TrainerDashboard.jsx   # Trainer home (overview stats)
│   ├── ClientDashboard.jsx    # Client home (overview stats)
│   ├── ClientsPage.jsx        # Trainer: client list + add
│   ├── ClientDetailPage.jsx   # Trainer: client detail (stats, plans, logs)
│   ├── WorkoutPlansPage.jsx   # Create/view workout plans
│   ├── SchedulePage.jsx       # Session scheduling + calendar
│   ├── MessagesPage.jsx       # In-app messaging
│   ├── ExerciseLibraryPage.jsx# Exercise database with filters
│   ├── MyWorkoutsPage.jsx     # Client: view assigned plans
│   ├── WorkoutLogPage.jsx     # Client: log workout sessions
│   └── ProgressPage.jsx       # Client: body stats tracking
├── styles/
│   └── index.css       # Global styles
├── App.jsx             # Root component + routing
└── main.jsx            # Entry point
```

## Features
### Trainer
- Dashboard with stats overview (clients, sessions, messages)
- Client management (add, view details, track progress)
- Workout plan builder (drag exercises, set reps/sets/rest)
- Session scheduling with date picker
- In-app messaging with clients

### Client
- Dashboard with workout summary and body stats
- View assigned workout plans with exercise details
- Log workouts (weight, reps per set, RPE, notes)
- Track body measurements (weight, body fat, circumferences)
- Book sessions and message coach

### Shared
- Exercise library with search and muscle/equipment filters
- Responsive design (desktop sidebar + mobile bottom nav)
- Dark theme UI

## Demo Accounts
| Role    | Email               | Password |
|---------|---------------------|----------|
| Trainer | coach@elitepro.com  | demo123  |
| Client  | david@example.com   | demo123  |
| Client  | sarah@example.com   | demo123  |
| Client  | michael@example.com | demo123  |

## Architecture Notes
- All data is stored in localStorage under the key `elitepro_data`
- State management uses React Context (`AppContext`)
- No backend/API — fully client-side SPA
- Sample data auto-loads on first visit; use "Reset Data" to restore defaults
- Role-based routing: trainers and clients see different navigation and pages
