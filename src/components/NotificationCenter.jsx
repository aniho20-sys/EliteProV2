import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, MessageSquare, Calendar, Dumbbell, ClipboardList, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const VIEWED_KEY = 'elitepro_notif_viewed';

function idTimestamp(id = '') {
  const n = Number(id.replace(/^[^-]+-/, ''));
  return Number.isFinite(n) && n > 1_000_000_000_000 ? n : 0;
}

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

const TYPE_META = {
  message:       { icon: MessageSquare, color: 'var(--primary)' },
  session:       { icon: Calendar,      color: 'var(--accent)'  },
  workout_log:   { icon: Dumbbell,      color: '#22c55e'        },
  plan:          { icon: ClipboardList, color: 'var(--accent)'  },
  session_done:  { icon: CheckCircle,   color: '#22c55e'        },
};

function deriveNotifications(currentUser, users, messages, schedule, workoutLogs, workoutPlans, lastViewed) {
  if (!currentUser) return [];
  const uid = currentUser.id;
  const isTrainer = currentUser.role === 'trainer';
  const notifs = [];
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;

  if (isTrainer) {
    // Unread messages from clients
    messages
      .filter(m => m.to === uid && !m.read)
      .forEach(m => {
        const sender = users.find(u => u.id === m.from);
        notifs.push({
          id: m.id,
          type: 'message',
          title: sender?.name || 'Client',
          body: m.text.length > 70 ? m.text.slice(0, 70) + '…' : m.text,
          ts: new Date(m.timestamp).getTime(),
          url: '/messages',
          unread: true,
        });
      });

    // Pending session requests from clients (client booked, not trainer)
    schedule
      .filter(s => s.trainerId === uid && s.status === 'pending' && idTimestamp(s.id) > sevenDaysAgo)
      .forEach(s => {
        const client = users.find(u => u.id === s.clientId);
        notifs.push({
          id: `sched-${s.id}`,
          type: 'session',
          title: 'Session requested',
          body: `${client?.name || 'Client'} — ${s.type} on ${s.date} at ${s.time}`,
          ts: idTimestamp(s.id),
          url: '/schedule',
          unread: idTimestamp(s.id) > lastViewed,
        });
      });

    // Recent workout logs from clients
    workoutLogs
      .filter(l => l.clientId !== uid && idTimestamp(l.id) > sevenDaysAgo)
      .forEach(l => {
        const client = users.find(u => u.id === l.clientId);
        notifs.push({
          id: `log-${l.id}`,
          type: 'workout_log',
          title: 'Workout logged',
          body: `${client?.name || 'Client'} completed a session`,
          ts: idTimestamp(l.id),
          url: `/clients/${l.clientId}`,
          unread: idTimestamp(l.id) > lastViewed,
        });
      });

  } else {
    // Unread messages from coach
    messages
      .filter(m => m.to === uid && !m.read)
      .forEach(m => {
        notifs.push({
          id: m.id,
          type: 'message',
          title: 'Message from Coach',
          body: m.text.length > 70 ? m.text.slice(0, 70) + '…' : m.text,
          ts: new Date(m.timestamp).getTime(),
          url: '/messages',
          unread: true,
        });
      });

    // Recent session status changes (confirmed / cancelled)
    schedule
      .filter(s => s.clientId === uid && (s.status === 'confirmed' || s.status === 'cancelled') && idTimestamp(s.id) > sevenDaysAgo)
      .forEach(s => {
        notifs.push({
          id: `sched-${s.id}`,
          type: s.status === 'confirmed' ? 'session_done' : 'session',
          title: `Session ${s.status}`,
          body: `${s.type} on ${s.date} at ${s.time}`,
          ts: idTimestamp(s.id),
          url: '/schedule',
          unread: idTimestamp(s.id) > lastViewed,
        });
      });

    // New workout plans assigned
    workoutPlans
      .filter(p => p.clientId === uid && idTimestamp(p.id) > sevenDaysAgo)
      .forEach(p => {
        notifs.push({
          id: `plan-${p.id}`,
          type: 'plan',
          title: 'New workout plan',
          body: `"${p.name}" assigned by your coach`,
          ts: idTimestamp(p.id),
          url: '/my-workouts',
          unread: idTimestamp(p.id) > lastViewed,
        });
      });
  }

  return notifs.sort((a, b) => b.ts - a.ts).slice(0, 30);
}

export default function NotificationCenter() {
  const { currentUser, data } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [lastViewed, setLastViewed] = useState(() => Number(localStorage.getItem(VIEWED_KEY) || 0));
  const panelRef = useRef(null);

  const { users = [], workoutPlans = [], workoutLogs = [], schedule = [], messages = [] } = data || {};

  const notifs = useMemo(
    () => deriveNotifications(currentUser, users, messages, schedule, workoutLogs, workoutPlans, lastViewed),
    [currentUser, users, messages, schedule, workoutLogs, workoutPlans, lastViewed],
  );

  const unreadCount = useMemo(() => notifs.filter(n => n.unread).length, [notifs]);

  const handleOpen = () => {
    setOpen(true);
    const now = Date.now();
    setLastViewed(now);
    localStorage.setItem(VIEWED_KEY, String(now));
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotifClick = (url) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <>
      <button className="notif-bell-btn" onClick={open ? () => setOpen(false) : handleOpen} aria-label="Notifications">
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel" ref={panelRef}>
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            <button className="btn-icon" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
          </div>

          {notifs.length === 0 ? (
            <div className="notif-empty">You&apos;re all caught up 🎉</div>
          ) : (
            <ul className="notif-list">
              {notifs.map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.message;
                const Icon = meta.icon;
                return (
                  <li key={n.id} className={`notif-item ${n.unread ? 'notif-item-unread' : ''}`} onClick={() => handleNotifClick(n.url)}>
                    <div className="notif-item-icon" style={{ color: meta.color }}>
                      <Icon size={18} strokeWidth={2} />
                    </div>
                    <div className="notif-item-body">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-text">{n.body}</div>
                      <div className="notif-item-time">{relativeTime(n.ts)}</div>
                    </div>
                    {n.unread && <div className="notif-unread-dot" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
