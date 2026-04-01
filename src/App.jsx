import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import TrainerDashboard from './pages/TrainerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import WorkoutPlansPage from './pages/WorkoutPlansPage';
import SchedulePage from './pages/SchedulePage';
import ExerciseLibraryPage from './pages/ExerciseLibraryPage';
import WorkoutLogPage from './pages/WorkoutLogPage';
import ProgressPage from './pages/ProgressPage';
import MyWorkoutsPage from './pages/MyWorkoutsPage';

function AppRoutes() {
  const { currentUser } = useApp();

  if (!currentUser) return <LoginPage />;

  const isTrainer = currentUser.role === 'trainer';

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={isTrainer ? <TrainerDashboard /> : <ClientDashboard />} />
          {isTrainer && <Route path="/clients" element={<ClientsPage />} />}
          {isTrainer && <Route path="/clients/:clientId" element={<ClientDetailPage />} />}
          <Route path="/plans" element={<WorkoutPlansPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/exercises" element={<ExerciseLibraryPage />} />
          {!isTrainer && <Route path="/my-workouts" element={<MyWorkoutsPage />} />}
          {!isTrainer && <Route path="/log" element={<WorkoutLogPage />} />}
          {!isTrainer && <Route path="/progress" element={<ProgressPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AppProvider>
    </HashRouter>
  );
}
