import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Mail, LogIn, KeyRound } from 'lucide-react';
import { isMobileOrPwa } from '../utils/deviceUtils';
import { useLanguage, useAuthMessages } from '../i18n/LanguageContext';

export default function LoginPage() {
  const { signInWithGoogle, signUpEmail, signInEmail, sendPasswordReset, googleAuthError, clearGoogleAuthError } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const authMsg = useAuthMessages();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    if (googleAuthError) {
      setError(authMsg.authError(googleAuthError) || t('auth.err_google'));
      setAuthLoading(false);
      clearGoogleAuthError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleAuthError, clearGoogleAuthError]);

  const handleGoogleSignIn = async () => {
    setError('');
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      // signInWithGoogle always uses popup (or redirect as last resort if popup blocked).
      // If popup succeeded, onAuthStateChanged has already fired; loading state in
      // AppContext will take over — just clear local loading here.
      // If redirect fired, the page navigates away so this line is never reached.
      setAuthLoading(false);
    } catch {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError(t('auth.err_enter_email'));
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordReset(forgotEmail.trim());
      // Deliberately not "sent" — see i18n/authMessages.js. Firebase resolves this call
      // for an address with no account and sends nothing, so the app does not know.
      setInfo(authMsg.resetNotice(forgotEmail.trim()));
      setShowForgot(false);
      setForgotEmail('');
      setForgotError('');
    } catch (err) {
      setForgotError(authMsg.resetError(err) || authMsg.authError(err) || t('auth.err_reset_failed'));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setAuthLoading(true);
    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError(t('auth.err_password_short'));
          return;
        }
        await signUpEmail(email, password);
      } else {
        await signInEmail(email, password);
      }
    } catch (err) {
      setError(authMsg.authError(err) || t('auth.err_generic'));
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button className="login-theme-toggle btn-icon" onClick={toggleTheme}>
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
      <div className="card login-card">
        <div className="login-logo">
          Elite<span>Pro</span>
        </div>
        <div className="login-subtitle">{t('auth.tagline')}</div>

        {error && <div className="login-error">{error}</div>}
        {info && <div className="login-info">{info}</div>}

        {/* Google Sign-In */}
        <button
          className="btn btn-google"
          onClick={handleGoogleSignIn}
          disabled={authLoading}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {authLoading ? (isMobileOrPwa() ? t('auth.google_redirecting') : t('auth.google_signing_in')) : t('auth.google_continue')}
        </button>

        {/* Divider */}
        <div className="login-divider">
          <span>{t('auth.or')}</span>
        </div>

        {/* Email/Password Auth */}
        <form onSubmit={handleEmailAuth} autoComplete="on">
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input
              type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')} required
              name="email" autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input
              type="password" className="form-input" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? t('auth.password_placeholder_signup') : t('auth.password_placeholder_signin')} required
              name="password" autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
            {isSignUp ? <Mail size={16} /> : <LogIn size={16} />}
            {isSignUp ? t('auth.create_account') : t('auth.sign_in')}
          </button>
        </form>

        <div className="login-switch">
          <button className="btn-link" onClick={() => { setIsSignUp(!isSignUp); setError(''); setInfo(''); }}>
            {isSignUp ? t('auth.have_account') : t('auth.no_account')}
          </button>
          {!isSignUp && (
            <button
              className="btn-link"
              onClick={() => { setShowForgot(true); setForgotEmail(email); setError(''); setInfo(''); }}
            >
              {t('auth.forgot')}
            </button>
          )}
        </div>
      </div>

      {/* Legal links */}
      <div className="login-legal">
        {t('auth.legal_pre')}{' '}
        <Link to="/terms">{t('auth.terms')}</Link> {t('auth.and')}{' '}
        <Link to="/privacy">{t('auth.privacy')}</Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="modal-overlay" onClick={() => !forgotLoading && (setShowForgot(false), setForgotError(''))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              <KeyRound size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {t('auth.reset_title')}
            </h3>
            <p className="text-sm text-muted">
              {t('auth.reset_intro')}
            </p>
            {forgotError && <div className="login-error" style={{ marginBottom: 8 }}>{forgotError}</div>}
            <form onSubmit={handleForgotPassword}>
              <div className="form-group mt-8">
                <label className="form-label">{t('auth.email')}</label>
                <input
                  type="email"
                  className="form-input"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder={t('auth.reset_email_placeholder')}
                  name="email" autoComplete="email"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setShowForgot(false); setForgotEmail(''); setForgotError(''); }}
                  disabled={forgotLoading}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={forgotLoading}>
                  <Mail size={16} /> {forgotLoading ? t('auth.sending') : t('auth.send_reset')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
