import { useState, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currencyUtils';
import { useLanguage } from '../i18n/LanguageContext';

// Renewal payment sheet — shown to a client renewing with their trainer.
// Purely informational: the trainer still adds the credits themselves via the
// existing Top-Up flow once they've reconciled the payment on their end.
export default function PaymentSheetModal({ client, trainer, remaining, onClose }) {
  const toast = useToast();
  const { t } = useLanguage();
  const [copiedKey, setCopiedKey] = useState(null);
  const copiedTimer = useRef(null);

  const rate = remaining > 0 ? trainer?.renewalRate : trainer?.renewalRateNext;
  const reference = `${(client.name || 'CLIENT').split(' ')[0].slice(0, 4).toUpperCase()}-${client.id.slice(-4).toUpperCase()}`;
  const bank = trainer?.bankDetails || {};

  const rows = [
    { key: 'accountName', label: t('pay.account_name'), value: bank.accountName },
    { key: 'sortCode', label: t('pay.sort_code'), value: bank.sortCode },
    { key: 'accountNumber', label: t('pay.account_number'), value: bank.accountNumber },
    { key: 'reference', label: t('pay.reference'), value: reference },
  ];
  const hasBankDetails = bank.accountName || bank.sortCode || bank.accountNumber;

  const copyRow = (key, value) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => toast(t('common.copy_failed'), 'error'));
  };

  const copyAll = () => {
    const text = rows.map(r => `${r.label}: ${r.value}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      toast(t('pay.copied'));
    }).catch(() => toast(t('common.copy_failed'), 'error'));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="flex-between mb-8" style={{ alignItems: 'center' }}>
          <h3 className="modal-title" style={{ marginBottom: 0 }}>{t('pay.title', { name: trainer?.name || t('pay.your_coach') })}</h3>
          <button className="btn-icon" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
        </div>
        <p className="text-sm text-muted mb-12">
          {t('pay.intro')}
        </p>

        {rate && (
          <div className="tag tag-accent mb-12" style={{ display: 'inline-block' }}>
            {t('pay.locks_in', { rate: formatCurrency(rate, trainer?.currency) })}
          </div>
        )}

        {!hasBankDetails ? (
          <p className="text-sm text-muted" style={{ padding: '8px 0' }}>
            {t('pay.no_bank')}
          </p>
        ) : (
          <div className="mb-12">
            {rows.map(r => (
              <div key={r.key} className="flex-between" style={{ padding: '8px 0', borderTop: r.key === 'accountName' ? 'none' : '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm text-muted" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{r.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{r.value || '—'}</div>
                </div>
                <button className="btn-icon" onClick={() => copyRow(r.key, r.value)} aria-label={t('common.copy_x', { label: r.label })}>
                  {copiedKey === r.key ? <Check size={15} style={{ color: 'var(--success)' }} /> : <Copy size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {hasBankDetails && (
          <div className="modal-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-outline" onClick={copyAll}><Copy size={15} /> {t('pay.copy_all')}</button>
            <button className="btn btn-primary" onClick={onClose}>{t('common.done')}</button>
          </div>
        )}

        <p className="text-sm text-muted mt-12" style={{ fontSize: '0.78rem', borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
          {t('pay.rate_note')}
          {trainer?.renewalRateNext ? t('pay.rate_note_more', { rate: formatCurrency(trainer.renewalRateNext, trainer?.currency) }) : '.'}
        </p>
      </div>
    </div>
  );
}
