import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Dumbbell, Users, Moon, Sun, ArrowRight, LogOut } from 'lucide-react';

export default function RoleSelectPage() {
  const { firebaseUser, completeProfile, findTrainerByCodeRemote, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [prefilledCode] = useState(() => {
    const code = sessionStorage.getItem('elitepro_invite_code') || '';
    sessionStorage.removeItem('elitepro_invite_code');
    return code;
  });
  const [role, setRole] = useState(prefilledCode ? 'client' : null);
  const [name, setName] = useState(firebaseUser?.displayName || '');
  const [inviteCode, setInviteCode] = useState(prefilledCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) { setError(t('role.err_select_role')); return; }
    if (!name.trim()) { setError(t('role.err_enter_name')); return; }
    setError('');
    setSaving(true);
    try {
      // Verify the code before creating the profile. Previously a wrong code was silently
      // ignored: the profile was created with trainerId null and the student landed in the
      // app believing they were connected to their coach.
      if (role === 'client' && inviteCode.trim()) {
        let trainer;
        try {
          trainer = await findTrainerByCodeRemote(inviteCode);
        } catch {
          setError(t('role.err_code_check'));
          return;
        }
        if (!trainer) {
          setError(t('role.err_code_invalid'));
          return;
        }
      }
      await completeProfile(role, name.trim(), inviteCode.trim() || null);
    } catch {
      setError(t('role.err_create_failed'));
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
        <h2 className="role-select-title">{t('role.title')}</h2>
        <p className="role-select-subtitle">
          {t('role.signed_in_as')} <strong>{firebaseUser?.email}</strong>
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
              <strong>{t('role.trainer')}</strong>
              <span>{t('role.trainer_desc')}</span>
            </button>
            <button
              type="button"
              className={`role-card ${role === 'client' ? 'role-card-active' : ''}`}
              onClick={() => setRole('client')}
            >
              <Dumbbell size={32} />
              <strong>{t('role.client')}</strong>
              <span>{t('role.client_desc')}</span>
            </button>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">{t('role.display_name')}</label>
            <input
              className="form-input" required
              value={name} onChange={e => setName(e.target.value)}
              placeholder={t('role.name_placeholder')}
            />
          </div>

          {/* Invite Code (for clients) */}
          {role === 'client' && (
            <div className="form-group">
              <label className="form-label">{t('role.invite_code')} <span className="text-muted">{t('common.optional')}</span></label>
              <input
                className="form-input"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder={t('role.code_placeholder')}
                maxLength={6}
              />
              {prefilledCode
                ? <small className="form-hint" style={{ color: 'var(--primary)' }}>{t('role.code_prefilled')}</small>
                : <small className="form-hint">{t('role.code_hint')}</small>
              }
            </div>
          )}

          <button type="submit" className="btn btn-primary mt-16" style={{ width: '100%' }} disabled={saving}>
            {saving ? t('role.creating') : t('role.get_started')} {!saving && <ArrowRight size={16} />}
          </button>
        </form>

        <button className="btn-link mt-16" onClick={logout}>
          <LogOut size={14} /> {t('role.use_different_account')}
        </button>
      </div>
    </div>
  );
}
