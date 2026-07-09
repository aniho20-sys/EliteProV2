import { useState, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Renewal payment sheet — shown to a client renewing with their trainer.
// Purely informational: the trainer still adds the credits themselves via the
// existing Top-Up flow once they've reconciled the payment on their end.
export default function PaymentSheetModal({ client, trainer, remaining, onClose }) {
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState(null);
  const copiedTimer = useRef(null);

  const rate = remaining > 0 ? trainer?.renewalRate : trainer?.renewalRateNext;
  const reference = `${(client.name || 'CLIENT').split(' ')[0].slice(0, 4).toUpperCase()}-${client.id.slice(-4).toUpperCase()}`;
  const bank = trainer?.bankDetails || {};

  const rows = [
    { key: 'accountName', label: 'Account name', value: bank.accountName },
    { key: 'sortCode', label: 'Sort code', value: bank.sortCode },
    { key: 'accountNumber', label: 'Account number', value: bank.accountNumber },
    { key: 'reference', label: 'Reference', value: reference },
  ];
  const hasBankDetails = bank.accountName || bank.sortCode || bank.accountNumber;

  const copyRow = (key, value) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => toast('Failed to copy', 'error'));
  };

  const copyAll = () => {
    const text = rows.map(r => `${r.label}: ${r.value}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      toast('Payment details copied');
    }).catch(() => toast('Failed to copy', 'error'));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="flex-between mb-8" style={{ alignItems: 'center' }}>
          <h3 className="modal-title" style={{ marginBottom: 0 }}>Renew with {trainer?.name || 'your coach'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="text-sm text-muted mb-12">
          Transfer to the details below, then send your trainer the reference so they can match your payment.
        </p>

        {rate && (
          <div className="tag tag-accent mb-12" style={{ display: 'inline-block' }}>
            Locks in £{rate}/session
          </div>
        )}

        {!hasBankDetails ? (
          <p className="text-sm text-muted" style={{ padding: '8px 0' }}>
            Your trainer hasn&apos;t added bank details yet — message them directly to arrange renewal.
          </p>
        ) : (
          <div className="mb-12">
            {rows.map(r => (
              <div key={r.key} className="flex-between" style={{ padding: '8px 0', borderTop: r.key === 'accountName' ? 'none' : '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm text-muted" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{r.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{r.value || '—'}</div>
                </div>
                <button className="btn-icon" onClick={() => copyRow(r.key, r.value)} aria-label={`Copy ${r.label}`}>
                  {copiedKey === r.key ? <Check size={15} style={{ color: 'var(--success)' }} /> : <Copy size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {hasBankDetails && (
          <div className="modal-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-outline" onClick={copyAll}><Copy size={15} /> Copy all</button>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        )}

        <p className="text-sm text-muted mt-12" style={{ fontSize: '0.78rem', borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
          Your rate is confirmed once payment is received while you still have sessions remaining
          {trainer?.renewalRateNext ? ` — if your credit runs out first, renewal moves to £${trainer.renewalRateNext}/session.` : '.'}
        </p>
      </div>
    </div>
  );
}
