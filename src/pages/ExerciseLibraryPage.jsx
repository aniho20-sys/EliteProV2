import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Play, Plus, Trash2, Pencil, X, ExternalLink } from 'lucide-react';
import { useToast } from '../context/ToastContext';

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

  const filtered = exercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter && e.muscle !== muscleFilter) return false;
    if (equipFilter && e.equipment !== equipFilter) return false;
    return true;
  });

  const openAdd = () => {
    setEditingEx(null);
    setForm({ name: '', muscle: muscleGroups[0], equipment: equipmentTypes[0], description: '', videoUrl: '' });
    setShowModal(true);
  };

  const openEdit = (ex) => {
    setEditingEx(ex);
    setForm({ name: ex.name, muscle: ex.muscle, equipment: ex.equipment, description: ex.description, videoUrl: ex.videoUrl || '' });
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
                <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-video">
                  <Play size={14} /> Watch Demo
                </a>
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
        <div className="card empty-state mt-16">
          <p className="empty-state-text">No exercises found matching your filters</p>
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
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="How to perform this exercise..." />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span className="flex gap-8" style={{ alignItems: 'center' }}>
                    YouTube Video URL
                    <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                  </span>
                </label>
                <input className="form-input" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                {form.videoUrl && (
                  <a href={form.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--primary)', marginTop: 4, display: 'inline-block' }}>
                    Preview link
                  </a>
                )}
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
