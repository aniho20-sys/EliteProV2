import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TrendingUp, TrendingDown, Minus, Activity, Dumbbell, Calendar, Users } from 'lucide-react';
import { localToday } from '../utils/dateUtils';
import EmptyState from '../components/EmptyState';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'lastActive', label: 'Last Active' },
  { value: 'weightChange', label: 'Weight Change' },
  { value: 'sessionsLeft', label: 'Sessions Left' },
];

function MiniSparkline({ data, color = 'var(--primary)' }) {
  if (!data || data.length < 2) return null;
  const W = 72, H = 28;
  const vals = data.map(Number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r={3} fill={color} />
    </svg>
  );
}

function TrendIcon({ change, goodDirection = 'down' }) {
  if (change === null || change === undefined || isNaN(change)) return <Minus size={14} style={{ color: 'var(--text-muted)' }} />;
  if (Math.abs(change) < 0.1) return <Minus size={14} style={{ color: 'var(--text-muted)' }} />;
  const isGood = goodDirection === 'down' ? change < 0 : change > 0;
  return change < 0
    ? <TrendingDown size={14} style={{ color: isGood ? 'var(--success)' : 'var(--danger)' }} />
    : <TrendingUp size={14} style={{ color: isGood ? 'var(--success)' : 'var(--danger)' }} />;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return diff;
}

function formatDaysAgo(days) {
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function SessionsBar({ used, total }) {
  if (total === null) return <span className="text-sm text-muted">Unlimited</span>;
  const pct = Math.min((used / total) * 100, 100);
  const remaining = total - used;
  const color = remaining <= 2 ? 'var(--danger)' : remaining <= 5 ? 'var(--warning)' : 'var(--success)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="text-sm text-muted">{used}/{total} sessions</span>
        <span className="text-sm" style={{ color, fontWeight: 600 }}>{remaining} left</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function ClientCard({ client, bodyStats, logs, nextSession, sessionStats, onClick }) {
  const latest = bodyStats[bodyStats.length - 1];
  const prev = bodyStats.length > 1 ? bodyStats[bodyStats.length - 2] : null;
  const weightChange = latest && prev ? latest.weight - prev.weight : null;
  const bfChange = latest && prev ? latest.bodyFat - prev.bodyFat : null;

  const lastLogDate = logs.length > 0 ? [...logs].sort((a, b) => b.date.localeCompare(a.date))[0]?.date : null;
  const daysSinceLog = daysSince(lastLogDate);

  const weightSparkline = bodyStats
    .filter(s => s.weight != null && s.weight !== '')
    .slice(-8)
    .map(s => s.weight);

  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="card client-progress-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Header */}
      <div className="client-progress-header">
        <div className="client-progress-avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="client-progress-name">{client.name}</div>
          {client.goals && (
            <div className="text-sm text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {client.goals}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="client-progress-stats">
        <div className="client-progress-stat">
          <span className="client-progress-stat-label">Weight</span>
          <span className="client-progress-stat-value">
            {latest?.weight ? `${latest.weight}kg` : '—'}
          </span>
          <TrendIcon change={weightChange} goodDirection="down" />
        </div>
        <div className="client-progress-stat">
          <span className="client-progress-stat-label">Body Fat</span>
          <span className="client-progress-stat-value">
            {latest?.bodyFat ? `${latest.bodyFat}%` : '—'}
          </span>
          <TrendIcon change={bfChange} goodDirection="down" />
        </div>
        <div className="client-progress-stat" style={{ alignItems: 'flex-start' }}>
          <span className="client-progress-stat-label">Weight Trend</span>
          <MiniSparkline data={weightSparkline} color="var(--primary)" />
        </div>
      </div>

      {/* Activity row */}
      <div className="client-progress-activity">
        <div className="client-progress-activity-item">
          <Dumbbell size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span className="text-sm text-muted">Last workout:</span>
          <span className="text-sm" style={{
            fontWeight: 600,
            color: daysSinceLog === null ? 'var(--text-muted)' :
              daysSinceLog <= 3 ? 'var(--success)' :
              daysSinceLog <= 7 ? 'var(--warning)' : 'var(--danger)'
          }}>
            {formatDaysAgo(daysSinceLog)}
          </span>
        </div>
        <div className="client-progress-activity-item">
          <Calendar size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span className="text-sm text-muted">Next session:</span>
          <span className="text-sm" style={{ fontWeight: 600 }}>
            {nextSession ? `${nextSession.date} ${nextSession.time}` : 'None'}
          </span>
        </div>
      </div>

      {/* Sessions quota */}
      <SessionsBar used={sessionStats.used} total={sessionStats.total} />
    </div>
  );
}

export default function ClientProgressOverviewPage() {
  const navigate = useNavigate();
  const { currentUser, getClients, getBodyStats, getWorkoutLogs, getSchedule, getSessionStats } = useApp();
  const [sort, setSort] = useState('lastActive');

  const clients = getClients(currentUser.id);
  const today = localToday();

  const enriched = clients.map(client => {
    const bodyStats = getBodyStats(client.id);
    const logs = getWorkoutLogs(client.id);
    const upcoming = getSchedule({ clientId: client.id })
      .filter(s => s.date >= today && s.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const nextSession = upcoming[0] || null;
    const sessionStats = getSessionStats(client.id);
    const latest = bodyStats[bodyStats.length - 1];
    const prev = bodyStats.length > 1 ? bodyStats[bodyStats.length - 2] : null;
    const weightChange = latest && prev ? latest.weight - prev.weight : null;
    const lastLog = logs.length > 0 ? [...logs].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
    const daysSinceLog = daysSince(lastLog?.date);
    return { client, bodyStats, logs, nextSession, sessionStats, latest, weightChange, daysSinceLog };
  });

  const sorted = [...enriched].sort((a, b) => {
    if (sort === 'name') return a.client.name.localeCompare(b.client.name);
    if (sort === 'lastActive') {
      const da = a.daysSinceLog ?? 9999;
      const db = b.daysSinceLog ?? 9999;
      return da - db;
    }
    if (sort === 'weightChange') {
      const wa = a.weightChange ?? 9999;
      const wb = b.weightChange ?? 9999;
      return wa - wb;
    }
    if (sort === 'sessionsLeft') {
      const ra = a.sessionStats.remaining ?? 9999;
      const rb = b.sessionStats.remaining ?? 9999;
      return ra - rb;
    }
    return 0;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Progress Overview</h1>
        <p className="page-subtitle">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Share your invite code to get your first client onboard."
          action={{ label: 'Go to Clients', to: '/clients' }}
        />
      ) : (
        <>
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>Sort by:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`btn btn-sm ${sort === opt.value ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="client-progress-grid">
            {sorted.map(({ client, bodyStats, logs, nextSession, sessionStats }) => (
              <ClientCard
                key={client.id}
                client={client}
                bodyStats={bodyStats}
                logs={logs}
                nextSession={nextSession}
                sessionStats={sessionStats}
                onClick={() => navigate(`/clients/${client.id}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
