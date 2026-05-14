import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';

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
const BusinessAnalyticsPage = lazy(() => import('./pages/BusinessAnalyticsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-brand-text">Elite<span>Pro</span></div>
      <div className="loading-spinner" />
    </div>
  );
}

function AppRoutes() {
  const { currentUser, loading, authReady, needsProfile, dataError, firebaseUser } = useApp();
  const location = useLocation();

  // Public pages — accessible without authentication
  if (location.pathname === '/privacy') return <Suspense fallback={<LoadingScreen />}><PrivacyPolicyPage /></Suspense>;
  if (location.pathname === '/terms') return <Suspense fallback={<LoadingScreen />}><TermsPage /></Suspense>;

  // Keep loading screen up while:
  // 1. Firestore data is loading, OR auth check not complete.
  // 2. firebaseUser is set but currentUser hasn't been synced from the users list yet
  //    (one render gap between Firestore users snapshot and the currentUser sync effect).
  //    Exception: needsProfile case — new user genuinely has no profile yet, show RoleSelectPage.
  if (loading || !authReady || (firebaseUser && !currentUser && !needsProfile)) return <LoadingScreen />;

  const isTrainer = currentUser?.role === 'trainer';

  return (
    <Suspense fallback={<LoadingScreen />}>
      {dataError && (
        <div role="alert" style={{ background: 'var(--danger)', color: '#fff', padding: '10px 16px', textAlign: 'center', fontSize: '0.875rem' }}>
          {dataError} <button onClick={() => window.location.reload()} style={{ marginLeft: 12, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '2px 10px', borderRadius: 4, cursor: 'pointer' }}>Refresh</button>
        </div>
      )}
      {needsProfile ? (
        <RoleSelectPage />
      ) : !currentUser ? (
        <LoginPage />
      ) : (
        <div className="app-layout">
          <Navigation />
          <InstallPrompt />
          <OfflineBanner />
          <main className="main-content">
            <Routes>
              <Route path="/" element={isTrainer ? <TrainerDashboard /> : <ClientDashboard />} />
              {isTrainer && <Route path="/clients" element={<ClientsPage />} />}
              {isTrainer && <Route path="/clients/:clientId" element={<ClientDetailPage />} />}
              {isTrainer && <Route path="/progress-overview" element={<ClientProgressOverviewPage />} />}
              {isTrainer && <Route path="/invoices" element={<InvoicePage />} />}
              {isTrainer && <Route path="/analytics" element={<BusinessAnalyticsPage />} />}
              <Route path="/plans" element={<WorkoutPlansPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/exercises" element={<ExerciseLibraryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {!isTrainer && <Route path="/my-workouts" element={<MyWorkoutsPage />} />}
              <Route path="/log" element={<WorkoutLogPage />} />
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
