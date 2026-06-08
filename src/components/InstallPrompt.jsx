import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { isIOS, isStandalone as isInStandaloneMode } from '../utils/deviceUtils';

const DISMISSED_KEY = 'elitepro_install_dismissed_until';
const DISMISS_DAYS = 3;

function isDismissed() {
  const until = localStorage.getItem(DISMISSED_KEY);
  return until && Date.now() < Number(until);
}

export default function InstallPrompt() {
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
          <strong>Add to Home Screen for offline use</strong>
          <span>Use without internet · Push notifications</span>
        </div>
        <button className="btn btn-sm btn-primary install-banner-cta" onClick={handleInstall}>
          {isIOS() ? 'How?' : <><Download size={14} /> Install</>}
        </button>
        <button className="btn-icon install-banner-close" onClick={handleDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>

      {showIOSModal && (
        <div className="modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="modal ios-install-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add to Home Screen</h3>
              <button className="btn-icon" onClick={() => setShowIOSModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-muted mb-16">iOS Safari requires the app to be on your Home Screen to work offline and receive push notifications.</p>
            <div className="ios-install-steps">
              <div className="ios-install-step">
                <div className="ios-install-step-num">1</div>
                <div>
                  Tap the <strong>Share</strong> button{' '}
                  <span className="ios-share-icon"><Share size={16} /></span>{' '}
                  at the bottom of Safari
                </div>
              </div>
              <div className="ios-install-step">
                <div className="ios-install-step-num">2</div>
                <div>Scroll down and tap <strong>"Add to Home Screen"</strong></div>
              </div>
              <div className="ios-install-step">
                <div className="ios-install-step-num">3</div>
                <div>Tap <strong>"Add"</strong> in the top-right corner</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleDismiss}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
