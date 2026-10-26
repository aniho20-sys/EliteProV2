import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { needsHealthSharingAnswer } from '../utils/healthSharing';

// A client connected to a coach is asked, before anything else, whether that coach may see
// their health information (B79, Grok #27). UK GDPR needs it asked separately and freely:
// either answer keeps them with their coach, the two buttons weigh the same, and Profile
// changes it later. Not answered yet reads as shared (Ani 2026-10-26), so it is not
// dismissable — the only ways out are the two answers.
export default function HealthSharingPrompt() {
  const { t } = useLanguage();
  const { currentUser, getClient, setHealthSharing } = useApp();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  if (!needsHealthSharingAnswer(currentUser)) return null;
  const coach = getClient(currentUser.trainerId)?.name || t('health.your_coach');

  const answer = async (choice) => {
    if (saving) return;
    setSaving(true);
    try {
      await setHealthSharing(choice);
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
        <h3 id="health-modal-title" className="modal-title health-modal-title">{t('health.prompt_title', { coach })}</h3>
        <p className="health-modal-body">{t('health.prompt_body', { coach })}</p>
        <div className="health-modal-actions">
          <button className="btn btn-outline" onClick={() => answer('yes')} disabled={saving}>{t('health.share')}</button>
          <button className="btn btn-outline" onClick={() => answer('no')} disabled={saving}>{t('health.dont_share')}</button>
        </div>
        <p className="health-modal-note">{t('health.prompt_free', { coach })}</p>
      </div>
    </div>
  );
}
