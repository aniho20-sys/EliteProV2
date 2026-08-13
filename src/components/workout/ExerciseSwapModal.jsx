import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { sortExercisesByName } from '../../utils/exerciseUtils';
import { findByExerciseName } from '../../utils/exerciseDuplicates';

export default function ExerciseSwapModal({ exerciseLibrary, muscleGroups, currentId, currentName, onSwap, onClose, mode = 'swap' }) {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [tab, setTab] = useState('library'); // 'library' | 'custom'
  const [customName, setCustomName] = useState('');

  const filtered = sortExercisesByName(exerciseLibrary.filter(e => {
    if (!e || !e.name) return false;
    const matchName = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !muscle || e.muscle === muscle || (Array.isArray(e.muscles) && e.muscles.includes(muscle));
    return matchName && matchMuscle;
  })).slice(0, 60);

  // This tab has no equipment field — it creates an ad-hoc entry, not a library record —
  // so the check here is name-only. Every live library exercise answering to that name is
  // offered instead, across all its equipment variants, so the trainer picks the real one
  // rather than typing a loose duplicate of something they already own.
  const existingMatches = useMemo(
    () => findByExerciseName(exerciseLibrary, customName),
    [exerciseLibrary, customName],
  );

  const handleAddCustom = () => {
    const name = customName.trim();
    if (!name || existingMatches.length > 0) return;
    onSwap({ id: `custom-${Date.now()}`, name, unit: 'weight_reps', custom: true });
  };

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

        {mode === 'add' && (
          <div className="swap-tab-row">
            <button className={`swap-tab${tab === 'library' ? ' active' : ''}`} onClick={() => setTab('library')}>Library</button>
            <button className={`swap-tab${tab === 'custom' ? ' active' : ''}`} onClick={() => setTab('custom')}>Custom</button>
          </div>
        )}

        {tab === 'custom' ? (
          <div style={{ padding: '16px' }}>
            <p className="text-sm text-muted mb-8">Enter any exercise name — useful for movements not in the library.</p>
            <input
              className="form-input"
              placeholder="e.g. Sled Push, Band Pull-Apart…"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              autoFocus
              style={{ marginBottom: 12 }}
            />
            {existingMatches.length > 0 && (
              <div className="ex-dupe-warn" style={{ marginBottom: 12 }}>
                <span>
                  This exercise already exists{existingMatches.length > 1 ? ` in ${existingMatches.length} variants` : ''} — use it instead of creating a copy:
                </span>
                <div className="ex-dupe-matches">
                  {existingMatches.map(ex => (
                    <button key={ex.id} type="button" className="ex-dupe-match" onClick={() => onSwap(ex)}>
                      {ex.name}{ex.equipment ? ` · ${ex.equipment}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              className="btn btn-accent"
              style={{ width: '100%' }}
              onClick={handleAddCustom}
              disabled={!customName.trim() || existingMatches.length > 0}
            >
              Add "{customName.trim() || '…'}"
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
