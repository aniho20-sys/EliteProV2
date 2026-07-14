import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, X, SearchX, Play, ChevronDown } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import MuscleSelector from '../components/MuscleSelector';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import { isSafeUrl, isYouTube, getYouTubeId } from '../utils/urlUtils';
import { titleCaseExerciseName, exerciseFieldsValid, sortExercisesByName } from '../utils/exerciseUtils';
import { movementPatterns } from '../data/exercises';

const EMPTY_FORM = { name: '', muscles: [], equipment: '', movementPattern: '', aliases: [], description: '', instructions: '', commonMistakes: '', videoUrl: '', unit: 'weight_reps' };

export default function ExerciseLibraryPage() {
  const { currentUser, getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes } = useApp();
  const parseMuscles = (str) => str ? str.split(', ').filter(Boolean) : [];
  const toast = useToast();
  const isTrainer = currentUser?.role === 'trainer';
  const exercises = getExercises();

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');
  const [patternFilter, setPatternFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [aliasInput, setAliasInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const [openFilter, setOpenFilter] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const nameInputRef = useRef(null);
  const pillOuterRef = useRef(null);

  // Positions the dropdown via measured coordinates (not CSS anchoring) because the pill
  // row scrolls horizontally — an absolutely-positioned child would otherwise get clipped
  // by that scroll container's implicit overflow-y.
  const handlePillClick = (key, e) => {
    if (openFilter === key) { setOpenFilter(null); return; }
    const btnRect = e.currentTarget.getBoundingClientRect();
    const outerRect = pillOuterRef.current.getBoundingClientRect();
    setDropdownPos({ left: btnRect.left - outerRect.left, top: btnRect.bottom - outerRect.top + 6 });
    setOpenFilter(key);
  };

  useEffect(() => {
    if (showModal && nameInputRef.current) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [showModal]);

  const filtered = sortExercisesByName(exercises.filter(e => {
    const q = search.toLowerCase();
    const matchesText = !q || e.name.toLowerCase().includes(q) || (e.aliases || []).some(a => a.toLowerCase().includes(q));
    if (!matchesText) return false;
    if (muscleFilter && !parseMuscles(e.muscle).includes(muscleFilter)) return false;
    if (equipFilter && e.equipment !== equipFilter) return false;
    if (patternFilter && e.movementPattern !== patternFilter) return false;
    return true;
  }));

  const openAdd = () => {
    setEditingEx(null);
    setForm({ ...EMPTY_FORM, equipment: equipmentTypes[0] });
    setAliasInput('');
    setShowModal(true);
  };

  const openEdit = (ex) => {
    setEditingEx(ex);
    setForm({
      name: ex.name,
      muscles: parseMuscles(ex.muscle),
      equipment: ex.equipment || '',
      movementPattern: ex.movementPattern || '',
      aliases: ex.aliases || [],
      description: ex.description || '',
      instructions: ex.instructions || '',
      commonMistakes: ex.commonMistakes || '',
      videoUrl: ex.videoUrl || '',
      unit: ex.unit || 'weight_reps',
    });
    setAliasInput('');
    setDetailExercise(null);
    setShowModal(true);
  };

  const handleDelete = async (ex) => {
    if (!window.confirm(`Delete "${ex.name}"? This cannot be undone.`)) return;
    try {
      await deleteExercise(ex.id);
      toast('Exercise deleted', 'info');
      setDetailExercise(null);
    } catch { toast('Failed to delete', 'error'); }
  };

  const addAlias = () => {
    const name = aliasInput.trim();
    if (!name || form.aliases.includes(name)) { setAliasInput(''); return; }
    setForm(f => ({ ...f, aliases: [...f.aliases, name] }));
    setAliasInput('');
  };

  const removeAlias = (name) => setForm(f => ({ ...f, aliases: f.aliases.filter(a => a !== name) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { muscles, ...rest } = form;
    const exData = { ...rest, name: titleCaseExerciseName(form.name), muscle: muscles.join(', ') };
    if (!exerciseFieldsValid(exData)) {
      toast('Pick at least one muscle group and an equipment type', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingEx) {
        await updateExercise(editingEx.id, exData);
        toast('Exercise updated');
      } else {
        await addExercise(exData);
        toast('Exercise added');
      }
      setShowModal(false);
    } catch { toast('Failed to save exercise', 'error'); } finally { setSaving(false); }
  };

  const filterGroups = [
    { key: 'muscle', label: 'Muscle', options: muscleGroups, value: muscleFilter, setValue: setMuscleFilter },
    { key: 'equipment', label: 'Equipment', options: equipmentTypes, value: equipFilter, setValue: setEquipFilter },
    { key: 'pattern', label: 'Movement', options: movementPatterns, value: patternFilter, setValue: setPatternFilter },
  ];

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
      </div>

      <div className="ex-filter-pill-outer" ref={pillOuterRef}>
        <div className="ex-filter-pill-scroll">
          {filterGroups.map(g => (
            <button
              key={g.key}
              type="button"
              className={`ex-filter-pill${g.value ? ' active' : ''}`}
              onClick={e => handlePillClick(g.key, e)}
            >
              {g.value ? `${g.label}: ${g.value}` : g.label}
              {g.value ? (
                <X size={12} className="ex-filter-pill-clear" onClick={e => { e.stopPropagation(); g.setValue(''); setOpenFilter(null); }} />
              ) : (
                <ChevronDown size={12} />
              )}
            </button>
          ))}
        </div>
        {openFilter && dropdownPos && (
          <div className="ex-filter-pill-dropdown" style={{ left: dropdownPos.left, top: dropdownPos.top }} onClick={e => e.stopPropagation()}>
            {filterGroups.find(g => g.key === openFilter).options.map(o => {
              const g = filterGroups.find(f => f.key === openFilter);
              return (
                <button
                  key={o}
                  type="button"
                  className={`plan-equip-chip${g.value === o ? ' active' : ''}`}
                  onClick={() => { g.setValue(v => v === o ? '' : o); setOpenFilter(null); }}
                >{o}</button>
              );
            })}
          </div>
        )}
      </div>
      {openFilter && <div className="ex-filter-pill-backdrop" onClick={() => setOpenFilter(null)} />}

      <div className="exercise-list">
        {filtered.map(ex => {
          const hasVideo = isSafeUrl(ex.videoUrl);
          const muscles = parseMuscles(ex.muscle);
          const metaParts = [];
          if (muscles.length) metaParts.push(muscles.length > 1 ? `${muscles[0]} +${muscles.length - 1}` : muscles[0]);
          if (ex.equipment) metaParts.push(ex.equipment);
          if (ex.movementPattern) metaParts.push(ex.movementPattern);
          return (
            <div key={ex.id} className="exercise-row" onClick={() => setDetailExercise(ex)}>
              <div className="exercise-row-text">
                <span className="exercise-row-name">{ex.name}</span>
                {metaParts.length > 0 && <span className="exercise-row-meta">{metaParts.join(' · ')}</span>}
              </div>
              {hasVideo && <Play size={14} className="exercise-row-video-icon" fill="currentColor" aria-label="Has demo video" />}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16">
          <EmptyState
            icon={SearchX}
            title="No exercises found"
            description="Try clearing filters or use a different search term."
            action={{
              label: 'Clear Filters',
              onClick: () => { setSearch(''); setMuscleFilter(''); setEquipFilter(''); setPatternFilter(''); },
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
                <input ref={nameInputRef} className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bulgarian Split Squat" />
              </div>
              <div className="form-group">
                <label className="form-label">Muscle Groups <span className="text-muted" style={{ fontWeight: 400 }}>(at least 1 required)</span></label>
                <MuscleSelector
                  selected={form.muscles}
                  onChange={muscles => setForm({ ...form, muscles })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Equipment</label>
                <select className="form-select" required value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })}>
                  <option value="" disabled>Select equipment</option>
                  {equipmentTypes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Movement Pattern <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <select className="form-select" value={form.movementPattern} onChange={e => setForm({ ...form, movementPattern: e.target.value })}>
                  <option value="">Unclassified</option>
                  {movementPatterns.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Aliases <span className="text-muted" style={{ fontWeight: 400 }}>(alt. names / Chinese name, optional)</span></label>
                <div className="muscle-chips mb-8">
                  {form.aliases.map(a => (
                    <button key={a} type="button" className="muscle-chip active" onClick={() => removeAlias(a)} title="Click to remove">{a} ×</button>
                  ))}
                </div>
                <div className="muscle-chip-add">
                  <input
                    className="form-input"
                    style={{ flex: 1, padding: '5px 10px', fontSize: '0.875rem' }}
                    value={aliasInput}
                    onChange={e => setAliasInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
                    placeholder="e.g. 深蹲, RDL…"
                  />
                  <button type="button" className="btn btn-outline btn-sm" onClick={addAlias} disabled={!aliasInput.trim()}>+ Add</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unit Type</label>
                <div className="log-unit-picker">
                  {[
                    { value: 'weight_reps', label: 'Weight + Reps' },
                    { value: 'reps_only', label: 'Reps Only' },
                    { value: 'time', label: 'Time (s)' },
                    { value: 'distance', label: 'Distance (m)' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      className={`log-unit-pill${form.unit === opt.value ? ' active' : ''}`}
                      onClick={() => setForm({ ...form, unit: opt.value })}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Video / Demo URL</label>
                <input
                  className="form-input"
                  value={form.videoUrl}
                  onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="Paste a YouTube link…"
                />
                {form.videoUrl && isYouTube(form.videoUrl) && getYouTubeId(form.videoUrl) ? (
                  <div className="ex-form-video-preview">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(form.videoUrl)}`}
                      title="Video preview"
                      allow="encrypted-media"
                    />
                    <span className="text-sm text-muted">Will play in-app for students — no YouTube redirect</span>
                  </div>
                ) : form.videoUrl && isSafeUrl(form.videoUrl) ? (
                  <p className="text-sm text-muted mt-8">Not a YouTube link — will open in a new tab for students instead of playing in-app.</p>
                ) : null}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="General description..." />
              </div>
              <div className="form-group">
                <label className="form-label">動作要點 <span className="text-muted" style={{ fontWeight: 400 }}>(form cues, optional)</span></label>
                <textarea className="form-textarea" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="Key coaching points for this exercise..." />
              </div>
              <div className="form-group">
                <label className="form-label">常見錯誤 <span className="text-muted" style={{ fontWeight: 400 }}>(common mistakes, optional)</span></label>
                <textarea className="form-textarea" value={form.commonMistakes} onChange={e => setForm({ ...form, commonMistakes: e.target.value })} placeholder="Common mistakes to watch for..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingEx ? 'Save Changes' : 'Add Exercise'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
          onEdit={isTrainer ? openEdit : undefined}
          onDelete={isTrainer ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
