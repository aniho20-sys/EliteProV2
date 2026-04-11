import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Play, Copy, GripVertical, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';

const EMPTY_CUSTOM = { name: '', muscles: [], saveToLibrary: false };

export default function WorkoutPlansPage() {
  const { currentUser, getWorkoutPlans, getClients, addWorkoutPlan, deleteWorkoutPlan, getExercises, addExercise, muscleGroups } = useApp();
  const exerciseLibrary = getExercises();
  const toast = useToast();
  const isTrainer = currentUser.role === 'trainer';
  const clients = isTrainer ? getClients(currentUser.id) : [];
  const plans = getWorkoutPlans(isTrainer ? { trainerId: currentUser.id } : { clientId: currentUser.id });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', clientId: '', day: 'Monday', exercises: [] });
  const [exFilter, setExFilter] = useState('');
  const exFilterRef = useRef('');
  const [dragIdx, setDragIdx] = useState(null);
  const [creatingCustom, setCreatingCustom] = useState(false);

  // Custom exercise form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM);
  const [customSaving, setCustomSaving] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const defaultSets = () => [{ weight: 0, reps: '10' }, { weight: 0, reps: '10' }, { weight: 0, reps: '10' }];

  const addExToForm = (exercise) => {
    setForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { exerciseId: exercise.id, name: exercise.name, sets: defaultSets(), notes: '' }],
    }));
  };

  const handleCreateCustomExercise = async () => {
    const name = exFilter.trim();
    if (!name) return;
    setCreatingCustom(true);
    try {
      const newEx = await addExercise({ name, muscle: 'Custom', equipment: 'Other', description: '', instructions: '' });
      addExToForm(newEx);
      updateExFilter('');
      toast(`"${newEx.name}" added to library and plan`);
    } catch {
      toast('Failed to create exercise', 'error');
    } finally {
      setCreatingCustom(false);
    }
  };

  const removeExercise = (index) => {
    setForm(prev => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== index) }));
  };

  const reorderExercise = (fromIdx, toIdx) => {
    setForm(prev => {
      const exs = [...prev.exercises];
      const [moved] = exs.splice(fromIdx, 1);
      exs.splice(toIdx, 0, moved);
      return { ...prev, exercises: exs };
    });
  };

  const addSet = (exIndex) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIndex) return ex;
        const last = ex.sets[ex.sets.length - 1] || { weight: 0, reps: '10' };
        return { ...ex, sets: [...ex.sets, { ...last }] };
      }),
    }));
  };

  const removeSet = (exIndex, setIndex) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIndex || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) };
      }),
    }));
  };

  const updateSet = (exIndex, setIndex, field, value) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIndex) return ex;
        return { ...ex, sets: ex.sets.map((s, j) => j === setIndex ? { ...s, [field]: value } : s) };
      }),
    }));
  };

  // Sync ref + state to avoid closure staleness in handleCreate
  const updateExFilter = (val) => {
    exFilterRef.current = val;
    setExFilter(val);
  };

  const toggleMuscle = (muscle) => {
    setCustomForm(prev => ({
      ...prev,
      muscles: prev.muscles.includes(muscle)
        ? prev.muscles.filter(m => m !== muscle)
        : [...prev.muscles, muscle],
    }));
  };

  const handleAddCustom = async () => {
    const name = customForm.name.trim();
    if (!name) return;
    const muscleStr = customForm.muscles.length > 0 ? customForm.muscles.join(', ') : '';

    setCustomSaving(true);
    try {
      if (customForm.saveToLibrary) {
        const newEx = await addExercise({
          name,
          muscle: muscleStr || 'Custom',
          equipment: 'Other',
          description: '',
        });
        setForm(prev => ({
          ...prev,
          exercises: [...prev.exercises, { exerciseId: newEx.id, name: newEx.name, sets: defaultSets(), notes: '' }],
        }));
        toast(`"${name}" saved to Exercise Library`);
      } else {
        setForm(prev => ({
          ...prev,
          exercises: [...prev.exercises, {
            exerciseId: name,
            customMuscle: muscleStr,
            sets: defaultSets(), notes: '',
          }],
        }));
      }
      setCustomForm(EMPTY_CUSTOM);
    } catch (err) {
      toast('Failed to add exercise: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setCustomSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    // Use ref to guarantee we read the latest value regardless of closure timing
    const pending = exFilterRef.current.trim();
    let exercises = form.exercises;

    if (!form.name.trim()) {
      toast('Please enter a plan name', 'error');
      return;
    }
    if (!form.clientId) {
      toast('Please select a client', 'error');
      return;
    }

    if (pending) {
      updateExFilter('');
      const exact = exerciseLibrary.find(ex => ex.name.toLowerCase() === pending.toLowerCase());
      let newEx;
      if (exact) {
        newEx = exact;
      } else {
        try {
          newEx = await addExercise({ name: pending, muscle: 'Custom', equipment: 'Other', description: '', instructions: '' });
        } catch {
          toast('Failed to create exercise', 'error');
          return;
        }
      }
      exercises = [...exercises, { exerciseId: newEx.id, name: newEx.name, sets: defaultSets(), notes: '' }];
    }

    if (exercises.length === 0) {
      toast('Please add at least one exercise', 'error');
      return;
    }

    try {
      await addWorkoutPlan({ ...form, exercises, trainerId: currentUser.id });
      setForm({ name: '', clientId: '', day: 'Monday', exercises: [] });
      updateExFilter('');
      setShowCreate(false);
      setShowCustomForm(false);
      setCustomForm(EMPTY_CUSTOM);
      toast('Workout plan created');
    } catch (err) {
      toast('Failed to create plan: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const getExerciseName = (id, fallback) => exerciseLibrary.find(e => e.id === id)?.name || fallback || id;
  const getExercise = (id) => exerciseLibrary.find(e => e.id === id);

  // Backward compat: convert old format { sets: 3, reps: '10', weight/weights } to new { sets: [{weight, reps}] }
  const normalizeSets = (ex) => {
    if (Array.isArray(ex.sets)) return ex.sets;
    const count = ex.sets || 1;
    const weights = ex.weights || Array(count).fill(ex.weight || 0);
    return Array.from({ length: count }, (_, i) => ({ weight: weights[i] || 0, reps: ex.reps || '0' }));
  };

  const formatExDetail = (ex) => {
    const sets = normalizeSets(ex);
    const reps = sets.map(s => s.reps);
    const weights = sets.map(s => s.weight);
    const allSameReps = reps.every(r => r === reps[0]);
    const allSameWeight = weights.every(w => w === weights[0]);
    const hasWeight = weights.some(w => w > 0);

    let detail = allSameReps ? `${sets.length} x ${reps[0]}` : sets.map(s => s.reps).join('/') + ' reps';
    if (hasWeight) {
      detail += allSameWeight ? ` @ ${weights[0]}kg` : ` | ${weights.join('/')}kg`;
    }
    return detail;
  };

  const duplicatePlan = (plan) => {
    setForm({
      name: `${plan.name} (Copy)`,
      clientId: '',
      day: plan.day,
      exercises: plan.exercises.map(ex => ({ ...ex, sets: normalizeSets(ex).map(s => ({ ...s })) })),
    });
    setShowCreate(true);
  };

  const filteredExercises = exerciseLibrary.filter(e =>
    e.name.toLowerCase().includes(exFilter.toLowerCase()) || e.muscle.toLowerCase().includes(exFilter.toLowerCase())
  );

  return (
    <div>
      <div className="page-header plan-header">
        <div>
          <h1 className="page-title">Workout Plans</h1>
          <p className="page-subtitle">{plans.length} plans</p>
        </div>
        {isTrainer && <button className="btn btn-primary" onClick={() => { setForm({ name: '', clientId: '', day: 'Monday', exercises: [] }); setShowCustomForm(false); setCustomForm(EMPTY_CUSTOM); setShowCreate(true); }}><Plus size={18} /> Create Plan</button>}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workout plans yet"
          description={isTrainer
            ? 'Create a plan to start assigning workouts to your clients.'
            : 'Your coach will create plans for you soon.'}
          action={isTrainer ? {
            label: 'Create Plan',
            onClick: () => { setForm({ name: '', clientId: '', day: 'Monday', exercises: [] }); setShowCustomForm(false); setCustomForm(EMPTY_CUSTOM); setShowCreate(true); }
          } : undefined}
        />
      ) : (
        plans.map(p => {
          const client = clients.find(c => c.id === p.clientId);
          return (
            <div key={p.id} className="card mb-16">
              <div className="plan-card-header">
                <div className="plan-card-info">
                  <h3 className="card-title">{p.name}</h3>
                  {client && <span className="text-sm text-muted">{client.name}</span>}
                </div>
                <div className="plan-card-actions">
                  <span className="tag tag-primary">{p.day}</span>
                  {isTrainer && (
                    <>
                      <button className="btn-icon" title="Duplicate" onClick={() => duplicatePlan(p)}><Copy size={16} /></button>
                      <button className="btn-icon" onClick={() => { deleteWorkoutPlan(p.id); toast('Plan deleted', 'error'); }} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </div>
              {p.exercises.map((ex, i) => {
                const exData = getExercise(ex.exerciseId);
                return (
                <div key={i} className="plan-exercise">
                  <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
                  {ex.customMuscle && <span className="tag" style={{ fontSize: 11 }}>{ex.customMuscle}</span>}
                  <span className="plan-exercise-detail">{formatExDetail(ex)}</span>
                  {ex.notes && <span className="plan-exercise-detail" style={{ fontStyle: 'italic' }}>{ex.notes}</span>}
                  {exData?.videoUrl && (
                    <a href={exData.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Watch Demo" style={{ color: 'var(--danger)', marginLeft: 'auto' }}>
                      <Play size={14} />
                    </a>
                  )}
                </div>
                );
              })}
            </div>
          );
        })
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create Workout Plan</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Plan Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Upper Body A" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-select" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Day</label>
                  <select className="form-select" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Exercise search */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Add Exercises</label>
                <input className="form-input" placeholder="Search or type a custom exercise..." value={exFilter} onChange={e => updateExFilter(e.target.value)} />
                {exFilter && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 220, overflowY: 'auto', marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                    {filteredExercises.slice(0, 8).map(ex => (
                      <div key={ex.id} className="contact-item" onClick={() => { addExToForm(ex); updateExFilter(''); }}>
                        <span className="text-sm">{ex.name}</span>
                        <span className="tag tag-primary" style={{ marginLeft: 'auto' }}>{ex.muscle}</span>
                      </div>
                    ))}
                    {filteredExercises.length === 0 && (
                      <div className="plan-ex-no-results">No matches in library</div>
                    )}
                    <div
                      className={`plan-ex-custom-add ${creatingCustom ? 'loading' : ''}`}
                      style={{ borderTop: filteredExercises.length > 0 ? '1px solid var(--border)' : 'none' }}
                      onClick={!creatingCustom ? handleCreateCustomExercise : undefined}
                    >
                      <Plus size={14} />
                      <span>{creatingCustom ? 'Adding...' : `Add "${exFilter}" as custom exercise`}</span>
                    </div>
                  </div>
                )}

                {/* Custom exercise toggle button */}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 8, width: '100%', justifyContent: 'space-between' }}
                  onClick={() => { setShowCustomForm(p => !p); setCustomForm(EMPTY_CUSTOM); }}
                >
                  <span><Plus size={14} style={{ marginRight: 4 }} />Custom Exercise (with muscle groups)</span>
                  {showCustomForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Custom exercise inline form */}
                {showCustomForm && (
                  <div style={{ marginTop: 8, padding: 16, background: 'var(--bg-input)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Exercise Name *</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Cable Lateral Raise"
                        value={customForm.name}
                        onChange={e => setCustomForm(p => ({ ...p, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); } }}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ marginBottom: 8 }}>Muscle Groups <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {muscleGroups.map(m => (
                          <button
                            key={m}
                            type="button"
                            className={`tag${customForm.muscles.includes(m) ? ' tag-primary' : ''}`}
                            style={{ cursor: 'pointer', padding: '5px 12px', fontSize: 13, border: customForm.muscles.includes(m) ? 'none' : '1px solid var(--border)' }}
                            onClick={() => toggleMuscle(m)}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={customForm.saveToLibrary}
                        onChange={e => setCustomForm(p => ({ ...p, saveToLibrary: e.target.checked }))}
                      />
                      Save to Exercise Library for future use
                    </label>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={handleAddCustom}
                        disabled={!customForm.name.trim() || customSaving}
                      >
                        {customSaving ? 'Adding...' : 'Add Exercise'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setShowCustomForm(false); setCustomForm(EMPTY_CUSTOM); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {form.exercises.length > 0 && (
                <div className="mb-16">
                  <label className="form-label">Exercises ({form.exercises.length})</label>
                  {form.exercises.map((ex, i) => (
                    <div
                      key={i}
                      className={`plan-exercise-builder ${dragIdx === i ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) reorderExercise(dragIdx, i); setDragIdx(i); }}
                      onDragEnd={() => setDragIdx(null)}
                    >
                      <div className="plan-exercise plan-exercise-drag">
                        <GripVertical size={14} className="drag-handle" />
                        <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
                        {ex.customMuscle && <span className="tag" style={{ fontSize: 11 }}>{ex.customMuscle}</span>}
                        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{ex.sets.length} sets</span>
                        <button type="button" className="btn-icon" onClick={() => removeExercise(i)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                      </div>
                      <div className="plan-sets-list">
                        {ex.sets.map((s, si) => (
                          <div key={si} className="plan-set-row">
                            <span className="plan-set-label">Set {si + 1}</span>
                            <input className="form-input log-set-input" type="number" value={s.weight || ''} onChange={e => updateSet(i, si, 'weight', Number(e.target.value) || 0)} placeholder="0" title="Weight (kg)" />
                            <span className="text-xs text-muted">kg</span>
                            <span className="text-xs text-muted">x</span>
                            <input className="form-input log-set-input" value={s.reps} onChange={e => updateSet(i, si, 'reps', e.target.value)} placeholder="10" title="Reps" />
                            <span className="text-xs text-muted">reps</span>
                            {ex.sets.length > 1 && (
                              <button type="button" className="btn-icon" onClick={() => removeSet(i, si)} title="Remove set"><Trash2 size={12} /></button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn btn-sm btn-outline plan-add-set-btn" onClick={() => addSet(i)}>
                          <Plus size={14} /> New Set
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
