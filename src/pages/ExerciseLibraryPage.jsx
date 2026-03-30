import { useState } from 'react';
import { exerciseLibrary, muscleGroups, equipmentTypes } from '../data/exercises';
import { Search } from 'lucide-react';

export default function ExerciseLibraryPage() {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');

  const filtered = exerciseLibrary.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter && e.muscle !== muscleFilter) return false;
    if (equipFilter && e.equipment !== equipFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Exercise Library</h1>
        <p className="page-subtitle">{exerciseLibrary.length} exercises available</p>
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
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state mt-16">
          <p className="empty-state-text">No exercises found matching your filters</p>
        </div>
      )}
    </div>
  );
}
