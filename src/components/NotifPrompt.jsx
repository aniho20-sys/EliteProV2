import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';

const DISMISSED_KEY = 'elitepro_notif_prompt_dismissed_until';
const DISMISS_DAYS = 7;

function isDismissed() {
  const until = localStorage.getItem(DISMISSED_KEY);
  return until && Date.now() < Number(until);
}

export default function NotifPrompt() {
  const { permission, supported, requestPermission } = useNotifications();
  const { currentUser } = useApp();
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!supported || permission !== 'default' || isDismissed() || !currentUser) return;
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, [supported, permission, currentUser]);

  const handleEnable = async () => {
    setRequesting(true);
    await requestPermission(currentUser.id);
    setRequesting(false);
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 86400_000));
    setShow(false);
  };

  // Hide as soon as permission is granted or denied, even if the show timer already fired
  if (!show || permission !== 'default') return null;

  const subtitle = currentUser?.role === 'trainer'
    ? 'Get alerts when clients message or log workouts'
    : 'Get alerts when your coach messages or books a session';

  return (
    <div className="install-banner">
      <div className="install-banner-icon">
        <Bell size={20} color="var(--primary)" />
      </div>
      <div className="install-banner-text">
        <strong>{t('chrome.notif_title')}</strong>
        <span>{subtitle}</span>
      </div>
      <button
        className="btn btn-sm btn-primary install-banner-cta"
        onClick={handleEnable}
        disabled={requesting}
      >
        <Bell size={14} />{requesting ? t('chrome.notif_enabling') : t('chrome.notif_enable')}
      </button>
      <button className="btn-icon install-banner-close" onClick={handleDismiss} aria-label={t('common.dismiss')}>
        <X size={16} />
      </button>
    </div>
  );
}
