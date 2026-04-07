import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Save, RotateCcw, LogOut, Copy, Share2, Link, Check, Mail, KeyRound, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Detect auth provider from Firebase user object
function getAuthProvider(firebaseUser) {
  if (!firebaseUser) return 'demo';
  const provider = firebaseUser.providerData?.[0]?.providerId;
  if (provider === 'google.com') return 'google';
  if (provider === 'password') return 'email';
  return 'demo';
}

export default function ProfilePage() {
  const { currentUser, firebaseUser, updateClient, resetData, logout, sendPasswordReset, getInviteCode, connectToTrainer, getClient } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const isTrainer = currentUser.role === 'trainer';
  const authProvider = getAuthProvider(firebaseUser);
  const isDemo = authProvider === 'demo';
  const isFirebaseAuth = !isDemo;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: currentUser.name || '',
    email: currentUser.email || '',
    ...(isTrainer
      ? { speciality: currentUser.speciality || '' }
      : {
          age: currentUser.age || '',
          height: currentUser.height || '',
          goals: currentUser.goals || '',
        }
    ),
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Trainer: invite code state
  const [inviteCode, setInviteCode] = useState(currentUser.inviteCode || '');
  const [codeCopied, setCodeCopied] = useState(false);

  // Client: connect to trainer
  const [connectCode, setConnectCode] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Load invite code for trainer
  useEffect(() => {
    if (isTrainer && !inviteCode) {
      getInviteCode(currentUser.id).then(code => { if (code) setInviteCode(code); });
    }
  }, [isTrainer, currentUser.id]);

  // Get trainer name for client
  const trainerName = !isTrainer && currentUser.trainerId
    ? getClient(currentUser.trainerId)?.name || 'Unknown'
    : null;

  const handleSave = (e) => {
    e.preventDefault();
    const updates = { ...form };
    // Don't allow Firebase Auth users to change email — managed by provider
    if (isFirebaseAuth) delete updates.email;
    if (!isTrainer) {
      updates.age = Number(updates.age) || currentUser.age;
      updates.height = Number(updates.height) || currentUser.height;
    }
    updateClient(currentUser.id, updates);
    setEditing(false);
    toast('Profile updated');
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordReset(currentUser.email);
      toast(`Password reset email sent to ${currentUser.email}`);
    } catch (err) {
      toast(err.message || 'Failed to send reset email', 'error');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCodeCopied(true);
      toast('Invite code copied!');
      setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => toast('Failed to copy', 'error'));
  };

  const handleShareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join ElitePro',
        text: `Join me on ElitePro! Use invite code: ${inviteCode}`,
      }).catch(() => {});
    } else {
      handleCopyCode();
    }
  };

  const handleConnect = async () => {
    if (!connectCode.trim()) return;
    setConnecting(true);
    const result = await connectToTrainer(currentUser.id, connectCode.trim());
    if (result.success) {
      toast(`Connected to ${result.trainer.name}!`);
      setConnectCode('');
    } else {
      toast(result.error, 'error');
    }
    setConnecting(false);
  };

  const handleReset = () => {
    resetData();
    logout();
    toast('All data reset to defaults', 'info');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="card mb-16">
        <div className="profile-header">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt="" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar">
              {currentUser.name?.[0]}
            </div>
          )}
          <div className="profile-header-info">
            <h2 className="profile-name">{currentUser.name}</h2>
            <span className={`tag ${isTrainer ? 'tag-accent' : 'tag-primary'}`}>{isTrainer ? 'Trainer' : 'Client'}</span>
          </div>
        </div>

        {!editing ? (
          <div className="profile-details">
            <div className="profile-field">
              <span className="profile-field-label">Email</span>
              <span className="profile-field-value">{currentUser.email}</span>
            </div>
            {isTrainer ? (
              <div className="profile-field">
                <span className="profile-field-label">Speciality</span>
                <span className="profile-field-value">{currentUser.speciality || '—'}</span>
              </div>
            ) : (
              <>
                <div className="profile-field">
                  <span className="profile-field-label">Coach</span>
                  <span className="profile-field-value">{trainerName || 'Not connected'}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Age</span>
                  <span className="profile-field-value">{currentUser.age || '—'}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Height</span>
                  <span className="profile-field-value">{currentUser.height ? `${currentUser.height} cm` : '—'}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Goals</span>
                  <span className="profile-field-value">{currentUser.goals || '—'}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Joined</span>
                  <span className="profile-field-value">{currentUser.joinDate || '—'}</span>
                </div>
              </>
            )}
            <button className="btn btn-primary mt-16" onClick={() => setEditing(true)}>
              <User size={16} /> Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="profile-form">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">
                Email {isFirebaseAuth && <span className="text-muted">(managed by {authProvider === 'google' ? 'Google' : 'login provider'})</span>}
              </label>
              <input
                className="form-input"
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={isFirebaseAuth}
              />
            </div>
            {isTrainer ? (
              <div className="form-group">
                <label className="form-label">Speciality</label>
                <input className="form-input" value={form.speciality} onChange={e => setForm({ ...form, speciality: e.target.value })} />
              </div>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input className="form-input" type="number" min="10" max="100" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Height (cm)</label>
                    <input className="form-input" type="number" min="100" max="250" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Goals</label>
                  <textarea className="form-textarea" value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} rows={3} />
                </div>
              </>
            )}
            <div className="flex gap-8 mt-16">
              <button type="submit" className="btn btn-primary"><Save size={16} /> Save</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Trainer: Invite Code Card */}
      {isTrainer && inviteCode && (
        <div className="card mb-16">
          <h3 className="card-title mb-8">Invite Code</h3>
          <p className="invite-desc">Share this code with your clients so they can connect to you.</p>
          <div className="invite-code-display">
            <span className="invite-code-text">{inviteCode}</span>
          </div>
          <div className="flex gap-8 mt-12">
            <button className="btn btn-primary" onClick={handleCopyCode}>
              {codeCopied ? <Check size={16} /> : <Copy size={16} />}
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn btn-outline" onClick={handleShareCode}>
              <Share2 size={16} /> Share
            </button>
          </div>
        </div>
      )}

      {/* Client: Connect to Trainer */}
      {!isTrainer && !currentUser.trainerId && (
        <div className="card mb-16">
          <h3 className="card-title mb-8">Connect to Trainer</h3>
          <p className="invite-desc">Enter your trainer's invite code to connect.</p>
          <div className="invite-connect-row">
            <input
              className="form-input invite-input"
              placeholder="Enter 6-digit code"
              value={connectCode}
              onChange={e => setConnectCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button className="btn btn-primary" onClick={handleConnect} disabled={connecting || connectCode.length < 6}>
              <Link size={16} /> {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="card mb-16">
        <h3 className="card-title mb-16">Account</h3>
        <div className="profile-field">
          <span className="profile-field-label">Role</span>
          <span className="profile-field-value" style={{ textTransform: 'capitalize' }}>{currentUser.role}</span>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">Sign-in method</span>
          <span className="profile-field-value">
            {authProvider === 'google' && <span className="auth-badge auth-badge-google">Google</span>}
            {authProvider === 'email' && <span className="auth-badge auth-badge-email"><Mail size={12} /> Email</span>}
            {authProvider === 'demo' && <span className="auth-badge auth-badge-demo">Demo Account</span>}
          </span>
        </div>

        {/* Change Password — only for Email/Password Firebase Auth users */}
        {authProvider === 'email' && (
          <button className="btn btn-outline mt-16" onClick={handlePasswordReset} style={{ width: '100%' }}>
            <KeyRound size={16} /> Send Password Reset Email
          </button>
        )}

        <button className="btn btn-outline mt-8" onClick={() => { logout(); navigate('/'); }} style={{ width: '100%' }}>
          <LogOut size={16} /> Log Out
        </button>
      </div>

      {/* Demo Warning */}
      {isDemo && (
        <div className="card demo-warning mb-16">
          <div className="demo-warning-header">
            <AlertTriangle size={18} />
            <strong>Demo Account</strong>
          </div>
          <p>You are using a shared demo account. Data is visible to anyone using the same demo. For private data, please sign up with Google or Email.</p>
        </div>
      )}

      {/* Danger Zone — only for demo accounts */}
      {isDemo && (
        <div className="card profile-danger-zone">
          <h3 className="card-title mb-8">Danger Zone</h3>
          <p className="profile-danger-text">Reset all demo data to defaults. This will log you out and erase all changes made by all demo users.</p>
          {!showResetConfirm ? (
            <button className="btn btn-outline btn-danger mt-8" onClick={() => setShowResetConfirm(true)}>
              <RotateCcw size={16} /> Reset Demo Data
            </button>
          ) : (
            <div className="flex gap-8 mt-8">
              <button className="btn btn-danger" onClick={handleReset}>Confirm Reset</button>
              <button className="btn btn-outline" onClick={() => setShowResetConfirm(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
