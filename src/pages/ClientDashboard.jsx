import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Dumbbell, Flame, Scale, Trophy, CalendarOff, ClipboardList, Play, ChevronRight, X } from 'lucide-react';
import { localToday, localDateAdd, getGreetingPart } from '../utils/dateUtils';
import { formatDayDate } from '../i18n/format';
import { useLanguage } from '../i18n/LanguageContext';
import { resolveExerciseName } from '../utils/exerciseUtils';
import { getClientActivityDates } from '../utils/activityUtils';
import { getSessionColor, SESSION_WARNING_THRESHOLD, RENEWAL_PROMPT_THRESHOLD } from '../utils/sessionUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { Link, useNavigate } from 'react-router-dom';
import NotesSection from '../components/NotesSection';
import EmptyState from '../components/EmptyState';
import PaymentSheetModal from '../components/PaymentSheetModal';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { currentUser, getWorkoutPlans, getWorkoutLogs, getBodyStats, getSchedule, getExercises, getPersonalRecords, getSessionStats, getClient } = useApp();
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

  const { used: sessUsed, total: sessTotal, remaining: sessRemaining } = getSessionStats(currentUser.id);
  const trainer = currentUser.trainerId ? getClient(currentUser.trainerId) : null;

  // One literal t() per branch: the lint rule refuses t(variable), which is what keeps a
  // data value from ever being looked up as a translation key.
  const greeting = {
    morning: t('dash.greeting_morning'),
    afternoon: t('dash.greeting_afternoon'),
    evening: t('dash.greeting_evening'),
  }[getGreetingPart()];

  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  // Dismiss only hides the prompt for THIS view — it deliberately comes back on
  // the next dashboard visit. The prompt is meant to keep nudging until the
  // trainer confirms payment and tops the client up, which raises sessRemaining
  // back above the threshold and clears it naturally.
  const [renewalDismissed, setRenewalDismissed] = useState(false);

  const trainerHasRates = !!(trainer?.renewalRate && trainer?.renewalRateNext);
  const showRenewalPrompt = sessRemaining !== null
    && trainerHasRates
    && sessRemaining <= RENEWAL_PROMPT_THRESHOLD
    && !renewalDismissed;

  const totalWorkouts = logs.length;
  // "This Week" counts distinct training days — a logged workout OR a completed session —
  // so clients who train via booked sessions without always logging aren't undercounted.
  // Shares getClientActivityDates() with TrainerDashboard so both sides agree on what counts.
  const weekStart = localDateAdd(-7);
  const thisWeekCount = getClientActivityDates(currentUser.id, { getWorkoutLogs, getSchedule })
    .filter(d => d >= weekStart).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-date">{formatDayDate(today, lang)}</div>
        <h1 className="page-title">{greeting}, {currentUser.name.split(' ')[0]}</h1>
      </div>

      {logs.length === 0 && plans.length > 0 && (
        <div className="card onboarding-card mb-16">
          <h3 className="card-title">{t('dash.onboarding_title')}</h3>
          <div className="onboarding-steps">
            <Link to="/my-workouts" className="onboarding-step">
              <span className="onboarding-num">1</span>
              <span>{t('dash.onboarding_step1')}</span>
            </Link>
            <Link to="/log" className="onboarding-step">
              <span className="onboarding-num">2</span>
              <span>{t('dash.onboarding_step2')}</span>
            </Link>
            <Link to="/progress" className="onboarding-step">
              <span className="onboarding-num">3</span>
              <span>{t('dash.onboarding_step3')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Compact stat strip */}
      <div className="stat-strip mb-16">
        <Link to="/log" className="stat-pill">
          <Flame size={15} style={{ color: 'var(--accent)' }} />
          <div className="stat-pill-value">{thisWeekCount}</div>
          <div className="stat-pill-label">{t('dash.stat_this_week')}</div>
        </Link>
        <Link to="/log" className="stat-pill">
          <Dumbbell size={15} style={{ color: 'var(--primary-light)' }} />
          <div className="stat-pill-value">{totalWorkouts}</div>
          <div className="stat-pill-label">{t('dash.stat_total')}</div>
        </Link>
        <Link to="/progress" className="stat-pill">
          <Scale size={15} style={{ color: 'var(--danger)' }} />
          <div className="stat-pill-value">{latestStat ? `${latestStat.weight}kg` : '--'}</div>
          <div className="stat-pill-label">{t('common.weight')}</div>
        </Link>
        <Link to="/progress" className="stat-pill">
          <Trophy size={15} style={{ color: 'var(--warning)' }} />
          <div className="stat-pill-value">{Object.keys(prs).length}</div>
          <div className="stat-pill-label">{t('dash.stat_prs')}</div>
        </Link>
      </div>

      {suggestedPlan && (
        <button
          className="workout-cta-card mb-16"
          onClick={() => navigate('/log', { state: { planId: suggestedPlan.id } })}
        >
          <div className="workout-cta-icon"><Play size={20} /></div>
          <div className="workout-cta-text">
            <div className="workout-cta-label">{loggedToday ? t('dash.log_another') : t('dash.start_today')}</div>
            <div className="workout-cta-plan">{suggestedPlan.name}</div>
          </div>
          <ChevronRight size={20} className="workout-cta-arrow" />
        </button>
      )}

      {sessTotal !== null && (
        <div className="hero-card mb-16" style={sessRemaining <= SESSION_WARNING_THRESHOLD ? { background: getSessionColor(sessRemaining) } : undefined}>
          <div className="hero-card-inner">
            <div className="flex-between mb-12" style={{ alignItems: 'baseline' }}>
              <span className="hero-card-label" style={sessRemaining <= SESSION_WARNING_THRESHOLD ? { color: getSessionColor(sessRemaining) } : undefined}>{t('dash.your_package')}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
                {/* Split around the number so the digit keeps its larger type wherever the
                    language puts it — English leads with it ("7 sessions left"), Chinese
                    wraps it (「剩餘 7 堂」). A fixed number-then-words layout cannot do both. */}
                {(() => {
                  const small = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' };
                  const [before, after] = t('dash.sessions_left_phrase', { count: '\u0000' }).split('\u0000');
                  return (
                    <>
                      {before && <span style={small}>{before}</span>}
                      {sessRemaining}
                      {after && <span style={small}>{after}</span>}
                    </>
                  );
                })()}
              </span>
            </div>
            <div className="session-progress-bar mb-12">
              <div className="session-progress-fill" style={{ width: `${Math.min(100, Math.round((sessUsed / sessTotal) * 100))}%`, background: sessRemaining <= SESSION_WARNING_THRESHOLD ? getSessionColor(sessRemaining) : 'var(--brand-gradient)' }} />
            </div>
            {/* When the full renewal card below is showing it already makes this
                offer, so the inline link would just repeat it. Once the client
                dismisses that card this quietly takes over again. */}
            {sessRemaining <= SESSION_WARNING_THRESHOLD && (
              trainerHasRates ? (
                !showRenewalPrompt && (
                  <button
                    className="text-sm mb-12"
                    onClick={() => setShowPaymentSheet(true)}
                    style={{ color: getSessionColor(sessRemaining), fontWeight: 600, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {t('dash.renew_early')} <ChevronRight size={14} />
                  </button>
                )
              ) : (
                <p className="text-sm mb-12" style={{ color: getSessionColor(sessRemaining), fontWeight: 600 }}>
                  {t('dash.running_low')}
                </p>
              )
            )}
            <div className="flex-between" style={{ alignItems: 'center' }}>
              <span className="text-sm text-muted">{t('dash.sessions_used', { used: sessUsed, total: sessTotal })}</span>
              <Link to="/schedule" className="btn btn-sm" style={{ background: 'var(--brand-gradient)', color: '#fff' }}>{t('dash.book_session')}</Link>
            </div>
          </div>
        </div>
      )}

      {showRenewalPrompt && (
        <div className="card mb-16" style={{ borderLeft: `3px solid ${sessRemaining <= 1 ? 'var(--danger)' : 'var(--warning)'}` }}>
          <div className="flex-between mb-8" style={{ alignItems: 'flex-start' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>
              {sessRemaining <= 0
                ? t('dash.no_sessions_left')
                : sessRemaining === 1
                  ? t('dash.last_session_left')
                  : t('dash.sessions_left_count', { count: sessRemaining })}
            </h3>
            <button className="btn-icon" onClick={() => setRenewalDismissed(true)} aria-label={t('dash.dismiss')}><X size={16} /></button>
          </div>
          <p className="text-sm text-muted mb-12">
            {sessRemaining <= 0
              ? <>{t('dash.renew_none_pre')}<strong>{formatCurrency(trainer.renewalRateNext, trainer.currency)}{t('common.per_session')}</strong>.</>
              : sessRemaining === 1
                ? <>{t('dash.renew_last_pre')}<strong>{formatCurrency(trainer.renewalRate, trainer.currency)}{t('common.per_session')}</strong>{t('dash.renew_last_post', { next: formatCurrency(trainer.renewalRateNext, trainer.currency) })}</>
                : <>{t('dash.renew_soon_pre')}<strong>({formatCurrency(trainer.renewalRate, trainer.currency)}{t('common.per_session')})</strong>{t('dash.renew_soon_post', { next: formatCurrency(trainer.renewalRateNext, trainer.currency) })}</>}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentSheet(true)}>{t('dash.renew')}</button>
        </div>
      )}

      {showPaymentSheet && (
        <PaymentSheetModal
          client={currentUser}
          trainer={trainer}
          remaining={sessRemaining}
          onClose={() => setShowPaymentSheet(false)}
        />
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dash.todays_schedule')}</h3>
            <Link to="/schedule" className="btn btn-outline btn-sm">{t('common.view_all')}</Link>
          </div>
          {todaySchedule.length === 0 ? (
            <EmptyState
              inCard={false}
              compact
              icon={CalendarOff}
              title={t('dash.no_sessions_today')}
              description={t('dash.schedule_clear')}
              action={{ label: t('dash.book_a_session'), to: '/schedule' }}
            />
          ) : (
            todaySchedule.map(s => (
              <Link key={s.id} to="/schedule" className="schedule-item schedule-item-link">
                <div className="schedule-time">{s.time}</div>
                <div className="schedule-info">
                  <div className="schedule-client">{s.type}</div>
                  <div className="schedule-type">{t('dash.minutes_short', { n: s.duration })}</div>
                </div>
                <span className={`tag ${s.status === 'confirmed' ? 'tag-accent' : 'tag-warning'}`}>{s.status}</span>
              </Link>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dash.my_plans')}</h3>
            <Link to="/my-workouts" className="btn btn-outline btn-sm">{t('common.view_all')}</Link>
          </div>
          {plans.length === 0 ? (
            <EmptyState
              inCard={false}
              compact
              icon={ClipboardList}
              title={t('dash.no_plans_yet')}
              description={currentUser.trainerId ? t('dash.no_plans_coach_soon') : t('dash.no_plans_connect')}
              action={!currentUser.trainerId ? { label: t('dash.connect_coach'), to: '/profile' } : undefined}
            />
          ) : (
            plans.map(p => (
              <Link key={p.id} to="/my-workouts" className="schedule-item schedule-item-link">
                <div className="schedule-info">
                  <div className="schedule-client">{p.name}</div>
                  <div className="schedule-type">{t('dash.plan_meta', { day: p.day, count: p.exercises.length })}</div>
                </div>
              </Link>
            ))
          )}
        </div>

        {latestStat && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('dash.body_stats')}</h3>
              <Link to="/progress" className="btn btn-outline btn-sm">{t('dash.details')}</Link>
            </div>
            <div className="body-stats-grid">
              {/* Every measurement is optional — a client who only ever logs their weight
                  is normal. Without the guard those rows render the literal string
                  "undefinedcm", matching the '--' already used by the stat pill above. */}
              {[
                { label: t('common.weight'), value: latestStat.weight, unit: 'kg' },
                { label: t('dash.body_fat'), value: latestStat.bodyFat, unit: '%' },
                { label: t('dash.chest'), value: latestStat.chest, unit: 'cm' },
                { label: t('dash.waist'), value: latestStat.waist, unit: 'cm' },
                { label: t('dash.arms'), value: latestStat.arms, unit: 'cm' },
                { label: t('dash.legs'), value: latestStat.legs, unit: 'cm' },
              ].map(({ label, value, unit }) => ({
                label,
                value: (value === null || value === undefined || value === '') ? '--' : `${value}${unit}`,
              })).map(s => (
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
              <h3 className="card-title">{t('dash.recent_workouts')}</h3>
              <Link to="/log" className="btn btn-outline btn-sm">{t('common.view_all')}</Link>
            </div>
            {logs.slice(-3).reverse().map(l => {
              const plan = plans.find(p => p.id === l.planId);
              return (
                <Link key={l.id} to="/log" className="schedule-item schedule-item-link">
                  <div className="schedule-info">
                    <div className="schedule-client">{plan?.name || l.workoutName || t('dash.custom_workout')}</div>
                    <div className="schedule-type">{t('dash.log_meta', { date: l.date, rpe: l.rpe })}</div>
                  </div>
                  <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? t('common.done') : t('dash.partial')}</span>
                </Link>
              );
            })}
          </div>
        )}

        {Object.keys(prs).length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex gap-8" style={{ alignItems: 'center' }}>
                <Trophy size={18} style={{ color: 'var(--warning)' }} /> {t('dash.personal_records')}
              </h3>
              <span className="tag tag-warning">{t('dash.pr_count', { count: Object.keys(prs).length })}</span>
            </div>
            <div className="pr-grid">
              {Object.entries(prs).slice(0, 6).map(([exId, pr]) => (
                <div key={exId} className="pr-item">
                  <div className="pr-exercise">{getExerciseName(exId, pr.name || t('dash.custom_exercise'))}</div>
                  <div className="pr-weight">{pr.weight}kg</div>
                  <div className="pr-date">{pr.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dash.coach_notes')}</h3>
          </div>
          <NotesSection clientId={currentUser.id} />
        </div>
      </div>
    </div>
  );
}
