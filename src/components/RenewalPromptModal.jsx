import { useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';
import { RENEWAL_SNOOZE_DAYS } from '../utils/renewalPrompt';

// The renewal ask, as a modal the client has to answer.
//
// This used to be an 8-second toast fired after booking. A prompt that asks someone to
// part with money is not a status message: it has to wait for an answer, and it has to
// offer both answers. Deliberately has NO auto-dismiss timer and NO bare close button —
// leaving is "Remind me later", which is recorded so the prompt holds off for a few days
// instead of reappearing on the client's very next booking.
export default function RenewalPromptModal({ kind, remainingAfter, trainer, onRenew, onLater }) {
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
            ? 'This session is on credit'
            : remainingAfter === 0
              ? 'That was your last session'
              : `${remainingAfter} session${remainingAfter === 1 ? '' : 's'} left`}
        </h3>

        <p className="renewal-modal-body">
          {overdraft ? (
            <>
              Your sessions have run out, so this booking will be added to your next
              renewal at <strong>{formatCurrency(trainer.renewalRateNext, trainer.currency)}/session</strong>.
              Renewing now settles it and puts credit back on your account.
            </>
          ) : (
            <>
              Renew now to keep your current rate of{' '}
              <strong>{formatCurrency(rate, trainer.currency)}/session</strong>. Once your
              sessions run out, renewal moves to{' '}
              <strong>{formatCurrency(trainer.renewalRateNext, trainer.currency)}/session</strong>.
            </>
          )}
        </p>

        <div className="renewal-modal-actions">
          <button className="btn btn-primary" onClick={onRenew} disabled={snoozing}>
            Renew now
          </button>
          <button className="btn btn-outline" onClick={handleLater} disabled={snoozing}>
            {snoozing ? 'Saving…' : 'Remind me later'}
          </button>
        </div>
        <p className="renewal-modal-note">
          Remind me later hides this for {RENEWAL_SNOOZE_DAYS} days.
        </p>
      </div>
    </div>
  );
}
