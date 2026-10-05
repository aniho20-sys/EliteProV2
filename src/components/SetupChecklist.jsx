import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Copy, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { setupSteps } from '../utils/setupSteps';
import { inviteUrl } from '../utils/inviteLink';

// The coach's setup checklist on the dashboard (B39). Which steps are done: utils/setupSteps.js.
export default function SetupChecklist() {
  const { t } = useLanguage();
  const toast = useToast();
  const { currentUser, getClients, getSchedule, getInviteCode } = useApp();
  const clients = getClients(currentUser.id);
  const steps = setupSteps({ currentUser, clients, schedule: getSchedule({ trainerId: currentUser.id }) });
  const [inviteCode, setInviteCode] = useState(currentUser.inviteCode || '');

  // The code is issued by the server on first ask. Asked here too, so a brand-new coach
  // sees it on their very first screen rather than only after visiting Clients or Profile.
  const inviteRequested = useRef(false);
  useEffect(() => {
    if (inviteCode || inviteRequested.current || !getInviteCode) return;
    inviteRequested.current = true;
    getInviteCode(currentUser.id)
      .then(code => code && setInviteCode(code))
      .catch(() => {}); // the Clients page asks again; nothing here depends on it
  }, [inviteCode, getInviteCode, currentUser.id]);

  const done = steps.filter(s => s.done).length;
  if (done === steps.length) return null;

  const label = {
    client: t('tdash.step_add_client'),
    price: t('tdash.step_price'),
    sessions: t('tdash.step_sessions'),
    book: t('tdash.step_book'),
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode)
      .then(() => toast(t('tdash.toast_code_copied')))
      .catch(() => toast(t('common.copy_failed'), 'error'));
  };
  const shareInvite = () => {
    const url = inviteUrl(inviteCode);
    const text = t('clients.share_text', { code: inviteCode });
    if (navigator.share) navigator.share({ title: t('profile.share_title'), text, url }).catch(() => {});
    else navigator.clipboard.writeText(`${text}\n${url}`).then(() => toast(t('clients.toast_msg_copied'))).catch(() => {});
  };

  return (
    <div className="card onboarding-card mb-16">
      <div className="flex-between" style={{ alignItems: 'baseline' }}>
        <h3 className="card-title">{t('tdash.setup_title')}</h3>
        <span className="text-sm text-muted">{t('tdash.setup_progress', { done, total: steps.length })}</span>
      </div>
      <p className="text-sm text-secondary mt-8">{t('tdash.setup_sub')}</p>
      <div className="onboarding-steps">
        {steps.map(step => (
          <Link key={step.key} to={step.to} state={step.state}
            className={`onboarding-step${step.done ? ' onboarding-step-done' : ''}`}>
            {step.done
              ? <CheckCircle2 size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-label={t('tdash.step_done')} />
              : <Circle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            <span>{label[step.key]}</span>
          </Link>
        ))}
      </div>
      {!steps[0].done && inviteCode && (
        <div className="onboarding-invite-block">
          <span className="text-sm text-muted">{t('tdash.share_invite')}</span>
          <div className="onboarding-invite-row">
            <span className="invite-code-badge">{inviteCode}</span>
            <button className="btn btn-sm btn-outline" onClick={copyCode}><Copy size={13} /> {t('common.copy')}</button>
            <button className="btn btn-sm btn-primary" onClick={shareInvite}><Share2 size={13} /> {t('clients.share')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
