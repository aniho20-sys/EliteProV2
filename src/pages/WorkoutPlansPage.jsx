import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Play, Copy, GripVertical, ChevronDown, ChevronUp, Dumbbell, Link2, ExternalLink, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import MuscleSelector from '../components/MuscleSelector';
import { normalizeSets, emptySet, UNIT_OPTIONS } from '../utils/workoutUtils';
import { resolveExerciseName, exerciseFieldsValid } from '../utils/exerciseUtils';
import { isSafeUrl, isYouTube } from '../utils/urlUtils';

const EMPTY_CUSTOM = { name: '', muscles: [], equipment: '', saveToLibrary: false };

export default function WorkoutPlansPage() {
  const { currentUser, getWorkoutPlans, getClients, addWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan, getExercises, addExercise, updateExercise, equipmentTypes } = useApp();
  const exerciseLibrary = getExercises();
  const toast = useToast();
  const isTrainer = currentUser.role === 'trainer';
  const clients = isTrainer ? getClients(currentUser.id) : [];
  const plans = getWorkoutPlans(isTrainer ? { trainerId: currentUser.id } : { clientId: currentUser.id });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', clientId: '', day: '', exercises: [] });
  const [bulkAssign, setBulkAssign] = useState(false);
  const [bulkClientIds, setBulkClientIds] = useState([]);
  const [exFilter, setExFilter] = useState('');
  const [exEquipFilter, setExEquipFilter] = useState('');
  const exFilterRef = useRef('');
  const [dragIdx, setDragIdx] = useState(null);
  const [addLinkModal, setAddLinkModal] = useState(null); // { exerciseId, name }
  const [addLinkUrl, setAddLinkUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [deletePlanModal, setDeletePlanModal] = useState(null); // planId
  const [deleting, setDeleting] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState(new Set());
  const [editPlanId, setEditPlanId] = useState(null);

  const togglePlan = (planId) => setExpandedPlans(prev => {
    const next = new Set(prev);
    next.has(planId) ? next.delete(planId) : next.add(planId);
    return next;
  });

  const openEdit = (plan) => {
    setEditPlanId(plan.id);
    setForm({
      name: plan.name,
      clientId: plan.clientId,
      day: plan.day || '',
      exercises: plan.exercises.map(ex => ({ ...ex, sets: normalizeSets(ex).map(s => ({ ...s })) })),
    });
    setShowCustomForm(false);
    setCustomForm(EMPTY_CUSTOM);
    updateExFilter('');
    setExEquipFilter('');
    setShowCreate(true);
  };

  // Custom exercise form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM);
  const [customSaving, setCustomSaving] = useState(false);

  const addExToForm = (exercise) => {
    const unit = exercise.unit || 'weight_reps';
    setForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { exerciseId: exercise.id, name: exercise.name, unit, sets: Array.from({ length: 3 }, () => emptySet(unit)), notes: '' }],
    }));
  };

  const changeExUnit = (exIndex, unit) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIndex ? ex : {
        ...ex, unit, sets: Array.from({ length: ex.sets.length }, () => emptySet(unit)),
      }),
    }));
  };

  const setExNotes = (exIndex, value) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIndex ? ex : { ...ex, notes: value }),
    }));
  };

  // Opens the full custom-exercise form pre-filled with the typed name, instead of
  // instant-creating with placeholder muscle/equipment — every new library exercise
  // needs a real muscle group + equipment before it's saved.
  const handleCreateCustomExercise = () => {
    const name = exFilter.trim();
    if (!name) return;
    setCustomForm({ ...EMPTY_CUSTOM, name });
    setShowCustomForm(true);
    updateExFilter('');
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
        const last = ex.sets[ex.sets.length - 1] || emptySet('weight_reps');
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

  const updateExVideoUrl = (exIndex, value) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === exIndex ? { ...ex, videoUrl: value } : ex),
    }));
  };

  // Sync ref + state to avoid closure staleness in handleCreate
  const updateExFilter = (val) => {
    exFilterRef.current = val;
    setExFilter(val);
  };

  const handleAddCustom = async () => {
    const name = customForm.name.trim();
    if (!name) return;
    const muscleStr = customForm.muscles.length > 0 ? customForm.muscles.join(', ') : '';

    if (customForm.saveToLibrary && !exerciseFieldsValid({ muscle: muscleStr, equipment: customForm.equipment })) {
      toast('Pick at least one muscle group and an equipment type to save to the library', 'error');
      return;
    }

    setCustomSaving(true);
    try {
      if (customForm.saveToLibrary) {
        const newEx = await addExercise({
          name,
          muscle: muscleStr,
          equipment: customForm.equipment,
          description: '',
        });
        setForm(prev => ({
          ...prev,
          exercises: [...prev.exercises, { exerciseId: newEx.id, name: newEx.name, sets: Array.from({ length: 3 }, () => emptySet('weight_reps')), notes: '' }],
        }));
        toast(`"${name}" saved to Exercise Library`);
      } else {
        setForm(prev => ({
          ...prev,
          exercises: [...prev.exercises, {
            exerciseId: name,
            customMuscle: muscleStr,
            sets: Array.from({ length: 3 }, () => emptySet('weight_reps')), notes: '',
          }],
        }));
        toast(`"${name}" added to plan`);
      }
      setCustomForm(EMPTY_CUSTOM);
      setShowCustomForm(false);
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
    const targetClientIds = bulkAssign ? bulkClientIds : (form.clientId ? [form.clientId] : []);
    if (targetClientIds.length === 0) {
      toast(bulkAssign ? 'Please select at least one client' : 'Please select a client', 'error');
      return;
    }

    if (pending) {
      const exact = exerciseLibrary.find(ex => ex.name.toLowerCase() === pending.toLowerCase());
      if (exact) {
        updateExFilter('');
        exercises = [...exercises, { exerciseId: exact.id, name: exact.name, sets: Array.from({ length: 3 }, () => emptySet('weight_reps')), notes: '' }];
      } else {
        toast(`"${pending}" isn't in the library yet — use "Add as new exercise" below the search box first`, 'error');
        return;
      }
    }

    if (exercises.length === 0) {
      toast('Please add at least one exercise', 'error');
      return;
    }

    try {
      await Promise.all(
        targetClientIds.map(clientId => addWorkoutPlan({ ...form, clientId, exercises, trainerId: currentUser.id }))
      );
      setForm({ name: '', clientId: '', day: '', exercises: [] });
      setBulkClientIds([]);
      setBulkAssign(false);
      updateExFilter('');
      setExEquipFilter('');
      setShowCreate(false);
      setShowCustomForm(false);
      setCustomForm(EMPTY_CUSTOM);
      toast(targetClientIds.length > 1 ? `Plan assigned to ${targetClientIds.length} clients` : 'Workout plan created');
    } catch (err) {
      toast('Failed to create plan: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const pending = exFilterRef.current.trim();
    let exercises = form.exercises;

    if (!form.name.trim()) { toast('Please enter a plan name', 'error'); return; }

    if (pending) {
      const exact = exerciseLibrary.find(ex => ex.name.toLowerCase() === pending.toLowerCase());
      if (exact) {
        updateExFilter('');
        exercises = [...exercises, { exerciseId: exact.id, name: exact.name, sets: Array.from({ length: 3 }, () => emptySet('weight_reps')), notes: '' }];
      } else {
        toast(`"${pending}" isn't in the library yet — use "Add as new exercise" below the search box first`, 'error');
        return;
      }
    }

    if (exercises.length === 0) { toast('Please add at least one exercise', 'error'); return; }

    try {
      await updateWorkoutPlan(editPlanId, { name: form.name, exercises });
      setShowCreate(false);
      setEditPlanId(null);
      setForm({ name: '', clientId: '', day: '', exercises: [] });
      updateExFilter('');
      setExEquipFilter('');
      setShowCustomForm(false);
      setCustomForm(EMPTY_CUSTOM);
      toast('Plan updated');
    } catch (err) {
      toast('Failed to update plan: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const getExerciseName = (id, fallback) => resolveExerciseName(exerciseLibrary, id, fallback);
  const getExercise = (id) => exerciseLibrary.find(e => e.id === id);


  const formatExDetail = (ex) => {
    const unit = ex.unit || 'weight_reps';
    const sets = normalizeSets(ex);
    if (unit === 'time') return `${sets.length} sets · ${sets.map(s => `${s.seconds || 0}s`).join('/')}`;
    if (unit === 'distance') return `${sets.length} sets · ${sets.map(s => `${s.metres || 0}m`).join('/')}`;
    if (unit === 'reps_only') {
      const allSame = sets.every(s => s.reps === sets[0].reps);
      return allSame ? `${sets.length} × ${sets[0].reps || 0} reps` : sets.map(s => s.reps || 0).join('/') + ' reps';
    }
    const reps = sets.map(s => s.reps);
    const allSameReps = reps.every(r => r === reps[0]);
    return allSameReps ? `${sets.length} × ${reps[0] || 0} reps` : reps.join('/') + ' reps';
  };

  const duplicatePlan = (plan) => {
    setEditPlanId(null);
    setForm({
      name: `${plan.name} (Copy)`,
      clientId: '',
      day: plan.day,
      exercises: plan.exercises.map(ex => ({ ...ex, sets: normalizeSets(ex).map(s => ({ ...s })) })),
    });
    setShowCreate(true);
  };

  const handleDeletePlan = async () => {
    if (!deletePlanModal) return;
    setDeleting(true);
    try {
      await deleteWorkoutPlan(deletePlanModal);
      toast('Plan deleted', 'error');
      setDeletePlanModal(null);
    } catch {
      toast('Failed to delete plan', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!addLinkModal) return;
    setSavingLink(true);
    try {
      await updateExercise(addLinkModal.exerciseId, { videoUrl: addLinkUrl });
      toast('Link saved');
      setAddLinkModal(null);
      setAddLinkUrl('');
    } catch {
      toast('Failed to save link', 'error');
    } finally {
      setSavingLink(false);
    }
  };

  const filteredExercises = exerciseLibrary.filter(e => {
    const q = exFilter.toLowerCase();
    const matchesText = !q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q);
    const matchesEquip = !exEquipFilter || e.equipment === exEquipFilter;
    return matchesText && matchesEquip;
  });

  return (
    <div>
      <div className="page-header plan-header">
        <div>
          <h1 className="page-title">Workout Plans</h1>
          <p className="page-subtitle">{plans.length} plans</p>
        </div>
        {isTrainer && <button className="btn btn-primary" onClick={() => { setEditPlanId(null); setForm({ name: '', clientId: '', day: '', exercises: [] }); setShowCustomForm(false); setCustomForm(EMPTY_CUSTOM); setShowCreate(true); }}><Plus size={18} /> Create Plan</button>}
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
            onClick: () => { setEditPlanId(null); setForm({ name: '', clientId: '', day: '', exercises: [] }); setShowCustomForm(false); setCustomForm(EMPTY_CUSTOM); setShowCreate(true); }
          } : undefined}
        />
      ) : (() => {
        if (!isTrainer) {
          // Client view: flat list, all expanded
          return plans.map(p => {
            const expanded = expandedPlans.has(p.id);
            return (
              <div key={p.id} className="card mb-16">
                <button className="plan-card-header plan-card-toggle" onClick={() => togglePlan(p.id)}>
                  <div className="plan-card-info">
                    <h3 className="card-title">{p.name}</h3>
                    <span className="text-sm text-muted">{p.exercises.length} exercise{p.exercises.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="plan-card-actions">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {expanded && p.exercises.map((ex, i) => {
                  const exData = getExercise(ex.exerciseId);
                  const url = (ex.videoUrl && isSafeUrl(ex.videoUrl)) ? ex.videoUrl
                             : (exData?.videoUrl && isSafeUrl(exData.videoUrl)) ? exData.videoUrl : null;
                  return (
                    <div key={i} className="plan-exercise">
                      <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
                      {ex.customMuscle && <span className="tag" style={{ fontSize: 11 }}>{ex.customMuscle}</span>}
                      <span className="plan-exercise-detail">{formatExDetail(ex)}</span>
                      {ex.notes && <span className="plan-exercise-detail" style={{ fontStyle: 'italic' }}>{ex.notes}</span>}
                      {url && (isYouTube(url)
                        ? <a href={url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Watch Demo" style={{ color: 'var(--danger)', marginLeft: 'auto' }}><Play size={14} /></a>
                        : <a href={url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open Link" style={{ color: 'var(--primary)', marginLeft: 'auto' }}><ExternalLink size={14} /></a>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          });
        }

        // Trainer view: group by client
        const grouped = clients.map(c => ({
          client: c,
          plans: plans.filter(p => p.clientId === c.id),
        })).filter(g => g.plans.length > 0);
        const unassigned = plans.filter(p => !clients.find(c => c.id === p.clientId));

        const renderPlanCard = (p) => {
          const expanded = expandedPlans.has(p.id);
          return (
            <div key={p.id} className="card mb-8">
              <button className="plan-card-header plan-card-toggle" onClick={() => togglePlan(p.id)}>
                <div className="plan-card-info">
                  <h3 className="card-title" style={{ fontSize: '0.95rem' }}>{p.name}</h3>
                  <span className="text-sm text-muted">{p.exercises.length} exercise{p.exercises.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="plan-card-actions">
                  <button className="btn-icon" title="Edit" onClick={e => { e.stopPropagation(); openEdit(p); }}><Pencil size={15} /></button>
                  <button className="btn-icon" title="Duplicate" onClick={e => { e.stopPropagation(); duplicatePlan(p); }}><Copy size={15} /></button>
                  <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setDeletePlanModal(p.id); }}><Trash2 size={15} /></button>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>
              {expanded && p.exercises.map((ex, i) => {
                const exData = getExercise(ex.exerciseId);
                const url = (ex.videoUrl && isSafeUrl(ex.videoUrl)) ? ex.videoUrl
                           : (exData?.videoUrl && isSafeUrl(exData.videoUrl)) ? exData.videoUrl : null;
                return (
                  <div key={i} className="plan-exercise">
                    <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
                    {ex.customMuscle && <span className="tag" style={{ fontSize: 11 }}>{ex.customMuscle}</span>}
                    <span className="plan-exercise-detail">{formatExDetail(ex)}</span>
                    {ex.notes && <span className="plan-exercise-detail" style={{ fontStyle: 'italic' }}>{ex.notes}</span>}
                    {url
                      ? isYouTube(url)
                        ? <a href={url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Watch Demo" style={{ color: 'var(--danger)', marginLeft: 'auto' }}><Play size={14} /></a>
                        : <a href={url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open Link" style={{ color: 'var(--primary)', marginLeft: 'auto' }}><ExternalLink size={14} /></a>
                      : exData
                        ? <button className="btn btn-sm btn-add-link" style={{ marginLeft: 'auto' }} onClick={() => { setAddLinkModal({ exerciseId: exData.id, name: exData.name }); setAddLinkUrl(''); }}><Link2 size={13} /> Add Link</button>
                        : null
                    }
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <>
            {grouped.map(({ client, plans: cPlans }) => (
              <div key={client.id} className="mb-24">
                <div className="plan-client-section-header">
                  <span className="plan-client-name">{client.name}</span>
                  <span className="tag">{cPlans.length} plan{cPlans.length !== 1 ? 's' : ''}</span>
                </div>
                {cPlans.map(renderPlanCard)}
              </div>
            ))}
            {unassigned.map(renderPlanCard)}
          </>
        );
      })()}

      {deletePlanModal && (
        <div className="modal-overlay" onClick={() => setDeletePlanModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete Plan</h3>
            <p className="text-sm text-muted mb-16">This will permanently delete this workout plan. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeletePlanModal(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeletePlan} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {addLinkModal && (
        <div className="modal-overlay" onClick={() => setAddLinkModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Demo Link</h3>
            <p className="text-sm text-muted mb-16">{addLinkModal.name}</p>
            <form onSubmit={handleSaveLink}>
              <div className="form-group">
                <label className="form-label">Video / Demo URL</label>
                <input
                  className="form-input"
                  autoFocus
                  value={addLinkUrl}
                  onChange={e => setAddLinkUrl(e.target.value)}
                  placeholder="YouTube, Instagram, article link…"
                />
                {addLinkUrl && isSafeUrl(addLinkUrl) && (
                  <a href={addLinkUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.8rem', marginTop: 6 }}>
                    {isYouTube(addLinkUrl) ? <Play size={12} /> : <ExternalLink size={12} />}
                    {isYouTube(addLinkUrl) ? 'Preview YouTube link' : 'Preview link'}
                  </a>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setAddLinkModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!addLinkUrl.trim() || savingLink}>
                  {savingLink ? 'Saving…' : 'Save Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditPlanId(null); }}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editPlanId ? 'Edit Workout Plan' : 'Create Workout Plan'}</h3>
            <form onSubmit={editPlanId ? handleUpdate : handleCreate}>
              <div className="form-group">
                <label className="form-label">Plan Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Upper Body A" />
              </div>
              {!editPlanId && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Client
                    {clients.length > 1 && (
                      <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        onClick={() => { setBulkAssign(v => !v); setBulkClientIds([]); setForm(f => ({ ...f, clientId: '' })); }}>
                        {bulkAssign ? 'Single' : 'Bulk Assign'}
                      </button>
                    )}
                  </label>
                  {bulkAssign ? (
                    <div className="bulk-client-checklist">
                      {clients.map(c => (
                        <label key={c.id} className="bulk-client-item">
                          <input type="checkbox" checked={bulkClientIds.includes(c.id)}
                            onChange={e => setBulkClientIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
                          {c.name}
                        </label>
                      ))}
                      {bulkClientIds.length > 0 && <span className="text-sm text-muted">{bulkClientIds.length} selected</span>}
                    </div>
                  ) : (
                    <select className="form-select" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              </div>
              )}

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
                        <GripVertical size={14} className="drag-handle desktop-only" />
                        <div className="reorder-btns">
                          <button type="button" className="btn-icon reorder-btn" onClick={() => reorderExercise(i, i - 1)} disabled={i === 0} title="Move up"><ArrowUp size={13} /></button>
                          <button type="button" className="btn-icon reorder-btn" onClick={() => reorderExercise(i, i + 1)} disabled={i === form.exercises.length - 1} title="Move down"><ArrowDown size={13} /></button>
                        </div>
                        <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
                        {ex.customMuscle && (
                          <span className="tag" style={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ex.customMuscle}>
                            {ex.customMuscle.split(',')[0].trim()}{ex.customMuscle.includes(',') ? '…' : ''}
                          </span>
                        )}
                        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{ex.sets.length} sets</span>
                        <button type="button" className="btn-icon" onClick={() => removeExercise(i)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                      </div>
                      <div className="log-unit-picker plan-unit-picker">
                        {UNIT_OPTIONS.filter(o => o.value !== 'weight_reps').map(opt => (
                          <button key={opt.value} type="button"
                            className={`log-unit-pill${(ex.unit === 'weight_reps' ? 'reps_only' : (ex.unit || 'reps_only')) === opt.value ? ' active' : ''}`}
                            onClick={() => changeExUnit(i, opt.value)}
                          >{opt.label}</button>
                        ))}
                      </div>
                      <div className="plan-sets-list">
                        {ex.sets.map((s, si) => (
                          <div key={si} className="plan-set-row">
                            <span className="plan-set-label">Set {si + 1}</span>
                            {(ex.unit || 'weight_reps') === 'weight_reps' && (<>
                              <input className="form-input log-set-input" value={s.reps || ''} onChange={e => updateSet(i, si, 'reps', e.target.value)} placeholder="10" title="Reps" />
                              <span className="text-xs text-muted">reps</span>
                            </>)}
                            {ex.unit === 'reps_only' && (<>
                              <input className="form-input log-set-input" value={s.reps || ''} onChange={e => updateSet(i, si, 'reps', e.target.value)} placeholder="10" title="Reps" />
                              <span className="text-xs text-muted">reps</span>
                            </>)}
                            {ex.unit === 'time' && (<>
                              <input className="form-input log-set-input" type="number" value={s.seconds || ''} onChange={e => updateSet(i, si, 'seconds', Number(e.target.value) || 0)} placeholder="30" title="Seconds" />
                              <span className="text-xs text-muted">sec</span>
                            </>)}
                            {ex.unit === 'distance' && (<>
                              <input className="form-input log-set-input" type="number" value={s.metres || ''} onChange={e => updateSet(i, si, 'metres', Number(e.target.value) || 0)} placeholder="100" title="Metres" />
                              <span className="text-xs text-muted">m</span>
                            </>)}
                            {ex.sets.length > 1 && (
                              <button type="button" className="btn-icon" onClick={() => removeSet(i, si)} title="Remove set"><Trash2 size={12} /></button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn btn-sm btn-outline plan-add-set-btn" onClick={() => addSet(i)}>
                          <Plus size={14} /> New Set
                        </button>
                      </div>
                      <input
                        className="form-input plan-ex-notes-input"
                        placeholder="Notes for this exercise (optional)"
                        value={ex.notes || ''}
                        onChange={e => setExNotes(i, e.target.value)}
                      />
                      <div className="plan-video-input-row">
                        <Link2 size={12} style={{ color: ex.videoUrl ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          className="form-input"
                          placeholder="Custom video URL (overrides library default)"
                          value={ex.videoUrl || ''}
                          onChange={e => updateExVideoUrl(i, e.target.value)}
                        />
                        {ex.videoUrl && isSafeUrl(ex.videoUrl) && (
                          <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Preview link">
                            {isYouTube(ex.videoUrl) ? <Play size={12} style={{ color: 'var(--danger)' }} /> : <ExternalLink size={12} style={{ color: 'var(--primary)' }} />}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Exercise search */}
              <div className="form-group">
                <label className="form-label">Add Exercises</label>
                <div className="plan-equip-filters">
                  <button type="button" className={`plan-equip-chip${!exEquipFilter ? ' active' : ''}`} onClick={() => setExEquipFilter('')}>All</button>
                  {equipmentTypes.map(eq => (
                    <button key={eq} type="button" className={`plan-equip-chip${exEquipFilter === eq ? ' active' : ''}`} onClick={() => setExEquipFilter(p => p === eq ? '' : eq)}>{eq}</button>
                  ))}
                </div>
                <input className="form-input" placeholder="Search exercises..." value={exFilter} onChange={e => updateExFilter(e.target.value)} />
                {(exFilter || exEquipFilter) && (
                  <div className="ex-search-results">
                    {filteredExercises.slice(0, 12).map(ex => (
                      <div key={ex.id} className="contact-item" onClick={() => { addExToForm(ex); updateExFilter(''); }}>
                        <span className="text-sm">{ex.name}</span>
                        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                          <span className="tag">{ex.equipment}</span>
                          <span className="tag tag-primary">{ex.muscle}</span>
                        </div>
                      </div>
                    ))}
                    {filteredExercises.length === 0 && (
                      <div className="plan-ex-no-results">No matches in library</div>
                    )}
                    <div
                      className="plan-ex-custom-add"
                      style={{ borderTop: filteredExercises.length > 0 ? '1px solid var(--border)' : 'none' }}
                      onClick={handleCreateCustomExercise}
                    >
                      <Plus size={14} />
                      <span>{`Add "${exFilter}" as new exercise…`}</span>
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

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ marginBottom: 8 }}>
                        Muscle Groups {customForm.saveToLibrary
                          ? <span className="text-muted" style={{ fontWeight: 400 }}>(at least 1 required to save to library)</span>
                          : <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span>}
                      </label>
                      <MuscleSelector
                        selected={customForm.muscles}
                        onChange={muscles => setCustomForm(p => ({ ...p, muscles }))}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={customForm.saveToLibrary}
                        onChange={e => setCustomForm(p => ({ ...p, saveToLibrary: e.target.checked }))}
                      />
                      Save to Exercise Library for future use
                    </label>

                    {customForm.saveToLibrary && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Equipment <span className="text-muted" style={{ fontWeight: 400 }}>(required to save to library)</span></label>
                        <select className="form-select" value={customForm.equipment} onChange={e => setCustomForm(p => ({ ...p, equipment: e.target.value }))}>
                          <option value="" disabled>Select equipment</option>
                          {equipmentTypes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={handleAddCustom}
                        disabled={!customForm.name.trim() || customSaving || (customForm.saveToLibrary && !exerciseFieldsValid({ muscle: customForm.muscles.join(', '), equipment: customForm.equipment }))}
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

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowCreate(false); setEditPlanId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editPlanId ? 'Save Changes' : 'Create Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
