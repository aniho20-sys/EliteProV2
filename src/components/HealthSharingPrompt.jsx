import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { needsHealthSharingAnswer } from '../utils/healthSharing';

// A client connected to a coach agrees, before anything else, that the coach sees their
// health information (B79, Grok #27). Ani 2026-10-26: a coach needs it to train someone
// safely, so it is part of training with them — not agreeing disconnects, after a second
// tap that says so. Not dismissable: until answered the coach still sees it (Ani's choice
// for clients connected before this existed), so the only ways out are the two answers.
export default function HealthSharingPrompt() {
  const { t } = useLanguage();
  const { currentUser, getClient, setHealthSharing, declineHealthSharing } = useApp();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  if (!needsHealthSharingAnswer(currentUser)) return null;
  const coach = getClient(currentUser.trainerId)?.name || t('health.your_coach');

  const run = async (action) => {
    if (saving) return;
    setSaving(true);
    try {
      await action();
    } catch (err) {
      console.error('[healthSharing] could not save', err);
      toast(t('health.save_failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal health-modal" role="dialog" aria-modal="true" aria-labelledby="health-modal-title">
        <div className="health-modal-icon"><HeartPulse size={22} aria-hidden="true" /></div>
        {confirmingLeave ? (
          <>
            <h3 id="health-modal-title" className="modal-title health-modal-title">{t('health.leave_title', { coach })}</h3>
            <p className="health-modal-body">{t('health.leave_body', { coach })}</p>
            <div className="health-modal-actions">
              <button className="btn btn-danger" onClick={() => run(declineHealthSharing)} disabled={saving}>{t('health.leave')}</button>
              <button className="btn btn-outline" onClick={() => setConfirmingLeave(false)} disabled={saving}>{t('common.cancel')}</button>
            </div>
          </>
        ) : (
          <>
            <h3 id="health-modal-title" className="modal-title health-modal-title">{t('health.prompt_title', { coach })}</h3>
            <p className="health-modal-body">{t('health.prompt_body', { coach })}</p>
            <div className="health-modal-actions">
              <button className="btn btn-primary" onClick={() => run(() => setHealthSharing('yes'))} disabled={saving}>{t('health.agree')}</button>
              <button className="btn btn-outline" onClick={() => setConfirmingLeave(true)} disabled={saving}>{t('health.dont_agree')}</button>
            </div>
            <p className="health-modal-note">{t('health.prompt_need', { coach })}</p>
          </>
        )}
      </div>
    </div>
  );
}
