import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Play, Plus, Trash2, Pencil, X, ExternalLink, SearchX, Link2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';

export default function ExerciseLibraryPage() {
  const { currentUser, getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes } = useApp();
  const toast = useToast();
  const isTrainer = currentUser?.role === 'trainer';
  const exercises = getExercises();

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [form, setForm] = useState({ name: '', muscle: '', equipment: '', description: '', videoUrl: '' });
  const [focusUrl, setFocusUrl] = useState(false);
  const urlInputRef = useRef(null);

  const isYouTube = (url) => /youtu\.?be/i.test(url);

  useEffect(() => {
    if (showModal && focusUrl && urlInputRef.current) {
      // Small delay to let modal animation finish before focusing
      const t = setTimeout(() => { urlInputRef.current?.focus(); }, 150);
      return () => clearTimeout(t);
    }
  }, [showModal, focusUrl]);

  const filtered = exercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter && e.muscle !== muscleFilter) return false;
    if (equipFilter && e.equipment !== equipFilter) return false;
    return true;
  });

  const openAdd = () => {
    setFocusUrl(false);
    setEditingEx(null);
    setForm({ name: '', muscle: muscleGroups[0], equipment: equipmentTypes[0], description: '', videoUrl: '' });
    setShowModal(true);
  };

  const openEdit = (ex) => {
    setFocusUrl(false);
    setEditingEx(ex);
    setForm({ name: ex.name, muscle: ex.muscle, equipment: ex.equipment, description: ex.description, videoUrl: ex.videoUrl || '' });
    setShowModal(true);
  };

  // Opens edit modal with URL field auto-focused
  const openEditAtUrl = (ex) => {
    setEditingEx(ex);
    setForm({ name: ex.name, muscle: ex.muscle, equipment: ex.equipment, description: ex.description, videoUrl: ex.videoUrl || '' });
    setFocusUrl(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEx) {
        await updateExercise(editingEx.id, form);
        toast('Exercise updated');
      } else {
        await addExercise(form);
        toast('Exercise added');
      }
      setShowModal(false);
    } catch { toast('Failed to save exercise', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExercise(id);
      toast('Exercise deleted', 'error');
    } catch { toast('Failed to delete', 'error'); }
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Exercise Library</h1>
          <p className="page-subtitle">{exercises.length} exercises available</p>
        </div>
        {isTrainer && (
          <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Exercise</button>
        )}
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={muscleFilter} onChange={e => setMuscleFilter(e.target.value)}>
          <option value="">All Muscles</option>
          {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="form-select" value={equipFilter} onChange={e => setEquipFilter(e.target.value)}>
          <option value="">All Equipment</option>
          {equipmentTypes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>

      <div className="grid-3">
        {filtered.map(ex => (
          <div key={ex.id} className="card exercise-card">
            <div className="exercise-name">{ex.name}</div>
            <div className="exercise-meta">
              <span className="tag tag-primary">{ex.muscle}</span>
              <span className="tag tag-accent">{ex.equipment}</span>
            </div>
            <div className="exercise-desc">{ex.description}</div>
            <div className="exercise-actions mt-8">
              {ex.videoUrl && (
                isYouTube(ex.videoUrl) ? (
                  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-video">
                    <Play size={14} /> Watch Demo
                  </a>
                ) : (
                  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-link-ref">
                    <ExternalLink size={14} /> Open Link
                  </a>
                )
              )}
              {isTrainer && !ex.videoUrl && (
                <button className="btn btn-sm btn-add-link" onClick={() => openEditAtUrl(ex)}>
                  <Link2 size={13} /> Add Link
                </button>
              )}
              {isTrainer && (
                <div className="exercise-trainer-actions">
                  <button className="btn-icon" title="Edit" onClick={() => openEdit(ex)}><Pencil size={15} /></button>
                  <button className="btn-icon" title="Delete" onClick={() => handleDelete(ex.id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16">
          <EmptyState
            icon={SearchX}
            title="No exercises found"
            description="Try clearing filters or use a different search term."
            action={{
              label: 'Clear Filters',
              onClick: () => { setSearch(''); setMuscleFilter(''); setEquipFilter(''); },
            }}
          />
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-16">
              <h3 className="modal-title" style={{ marginBottom: 0 }}>{editingEx ? 'Edit Exercise' : 'Add Exercise'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Exercise Name</label>
                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bulgarian Split Squat" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Muscle Group</label>
                  <select className="form-select" value={form.muscle} onChange={e => setForm({ ...form, muscle: e.target.value })}>
                    {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Equipment</label>
                  <select className="form-select" value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })}>
                    {equipmentTypes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Video / Demo URL <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                  </span>
                </label>
                <input
                  ref={urlInputRef}
                  className="form-input"
                  value={form.videoUrl}
                  onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="YouTube, Instagram, article link…"
                />
                {form.videoUrl && (
                  <a href={form.videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.8rem', marginTop: 6 }}>
                    {isYouTube(form.videoUrl) ? <Play size={12} /> : <ExternalLink size={12} />}
                    {isYouTube(form.videoUrl) ? 'Preview YouTube link' : 'Preview link'}
                  </a>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="How to perform this exercise..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingEx ? 'Save Changes' : 'Add Exercise'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
