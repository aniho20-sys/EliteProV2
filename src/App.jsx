import { Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import { lazyPage } from './utils/lazyPage';
import Navigation from './components/Navigation';
import InstallPrompt from './components/InstallPrompt';
import NotifPrompt from './components/NotifPrompt';
import OfflineBanner from './components/OfflineBanner';

const LoginPage = lazyPage(() => import('./pages/LoginPage'));
const RoleSelectPage = lazyPage(() => import('./pages/RoleSelectPage'));
const TrainerDashboard = lazyPage(() => import('./pages/TrainerDashboard'));
const ClientDashboard = lazyPage(() => import('./pages/ClientDashboard'));
const ClientsPage = lazyPage(() => import('./pages/ClientsPage'));
const ClientDetailPage = lazyPage(() => import('./pages/ClientDetailPage'));
const WorkoutPlansPage = lazyPage(() => import('./pages/WorkoutPlansPage'));
const SchedulePage = lazyPage(() => import('./pages/SchedulePage'));
const ExerciseLibraryPage = lazyPage(() => import('./pages/ExerciseLibraryPage'));
const WorkoutLogPage = lazyPage(() => import('./pages/WorkoutLogPage'));
const ProgressPage = lazyPage(() => import('./pages/ProgressPage'));
const MyWorkoutsPage = lazyPage(() => import('./pages/MyWorkoutsPage'));
const MessagesPage = lazyPage(() => import('./pages/MessagesPage'));
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'));
const ClientProgressOverviewPage = lazyPage(() => import('./pages/ClientProgressOverviewPage'));
const InvoicePage = lazyPage(() => import('./pages/InvoicePage'));
const BusinessAnalyticsPage = lazyPage(() => import('./pages/BusinessAnalyticsPage'));
const IntakeFormPage = lazyPage(() => import('./pages/IntakeFormPage'));
const TrainingProfilePage = lazyPage(() => import('./pages/TrainingProfilePage'));
const PrivacyPolicyPage = lazyPage(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazyPage(() => import('./pages/TermsPage'));
const LandingPage = lazyPage(() => import('./pages/LandingPage'));
const OperatorDashboard = lazyPage(() => import('./pages/OperatorDashboard'));
const TrainerApplicationPage = lazyPage(() => import('./pages/TrainerApplicationPage'));
const StudioManagementPage = lazyPage(() => import('./pages/StudioManagementPage'));
const StudioBookingPage = lazyPage(() => import('./pages/StudioBookingPage'));

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-brand-text">Elite<span>Pro</span></div>
      <div className="loading-spinner" />
    </div>
  );
}

function AppRoutes() {
  const { t } = useLanguage();
  const { currentUser, loading, authReady, needsProfile, dataError, firebaseUser, signingIn } = useApp();
  const location = useLocation();

  // Public pages — accessible without authentication
  if (location.pathname === '/landing') return <Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>;
  if (location.pathname === '/privacy') return <Suspense fallback={<LoadingScreen />}><PrivacyPolicyPage /></Suspense>;
  if (location.pathname === '/terms') return <Suspense fallback={<LoadingScreen />}><TermsPage /></Suspense>;

  // A stranger arriving at the root URL gets the marketing page; a signed-in user falls
  // through to their own dashboard below. /login is the way back in, and is also where an
  // invited client must land — a coach's invite link points at the root, so sending that
  // visitor to the marketing page would break the one flow the link exists for.
  const hasInvite = !!sessionStorage.getItem('elitepro_invite_code');
  if (!firebaseUser && authReady && !signingIn && location.pathname === '/' && !hasInvite) {
    return <Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>;
  }

  // Keep loading screen up while auth or data is unsettled:
  // - signingIn: Google sign-in popup in progress — prevents cross-component render race
  // - loading / !authReady: Firestore loading or redirect check pending
  // - firebaseUser set but currentUser not yet synced (one render gap before sync effect runs)
  //   Exception: needsProfile — new user has no profile yet, show RoleSelectPage instead
  if (signingIn || loading || !authReady || (firebaseUser && !currentUser && !needsProfile)) return <LoadingScreen />;

  // gym啦 hidden — set to true when ready to re-enable
  const GYMLA_ENABLED = false;
  const isOperator = GYMLA_ENABLED && currentUser?.role === 'operator';
  const isTrainer = currentUser?.role === 'trainer';

  return (
    <Suspense fallback={<LoadingScreen />}>
      {dataError && (
        <div role="alert" style={{ background: 'var(--danger)', color: '#fff', padding: '10px 16px', textAlign: 'center', fontSize: '0.875rem' }}>
          {dataError} <button onClick={() => window.location.reload()} style={{ marginLeft: 12, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '2px 10px', borderRadius: 4, cursor: 'pointer' }}>{t('chrome.refresh')}</button>
        </div>
      )}
      {needsProfile ? (
        <RoleSelectPage />
      ) : !currentUser ? (
        <LoginPage />
      ) : (currentUser.role === 'client' && !currentUser.intakeCompleted && !isOperator) ? (
        <IntakeFormPage />
      ) : (
        <div className="app-layout">
          <Navigation />
          <InstallPrompt />
          <NotifPrompt />
          <OfflineBanner />
          <main className="main-content">
            <ErrorBoundary key={location.pathname} compact>
            <Routes>
              <Route path="/" element={isOperator ? <OperatorDashboard /> : isTrainer ? <TrainerDashboard /> : <ClientDashboard />} />
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
              {currentUser?.role === 'client' && <Route path="/my-workouts" element={<MyWorkoutsPage />} />}
              {(isTrainer || currentUser?.role === 'client') && <Route path="/log" element={<WorkoutLogPage />} />}
              {currentUser?.role === 'client' && <Route path="/progress" element={<ProgressPage />} />}
              {currentUser?.role === 'client' && <Route path="/training-profile" element={<TrainingProfilePage />} />}
              {isOperator && <Route path="/operator/studios" element={<StudioManagementPage />} />}
              {GYMLA_ENABLED && (isTrainer || isOperator) && <Route path="/apply" element={<TrainerApplicationPage />} />}
              {isTrainer && <Route path="/studios/book" element={<StudioBookingPage />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ErrorBoundary>
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
            <LanguageProvider>
              <ToastProvider>
                <NotificationProvider>
                  <AppRoutes />
                </NotificationProvider>
              </ToastProvider>
            </LanguageProvider>
          </AppProvider>
        </HashRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
