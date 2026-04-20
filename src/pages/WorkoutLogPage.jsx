import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Trophy, Play, NotebookPen, UserPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { normalizeSets } from '../utils/workoutUtils';

export default function WorkoutLogPage() {
  const { currentUser, getWorkoutPlans, getWorkoutLogs, addWorkoutLog, getExercises, getPersonalRecords } = useApp();
  const exerciseLibrary = getExercises();
  const plans = getWorkoutPlans({ clientId: currentUser.id });
  const logs = getWorkoutLogs(currentUser.id);
  const prs = getPersonalRecords(currentUser.id);
  const toast = useToast();
  const [showLog, setShowLog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [entries, setEntries] = useState([]);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');

  const location = useLocation();

  const isSafeUrl = (url) => /^https?:\/\//i.test(url?.trim() || '');
  const getExerciseName = (id) => exerciseLibrary.find(e => e.id === id)?.name || id;
  const getExercise = (id) => exerciseLibrary.find(e => e.id === id);


  const autoStartedRef = useRef(false);
  useEffect(() => {
    const planId = location.state?.planId;
    if (!planId || plans.length === 0 || autoStartedRef.current) return;
    const plan = plans.find(p => p.id === planId);
    if (plan) { autoStartedRef.current = true; startLog(plan); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.planId, plans.length]);

  const startLog = (plan) => {
    setSelectedPlan(plan);
    // Find the most recent log for this plan
    const lastLog = [...logs].reverse().find(l => l.planId === plan.id);
    setEntries(plan.exercises.map(ex => {
      const lastEntry = lastLog?.entries?.find(e => e.exerciseId === ex.exerciseId);
      const planSets = normalizeSets(ex);
      return {
        exerciseId: ex.exerciseId,
        name: ex.name || getExerciseName(ex.exerciseId),
        sets: planSets.map((ps, i) => {
          const prev = lastEntry?.sets?.[i];
          if (prev) return { weight: String(prev.weight), reps: String(prev.reps) };
          return { weight: ps.weight > 0 ? String(ps.weight) : '', reps: ps.reps || '' };
        }),
      };
    }));
    setRpe(7);
    setNotes('');
    setShowLog(true);
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setEntries(prev => prev.map((entry, i) =>
      i === exIdx ? {
        ...entry,
        sets: entry.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s),
      } : entry
    ));
  };

  // Check if current entry has a new PR for this exercise
  const isNewPR = (entry) => {
    const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
    const currentPR = prs[entry.exerciseId]?.weight || 0;
    return maxWeight > 0 && maxWeight > currentPR;
  };

  // Check if a specific log entry had a PR at time of logging
  const wasPRAtTime = (log, entry) => {
    const logDate = log.date;
    const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
    if (maxWeight <= 0) return false;
    // Check all other logs before this date for same exercise
    const priorMax = logs
      .filter(l => l.id !== log.id && l.date <= logDate)
      .flatMap(l => (l.entries || []).filter(e => e.exerciseId === entry.exerciseId))
      .flatMap(e => (e.sets || []).map(s => Number(s.weight) || 0))
      .reduce((max, w) => Math.max(max, w), 0);
    return maxWeight > priorMax;
  };

  const handleSave = async () => {
    const logEntries = entries.map(e => ({
      exerciseId: e.exerciseId,
      name: getExerciseName(e.exerciseId),
      sets: e.sets.filter(s => s.weight && s.reps).map(s => ({ weight: Number(s.weight), reps: Number(s.reps) })),
    })).filter(e => e.sets.length > 0);

    try {
      await addWorkoutLog({
        clientId: currentUser.id,
        planId: selectedPlan.id,
        date: new Date().toISOString().split('T')[0],
        completed: logEntries.length === entries.length,
        entries: logEntries,
        rpe,
        notes,
      });
      setShowLog(false);
      toast('Workout saved');
    } catch { toast('Failed to save workout', 'error'); }
  };

  // Count total PRs
  const prCount = Object.keys(prs).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workout Log</h1>
        <p className="page-subtitle">Record your training sessions</p>
      </div>

      {!showLog ? (
        <>
          {/* PR Summary */}
          {prCount > 0 && (
            <div className="card mb-16 pr-summary-card">
              <div className="card-header">
                <h3 className="card-title flex gap-8" style={{ alignItems: 'center' }}>
                  <Trophy size={20} style={{ color: 'var(--warning)' }} /> Personal Records
                </h3>
                <span className="tag tag-warning">{prCount} PRs</span>
              </div>
              <div className="pr-grid">
                {Object.entries(prs).map(([exId, pr]) => (
                  <div key={exId} className="pr-item">
                    <div className="pr-exercise">{getExerciseName(exId)}</div>
                    <div className="pr-weight">{pr.weight}kg</div>
                    <div className="pr-date">{pr.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick start */}
          {plans.length > 0 && (
            <div className="card mb-16">
              <h3 className="card-title mb-16">Start a Workout</h3>
              <div className="grid-3">
                {plans.map(p => (
                  <button key={p.id} className="card client-card" onClick={() => startLog(p)} style={{ textAlign: 'left', border: '1px solid var(--border)' }}>
                    <div className="fw-bold">{p.name}</div>
                    <div className="text-sm text-muted">{p.day} - {p.exercises.length} exercises</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Log history */}
          <h3 className="mb-16">History</h3>
          {logs.length === 0 ? (
            <EmptyState
              icon={plans.length === 0 && !currentUser.trainerId ? UserPlus : NotebookPen}
              title="No workouts logged yet"
              description={
                !currentUser.trainerId
                  ? 'Connect to a coach first — they will assign workout plans for you to follow.'
                  : plans.length > 0
                    ? 'Select a plan above to start logging your first session.'
                    : 'Your coach hasn\'t assigned any plans yet. Message them to get started.'
              }
              action={
                !currentUser.trainerId
                  ? { label: 'Connect to a Coach', to: '/profile' }
                  : plans.length === 0
                    ? { label: 'Message Your Coach', to: '/messages' }
                    : undefined
              }
            />
          ) : (
            [...logs].reverse().map(l => {
              const plan = plans.find(p => p.id === l.planId);
              return (
                <div key={l.id} className="card mb-16">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{plan?.name || 'Workout'}</h3>
                      <span className="text-sm text-muted">{l.date}</span>
                    </div>
                    <div className="flex gap-8">
                      {l.logType && <span className={`tag ${l.logType === 'pt_session' ? 'tag-accent' : ''}`}>{l.logType === 'pt_session' ? 'PT Session' : 'Self'}</span>}
                      <span className="tag tag-primary">RPE: {l.rpe}/10</span>
                      <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Completed' : 'Partial'}</span>
                    </div>
                  </div>
                  {l.entries.map((entry, i) => {
                    const hadPR = wasPRAtTime(l, entry);
                    return (
                    <div key={i} className={`plan-exercise ${hadPR ? 'plan-exercise-pr' : ''}`}>
                      <span className="plan-exercise-name">
                        {hadPR && <Trophy size={14} style={{ color: 'var(--warning)', marginRight: 6, verticalAlign: -2 }} />}
                        {entry.name || getExerciseName(entry.exerciseId)}
                      </span>
                      <span className="plan-exercise-detail">
                        {entry.sets.map((s) => `${s.weight}kg x ${s.reps}`).join(' | ')}
                      </span>
                      {hadPR && <span className="tag tag-warning" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>PR</span>}
                    </div>
                    );
                  })}
                  {l.notes && <p className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>{l.notes}</p>}
                  {l.trainerNotes && (
                    <div className="trainer-note-readonly">
                      <span className="trainer-note-label">Coach</span>
                      <span className="trainer-note-text">{l.trainerNotes}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      ) : (
        <div>
          <div className="log-top-bar mb-16">
            <h2 className="page-title">{selectedPlan.name}</h2>
            <div className="log-top-actions">
              <button className="btn btn-outline" onClick={() => setShowLog(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleSave}>Save Workout</button>
            </div>
          </div>

          {entries.map((entry, exIdx) => {
            const planEx = selectedPlan.exercises[exIdx];
            const currentPR = prs[entry.exerciseId];
            const exercise = getExercise(entry.exerciseId);
            const gotNewPR = isNewPR(entry);
            const lastLog = [...logs].reverse().find(l => l.planId === selectedPlan.id);
            const lastEntry = lastLog?.entries?.find(e => e.exerciseId === entry.exerciseId);
            return (
              <div key={exIdx} className={`card mb-16 ${gotNewPR ? 'card-pr-glow' : ''}`}>
                <div className="log-card-header">
                  <div className="log-card-title">
                    <h3 className="card-title">
                      {gotNewPR && <Trophy size={16} style={{ color: 'var(--warning)', marginRight: 6, verticalAlign: -2 }} />}
                      {entry.name || getExerciseName(entry.exerciseId)}
                    </h3>
                    <div className="log-card-tags">
                      {currentPR && <span className="text-sm" style={{ color: 'var(--warning)' }}>PR: {currentPR.weight}kg</span>}
                      <span className="text-sm text-muted">{(() => {
                        const sets = normalizeSets(planEx);
                        const reps = sets.map(s => s.reps);
                        const weights = sets.map(s => s.weight);
                        const allSameReps = reps.every(r => r === reps[0]);
                        const hasWeight = weights.some(w => w > 0);
                        let detail = allSameReps ? `${sets.length} x ${reps[0]}` : `${sets.length} sets`;
                        if (hasWeight) detail += ` | ${weights.every(w => w === weights[0]) ? weights[0] + 'kg' : weights.join('/') + 'kg'}`;
                        return detail;
                      })()}</span>
                      {gotNewPR && <span className="tag tag-warning" style={{ fontSize: '0.65rem' }}>NEW PR!</span>}
                    </div>
                  </div>
                  {lastEntry && (
                    <div className="last-session-hint">
                      <span className="last-session-label">Last session</span>
                      <span className="last-session-data">{lastEntry.sets.map(s => `${s.weight}kg x ${s.reps}`).join(' | ')}</span>
                    </div>
                  )}
                </div>
                {planEx.notes && <p className="text-sm text-muted mb-16" style={{ fontStyle: 'italic' }}>{planEx.notes}</p>}
                {(() => {
                  const url = planEx?.videoUrl || exercise?.videoUrl;
                  return url && isSafeUrl(url) ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-video mb-16">
                      <Play size={14} /> Watch Demo
                    </a>
                  ) : null;
                })()}
                {entry.sets.map((set, setIdx) => (
                  <div key={setIdx} className="log-set-row">
                    <span className="log-set-num">Set {setIdx + 1}</span>
                    <input className="form-input log-set-input" type="number" placeholder="kg" value={set.weight} onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)} />
                    <span className="text-sm text-muted">kg x</span>
                    <input className="form-input log-set-input" type="number" placeholder="reps" value={set.reps} onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)} />
                    <span className="text-sm text-muted">reps</span>
                  </div>
                ))}
              </div>
            );
          })}

          <div className="card">
            <div className="form-group">
              <label className="form-label">RPE (Rate of Perceived Exertion) - {rpe}/10</label>
              <input type="range" min="1" max="10" value={rpe} onChange={e => setRpe(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did the workout feel?" />
            </div>
            <button className="btn btn-accent" onClick={handleSave} style={{ width: '100%' }}>Save Workout</button>
          </div>
        </div>
      )}
    </div>
  );
}
