import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Play, Copy, GripVertical } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function WorkoutPlansPage() {
  const { currentUser, getWorkoutPlans, getClients, addWorkoutPlan, deleteWorkoutPlan, getExercises, addExercise } = useApp();
  const exerciseLibrary = getExercises();
  const toast = useToast();
  const isTrainer = currentUser.role === 'trainer';
  const clients = isTrainer ? getClients(currentUser.id) : [];
  const plans = getWorkoutPlans(isTrainer ? { trainerId: currentUser.id } : { clientId: currentUser.id });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', clientId: '', day: 'Monday', exercises: [] });
  const [exFilter, setExFilter] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [creatingCustom, setCreatingCustom] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const addExToForm = (exercise) => {
    setForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { exerciseId: exercise.id, name: exercise.name, sets: 3, reps: '10', rest: 60, notes: '' }],
    }));
  };

  const handleCreateCustomExercise = async () => {
    const name = exFilter.trim();
    if (!name) return;
    setCreatingCustom(true);
    try {
      const newEx = await addExercise({ name, muscle: 'Custom', equipment: 'Other', description: '', instructions: '' });
      addExToForm(newEx);
      setExFilter('');
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

  const updateExercise = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === index ? { ...ex, [field]: value } : ex),
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    let exercises = form.exercises;

    // Auto-add any text left in the search field
    const pending = exFilter.trim();
    if (pending) {
      setExFilter('');
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
      exercises = [...exercises, { exerciseId: newEx.id, name: newEx.name, sets: 3, reps: '10', rest: 60, notes: '' }];
    }

    if (exercises.length === 0) {
      toast('Please add at least one exercise', 'error');
      return;
    }
    addWorkoutPlan({ ...form, exercises, trainerId: currentUser.id, sets: undefined });
    setForm({ name: '', clientId: '', day: 'Monday', exercises: [] });
    setShowCreate(false);
    toast('Workout plan created');
  };

  const getExerciseName = (id, fallback) => exerciseLibrary.find(e => e.id === id)?.name || fallback || id;
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
        {isTrainer && <button className="btn btn-primary" onClick={() => { setForm({ name: '', clientId: '', day: 'Monday', exercises: [] }); setShowCreate(true); }}><Plus size={18} /> Create Plan</button>}
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
                  <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
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

              <div className="form-group">
                <label className="form-label">Add Exercises</label>
                <input className="form-input" placeholder="Search or type a custom exercise..." value={exFilter} onChange={e => setExFilter(e.target.value)} onBlur={() => setTimeout(() => setExFilter(''), 150)} />
                {exFilter && (
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 4, background: 'var(--bg-input)', borderRadius: 8, padding: 4 }}>
                    {filteredExercises.slice(0, 8).map(ex => (
                      <div key={ex.id} className="contact-item" onClick={() => { addExToForm(ex); setExFilter(''); }}>
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
                      <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
                      <input className="form-input log-set-input" type="number" value={ex.sets} onChange={e => updateExercise(i, 'sets', Number(e.target.value))} title="Sets" />
                      <span className="text-sm text-muted">x</span>
                      <input className="form-input log-set-input" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} title="Reps" />
                      <input className="form-input log-set-input" type="number" value={ex.rest} onChange={e => updateExercise(i, 'rest', Number(e.target.value))} title="Rest" />
                      <span className="text-sm text-muted">s</span>
                      <button type="button" className="btn-icon" onClick={() => removeExercise(i)}><Trash2 size={14} /></button>
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
