import { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, X, SearchX, Play, ChevronDown } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import MuscleSelector from '../components/MuscleSelector';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import { isSafeUrl, isYouTube, getYouTubeId } from '../utils/urlUtils';
import { titleCaseExerciseName, exerciseFieldsValid, sortExercisesByName, liveExercises, inferMovementPattern } from '../utils/exerciseUtils';
import { findDuplicateExercise, findFamilyVariants } from '../utils/exerciseDuplicates';
import { movementPatterns, exerciseLibrary as seedExercises } from '../data/exercises';
import { useLanguage } from '../i18n/LanguageContext';

const EMPTY_FORM = { name: '', muscles: [], equipment: '', movementPattern: '', aliases: [], description: '', instructions: '', commonMistakes: '', videoUrl: '', unit: 'weight_reps' };
const EMPTY_CUSTOMIZE = { videoMode: 'default', videoUrl: '', instructionsMode: 'default', instructions: '' };
// Functions of t, because t() only accepts a literal key (#39) and this is module-level.
const MODE_LABELS = {
  default: (t) => t('exlib.mode_default'),
  custom: (t) => t('exlib.mode_custom'),
  hidden: (t) => t('exlib.mode_hidden'),
};

export default function ExerciseLibraryPage() {
  const { t } = useLanguage();
  const {
    currentUser, getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes,
    getExerciseOverride, upsertExerciseOverride, deleteExerciseOverride,
  } = useApp();
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
  const [showCustomize, setShowCustomize] = useState(false);
  const [customizingEx, setCustomizingEx] = useState(null);
  const [customizeForm, setCustomizeForm] = useState(EMPTY_CUSTOMIZE);
  const [customizeSaving, setCustomizeSaving] = useState(false);
  const [mergingEx, setMergingEx] = useState(null);
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeSaving, setMergeSaving] = useState(false);
  const [patternTouched, setPatternTouched] = useState(false);
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

  const filtered = sortExercisesByName(liveExercises(exercises).filter(e => {
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
    setPatternTouched(false);
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
    // An exercise that already carries a pattern keeps it; one that never got classified
    // is still open to a suggestion while the name is being edited.
    setPatternTouched(!!ex.movementPattern);
    setAliasInput('');
    setDetailExercise(null);
    setShowModal(true);
  };

  const handleDelete = async (ex) => {
    if (!window.confirm(t('exlib.confirm_delete', { name: ex.name }))) return;
    try {
      await deleteExercise(ex.id);
      toast(t('exlib.toast_deleted'), 'info');
      setDetailExercise(null);
    } catch { toast(t('exlib.toast_delete_failed'), 'error'); }
  };

  // Seed exercises (no trainerId — see CLAUDE.md) have no doc of their own to edit, so
  // trainers layer personal video/instructions on top via an exerciseOverrides doc instead.
  const openCustomize = (ex) => {
    const ov = getExerciseOverride(ex.id);
    setCustomizingEx(ex);
    setCustomizeForm({
      videoMode: ov?.videoMode || 'default',
      videoUrl: ov?.videoUrl || '',
      instructionsMode: ov?.instructionsMode || 'default',
      instructions: ov?.instructions || '',
    });
    setDetailExercise(null);
    setShowCustomize(true);
  };

  const handleCustomizeSubmit = async (e) => {
    e.preventDefault();
    setCustomizeSaving(true);
    try {
      const allDefault = customizeForm.videoMode === 'default' && customizeForm.instructionsMode === 'default';
      if (allDefault) {
        await deleteExerciseOverride(customizingEx.id);
      } else {
        await upsertExerciseOverride(customizingEx.id, customizeForm);
      }
      toast(t('exlib.toast_custom_saved'));
      setShowCustomize(false);
    } catch { toast(t('exlib.toast_custom_failed'), 'error'); } finally { setCustomizeSaving(false); }
  };

  const handleResetCustomize = async () => {
    setCustomizeSaving(true);
    try {
      await deleteExerciseOverride(customizingEx.id);
      toast(t('exlib.toast_reset'));
      setShowCustomize(false);
    } catch { toast(t('exlib.toast_reset_failed'), 'error'); } finally { setCustomizeSaving(false); }
  };

  // Soft-merge (CLAUDE.md #27): the losing exercise keeps its document and gains a
  // mergedInto pointer. Historical workoutPlans/workoutLogs keep their original
  // exerciseId and resolve through that pointer at read time — nothing is rewritten,
  // so the operation stays reversible by clearing the field.
  const openMerge = (ex) => {
    setMergingEx(ex);
    setMergeSearch('');
    setDetailExercise(null);
  };

  // Candidate survivors: every live exercise except the one being merged. Seed exercises
  // are included — they have no document of their own, but they DO live in the same
  // merged array canonicalExercise() searches, so a pointer at a seed id resolves fine
  // (covered by src/utils/exerciseUtils.test.js).
  const mergeCandidates = useMemo(() => {
    if (!mergingEx) return [];
    const q = mergeSearch.trim().toLowerCase();
    return sortExercisesByName(
      liveExercises(exercises).filter(e => e.id !== mergingEx.id && (!q || e.name.toLowerCase().includes(q))),
    ).slice(0, 40);
  }, [exercises, mergingEx, mergeSearch]);

  const handleMerge = async (survivor) => {
    if (!window.confirm(t('exlib.confirm_merge', { from: mergingEx.name, to: survivor.name }))) return;
    setMergeSaving(true);
    try {
      await updateExercise(mergingEx.id, { mergedInto: survivor.id });
      toast(t('exlib.toast_merged', { from: mergingEx.name, to: survivor.name }));
      setMergingEx(null);
    } catch { toast(t('exlib.toast_merge_failed'), 'error'); } finally { setMergeSaving(false); }
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
      toast(t('exlib.toast_need_muscle_equip'), 'error');
      return;
    }

    // Same movement + same equipment already exists — refuse and take them to it.
    // A matching name on DIFFERENT equipment is a legitimate variant and passes through
    // (Shoulder Press Barbell and Shoulder Press Dumbbell both belong in the library).
    const clash = findDuplicateExercise(exercises, exData, editingEx?.id);
    if (clash) {
      setShowModal(false);
      setDetailExercise(clash);
      toast(t('exlib.toast_clash', { name: clash.name, equipment: clash.equipment }), 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingEx) {
        await updateExercise(editingEx.id, exData);
        toast(t('exlib.toast_updated'));
      } else {
        await addExercise(exData);
        toast(t('exlib.toast_added'));
      }
      setShowModal(false);
    } catch { toast(t('exlib.toast_save_failed'), 'error'); } finally { setSaving(false); }
  };

  // Same movement on other equipment — shown inline as a hint while typing, not a block.
  const familyVariants = useMemo(
    () => (form.name.trim() && form.equipment
      ? findFamilyVariants(exercises, { name: form.name, equipment: form.equipment }, editingEx?.id)
      : []),
    [exercises, form.name, form.equipment, editingEx],
  );

  const liveDuplicate = useMemo(
    () => (form.name.trim() && form.equipment
      ? findDuplicateExercise(exercises, { name: form.name, equipment: form.equipment, aliases: form.aliases }, editingEx?.id)
      : null),
    [exercises, form.name, form.equipment, form.aliases, editingEx],
  );

  const filterGroups = [
    { key: 'muscle', label: t('exlib.filter_muscle'), options: muscleGroups, value: muscleFilter, setValue: setMuscleFilter },
    { key: 'equipment', label: t('exlib.equipment'), options: equipmentTypes, value: equipFilter, setValue: setEquipFilter },
    { key: 'pattern', label: t('exlib.filter_movement'), options: movementPatterns, value: patternFilter, setValue: setPatternFilter },
  ];

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">{t('exlib.title')}</h1>
          <p className="page-subtitle">{t('exlib.n_available', { count: exercises.length })}</p>
        </div>
        {isTrainer && (
          <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> {t('exlib.add_exercise')}</button>
        )}
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder={t('plans.ph_search_ex')} value={search} onChange={e => setSearch(e.target.value)} />
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
                <span
                  className="ex-filter-pill-clear"
                  role="button"
                  tabIndex={-1}
                  aria-label={t('exlib.clear_filter', { label: g.label })}
                  onClick={e => { e.stopPropagation(); g.setValue(''); setOpenFilter(null); }}
                >
                  <X size={12} />
                </span>
              ) : (
                <ChevronDown size={12} />
              )}
            </button>
          ))}
        </div>
        {openFilter && <div className="ex-filter-pill-backdrop" onClick={() => setOpenFilter(null)} />}
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
              {hasVideo && <Play size={14} className="exercise-row-video-icon" fill="currentColor" aria-label={t('exlib.has_video')} />}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16">
          <EmptyState
            icon={SearchX}
            title={t('exlib.none_found')}
            description={t('exlib.none_found_desc')}
            action={{
              label: t('exlib.clear_filters'),
              onClick: () => { setSearch(''); setMuscleFilter(''); setEquipFilter(''); setPatternFilter(''); },
            }}
          />
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-16">
              <h3 className="modal-title" style={{ marginBottom: 0 }}>{editingEx ? t('exlib.edit_exercise') : t('exlib.add_exercise')}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('exlib.name')}</label>
                <input
                  ref={nameInputRef}
                  className="form-input"
                  required
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value;
                    setForm(f => ({
                      ...f,
                      name,
                      // Keep suggesting from the name until the trainer picks a pattern by
                      // hand — from then on their choice stands, even if they keep typing.
                      movementPattern: patternTouched ? f.movementPattern : inferMovementPattern(name),
                    }));
                  }}
                  placeholder={t('exlib.ph_name')}
                />
                {liveDuplicate && (
                  <div className="ex-dupe-warn">
                    <span>{t('exlib.dupe_exists', { equipment: liveDuplicate.equipment })}</span>
                    <button type="button" className="ex-dupe-link" onClick={() => { setShowModal(false); setDetailExercise(liveDuplicate); }}>
                      {t('exlib.go_to_it')}
                    </button>
                  </div>
                )}
                {!liveDuplicate && familyVariants.length > 0 && (
                  <p className="ex-dupe-hint">
                    {t('exlib.variant_hint', {
                      existing: familyVariants.map(v => v.equipment).join(', '),
                      equipment: form.equipment,
                    })}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.muscle_groups')} <span className="text-muted" style={{ fontWeight: 400 }}>{t('exlib.at_least')}</span></label>
                <MuscleSelector
                  selected={form.muscles}
                  onChange={muscles => setForm({ ...form, muscles })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.equipment')}</label>
                <select className="form-select" required value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })}>
                  <option value="" disabled>{t('exlib.select_equipment')}</option>
                  {equipmentTypes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.movement_pattern')} <span className="text-muted" style={{ fontWeight: 400 }}>{t('common.optional')}</span></label>
                <select
                  className="form-select"
                  value={form.movementPattern}
                  onChange={e => { setPatternTouched(true); setForm({ ...form, movementPattern: e.target.value }); }}
                >
                  <option value="">{t('exlib.unclassified')}</option>
                  {movementPatterns.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {!patternTouched && form.movementPattern && (
                  <p className="ex-dupe-hint">{t('exlib.pattern_suggested')}</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.aliases')} <span className="text-muted" style={{ fontWeight: 400 }}>{t('exlib.aliases_hint')}</span></label>
                <div className="muscle-chips mb-8">
                  {form.aliases.map(a => (
                    <button key={a} type="button" className="muscle-chip active" onClick={() => removeAlias(a)} title={t('exlib.click_remove')}>{a} ×</button>
                  ))}
                </div>
                <div className="muscle-chip-add">
                  <input
                    className="form-input"
                    style={{ flex: 1, padding: '5px 10px', fontSize: '0.875rem' }}
                    value={aliasInput}
                    onChange={e => setAliasInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
                    placeholder={t('exlib.ph_alias')}
                  />
                  <button type="button" className="btn btn-outline btn-sm" onClick={addAlias} disabled={!aliasInput.trim()}>{t('exlib.add_alias')}</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.unit_type')}</label>
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
                <label className="form-label">{t('exlib.video_url')}</label>
                <input
                  className="form-input"
                  value={form.videoUrl}
                  onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder={t('exlib.ph_video')}
                />
                {form.videoUrl && isYouTube(form.videoUrl) && getYouTubeId(form.videoUrl) ? (
                  <div className="ex-form-video-preview">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(form.videoUrl)}`}
                      title={t('exlib.video_preview')}
                      allow="encrypted-media"
                    />
                    <span className="text-sm text-muted">{t('exlib.video_inapp')}</span>
                  </div>
                ) : form.videoUrl && isSafeUrl(form.videoUrl) ? (
                  <p className="text-sm text-muted mt-8">{t('exlib.video_external')}</p>
                ) : null}
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.description')}</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('exlib.ph_description')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.cues')} <span className="text-muted" style={{ fontWeight: 400 }}>{t('common.optional')}</span></label>
                <textarea className="form-textarea" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder={t('exlib.ph_cues')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('exlib.mistakes')} <span className="text-muted" style={{ fontWeight: 400 }}>{t('common.optional')}</span></label>
                <textarea className="form-textarea" value={form.commonMistakes} onChange={e => setForm({ ...form, commonMistakes: e.target.value })} placeholder={t('exlib.ph_mistakes')} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : editingEx ? t('progress.save_changes') : t('exlib.add_exercise')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mergingEx && (
        <div className="modal-overlay" onClick={() => setMergingEx(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-16">
              <h3 className="modal-title" style={{ marginBottom: 0 }}>{t('exlib.merge_title', { name: mergingEx.name })}</h3>
              <button className="btn-icon" onClick={() => setMergingEx(null)}><X size={18} /></button>
            </div>
            <p className="text-sm text-muted mb-16">
              {t('exlib.merge_desc', { name: mergingEx.name })}
            </p>
            <input
              className="form-input mb-16"
              placeholder={t('swap.ph_search')}
              value={mergeSearch}
              onChange={e => setMergeSearch(e.target.value)}
              autoFocus
            />
            <div className="merge-candidate-list">
              {mergeCandidates.length === 0 ? (
                <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 16 }}>{t('exlib.none_found')}</p>
              ) : mergeCandidates.map(ex => (
                <button
                  key={ex.id}
                  className="merge-candidate"
                  onClick={() => handleMerge(ex)}
                  disabled={mergeSaving}
                >
                  <span className="merge-candidate-name">{ex.name}</span>
                  <span className="merge-candidate-meta">{ex.equipment}{ex.trainerId ? '' : t('exlib.default_suffix')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
          onEdit={isTrainer ? (ex => ex.trainerId ? openEdit(ex) : openCustomize(ex)) : undefined}
          onDelete={isTrainer && detailExercise.trainerId ? handleDelete : undefined}
          onMerge={isTrainer && detailExercise.trainerId ? openMerge : undefined}
        />
      )}

      {showCustomize && customizingEx && (() => {
        const seedVideoUrl = seedExercises.find(s => s.id === customizingEx.id)?.videoUrl;
        return (
          <div className="modal-overlay" onClick={() => setShowCustomize(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="flex-between mb-8">
                <h3 className="modal-title" style={{ marginBottom: 0 }}>{t('exlib.customize')} {customizingEx.name}</h3>
                <button className="btn-icon" onClick={() => setShowCustomize(false)}><X size={18} /></button>
              </div>
              <p className="ex-customize-notice">{t('exlib.customize_notice')}</p>
              <form onSubmit={handleCustomizeSubmit}>
                <div className="form-group">
                  <label className="form-label">{t('exlib.video_url')}</label>
                  <div className="ex-mode-toggle">
                    {['default', 'custom', 'hidden'].map(m => (
                      <button key={m} type="button"
                        className={`ex-mode-pill${customizeForm.videoMode === m ? ' active' : ''}`}
                        onClick={() => setCustomizeForm(f => ({ ...f, videoMode: m }))}
                      >{MODE_LABELS[m](t)}</button>
                    ))}
                  </div>
                  {customizeForm.videoMode === 'custom' && (
                    <input
                      className="form-input mt-8"
                      value={customizeForm.videoUrl}
                      onChange={e => setCustomizeForm(f => ({ ...f, videoUrl: e.target.value }))}
                      placeholder={t('exlib.ph_video')}
                    />
                  )}
                  {customizeForm.videoMode === 'default' && (
                    <p className="text-sm text-muted mt-8">{seedVideoUrl ? t('exlib.default_has_video') : t('exlib.default_no_video')}</p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">{t('exlib.cues')}</label>
                  <div className="ex-mode-toggle">
                    {['default', 'custom', 'hidden'].map(m => (
                      <button key={m} type="button"
                        className={`ex-mode-pill${customizeForm.instructionsMode === m ? ' active' : ''}`}
                        onClick={() => setCustomizeForm(f => ({ ...f, instructionsMode: m }))}
                      >{MODE_LABELS[m](t)}</button>
                    ))}
                  </div>
                  {customizeForm.instructionsMode === 'custom' && (
                    <textarea
                      className="form-textarea mt-8"
                      value={customizeForm.instructions}
                      onChange={e => setCustomizeForm(f => ({ ...f, instructions: e.target.value }))}
                      placeholder={t('exlib.ph_cues')}
                    />
                  )}
                </div>
                <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                  <button type="button" className="btn btn-outline" onClick={handleResetCustomize} disabled={customizeSaving}>{t('exlib.reset_default')}</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowCustomize(false)}>{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={customizeSaving}>{customizeSaving ? t('common.saving') : t('common.save')}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
