import { useState, useMemo, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { sortExercisesByName, liveExercises, exerciseFieldsValid } from '../../utils/exerciseUtils';
import { findByExerciseName, findDuplicateExercise } from '../../utils/exerciseDuplicates';
import { matchesExerciseQuery } from '../../utils/exerciseSearch';
import { useLanguage } from '../../i18n/LanguageContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import MuscleSelector from '../MuscleSelector';

export default function ExerciseSwapModal({ exerciseLibrary, muscleGroups, currentId, currentName, onSwap, onClose, mode = 'swap' }) {
  const { t } = useLanguage();
  const { currentUser, addExercise, equipmentTypes } = useApp();
  const toast = useToast();
  // A coach's custom exercise is saved to their library, so it is there next time (Ani
  // 2026-10-10: "每次都要再整"). A client's stays a one-off on the log — saving it would
  // put it in their coach's library, which is the coach's to decide.
  const savesToLibrary = currentUser?.role === 'trainer';
  const [equipment, setEquipment] = useState('');
  const [muscles, setMuscles] = useState([]);
  const savingRef = useRef(false);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [tab, setTab] = useState('library'); // 'library' | 'custom'
  const [customName, setCustomName] = useState('');

  const filtered = sortExercisesByName(liveExercises(exerciseLibrary).filter(e => {
    if (!e || !e.name) return false;
    // Aliases, muscles and gym shorthand too (utils/exerciseSearch.js): a renamed starter
    // exercise ("Barbell Curl" is now "Bicep Curl (Barbell)") still turns up by its old name.
    const matchName = matchesExerciseQuery(e, search);
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

  // Saving: the same name on the SAME equipment is a duplicate (use that one); on other
  // equipment it is a new variant and may be created (utils/exerciseDuplicates.js).
  const sameEquipment = savesToLibrary && equipment
    ? findDuplicateExercise(exerciseLibrary, { name: customName, equipment })
    : null;
  const blocked = savesToLibrary ? !!sameEquipment : existingMatches.length > 0;
  const canAdd = !!customName.trim() && !blocked
    && (!savesToLibrary || exerciseFieldsValid({ muscle: muscles.join(', '), equipment }));

  const handleAddCustom = async () => {
    const name = customName.trim();
    if (!canAdd) return;
    if (!savesToLibrary) {
      onSwap({ id: `custom-${Date.now()}`, name, unit: 'weight_reps', custom: true });
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    const exercise = { id: `ex-${Date.now()}`, name, muscle: muscles.join(', '), equipment, description: '' };
    // The set goes on the log at once — a gym with no signal must not hold up the workout
    // while the library write waits for the server. The write is still awaited and a
    // failure said out loud; the log entry keeps its name either way.
    onSwap({ ...exercise, unit: 'weight_reps' });
    try {
      await addExercise(exercise);
      toast(t('exlib.toast_added'));
    } catch {
      toast(t('exlib.toast_save_failed'), 'error');
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal swap-exercise-modal" onClick={e => e.stopPropagation()}>
        <div className="swap-modal-header">
          <div>
            <h3 className="modal-title" style={{ marginBottom: 2 }}>{mode === 'add' ? t('swap.add_title') : t('swap.swap_title')}</h3>
            {mode === 'swap' && <p className="text-sm text-muted">{t('swap.replacing')} <strong>{currentName}</strong></p>}
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        {mode === 'add' && (
          <div className="swap-tab-row">
            <button className={`swap-tab${tab === 'library' ? ' active' : ''}`} onClick={() => setTab('library')}>{t('swap.tab_library')}</button>
            <button className={`swap-tab${tab === 'custom' ? ' active' : ''}`} onClick={() => setTab('custom')}>{t('swap.tab_custom')}</button>
          </div>
        )}

        {tab === 'custom' ? (
          <div className="swap-custom-body">
            <p className="text-sm text-muted mb-8">{savesToLibrary ? t('swap.custom_saves') : t('swap.custom_hint')}</p>
            <input
              className="form-input"
              placeholder={t('swap.ph_custom_name')}
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              autoFocus
              style={{ marginBottom: 12 }}
            />
            {savesToLibrary && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="swap-custom-equipment">{t('exlib.equipment')}</label>
                  <select id="swap-custom-equipment" className="form-select" value={equipment} onChange={e => setEquipment(e.target.value)}>
                    <option value="">{t('exlib.select_equipment')}</option>
                    {equipmentTypes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <span className="form-label">{t('exlib.muscle_groups')}</span>
                  <MuscleSelector selected={muscles} onChange={setMuscles} />
                </div>
              </>
            )}
            {existingMatches.length > 0 && (
              <div className="ex-dupe-warn" style={{ marginBottom: 12 }}>
                <span>
                  {existingMatches.length > 1
                    ? t('swap.dupe_variants', { count: existingMatches.length })
                    : t('swap.dupe_single')}
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
              disabled={!canAdd}
            >
              {t('swap.add_named', { name: customName.trim() || '…' })}
            </button>
          </div>
        ) : (
          <>
            <div className="swap-search-row">
              <div className="swap-search-wrap">
                <Search size={14} className="swap-search-icon" />
                <input
                  className="form-input swap-search-input"
                  placeholder={t('swap.ph_search')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <select className="form-input swap-muscle-select" value={muscle} onChange={e => setMuscle(e.target.value)}>
                <option value="">{t('swap.all_muscles')}</option>
                {muscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="swap-exercise-list">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted" style={{ padding: '16px', textAlign: 'center' }}>{t('swap.none_found')}</p>
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
