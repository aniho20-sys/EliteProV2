import { useState } from 'react';
import { X, FileText, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';

function monthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en', { year: 'numeric', month: 'long' });
    opts.push({ val, label });
  }
  return opts;
}

function monthLabel(m) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en', { year: 'numeric', month: 'long' });
}

export default function MonthlyReportModal({ client, onClose }) {
  const { currentUser, getBodyStats, getWorkoutLogs, getSchedule, getPersonalRecords, getExercises } = useApp();

  const opts = monthOptions();
  const [month, setMonth] = useState(opts[0].val);
  const [includeWorkoutSummary, setIncludeWorkoutSummary] = useState(false);
  const [includeInvoice, setIncludeInvoice] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('HKD');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');

  const bodyStats   = getBodyStats(client.id);
  const logs        = getWorkoutLogs(client.id);
  const allSchedule = getSchedule({ clientId: client.id });
  const prs         = getPersonalRecords(client.id);
  const exercises   = getExercises();

  const exName = (id, fallback) => {
    if (fallback) return fallback;
    return exercises.find(e => e.id === id)?.name || id || '—';
  };

  const monthLogs      = logs.filter(l => l.date?.startsWith(month));
  const monthCompleted = allSchedule.filter(s => s.date?.startsWith(month) && s.status === 'completed' && !s.isBlocked);
  const monthBooked    = allSchedule.filter(s => s.date?.startsWith(month) && !s.isBlocked);
  const sortedStats    = [...bodyStats].sort((a, b) => a.date > b.date ? 1 : -1);
  const monthStats     = sortedStats.filter(s => s.date?.startsWith(month));
  // fallback: if no stats this month, use the most recent available entry
  const latestStat     = sortedStats[sortedStats.length - 1] || null;

  const topPRs = Object.entries(prs)
    .filter(([, pr]) => pr.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 6);

  const totalVolume = Math.round(monthLogs.reduce((t, log) =>
    t + (log.entries || []).reduce((et, entry) =>
      et + (entry.sets || []).reduce((st, s) =>
        st + (s.weight && s.reps ? Number(s.weight) * Number(s.reps) : 0), 0), 0), 0));

  const attendancePct = monthBooked.length > 0
    ? Math.round((monthCompleted.length / monthBooked.length) * 100) : null;

  const handlePrint = () => {
    const html = buildHTML({
      client, trainer: currentUser, month: monthLabel(month),
      monthCompleted, monthLogs, monthStats, latestStat,
      topPRs, totalVolume, attendancePct,
      includeWorkoutSummary,
      includeInvoice, invoiceAmount, invoiceCurrency, invoiceDueDate, paymentInfo,
      exName,
    });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="modal-title" style={{ margin: 0 }}>Monthly Training Report</h3>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Report Month</label>
          <select className="form-input" value={month} onChange={e => setMonth(e.target.value)}>
            {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>

        {/* Preview stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Sessions', value: `${monthCompleted.length}` },
            { label: 'Workout Logs', value: `${monthLogs.length}` },
            { label: 'Total Volume', value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <label className="recap-send-toggle">
            <input type="checkbox" checked={includeWorkoutSummary} onChange={e => setIncludeWorkoutSummary(e.target.checked)} />
            Include workout summary
          </label>
          <label className="recap-send-toggle">
            <input type="checkbox" checked={includeInvoice} onChange={e => setIncludeInvoice(e.target.checked)} />
            Include fee summary
          </label>
        </div>

        {includeInvoice && (
          <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="form-input" style={{ width: 90, flexShrink: 0 }} value={invoiceCurrency} onChange={e => setInvoiceCurrency(e.target.value)}>
                  {['HKD','USD','GBP','EUR','AUD','CAD','SGD','JPY','CNY','TWD','MYR','THB'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input className="form-input" type="number" placeholder="3000" value={invoiceAmount}
                  onChange={e => setInvoiceAmount(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={invoiceDueDate}
                onChange={e => setInvoiceDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <input className="form-input" placeholder="FPS / PayMe: 9XXX-XXXX"
                value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} />
            </div>
          </div>
        )}

        <button className="btn btn-accent" style={{ width: '100%', gap: 8 }} onClick={handlePrint}>
          <Printer size={16} />
          Print / Save as PDF
        </button>
        <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Browser print dialog → "Save as PDF"
        </p>
      </div>
    </div>
  );
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildHTML({ client, trainer, month, monthCompleted, monthLogs, monthStats, latestStat,
  topPRs, totalVolume, attendancePct,
  includeWorkoutSummary,
  includeInvoice, invoiceAmount, invoiceCurrency, invoiceDueDate, paymentInfo, exName }) {

  const today = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });

  // Body composition: prefer within-month start/end comparison; fallback to latest available
  const statFirst  = monthStats[0] || null;
  const statEnd    = monthStats.length > 1 ? monthStats[monthStats.length - 1] : null;
  const displayStat = statFirst || latestStat;
  const isSnapshot  = !statFirst && !!latestStat; // true = fallback, show as snapshot not comparison

  const hasAnyData = monthCompleted.length > 0 || monthLogs.length > 0 || topPRs.length > 0 || !!displayStat;

  const bodyFields = [
    { key: 'weight',  label: 'Weight',   unit: 'kg' },
    { key: 'bodyFat', label: 'Body Fat', unit: '%'  },
    { key: 'chest',   label: 'Chest',    unit: 'cm' },
    { key: 'waist',   label: 'Waist',    unit: 'cm' },
    { key: 'hips',    label: 'Hips',     unit: 'cm' },
    { key: 'arms',    label: 'Arms',     unit: 'cm' },
    { key: 'legs',    label: 'Legs',     unit: 'cm' },
  ];

  const bodyRows = displayStat ? bodyFields
    .filter(f => displayStat[f.key])
    .map(f => {
      const start = statFirst ? statFirst[f.key] : null;
      const end   = statEnd ? statEnd[f.key] : null;
      const snap  = isSnapshot ? displayStat[f.key] : null;
      const delta = (start && end && end !== start) ? (end - start) : null;
      const deltaStr = delta !== null
        ? `<span style="color:${delta < 0 ? '#16a34a' : '#dc2626'};font-size:0.8em;margin-left:6px">${delta > 0 ? '+' : ''}${delta.toFixed(1)}</span>`
        : '';
      if (isSnapshot) {
        return `<tr><td>${esc(f.label)}</td><td>${snap}${f.unit}</td></tr>`;
      }
      return `<tr>
        <td>${esc(f.label)}</td>
        <td>${start ? start + f.unit : '—'}</td>
        <td>${end ? end + f.unit + deltaStr : '—'}</td>
      </tr>`;
    }).join('') : '';

  const bodyHeader = isSnapshot
    ? `<tr><th>Measurement</th><th>Latest (${esc(latestStat.date)})</th></tr>`
    : `<tr><th>Measurement</th><th>Start (${esc(statFirst?.date || '')})</th><th>End${statEnd ? ' (' + esc(statEnd.date) + ')' : ''}</th></tr>`;

  const bodySection = displayStat ? `
  <div class="section">
    <div class="section-title">📏 Body Composition</div>
    ${isSnapshot ? `<p style="font-size:0.78rem;color:#9ca3af;margin-bottom:10px">No measurements recorded this month — showing latest available data.</p>` : ''}
    <table class="data-table">
      ${bodyHeader}
      ${bodyRows}
    </table>
  </div>` : '';

  const sessionsRows = monthCompleted.map(s =>
    `<tr><td>${esc(s.date)}</td><td>${esc(s.time || '—')}</td><td>${esc(s.type || 'Training')}</td></tr>`
  ).join('');

  const prRows = topPRs.map(([id, pr]) =>
    `<tr><td>${esc(exName(id))}</td><td style="font-weight:600;color:#2563eb">${esc(pr.weight)} kg</td><td style="color:#6b7280;font-size:0.85em">${esc(pr.date || '—')}</td></tr>`
  ).join('');

  const logRows = monthLogs.map(l =>
    `<tr><td style="white-space:nowrap">${esc(l.date)}</td><td>${(l.entries || []).map(e => esc(exName(e.exerciseId, e.name))).join(', ')}</td><td style="color:#6b7280;white-space:nowrap">${l.rpe ? `RPE ${esc(l.rpe)}` : '—'}</td></tr>`
  ).join('');

  const invoiceSection = includeInvoice ? `
    <div class="invoice-section">
      <div class="invoice-header">Fee Summary</div>
      <table class="data-table" style="margin-bottom:12px">
        <tr><td>${esc(month)} Training Services</td><td style="text-align:right;font-weight:600">${esc(invoiceCurrency)} ${Number(invoiceAmount || 0).toLocaleString()}</td></tr>
        ${invoiceDueDate ? `<tr><td style="color:#6b7280">Due Date</td><td style="text-align:right;color:#6b7280">${esc(invoiceDueDate)}</td></tr>` : ''}
      </table>
      ${paymentInfo ? `<div class="payment-info">Payment: ${esc(paymentInfo)}</div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(month)} Training Report — ${esc(client.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; font-size: 14px; line-height: 1.5; }
  .page { max-width: 720px; margin: 0 auto; padding: 40px; }
  /* Close button — screen only */
  .close-bar { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .close-btn { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 16px; font-size: 0.85rem; cursor: pointer; color: #374151; }
  /* Header */
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #2563eb; margin-bottom: 28px; }
  .report-title { font-size: 1.6rem; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
  .report-subtitle { font-size: 0.85rem; color: #6b7280; margin-top: 2px; }
  .trainer-info { text-align: right; font-size: 0.85rem; color: #374151; }
  .trainer-name { font-weight: 700; font-size: 1rem; color: #111; }
  /* Client strip */
  .client-strip { background: #f0f7ff; border-radius: 10px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
  .client-name { font-size: 1.15rem; font-weight: 700; }
  .client-meta { font-size: 0.8rem; color: #6b7280; margin-top: 2px; }
  .report-period { text-align: right; }
  .period-label { font-size: 0.75rem; color: #6b7280; }
  .period-val { font-size: 1rem; font-weight: 700; color: #2563eb; }
  /* Tagline */
  .tagline { font-size: 1rem; font-weight: 600; color: #16a34a; margin-bottom: 20px; }
  /* Stats grid — wraps automatically */
  .stats-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }
  .stat-box { flex: 1 1 120px; min-width: 100px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; }
  .stat-num { font-size: 1.6rem; font-weight: 800; color: #2563eb; }
  .stat-label { font-size: 0.75rem; color: #6b7280; margin-top: 2px; }
  /* Sections */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 1rem; font-weight: 700; color: #111; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  /* Tables */
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .data-table th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .data-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .data-table tr:last-child td { border-bottom: none; }
  /* Invoice */
  .invoice-section { margin-top: 32px; padding-top: 20px; border-top: 2px dashed #e5e7eb; }
  .invoice-header { font-size: 0.8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
  .payment-info { font-size: 0.85rem; color: #374151; background: #f9fafb; border-radius: 6px; padding: 10px 14px; }
  /* Footer */
  .report-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 0.75rem; color: #9ca3af; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px; }
    .close-bar { display: none; }
    @page { margin: 1.5cm; }
  }
</style>
</head><body><div class="page">

  <div class="close-bar">
    <button class="close-btn" onclick="window.close()">✕ Close</button>
  </div>

  <div class="report-header">
    <div>
      <div class="report-title">Monthly Training Report</div>
      <div class="report-subtitle">Progress Summary</div>
    </div>
    <div class="trainer-info">
      <div class="trainer-name">${esc(trainer.name || 'Trainer')}</div>
      ${trainer.speciality ? `<div>${esc(trainer.speciality)}</div>` : ''}
      <div style="color:#9ca3af">${esc(today)}</div>
    </div>
  </div>

  <div class="client-strip">
    <div>
      <div class="client-name">${esc(client.name)}</div>
      <div class="client-meta">${client.goals ? 'Goal: ' + esc(client.goals) : ''}</div>
    </div>
    <div class="report-period">
      <div class="period-label">Report Period</div>
      <div class="period-val">${esc(month)}</div>
    </div>
  </div>

  <div class="tagline">Great work this month, ${esc(client.name.split(' ')[0])}! 🎉</div>

  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-num">${monthCompleted.length}</div>
      <div class="stat-label">Sessions Completed</div>
    </div>
    ${attendancePct !== null ? `<div class="stat-box"><div class="stat-num">${attendancePct}%</div><div class="stat-label">Attendance</div></div>` : ''}
    <div class="stat-box">
      <div class="stat-num">${monthLogs.length}</div>
      <div class="stat-label">Workout Logs</div>
    </div>
    ${totalVolume > 0 ? `<div class="stat-box"><div class="stat-num">${(totalVolume / 1000).toFixed(1)}t</div><div class="stat-label">Total Volume</div></div>` : ''}
  </div>

  ${bodySection}

  ${topPRs.length > 0 ? `
  <div class="section">
    <div class="section-title">🏆 All-Time Personal Bests</div>
    <table class="data-table">
      <tr><th>Exercise</th><th>Best Weight</th><th>Achieved</th></tr>
      ${prRows}
    </table>
  </div>` : ''}

  ${monthCompleted.length > 0 ? `
  <div class="section">
    <div class="section-title">📋 Session Log</div>
    <table class="data-table">
      <tr><th>Date</th><th>Time</th><th>Type</th></tr>
      ${sessionsRows}
    </table>
  </div>` : ''}

  ${includeWorkoutSummary && monthLogs.length > 0 ? `
  <div class="section">
    <div class="section-title">💪 Workout Summary</div>
    <table class="data-table">
      <tr><th>Date</th><th>Exercises</th><th>Intensity</th></tr>
      ${logRows}
    </table>
  </div>` : ''}

  ${!hasAnyData ? `<div style="text-align:center;padding:40px 0;color:#9ca3af;font-size:0.95rem;">No training data recorded for this month yet.</div>` : ''}

  ${invoiceSection}

  <div class="report-footer">
    <span>Generated by ElitePro</span>
    <span>Contact your trainer for any queries</span>
  </div>

</div></body></html>`;
}
