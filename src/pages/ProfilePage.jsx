import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Save, RotateCcw, LogOut, Copy, Share2, Link2, Check, Mail, KeyRound, AlertTriangle, Trash2, Bell, BellOff, Star, ChevronRight, Smartphone, Dumbbell, CreditCard, ClipboardList } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { friendlyAuthError } from '../utils/authErrors';
import { passwordResetNotice, passwordResetError } from '../utils/passwordReset';
import { reauthenticateWithPopup, reauthenticateWithCredential, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { isIOS, isStandalone } from '../utils/deviceUtils';
import { CURRENCIES } from '../utils/currencyUtils';
import { SkeletonLine } from '../components/Skeleton';
import MovementPatternScanner from '../components/MovementPatternScanner';
import PlatformStatsCard from '../components/PlatformStatsCard';

function InstallAppCard() {
  if (isStandalone()) {
    return (
      <div className="card mb-16 install-app-card install-app-done">
        <Smartphone size={18} style={{ color: 'var(--success)' }} />
        <div>
          <div className="fw-bold" style={{ color: 'var(--success)' }}>App Installed</div>
          <div className="text-sm text-muted">ElitePro is running as a native app on your device.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="card mb-16 install-app-card">
      <div className="install-app-header">
        <Smartphone size={18} style={{ color: 'var(--primary-light)' }} />
        <div>
          <div className="fw-bold">Install as App</div>
          <div className="text-sm text-muted">Use offline · Faster · Feels native</div>
        </div>
      </div>
      {isIOS() ? (
        <ol className="install-steps">
          <li>Tap the <Share2 size={13} style={{ verticalAlign: -2 }} /> <strong>Share</strong> button in Safari</li>
          <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong></li>
          <li>Tap <strong>&ldquo;Add&rdquo;</strong> in the top-right corner</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>Open the browser <strong>menu (⋮)</strong> in the top-right corner</li>
          <li>Tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> or <strong>&ldquo;Install App&rdquo;</strong></li>
          <li>Confirm to install — look for the banner at the top of this page too</li>
        </ol>
      )}
    </div>
  );
}

// Detect auth provider from Firebase user object
function getAuthProvider(firebaseUser) {
  if (!firebaseUser) return 'unknown';
  const provider = firebaseUser.providerData?.[0]?.providerId;
  if (provider === 'google.com') return 'google';
  if (provider === 'password') return 'email';
  return 'unknown';
}

export default function ProfilePage() {
  const { currentUser, firebaseUser, updateClient, logout, sendPasswordReset, getInviteCode, connectToTrainer, getClient, deleteAccount, getExercises, getGcConnection, startGcConnect, disconnectGc } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { permission: notifPermission, supported: notifSupported, requestPermission: requestNotifPermission, token: fcmToken } = useNotifications();
  const isTrainer = currentUser.role === 'trainer';
  const authProvider = getAuthProvider(firebaseUser);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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

  // Trainer: business name (shown on printed invoices; falls back to trainer name if unset)
  const [businessName, setBusinessName] = useState(currentUser.businessName || '');
  const [businessNameSaving, setBusinessNameSaving] = useState(false);

  // Trainer: renewal pricing (shown to clients when they run low on sessions)
  const [renewalRate, setRenewalRate] = useState(currentUser.renewalRate ?? '');
  const [renewalRateNext, setRenewalRateNext] = useState(currentUser.renewalRateNext ?? '');
  const [renewalCurrency, setRenewalCurrency] = useState(currentUser.currency || 'GBP');
  const [renewalSaving, setRenewalSaving] = useState(false);

  // Trainer: bank details (shown to clients in the renewal payment sheet)
  const [bankDetails, setBankDetails] = useState({
    accountName: currentUser.bankDetails?.accountName || '',
    sortCode: currentUser.bankDetails?.sortCode || '',
    accountNumber: currentUser.bankDetails?.accountNumber || '',
  });
  const [bankSaving, setBankSaving] = useState(false);

  // Client: connect to trainer
  const [connectCode, setConnectCode] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Trainer: exercise library export (copy-as-JSON — no terminal/CLI access assumed)
  const [exportCopied, setExportCopied] = useState(false);
  const exportCopiedTimer = useRef(null);

  // Trainer: GoCardless connection (Phase 3)
  const [gcConnection, setGcConnection] = useState(null);
  const [gcLoading, setGcLoading] = useState(true);
  const [gcConnecting, setGcConnecting] = useState(false);
  const [gcDisconnecting, setGcDisconnecting] = useState(false);
  const [showGcDisconnectConfirm, setShowGcDisconnectConfirm] = useState(false);

  // Load invite code for trainer
  // getInviteCode/inviteCode deliberately excluded: getInviteCode is recreated on every
  // AppContext render, and re-running while inviteCode is still empty would issue
  // repeated generate+write calls before the first one resolves.
  useEffect(() => {
    if (isTrainer && !inviteCode) {
      getInviteCode(currentUser.id).then(code => { if (code) setInviteCode(code); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrainer, currentUser.id]);

  // Load GoCardless connection status
  useEffect(() => {
    if (!isTrainer) { setGcLoading(false); return; }
    getGcConnection(currentUser.id).then(conn => {
      setGcConnection(conn);
      setGcLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrainer, currentUser.id]);

  // Handle the ?gc=connected|cancelled|error|not-configured redirect from
  // gcOAuthCallback, then clean it out of the URL so a refresh doesn't
  // re-show the toast.
  useEffect(() => {
    if (!isTrainer) return;
    const gcStatus = new URLSearchParams(location.search).get('gc');
    if (!gcStatus) return;

    if (gcStatus === 'connected') {
      toast('GoCardless connected');
      getGcConnection(currentUser.id).then(setGcConnection);
    } else if (gcStatus === 'cancelled') {
      toast('You cancelled the GoCardless connection — you can try again anytime.', 'info');
    } else if (gcStatus === 'not-configured') {
      toast('GoCardless isn\'t set up yet — check back soon.', 'info');
    } else {
      toast('GoCardless connection failed — please try again.', 'error');
    }
    navigate('/profile', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrainer, location.search]);

  const handleGcConnect = async () => {
    setGcConnecting(true);
    try {
      const url = await startGcConnect();
      window.location.href = url;
    } catch (err) {
      toast(
        err?.code === 'functions/failed-precondition'
          ? 'GoCardless isn\'t set up yet — check back soon.'
          : 'Could not start GoCardless connection',
        err?.code === 'functions/failed-precondition' ? 'info' : 'error'
      );
      setGcConnecting(false);
    }
  };

  const handleGcDisconnect = async () => {
    setGcDisconnecting(true);
    try {
      await disconnectGc();
      setGcConnection(prev => ({ ...prev, status: 'disconnected' }));
      toast('GoCardless disconnected');
    } catch {
      toast('Failed to disconnect — please try again', 'error');
    } finally {
      setGcDisconnecting(false);
      setShowGcDisconnectConfirm(false);
    }
  };

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

  // Here the address is the signed-in user's own, so the account definitely exists and the
  // app can promise the email outright — unlike the sign-in page, where the address is
  // typed and unverifiable.
  const handlePasswordReset = async () => {
    if (resettingPassword) return;
    setResettingPassword(true);
    try {
      await sendPasswordReset(currentUser.email);
      toast(passwordResetNotice(currentUser.email, { accountKnown: true }), 'success', 6000);
    } catch (err) {
      toast(passwordResetError(err) || friendlyAuthError(err) || 'Failed to send reset email. Please try again.', 'error');
    } finally {
      setResettingPassword(false);
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

  const handleShareWhatsApp = () => {
    const msg = `Hey! I use ElitePro to manage my training. Join me and we can track your progress together 💪\n\nUse my invite code: *${inviteCode}*\nOr tap here: ${INVITE_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
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

  const handleSaveBusinessName = async () => {
    setBusinessNameSaving(true);
    try {
      await updateClient(currentUser.id, { businessName: businessName.trim() });
      toast('Business name saved');
    } catch {
      toast('Failed to save business name', 'error');
    } finally {
      setBusinessNameSaving(false);
    }
  };

  const handleSaveRenewalRates = async () => {
    const rate = Number(renewalRate);
    const rateNext = Number(renewalRateNext);
    if (!rate || rate <= 0 || !rateNext || rateNext <= 0) {
      toast('Enter both rates as numbers greater than 0', 'error');
      return;
    }
    setRenewalSaving(true);
    try {
      await updateClient(currentUser.id, { renewalRate: rate, renewalRateNext: rateNext, currency: renewalCurrency });
      toast('Renewal rates saved');
    } catch {
      toast('Failed to save renewal rates', 'error');
    } finally {
      setRenewalSaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    setBankSaving(true);
    try {
      await updateClient(currentUser.id, { bankDetails });
      toast('Bank details saved');
    } catch {
      toast('Failed to save bank details', 'error');
    } finally {
      setBankSaving(false);
    }
  };

  const handleExportExercises = () => {
    const list = getExercises();
    navigator.clipboard.writeText(JSON.stringify(list, null, 2)).then(() => {
      setExportCopied(true);
      toast(`Copied ${list.length} exercises as JSON`);
      clearTimeout(exportCopiedTimer.current);
      exportCopiedTimer.current = setTimeout(() => setExportCopied(false), 2000);
    }).catch(() => toast('Failed to copy', 'error'));
  };

  const handleConnect = async () => {
    if (!connectCode.trim()) return;
    setConnecting(true);
    try {
      const result = await connectToTrainer(currentUser.id, connectCode.trim());
      if (result.success) {
        toast(`Connected to Coach ${result.trainer.name}!`);
        setConnectCode('');
      } else {
        toast(result.error, 'error');
      }
    } catch (err) {
      console.error('[handleConnect]', err);
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const fbUser = auth.currentUser;
      if (fbUser) {
        if (authProvider === 'google') {
          await reauthenticateWithPopup(fbUser, new GoogleAuthProvider());
        } else if (authProvider === 'email') {
          const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
          await reauthenticateWithCredential(fbUser, credential);
        }
      }
      await deleteAccount();
      toast('Account deleted', 'info');
      navigate('/');
    } catch (err) {
      toast(friendlyAuthError(err) || 'Failed to delete account. Please try again.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      setDeletePassword('');
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
          <h3 className="card-title mb-8">Invite Clients</h3>
          <p className="invite-desc">Share your invite link so clients can connect to you instantly.</p>
          <div className="invite-code-display">
            <span className="invite-code-text">{inviteCode}</span>
          </div>
          <button
            className="btn btn-whatsapp mt-12"
            onClick={handleShareWhatsApp}
            style={{ width: '100%', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 16px', fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share via WhatsApp
          </button>
          <div className="flex gap-8 mt-8" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleCopyLink}>
              {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleCopyCode}>
              {codeCopied ? <Check size={16} /> : <Copy size={16} />}
              {codeCopied ? 'Copied!' : 'Copy Code'}
            </button>
            {navigator.share && (
              <button className="btn btn-outline" onClick={handleShareCode} aria-label="More share options">
                <Share2 size={16} />
              </button>
            )}
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

      {/* Trainer: Business Details */}
      {isTrainer && (
        <div className="card mb-16">
          <h3 className="card-title mb-8">Business Details</h3>
          <p className="invite-desc">Shown on printed invoices. Leave blank to use your name instead.</p>
          <div className="form-group mt-8">
            <label className="form-label">Business name</label>
            <input className="form-input" placeholder="e.g. Peak Form Personal Training" value={businessName}
              onChange={e => setBusinessName(e.target.value)} />
          </div>
          <button className="btn btn-primary mt-8" onClick={handleSaveBusinessName} disabled={businessNameSaving}>
            <Save size={16} /> {businessNameSaving ? 'Saving...' : 'Save Business Name'}
          </button>
        </div>
      )}

      {/* Trainer: Renewal Pricing */}
      {isTrainer && (
        <div className="card mb-16">
          <h3 className="card-title mb-8">Renewal Pricing</h3>
          <p className="invite-desc">Shown to clients when they run low on sessions, so they know what renewing now vs. later costs.</p>
          <div className="form-row mt-8">
            <div className="form-group">
              <label className="form-label">Current rate (per session)</label>
              <input type="number" min="0" inputMode="decimal" className="form-input" placeholder="65"
                value={renewalRate} onChange={e => setRenewalRate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate after sessions run out</label>
              <input type="number" min="0" inputMode="decimal" className="form-input" placeholder="70"
                value={renewalRateNext} onChange={e => setRenewalRateNext(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={renewalCurrency} onChange={e => setRenewalCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary mt-8" onClick={handleSaveRenewalRates} disabled={renewalSaving}>
            <Save size={16} /> {renewalSaving ? 'Saving...' : 'Save Rates'}
          </button>
        </div>
      )}

      {/* Trainer: Bank Details */}
      {isTrainer && (
        <div className="card mb-16">
          <h3 className="card-title mb-8">Bank Details</h3>
          <p className="invite-desc">Shown to clients in the renewal payment sheet so they can pay you directly.</p>
          <div className="form-group mt-8">
            <label className="form-label">Account name</label>
            <input className="form-input" placeholder="Name on your bank account" value={bankDetails.accountName}
              onChange={e => setBankDetails(b => ({ ...b, accountName: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sort code</label>
              <input className="form-input" placeholder="e.g. 12-34-56" value={bankDetails.sortCode}
                onChange={e => setBankDetails(b => ({ ...b, sortCode: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Account number</label>
              <input className="form-input" placeholder="e.g. 12345678" value={bankDetails.accountNumber}
                onChange={e => setBankDetails(b => ({ ...b, accountNumber: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary mt-8" onClick={handleSaveBankDetails} disabled={bankSaving}>
            <Save size={16} /> {bankSaving ? 'Saving...' : 'Save Bank Details'}
          </button>
        </div>
      )}

      {/* Trainer: GoCardless Connection (Phase 3) */}
      {isTrainer && (
        <div className="card mb-16">
          <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} /> GoCardless Connection
          </h3>
          <p className="invite-desc">Connect your own GoCardless account to enable subscription billing for your clients.</p>
          {gcLoading ? (
            <SkeletonLine width="60%" />
          ) : gcConnection?.status === 'connected' ? (
            <div className="mt-8">
              <div className="flex gap-8 mb-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="tag tag-accent">Connected</span>
                <span className="tag tag-primary" style={{ textTransform: 'capitalize' }}>{gcConnection.environment}</span>
              </div>
              <p className="text-sm text-muted mb-12">
                Connected on {gcConnection.connectedAt
                  ? new Date(gcConnection.connectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
              <button className="btn btn-outline" onClick={() => setShowGcDisconnectConfirm(true)} style={{ width: '100%' }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn btn-primary mt-8" onClick={handleGcConnect} disabled={gcConnecting} style={{ width: '100%' }}>
              <CreditCard size={16} /> {gcConnecting ? 'Connecting...' : 'Connect GoCardless'}
            </button>
          )}
        </div>
      )}

      {/* Trainer: Exercise Library Backup/Export */}
      {isTrainer && (
        <div className="card mb-16">
          <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dumbbell size={18} /> Exercise Library Backup
          </h3>
          <p className="invite-desc">Export your exercise library as JSON for safekeeping.</p>
          <button className="btn btn-outline mt-8" onClick={handleExportExercises} style={{ width: '100%' }}>
            {exportCopied ? <Check size={16} /> : <Copy size={16} />}
            {exportCopied ? 'Copied!' : 'Copy Exercise Library as JSON'}
          </button>
        </div>
      )}

      {isTrainer && <MovementPatternScanner />}

      {/* Renders only for the owner — the component hides itself when the Cloud Function
          refuses the call, so no role list needs maintaining here. */}
      {isTrainer && <PlatformStatsCard />}

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
              <Link2 size={16} /> {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Client: Training Profile — accessible anytime, not just at onboarding */}
      {!isTrainer && (
        <div className="card mb-16">
          {currentUser.intakeCompleted ? (
            <>
              <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={18} /> Training Profile
              </h3>
              <p className="invite-desc">Your goals, experience, and any injuries your coach should know about.</p>
              <button className="btn btn-outline mt-8" style={{ width: '100%' }} onClick={() => navigate('/training-profile')}>
                Edit Training Profile
              </button>
            </>
          ) : (
            <div className="flex gap-8" style={{ alignItems: 'flex-start' }}>
              <ClipboardList size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div className="fw-bold" style={{ marginBottom: 2 }}>Complete your training profile</div>
                <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Help your coach plan your sessions safely — takes 2 minutes.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/training-profile')}>
                  Complete Training Profile
                </button>
              </div>
            </div>
          )}
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
            {/* Developer tools. Gated on the dev build, not on role: a trainer is a
                customer, and "Send Test" / "Re-register Token" are things only whoever is
                debugging the FCM setup should ever see. */}
            {import.meta.env.DEV && (
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
            )}
            {/* Same recovery path for everyone. Trainers used to get a red warning telling
                them to tap a debug button, which is now gone — and which was never a
                sensible thing to show a customer anyway. */}
            {!fcmToken && (
              <div className="mt-8">
                <p className="text-sm text-muted mb-8" style={{ fontSize: '0.8rem' }}>Notifications aren&apos;t fully set up on this device yet.</p>
                <button className="btn btn-sm btn-primary" onClick={() => requestNotifPermission(currentUser.id)}>
                  <Bell size={14} /> Enable Notifications
                </button>
              </div>
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


      {/* Install App */}
      <InstallAppCard />

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
          </span>
        </div>

        {/* Change Password — only for Email/Password Firebase Auth users */}
        {authProvider === 'email' && (
          <button className="btn btn-outline mt-16" onClick={handlePasswordReset} disabled={resettingPassword} style={{ width: '100%' }}>
            <KeyRound size={16} /> Send Password Reset Email
          </button>
        )}

        <button className="btn btn-outline mt-8" onClick={() => { logout(); navigate('/'); }} style={{ width: '100%' }}>
          <LogOut size={16} /> Log Out
        </button>
      </div>

      {/* Danger Zone */}
      <div className="card profile-danger-zone">
        <h3 className="card-title mb-8">Danger Zone</h3>

        <p className="profile-danger-text">
          Permanently delete your account. Your profile and body stats will be removed.
          Workout logs and message history will remain as orphan data for your coach&apos;s records.
          <strong> This action cannot be undone.</strong>
        </p>
        <button className="btn btn-danger mt-8" onClick={() => setShowDeleteModal(true)}>
          <Trash2 size={16} /> Delete Account
        </button>
      </div>

      {/* Disconnect GoCardless Confirmation Modal */}
      {showGcDisconnectConfirm && (
        <div className="modal-overlay" onClick={() => !gcDisconnecting && setShowGcDisconnectConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Disconnect GoCardless?
            </h3>
            <p className="text-sm text-muted">
              This will stop all subscription payment collection for your clients immediately.
              Existing subscriptions will need to be reconnected before payments can resume —
              this does not cancel them in GoCardless itself.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowGcDisconnectConfirm(false)} disabled={gcDisconnecting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleGcDisconnect} disabled={gcDisconnecting}>
                {gcDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {authProvider === 'email' && (
              <div className="form-group mt-8">
                <label className="form-label">Enter your password to confirm</label>
                <input
                  className="form-input"
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  autoFocus
                />
              </div>
            )}
            <p className="profile-danger-text mt-8">
              Type <code>DELETE</code> to confirm:
            </p>
            <input
              className="form-input"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus={authProvider !== 'email'}
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
                disabled={deleteConfirmText !== 'DELETE' || deleting || (authProvider === 'email' && !deletePassword)}
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
