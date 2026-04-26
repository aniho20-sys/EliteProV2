import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RoleSelectPage = lazy(() => import('./pages/RoleSelectPage'));
const TrainerDashboard = lazy(() => import('./pages/TrainerDashboard'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const WorkoutPlansPage = lazy(() => import('./pages/WorkoutPlansPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const ExerciseLibraryPage = lazy(() => import('./pages/ExerciseLibraryPage'));
const WorkoutLogPage = lazy(() => import('./pages/WorkoutLogPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const MyWorkoutsPage = lazy(() => import('./pages/MyWorkoutsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ClientProgressOverviewPage = lazy(() => import('./pages/ClientProgressOverviewPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Loading ElitePro...</p>
    </div>
  );
}

function AppRoutes() {
  const { currentUser, loading, authReady, needsProfile } = useApp();
  const location = useLocation();

  // Public pages — accessible without authentication
  if (location.pathname === '/privacy') return <Suspense fallback={<LoadingScreen />}><PrivacyPolicyPage /></Suspense>;
  if (location.pathname === '/terms') return <Suspense fallback={<LoadingScreen />}><TermsPage /></Suspense>;

  if (loading || !authReady) return <LoadingScreen />;

  const isTrainer = currentUser?.role === 'trainer';

  return (
    <Suspense fallback={<LoadingScreen />}>
      {needsProfile ? (
        <RoleSelectPage />
      ) : !currentUser ? (
        <LoginPage />
      ) : (
        <div className="app-layout">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={isTrainer ? <TrainerDashboard /> : <ClientDashboard />} />
              {isTrainer && <Route path="/clients" element={<ClientsPage />} />}
              {isTrainer && <Route path="/clients/:clientId" element={<ClientDetailPage />} />}
              {isTrainer && <Route path="/progress-overview" element={<ClientProgressOverviewPage />} />}
              {isTrainer && <Route path="/invoices" element={<InvoicePage />} />}
              <Route path="/plans" element={<WorkoutPlansPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/exercises" element={<ExerciseLibraryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {!isTrainer && <Route path="/my-workouts" element={<MyWorkoutsPage />} />}
              {!isTrainer && <Route path="/log" element={<WorkoutLogPage />} />}
              {!isTrainer && <Route path="/progress" element={<ProgressPage />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    const match = window.location.hash.match(/[?&]invite=([A-Z0-9]{6})/i);
    if (match) sessionStorage.setItem('elitepro_invite_code', match[1].toUpperCase());
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <HashRouter>
          <AppProvider>
            <ToastProvider>
              <NotificationProvider>
                <AppRoutes />
              </NotificationProvider>
            </ToastProvider>
          </AppProvider>
        </HashRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
