import { useApp } from '../context/AppContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { localToday, localDateAdd } from '../utils/dateUtils';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import EmptyState from '../components/EmptyState';

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

function invTotal(inv) {
  return (inv.items || []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
}

export default function BusinessAnalyticsPage() {
  const { currentUser, getClients, getInvoices, getSchedule, getWorkoutLogs } = useApp();
  const today = localToday();
  const clients = getClients(currentUser.id);
  const invoices = getInvoices(currentUser.id);
  const schedule = getSchedule({ trainerId: currentUser.id });
  const months = last6Months();

  // Revenue by month (paid invoices only)
  const revenueByMonth = months.map(m => ({
    month: formatMonthLabel(m),
    revenue: invoices
      .filter(inv => inv.status === 'paid' && getMonthKey(inv.issueDate) === m)
      .reduce((s, inv) => s + invTotal(inv), 0),
  }));

  // Sessions by month (completed)
  const sessionsByMonth = months.map(m => ({
    month: formatMonthLabel(m),
    sessions: schedule.filter(s => s.status === 'completed' && getMonthKey(s.date) === m).length,
  }));

  // Retention: clients who have a workout log in last 30 days
  const recentCutoff = localDateAdd(-30);

  const activeClients = clients.filter(c => {
    const logs = getWorkoutLogs(c.id);
    return logs.some(l => l.date >= recentCutoff);
  });
  const retentionRate = clients.length > 0 ? Math.round((activeClients.length / clients.length) * 100) : 0;

  // Revenue summary
  const currentMonth = today.slice(0, 7);
  const paidThisMonth = invoices
    .filter(inv => inv.status === 'paid' && getMonthKey(inv.issueDate) === currentMonth)
    .reduce((s, inv) => s + invTotal(inv), 0);
  const totalUnpaid = invoices
    .filter(inv => inv.status === 'unpaid')
    .reduce((s, inv) => s + invTotal(inv), 0);
  const totalPaidYTD = invoices
    .filter(inv => inv.status === 'paid' && inv.issueDate?.startsWith(today.slice(0, 4)))
    .reduce((s, inv) => s + invTotal(inv), 0);

  // Top clients by completed sessions
  const clientSessionCounts = clients.map(c => ({
    name: c.name,
    sessions: schedule.filter(s => s.clientId === c.id && s.status === 'completed').length,
  })).sort((a, b) => b.sessions - a.sessions).slice(0, 5);

  const currency = invoices[0]?.currency || 'HKD';

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
      <div className="grid-4 mb-16">
        <div className="card stat-card">
          <DollarSign size={24} style={{ color: 'var(--success)', marginBottom: 8 }} />
          <div className="stat-value">{paidThisMonth.toLocaleString()}</div>
          <div className="stat-label">{currency} Earned This Month</div>
        </div>
        <div className="card stat-card">
          <TrendingUp size={24} style={{ color: 'var(--primary-light)', marginBottom: 8 }} />
          <div className="stat-value">{totalPaidYTD.toLocaleString()}</div>
          <div className="stat-label">{currency} Revenue YTD</div>
        </div>
        <div className="card stat-card">
          <Users size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div className="stat-value">{retentionRate}%</div>
          <div className="stat-label">30-Day Retention</div>
        </div>
        <div className="card stat-card">
          <Calendar size={24} style={{ color: 'var(--warning)', marginBottom: 8 }} />
          <div className="stat-value">{schedule.filter(s => s.status === 'completed').length}</div>
          <div className="stat-label">Sessions Completed</div>
        </div>
      </div>

      <div className="grid-2 mb-16">
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Revenue ({currency})</h3>
          </div>
          {revenueByMonth.every(m => m.revenue === 0) ? (
            <p className="text-sm text-muted" style={{ padding: '16px 0' }}>No paid invoices yet. Revenue will appear here once invoices are marked as paid.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`${currency} ${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
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
            <span className="text-sm text-muted">{activeClients.length} of {clients.length} clients trained</span>
            <span className="fw-bold" style={{ color: retentionRate >= 70 ? 'var(--success)' : retentionRate >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{retentionRate}%</span>
          </div>
          <div>
            {clients.map(c => {
              const logs = getWorkoutLogs(c.id);
              const isActive = logs.some(l => l.date >= recentCutoff);
              return (
                <div key={c.id} className="analytics-client-row">
                  <span className="analytics-client-dot" style={{ background: isActive ? 'var(--success)' : 'var(--border)' }} />
                  <span className="text-sm">{c.name}</span>
                  <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{isActive ? 'Active' : 'Inactive'}</span>
                </div>
              );
            })}
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
              <span className="text-sm" style={{ color: 'var(--warning)' }}>⚠ {currency} {totalUnpaid.toLocaleString()} in unpaid invoices</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
