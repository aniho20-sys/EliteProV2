import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, RefreshCw, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SkeletonLine } from './Skeleton';

// A coach takes monthly plans on their OWN Stripe account (B49,
// reports/stripe-subscription-design.md). The details and the bank account are entered on
// Stripe's page, never here; this card only starts that, and asks Stripe afterwards whether
// the account can take payments yet — only Stripe's answer makes it "connected".
//
// `children` is the plan-pricing block, shared with the GoCardless card in ProfilePage.

// Where a coach can be (functions/stripeConnect.js COUNTRIES); labels are dictionary keys.
const COUNTRY_OPTIONS = ['GB', 'HK'];

export default function StripeConnectCard({ children }) {
  const { t } = useLanguage();
  const { currentUser, getPaymentConnection, startStripeConnect, refreshStripeConnection } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [stripe, setStripe] = useState(undefined); // undefined = loading, null = none yet
  const [country, setCountry] = useState((currentUser.currency || 'GBP') === 'HKD' ? 'HK' : 'GB');
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);

  const countryLabel = (c) => (c === 'HK' ? t('stripe.country_hk') : t('stripe.country_gb'));

  // Ask Stripe again and reload what the server recorded. `announce` is for a tap or a
  // return from Stripe; on page open it is quiet.
  const check = async (announce) => {
    setChecking(true);
    try {
      const { status } = await refreshStripeConnection();
      if (announce) toast(status === 'connected' ? t('stripe.connected_toast') : t('stripe.not_ready_toast'), status === 'connected' ? 'success' : 'info');
      const conn = await getPaymentConnection(currentUser.id);
      setStripe(conn?.stripe || null);
    } catch {
      if (announce) toast(t('stripe.failed'), 'error');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const back = new URLSearchParams(location.search).get('stripe');
    if (back) navigate('/profile', { replace: true });
    getPaymentConnection(currentUser.id)
      .then(conn => {
        if (cancelled) return;
        const s = conn?.stripe || null;
        setStripe(s);
        if (s?.country) setCountry(s.country);
        // Back from Stripe's page, or still being checked: ask Stripe now.
        if (s && (back === 'return' || s.status !== 'connected')) check(back === 'return');
      })
      .catch(() => { if (!cancelled) setStripe(null); });
    return () => { cancelled = true; };
    // Once on open; check() and the context functions are recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const { url } = await startStripeConnect(country);
      window.location.href = url;
    } catch {
      toast(t('stripe.failed'), 'error');
      setStarting(false);
    }
  };

  const connected = stripe?.status === 'connected';

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CreditCard size={18} /> {t('stripe.title')}
      </h3>
      <p className="invite-desc">{t('stripe.desc')}</p>

      {stripe === undefined ? (
        <SkeletonLine width="60%" />
      ) : connected ? (
        <div className="mt-8">
          <div className="flex gap-8 mb-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tag tag-accent">{t('profile.connected')}</span>
            <span className="tag tag-primary">{countryLabel(stripe.country)}</span>
            {stripe.environment !== 'live' && <span className="tag tag-warning">{t('stripe.test_mode')}</span>}
          </div>
          <p className="text-sm text-muted mb-8">{t('stripe.currency_note', { currency: currentUser.currency || 'GBP' })}</p>
          {children}
          <a className="btn btn-outline" href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
            <ExternalLink size={16} /> {t('stripe.dashboard')}
          </a>
        </div>
      ) : stripe ? (
        <div className="mt-8">
          <p className="text-sm mb-8" style={{ color: 'var(--warning)' }}>{t('stripe.onboarding')}</p>
          <button type="button" className="btn btn-primary mb-8" onClick={handleStart} disabled={starting} style={{ width: '100%' }}>
            <CreditCard size={16} /> {starting ? t('profile.connecting_dots') : t('stripe.continue')}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => check(true)} disabled={checking} style={{ width: '100%' }}>
            <RefreshCw size={16} /> {checking ? t('stripe.checking') : t('stripe.check')}
          </button>
        </div>
      ) : (
        <div className="mt-8">
          <div className="form-group">
            <label className="form-label" htmlFor="stripe-country">{t('stripe.country')}</label>
            <select id="stripe-country" className="form-select" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{countryLabel(c)}</option>)}
            </select>
          </div>
          <p className="text-sm text-muted mb-8">{t('stripe.setup_note')}</p>
          <button type="button" className="btn btn-primary" onClick={handleStart} disabled={starting} style={{ width: '100%' }}>
            <CreditCard size={16} /> {starting ? t('profile.connecting_dots') : t('stripe.setup')}
          </button>
        </div>
      )}
    </div>
  );
}
