import { useState, useMemo } from 'react';
import { Wand2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { explainMovementPattern, liveExercises, sortExercisesByName } from '../utils/exerciseUtils';

// Written as functions of t because t() only takes a literal key (#39).
const CONFIDENCE_COPY = {
  high: {
    title: (t) => t('mpscan.high_title'),
    desc: (t) => t('mpscan.high_desc'),
  },
  medium: {
    title: (t) => t('mpscan.medium_title'),
    desc: (t) => t('mpscan.medium_desc'),
  },
  low: {
    title: (t) => t('mpscan.low_title'),
    desc: (t) => t('mpscan.low_desc'),
  },
};

// Trainer-only tool: runs the movement-pattern keyword rules over the trainer's own
// exercises and writes only the rows they tick. Nothing is written on scan — Ani reviews
// first, which is also the only way this can happen at all, since she works from a phone
// and has no terminal or admin SDK (CLAUDE.md #26).
export default function MovementPatternScanner() {
  const { t } = useLanguage();
  const { getExercises, updateExercise, currentUser } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [skipped, setSkipped] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [applying, setApplying] = useState(false);

  // A one-off migration tool, so it should not be furniture. Once every exercise the
  // trainer created carries a pattern — which is the normal state for anyone who started
  // after inferMovementPattern shipped, since the add form fills it in — the card is not
  // rendered at all rather than sitting there offering a scan with nothing to find.
  const unclassifiedCount = useMemo(
    () => liveExercises(getExercises()).filter(e => e.trainerId === currentUser.id && !e.movementPattern).length,
    // getExercises is recreated on every AppContext render; the exercises array behind it
    // is what actually changes, and a stale count here only delays the card by one render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser.id],
  );

  const scan = () => {
    // Only the trainer's own Firestore documents can be written: the seed exercises have no
    // document to update, and a soft-merged tombstone must never be edited again.
    const own = liveExercises(getExercises()).filter(e => e.trainerId === currentUser.id);
    const unclassified = own.filter(e => !e.movementPattern);
    const scanned = sortExercisesByName(unclassified).map(e => ({
      id: e.id,
      name: e.name,
      ...explainMovementPattern(e.name),
    }));
    setSkipped(own.length - unclassified.length);
    setRows(scanned);
    setSelected(new Set(scanned.filter(r => r.confidence === 'high').map(r => r.id)));
  };

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleGroup = (group, on) => setSelected(prev => {
    const next = new Set(prev);
    group.forEach(r => (on ? next.add(r.id) : next.delete(r.id)));
    return next;
  });

  const apply = async () => {
    const picked = rows.filter(r => selected.has(r.id) && r.pattern);
    if (!picked.length) return;
    setApplying(true);
    let done = 0;
    const failed = [];
    for (const row of picked) {
      try {
        await updateExercise(row.id, { movementPattern: row.pattern });
        done++;
      } catch { failed.push(row.name); }
    }
    setApplying(false);
    if (failed.length) toast(t('mpscan.toast_partial', { done, failed: failed.length, names: failed.join(', ') }), 'error');
    else toast(t('mpscan.toast_done', { count: done }));
    scan();
  };

  const groups = ['high', 'medium', 'low'].map(key => ({
    key,
    ...CONFIDENCE_COPY[key],
    items: (rows || []).filter(r => r.confidence === key),
  })).filter(g => g.items.length);

  const pickedCount = (rows || []).filter(r => selected.has(r.id) && r.pattern).length;

  // `rows` is non-null only after a scan in this visit; keep the card up in that case so
  // the trainer sees the "all classified" confirmation for what they just applied.
  if (unclassifiedCount === 0 && rows === null) return null;

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Wand2 size={18} /> {t('mpscan.title')}
      </h3>
      <p className="invite-desc">{t('mpscan.desc')}</p>

      {rows === null ? (
        <button className="btn btn-outline mt-8" onClick={scan} style={{ width: '100%' }}>
          {t('mpscan.scan')}
        </button>
      ) : rows.length === 0 ? (
        <p className="mp-scan-empty">{t('mpscan.all_done')}</p>
      ) : (
        <>
          {skipped > 0 && (
            <p className="mp-scan-note">{t('mpscan.skipped', { count: skipped })}</p>
          )}
          {groups.map(g => {
            const selectable = g.items.filter(r => r.pattern);
            const allOn = selectable.length > 0 && selectable.every(r => selected.has(r.id));
            return (
              <div key={g.key} className="mp-scan-group">
                <div className="mp-scan-group-head">
                  <div>
                    <div className={`mp-scan-group-title mp-${g.key}`}>{g.title(t)} ({g.items.length})</div>
                    <div className="mp-scan-group-desc">{g.desc(t)}</div>
                  </div>
                  {selectable.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => toggleGroup(selectable, !allOn)}
                    >
                      {allOn ? t('mpscan.select_none') : t('mpscan.select_all')}
                    </button>
                  )}
                </div>
                {g.items.map(r => {
                  const keywords = r.hits.map(h => `${h.pattern}: ${h.keywords.join(', ')}`).join('  +  ');
                  return r.pattern ? (
                    <label key={r.id} className="mp-scan-row">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                      <span className="mp-scan-row-body">
                        <span className="mp-scan-row-name">{r.name}</span>
                        <span className="mp-scan-row-meta">{keywords}</span>
                      </span>
                      <span className="tag tag-primary">{r.pattern}</span>
                    </label>
                  ) : (
                    <div key={r.id} className="mp-scan-row mp-scan-row-static">
                      <span className="mp-scan-row-body">
                        <span className="mp-scan-row-name">{r.name}</span>
                        <span className="mp-scan-row-meta">{t('mpscan.no_match')}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="mp-scan-actions">
            <button className="btn btn-outline" onClick={scan} disabled={applying}>{t('mpscan.rescan')}</button>
            <button className="btn btn-primary" onClick={apply} disabled={applying || pickedCount === 0}>
              {applying ? t('mpscan.applying') : <><Check size={16} /> {t('mpscan.apply_n', { count: pickedCount })}</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
