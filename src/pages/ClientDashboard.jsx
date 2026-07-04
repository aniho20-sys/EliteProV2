import { useApp } from '../context/AppContext';
import { Dumbbell, Flame, Scale, Trophy, CalendarOff, ClipboardList, Play, ChevronRight } from 'lucide-react';
import { localToday, localDateAdd, formatDayDate, getGreeting } from '../utils/dateUtils';
import { resolveExerciseName } from '../utils/exerciseUtils';
import { Link, useNavigate } from 'react-router-dom';
import NotesSection from '../components/NotesSection';
import EmptyState from '../components/EmptyState';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { currentUser, getWorkoutPlans, getWorkoutLogs, getBodyStats, getSchedule, getExercises, getPersonalRecords, getCreditBalance } = useApp();
  const exerciseLibrary = getExercises();
  const prs = getPersonalRecords(currentUser.id);
  const getExerciseName = (id, fallback) => resolveExerciseName(exerciseLibrary, id, fallback);
  const plans = getWorkoutPlans({ clientId: currentUser.id });
  const logs = getWorkoutLogs(currentUser.id);
  const stats = getBodyStats(currentUser.id);
  const today = localToday();
  const todaySchedule = getSchedule({ clientId: currentUser.id, date: today });

  const lastLoggedPlanId = [...logs].reverse().find(l => l.planId)?.planId;
  const suggestedPlan = plans.find(p => p.id === lastLoggedPlanId) || plans[0] || null;
  const loggedToday = logs.some(l => l.date === today);

  const latestStat = stats[stats.length - 1];

  const creditBalance = getCreditBalance(currentUser.id);

  const totalWorkouts = logs.length;
  const thisWeekLogs = logs.filter(l => l.date >= localDateAdd(today, -7));

  return (
    <div>
      <div className="page-header">
        <div className="page-date">{formatDayDate(today)}</div>
        <h1 className="page-title">{getGreeting()}, {currentUser.name.split(' ')[0]}</h1>
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

      {/* Compact stat strip */}
      <div className="stat-strip mb-16">
        <Link to="/log" className="stat-pill">
          <Flame size={15} style={{ color: 'var(--accent)' }} />
          <div className="stat-pill-value">{thisWeekLogs.length}</div>
          <div className="stat-pill-label">This Week</div>
        </Link>
        <Link to="/log" className="stat-pill">
          <Dumbbell size={15} style={{ color: 'var(--primary-light)' }} />
          <div className="stat-pill-value">{totalWorkouts}</div>
          <div className="stat-pill-label">Total</div>
        </Link>
        <Link to="/progress" className="stat-pill">
          <Scale size={15} style={{ color: 'var(--danger)' }} />
          <div className="stat-pill-value">{latestStat ? `${latestStat.weight}kg` : '--'}</div>
          <div className="stat-pill-label">Weight</div>
        </Link>
        <Link to="/progress" className="stat-pill">
          <Trophy size={15} style={{ color: 'var(--warning)' }} />
          <div className="stat-pill-value">{Object.keys(prs).length}</div>
          <div className="stat-pill-label">PRs</div>
        </Link>
      </div>

      {suggestedPlan && (
        <button
          className="workout-cta-card mb-16"
          onClick={() => navigate('/log', { state: { planId: suggestedPlan.id } })}
        >
          <div className="workout-cta-icon"><Play size={20} /></div>
          <div className="workout-cta-text">
            <div className="workout-cta-label">{loggedToday ? 'Log another session' : "Start today's training"}</div>
            <div className="workout-cta-plan">{suggestedPlan.name}</div>
          </div>
          <ChevronRight size={20} className="workout-cta-arrow" />
        </button>
      )}

      {creditBalance !== null && (
        <div className="hero-card mb-16" style={
          creditBalance === 0
            ? { border: '1px solid var(--danger)' }
            : creditBalance <= 3
              ? { border: '1px solid var(--warning)' }
              : undefined
        }>
          <div className="hero-card-inner">
            <div className="flex-between mb-8" style={{ alignItems: 'baseline' }}>
              <span className="hero-card-label">Session Credits</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
                {creditBalance}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}> session{creditBalance === 1 ? '' : 's'} remaining</span>
              </span>
            </div>
            {creditBalance === 0 && (
              <p className="text-sm mb-12" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                No session credits remaining. Contact your coach.
              </p>
            )}
            {creditBalance > 0 && creditBalance <= 3 && (
              <p className="text-sm mb-12" style={{ color: 'var(--warning)', fontWeight: 600 }}>
                Running low on session credits — contact your trainer to top up
              </p>
            )}
            {creditBalance > 0 && (
              <div className="flex-between mt-8">
                <span />
                <Link to="/schedule" className="btn btn-sm" style={{ background: 'var(--brand-gradient)', color: '#fff' }}>Book Session</Link>
              </div>
            )}
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
                    <div className="schedule-client">{plan?.name || l.workoutName || 'Custom Workout'}</div>
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
                  <div className="pr-exercise">{pr.name || getExerciseName(exId, 'Custom exercise')}</div>
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
