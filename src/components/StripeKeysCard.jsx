import { useState, useEffect } from 'react';
import { CreditCard, Copy, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { STRIPE_WEBHOOK_URL } from '../utils/gcLinks';
import { SkeletonLine } from './Skeleton';

// Ani only (B49): ElitePro's ONE Stripe platform account. She pastes the secret key and the
// webhook signing secret here, from her phone (#26); stripeSaveKeys checks them against
// Stripe and puts them straight into Secret Manager. They are never shown again, never in
// Firestore. The server refuses anyone but the owner — this card hiding itself is tidiness.
//
// Key prefixes in the labels (sk_test_, whsec_) are case-sensitive, so these two labels
// keep their case instead of the form-label capitals.
//
// The events Stripe must send (functions/stripeWebhooks.js). Event names are Stripe's own
// identifiers, not words, so they are rendered as data.
const STRIPE_EVENTS = [
  'account.updated', 'account.application.deauthorized', 'checkout.session.completed',
  'invoice.paid', 'invoice.payment_failed', 'customer.subscription.updated',
  'customer.subscription.deleted', 'charge.dispute.created',
];

export default function StripeKeysCard() {
  const { t } = useLanguage();
  const { getStripeStatus, saveStripeKeys } = useApp();
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStripeStatus()
      .then(s => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ configured: false, environment: null }); });
    return () => { cancelled = true; };
    // Context functions are recreated on every render; asking once on mount is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(STRIPE_WEBHOOK_URL)
      .then(() => toast(t('profile.copied')))
      .catch(() => toast(t('stripekeys.failed'), 'error'));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || !secretKey.trim() || !webhookSecret.trim()) return;
    setSaving(true);
    try {
      const { environment } = await saveStripeKeys({ secretKey, webhookSecret });
      toast(environment === 'live' ? t('stripekeys.saved_live') : t('stripekeys.saved_test'));
      setStatus({ configured: true, environment });
      setSecretKey('');
      setWebhookSecret('');
      setOpen(false);
    } catch (err) {
      toast(err?.code === 'functions/invalid-argument' ? t('stripekeys.bad') : t('stripekeys.failed'), 'error', 10000);
    } finally {
      setSaving(false);
    }
  };

  const showForm = open || (status && !status.configured);

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CreditCard size={18} /> {t('stripekeys.title')}
      </h3>
      <p className="invite-desc">{t('stripekeys.desc')}</p>
      {status === null ? (
        <SkeletonLine width="40%" />
      ) : (
        <p className="mt-8">
          <span className={`tag ${status.configured ? (status.environment === 'live' ? 'tag-accent' : 'tag-warning') : ''}`}>
            {!status.configured ? t('stripekeys.none') : status.environment === 'live' ? t('stripekeys.live') : t('stripekeys.test')}
          </span>
        </p>
      )}

      {status && status.configured && !open && (
        <button type="button" className="btn btn-outline mt-8" style={{ width: '100%' }} onClick={() => setOpen(true)}>
          <KeyRound size={16} /> {t('stripekeys.replace')}
        </button>
      )}

      {status && showForm && (
        <form className="mt-8" onSubmit={handleSave}>
          <p className="text-sm mb-8">{t('stripekeys.step_webhook')}</p>
          <div className="flex gap-8 mb-8" style={{ alignItems: 'center' }}>
            <code className="text-sm" style={{ wordBreak: 'break-all', flex: 1 }}>{STRIPE_WEBHOOK_URL}</code>
            <button type="button" className="btn btn-sm btn-outline" onClick={copyUrl}>
              <Copy size={14} /> {t('common.copy')}
            </button>
          </div>
          <p className="text-sm mb-8">{t('stripekeys.step_events')}</p>
          <ul className="text-sm mb-16" style={{ paddingLeft: 18 }}>
            {STRIPE_EVENTS.map(ev => <li key={ev}><code>{ev}</code></li>)}
          </ul>
          <div className="form-group">
            <label className="form-label" htmlFor="stripe-secret-key" style={{ textTransform: 'none' }}>{t('stripekeys.secret')}</label>
            <input id="stripe-secret-key" className="form-input" value={secretKey}
              autoComplete="off" autoCapitalize="none" spellCheck={false}
              onChange={e => setSecretKey(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="stripe-webhook-secret" style={{ textTransform: 'none' }}>{t('stripekeys.webhook')}</label>
            <input id="stripe-webhook-secret" className="form-input" value={webhookSecret}
              autoComplete="off" autoCapitalize="none" spellCheck={false}
              onChange={e => setWebhookSecret(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
            disabled={saving || !secretKey.trim() || !webhookSecret.trim()}>
            <KeyRound size={16} /> {saving ? t('profile.saving_dots') : t('stripekeys.save')}
          </button>
        </form>
      )}
    </div>
  );
}
