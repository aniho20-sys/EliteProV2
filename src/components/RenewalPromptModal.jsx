import { useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';
import { RENEWAL_SNOOZE_DAYS } from '../utils/renewalPrompt';
import { useLanguage } from '../i18n/LanguageContext';

// The renewal ask, as a modal the client has to answer.
//
// This used to be an 8-second toast fired after booking. A prompt that asks someone to
// part with money is not a status message: it has to wait for an answer, and it has to
// offer both answers. Deliberately has NO auto-dismiss timer and NO bare close button —
// leaving is "Remind me later", which is recorded so the prompt holds off for a few days
// instead of reappearing on the client's very next booking.
export default function RenewalPromptModal({ kind, remainingAfter, trainer, onRenew, onLater }) {
  const { t } = useLanguage();
  const [snoozing, setSnoozing] = useState(false);

  const handleLater = async () => {
    if (snoozing) return;
    setSnoozing(true);
    try { await onLater(); } finally { setSnoozing(false); }
  };

  const overdraft = kind === 'overdraft';
  const rate = overdraft ? trainer?.renewalRateNext : trainer?.renewalRate;

  return (
    <div className="modal-overlay">
      <div className="modal renewal-modal">
        <div className={`renewal-modal-icon${overdraft ? ' renewal-modal-icon-danger' : ''}`}>
          {overdraft ? <AlertTriangle size={22} /> : <Clock size={22} />}
        </div>

        <h3 className="modal-title renewal-modal-title">
          {overdraft
            ? t('renewal.on_credit')
            : remainingAfter === 0
              ? t('renewal.was_last')
              : t('dash.sessions_left_count', { count: remainingAfter })}
        </h3>

        <p className="renewal-modal-body">
          {overdraft ? (
            <>
              {t('renewal.overdraft_pre')}
              <strong>{formatCurrency(trainer.renewalRateNext, trainer.currency)}{t('common.per_session')}</strong>
              {t('renewal.overdraft_post')}
            </>
          ) : (
            <>
              {t('renewal.keep_rate_pre')}
              <strong>{formatCurrency(rate, trainer.currency)}{t('common.per_session')}</strong>
              {t('renewal.keep_rate_mid')}
              <strong>{formatCurrency(trainer.renewalRateNext, trainer.currency)}{t('common.per_session')}</strong>.
            </>
          )}
        </p>

        <div className="renewal-modal-actions">
          <button className="btn btn-primary" onClick={onRenew} disabled={snoozing}>
            {t('renewal.renew_now')}
          </button>
          <button className="btn btn-outline" onClick={handleLater} disabled={snoozing}>
            {snoozing ? t('common.saving') : t('renewal.remind_later')}
          </button>
        </div>
        <p className="renewal-modal-note">
          {t('renewal.snooze_note', { days: RENEWAL_SNOOZE_DAYS })}
        </p>
      </div>
    </div>
  );
}
