import { Trophy, Play, Timer, ArrowLeftRight, Info } from 'lucide-react';
import { isSafeUrl } from '../../utils/urlUtils';
import { normalizeSets, UNIT_OPTIONS, emptySet, formatSet, getProgressionSuggestion, stringifySet } from '../../utils/workoutUtils';
import { localToday } from '../../utils/dateUtils';
import SetInputs from './SetInputs';
import ExerciseSwapModal from './ExerciseSwapModal';

const REST_OPTIONS = [30, 45, 60, 90, 120, 180, 300];
const formatRest = s => s < 60 ? `${s}s` : `${s / 60}m`;

function RestTimerBar({ timer }) {
  const { timerDisplay, timerActive, timerDone, timerStarted, timerEditing, timerMins, timerSecs,
    setTimerEditing, setTimerMins, setTimerSecs, toggleTimer, resetTimer, startEditTimer, applyTimerInput } = timer;
  return (
    <div className="rest-timer-bar mb-16">
      <span className="rest-timer-label"><Timer size={12} style={{ marginRight: 4 }} />Rest Timer</span>
      <div className="rest-timer-right">
        {timerEditing ? (
          <div
            className="rest-timer-edit"
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) applyTimerInput(timerMins, timerSecs); }}
            onKeyDown={e => { if (e.key === 'Enter') applyTimerInput(timerMins, timerSecs); if (e.key === 'Escape') setTimerEditing(false); }}
          >
            <input className="rest-timer-split-input" type="number" inputMode="numeric" min="0" max="59"
              value={timerMins} onChange={e => setTimerMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} autoFocus />
            <span className="rest-timer-split-label">m</span>
            <input className="rest-timer-split-input" type="number" inputMode="numeric" min="0" max="59"
              value={timerSecs} onChange={e => setTimerSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} />
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
  );
}

export default function ActiveWorkoutView({
  selectedPlan, entries, setEntries,
  logDate, setLogDate,
  rpe, setRpe, notes, setNotes,
  saving, completedSets, setCompletedSets,
  prs, logs,
  exerciseLibrary, muscleGroups,
  getExerciseName, getExercise,
  timer,
  swapExIdx, setSwapExIdx, swapExercise,
  isNewPR,
  onCancel, onSave,
  logDraftKey,
}) {
  const { startTimer } = timer;

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
      startTimer(entries[exIdx]?.rest || 90);
    }
  };

  return (
    <div>
      <div className="log-top-bar mb-16">
        <div className="log-top-title">
          <h2 className="page-title">{selectedPlan.name}</h2>
          <input
            type="date" className="form-input log-date-input"
            value={logDate} max={localToday()}
            onChange={e => e.target.value && setLogDate(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="log-top-actions">
          <button className="btn btn-outline" onClick={() => { localStorage.removeItem(logDraftKey); onCancel(); }} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-accent" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Workout'}
          </button>
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
                  {exercise && (
                    <button className="ex-info-btn" onClick={() => setSwapExIdx({ type: 'detail', exercise })} title="Exercise details">
                      <Info size={14} />
                    </button>
                  )}
                  <button className="ex-info-btn" onClick={() => setSwapExIdx(exIdx)} title="Swap exercise">
                    <ArrowLeftRight size={14} />
                  </button>
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
            {planEx?.notes && <p className="text-sm text-muted mb-16" style={{ fontStyle: 'italic' }}>{planEx.notes}</p>}
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
                canRemove={false}
                done={completedSets.has(`${exIdx}-${setIdx}`)}
                onComplete={() => handleCompleteSet(exIdx, setIdx)}
              />
            ))}
            <button className="btn btn-outline btn-sm mt-8" onClick={() => addSet(exIdx)}>+ Add Set</button>
          </div>
        );
      })}

      <RestTimerBar timer={timer} />

      <div className="card">
        <div className="form-group">
          <label className="form-label">RPE (Rate of Perceived Exertion) — {rpe}/10</label>
          <input type="range" min="1" max="10" value={rpe} onChange={e => setRpe(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Session Notes</label>
          <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did the workout feel?" />
        </div>
        <button className="btn btn-accent" onClick={onSave} style={{ width: '100%' }} disabled={saving}>
          {saving ? 'Saving…' : 'Save Workout'}
        </button>
      </div>

      {typeof swapExIdx === 'number' && (
        <ExerciseSwapModal
          exerciseLibrary={exerciseLibrary}
          muscleGroups={muscleGroups}
          currentId={entries[swapExIdx]?.exerciseId}
          currentName={entries[swapExIdx]?.name || getExerciseName(entries[swapExIdx]?.exerciseId)}
          onSwap={ex => swapExercise(swapExIdx, ex)}
          onClose={() => setSwapExIdx(null)}
        />
      )}
    </div>
  );
}
