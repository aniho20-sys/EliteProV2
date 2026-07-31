import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Calendar, Dumbbell, TrendingUp, MailCheck, CalendarOff, CheckCircle, Send, AlertTriangle, MessageCircle, Clock, ChevronRight, ChevronDown, Copy, ClipboardList } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { localToday, localDateAdd, formatDayDate, getGreeting } from '../utils/dateUtils';
import { getLastActivity, getClientActivityDates } from '../utils/activityUtils';
import { SESSION_DANGER_THRESHOLD } from '../utils/sessionUtils';

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

// Positioned right below Needs Attention, but deliberately undramatic: this is a status
// summary, not a warning system — recency uses neutral gray text, never red/yellow/green.
// Needs Attention already owns the "this client needs action" call-out.
function ClientActivitySummary({ clients, getWorkoutLogs, getSchedule, plans, today }) {
  const [expanded, setExpanded] = useState(false);
  const weekStart = localDateAdd(today, -7);

  const activity = clients.map(client => ({
    client,
    ...getLastActivity(client.id, { getWorkoutLogs, getSchedule, plans, today }),
  })).sort((a, b) => (a.daysSince ?? Infinity) - (b.daysSince ?? Infinity));

  const activeThisWeek = clients.filter(client =>
    getClientActivityDates(client.id, { getWorkoutLogs, getSchedule }).some(d => d >= weekStart)
  ).length;

  const formatDaysSince = (days) => {
    if (days === null) return 'No activity yet';
    if (days === 0) return 'Today';
    return `${days}d ago`;
  };

  return (
    <div className="card mb-16">
      <button type="button" className="client-activity-summary-toggle" onClick={() => setExpanded(v => !v)}>
        <Users size={16} />
        <span>Active this week: <strong>{activeThisWeek}/{clients.length}</strong> clients</span>
        <ChevronDown size={16} className={`client-activity-chevron${expanded ? ' open' : ''}`} />
      </button>
      {expanded && (
        <div className="client-activity-list">
          {activity.map(({ client, daysSince, label }) => (
            <Link key={client.id} to={`/clients/${client.id}`} className="client-activity-item">
              <div className="client-activity-avatar">{client.name?.[0] || '?'}</div>
              <div className="client-activity-info">
                <div className="client-activity-name">{client.name}</div>
                {label && <div className="client-activity-detail">{label}</div>}
              </div>
              <span className="client-activity-label">{formatDaysSince(daysSince)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const CHURN_INACTIVE_DAYS = 21;
const SNOOZE_OPTIONS = [7, 14, 30];

function buildDefaultMsg(client, reasons) {
  const first = (client.name || 'there').split(' ')[0];
  if (reasons.lowSessions) {
    const n = reasons.remaining;
    return `Hey ${first}, just a heads-up — you've got ${n} session${n === 1 ? '' : 's'} remaining. Ready to top up? 💪`;
  }
  if (reasons.missingProfile) {
    return `Hey ${first}, could you fill out your training profile when you get a sec? It helps me plan your sessions safely (goals, experience, any injuries) 🙏`;
  }
  return `Hey ${first}, just checking in! Haven't seen a workout log in a while — everything okay? 🏋️`;
}

function buildRenewalMsg(client, remaining, trainer) {
  const first = (client.name || 'there').split(' ')[0];
  const n = remaining;
  if (trainer?.renewalRate && trainer?.renewalRateNext) {
    return `Hey ${first}, you've got ${n} session${n === 1 ? '' : 's'} left — renew now to keep your current rate (£${trainer.renewalRate}/session)! After that, renewal moves to £${trainer.renewalRateNext}/session.`;
  }
  return `Hey ${first}, just a heads-up — you've got ${n} session${n === 1 ? '' : 's'} remaining. Ready to top up? 💪`;
}

// 'YYYY-MM-DD' strings compare lexicographically same as chronologically.
const isSnoozed = (dateStr, today) => !!dateStr && dateStr > today;

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, getClients, getSchedule, getUnreadCount, getMessages, getWorkoutPlans, getWorkoutLogs, updateScheduleItem, updateClient, sendMessage, getClient, getSessionStats } = useApp();
  const completingRef = useRef(new Set());
  const [recapSession, setRecapSession] = useState(null);
  const [recapNote, setRecapNote] = useState('');
  const [recapSend, setRecapSend] = useState(true);
  const [savingRecap, setSavingRecap] = useState(false);
  const [quickMsgClient, setQuickMsgClient] = useState(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [sendingQuick, setSendingQuick] = useState(false);
  const [showAttentionAll, setShowAttentionAll] = useState(false);
  const [snoozeMenuFor, setSnoozeMenuFor] = useState(null); // `${category}-${clientId}` or null
  const [sendingReminderFor, setSendingReminderFor] = useState(null); // clientId

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
    try {
      await updateScheduleItem(recapSession.id, { status: 'completed' });

      // Credit was already deducted when this session was booked (sessions ARE
      // session credit); the onScheduleCreditUpdate function only charges here
      // as a catch-up for sessions booked before that model shipped.

      if (recapSend && recapNote.trim() && clientId) {
        const fullMsg = `📋 Session Recap — ${recapSession.date} ${recapSession.time}\nType: ${recapSession.type}\n\n${recapNote.trim()}`;
        await sendMessage(currentUser.id, clientId, fullMsg);
      }

      const recapMsg = recapSend && recapNote.trim() ? ' — recap sent to client' : '';
      toast(`Session marked as complete${recapMsg}`);
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

  // Sends the renewal nudge directly (no draft/edit step) and snoozes this
  // item for 7 days so it leaves the list — the client's own dashboard still
  // owns the actual reminder banner/payment sheet; this just prompts them to
  // go look.
  const handleSendRenewalReminder = async (client, remaining) => {
    setSendingReminderFor(client.id);
    try {
      const msg = buildRenewalMsg(client, remaining, currentUser);
      await sendMessage(currentUser.id, client.id, msg);
      await updateClient(client.id, { renewalSnoozedUntil: localDateAdd(7) });
      toast(`Renewal reminder sent to ${client.name}`);
    } catch {
      toast('Failed to send reminder', 'error');
    } finally {
      setSendingReminderFor(null);
    }
  };

  const handleSnooze = async (clientId, category, days) => {
    const field = category === 'renewal' ? 'renewalSnoozedUntil' : 'churnSnoozedUntil';
    setSnoozeMenuFor(null);
    try {
      await updateClient(clientId, { [field]: localDateAdd(days) });
      toast(`Snoozed for ${days} days`);
    } catch {
      toast('Failed to snooze', 'error');
    }
  };

  const clients = getClients(currentUser.id);
  const allPlans = getWorkoutPlans({ trainerId: currentUser.id });
  const totalPlans = allPlans.length;
  const today = localToday();
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

  // Two independent tracks — a client can appear in both if they genuinely
  // qualify for both, and each has its own snooze so handling/snoozing one
  // never hides the other.
  const renewalClients = clients.reduce((acc, client) => {
    const { remaining } = getSessionStats(client.id);
    if (remaining !== null && remaining <= SESSION_DANGER_THRESHOLD && !isSnoozed(client.renewalSnoozedUntil, today)) {
      acc.push({ client, remaining });
    }
    return acc;
  }, []).sort((a, b) => a.remaining - b.remaining);

  // "Last activity" = most recent of (last workout log, last completed session) — a client
  // who trains weekly via booked sessions but rarely logs workouts is still active, not churning.
  const churnClients = clients.reduce((acc, client) => {
    const { daysSince, label: lastActivityLabel } = getLastActivity(client.id, { getWorkoutLogs, getSchedule, plans: allPlans, today });
    const inactive = daysSince === null || daysSince >= CHURN_INACTIVE_DAYS;
    if (inactive && !isSnoozed(client.churnSnoozedUntil, today)) {
      acc.push({ client, daysSince, lastActivityLabel });
    }
    return acc;
  }, []).sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

  // A client with a real upcoming session but no training profile is a safety gap
  // (injuries/conditions the coach should know about) — no snooze here, since the
  // only real resolution is the client actually completing it.
  const trainingProfileClients = clients.reduce((acc, client) => {
    if (client.intakeCompleted) return acc;
    const hasUpcoming = getSchedule({ trainerId: currentUser.id, clientId: client.id })
      .some(s => s.date >= today && s.status !== 'cancelled');
    if (hasUpcoming) acc.push({ client });
    return acc;
  }, []);

  const totalAttentionCount = renewalClients.length + churnClients.length + trainingProfileClients.length;
  const visibleRenewalCount = showAttentionAll ? renewalClients.length : Math.min(3, renewalClients.length);
  const visibleChurnCount = showAttentionAll ? churnClients.length : Math.max(0, Math.min(3 - visibleRenewalCount, churnClients.length));
  const visibleProfileCount = showAttentionAll ? trainingProfileClients.length : Math.max(0, 3 - visibleRenewalCount - visibleChurnCount);
  const visibleRenewal = renewalClients.slice(0, visibleRenewalCount);
  const visibleChurn = churnClients.slice(0, visibleChurnCount);
  const visibleProfile = trainingProfileClients.slice(0, visibleProfileCount);
  const hiddenAttentionCount = totalAttentionCount - visibleRenewal.length - visibleChurn.length - visibleProfile.length;

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
      {totalAttentionCount === 0 ? (
        <div className="needs-attention needs-attention-allclear mb-16">
          <span>All clear ✅ — no clients need attention right now.</span>
        </div>
      ) : (
        <div className="needs-attention mb-16">
          <div className="needs-attention-header">
            <div className="flex gap-8" style={{ alignItems: 'center' }}>
              <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
              <span className="needs-attention-title">Needs attention</span>
              <span className="needs-attention-count">{totalAttentionCount}</span>
            </div>
            {(hiddenAttentionCount > 0 || showAttentionAll) && (
              <button className="needs-attention-viewall" onClick={() => setShowAttentionAll(v => !v)}>
                {showAttentionAll ? 'Show less' : 'View all'}
              </button>
            )}
          </div>

          {visibleRenewal.length > 0 && (
            <>
              <div className="needs-attention-category">
                <span className="needs-attention-category-dot" style={{ background: 'var(--danger)' }} />
                Renewal <span className="text-muted">({renewalClients.length})</span>
              </div>
              {visibleRenewal.map(({ client, remaining }) => (
                <div key={`renewal-${client.id}`} className="needs-attention-item" style={{ borderLeftColor: 'var(--danger)' }}>
                  <div className="needs-attention-item-top">
                    <Link to={`/clients/${client.id}`} className="needs-attention-avatar">{client.name?.[0] || '?'}</Link>
                    <Link to={`/clients/${client.id}`} className="needs-attention-info" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="needs-attention-name">{client.name}</div>
                      <div className="needs-attention-meta">
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          {remaining === 0 ? 'Sessions used up' : `${remaining} session${remaining === 1 ? '' : 's'} left`}
                        </span>
                        <span className="text-muted"> · Renewal due</span>
                      </div>
                    </Link>
                  </div>
                  <div className="needs-attention-item-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={sendingReminderFor === client.id}
                      onClick={() => handleSendRenewalReminder(client, remaining)}
                    >
                      <Send size={14} /> {sendingReminderFor === client.id ? 'Sending…' : 'Send renewal reminder'}
                    </button>
                    <div className="needs-attention-snooze-wrap">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSnoozeMenuFor(m => m === `renewal-${client.id}` ? null : `renewal-${client.id}`)}
                      >
                        <Clock size={14} /> Snooze
                      </button>
                      {snoozeMenuFor === `renewal-${client.id}` && (
                        <div className="needs-attention-snooze-menu">
                          {SNOOZE_OPTIONS.map(d => (
                            <button key={d} onClick={() => handleSnooze(client.id, 'renewal', d)}>{d} days</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {visibleChurn.length > 0 && (
            <>
              <div className="needs-attention-category">
                <span className="needs-attention-category-dot" style={{ background: 'var(--warning)' }} />
                At risk of churn <span className="text-muted">({churnClients.length})</span>
              </div>
              {visibleChurn.map(({ client, daysSince, lastActivityLabel }) => (
                <div key={`churn-${client.id}`} className="needs-attention-item" style={{ borderLeftColor: 'var(--warning)' }}>
                  <div className="needs-attention-item-top">
                    <Link to={`/clients/${client.id}`} className="needs-attention-avatar">{client.name?.[0] || '?'}</Link>
                    <Link to={`/clients/${client.id}`} className="needs-attention-info" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="needs-attention-name">{client.name}</div>
                      <div className="needs-attention-meta">
                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                          {daysSince === null ? 'No activity yet' : `Inactive ${daysSince} day${daysSince === 1 ? '' : 's'}`}
                        </span>
                        <span className="text-muted"> · {lastActivityLabel ? `Last: ${lastActivityLabel}` : 'No activity yet'}</span>
                      </div>
                    </Link>
                  </div>
                  <div className="needs-attention-item-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenQuickMsg(client, { inactive: true, lowSessions: false })}
                    >
                      <MessageCircle size={14} /> Send a check-in
                    </button>
                    <div className="needs-attention-snooze-wrap">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSnoozeMenuFor(m => m === `churn-${client.id}` ? null : `churn-${client.id}`)}
                      >
                        <Clock size={14} /> Snooze
                      </button>
                      {snoozeMenuFor === `churn-${client.id}` && (
                        <div className="needs-attention-snooze-menu">
                          {SNOOZE_OPTIONS.map(d => (
                            <button key={d} onClick={() => handleSnooze(client.id, 'churn', d)}>{d} days</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {visibleProfile.length > 0 && (
            <>
              <div className="needs-attention-category">
                <span className="needs-attention-category-dot" style={{ background: 'var(--warning)' }} />
                Training profile incomplete <span className="text-muted">({trainingProfileClients.length})</span>
              </div>
              {visibleProfile.map(({ client }) => (
                <div key={`profile-${client.id}`} className="needs-attention-item" style={{ borderLeftColor: 'var(--warning)' }}>
                  <div className="needs-attention-item-top">
                    <Link to={`/clients/${client.id}`} className="needs-attention-avatar">{client.name?.[0] || '?'}</Link>
                    <Link to={`/clients/${client.id}`} className="needs-attention-info" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="needs-attention-name">{client.name}</div>
                      <div className="needs-attention-meta">
                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                          <ClipboardList size={12} style={{ verticalAlign: -1 }} /> Has upcoming session, no profile
                        </span>
                      </div>
                    </Link>
                  </div>
                  <div className="needs-attention-item-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenQuickMsg(client, { inactive: false, lowSessions: false, missingProfile: true })}
                    >
                      <MessageCircle size={14} /> Ask to complete profile
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {snoozeMenuFor && <div className="needs-attention-snooze-backdrop" onClick={() => setSnoozeMenuFor(null)} />}

      {/* Client Activity — status summary, not a warning system (Needs Attention owns that) */}
      {clients.length === 0 ? (
        <div className="card mb-16">
          <EmptyState
            inCard={false}
            compact
            icon={Users}
            title="No clients yet"
            description="Invite your first client to see their activity here."
            action={{ label: 'Get Invite Code', to: '/clients' }}
          />
        </div>
      ) : (
        <ClientActivitySummary clients={clients} getWorkoutLogs={getWorkoutLogs} getSchedule={getSchedule} plans={allPlans} today={today} />
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
