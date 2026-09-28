import { useState } from 'react';
import { X, FileText, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { resolveExerciseName, exerciseNamesFromLogs } from '../utils/exerciseUtils';
import { buildMonthlyReport, reportMonthLabel } from '../utils/monthlyReport';
import { CURRENCIES } from '../utils/currencyUtils';
import { sharePdf } from '../utils/sharePdf';
import { useLanguage } from '../i18n/LanguageContext';

function monthOptions(lang) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { val, label: reportMonthLabel(val, lang) };
  });
}

export default function MonthlyReportModal({ client, onClose }) {
  const { t, lang, translatorFor } = useLanguage();
  const toast = useToast();
  const { currentUser, getBodyStats, getWorkoutLogs, getSchedule, getPersonalRecords, getExercises } = useApp();

  const opts = monthOptions(lang);
  const [month, setMonth] = useState(opts[0].val);
  const [includeWorkoutSummary, setIncludeWorkoutSummary] = useState(true);
  const [includeInvoice, setIncludeInvoice] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState(currentUser?.currency || 'GBP');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [creating, setCreating] = useState(false);

  const logs = getWorkoutLogs(client.id);
  const exercises = getExercises();
  const report = buildMonthlyReport({
    month,
    logs,
    schedule: getSchedule({ clientId: client.id }),
    bodyStats: getBodyStats(client.id),
    prs: getPersonalRecords(client.id),
  });

  // The PR table calls this with no fallback, so before this used to print a raw
  // `custom-<epoch>` id straight into a report Ani sends to a client. resolveExerciseName
  // also follows a mergedInto pointer (#27), which the old lookup ignored.
  const loggedNames = exerciseNamesFromLogs(logs);
  const exName = (id, fallback) =>
    fallback || resolveExerciseName(exercises, id, loggedNames.get(id) || 'Exercise');

  // A real PDF, not window.print() — which does nothing on an iPhone (#30). Written in the
  // student's language (Ani 2026-09-28), so it is built with the student's translator.
  const handleCreate = async () => {
    setCreating(true);
    try {
      const reader = await translatorFor(client, currentUser);
      const { reportContent, generateMonthlyReportPdfBytes, reportPdfFilename } = await import('../utils/reportPdf');
      const content = reportContent({
        report, client, trainer: currentUser, lang: reader.lang, t: reader.t, exName, includeWorkoutSummary,
        fee: includeInvoice
          ? { amount: Number(invoiceAmount) || 0, currency: invoiceCurrency, dueDate: invoiceDueDate, paymentInfo }
          : null,
      });
      const bytes = await generateMonthlyReportPdfBytes(content);
      await sharePdf(bytes, reportPdfFilename(client, month));
    } catch (err) {
      console.error('[MonthlyReport] PDF failed', err);
      toast(t('report.toast_pdf_failed'), 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="modal-title" style={{ margin: 0 }}>{t('report.title')}</h3>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">{t('report.month')}</label>
          <select className="form-input" value={month} onChange={e => setMonth(e.target.value)}>
            {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>

        {/* Preview stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'sessions', label: t('report.stat_sessions'), value: `${report.completed.length}` },
            { key: 'logs', label: t('report.stat_logs'), value: `${report.monthLogs.length}` },
            { key: 'volume', label: t('report.stat_volume'), value: report.totalVolume > 0 ? `${(report.totalVolume / 1000).toFixed(1)}t` : '—' },
          ].map(s => (
            <div key={s.key} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <label className="recap-send-toggle">
            <input type="checkbox" checked={includeWorkoutSummary} onChange={e => setIncludeWorkoutSummary(e.target.checked)} />
            {t('report.include_workouts')}
          </label>
          <label className="recap-send-toggle">
            <input type="checkbox" checked={includeInvoice} onChange={e => setIncludeInvoice(e.target.checked)} />
            {t('report.include_fees')}
          </label>
        </div>

        {includeInvoice && (
          <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">{t('report.amount')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="form-input" style={{ width: 90, flexShrink: 0 }} value={invoiceCurrency} onChange={e => setInvoiceCurrency(e.target.value)}>
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input className="form-input" type="number" placeholder="3000" value={invoiceAmount}
                  onChange={e => setInvoiceAmount(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('report.due_date')}</label>
              <input className="form-input" type="date" value={invoiceDueDate}
                onChange={e => setInvoiceDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('report.payment_method')}</label>
              <input className="form-input" placeholder={t('report.ph_payment')}
                value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} />
            </div>
          </div>
        )}

        <button className="btn btn-accent" style={{ width: '100%', gap: 8 }} onClick={handleCreate} disabled={creating}>
          <Share2 size={16} />
          {creating ? t('report.creating_pdf') : t('report.share_pdf')}
        </button>
        <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
          {t('report.share_hint', { client: client.name })}
        </p>
      </div>
    </div>
  );
}
