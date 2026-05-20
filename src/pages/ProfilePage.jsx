import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Save, RotateCcw, LogOut, Copy, Share2, Link, Link2, Check, Mail, KeyRound, AlertTriangle, Trash2, Bell, BellOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { friendlyAuthError } from '../utils/authErrors';

// Detect auth provider from Firebase user object
function getAuthProvider(firebaseUser) {
  if (!firebaseUser) return 'demo';
  const provider = firebaseUser.providerData?.[0]?.providerId;
  if (provider === 'google.com') return 'google';
  if (provider === 'password') return 'email';
  return 'demo';
}

export default function ProfilePage() {
  const { currentUser, firebaseUser, updateClient, resetData, logout, sendPasswordReset, getInviteCode, connectToTrainer, getClient, deleteAccount } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const { permission: notifPermission, supported: notifSupported, requestPermission: requestNotifPermission, token: fcmToken } = useNotifications();
  const isTrainer = currentUser.role === 'trainer';
  const authProvider = getAuthProvider(firebaseUser);
  // Demo = explicit isDemo flag on profile (seeded demo coach) OR no Firebase Auth at all
  const isDemo = currentUser?.isDemo === true || authProvider === 'demo';
  const isFirebaseAuth = !!firebaseUser;

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Trainer: invite code state
  const [inviteCode, setInviteCode] = useState(currentUser.inviteCode || '');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const codeCopiedTimer = useRef(null);
  const linkCopiedTimer = useRef(null);
  const INVITE_URL = `https://elitepro-16718.web.app/#/?invite=${inviteCode}`;

  // Trainer: working hours
  const [workHours, setWorkHours] = useState({
    start: currentUser.workingHours?.start || '09:00',
    end: currentUser.workingHours?.end || '17:00',
  });
  const [whSaving, setWhSaving] = useState(false);

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
      toast(friendlyAuthError(err) || 'Failed to send reset email. Please try again.', 'error');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCodeCopied(true);
      toast('Invite code copied!');
      clearTimeout(codeCopiedTimer.current);
      codeCopiedTimer.current = setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => toast('Failed to copy', 'error'));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(INVITE_URL)
      .then(() => {
        setLinkCopied(true);
        toast('Invite link copied!');
        clearTimeout(linkCopiedTimer.current);
        linkCopiedTimer.current = setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => toast('Failed to copy', 'error'));
  };

  const handleShareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on ElitePro',
        text: `Your coach has invited you to ElitePro! Use invite code: ${inviteCode} or tap the link.`,
        url: INVITE_URL,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleSaveWorkHours = async () => {
    if (workHours.start >= workHours.end) {
      toast('End time must be after start time', 'error');
      return;
    }
    setWhSaving(true);
    try {
      await updateClient(currentUser.id, { workingHours: workHours });
      toast('Working hours saved');
    } catch {
      toast('Failed to save working hours', 'error');
    } finally {
      setWhSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!connectCode.trim()) return;
    setConnecting(true);
    const result = await connectToTrainer(currentUser.id, connectCode.trim());
    if (result.success) {
      toast(`Connected to Coach ${result.trainer.name}!`);
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast('Account deleted', 'info');
      navigate('/');
    } catch (err) {
      toast(friendlyAuthError(err) || 'Failed to delete account. Please try again.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
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
          <div className="flex gap-8 mt-12" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleCopyCode}>
              {codeCopied ? <Check size={16} /> : <Copy size={16} />}
              {codeCopied ? 'Copied!' : 'Copy Code'}
            </button>
            <button className="btn btn-outline" onClick={handleCopyLink}>
              {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
            <button className="btn btn-outline" onClick={handleShareCode}>
              <Share2 size={16} /> Share
            </button>
          </div>
        </div>
      )}

      {/* Trainer: Working Hours */}
      {isTrainer && (
        <div className="card mb-16">
          <h3 className="card-title mb-8">Working Hours</h3>
          <p className="invite-desc">Set your available hours so clients can only book within this window.</p>
          <div className="form-row mt-8">
            <div className="form-group">
              <label className="form-label">Start</label>
              <input type="time" className="form-input" value={workHours.start}
                onChange={e => setWorkHours(h => ({ ...h, start: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End</label>
              <input type="time" className="form-input" value={workHours.end}
                onChange={e => setWorkHours(h => ({ ...h, end: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary mt-8" onClick={handleSaveWorkHours} disabled={whSaving}>
            <Save size={16} /> {whSaving ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      )}

      {/* Client: Connect to Coach */}
      {!isTrainer && !currentUser.trainerId && (
        <div className="card mb-16">
          <h3 className="card-title mb-8">Connect to Coach</h3>
          <p className="invite-desc">Enter your coach&apos;s invite code to connect.</p>
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

      {/* Notifications */}
      <div className="card mb-16">
        <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} /> Notifications
        </h3>
        {!notifSupported ? (
          <p className="text-sm text-muted">Push notifications are not supported on this browser. Try adding the app to your home screen first.</p>
        ) : notifPermission === 'granted' ? (
          <div>
            <div className="flex gap-8 mb-12" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="tag tag-accent">Enabled</span>
              <span className="text-sm text-muted">You'll receive push notifications for messages and session updates</span>
            </div>
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-outline" onClick={() => {
                new Notification('ElitePro Test 🔔', { body: 'Push notifications are working!', icon: '/favicon.svg' });
                toast('Test notification sent!');
              }}>
                <Bell size={14} /> Send Test
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => requestNotifPermission(currentUser.id)}>
                <RotateCcw size={14} /> Re-register Token
              </button>
            </div>
            {fcmToken && (
              <p className="text-sm text-muted mt-8" style={{ wordBreak: 'break-all', fontSize: '0.72rem' }}>
                Token: {fcmToken.slice(0, 20)}…{fcmToken.slice(-10)}
              </p>
            )}
            {!fcmToken && (
              <p className="text-sm mt-8" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>
                ⚠️ Token not registered — tap Re-register Token
              </p>
            )}
          </div>
        ) : notifPermission === 'denied' ? (
          <div>
            <div className="flex gap-8 mb-8" style={{ alignItems: 'center' }}>
              <BellOff size={16} style={{ color: 'var(--danger)' }} />
              <span className="text-sm" style={{ color: 'var(--danger)' }}>Notifications blocked</span>
            </div>
            <p className="text-sm text-muted">To enable, go to your browser settings and allow notifications for this site.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-12">Get notified when you receive messages or when sessions are scheduled.</p>
            <button className="btn btn-primary" onClick={() => requestNotifPermission(currentUser.id)}>
              <Bell size={16} /> Enable Push Notifications
            </button>
          </>
        )}
      </div>

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

      {/* Danger Zone */}
      <div className="card profile-danger-zone">
        <h3 className="card-title mb-8">Danger Zone</h3>

        {isDemo && (
          <>
            <p className="profile-danger-text">Reset all demo data to defaults. This will log you out and erase all changes made on this demo account.</p>
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
            <hr className="mt-16 mb-16" style={{ border: 0, borderTop: '1px solid var(--border)' }} />
          </>
        )}

        <p className="profile-danger-text">
          Permanently delete your account. Your profile and body stats will be removed.
          Workout logs and message history will remain as orphan data for your coach&apos;s records.
          <strong> This action cannot be undone.</strong>
        </p>
        <button className="btn btn-danger mt-8" onClick={() => setShowDeleteModal(true)}>
          <Trash2 size={16} /> Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: 'var(--danger, #dc2626)' }}>
              <AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Delete Account
            </h3>
            <p className="profile-danger-text">
              You are about to permanently delete the account <strong>{currentUser.email}</strong>.
            </p>
            <ul className="profile-danger-text" style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Your profile and login will be removed</li>
              <li>Your body stats will be deleted</li>
              <li>Workout logs and messages will remain (orphaned)</li>
              {isTrainer && <li>Your clients will be disconnected from you</li>}
            </ul>
            <p className="profile-danger-text mt-8">
              Type <code>DELETE</code> to confirm:
            </p>
            <input
              className="form-input"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
              >
                <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
