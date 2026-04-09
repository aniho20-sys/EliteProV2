import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Play, Copy, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../context/ToastContext';

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
  const [dragIdx, setDragIdx] = useState(null);

  // Custom exercise form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM);
  const [customSaving, setCustomSaving] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const addExerciseToForm = (exercise) => {
    setForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { exerciseId: exercise.id, sets: 3, reps: '10', rest: 60, notes: '' }],
    }));
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

  const updateExercise = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === index ? { ...ex, [field]: value } : ex),
    }));
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
          exercises: [...prev.exercises, { exerciseId: newEx.id, sets: 3, reps: '10', rest: 60, notes: '' }],
        }));
        toast(`"${name}" saved to Exercise Library`);
      } else {
        setForm(prev => ({
          ...prev,
          exercises: [...prev.exercises, {
            exerciseId: name,
            customMuscle: muscleStr,
            sets: 3, reps: '10', rest: 60, notes: '',
          }],
        }));
      }
      // Reset form but keep it open so user can add another
      setCustomForm(EMPTY_CUSTOM);
    } catch (err) {
      toast('Failed to add exercise: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setCustomSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await addWorkoutPlan({ ...form, trainerId: currentUser.id });
      setForm({ name: '', clientId: '', day: 'Monday', exercises: [] });
      setShowCreate(false);
      setShowCustomForm(false);
      setCustomForm(EMPTY_CUSTOM);
      toast('Workout plan created');
    } catch (err) {
      toast('Failed to create plan: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const getExerciseName = (id) => exerciseLibrary.find(e => e.id === id)?.name || id;
  const getExercise = (id) => exerciseLibrary.find(e => e.id === id);

  const duplicatePlan = (plan) => {
    setForm({
      name: `${plan.name} (Copy)`,
      clientId: '',
      day: plan.day,
      exercises: plan.exercises.map(ex => ({ ...ex })),
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
        <div className="card empty-state"><p className="empty-state-text">No workout plans yet</p></div>
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
                  <span className="plan-exercise-name">{getExerciseName(ex.exerciseId)}</span>
                  {ex.customMuscle && <span className="tag" style={{ fontSize: 11 }}>{ex.customMuscle}</span>}
                  <span className="plan-exercise-detail">{ex.sets} x {ex.reps}</span>
                  <span className="plan-exercise-detail">Rest: {ex.rest}s</span>
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
                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Upper Body A" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-select" required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
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
              <div className="form-group">
                <label className="form-label">Add Exercises</label>
                <input className="form-input" placeholder="Search exercise library..." value={exFilter} onChange={e => setExFilter(e.target.value)} />
                {exFilter && (
                  <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 4, background: 'var(--bg-input)', borderRadius: 8, padding: 4 }}>
                    {filteredExercises.slice(0, 8).map(ex => (
                      <div key={ex.id} className="contact-item" onClick={() => { addExerciseToForm(ex); setExFilter(''); }}>
                        <span className="text-sm">{ex.name}</span>
                        <span className="tag tag-primary" style={{ marginLeft: 'auto' }}>{ex.muscle}</span>
                      </div>
                    ))}
                    {filteredExercises.length === 0 && (
                      <p className="text-sm text-muted" style={{ padding: '8px 12px' }}>No matching exercises in library</p>
                    )}
                  </div>
                )}

                {/* Custom exercise toggle button */}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 8, width: '100%', justifyContent: 'space-between' }}
                  onClick={() => { setShowCustomForm(p => !p); setCustomForm(EMPTY_CUSTOM); }}
                >
                  <span><Plus size={14} style={{ marginRight: 4 }} />Custom Exercise</span>
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
                      className={`plan-exercise plan-exercise-drag ${dragIdx === i ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) reorderExercise(dragIdx, i); setDragIdx(i); }}
                      onDragEnd={() => setDragIdx(null)}
                    >
                      <GripVertical size={14} className="drag-handle" />
                      <span className="plan-exercise-name">{getExerciseName(ex.exerciseId)}</span>
                      {ex.customMuscle && <span className="tag" style={{ fontSize: 11 }}>{ex.customMuscle}</span>}
                      <input className="form-input log-set-input" type="number" value={ex.sets} onChange={e => updateExercise(i, 'sets', Number(e.target.value))} title="Sets" />
                      <span className="text-sm text-muted">x</span>
                      <input className="form-input log-set-input" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} title="Reps" />
                      <input className="form-input log-set-input" type="number" value={ex.rest} onChange={e => updateExercise(i, 'rest', Number(e.target.value))} title="Rest (s)" />
                      <span className="text-sm text-muted">s</span>
                      <button type="button" className="btn-icon" onClick={() => removeExercise(i)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={form.exercises.length === 0}>Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
