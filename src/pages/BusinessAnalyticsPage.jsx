import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { localToday } from '../utils/dateUtils';
import { getInvoiceTotal } from '../utils/invoiceUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { isActiveWithin } from '../utils/activityUtils';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { SkeletonLine } from '../components/Skeleton';

const RETENTION_WINDOW_DAYS = 30;

// A top-up is a ledger row with no `type`; the typed rows ('overdraft',
// 'overdraft_reversed') are credit bookkeeping and carry no money. A null rate means the
// trainer recorded the sessions without a price, so it contributes nothing to revenue.
const topUpRevenue = (entries) => entries
  .filter(e => !e.type && typeof e.rate === 'number')
  .reduce((sum, e) => sum + e.qty * e.rate, 0);

function getMonthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : null; // 'YYYY-MM'
}

function formatMonthLabel(key) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
}

function last6Months() {
  const today = new Date(localToday());
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

export default function BusinessAnalyticsPage() {
  const { currentUser, getClients, getInvoices, getSchedule, getWorkoutLogs, getTrainerCreditLedger } = useApp();
  const today = localToday();
  const clients = getClients(currentUser.id);
  const invoices = getInvoices(currentUser.id);
  const schedule = getSchedule({ trainerId: currentUser.id });
  const months = last6Months();

  // Session top-ups are money the trainer took that never becomes an invoice, so revenue
  // read from invoices alone understates it. The ledger is a one-off fetch, not a live
  // listener — null means "still loading", and every revenue figure below stays hidden
  // until it lands rather than briefly displaying an understated total as if it were real.
  const [ledger, setLedger] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getTrainerCreditLedger(currentUser.id)
      .then(rows => { if (!cancelled) setLedger(rows); })
      .catch(() => { if (!cancelled) setLedger([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const revenueReady = ledger !== null;
  const ledgerEntries = ledger || [];

  const invoiceRevenue = (monthKey) => invoices
    .filter(inv => inv.status === 'paid' && getMonthKey(inv.issueDate) === monthKey)
    .reduce((s, inv) => s + getInvoiceTotal(inv.items), 0);

  // Revenue by month: paid invoices plus session top-ups, kept as separate series so the
  // trainer can see which half of the business each month came from.
  const revenueByMonth = months.map(m => ({
    month: formatMonthLabel(m),
    invoices: invoiceRevenue(m),
    renewals: topUpRevenue(ledgerEntries.filter(e => getMonthKey(e.date) === m)),
  }));

  // Sessions by month (completed)
  const sessionsByMonth = months.map(m => ({
    month: formatMonthLabel(m),
    sessions: schedule.filter(s => s.status === 'completed' && getMonthKey(s.date) === m).length,
  }));

  // Retention. A client who trains in booked sessions but rarely logs workouts is active,
  // so this goes through the shared judgement rather than reading workoutLogs directly.
  const activityDeps = { getWorkoutLogs, getSchedule, today };
  const clientActivity = clients.map(c => ({
    client: c,
    active: isActiveWithin(c.id, activityDeps, RETENTION_WINDOW_DAYS),
  }));
  const activeCount = clientActivity.filter(a => a.active).length;
  const retentionRate = clients.length > 0 ? Math.round((activeCount / clients.length) * 100) : 0;

  // Revenue summary
  const currentMonth = today.slice(0, 7);
  const year = today.slice(0, 4);
  const paidThisMonth = invoiceRevenue(currentMonth)
    + topUpRevenue(ledgerEntries.filter(e => getMonthKey(e.date) === currentMonth));
  const totalUnpaid = invoices
    .filter(inv => inv.status === 'unpaid')
    .reduce((s, inv) => s + getInvoiceTotal(inv.items), 0);
  const totalPaidYTD = invoices
    .filter(inv => inv.status === 'paid' && inv.issueDate?.startsWith(year))
    .reduce((s, inv) => s + getInvoiceTotal(inv.items), 0)
    + topUpRevenue(ledgerEntries.filter(e => e.date?.startsWith(year)));

  // Top clients by completed sessions
  const clientSessionCounts = clients.map(c => ({
    name: c.name,
    sessions: schedule.filter(s => s.clientId === c.id && s.status === 'completed').length,
  })).sort((a, b) => b.sessions - a.sessions).slice(0, 5);

  // The trainer's own default (CLAUDE.md #31). Top-up rates are always in it; invoices
  // carry their own per-invoice currency, so a trainer who bills in more than one is
  // summing unlike amounts here — pre-existing, and out of scope for this fix.
  const currency = currentUser.currency || 'GBP';

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No data yet"
        description="Add clients and book sessions to start seeing your business analytics."
        action={{ label: 'Add Client', to: '/clients' }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Business Analytics</h1>
        <p className="page-subtitle">Revenue, sessions &amp; client retention overview</p>
      </div>

      {/* Summary Stats */}
      <div className="stat-strip mb-16">
        <div className="stat-pill">
          <DollarSign size={15} style={{ color: 'var(--success)' }} />
          <div className="stat-pill-value">
            {revenueReady ? formatCurrency(paidThisMonth, currency) : <SkeletonLine width="70%" />}
          </div>
          <div className="stat-pill-label">Earned This Month</div>
        </div>
        <div className="stat-pill">
          <TrendingUp size={15} style={{ color: 'var(--primary-light)' }} />
          <div className="stat-pill-value">
            {revenueReady ? formatCurrency(totalPaidYTD, currency) : <SkeletonLine width="70%" />}
          </div>
          <div className="stat-pill-label">Revenue YTD</div>
        </div>
        <div className="stat-pill">
          <Users size={15} style={{ color: 'var(--accent)' }} />
          <div className="stat-pill-value">{retentionRate}%</div>
          <div className="stat-pill-label">30-Day Retention</div>
        </div>
        <div className="stat-pill">
          <Calendar size={15} style={{ color: 'var(--warning)' }} />
          <div className="stat-pill-value">{schedule.filter(s => s.status === 'completed').length}</div>
          <div className="stat-pill-label">Sessions Completed</div>
        </div>
      </div>

      <div className="grid-2 mb-16">
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Revenue ({currency})</h3>
          </div>
          {!revenueReady ? (
            <div style={{ padding: '16px 0' }}><SkeletonLine /><SkeletonLine width="80%" /><SkeletonLine width="60%" /></div>
          ) : revenueByMonth.every(m => m.invoices === 0 && m.renewals === 0) ? (
            <p className="text-sm text-muted" style={{ padding: '16px 0' }}>No revenue yet. Paid invoices and session top-ups will appear here.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v, key) => [formatCurrency(v, currency), key === 'renewals' ? 'Top-ups' : 'Invoices']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={k => (k === 'renewals' ? 'Top-ups' : 'Invoices')} />
                <Bar dataKey="invoices" stackId="rev" fill="var(--primary)" />
                <Bar dataKey="renewals" stackId="rev" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sessions Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Sessions Completed</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sessionsByMonth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={v => [v, 'Sessions']}
              />
              <Line type="monotone" dataKey="sessions" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: 'var(--accent)', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        {/* Retention */}
        <div className="card">
          <h3 className="card-title mb-16">Client Retention (30 days)</h3>
          <div className="analytics-retention-bar mb-8">
            <div className="analytics-retention-fill" style={{ width: `${retentionRate}%` }} />
          </div>
          <div className="flex-between mb-16">
            <span className="text-sm text-muted">{activeCount} of {clients.length} clients trained</span>
            <span className="fw-bold" style={{ color: retentionRate >= 70 ? 'var(--success)' : retentionRate >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{retentionRate}%</span>
          </div>
          <div>
            {clientActivity.map(({ client: c, active }) => (
              <div key={c.id} className="analytics-client-row">
                <span className="analytics-client-dot" style={{ background: active ? 'var(--success)' : 'var(--border)' }} />
                <span className="text-sm">{c.name}</span>
                <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{active ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients by Sessions */}
        <div className="card">
          <h3 className="card-title mb-16">Top Clients by Sessions</h3>
          {clientSessionCounts.length === 0 ? (
            <p className="text-sm text-muted">No completed sessions yet.</p>
          ) : (
            clientSessionCounts.map((c, i) => {
              const max = clientSessionCounts[0].sessions || 1;
              return (
                <div key={i} className="analytics-top-client">
                  <span className="analytics-top-rank">{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div className="flex-between mb-4">
                      <span className="text-sm fw-bold">{c.name}</span>
                      <span className="text-sm">{c.sessions} sessions</span>
                    </div>
                    <div className="analytics-bar-bg">
                      <div className="analytics-bar-fill" style={{ width: `${(c.sessions / max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {totalUnpaid > 0 && (
            <div className="analytics-unpaid-banner">
              <span className="text-sm" style={{ color: 'var(--warning)' }}>⚠ {formatCurrency(totalUnpaid, currency)} in unpaid invoices</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
