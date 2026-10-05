import { useEffect, useState } from 'react';
import { CalendarPlus, Phone, MessageSquare, MessageCircle, Mail, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDayDate } from '../i18n/format';
import { contactLinks } from '../utils/contactLinks';

// Strangers who asked for a trial session on the coach's public booking page (B38).
// Confirm adds them as a client without the app and books the session at the hour they
// asked for; decline deletes the request. Either way the coach contacts them — the app
// sends nothing to someone who has no account. Hidden when there is nothing to answer.
export default function TrialRequestsCard() {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const { currentUser, subscribeTrialRequests, respondTrialRequest } = useApp();
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(null);           // request id being answered
  const [confirmDecline, setConfirmDecline] = useState(null);

  // Live, so a request appears while the dashboard is already open. If the listener cannot
  // start the dashboard still shows, without this card.
  useEffect(() => {
    if (!subscribeTrialRequests) return undefined;
    return subscribeTrialRequests(setRequests, () => setRequests([]));
    // Subscribed once per mount: the function is recreated on every AppContext render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (requests.length === 0) return null;

  const when = (r) => `${formatDayDate(r.date, lang)} ${r.time}`;

  const answer = async (r, action) => {
    if (busy) return;
    setBusy(r.id);
    try {
      await respondTrialRequest(r.id, action);
      setRequests(list => list.filter(x => x.id !== r.id));
      setConfirmDecline(null);
      if (action === 'confirm') toast(t('trial.toast_confirmed', { name: r.name, when: when(r) }));
      else toast(t('trial.toast_declined', { name: r.name }), 'info');
    } catch (err) {
      if (err?.code === 'functions/not-found') {
        setRequests(list => list.filter(x => x.id !== r.id)); // already answered elsewhere
      }
      toast(t('trial.toast_failed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CalendarPlus size={18} style={{ color: 'var(--accent)' }} />
        {t('trial.title')}
        <span className="needs-attention-count">{requests.length}</span>
      </h3>
      <p className="text-sm text-secondary">{t('trial.desc')}</p>
      {requests.map(r => {
        const links = contactLinks(r.contact, { timeZone: currentUser?.timeZone });
        return (
          <div key={r.id} className="trial-request">
            <div className="trial-request-head">
              <span className="trial-request-name">{r.name}</span>
              <span className="trial-request-when">{when(r)}</span>
            </div>
            <div className="trial-request-contact">{r.contact}</div>
            {r.message && <div className="trial-request-message">{r.message}</div>}
            <div className="trial-request-actions">
              {links?.kind === 'phone' && (
                <>
                  <a className="btn btn-sm btn-outline" href={links.call}><Phone size={14} /> {t('trial.call')}</a>
                  <a className="btn btn-sm btn-outline" href={links.text}><MessageSquare size={14} /> {t('trial.text')}</a>
                  {links.whatsapp && (
                    <a className="btn btn-sm btn-outline" href={links.whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                  )}
                </>
              )}
              {links?.kind === 'email' && (
                <a className="btn btn-sm btn-outline" href={links.email}><Mail size={14} /> {t('trial.email')}</a>
              )}
            </div>
            <div className="trial-request-actions">
              {confirmDecline === r.id ? (
                <>
                  <span className="text-sm">{t('trial.decline_confirm_q')}</span>
                  <button className="btn btn-sm btn-danger" disabled={!!busy} onClick={() => answer(r, 'decline')}>
                    {busy === r.id ? t('trial.working') : t('trial.decline_yes')}
                  </button>
                  <button className="btn btn-sm btn-outline" disabled={!!busy} onClick={() => setConfirmDecline(null)}>
                    {t('trial.decline_no')}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => answer(r, 'confirm')}>
                    <Check size={14} /> {busy === r.id ? t('trial.working') : t('trial.confirm')}
                  </button>
                  <button className="btn btn-sm btn-outline" disabled={!!busy} onClick={() => setConfirmDecline(r.id)}>
                    <X size={14} /> {t('trial.decline')}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
