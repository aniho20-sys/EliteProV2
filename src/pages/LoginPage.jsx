import { useState } from 'react';
import { useApp } from '../context/AppContext';

const demoAccounts = [
  { email: 'coach@elitepro.com', password: 'demo123', label: 'Coach Alex (Trainer)', role: 'trainer' },
  { email: 'david@example.com', password: 'demo123', label: 'David Chan (Client)', role: 'client' },
  { email: 'sarah@example.com', password: 'demo123', label: 'Sarah Wong (Client)', role: 'client' },
  { email: 'michael@example.com', password: 'demo123', label: 'Michael Lee (Client)', role: 'client' },
];

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(email, password);
    if (!result.success) setError(result.error);
  };

  const handleDemoLogin = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    login(account.email, account.password);
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-logo">
          Elite<span>Pro</span>
        </div>
        <div className="login-subtitle">Fitness Training Platform</div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Log In</button>
        </form>

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
