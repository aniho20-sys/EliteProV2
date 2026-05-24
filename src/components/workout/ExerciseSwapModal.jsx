import { useState } from 'react';
import { X, Search } from 'lucide-react';

export default function ExerciseSwapModal({ exerciseLibrary, muscleGroups, currentId, currentName, onSwap, onClose, mode = 'swap' }) {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');

  const filtered = exerciseLibrary.filter(e => {
    if (!e || !e.name) return false;
    const matchName = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !muscle || e.muscle === muscle || (Array.isArray(e.muscles) && e.muscles.includes(muscle));
    return matchName && matchMuscle;
  }).slice(0, 60);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal swap-exercise-modal" onClick={e => e.stopPropagation()}>
        <div className="swap-modal-header">
          <div>
            <h3 className="modal-title" style={{ marginBottom: 2 }}>{mode === 'add' ? 'Add Exercise' : 'Swap Exercise'}</h3>
            {mode === 'swap' && <p className="text-sm text-muted">Replacing: <strong>{currentName}</strong></p>}
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="swap-search-row">
          <div className="swap-search-wrap">
            <Search size={14} className="swap-search-icon" />
            <input
              className="form-input swap-search-input"
              placeholder="Search exercises…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <select className="form-input swap-muscle-select" value={muscle} onChange={e => setMuscle(e.target.value)}>
            <option value="">All muscles</option>
            {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="swap-exercise-list">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted" style={{ padding: '16px', textAlign: 'center' }}>No exercises found</p>
          ) : filtered.map(ex => (
            <button
              key={ex.id}
              className={`swap-exercise-item${ex.id === currentId ? ' current' : ''}`}
              onClick={() => ex.id !== currentId && onSwap(ex)}
              disabled={ex.id === currentId}
            >
              <div className="swap-ex-name">{ex.name}</div>
              <div className="swap-ex-meta">{ex.muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
