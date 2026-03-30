import { useApp } from '../context/AppContext';
import { Dumbbell, Calendar, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exerciseLibrary } from '../data/exercises';

export default function ClientDashboard() {
  const { currentUser, getWorkoutPlans, getWorkoutLogs, getBodyStats, getSchedule } = useApp();
  const plans = getWorkoutPlans({ clientId: currentUser.id });
  const logs = getWorkoutLogs(currentUser.id);
  const stats = getBodyStats(currentUser.id);
  const today = new Date().toISOString().split('T')[0];
  const todaySchedule = getSchedule({ clientId: currentUser.id, date: today });

  const latestStat = stats[stats.length - 1];
  const prevStat = stats[stats.length - 2];
  const weightChange = latestStat && prevStat ? (latestStat.weight - prevStat.weight).toFixed(1) : null;

  const totalWorkouts = logs.length;
  const thisWeekLogs = logs.filter(l => {
    const logDate = new Date(l.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= weekAgo;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Hey, {currentUser.name.split(' ')[0]}!</h1>
        <p className="page-subtitle">Keep pushing towards your goals</p>
      </div>

      <div className="grid-4 mb-16">
        <div className="card stat-card">
          <Dumbbell size={24} style={{ color: 'var(--primary-light)', marginBottom: 8 }} />
          <div className="stat-value">{plans.length}</div>
          <div className="stat-label">Workout Plans</div>
        </div>
        <div className="card stat-card">
          <Activity size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div className="stat-value">{thisWeekLogs.length}</div>
          <div className="stat-label">Workouts This Week</div>
        </div>
        <div className="card stat-card">
          <TrendingUp size={24} style={{ color: 'var(--warning)', marginBottom: 8 }} />
          <div className="stat-value">{totalWorkouts}</div>
          <div className="stat-label">Total Workouts</div>
        </div>
        <div className="card stat-card">
          {weightChange && parseFloat(weightChange) > 0 ? <TrendingUp size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} /> : <TrendingDown size={24} style={{ color: 'var(--danger)', marginBottom: 8 }} />}
          <div className="stat-value">{latestStat ? `${latestStat.weight}kg` : '--'}</div>
          <div className="stat-label">Current Weight</div>
          {weightChange && <div className={`stat-change ${parseFloat(weightChange) > 0 ? 'positive' : 'negative'}`}>{weightChange > 0 ? '+' : ''}{weightChange}kg</div>}
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
            todaySchedule.map(s => (
              <div key={s.id} className="schedule-item">
                <div className="schedule-time">{s.time}</div>
                <div className="schedule-info">
                  <div className="schedule-client">{s.type}</div>
                  <div className="schedule-type">{s.duration}min</div>
                </div>
                <span className={`tag ${s.status === 'confirmed' ? 'tag-accent' : 'tag-warning'}`}>{s.status}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Workout Plans</h3>
            <Link to="/my-workouts" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {plans.length === 0 ? (
            <div className="empty-state"><p className="empty-state-text">No plans assigned yet</p></div>
          ) : (
            plans.map(p => (
              <div key={p.id} className="schedule-item">
                <div className="schedule-info">
                  <div className="schedule-client">{p.name}</div>
                  <div className="schedule-type">{p.day} - {p.exercises.length} exercises</div>
                </div>
              </div>
            ))
          )}
        </div>

        {latestStat && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Body Stats</h3>
              <Link to="/progress" className="btn btn-outline btn-sm">Details</Link>
            </div>
            <div className="grid-3">
              {[
                { label: 'Weight', value: `${latestStat.weight}kg` },
                { label: 'Body Fat', value: `${latestStat.bodyFat}%` },
                { label: 'Chest', value: `${latestStat.chest}cm` },
                { label: 'Waist', value: `${latestStat.waist}cm` },
                { label: 'Arms', value: `${latestStat.arms}cm` },
                { label: 'Legs', value: `${latestStat.legs}cm` },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="fw-bold">{s.value}</div>
                  <div className="text-sm text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Workouts</h3>
              <Link to="/log" className="btn btn-outline btn-sm">View All</Link>
            </div>
            {logs.slice(-3).reverse().map(l => {
              const plan = plans.find(p => p.id === l.planId);
              return (
                <div key={l.id} className="schedule-item">
                  <div className="schedule-info">
                    <div className="schedule-client">{plan?.name || 'Workout'}</div>
                    <div className="schedule-type">{l.date} - RPE: {l.rpe}/10</div>
                  </div>
                  <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Done' : 'Partial'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
