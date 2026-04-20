import { useApp } from '../context/AppContext';
import { Dumbbell, TrendingDown, TrendingUp, Activity, Trophy, CalendarOff, ClipboardList, Layers } from 'lucide-react';
import { getSessionColor } from '../utils/sessionUtils';
import { Link } from 'react-router-dom';
import NotesSection from '../components/NotesSection';
import EmptyState from '../components/EmptyState';

export default function ClientDashboard() {
  const { currentUser, getWorkoutPlans, getWorkoutLogs, getBodyStats, getSchedule, getExercises, getPersonalRecords, getSessionStats } = useApp();
  const exerciseLibrary = getExercises();
  const prs = getPersonalRecords(currentUser.id);
  const getExerciseName = (id) => exerciseLibrary.find(e => e.id === id)?.name || id;
  const plans = getWorkoutPlans({ clientId: currentUser.id });
  const logs = getWorkoutLogs(currentUser.id);
  const stats = getBodyStats(currentUser.id);
  const today = new Date().toISOString().split('T')[0];
  const todaySchedule = getSchedule({ clientId: currentUser.id, date: today });

  const latestStat = stats[stats.length - 1];
  const prevStat = stats[stats.length - 2];
  const weightChange = latestStat && prevStat ? (latestStat.weight - prevStat.weight).toFixed(1) : null;

  const { used: sessUsed, total: sessTotal, remaining: sessRemaining } = getSessionStats(currentUser.id);
  const sessColor = getSessionColor(sessRemaining);

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

      {logs.length === 0 && plans.length > 0 && (
        <div className="card onboarding-card mb-16">
          <h3 className="card-title">Welcome! Get started:</h3>
          <div className="onboarding-steps">
            <Link to="/my-workouts" className="onboarding-step">
              <span className="onboarding-num">1</span>
              <span>Check your workout plans</span>
            </Link>
            <Link to="/log" className="onboarding-step">
              <span className="onboarding-num">2</span>
              <span>Log your first workout</span>
            </Link>
            <Link to="/progress" className="onboarding-step">
              <span className="onboarding-num">3</span>
              <span>Track your body stats</span>
            </Link>
          </div>
        </div>
      )}

      <div className="grid-4 mb-16">
        <Link to="/my-workouts" className="card stat-card stat-card-link">
          <Dumbbell size={24} style={{ color: 'var(--primary-light)', marginBottom: 8 }} />
          <div className="stat-value">{plans.length}</div>
          <div className="stat-label">Workout Plans</div>
        </Link>
        <Link to="/log" className="card stat-card stat-card-link">
          <Activity size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div className="stat-value">{thisWeekLogs.length}</div>
          <div className="stat-label">Workouts This Week</div>
        </Link>
        <Link to="/log" className="card stat-card stat-card-link">
          <TrendingUp size={24} style={{ color: 'var(--warning)', marginBottom: 8 }} />
          <div className="stat-value">{totalWorkouts}</div>
          <div className="stat-label">Total Workouts</div>
        </Link>
        <Link to="/progress" className="card stat-card stat-card-link">
          {weightChange && parseFloat(weightChange) > 0 ? <TrendingUp size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} /> : <TrendingDown size={24} style={{ color: 'var(--danger)', marginBottom: 8 }} />}
          <div className="stat-value">{latestStat ? `${latestStat.weight}kg` : '--'}</div>
          <div className="stat-label">Current Weight</div>
          {weightChange && <div className={`stat-change ${parseFloat(weightChange) > 0 ? 'positive' : 'negative'}`}>{weightChange > 0 ? '+' : ''}{weightChange}kg</div>}
        </Link>
      </div>

      {sessTotal !== null && (
        <div className="card mb-16">
          <div className="flex-between mb-8" style={{ alignItems: 'center' }}>
            <div className="flex gap-8" style={{ alignItems: 'center' }}>
              <Layers size={18} style={{ color: sessColor }} />
              <h3 className="card-title" style={{ margin: 0 }}>Sessions</h3>
            </div>
            <div className="flex gap-8" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: sessColor, lineHeight: 1 }}>
                {sessUsed}<span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '1rem' }}> / {sessTotal}</span>
              </span>
              <Link to="/schedule" className="btn btn-sm btn-primary">Book Session</Link>
            </div>
          </div>
          <div className="session-progress-bar mb-8">
            <div className="session-progress-fill" style={{ width: `${Math.min(100, Math.round((sessUsed / sessTotal) * 100))}%`, background: sessColor }} />
          </div>
          <div className="flex-between">
            <span className="text-sm text-muted">{sessUsed} sessions completed</span>
            <span className="text-sm" style={{ color: sessColor, fontWeight: 600 }}>{sessRemaining} remaining</span>
          </div>
        </div>
      )}

      <div className="grid-2">
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
              description="Your schedule is clear. Book one anytime from the Schedule page."
            />
          ) : (
            todaySchedule.map(s => (
              <Link key={s.id} to="/schedule" className="schedule-item schedule-item-link">
                <div className="schedule-time">{s.time}</div>
                <div className="schedule-info">
                  <div className="schedule-client">{s.type}</div>
                  <div className="schedule-type">{s.duration}min</div>
                </div>
                <span className={`tag ${s.status === 'confirmed' ? 'tag-accent' : 'tag-warning'}`}>{s.status}</span>
              </Link>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Workout Plans</h3>
            <Link to="/my-workouts" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {plans.length === 0 ? (
            <EmptyState
              inCard={false}
              compact
              icon={ClipboardList}
              title="No plans assigned yet"
              description={currentUser.trainerId ? 'Your coach will add a plan soon.' : 'Connect to a coach first from your profile.'}
              action={!currentUser.trainerId ? { label: 'Connect Coach', to: '/profile' } : undefined}
            />
          ) : (
            plans.map(p => (
              <Link key={p.id} to="/my-workouts" className="schedule-item schedule-item-link">
                <div className="schedule-info">
                  <div className="schedule-client">{p.name}</div>
                  <div className="schedule-type">{p.day} - {p.exercises.length} exercises</div>
                </div>
              </Link>
            ))
          )}
        </div>

        {latestStat && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Body Stats</h3>
              <Link to="/progress" className="btn btn-outline btn-sm">Details</Link>
            </div>
            <div className="body-stats-grid">
              {[
                { label: 'Weight', value: `${latestStat.weight}kg` },
                { label: 'Body Fat', value: `${latestStat.bodyFat}%` },
                { label: 'Chest', value: `${latestStat.chest}cm` },
                { label: 'Waist', value: `${latestStat.waist}cm` },
                { label: 'Arms', value: `${latestStat.arms}cm` },
                { label: 'Legs', value: `${latestStat.legs}cm` },
              ].map(s => (
                <div key={s.label} className="body-stat-item">
                  <span className="body-stat-label">{s.label}</span>
                  <span className="body-stat-value">{s.value}</span>
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
                <Link key={l.id} to="/log" className="schedule-item schedule-item-link">
                  <div className="schedule-info">
                    <div className="schedule-client">{plan?.name || 'Workout'}</div>
                    <div className="schedule-type">{l.date} - RPE: {l.rpe}/10</div>
                  </div>
                  <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Done' : 'Partial'}</span>
                </Link>
              );
            })}
          </div>
        )}

        {Object.keys(prs).length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex gap-8" style={{ alignItems: 'center' }}>
                <Trophy size={18} style={{ color: 'var(--warning)' }} /> Personal Records
              </h3>
              <span className="tag tag-warning">{Object.keys(prs).length} PRs</span>
            </div>
            <div className="pr-grid">
              {Object.entries(prs).slice(0, 6).map(([exId, pr]) => (
                <div key={exId} className="pr-item">
                  <div className="pr-exercise">{getExerciseName(exId)}</div>
                  <div className="pr-weight">{pr.weight}kg</div>
                  <div className="pr-date">{pr.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Coach Notes</h3>
          </div>
          <NotesSection clientId={currentUser.id} />
        </div>
      </div>
    </div>
  );
}
