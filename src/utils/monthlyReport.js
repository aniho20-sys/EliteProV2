import { calcVolume } from './workoutUtils';

// The numbers in a client's monthly report, worked out once. MonthlyReportModal shows a
// preview of them and reportPdf.js prints them; both read this, so the preview can never
// promise a figure the PDF then contradicts.

const localeFor = (lang) => (lang === 'zh-HK' ? 'zh-HK' : 'en-GB');

// 'YYYY-MM' → 'September 2026' / '2026年9月'.
export function reportMonthLabel(month, lang) {
  const [y, m] = String(month).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(localeFor(lang), { year: 'numeric', month: 'long' });
}

export function reportDateLabel(date, lang) {
  return date.toLocaleDateString(localeFor(lang), { year: 'numeric', month: 'long', day: 'numeric' });
}

export const BODY_FIELDS = [
  { key: 'weight', unit: 'kg' },
  { key: 'bodyFat', unit: '%' },
  { key: 'chest', unit: 'cm' },
  { key: 'waist', unit: 'cm' },
  { key: 'hips', unit: 'cm' },
  { key: 'arms', unit: 'cm' },
  { key: 'legs', unit: 'cm' },
];

// month is 'YYYY-MM'.
export function buildMonthlyReport({ month, logs, schedule, bodyStats, prs }) {
  const inMonth = (d) => typeof d === 'string' && d.startsWith(month);

  const monthLogs = (logs || []).filter(l => inMonth(l.date))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const booked = (schedule || []).filter(s => inMonth(s.date) && !s.isBlocked);
  const completed = booked.filter(s => s.status === 'completed')
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const attendancePct = booked.length > 0 ? Math.round((completed.length / booked.length) * 100) : null;
  const totalVolume = Math.round(monthLogs.reduce((sum, log) => sum + calcVolume(log.entries), 0));

  const topPRs = Object.entries(prs || {})
    .filter(([, pr]) => pr && pr.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 6)
    .map(([exerciseId, pr]) => ({ exerciseId, weight: pr.weight, date: pr.date || null }));

  // Body composition: first and last measurement inside the month when there are any;
  // otherwise the most recent one ever taken, shown as a snapshot rather than a change.
  const sorted = [...(bodyStats || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const monthStats = sorted.filter(s => inMonth(s.date));
  let body = null;
  if (monthStats.length > 0) {
    const first = monthStats[0];
    const last = monthStats.length > 1 ? monthStats[monthStats.length - 1] : null;
    const rows = BODY_FIELDS.filter(f => first[f.key]).map(f => {
      const start = Number(first[f.key]);
      const end = last && last[f.key] ? Number(last[f.key]) : null;
      return { ...f, start, end, delta: end !== null && end !== start ? end - start : null };
    });
    body = { mode: 'range', startDate: first.date, endDate: last ? last.date : null, rows };
  } else if (sorted.length > 0) {
    const latest = sorted[sorted.length - 1];
    const rows = BODY_FIELDS.filter(f => latest[f.key]).map(f => ({ ...f, value: Number(latest[f.key]) }));
    body = { mode: 'snapshot', date: latest.date, rows };
  }
  if (body && body.rows.length === 0) body = null;

  const hasAnyData = completed.length > 0 || monthLogs.length > 0 || topPRs.length > 0 || !!body;

  return { month, monthLogs, booked, completed, attendancePct, totalVolume, topPRs, body, hasAnyData };
}
