import { useApp } from '../context/AppContext';
import { Users, Calendar, Dumbbell, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TrainerDashboard() {
  const { currentUser, getClients, getSchedule, getUnreadCount, getMessages, getWorkoutPlans } = useApp();
  const clients = getClients(currentUser.id);
  const totalPlans = getWorkoutPlans({ trainerId: currentUser.id }).length;
  const today = new Date().toISOString().split('T')[0];
  const todaySchedule = getSchedule({ trainerId: currentUser.id, date: today });
  const unread = getUnreadCount(currentUser.id);
  const recentMessages = getMessages(currentUser.id)
    .filter(m => m.to === currentUser.id && !m.read)
    .slice(0, 3);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
        <p className="page-subtitle">Here&apos;s your overview for today</p>
      </div>

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

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today&apos;s Schedule</h3>
            <Link to="/schedule" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {todaySchedule.length === 0 ? (
            <div className="empty-state"><p className="empty-state-text">No sessions today</p></div>
          ) : (
            todaySchedule.map(s => {
              const client = clients.find(c => c.id === s.clientId);
              return (
                <div key={s.id} className="schedule-item">
                  <div className="schedule-time">{s.time}</div>
                  <div className="schedule-info">
                    <div className="schedule-client">{client?.name || 'Unknown'}</div>
                    <div className="schedule-type">{s.type} - {s.duration}min</div>
                  </div>
                  <span className={`tag ${s.status === 'confirmed' ? 'tag-accent' : 'tag-warning'}`}>{s.status}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Unread Messages</h3>
          </div>
          {recentMessages.length === 0 ? (
            <div className="empty-state"><p className="empty-state-text">All caught up!</p></div>
          ) : (
            recentMessages.map(m => {
              const sender = clients.find(c => c.id === m.from);
              return (
                <div key={m.id} className="contact-item" onClick={() => sender && (window.location.hash = `/clients/${sender.id}`)}>
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
    </div>
  );
}
