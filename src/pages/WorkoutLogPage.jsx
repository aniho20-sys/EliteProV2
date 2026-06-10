import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Trophy, NotebookPen, UserPlus, Timer, Pencil, X, Share2, CheckCircle } from 'lucide-react';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { normalizeSets, applySetUpdate, serializeEntries, stringifySet, emptySet, hasValue, formatSet, calcVolume, calcSetCount } from '../utils/workoutUtils';
import { localToday } from '../utils/dateUtils';
import { resolveExerciseName } from '../utils/exerciseUtils';
import { pickClosingMessage, buildWorkoutShareText } from '../utils/workoutShareUtils';
import { useRestTimer } from '../hooks/useRestTimer';
import WorkoutCompleteScreen from '../components/workout/WorkoutCompleteScreen';
import SetInputs from '../components/workout/SetInputs';
import ActiveWorkoutView from '../components/workout/ActiveWorkoutView';

export default function WorkoutLogPage() {
  const { currentUser, getWorkoutPlans, getWorkoutLogs, addWorkoutLog, updateWorkoutLog,
    getExercises, getPersonalRecords, checkAndAwardBadges, muscleGroups } = useApp();
  const isTrainer = currentUser?.role === 'trainer';
  const location = useLocation();
  const navigate = useNavigate();
  const targetClientId = (isTrainer && location.state?.clientId) ? location.state.clientId : currentUser.id;
  const targetClientName = location.state?.clientName || null;
  const loggingForClient = isTrainer && targetClientId !== currentUser.id;
  const exerciseLibrary = getExercises();
  const plans = getWorkoutPlans({ clientId: targetClientId });
  const logs = getWorkoutLogs(targetClientId);
  const prs = getPersonalRecords(targetClientId);
  const toast = useToast();

  const [showLog, setShowLog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [logDate, setLogDate] = useState(localToday());
  const [entries, setEntries] = useState([]);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [completedData, setCompletedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completedSets, setCompletedSets] = useState(new Set());
  const [detailExercise, setDetailExercise] = useState(null);
  const [swapExIdx, setSwapExIdx] = useState(null);

  const [editingLog, setEditingLog] = useState(null);
  const [editEntries, setEditEntries] = useState([]);
  const [editRpe, setEditRpe] = useState(7);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedLogId, setCopiedLogId] = useState(null);

  const timer = useRestTimer({ stopWhen: !showLog });
  const logDraftKey = `elitepro_active_log_${targetClientId}`;
  const getExerciseName = (id) => resolveExerciseName(exerciseLibrary, id);
  const getExercise = (id) => exerciseLibrary.find(e => e.id === id);

  // Auto-start from navigation state (e.g. from ClientDashboard CTA)
  const autoStartedRef = useRef(false);
  useEffect(() => {
    const planId = location.state?.planId;
    if (!planId || plans.length === 0 || autoStartedRef.current) return;
    const plan = plans.find(p => p.id === planId);
    if (plan) { autoStartedRef.current = true; startLog(plan); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.planId, plans.length]);

  // Restore in-progress draft from localStorage
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current || location.state?.planId) return;
    draftRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(logDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft.entries?.length) return;
      setSelectedPlan(draft.selectedPlan ?? null);
      setLogDate(draft.logDate ?? localToday());
      setEntries(draft.entries);
      setRpe(draft.rpe ?? 7);
      setNotes(draft.notes ?? '');
      timer.setRestSeconds(draft.restSeconds ?? 90);
      timer.setTimeLeft(draft.restSeconds ?? 90);
      setCompletedSets(new Set(draft.completedSets || []));
      setShowLog(true);
      toast('Workout session restored', 'info');
    } catch {
      localStorage.removeItem(logDraftKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft to localStorage while workout is active
  useEffect(() => {
    if (!showLog) return;
    try {
      localStorage.setItem(logDraftKey, JSON.stringify({
        selectedPlan, logDate, entries, rpe, notes,
        restSeconds: timer.restSeconds,
        completedSets: [...completedSets],
      }));
    } catch { /* ignore quota errors */ }
  }, [showLog, selectedPlan, logDate, entries, rpe, notes, timer.restSeconds, targetClientId, completedSets]);

  const buildPlanEntries = (plan) => {
    const lastLog = [...logs].reverse().find(l => l.planId === plan.id);
    return plan.exercises.map(ex => {
      const exercise = exerciseLibrary.find(e => e.id === ex.exerciseId);
      const unit = exercise?.unit || 'weight_reps';
      const lastEntry = lastLog?.entries?.find(e => e.exerciseId === ex.exerciseId);
      const planSets = normalizeSets(ex);
      return {
        exerciseId: ex.exerciseId,
        name: ex.name || getExerciseName(ex.exerciseId),
        unit,
        rest: ex.rest || 90,
        sets: planSets.map((ps, i) => {
          const prev = lastEntry?.sets?.[i];
          if (prev) return stringifySet(prev, unit);
          if (unit === 'weight_reps') return { weight: ps.weight > 0 ? String(ps.weight) : '', reps: ps.reps || '' };
          return emptySet(unit);
        }),
      };
    });
  };

  const startLog = (plan) => {
    setSelectedPlan(plan);
    setLogDate(localToday());
    setEntries(buildPlanEntries(plan));
    setRpe(7);
    setNotes('');
    setCompletedSets(new Set());
    setShowLog(true);
  };

  const startFreeWorkout = () => {
    setSelectedPlan(null);
    setLogDate(localToday());
    setEntries([]);
    setRpe(7);
    setNotes('');
    setCompletedSets(new Set());
    setShowLog(true);
  };

  const isNewPR = (entry) => {
    if ((entry.unit || 'weight_reps') !== 'weight_reps') return false;
    const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
    const currentPR = prs[entry.exerciseId]?.weight || 0;
    return maxWeight > 0 && maxWeight > currentPR;
  };

  const swapExercise = (exIdx, newEx) => {
    const newUnit = newEx.unit || 'weight_reps';
    setEntries(prev => prev.map((entry, i) => {
      if (i !== exIdx) return entry;
      const unitChanged = newUnit !== (entry.unit || 'weight_reps');
      return { ...entry, exerciseId: newEx.id, name: newEx.name, unit: newUnit,
        sets: unitChanged ? entry.sets.map(() => emptySet(newUnit)) : entry.sets };
    }));
    setCompletedSets(prev => {
      const next = new Set();
      prev.forEach(key => { if (!key.startsWith(`${exIdx}-`)) next.add(key); });
      return next;
    });
    setSwapExIdx(null);
    toast(`Swapped to ${newEx.name}`);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const logEntries = entries
      .filter(e => e.exerciseId)
      .map(e => {
        const unit = e.unit || 'weight_reps';
        return {
          exerciseId: e.exerciseId,
          name: e.name || getExerciseName(e.exerciseId) || e.exerciseId,
          unit,
          sets: e.sets.filter(s => hasValue(s, unit)).map(s => {
            if (unit === 'reps_only') return { reps: Number(s.reps) };
            if (unit === 'time') return { seconds: Number(s.seconds) };
            if (unit === 'distance') return { metres: Number(s.metres) };
            if (unit === 'weight_distance') return { weight: Number(s.weight), metres: Number(s.metres) };
            return { weight: Number(s.weight), reps: Number(s.reps) };
          }),
        };
      });
    const completedCount = logEntries.filter(e => e.sets.length > 0).length;
    const newPRs = entries.filter(e => e.exerciseId && isNewPR(e)).map(e => ({
      exerciseId: e.exerciseId,
      name: e.name || getExerciseName(e.exerciseId) || e.exerciseId,
      weight: Math.max(...e.sets.map(s => Number(s.weight) || 0)),
    }));
    const totalVolume = calcVolume(logEntries);
    const totalSets = calcSetCount(logEntries);
    try {
      await addWorkoutLog({
        clientId: targetClientId,
        ...(loggingForClient && { trainerId: currentUser.id, createdBy: currentUser.id, logType: 'pt_session' }),
        planId: selectedPlan?.id || '',
        workoutName: selectedPlan?.name || 'Custom Workout',
        date: logDate,
        completed: completedCount > 0,
        entries: logEntries,
        rpe: rpe ?? 7,
        notes: notes ?? '',
      });
      const newBadges = await checkAndAwardBadges(targetClientId).catch(() => []);
      localStorage.removeItem(logDraftKey);
      setShowLog(false);
      setCompletedSets(new Set());
      setCompletedData({ planName: selectedPlan?.name || 'Free Workout', exerciseCount: completedCount, totalVolume, totalSets, newPRs, rpe, newBadges });
    } catch (err) {
      console.error('[WorkoutLog] save failed:', err);
      toast(`Failed to save workout (${err?.code || err?.message || 'unknown error'})`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (log) => {
    setEditingLog(log);
    setEditEntries(log.entries.map(e => ({
      ...e, unit: e.unit || 'weight_reps',
      sets: (e.sets || []).map(s => ({
        weight: s.weight !== undefined ? String(s.weight) : '',
        reps: s.reps !== undefined ? String(s.reps) : '',
        seconds: s.seconds !== undefined ? String(s.seconds) : '',
        metres: s.metres !== undefined ? String(s.metres) : '',
      })),
    })));
    setEditRpe(log.rpe || 7);
    setEditNotes(log.notes || '');
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const updatedEntries = serializeEntries(editEntries);
      const completed = updatedEntries.some(e => e.sets.length > 0);
      await updateWorkoutLog(editingLog.id, { entries: updatedEntries, rpe: editRpe, notes: editNotes, completed });
      setEditingLog(null);
      toast('Workout updated');
    } catch {
      toast('Failed to update workout', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const wasPRAtTime = (log, entry) => {
    if ((entry.unit || 'weight_reps') !== 'weight_reps') return false;
    const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
    if (maxWeight <= 0) return false;
    const priorMax = logs
      .filter(l => l.id !== log.id && l.date <= log.date)
      .flatMap(l => (l.entries || []).filter(e => e.exerciseId === entry.exerciseId))
      .flatMap(e => (e.sets || []).map(s => Number(s.weight) || 0))
      .reduce((max, w) => Math.max(max, w), 0);
    return maxWeight > priorMax;
  };

  const prCount = Object.keys(prs).length;

  const handleShareLog = async (log, shareData) => {
    const text = buildWorkoutShareText(shareData, pickClosingMessage());
    if (navigator.share) {
      try { await navigator.share({ title: 'Workout Complete', text }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedLogId(log.id);
        setTimeout(() => setCopiedLogId(null), 2000);
      } catch { /* clipboard unavailable */ }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (completedData) {
    return (
      <WorkoutCompleteScreen data={completedData} onDone={() => {
        setCompletedData(null);
        if (loggingForClient) navigate(`/clients/${targetClientId}`, { state: { tab: 'workout logs' } });
      }} />
    );
  }

  if (showLog) {
    return (
      <>
        <ActiveWorkoutView
          selectedPlan={selectedPlan}
          entries={entries} setEntries={setEntries}
          logDate={logDate} setLogDate={setLogDate}
          rpe={rpe} setRpe={setRpe}
          notes={notes} setNotes={setNotes}
          saving={saving}
          completedSets={completedSets} setCompletedSets={setCompletedSets}
          prs={prs} logs={logs}
          exerciseLibrary={exerciseLibrary} muscleGroups={muscleGroups}
          getExerciseName={getExerciseName} getExercise={getExercise}
          timer={timer}
          swapExIdx={swapExIdx} setSwapExIdx={setSwapExIdx} swapExercise={swapExercise}
          isNewPR={isNewPR}
          onCancel={() => { setShowLog(false); setCompletedSets(new Set()); }}
          onSave={handleSave}
          logDraftKey={logDraftKey}
        />

        {/* Floating timer pill — always visible regardless of scroll */}
        <div className={`rest-timer-pill${timer.timerActive ? ' running' : ''}${timer.timerDone ? ' done' : ''}`}>
          <Timer size={17} className="rest-timer-pill-icon" />
          {timer.timerEditing ? (
            <div
              className="rest-timer-pill-edit"
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) timer.applyTimerInput(timer.timerMins, timer.timerSecs); }}
              onKeyDown={e => { if (e.key === 'Enter') timer.applyTimerInput(timer.timerMins, timer.timerSecs); if (e.key === 'Escape') timer.setTimerEditing(false); }}
            >
              <input className="rest-timer-pill-input" type="number" inputMode="numeric" min="0" max="59"
                value={timer.timerMins} onChange={e => timer.setTimerMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} autoFocus />
              <span className="rest-timer-pill-colon">:</span>
              <input className="rest-timer-pill-input" type="number" inputMode="numeric" min="0" max="59"
                value={String(timer.timerSecs).padStart(2, '0')} onChange={e => timer.setTimerSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} />
            </div>
          ) : (
            <span
              className="rest-timer-pill-time"
              onClick={!timer.timerActive ? timer.startEditTimer : undefined}
              style={!timer.timerActive ? { cursor: 'pointer' } : {}}
              title={!timer.timerActive ? 'Tap to set time' : undefined}
            >
              {timer.timerDisplay}
            </span>
          )}
          <span className="rest-timer-pill-sep" />
          <button className="rest-timer-pill-action" onClick={timer.toggleTimer}>
            {timer.timerActive ? 'Pause' : timer.timerDone ? '↺' : timer.timerStarted ? 'Resume' : 'Start'}
          </button>
        </div>

        {detailExercise && (
          <ExerciseDetailModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />
        )}
      </>
    );
  }

  // ── Plan selection + history view ────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workout Log</h1>
        <p className="page-subtitle">
          {loggingForClient ? `Logging for ${targetClientName}` : 'Record your training sessions'}
        </p>
      </div>

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
                <div className="pr-exercise">{pr.name || getExerciseName(exId, 'Custom exercise')}</div>
                <div className="pr-weight">{pr.weight}kg</div>
                <div className="pr-date">{pr.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-16">
        <h3 className="card-title mb-16">Start a Workout</h3>
        <div className="grid-3">
          {plans.map(p => (
            <button key={p.id} className="card client-card" onClick={() => startLog(p)} style={{ textAlign: 'left', border: '1px solid var(--border)' }}>
              <div className="fw-bold">{p.name}</div>
              <div className="text-sm text-muted">{p.day ? `${p.day} · ` : ''}{p.exercises.length} exercises</div>
            </button>
          ))}
          <button className="card client-card free-workout-card" onClick={startFreeWorkout}>
            <div className="fw-bold">Free Workout</div>
            <div className="text-sm text-muted">Choose your own exercises</div>
          </button>
        </div>
      </div>

      <h3 className="mb-16">History</h3>
      {logs.length === 0 ? (
        <EmptyState
          icon={!isTrainer && plans.length === 0 && !currentUser.trainerId ? UserPlus : NotebookPen}
          title="No workouts logged yet"
          description={
            isTrainer ? 'Assign a workout plan to your client first, then log it here.'
            : !currentUser.trainerId ? 'Connect to a coach first — they will assign workout plans for you to follow.'
            : plans.length > 0 ? 'Select a plan above to start logging your first session.'
            : "Your coach hasn't assigned any plans yet. You can start a Free Workout above anytime."
          }
          action={
            !isTrainer && !currentUser.trainerId ? { label: 'Connect to a Coach', to: '/profile' }
            : !isTrainer && plans.length === 0 ? { label: 'Message Your Coach', to: '/messages' }
            : undefined
          }
        />
      ) : (
        [...logs].reverse().map(l => {
          const plan = plans.find(p => p.id === l.planId);
          const totalVolume = calcVolume(l.entries);
          const totalSets = calcSetCount(l.entries);
          const planName = plan?.name || l.workoutName || 'Custom Workout';
          const newPRs = (l.entries || [])
            .filter(entry => entry.sets?.length > 0 && wasPRAtTime(l, entry))
            .map(entry => ({
              exerciseId: entry.exerciseId,
              name: entry.name || getExerciseName(entry.exerciseId),
              weight: Math.max(...entry.sets.map(s => Number(s.weight) || 0)),
            }));
          const shareData = { planName, totalVolume, totalSets, exerciseCount: (l.entries || []).length, rpe: l.rpe, newPRs };
          return (
            <div key={l.id} className="card mb-16">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{planName}</h3>
                  <span className="text-sm text-muted">{l.date}</span>
                </div>
                <div className="flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {!l.planId && <span className="tag">Custom</span>}
                  {l.logType && <span className={`tag ${l.logType === 'pt_session' ? 'tag-accent' : ''}`}>{l.logType === 'pt_session' ? 'PT Session' : 'Self'}</span>}
                  <span className="tag tag-primary">RPE: {l.rpe}/10</span>
                  <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Completed' : 'Partial'}</span>
                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleShareLog(l, shareData)} title={copiedLogId === l.id ? 'Copied!' : 'Share workout'}>
                    {copiedLogId === l.id ? <CheckCircle size={13} /> : <Share2 size={13} />}
                  </button>
                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => startEdit(l)} title="Edit workout">
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
              <div className="log-session-stats">
                {totalVolume > 0 && (
                  <div className="log-stat-item">
                    <span className="log-stat-value">{totalVolume.toLocaleString()}<span className="log-stat-unit">kg</span></span>
                    <span className="log-stat-label">Total Volume</span>
                  </div>
                )}
                <div className="log-stat-item">
                  <span className="log-stat-value">{totalSets}</span>
                  <span className="log-stat-label">Sets</span>
                </div>
                <div className="log-stat-item">
                  <span className="log-stat-value">{(l.entries || []).length}</span>
                  <span className="log-stat-label">Exercises</span>
                </div>
              </div>
              {l.entries.map((entry, i) => {
                const hadPR = entry.sets?.length > 0 && wasPRAtTime(l, entry);
                const skipped = !entry.sets || entry.sets.length === 0;
                return (
                  <div key={i} className={`plan-exercise ${hadPR ? 'plan-exercise-pr' : ''} ${skipped ? 'plan-exercise-skipped' : ''}`}>
                    <span className="plan-exercise-name">
                      {hadPR && <Trophy size={14} style={{ color: 'var(--warning)', marginRight: 6, verticalAlign: -2 }} />}
                      {entry.name || getExerciseName(entry.exerciseId)}
                    </span>
                    <span className="plan-exercise-detail">
                      {skipped ? '—' : entry.sets.map(s => formatSet(s, entry.unit || 'weight_reps')).join(' | ')}
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

      {editingLog && (
        <div className="modal-overlay" onClick={() => setEditingLog(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit Workout — {editingLog.date}</h3>
            {editEntries.map((entry, exIdx) => (
              <div key={exIdx} className="mb-16">
                <div className="fw-bold mb-8 text-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{entry.name || getExerciseName(entry.exerciseId)}</span>
                  <button className="btn-icon" style={{ color: 'var(--danger)', flexShrink: 0 }}
                    onClick={() => setEditEntries(prev => prev.filter((_, i) => i !== exIdx))}
                    title="Remove exercise">
                    <X size={14} />
                  </button>
                </div>
                {entry.sets.length === 0
                  ? <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Skipped</p>
                  : entry.sets.map((set, setIdx) => (
                    <SetInputs key={setIdx} set={set} setIdx={setIdx}
                      unit={entry.unit || 'weight_reps'}
                      onUpdate={(field, val) => setEditEntries(prev => applySetUpdate(prev, exIdx, setIdx, field, val))}
                      canRemove={false}
                    />
                  ))
                }
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">RPE — {editRpe}/10</label>
              <input type="range" min="1" max="10" value={editRpe} onChange={e => setEditRpe(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea className="form-textarea" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Session notes…" rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEditingLog(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {detailExercise && (
        <ExerciseDetailModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />
      )}
    </div>
  );
}
