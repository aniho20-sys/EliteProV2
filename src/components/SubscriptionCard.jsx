import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarCheck, ShieldCheck, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatCurrency } from '../utils/currencyUtils';
import { SUBSCRIPTION_TIERS, monthlyAmount, currentSubscription } from '../utils/subscriptionUtils';
import { SkeletonLine } from './Skeleton';

// Client-facing monthly plan (Phase 3 Step 3). The client picks a tier; the server
// prices it from the trainer's own rate, and the bank details are entered on
// GoCardless's hosted page — never here. See functions/gcSubscriptions.js.
//
// While GoCardless is in sandbox this card appears only for clients their trainer has
// marked `subscriptionTester`, and says plainly that it is a test. The server enforces
// the same gate; hiding it here is only so a real client is never shown it at all.
export default function SubscriptionCard() {
  const { t } = useLanguage();
  const { currentUser, data, getSubscriptions, startSubscription, refreshSubscription } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [subs, setSubs] = useState(null);
  const [tier, setTier] = useState(8);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);

  const trainer = (data.users || []).find(u => u.id === currentUser.trainerId);
  const rate = trainer?.subscriptionRate;
  const offered = currentUser.role === 'client'
    && currentUser.subscriptionTester === true
    && !!trainer && monthlyAmount(rate, 4) !== null
    && (trainer.currency || 'GBP') === 'GBP';

  const load = useCallback(async () => {
    try {
      setSubs(await getSubscriptions({ clientId: currentUser.id }));
    } catch {
      setSubs([]);
    }
  }, [getSubscriptions, currentUser.id]);

  useEffect(() => { if (offered) load(); }, [offered, load]);

  // Back from GoCardless: gcSubscriptionReturn has already asked GoCardless and
  // redirected here with the outcome.
  useEffect(() => {
    const sub = new URLSearchParams(location.search).get('sub');
    if (!sub) return;
    if (sub === 'active') toast(t('sub.toast_active'));
    else if (sub === 'pending' || sub === 'completing') toast(t('sub.toast_pending'), 'info');
    else if (sub === 'abandoned' || sub === 'exit') toast(t('sub.toast_abandoned'), 'info');
    else toast(t('sub.toast_failed'), 'error');
    navigate('/profile', { replace: true });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (!offered) return null;

  const current = currentSubscription(subs);

  const handleStart = async () => {
    setStarting(true);
    try {
      const { url } = await startSubscription(tier);
      window.location.href = url;
    } catch (err) {
      const code = err?.code || '';
      toast(
        code === 'functions/already-exists' ? t('sub.err_already')
          : code === 'functions/failed-precondition' ? t('sub.err_not_ready')
            : t('sub.toast_failed'),
        'error',
      );
      setStarting(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { status } = await refreshSubscription(current.id);
      if (status === 'active') toast(t('sub.toast_active'));
      else if (status === 'abandoned') toast(t('sub.toast_abandoned'), 'info');
      else toast(t('sub.toast_pending'), 'info');
      await load();
    } catch {
      toast(t('sub.toast_failed'), 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CalendarCheck size={18} /> {t('sub.title')}
      </h3>
      <p className="text-sm" style={{ marginBottom: 8 }}><span className="tag tag-warning">{t('sub.sandbox_badge')}</span></p>

      {subs === null ? (
        <div className="mt-8"><SkeletonLine /><SkeletonLine width="60%" /></div>
      ) : current && ['active', 'paused', 'past_due'].includes(current.status) ? (
        <div className="mt-8">
          <span className="tag tag-accent">{t('sub.active')}</span>
          <p className="text-sm mt-8">
            {t('sub.your_plan', { n: current.tier, amount: formatCurrency(current.monthlyAmount, 'GBP') })}
          </p>
        </div>
      ) : current ? (
        <div className="mt-8">
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>{t('sub.pending')}</p>
          <button className="btn btn-outline" onClick={handleCheck} disabled={checking} style={{ width: '100%' }}>
            <RefreshCw size={16} /> {checking ? t('sub.checking') : t('sub.check_again')}
          </button>
        </div>
      ) : (
        <>
          <p className="invite-desc">{t('sub.intro')}</p>
          <div className="mt-8" role="radiogroup" aria-label={t('sub.title')}>
            {SUBSCRIPTION_TIERS.map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={tier === n}
                className={`btn ${tier === n ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}
                onClick={() => setTier(n)}
              >
                <span>{t('sub.tier_option', { n })}</span>
                <span>{t('sub.per_month', { amount: formatCurrency(monthlyAmount(rate, n), 'GBP') })}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-accent mt-8" onClick={handleStart} disabled={starting} style={{ width: '100%' }}>
            {starting ? t('sub.redirecting') : t('sub.subscribe')}
          </button>
        </>
      )}

      <p className="text-sm text-muted mt-16" style={{ display: 'flex', gap: 6 }}>
        <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {t('sub.privacy')}
      </p>
    </div>
  );
}
