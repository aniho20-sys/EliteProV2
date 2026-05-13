import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Mail, LogIn, PlayCircle, KeyRound } from 'lucide-react';
import { friendlyAuthError } from '../utils/authErrors';

export default function LoginPage() {
  const { signInWithGoogle, signUpEmail, signInEmail, loginDemoCoach, sendPasswordReset, googleAuthError, clearGoogleAuthError } = useApp();
  const { theme, toggleTheme } = useTheme();
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
      setError(friendlyAuthError(googleAuthError) || 'Google sign-in failed. Please try again.');
      setAuthLoading(false);
      clearGoogleAuthError();
    }
  }, [googleAuthError, clearGoogleAuthError]);

  const handleDemoCoach = async () => {
    setError('');
    setAuthLoading(true);
    try {
      await loginDemoCoach();
    } catch (err) {
      setError(friendlyAuthError(err) || 'Demo login failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const isMobileOrPwa =
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const handleGoogleSignIn = async () => {
    setError('');
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      // On mobile/PWA the above triggers a redirect — page navigates away.
      // On desktop, the popup resolves here; clear loading if no navigation.
      if (!isMobileOrPwa) setAuthLoading(false);
    } catch {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email');
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordReset(forgotEmail.trim());
      setInfo(`Password reset email sent to ${forgotEmail.trim()}. Check your inbox (and spam folder).`);
      setShowForgot(false);
      setForgotEmail('');
      setForgotError('');
    } catch (err) {
      setForgotError(friendlyAuthError(err) || 'Failed to send reset email. Please try again.');
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
          setError('Password must be at least 6 characters');
          return;
        }
        await signUpEmail(email, password);
      } else {
        await signInEmail(email, password);
      }
    } catch (err) {
      setError(friendlyAuthError(err) || 'Authentication failed. Please try again.');
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
        <div className="login-subtitle">Fitness Training Platform</div>

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
          {authLoading ? (isMobileOrPwa ? 'Redirecting to Google…' : 'Signing in…') : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Email/Password Auth */}
        <form onSubmit={handleEmailAuth} autoComplete="on">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email" required
              name="email" autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password" className="form-input" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'} required
              name="password" autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
            {isSignUp ? <Mail size={16} /> : <LogIn size={16} />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-switch">
          <button className="btn-link" onClick={() => { setIsSignUp(!isSignUp); setError(''); setInfo(''); }}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
          {!isSignUp && (
            <button
              className="btn-link"
              onClick={() => { setShowForgot(true); setForgotEmail(email); setError(''); setInfo(''); }}
              style={{ marginTop: 4 }}
            >
              Forgot password?
            </button>
          )}
        </div>

        {/* Demo account */}
        <div className="login-demo">
          <div className="login-demo-title">Try it out:</div>
          <button
            className="btn btn-outline"
            style={{ width: '100%' }}
            onClick={handleDemoCoach}
            disabled={authLoading}
          >
            <PlayCircle size={16} /> Explore as Demo Coach
          </button>
          <div className="text-sm text-muted mt-8" style={{ textAlign: 'center' }}>
            Loads pre-filled sample clients, plans & logs
          </div>
        </div>
      </div>

      {/* Legal links */}
      <div className="login-legal">
        By continuing, you agree to our{' '}
        <Link to="/terms">Terms of Service</Link> and{' '}
        <Link to="/privacy">Privacy Policy</Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="modal-overlay" onClick={() => !forgotLoading && (setShowForgot(false), setForgotError(''))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              <KeyRound size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Reset Password
            </h3>
            <p className="text-sm text-muted">
              Enter the email you signed up with. We'll send you a link to reset your password.
            </p>
            {forgotError && <div className="login-error" style={{ marginBottom: 8 }}>{forgotError}</div>}
            <form onSubmit={handleForgotPassword}>
              <div className="form-group mt-8">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={forgotLoading}>
                  <Mail size={16} /> {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
