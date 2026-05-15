import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Trophy, Play, NotebookPen, UserPlus, Timer, Pencil, CheckCircle, Plus, X, Search, Info } from 'lucide-react';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { normalizeSets, applySetUpdate, serializeEntries, stringifySet, UNIT_OPTIONS, emptySet, hasValue, formatSet, getProgressionSuggestion } from '../utils/workoutUtils';
import { isSafeUrl } from '../utils/urlUtils';
import { localToday } from '../utils/dateUtils';
import { resolveExerciseName } from '../utils/exerciseUtils';

const CLOSING_MESSAGES = [
  'Every rep builds the best version of you.',
  'Consistency is what transforms average into excellence.',
  'You showed up. That\'s already winning.',
  'Progress, not perfection.',
  'Strong today. Stronger tomorrow.',
  'The only bad workout is the one that didn\'t happen.',
];

function WorkoutCompleteScreen({ data, onDone }) {
  const [msg] = useState(() => CLOSING_MESSAGES[Math.floor(Math.random() * CLOSING_MESSAGES.length)]);
  return (
    <div className="workout-complete">
      <div className="workout-complete-check">
        <CheckCircle size={64} strokeWidth={1.5} />
      </div>
      <h1 className="workout-complete-title">Workout Complete</h1>
      <p className="workout-complete-plan">{data.planName}</p>

      <div className="workout-complete-stats">
        {data.totalVolume > 0 ? (
          <div className="workout-complete-stat">
            <div className="workout-complete-stat-value">{data.totalVolume.toLocaleString()}</div>
            <div className="workout-complete-stat-label">Volume (kg)</div>
          </div>
        ) : (
          <div className="workout-complete-stat">
            <div className="workout-complete-stat-value">{data.totalSets}</div>
            <div className="workout-complete-stat-label">Sets</div>
          </div>
        )}
        <div className="workout-complete-stat">
          <div className="workout-complete-stat-value">{data.exerciseCount}</div>
          <div className="workout-complete-stat-label">Exercises</div>
        </div>
        <div className="workout-complete-stat">
          <div className="workout-complete-stat-value">{data.rpe}/10</div>
          <div className="workout-complete-stat-label">RPE</div>
        </div>
      </div>

      {data.newPRs.length > 0 && (
        <div className="workout-complete-prs">
          <div className="workout-complete-prs-title">
            <Trophy size={15} /> New Personal Records
          </div>
          {data.newPRs.map(pr => (
            <div key={pr.exerciseId} className="workout-complete-pr-item">
              <span>{pr.name}</span>
              <span className="fw-bold">{pr.weight}kg</span>
            </div>
          ))}
        </div>
      )}
      {data.newBadges?.length > 0 && (
        <div className="workout-complete-prs">
          <div className="workout-complete-prs-title">🏅 Badge Unlocked!</div>
          {data.newBadges.map(b => (
            <div key={b.id} className="workout-complete-pr-item">
              <span>{b.icon} {b.name}</span>
            </div>
          ))}
        </div>
      )}

      <p className="workout-complete-quote">"{msg}"</p>
      <button className="btn btn-accent" onClick={onDone} style={{ width: '100%' }}>
        Done
      </button>
    </div>
  );
}

const REST_OPTIONS = [30, 45, 60, 90, 120, 180, 300];
const formatRest = (s) => s < 60 ? `${s}s` : `${s / 60}m`;

function SetInputs({ set, setIdx, unit = 'weight_reps', onUpdate, onRemove, canRemove, done, onComplete }) {
  const repsRef = useRef(null);
  const step = (field, delta, min = 0) => {
    const cur = parseFloat(set[field]) || 0;
    onUpdate(field, String(Math.max(min, Math.round((cur + delta) * 10) / 10)));
  };
  return (
    <div className={`log-set-row${done ? ' log-set-row-done' : ''}`}>
      <span className="log-set-num">Set {setIdx + 1}</span>
      {unit === 'weight_reps' && (<>
        <div className="log-field-group">
          <button className="log-stepper" onClick={() => step('weight', -2.5)} tabIndex={-1}>−</button>
          <input
            className="form-input log-set-input" type="number" placeholder="kg"
            inputMode="decimal" enterKeyHint="next"
            value={set.weight ?? ''} onChange={e => onUpdate('weight', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && repsRef.current?.focus()}
          />
          <button className="log-stepper" onClick={() => step('weight', 2.5)} tabIndex={-1}>+</button>
        </div>
        <span className="text-sm text-muted">×</span>
        <div className="log-field-group">
          <button className="log-stepper" onClick={() => step('reps', -1, 1)} tabIndex={-1}>−</button>
          <input
            ref={repsRef}
            className="form-input log-set-input" type="number" placeholder="reps"
            inputMode="numeric" enterKeyHint="done"
            value={set.reps ?? ''} onChange={e => onUpdate('reps', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onComplete?.()}
          />
          <button className="log-stepper" onClick={() => step('reps', 1)} tabIndex={-1}>+</button>
        </div>
      </>)}
      {unit === 'reps_only' && (<>
        <span className="text-sm text-muted">×</span>
        <div className="log-field-group">
          <button className="log-stepper" onClick={() => step('reps', -1, 1)} tabIndex={-1}>−</button>
          <input
            className="form-input log-set-input" type="number" placeholder="reps"
            inputMode="numeric" enterKeyHint="done"
            value={set.reps ?? ''} onChange={e => onUpdate('reps', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onComplete?.()}
          />
          <button className="log-stepper" onClick={() => step('reps', 1)} tabIndex={-1}>+</button>
        </div>
      </>)}
      {unit === 'time' && (<>
        <div className="log-field-group">
          <button className="log-stepper" onClick={() => step('seconds', -5, 0)} tabIndex={-1}>−</button>
          <input
            className="form-input log-set-input" type="number" placeholder="sec"
            inputMode="numeric" enterKeyHint="done"
            value={set.seconds ?? ''} onChange={e => onUpdate('seconds', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onComplete?.()}
          />
          <button className="log-stepper" onClick={() => step('seconds', 5)} tabIndex={-1}>+</button>
        </div>
        <span className="text-sm text-muted">s</span>
      </>)}
      {unit === 'distance' && (<>
        <div className="log-field-group">
          <button className="log-stepper" onClick={() => step('metres', -10, 0)} tabIndex={-1}>−</button>
          <input
            className="form-input log-set-input" type="number" placeholder="m"
            inputMode="numeric" enterKeyHint="done"
            value={set.metres ?? ''} onChange={e => onUpdate('metres', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onComplete?.()}
          />
          <button className="log-stepper" onClick={() => step('metres', 10)} tabIndex={-1}>+</button>
        </div>
        <span className="text-sm text-muted">m</span>
      </>)}
      {onComplete && (
        <button className={`log-set-done${done ? ' done' : ''}`} onClick={onComplete} title="Mark set done">
          <CheckCircle size={18} />
        </button>
      )}
      {canRemove && (
        <button className="btn btn-outline btn-sm btn-icon" onClick={onRemove} title="Remove set"><X size={12} /></button>
      )}
    </div>
  );
}

export default function WorkoutLogPage() {
  const { currentUser, getWorkoutPlans, getWorkoutLogs, addWorkoutLog, updateWorkoutLog, getExercises, addExercise, getPersonalRecords, checkAndAwardBadges, muscleGroups } = useApp();
  const isTrainer = currentUser?.role === 'trainer';
  const location = useLocation();
  const navigate = useNavigate();
  // Trainer can log on behalf of a client (passed via navigation state)
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
  const [isFreeWorkout, setIsFreeWorkout] = useState(false);
  const [completedSets, setCompletedSets] = useState(new Set());
  const [customUnit, setCustomUnit] = useState('weight_reps');
  const [pendingCustomUnit, setPendingCustomUnit] = useState(null);
  const [detailExercise, setDetailExercise] = useState(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [pickerMuscles, setPickerMuscles] = useState([]);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  const [editingLog, setEditingLog] = useState(null);
  const [editEntries, setEditEntries] = useState([]);
  const [editRpe, setEditRpe] = useState(7);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editExSearch, setEditExSearch] = useState('');

  // Rest timer state
  const [restSeconds, setRestSeconds] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [timerMins, setTimerMins] = useState(1);
  const [timerSecs, setTimerSecs] = useState(30);
  const timerRef = useRef(null);

  const logDraftKey = `elitepro_active_log_${targetClientId}`;
  const getExerciseName = (id, fallback) => resolveExerciseName(exerciseLibrary, id, fallback);
  const getExercise = (id) => exerciseLibrary.find(e => e.id === id);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    const planId = location.state?.planId;
    if (!planId || plans.length === 0 || autoStartedRef.current) return;
    const plan = plans.find(p => p.id === planId);
    if (plan) { autoStartedRef.current = true; startLog(plan); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.planId, plans.length]);

  // Restore in-progress log from localStorage on mount
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current || location.state?.planId) return;
    draftRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(logDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft.entries?.length) return;
      setIsFreeWorkout(draft.isFreeWorkout ?? false);
      setLogDate(draft.logDate ?? localToday());
      setSelectedPlan(draft.selectedPlan ?? null);
      setEntries(draft.entries);
      setRpe(draft.rpe ?? 7);
      setNotes(draft.notes ?? '');
      setRestSeconds(draft.restSeconds ?? 90);
      setTimeLeft(draft.restSeconds ?? 90);
      setCompletedSets(new Set(draft.completedSets || []));
      setShowLog(true);
      toast('Workout session restored', 'info');
    } catch {
      localStorage.removeItem(logDraftKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save in-progress log to localStorage
  useEffect(() => {
    if (!showLog) return;
    try {
      localStorage.setItem(logDraftKey, JSON.stringify({
        isFreeWorkout, selectedPlan, logDate, entries, rpe, notes, restSeconds,
        completedSets: [...completedSets],
      }));
    } catch { /* ignore localStorage quota errors */ }
  }, [showLog, isFreeWorkout, selectedPlan, logDate, entries, rpe, notes, restSeconds, targetClientId]);

  // Stop timer when leaving workout view
  useEffect(() => {
    if (!showLog) {
      setTimerActive(false);
      clearInterval(timerRef.current);
    }
  }, [showLog]);

  // Countdown tick
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          playBeep();
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.25);
      });
    } catch { /* AudioContext not available */ }
  };

  const toggleTimer = () => {
    if (timeLeft === 0) { setTimeLeft(restSeconds); setTimerActive(true); return; }
    setTimerActive(p => !p);
  };

  const resetTimer = () => { setTimerActive(false); setTimeLeft(restSeconds); };

  const startEditTimer = () => {
    if (timerActive) return;
    setTimerMins(Math.floor(restSeconds / 60));
    setTimerSecs(restSeconds % 60);
    setTimerEditing(true);
  };
  const applyTimerInput = () => {
    setTimerEditing(false);
    const total = Math.max(5, Math.min(3600, timerMins * 60 + timerSecs));
    setRestSeconds(total);
    setTimeLeft(total);
    setTimerActive(false);
  };

  const startFreeWorkout = () => {
    setSelectedPlan(null);
    setIsFreeWorkout(true);
    setEntries([]);
    setRpe(7);
    setNotes('');
    setRestSeconds(90);
    setTimeLeft(90);
    setTimerActive(false);
    setCompletedSets(new Set());
    setCustomUnit('weight_reps');
    setShowLog(true);
  };

  const addExerciseToLog = (exercise) => {
    const unit = exercise.unit || 'weight_reps';
    setEntries(prev => [...prev, {
      exerciseId: exercise.id,
      name: exercise.name,
      unit,
      rest: 90,
      sets: [emptySet(unit)],
    }]);
    setShowExercisePicker(false);
    setExerciseSearch('');
  };

  const addCustomExerciseToLog = (name, unit = 'weight_reps') => {
    const id = 'custom-' + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setEntries(prev => [...prev, { exerciseId: id, name: name.trim(), unit, rest: 90, sets: [emptySet(unit)] }]);
    setShowExercisePicker(false);
    setExerciseSearch('');
    setCustomUnit('weight_reps');
    const exists = exerciseLibrary.some(e => e.id === id);
    if (!exists) addExercise({ id, name: name.trim(), unit, muscle: '', equipment: '', description: '', instructions: '' }).catch(() => {});
  };

  const addSet = (exIdx) => {
    setEntries(prev => prev.map((entry, i) => {
      if (i !== exIdx) return entry;
      const lastSet = entry.sets[entry.sets.length - 1];
      const newSet = lastSet ? { ...lastSet, completed: false } : emptySet(entry.unit || 'weight_reps');
      return { ...entry, sets: [...entry.sets, newSet] };
    }));
  };

  const applyProgression = (exIdx, suggestion) => {
    setEntries(prev => prev.map((entry, i) =>
      i !== exIdx ? entry : { ...entry, sets: entry.sets.map(s => ({ ...s, weight: String(suggestion) })) }
    ));
  };

  const fillFromLast = (exIdx, lastEntry, unit) => {
    setEntries(prev => prev.map((entry, i) =>
      i !== exIdx ? entry : { ...entry, sets: lastEntry.sets.map(s => stringifySet(s, unit)) }
    ));
  };

  const removeSet = (exIdx, setIdx) => {
    setEntries(prev => prev.map((entry, i) =>
      i === exIdx ? { ...entry, sets: entry.sets.filter((_, j) => j !== setIdx) } : entry
    ));
    setCompletedSets(prev => {
      const next = new Set();
      prev.forEach(key => {
        const [ex, set] = key.split('-').map(Number);
        if (ex !== exIdx) { next.add(key); return; }
        if (set < setIdx) next.add(key);
        else if (set > setIdx) next.add(`${ex}-${set - 1}`);
      });
      return next;
    });
  };

  const removeExercise = (exIdx) => {
    setEntries(prev => prev.filter((_, i) => i !== exIdx));
    setCompletedSets(prev => {
      const next = new Set();
      prev.forEach(key => {
        const [ex, set] = key.split('-').map(Number);
        if (ex < exIdx) next.add(key);
        else if (ex > exIdx) next.add(`${ex - 1}-${set}`);
      });
      return next;
    });
  };

  const updateExerciseRest = (exIdx, seconds) => {
    setEntries(prev => prev.map((entry, i) => i === exIdx ? { ...entry, rest: seconds } : entry));
  };

  const updateExerciseUnit = (exIdx, unit) => {
    setEntries(prev => prev.map((entry, i) =>
      i === exIdx ? { ...entry, unit, sets: entry.sets.map(() => emptySet(unit)) } : entry
    ));
    setCompletedSets(prev => {
      const next = new Set();
      prev.forEach(key => { if (!key.startsWith(`${exIdx}-`)) next.add(key); });
      return next;
    });
  };

  const handleCompleteSet = (exIdx, setIdx) => {
    const key = `${exIdx}-${setIdx}`;
    const isCompleting = !completedSets.has(key);
    setCompletedSets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    if (isCompleting) {
      const restDur = entries[exIdx]?.rest || 90;
      setRestSeconds(restDur);
      setTimeLeft(restDur);
      setTimerActive(true);
    }
  };

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

  const loadFromPlan = (plan) => {
    setEntries(prev => [...prev, ...buildPlanEntries(plan)]);
    setShowPlanPicker(false);
  };

  const startLog = (plan) => {
    setIsFreeWorkout(false);
    setSelectedPlan(plan);
    setLogDate(localToday());
    setEntries(buildPlanEntries(plan));
    setRpe(7);
    setNotes('');
    setRestSeconds(90);
    setTimeLeft(90);
    setTimerActive(false);
    setCompletedSets(new Set());
    setShowLog(true);
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setEntries(prev => prev.map((entry, i) => {
      if (i !== exIdx) return entry;
      const sets = entry.sets.map((s, j) => {
        if (j === setIdx) return { ...s, [field]: value };
        if (j > 0 && setIdx === 0 && value !== '' && (s[field] === '' || s[field] == null))
          return { ...s, [field]: value };
        return s;
      });
      return { ...entry, sets };
    }));
  };

  const isNewPR = (entry) => {
    if ((entry.unit || 'weight_reps') !== 'weight_reps') return false;
    const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
    const currentPR = prs[entry.exerciseId]?.weight || 0;
    return maxWeight > 0 && maxWeight > currentPR;
  };

  const startEdit = (log) => {
    setEditingLog(log);
    setEditEntries(log.entries.map(e => ({
      ...e,
      unit: e.unit || 'weight_reps',
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

  const updateEditSet = (exIdx, setIdx, field, value) => {
    setEditEntries(prev => applySetUpdate(prev, exIdx, setIdx, field, value));
  };

  const addEditSet = (exIdx) => {
    setEditEntries(prev => prev.map((entry, i) => {
      if (i !== exIdx) return entry;
      const last = entry.sets[entry.sets.length - 1] || { weight: '', reps: '', seconds: '', metres: '' };
      return { ...entry, sets: [...entry.sets, { ...last }] };
    }));
  };

  const removeEditSet = (exIdx, setIdx) => {
    setEditEntries(prev => prev.map((entry, i) =>
      i === exIdx ? { ...entry, sets: entry.sets.filter((_, j) => j !== setIdx) } : entry
    ));
  };

  const removeEditExercise = (exIdx) => {
    setEditEntries(prev => prev.filter((_, i) => i !== exIdx));
  };

  const addEditExercise = (exercise) => {
    const unit = exercise.unit || 'weight_reps';
    setEditEntries(prev => [...prev, {
      exerciseId: exercise.id,
      name: exercise.name,
      unit,
      sets: [{ weight: '', reps: '', seconds: '', metres: '' }],
    }]);
    setEditExSearch('');
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
    const logDate = log.date;
    const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
    if (maxWeight <= 0) return false;
    const priorMax = logs
      .filter(l => l.id !== log.id && l.date <= logDate)
      .flatMap(l => (l.entries || []).filter(e => e.exerciseId === entry.exerciseId))
      .flatMap(e => (e.sets || []).map(s => Number(s.weight) || 0))
      .reduce((max, w) => Math.max(max, w), 0);
    return maxWeight > priorMax;
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    const logEntries = entries.map(e => {
      const unit = e.unit || 'weight_reps';
      return {
        exerciseId: e.exerciseId,
        name: e.name || getExerciseName(e.exerciseId),
        unit,
        sets: e.sets.filter(s => hasValue(s, unit)).map(s => {
          if (unit === 'reps_only') return { reps: Number(s.reps) };
          if (unit === 'time') return { seconds: Number(s.seconds) };
          if (unit === 'distance') return { metres: Number(s.metres) };
          return { weight: Number(s.weight), reps: Number(s.reps) };
        }),
      };
    });
    const completedCount = logEntries.filter(e => e.sets.length > 0).length;

    const newPRs = entries
      .filter(e => isNewPR(e))
      .map(e => ({
        exerciseId: e.exerciseId,
        name: e.name || getExerciseName(e.exerciseId),
        weight: Math.max(...e.sets.map(s => Number(s.weight) || 0)),
      }));
    const totalVolume = logEntries.reduce((sum, e) => {
      if ((e.unit || 'weight_reps') !== 'weight_reps') return sum;
      return sum + e.sets.reduce((s2, s) => s2 + (s.weight || 0) * (s.reps || 0), 0);
    }, 0);
    const totalSets = logEntries.reduce((sum, e) => sum + e.sets.length, 0);

    try {
      await addWorkoutLog({
        clientId: targetClientId,
        ...(loggingForClient && { trainerId: currentUser.id, createdBy: currentUser.id, logType: 'pt_session' }),
        planId: isFreeWorkout ? null : selectedPlan.id,
        ...(isFreeWorkout && { workoutName: 'Custom Workout' }),
        date: logDate,
        completed: completedCount > 0,
        entries: logEntries,
        rpe,
        notes,
      });
      const newBadges = await checkAndAwardBadges(targetClientId).catch(() => []);
      const displayName = isFreeWorkout ? 'Custom Workout' : selectedPlan.name;
      localStorage.removeItem(logDraftKey);
      setShowLog(false);
      setIsFreeWorkout(false);
      setCompletedSets(new Set());
      setCompletedData({ planName: displayName, exerciseCount: completedCount, totalVolume, totalSets, newPRs, rpe, newBadges });
    } catch {
      toast('Failed to save workout', 'error');
    } finally {
      setSaving(false);
    }
  };

  const prCount = Object.keys(prs).length;
  const timerDisplay = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const timerDone = timeLeft === 0;
  const timerStarted = timeLeft < restSeconds || timerActive;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workout Log</h1>
        <p className="page-subtitle">
          {loggingForClient ? `Logging for ${targetClientName}` : 'Record your training sessions'}
        </p>
      </div>

      {completedData ? (
        <WorkoutCompleteScreen data={completedData} onDone={() => {
          setCompletedData(null);
          if (loggingForClient) navigate(`/clients/${targetClientId}`, { state: { tab: 'workout logs' } });
        }} />
      ) : !showLog ? (
        <>
          <div className="rest-timer-bar mb-16">
            <span className="rest-timer-label"><Timer size={12} style={{ marginRight: 4 }} />Rest Timer</span>
            <div className="rest-timer-right">
              {timerEditing ? (
                <div
                  className="rest-timer-edit"
                  onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) applyTimerInput(); }}
                  onKeyDown={e => { if (e.key === 'Enter') applyTimerInput(); if (e.key === 'Escape') setTimerEditing(false); }}
                >
                  <input
                    className="rest-timer-split-input"
                    type="number" inputMode="numeric" min="0" max="59"
                    value={timerMins}
                    onChange={e => setTimerMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    autoFocus
                  />
                  <span className="rest-timer-split-label">m</span>
                  <input
                    className="rest-timer-split-input"
                    type="number" inputMode="numeric" min="0" max="59"
                    value={timerSecs}
                    onChange={e => setTimerSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  />
                  <span className="rest-timer-split-label">s</span>
                </div>
              ) : (
                <span
                  className={`rest-timer-display${timerActive ? ' rest-timer-active' : ''}${timerDone ? ' rest-timer-done' : ''}`}
                  onClick={startEditTimer}
                  title={!timerActive ? 'Tap to set time' : undefined}
                  style={!timerActive ? { cursor: 'pointer' } : {}}
                >
                  {timerDisplay}
                </span>
              )}
              <button className={`btn ${timerActive ? 'btn-outline' : 'btn-accent'}`} onClick={toggleTimer}>
                {timerActive ? 'Pause' : timerDone ? 'Restart' : timerStarted ? 'Resume' : 'Start'}
              </button>
              {timerStarted && !timerActive && !timerDone && (
                <button className="btn btn-outline btn-sm" onClick={resetTimer} title="Reset">↺</button>
              )}
            </div>
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
                    <div className="pr-exercise">{getExerciseName(exId)}</div>
                    <div className="pr-weight">{pr.weight}kg</div>
                    <div className="pr-date">{pr.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card mb-16">
            <h3 className="card-title mb-16">Start a Workout</h3>
            {plans.length > 0 && (
              <>
                <div className="grid-3">
                  {plans.map(p => (
                    <button key={p.id} className="card client-card" onClick={() => startLog(p)} style={{ textAlign: 'left', border: '1px solid var(--border)' }}>
                      <div className="fw-bold">{p.name}</div>
                      <div className="text-sm text-muted">{p.day ? `${p.day} · ` : ''}{p.exercises.length} exercises</div>
                    </button>
                  ))}
                </div>
                <div className="free-workout-divider"><span>or</span></div>
              </>
            )}
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={startFreeWorkout}>
              <Plus size={16} /> Start Custom Workout
            </button>
          </div>

          <h3 className="mb-16">History</h3>
          {logs.length === 0 ? (
            <EmptyState
              icon={!isTrainer && plans.length === 0 && !currentUser.trainerId ? UserPlus : NotebookPen}
              title="No workouts logged yet"
              description={
                isTrainer
                  ? 'Tap "Start Custom Workout" to begin a session with the rest timer.'
                  : !currentUser.trainerId
                    ? 'Connect to a coach first — they will assign workout plans for you to follow.'
                    : plans.length > 0
                      ? 'Select a plan above to start logging your first session.'
                      : 'Your coach hasn\'t assigned any plans yet. Message them to get started.'
              }
              action={
                !isTrainer && !currentUser.trainerId
                  ? { label: 'Connect to a Coach', to: '/profile' }
                  : !isTrainer && plans.length === 0
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
                      <h3 className="card-title">{plan?.name || l.workoutName || 'Custom Workout'}</h3>
                      <span className="text-sm text-muted">{l.date}</span>
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {!l.planId && <span className="tag">Custom</span>}
                      {l.logType && <span className={`tag ${l.logType === 'pt_session' ? 'tag-accent' : ''}`}>{l.logType === 'pt_session' ? 'PT Session' : 'Self'}</span>}
                      <span className="tag tag-primary">RPE: {l.rpe}/10</span>
                      <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Completed' : 'Partial'}</span>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => startEdit(l)} title="Edit workout">
                        <Pencil size={13} />
                      </button>
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
        </>
      ) : (
        <div>
          <div className="log-top-bar mb-16">
            <div className="log-top-title">
              <h2 className="page-title">{isFreeWorkout ? 'Custom Workout' : selectedPlan.name}</h2>
              <input
                type="date"
                className="form-input log-date-input"
                value={logDate}
                max={localToday()}
                onChange={e => e.target.value && setLogDate(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="log-top-actions">
              {isFreeWorkout && plans.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={() => setShowPlanPicker(true)}>Load Plan</button>
              )}
              <button className="btn btn-outline" onClick={() => { localStorage.removeItem(logDraftKey); setShowLog(false); setIsFreeWorkout(false); setCompletedSets(new Set()); }} disabled={saving}>Cancel</button>
              <button className="btn btn-accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Workout'}</button>
            </div>
          </div>

          {isFreeWorkout ? (
            <>
              {entries.length === 0 && (
                <div className="card mb-16" style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <p className="text-muted">No exercises yet — tap Add Exercise to get started.</p>
                </div>
              )}
              {entries.map((entry, exIdx) => {
                const currentPR = prs[entry.exerciseId];
                const exercise = getExercise(entry.exerciseId);
                const gotNewPR = isNewPR(entry);
                return (
                  <div key={exIdx} className={`card mb-16 ${gotNewPR ? 'card-pr-glow' : ''}`}>
                    <div className="log-card-header">
                      <div className="log-card-title">
                        <h3 className="card-title">
                          {gotNewPR && <Trophy size={16} style={{ color: 'var(--warning)', marginRight: 6, verticalAlign: -2 }} />}
                          {entry.name}
                          {exercise && <button className="ex-info-btn" onClick={() => setDetailExercise(exercise)} title="Exercise details"><Info size={14} /></button>}
                        </h3>
                        <div className="log-card-tags">
                          {currentPR && <span className="text-sm" style={{ color: 'var(--warning)' }}>PR: {currentPR.weight}kg</span>}
                          {gotNewPR && <span className="tag tag-warning" style={{ fontSize: '0.65rem' }}>NEW PR!</span>}
                        </div>
                      </div>
                      <div className="log-unit-picker" style={{ marginBottom: 8 }}>
                        {UNIT_OPTIONS.map(o => (
                          <button key={o.value} type="button"
                            className={`log-unit-pill${(entry.unit || 'weight_reps') === o.value ? ' active' : ''}`}
                            onClick={() => updateExerciseUnit(exIdx, o.value)}
                          >{o.label}</button>
                        ))}
                      </div>
                      <div className="log-exercise-rest">
                        <Timer size={11} />
                        <select className="log-rest-select" value={entry.rest || 90} onChange={e => updateExerciseRest(exIdx, Number(e.target.value))}>
                          {REST_OPTIONS.map(s => <option key={s} value={s}>{formatRest(s)}</option>)}
                        </select>
                      </div>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => removeExercise(exIdx)} title="Remove exercise">
                        <X size={14} />
                      </button>
                    </div>
                    {exercise?.videoUrl && isSafeUrl(exercise.videoUrl) && (
                      <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-video mb-16">
                        <Play size={14} /> Watch Demo
                      </a>
                    )}
                    {entry.sets.map((set, setIdx) => (
                      <SetInputs key={setIdx} set={set} setIdx={setIdx}
                        unit={entry.unit || 'weight_reps'}
                        onUpdate={(field, val) => updateSet(exIdx, setIdx, field, val)}
                        onRemove={() => removeSet(exIdx, setIdx)}
                        canRemove={entry.sets.length > 1}
                        done={completedSets.has(`${exIdx}-${setIdx}`)}
                        onComplete={() => handleCompleteSet(exIdx, setIdx)}
                      />
                    ))}
                    <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => addSet(exIdx)}>
                      <Plus size={13} /> Add Set
                    </button>
                  </div>
                );
              })}
              <button className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }} onClick={() => setShowExercisePicker(true)}>
                <Plus size={16} /> Add Exercise
              </button>
            </>
          ) : (
            entries.map((entry, exIdx) => {
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
                        {exercise && <button className="ex-info-btn" onClick={() => setDetailExercise(exercise)} title="Exercise details"><Info size={14} /></button>}
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
                    <div className="log-unit-picker" style={{ marginBottom: 8 }}>
                      {UNIT_OPTIONS.map(o => (
                        <button key={o.value} type="button"
                          className={`log-unit-pill${(entry.unit || 'weight_reps') === o.value ? ' active' : ''}`}
                          onClick={() => updateExerciseUnit(exIdx, o.value)}
                        >{o.label}</button>
                      ))}
                    </div>
                    <div className="log-exercise-rest">
                      <Timer size={11} />
                      <select className="log-rest-select" value={entry.rest || 90} onChange={e => updateExerciseRest(exIdx, Number(e.target.value))}>
                        {REST_OPTIONS.map(s => <option key={s} value={s}>{formatRest(s)}</option>)}
                      </select>
                    </div>
                    {lastEntry && (
                      <div className="last-session-hint">
                        <span className="last-session-label">Last</span>
                        <span className="last-session-data">{lastEntry.sets.map(s => formatSet(s, entry.unit || 'weight_reps')).join(' | ')}</span>
                        <button className="btn btn-outline btn-sm last-session-fill-btn" onClick={() => fillFromLast(exIdx, lastEntry, entry.unit || 'weight_reps')}>Fill</button>
                      </div>
                    )}
                    {(() => {
                      const suggestion = getProgressionSuggestion(logs, entry.exerciseId);
                      return suggestion ? (
                        <button className="progression-hint progression-hint-btn" onClick={() => applyProgression(exIdx, suggestion)}>
                          <span className="progression-hint-label">↑ Try</span>
                          <span className="progression-hint-weight">{suggestion}kg</span>
                          <span className="progression-hint-apply">Apply</span>
                        </button>
                      ) : null;
                    })()}
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
                    <SetInputs key={setIdx} set={set} setIdx={setIdx}
                      unit={entry.unit || 'weight_reps'}
                      onUpdate={(field, val) => updateSet(exIdx, setIdx, field, val)}
                      onRemove={() => removeSet(exIdx, setIdx)}
                      canRemove={entry.sets.length > 1}
                      done={completedSets.has(`${exIdx}-${setIdx}`)}
                      onComplete={() => handleCompleteSet(exIdx, setIdx)}
                    />
                  ))}
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => addSet(exIdx)}>
                    <Plus size={13} /> Add Set
                  </button>
                </div>
              );
            })
          )}

          {/* Rest Timer */}
          <div className="rest-timer-bar mb-16">
            <span className="rest-timer-label"><Timer size={12} style={{ marginRight: 4 }} />Rest Timer</span>
            <div className="rest-timer-right">
              {timerEditing ? (
                <div
                  className="rest-timer-edit"
                  onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) applyTimerInput(); }}
                  onKeyDown={e => { if (e.key === 'Enter') applyTimerInput(); if (e.key === 'Escape') setTimerEditing(false); }}
                >
                  <input
                    className="rest-timer-split-input"
                    type="number" inputMode="numeric" min="0" max="59"
                    value={timerMins}
                    onChange={e => setTimerMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    autoFocus
                  />
                  <span className="rest-timer-split-label">m</span>
                  <input
                    className="rest-timer-split-input"
                    type="number" inputMode="numeric" min="0" max="59"
                    value={timerSecs}
                    onChange={e => setTimerSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  />
                  <span className="rest-timer-split-label">s</span>
                </div>
              ) : (
                <span
                  className={`rest-timer-display${timerActive ? ' rest-timer-active' : ''}${timerDone ? ' rest-timer-done' : ''}`}
                  onClick={startEditTimer}
                  title={!timerActive ? 'Tap to set time' : undefined}
                  style={!timerActive ? { cursor: 'pointer' } : {}}
                >
                  {timerDisplay}
                </span>
              )}
              <button className={`btn ${timerActive ? 'btn-outline' : 'btn-accent'}`} onClick={toggleTimer}>
                {timerActive ? 'Pause' : timerDone ? 'Restart' : timerStarted ? 'Resume' : 'Start'}
              </button>
              {timerStarted && !timerActive && !timerDone && (
                <button className="btn btn-outline btn-sm" onClick={resetTimer} title="Reset">↺</button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="form-group">
              <label className="form-label">RPE (Rate of Perceived Exertion) - {rpe}/10</label>
              <input type="range" min="1" max="10" value={rpe} onChange={e => setRpe(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did the workout feel?" />
            </div>
            <button className="btn btn-accent" onClick={handleSave} style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save Workout'}
            </button>
          </div>
        </div>
      )}
      {showExercisePicker && (
        <div className="modal-overlay" onClick={() => { setShowExercisePicker(false); setExerciseSearch(''); setPickerMuscles([]); setPendingCustomUnit(null); }}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Exercise</h3>
            <div className="form-group" style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="Search by name or muscle…"
                value={exerciseSearch}
                onChange={e => { setExerciseSearch(e.target.value); setPendingCustomUnit(null); }}
              />
            </div>
            <div className="picker-muscle-chips">
              {muscleGroups.map(m => (
                <button
                  key={m} type="button"
                  className={`picker-chip${pickerMuscles.includes(m) ? ' picker-chip-active' : ''}`}
                  onClick={() => setPickerMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                >{m}</button>
              ))}
            </div>
            <div className="exercise-picker-list" style={{ maxHeight: 'clamp(160px, 38vh, 320px)' }}>
              {(() => {
                const filtered = exerciseLibrary.filter(e => {
                  const matchText = !exerciseSearch ||
                    e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                    e.muscle?.toLowerCase().includes(exerciseSearch.toLowerCase());
                  const matchMuscle = pickerMuscles.length === 0 ||
                    pickerMuscles.some(m => e.muscle?.toLowerCase().includes(m.toLowerCase()));
                  return matchText && matchMuscle;
                });
                return (<>
                  {filtered.length === 0 && !exerciseSearch.trim() && (
                    <p className="picker-empty">Search or filter to find exercises</p>
                  )}
                  {filtered.length === 0 && exerciseSearch.trim() && !pendingCustomUnit && (
                    <p className="picker-empty">No results for "{exerciseSearch.trim()}" — add as custom below</p>
                  )}
                  {filtered.map(exercise => (
                    <button key={exercise.id} className="exercise-picker-item" onClick={() => addExerciseToLog(exercise)}>
                      <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{exercise.name}</span>
                      <span className="text-sm text-muted">{exercise.muscle}</span>
                    </button>
                  ))}
                </>);
              })()}
            </div>
            {exerciseSearch.trim() && (
              <div className="exercise-picker-custom-wrap">
                <span className="exercise-picker-custom-label">+ Add "{exerciseSearch.trim()}" as custom:</span>
                {!pendingCustomUnit ? (
                  <div className="log-unit-picker">
                    {UNIT_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        className={`log-unit-pill${customUnit === opt.value ? ' active' : ''}`}
                        onClick={() => { setCustomUnit(opt.value); setPendingCustomUnit(opt.value); }}
                      >{opt.label}</button>
                    ))}
                  </div>
                ) : (
                  <div className="picker-custom-confirm">
                    <span>Add <strong>"{exerciseSearch.trim()}"</strong> ({UNIT_OPTIONS.find(o => o.value === pendingCustomUnit)?.label})?</span>
                    <button className="btn btn-primary btn-sm" onClick={() => addCustomExerciseToLog(exerciseSearch.trim(), pendingCustomUnit)}>Add</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setPendingCustomUnit(null)}>Back</button>
                  </div>
                )}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowExercisePicker(false); setExerciseSearch(''); setPickerMuscles([]); setPendingCustomUnit(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showPlanPicker && (
        <div className="modal-overlay" onClick={() => setShowPlanPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Load from Plan</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Exercises will be added to your current session.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plans.map(p => (
                <button key={p.id} className="exercise-picker-item" onClick={() => loadFromPlan(p)}>
                  <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{p.name}</span>
                  <span className="text-sm text-muted">{p.day ? `${p.day} · ` : ''}{p.exercises.length} exercises</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPlanPicker(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingLog && (
        <div className="modal-overlay" onClick={() => { setEditingLog(null); setEditExSearch(''); }}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit Workout — {editingLog.date}</h3>
            {editEntries.map((entry, exIdx) => (
              <div key={exIdx} className="mb-16" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="fw-bold text-sm">{entry.name || getExerciseName(entry.exerciseId)}</span>
                  <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeEditExercise(exIdx)} title="Remove exercise"><X size={14} /></button>
                </div>
                {entry.sets.length === 0
                  ? <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Skipped</p>
                  : entry.sets.map((set, setIdx) => (
                    <SetInputs key={setIdx} set={set} setIdx={setIdx}
                      unit={entry.unit || 'weight_reps'}
                      onUpdate={(field, val) => updateEditSet(exIdx, setIdx, field, val)}
                      onRemove={() => removeEditSet(exIdx, setIdx)}
                      canRemove={entry.sets.length > 1}
                    />
                  ))
                }
                <button className="btn btn-outline btn-sm" style={{ marginTop: 6 }} onClick={() => addEditSet(exIdx)}>
                  <Plus size={13} /> Add Set
                </button>
              </div>
            ))}

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Add Exercise</label>
              <input
                className="form-input"
                placeholder="Search exercises..."
                value={editExSearch}
                onChange={e => setEditExSearch(e.target.value)}
              />
              {editExSearch.trim() && (
                <div className="ex-search-results">
                  {exerciseLibrary
                    .filter(e => e.name.toLowerCase().includes(editExSearch.toLowerCase()))
                    .slice(0, 8)
                    .map(ex => (
                      <div key={ex.id} className="contact-item" onClick={() => addEditExercise(ex)}>
                        <span className="text-sm">{ex.name}</span>
                        <span className="tag tag-primary" style={{ marginLeft: 'auto' }}>{ex.muscle}</span>
                      </div>
                    ))}
                  {exerciseLibrary.filter(e => e.name.toLowerCase().includes(editExSearch.toLowerCase())).length === 0 && (
                    <div className="plan-ex-no-results">No matches found</div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">RPE — {editRpe}/10</label>
              <input type="range" min="1" max="10" value={editRpe} onChange={e => setEditRpe(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea className="form-textarea" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Session notes…" rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setEditingLog(null); setEditExSearch(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </div>
  );
}
