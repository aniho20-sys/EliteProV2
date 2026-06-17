import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Calendar, Dumbbell, TrendingUp, MailCheck, CalendarOff, CheckCircle, Send, AlertTriangle, MessageCircle, Clock, ChevronRight, Copy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { localToday, localDateAdd, formatDayDate, getGreeting } from '../utils/dateUtils';

const SEVERITY_COLOR = { high: 'var(--danger)', mid: 'var(--warning)' };

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays() {
  const today = new Date();
  const offset = (today.getDay() + 6) % 7; // days since Monday
  return Array.from({ length: 7 }, (_, i) => localDateAdd(i - offset));
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
            <div className="client-activity-avatar">{client.name?.[0] || '?'}</div>
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

const INACTIVE_DAYS = 7;

function buildDefaultMsg(client, reasons) {
  const first = (client.name || 'there').split(' ')[0];
  if (reasons.lowSessions) {
    const n = reasons.remaining;
    return `Hey ${first}, just a heads-up — you've got ${n} session${n === 1 ? '' : 's'} remaining. Ready to top up? 💪`;
  }
  return `Hey ${first}, just checking in! Haven't seen a workout log in a while — everything okay? 🏋️`;
}

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, getClients, getSchedule, getUnreadCount, getMessages, getWorkoutPlans, getWorkoutLogs, updateScheduleItem, sendMessage, getClient, getSessionStats, incrementSessionOffset } = useApp();
  const completingRef = useRef(new Set());
  const [recapSession, setRecapSession] = useState(null);
  const [recapNote, setRecapNote] = useState('');
  const [recapSend, setRecapSend] = useState(true);
  const [savingRecap, setSavingRecap] = useState(false);
  const [quickMsgClient, setQuickMsgClient] = useState(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [sendingQuick, setSendingQuick] = useState(false);

  const openRecap = (e, session) => {
    e.preventDefault();
    e.stopPropagation();
    if (completingRef.current.has(session.id)) return;
    const client = getClient(session.clientId);
    setRecapNote(`Great session today, ${client?.name?.split(' ')[0] || 'client'}! 💪`);
    setRecapSend(true);
    setRecapSession(session);
  };

  const handleConfirmComplete = async () => {
    if (!recapSession) return;
    setSavingRecap(true);
    completingRef.current.add(recapSession.id);
    const clientId = recapSession.clientId;
    const { total, used: prevUsed } = getSessionStats(clientId);
    try {
      await updateScheduleItem(recapSession.id, { status: 'completed' });

      let deducted = false;
      if (clientId) {
        try {
          await incrementSessionOffset(clientId);
          deducted = true;
        } catch (err) {
          console.error('[incrementSessionOffset] failed:', err?.code || err?.message || err, 'clientId:', clientId);
        }
      }

      if (recapSend && recapNote.trim()) {
        const fullMsg = `📋 Session Recap — ${recapSession.date} ${recapSession.time}\nType: ${recapSession.type}\n\n${recapNote.trim()}`;
        await sendMessage(currentUser.id, clientId, fullMsg);
      }

      const recapMsg = recapSend && recapNote.trim() ? ' — recap sent to client' : '';
      if (deducted && total !== null) {
        toast(`Session complete · ${prevUsed + 1}/${total} sessions used${recapMsg}`);
      } else {
        toast(`Session marked as complete${recapMsg}`);
      }
      setRecapSession(null);
    } catch {
      toast('Failed to update session', 'error');
    } finally {
      completingRef.current.delete(recapSession.id);
      setSavingRecap(false);
    }
  };
  const handleOpenQuickMsg = (client, reasons) => {
    setQuickMsgText(buildDefaultMsg(client, reasons));
    setQuickMsgClient({ client, reasons });
  };

  const handleSendQuickMsg = async () => {
    if (!quickMsgClient || !quickMsgText.trim()) return;
    setSendingQuick(true);
    try {
      await sendMessage(currentUser.id, quickMsgClient.client.id, quickMsgText.trim());
      toast('Message sent');
      setQuickMsgClient(null);
    } catch {
      toast('Failed to send message', 'error');
    } finally {
      setSendingQuick(false);
    }
  };

  const clients = getClients(currentUser.id);
  const allPlans = getWorkoutPlans({ trainerId: currentUser.id });
  const totalPlans = allPlans.length;
  const today = localToday();
  const todayMs = new Date(today).getTime();
  const todaySchedule = getSchedule({ trainerId: currentUser.id, date: today });
  const unread = getUnreadCount(currentUser.id);
  const recentMessages = getMessages(currentUser.id)
    .filter(m => m.to === currentUser.id && !m.read)
    .slice(0, 3);

  const upcomingToday = todaySchedule
    .filter(s => s.status !== 'cancelled' && s.status !== 'completed' && !s.isBlocked)
    .sort((a, b) => a.time.localeCompare(b.time));
  const nowStr = new Date().toTimeString().slice(0, 5);
  const nextSession = upcomingToday.find(s => s.time >= nowStr) || upcomingToday[0];
  const nextClient = nextSession ? clients.find(c => c.id === nextSession.clientId) : null;
  let nextCountdown = null;
  if (nextSession) {
    const [h, m] = nextSession.time.split(':').map(Number);
    const sessionTime = new Date();
    sessionTime.setHours(h, m, 0, 0);
    const diffMin = Math.round((sessionTime.getTime() - Date.now()) / 60000);
    if (diffMin > 0) {
      const hh = Math.floor(diffMin / 60);
      const mm = diffMin % 60;
      nextCountdown = hh > 0 ? `in ${hh}h ${mm}m` : `in ${mm}m`;
    } else {
      nextCountdown = 'Now';
    }
  }

  const weekDays = getWeekDays();
  const weekSchedule = getSchedule({ trainerId: currentUser.id }).filter(s => weekDays.includes(s.date) && !s.isBlocked && s.status !== 'cancelled');
  const confirmedCount = weekSchedule.filter(s => s.status === 'confirmed').length;

  const atRiskClients = clients.reduce((acc, client) => {
    const logs = getWorkoutLogs(client.id);
    const latest = logs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const daysSince = latest
      ? Math.floor((todayMs - new Date(latest.date).getTime()) / 86400000)
      : null;
    const lastWorkoutName = latest
      ? (allPlans.find(p => p.id === latest.planId)?.name || latest.workoutName || 'Workout')
      : null;
    const { remaining } = getSessionStats(client.id);
    const inactive = daysSince === null || daysSince >= INACTIVE_DAYS;
    const lowSessions = remaining !== null && remaining <= 2;
    if (inactive || lowSessions) {
      acc.push({ client, daysSince, lastWorkoutName, reasons: { inactive, lowSessions, remaining } });
    }
    return acc;
  }, []).sort((a, b) => {
    const aScore = (a.reasons.lowSessions ? 2 : 0) + (a.reasons.inactive ? 1 : 0);
    const bScore = (b.reasons.lowSessions ? 2 : 0) + (b.reasons.inactive ? 1 : 0);
    return bScore - aScore;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-date">{formatDayDate(today)}</div>
        <h1 className="page-title">{getGreeting()}, {currentUser.name.split(' ')[0]}</h1>
      </div>

      {clients.length === 0 && (
        <div className="card onboarding-card mb-16">
          <h3 className="card-title">Get Started</h3>
          <p className="text-sm text-secondary mt-8">Your training platform — 3 steps to go live:</p>
          {currentUser.inviteCode && (
            <div className="onboarding-invite-block">
              <span className="text-sm text-muted">Share your invite code with clients:</span>
              <div className="onboarding-invite-row">
                <span className="invite-code-badge">{currentUser.inviteCode}</span>
                <button className="btn btn-sm btn-outline" onClick={() => {
                  navigator.clipboard.writeText(currentUser.inviteCode).catch(() => {});
                  toast('Invite code copied!');
                }}>
                  <Copy size={13} /> Copy
                </button>
              </div>
            </div>
          )}
          <div className="onboarding-steps">
            <Link to="/clients" className="onboarding-step">
              <span className="onboarding-num">1</span>
              <span>Client enters code to connect</span>
            </Link>
            <Link to="/plans" className="onboarding-step">
              <span className="onboarding-num">2</span>
              <span>Assign a workout plan</span>
            </Link>
            <Link to="/schedule" className="onboarding-step">
              <span className="onboarding-num">3</span>
              <span>Book your first session</span>
            </Link>
          </div>
        </div>
      )}

      {/* Compact stat strip */}
      <div className="stat-strip mb-16">
        <Link to="/clients" className="stat-pill">
          <Users size={15} style={{ color: 'var(--primary-light)' }} />
          <div className="stat-pill-value">{clients.length}</div>
          <div className="stat-pill-label">Clients</div>
        </Link>
        <Link to="/schedule" className="stat-pill">
          <Calendar size={15} style={{ color: 'var(--accent)' }} />
          <div className="stat-pill-value">{todaySchedule.length}</div>
          <div className="stat-pill-label">Today</div>
        </Link>
        <Link to="/messages" className="stat-pill">
          <TrendingUp size={15} style={{ color: 'var(--warning)' }} />
          <div className="stat-pill-value">{unread}</div>
          <div className="stat-pill-label">Unread</div>
        </Link>
        <Link to="/plans" className="stat-pill">
          <Dumbbell size={15} style={{ color: 'var(--danger)' }} />
          <div className="stat-pill-value">{totalPlans}</div>
          <div className="stat-pill-label">Plans</div>
        </Link>
      </div>

      {/* Up next */}
      <div className="hero-card mb-16">
        <div className="hero-card-inner">
          <div className="hero-card-top">
            <span className="hero-card-label">Up next</span>
            {nextSession && (
              <span className="hero-card-time"><Clock size={12} /> {nextCountdown}</span>
            )}
          </div>
          {nextSession ? (
            <div className="hero-card-body">
              <div className="hero-avatar">{nextClient?.name?.[0] || '?'}</div>
              <div className="hero-card-info">
                <div className="hero-card-title">{nextClient?.name || 'Unknown'} · {nextSession.time}</div>
                <div className="hero-card-sub">{nextSession.type} · {nextSession.duration || 60}min</div>
              </div>
              <Link to={`/clients/${nextSession.clientId}`} className="btn-icon"><ChevronRight size={18} /></Link>
            </div>
          ) : (
            <div className="hero-card-empty">
              <span className="hero-card-empty-text">No sessions scheduled today</span>
              <Link to="/schedule" className="btn btn-sm btn-primary">Book a session</Link>
            </div>
          )}
        </div>
      </div>

      {/* Needs attention */}
      {atRiskClients.length > 0 && (
        <div className="needs-attention mb-16">
          <div className="needs-attention-header">
            <div className="flex gap-8" style={{ alignItems: 'center' }}>
              <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
              <span className="needs-attention-title">Needs attention</span>
              <span className="needs-attention-count">{atRiskClients.length}</span>
            </div>
            <Link to="/clients" className="needs-attention-viewall">View all</Link>
          </div>
          {atRiskClients.map(({ client, daysSince, lastWorkoutName, reasons }) => {
            const severity = reasons.lowSessions ? 'high' : 'mid';
            const reasonText = reasons.lowSessions
              ? (reasons.remaining === 0 ? 'Sessions used up' : `${reasons.remaining} session${reasons.remaining === 1 ? '' : 's'} left`)
              : (daysSince === null ? 'No logs yet' : `Inactive ${daysSince} day${daysSince === 1 ? '' : 's'}`);
            const hintText = reasons.lowSessions
              ? 'Renewal due'
              : (lastWorkoutName ? `Last: ${lastWorkoutName}` : 'No workouts yet');
            return (
              <div key={client.id} className="needs-attention-item" style={{ borderLeftColor: SEVERITY_COLOR[severity] }}>
                <Link to={`/clients/${client.id}`} className="needs-attention-avatar">{client.name?.[0] || '?'}</Link>
                <Link to={`/clients/${client.id}`} className="needs-attention-info" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="needs-attention-name">{client.name}</div>
                  <div className="needs-attention-meta">
                    <span style={{ color: SEVERITY_COLOR[severity], fontWeight: 600 }}>{reasonText}</span>
                    <span className="text-muted"> · {hintText}</span>
                  </div>
                </Link>
                <button
                  className="needs-attention-msg"
                  onClick={() => handleOpenQuickMsg(client, reasons)}
                  title="Send follow-up message"
                >
                  <MessageCircle size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

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
                    <div className="schedule-type">{s.type} - {s.duration || 60}min</div>
                  </div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <span className={`tag ${s.status === 'completed' ? 'tag-accent' : s.status === 'confirmed' ? 'tag-primary' : 'tag-warning'}`}>{s.status}</span>
                    {s.status === 'confirmed' && (
                      <button
                        className="btn-icon"
                        onClick={(e) => openRecap(e, s)}
                        title="Mark as complete"
                      >
                        <CheckCircle size={16} style={{ color: 'var(--accent)' }} />
                      </button>
                    )}
                  </div>
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

      {quickMsgClient && (
        <div className="modal-overlay" onClick={() => !sendingQuick && setQuickMsgClient(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Follow-up Message</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
              To: <strong>{quickMsgClient.client.name}</strong>
            </p>
            <div className="form-group">
              <textarea
                className="form-textarea"
                rows={4}
                value={quickMsgText}
                onChange={e => setQuickMsgText(e.target.value)}
                disabled={sendingQuick}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setQuickMsgClient(null)} disabled={sendingQuick}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendQuickMsg} disabled={sendingQuick || !quickMsgText.trim()}>
                {sendingQuick ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {recapSession && (
        <div className="modal-overlay" onClick={() => !savingRecap && setRecapSession(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Complete Session</h3>
            <div className="recap-session-info">
              <div className="recap-row"><span className="form-label">Client</span><span>{getClient(recapSession.clientId)?.name || '—'}</span></div>
              <div className="recap-row"><span className="form-label">Date</span><span>{recapSession.date} · {recapSession.time}</span></div>
              <div className="recap-row"><span className="form-label">Type</span><span>{recapSession.type}</span></div>
            </div>
            <div className="form-group">
              <label className="form-label">Message to client (optional)</label>
              <textarea className="form-textarea" rows={3} value={recapNote} onChange={e => setRecapNote(e.target.value)} placeholder="Add a note for the client…" disabled={savingRecap} />
            </div>
            <label className="recap-send-toggle">
              <input type="checkbox" checked={recapSend} onChange={e => setRecapSend(e.target.checked)} disabled={savingRecap} />
              <Send size={14} />
              Send recap message to client
            </label>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRecapSession(null)} disabled={savingRecap}>Cancel</button>
              <button className="btn btn-accent" onClick={handleConfirmComplete} disabled={savingRecap}>{savingRecap ? 'Saving…' : 'Mark Complete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
