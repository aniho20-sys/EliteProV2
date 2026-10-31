import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarCheck, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatCurrency } from '../utils/currencyUtils';
import { SESSIONS_PER_YEAR, planPrice, offeredPlans, rolloverCap, planLabel, currentSubscription } from '../utils/subscriptionUtils';
import { SkeletonLine } from './Skeleton';

// Client-facing monthly plan (Phase 3 Step 3, B84). The client picks a plan; the server
// prices it from the coach's own monthly price, and the card or bank details are entered on the
// processor's own page — never here. A coach on Stripe (B49, functions/stripeSubscriptions.js)
// takes plans through Stripe in their own currency; otherwise GoCardless (Bacs, GBP only,
// functions/gcSubscriptions.js).
//
// While GoCardless is in sandbox this card appears only for clients their trainer has
// marked `subscriptionTester`, and says plainly that it is a test. The server enforces
// the same gate; hiding it here is only so a real client is never shown it at all.
export default function SubscriptionCard() {
  const { t } = useLanguage();
  const { currentUser, data, getSubscriptions, startSubscription, refreshSubscription, cancelSubscription, startStripeSubscription, refreshStripeSubscription } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [subs, setSubs] = useState(null);
  const [picked, setPicked] = useState(null);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const trainer = (data.users || []).find(u => u.id === currentUser.trainerId);
  const plans = offeredPlans(trainer);
  // One a week unless the coach does not offer it, then the first they do.
  const plan = plans.includes(picked) ? picked : (plans.includes('weekly') ? 'weekly' : plans[0]);
  // The server writes stripeEnvironment (B49) / gcEnvironment onto the coach's profile when
  // they connect. Stripe wins once the coach has it. Anything but 'live' is test mode —
  // including GoCardless coaches who connected before the field existed — and only then may
  // the card say no real money is taken (B36).
  const onStripe = !!trainer?.stripeEnvironment;
  const testMode = onStripe ? trainer.stripeEnvironment !== 'live' : trainer?.gcEnvironment !== 'live';
  const currency = onStripe ? (trainer.currency || 'GBP') : 'GBP';
  const offered = currentUser.role === 'client'
    && currentUser.subscriptionTester === true
    && !!trainer && plans.length > 0
    && (onStripe || (trainer.currency || 'GBP') === 'GBP');

  const load = useCallback(async () => {
    try {
      setSubs(await getSubscriptions({ clientId: currentUser.id }));
    } catch {
      setSubs([]);
    }
  }, [getSubscriptions, currentUser.id]);

  useEffect(() => { if (offered) load(); }, [offered, load]);

  // One wording for a subscription status, whether it arrives on the return from GoCardless
  // or from "Check again". They used to be two copies, and "Check again" told a student
  // whose Direct Debit GoCardless had refused that it was still being confirmed.
  const announce = (status) => {
    if (status === 'active') toast(t('sub.toast_active'));
    else if (status === 'pending' || status === 'completing') toast(onStripe ? t('sub.toast_pending_stripe') : t('sub.toast_pending'), 'info');
    else if (status === 'abandoned' || status === 'exit') toast(onStripe ? t('sub.toast_abandoned_stripe') : t('sub.toast_abandoned'), 'info');
    else if (status === 'cancelled') toast(t('sub.toast_cancelled'), 'info');
    else toast(t('sub.toast_failed'), 'error');
  };

  // Back from GoCardless: gcSubscriptionReturn has already asked GoCardless and
  // redirected here with the outcome.
  useEffect(() => {
    const sub = new URLSearchParams(location.search).get('sub');
    if (!sub) return;
    announce(sub);
    navigate('/profile', { replace: true });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (!offered) return null;

  const current = currentSubscription(subs);
  // An existing plan keeps the processor it was made with, whatever the coach uses now.
  const planOnStripe = current ? current.provider === 'stripe' : onStripe;

  const handleStart = async () => {
    setStarting(true);
    try {
      const { url } = await (onStripe ? startStripeSubscription(plan) : startSubscription(plan));
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

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelSubscription(current.id);
      toast(t('sub.toast_cancelled'));
      setConfirmCancel(false);
      await load();
    } catch {
      toast(t('sub.toast_cancel_failed'), 'error', 10000);
    } finally {
      setCancelling(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { status } = await (planOnStripe ? refreshStripeSubscription(current.id) : refreshSubscription(current.id));
      announce(status);
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
      {testMode && <p className="text-sm" style={{ marginBottom: 8 }}><span className="tag tag-warning">{t('sub.sandbox_badge')}</span></p>}

      {subs === null ? (
        <div className="mt-8"><SkeletonLine /><SkeletonLine width="60%" /></div>
      ) : current && ['active', 'paused', 'past_due'].includes(current.status) ? (
        <div className="mt-8">
          {current.status === 'past_due' ? (
            <>
              <span className="tag tag-danger">{t('sub.payment_failed_tag')}</span>
              <p className="text-sm mt-8" style={{ display: 'flex', gap: 6, color: 'var(--danger-text)' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {planOnStripe ? t('sub.payment_failed_desc_stripe') : t('sub.payment_failed_desc')}
              </p>
            </>
          ) : (
            <span className="tag tag-accent">{t('sub.active')}</span>
          )}
          <p className="text-sm mt-8">
            {t('sub.your_plan', { plan: planLabel(t, current), amount: formatCurrency(current.monthlyAmount, current.currency || 'GBP') })}
          </p>
          <button type="button" className="btn btn-outline btn-sm mt-8" onClick={() => setConfirmCancel(true)}>
            {t('sub.cancel')}
          </button>
        </div>
      ) : current ? (
        <div className="mt-8">
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>{planOnStripe ? t('sub.pending_stripe') : t('sub.pending')}</p>
          <button className="btn btn-outline" onClick={handleCheck} disabled={checking} style={{ width: '100%' }}>
            <RefreshCw size={16} /> {checking ? t('sub.checking') : t('sub.check_again')}
          </button>
        </div>
      ) : (
        <>
          <p className="invite-desc">{onStripe ? t('sub.intro_stripe') : t('sub.intro')}</p>
          <div className="mt-8" role="radiogroup" aria-label={t('sub.title')}>
            {plans.map(p => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={plan === p}
                className={`btn ${plan === p ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8, textAlign: 'left' }}
                onClick={() => setPicked(p)}
              >
                <span>
                  <span style={{ display: 'block' }}>{planLabel(t, p)}</span>
                  <span className="text-sm" style={{ display: 'block', opacity: 0.8 }}>{t('sub.per_year', { n: SESSIONS_PER_YEAR[p] })}</span>
                </span>
                <span>{t('sub.per_month', { amount: formatCurrency(planPrice(trainer, p), currency) })}</span>
              </button>
            ))}
          </div>
          {/* B84: the sessions follow the year, not the month — say how, so 4, 4, 5 is no surprise.
              And what gcWebhooks.js rollover() does at each payment (B39): unused sessions above
              two weeks' worth end. */}
          <p className="text-sm text-muted">{t('sub.spread_note')}</p>
          <p className="text-sm text-muted mt-8">{t('sub.rollover_note', { n: rolloverCap(SESSIONS_PER_YEAR[plan]) })}</p>
          <button className="btn btn-accent mt-8" onClick={handleStart} disabled={starting} style={{ width: '100%' }}>
            {starting
              ? (onStripe ? t('sub.redirecting_stripe') : t('sub.redirecting'))
              : (onStripe ? t('sub.subscribe_stripe') : t('sub.subscribe'))}
          </button>
        </>
      )}

      <p className="text-sm text-muted mt-16" style={{ display: 'flex', gap: 6 }}>
        <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {planOnStripe ? t('sub.privacy_stripe') : t('sub.privacy')}
      </p>

      {confirmCancel && current && (
        <div className="modal-overlay" onClick={() => !cancelling && setConfirmCancel(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('sub.cancel_title')}</h3>
            <p className="text-sm text-secondary">{t('sub.cancel_desc')}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setConfirmCancel(false)} disabled={cancelling}>{t('sub.cancel_keep')}</button>
              <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? t('sub.cancelling') : t('sub.cancel_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
