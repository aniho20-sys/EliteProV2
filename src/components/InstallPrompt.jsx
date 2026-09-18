import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { isIOS, isStandalone as isInStandaloneMode } from '../utils/deviceUtils';
import { useLanguage } from '../i18n/LanguageContext';

const DISMISSED_KEY = 'elitepro_install_dismissed_until';
const DISMISS_DAYS = 3;

function isDismissed() {
  const until = localStorage.getItem(DISMISSED_KEY);
  return until && Date.now() < Number(until);
}

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (isDismissed()) return;

    if (isIOS()) {
      const timer = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(timer);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        localStorage.setItem(DISMISSED_KEY, '1');
      }
      setDeferredPrompt(null);
    } else if (isIOS()) {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 86400_000));
    setShow(false);
    setShowIOSModal(false);
  };

  if (!show) return null;

  return (
    <>
      <div className="install-banner">
        <div className="install-banner-icon">
          <img src="/favicon.svg" alt="ElitePro" width={32} height={32} />
        </div>
        <div className="install-banner-text">
          <strong>{t('install.banner_title')}</strong>
          <span>{t('install.banner_sub')}</span>
        </div>
        <button className="btn btn-sm btn-primary install-banner-cta" onClick={handleInstall}>
          {isIOS() ? t('install.how') : <><Download size={14} /> {t('install.install')}</>}
        </button>
        <button className="btn-icon install-banner-close" onClick={handleDismiss} aria-label={t('install.dismiss')}>
          <X size={16} />
        </button>
      </div>

      {showIOSModal && (
        <div className="modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="modal ios-install-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('install.modal_title')}</h3>
              <button className="btn-icon" onClick={() => setShowIOSModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-muted mb-16">{t('install.modal_why')}</p>
            <div className="ios-install-steps">
              <div className="ios-install-step">
                <div className="ios-install-step-num">1</div>
                <div>
                  {t('install.step1_before')} <strong>{t('install.step1_share')}</strong> {t('install.step1_after')}{' '}
                  <span className="ios-share-icon"><Share size={16} /></span>{' '}
                  {t('install.step1_where')}
                </div>
              </div>
              <div className="ios-install-step">
                <div className="ios-install-step-num">2</div>
                <div>{t('install.step2_before')} <strong>{t('install.step2_item')}</strong></div>
              </div>
              <div className="ios-install-step">
                <div className="ios-install-step-num">3</div>
                <div>{t('install.step3_before')} <strong>{t('install.step3_item')}</strong> {t('install.step3_after')}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleDismiss}>{t('install.got_it')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
