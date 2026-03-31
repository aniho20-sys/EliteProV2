import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus } from 'lucide-react';

export default function WorkoutLogPage() {
  const { currentUser, getWorkoutPlans, getWorkoutLogs, addWorkoutLog, getExercises } = useApp();
  const exerciseLibrary = getExercises();
  const plans = getWorkoutPlans({ clientId: currentUser.id });
  const logs = getWorkoutLogs(currentUser.id);
  const [showLog, setShowLog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [entries, setEntries] = useState([]);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');

  const getExerciseName = (id) => exerciseLibrary.find(e => e.id === id)?.name || id;

  const startLog = (plan) => {
    setSelectedPlan(plan);
    setEntries(plan.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: '' })),
    })));
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

  const handleSave = () => {
    const logEntries = entries.map(e => ({
      exerciseId: e.exerciseId,
      sets: e.sets.filter(s => s.weight && s.reps).map(s => ({ weight: Number(s.weight), reps: Number(s.reps) })),
    })).filter(e => e.sets.length > 0);

    addWorkoutLog({
      clientId: currentUser.id,
      planId: selectedPlan.id,
      date: new Date().toISOString().split('T')[0],
      completed: logEntries.length === entries.length,
      entries: logEntries,
      rpe,
      notes,
    });
    setShowLog(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workout Log</h1>
        <p className="page-subtitle">Record your training sessions</p>
      </div>

      {!showLog ? (
        <>
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
            <div className="card empty-state"><p className="empty-state-text">No workouts logged yet. Start one above!</p></div>
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
                      <span className="tag tag-primary">RPE: {l.rpe}/10</span>
                      <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Completed' : 'Partial'}</span>
                    </div>
                  </div>
                  {l.entries.map((entry, i) => (
                    <div key={i} className="plan-exercise">
                      <span className="plan-exercise-name">{getExerciseName(entry.exerciseId)}</span>
                      <span className="plan-exercise-detail">
                        {entry.sets.map((s, j) => `${s.weight}kg x ${s.reps}`).join(' | ')}
                      </span>
                    </div>
                  ))}
                  {l.notes && <p className="text-sm text-muted mt-8">{l.notes}</p>}
                </div>
              );
            })
          )}
        </>
      ) : (
        <div>
          <div className="flex-between mb-16">
            <h2>{selectedPlan.name}</h2>
            <div className="flex gap-8">
              <button className="btn btn-outline" onClick={() => setShowLog(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleSave}>Save Workout</button>
            </div>
          </div>

          {entries.map((entry, exIdx) => {
            const planEx = selectedPlan.exercises[exIdx];
            return (
              <div key={exIdx} className="card mb-16">
                <div className="card-header">
                  <h3 className="card-title">{getExerciseName(entry.exerciseId)}</h3>
                  <span className="text-sm text-muted">{planEx.sets} x {planEx.reps} | Rest: {planEx.rest}s</span>
                </div>
                {planEx.notes && <p className="text-sm text-muted mb-16" style={{ fontStyle: 'italic' }}>{planEx.notes}</p>}
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
