import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Mail, LogIn } from 'lucide-react';

const demoAccounts = [
  { email: 'coach@elitepro.com', password: 'demo123', label: 'Coach Alex (Trainer)', role: 'trainer' },
  { email: 'david@example.com', password: 'demo123', label: 'David Chan (Client)', role: 'client' },
  { email: 'sarah@example.com', password: 'demo123', label: 'Sarah Wong (Client)', role: 'client' },
  { email: 'michael@example.com', password: 'demo123', label: 'Michael Lee (Client)', role: 'client' },
];

export default function LoginPage() {
  const { login, signInWithGoogle, signUpEmail, signInEmail } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    const result = login(email, password);
    if (!result.success) setError(result.error);
    else setError('');
  };

  const handleDemoLogin = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    login(account.email, account.password);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle the rest
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
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
      const messages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/invalid-email': 'Please enter a valid email',
      };
      setError(messages[err.code] || err.message || 'Authentication failed');
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
          {authLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Email/Password Auth */}
        <form onSubmit={handleEmailAuth}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email" required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password" className="form-input" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'} required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
            {isSignUp ? <Mail size={16} /> : <LogIn size={16} />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-switch">
          <button className="btn-link" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Demo Accounts */}
        <div className="login-demo">
          <div className="login-demo-title">Demo Accounts (click to login):</div>
          <div className="login-demo-accounts">
            {demoAccounts.map(acc => (
              <div key={acc.email} className="login-demo-account" onClick={() => handleDemoLogin(acc)}>
                <span>{acc.label}</span>
                <span className={`tag ${acc.role === 'trainer' ? 'tag-accent' : 'tag-primary'}`}>{acc.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
