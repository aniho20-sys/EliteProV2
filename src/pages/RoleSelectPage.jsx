import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Dumbbell, Users, Moon, Sun, ArrowRight, LogOut } from 'lucide-react';

export default function RoleSelectPage() {
  const { firebaseUser, completeProfile, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [role, setRole] = useState(null);
  const [name, setName] = useState(firebaseUser?.displayName || '');
  const [trainerId, setTrainerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) { setError('Please select a role'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    setError('');
    setSaving(true);
    try {
      await completeProfile(role, name.trim(), trainerId.trim() || null);
    } catch (err) {
      setError('Failed to create profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page">
      <button className="login-theme-toggle btn-icon" onClick={toggleTheme}>
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
      <div className="card login-card role-select-card">
        <div className="login-logo">
          Elite<span>Pro</span>
        </div>
        <h2 className="role-select-title">Welcome! Set up your profile</h2>
        <p className="role-select-subtitle">
          Signed in as <strong>{firebaseUser?.email}</strong>
        </p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div className="role-cards">
            <button
              type="button"
              className={`role-card ${role === 'trainer' ? 'role-card-active' : ''}`}
              onClick={() => setRole('trainer')}
            >
              <Users size={32} />
              <strong>Trainer</strong>
              <span>Manage clients &amp; create plans</span>
            </button>
            <button
              type="button"
              className={`role-card ${role === 'client' ? 'role-card-active' : ''}`}
              onClick={() => setRole('client')}
            >
              <Dumbbell size={32} />
              <strong>Client</strong>
              <span>Track workouts &amp; progress</span>
            </button>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              className="form-input" required
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Trainer ID (for clients) */}
          {role === 'client' && (
            <div className="form-group">
              <label className="form-label">Trainer ID <span className="text-muted">(optional)</span></label>
              <input
                className="form-input"
                value={trainerId} onChange={e => setTrainerId(e.target.value)}
                placeholder="Enter your trainer's ID to connect"
              />
              <small className="form-hint">Ask your trainer for their ID, or skip and connect later.</small>
            </div>
          )}

          <button type="submit" className="btn btn-primary mt-16" style={{ width: '100%' }} disabled={saving}>
            {saving ? 'Creating...' : 'Get Started'} {!saving && <ArrowRight size={16} />}
          </button>
        </form>

        <button className="btn-link mt-16" onClick={logout}>
          <LogOut size={14} /> Sign out and use a different account
        </button>
      </div>
    </div>
  );
}
