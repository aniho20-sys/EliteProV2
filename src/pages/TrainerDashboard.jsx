import { useApp } from '../context/AppContext';
import { Users, Calendar, Dumbbell, TrendingUp, MailCheck, CalendarOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function WeeklySessionsChart({ weekDays, schedule, today }) {
  const counts = weekDays.map(d => schedule.filter(s => s.date === d).length);
  const max = Math.max(...counts, 1);
  const W = 280, H = 72, BAR_W = 28;
  const GAP = (W - BAR_W * 7) / 8;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ overflow: 'visible' }}>
      {counts.map((count, i) => {
        const x = GAP + i * (BAR_W + GAP);
        const barH = Math.max((count / max) * H, count > 0 ? 6 : 3);
        const y = H - barH;
        const isToday = weekDays[i] === today;
        const fill = isToday ? 'var(--primary)' : count > 0 ? 'var(--primary-light)' : 'var(--border)';
        return (
          <g key={i}>
            <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill={fill} opacity={isToday ? 1 : 0.75} />
            {count > 0 && (
              <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="var(--text)" fontWeight="600">
                {count}
              </text>
            )}
            <text
              x={x + BAR_W / 2} y={H + 16}
              textAnchor="middle" fontSize="10"
              fill={isToday ? 'var(--primary)' : 'var(--text-muted)'}
              fontWeight={isToday ? '700' : '400'}
            >
              {DAY_LABELS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ClientActivityList({ clients, getWorkoutLogs, today }) {
  const todayMs = new Date(today).getTime();

  const activity = clients.map(client => {
    const logs = getWorkoutLogs(client.id);
    const latest = logs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const daysSince = latest
      ? Math.floor((todayMs - new Date(latest.date).getTime()) / 86400000)
      : null;
    return { client, daysSince };
  }).sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return 0;
    if (a.daysSince === null) return 1;
    if (b.daysSince === null) return -1;
    return a.daysSince - b.daysSince;
  });

  const getActivityMeta = (days) => {
    if (days === null) return { label: 'No logs yet', color: 'var(--text-muted)', pct: 0 };
    if (days === 0) return { label: 'Today', color: 'var(--success)', pct: 100 };
    if (days <= 7) return { label: `${days}d ago`, color: 'var(--success)', pct: Math.round((1 - days / 7) * 60 + 40) };
    if (days <= 14) return { label: `${days}d ago`, color: 'var(--warning)', pct: Math.round((1 - (days - 7) / 7) * 35 + 5) };
    return { label: `${days}d ago`, color: 'var(--danger)', pct: 5 };
  };

  return (
    <div className="client-activity-list">
      {activity.map(({ client, daysSince }) => {
        const { label, color, pct } = getActivityMeta(daysSince);
        return (
          <Link key={client.id} to={`/clients/${client.id}`} className="client-activity-item">
            <div className="client-activity-avatar">{client.name[0]}</div>
            <div className="client-activity-info">
              <div className="client-activity-name">{client.name}</div>
              <div className="client-activity-bar-wrap">
                <div className="client-activity-bar" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
            <span className="client-activity-label" style={{ color }}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { currentUser, getClients, getSchedule, getUnreadCount, getMessages, getWorkoutPlans, getWorkoutLogs } = useApp();
  const clients = getClients(currentUser.id);
  const totalPlans = getWorkoutPlans({ trainerId: currentUser.id }).length;
  const today = new Date().toISOString().split('T')[0];
  const todaySchedule = getSchedule({ trainerId: currentUser.id, date: today });
  const unread = getUnreadCount(currentUser.id);
  const recentMessages = getMessages(currentUser.id)
    .filter(m => m.to === currentUser.id && !m.read)
    .slice(0, 3);

  const weekDays = getWeekDays();
  const weekSchedule = getSchedule({ trainerId: currentUser.id }).filter(s => weekDays.includes(s.date));
  const confirmedCount = weekSchedule.filter(s => s.status === 'confirmed').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
        <p className="page-subtitle">Here&apos;s your overview for today</p>
      </div>

      {clients.length === 0 && (
        <div className="card onboarding-card mb-16">
          <h3 className="card-title">Get Started</h3>
          <p className="text-sm text-secondary mt-8">Set up your training platform in 3 steps:</p>
          <div className="onboarding-steps">
            <Link to="/clients" className="onboarding-step">
              <span className="onboarding-num">1</span>
              <span>Add your first client</span>
            </Link>
            <Link to="/plans" className="onboarding-step">
              <span className="onboarding-num">2</span>
              <span>Create a workout plan</span>
            </Link>
            <Link to="/schedule" className="onboarding-step">
              <span className="onboarding-num">3</span>
              <span>Book a session</span>
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4 mb-16">
        <div className="card stat-card">
          <Users size={24} style={{ color: 'var(--primary-light)', marginBottom: 8 }} />
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Active Clients</div>
        </div>
        <div className="card stat-card">
          <Calendar size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div className="stat-value">{todaySchedule.length}</div>
          <div className="stat-label">Sessions Today</div>
        </div>
        <div className="card stat-card">
          <TrendingUp size={24} style={{ color: 'var(--warning)', marginBottom: 8 }} />
          <div className="stat-value">{unread}</div>
          <div className="stat-label">Unread Messages</div>
        </div>
        <div className="card stat-card">
          <Dumbbell size={24} style={{ color: 'var(--danger)', marginBottom: 8 }} />
          <div className="stat-value">{totalPlans}</div>
          <div className="stat-label">Workout Plans</div>
        </div>
      </div>

      {/* Today + Messages */}
      <div className="grid-2 mb-16">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today&apos;s Schedule</h3>
            <Link to="/schedule" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {todaySchedule.length === 0 ? (
            <EmptyState
              inCard={false}
              compact
              icon={CalendarOff}
              title="No sessions today"
              description="Enjoy the rest day, or book a new session from the Schedule page."
              action={{ label: 'Open Schedule', to: '/schedule' }}
            />
          ) : (
            todaySchedule.sort((a, b) => a.time.localeCompare(b.time)).map(s => {
              const client = clients.find(c => c.id === s.clientId);
              return (
                <Link key={s.id} to={`/clients/${s.clientId}`} className="schedule-item schedule-item-link">
                  <div className="schedule-time">{s.time}</div>
                  <div className="schedule-info">
                    <div className="schedule-client">{client?.name || 'Unknown'}</div>
                    <div className="schedule-type">{s.type} - 60min</div>
                  </div>
                  <span className={`tag ${s.status === 'confirmed' ? 'tag-accent' : 'tag-warning'}`}>{s.status}</span>
                </Link>
              );
            })
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Unread Messages</h3>
          </div>
          {recentMessages.length === 0 ? (
            <EmptyState
              inCard={false}
              compact
              icon={MailCheck}
              title="All caught up!"
              description="No unread messages from your clients right now."
            />
          ) : (
            recentMessages.map(m => {
              const sender = clients.find(c => c.id === m.from);
              return (
                <div key={m.id} className="contact-item" onClick={() => navigate('/messages')}>
                  <div className="contact-avatar">{sender?.name?.[0] || '?'}</div>
                  <div className="contact-info">
                    <div className="contact-name">{sender?.name || 'Unknown'}</div>
                    <div className="contact-preview">{m.text}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">This Week&apos;s Sessions</h3>
            <Link to="/schedule" className="btn btn-outline btn-sm">Schedule</Link>
          </div>
          <div style={{ padding: '8px 4px 0' }}>
            <WeeklySessionsChart weekDays={weekDays} schedule={weekSchedule} today={today} />
          </div>
          <div className="week-chart-footer">
            <span>{weekSchedule.length} session{weekSchedule.length !== 1 ? 's' : ''} this week</span>
            <span style={{ color: 'var(--success)' }}>{confirmedCount} confirmed</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Client Activity</h3>
            <Link to="/clients" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {clients.length === 0 ? (
            <EmptyState
              inCard={false}
              compact
              icon={Users}
              title="No clients yet"
              description="Invite your first client to see their activity here."
              action={{ label: 'Get Invite Code', to: '/clients' }}
            />
          ) : (
            <ClientActivityList clients={clients} getWorkoutLogs={getWorkoutLogs} today={today} />
          )}
        </div>
      </div>
    </div>
  );
}
