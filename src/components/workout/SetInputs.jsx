import { useRef, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

const WEIGHT_DELTAS = [1.25, 2.5, 5, 10, 15, 20, 25];

export default function SetInputs({ set, setIdx, unit = 'weight_reps', onUpdate, onRemove, canRemove, done, onComplete }) {
  const repsRef = useRef(null);
  const distRef = useRef(null);
  const [weightFocused, setWeightFocused] = useState(false);

  const step = (field, delta, min = 0) => {
    const cur = parseFloat(set[field]) || 0;
    onUpdate(field, String(Math.max(min, Math.round((cur + delta) * 10) / 10)));
  };

  const hasWeight = unit === 'weight_reps' || unit === 'weight_distance';

  return (
    <div className="log-set-wrap">
      <div className={`log-set-row${done ? ' log-set-row-done' : ''}`}>
        <span className="log-set-num">Set {setIdx + 1}</span>
        {unit === 'weight_reps' && (<>
          <div className="log-field-group">
            <button className="log-stepper" onClick={() => step('weight', -2.5)} tabIndex={-1}>−</button>
            <input
              className="form-input log-set-input" type="number" placeholder="kg"
              inputMode="decimal" enterKeyHint="next"
              value={set.weight ?? ''}
              onChange={e => onUpdate('weight', e.target.value)}
              onFocus={() => setWeightFocused(true)}
              onBlur={() => setWeightFocused(false)}
              onKeyDown={e => e.key === 'Enter' && repsRef.current?.focus()}
            />
            <button className="log-stepper" onClick={() => step('weight', 2.5)} tabIndex={-1}>+</button>
          </div>
          <span className="text-sm text-muted">×</span>
          <div className="log-field-group">
            <button className="log-stepper" onClick={() => step('reps', -1, 1)} tabIndex={-1}>−</button>
            <input
              ref={repsRef}
              className="form-input log-set-input" type="number" placeholder="reps"
              inputMode="numeric" enterKeyHint="done"
              value={set.reps ?? ''} onChange={e => onUpdate('reps', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onComplete?.()}
            />
            <button className="log-stepper" onClick={() => step('reps', 1)} tabIndex={-1}>+</button>
          </div>
        </>)}
        {unit === 'reps_only' && (<>
          <span className="text-sm text-muted">×</span>
          <div className="log-field-group">
            <button className="log-stepper" onClick={() => step('reps', -1, 1)} tabIndex={-1}>−</button>
            <input
              className="form-input log-set-input" type="number" placeholder="reps"
              inputMode="numeric" enterKeyHint="done"
              value={set.reps ?? ''} onChange={e => onUpdate('reps', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onComplete?.()}
            />
            <button className="log-stepper" onClick={() => step('reps', 1)} tabIndex={-1}>+</button>
          </div>
        </>)}
        {unit === 'time' && (<>
          <div className="log-field-group">
            <button className="log-stepper" onClick={() => step('seconds', -5, 0)} tabIndex={-1}>−</button>
            <input
              className="form-input log-set-input" type="number" placeholder="sec"
              inputMode="numeric" enterKeyHint="done"
              value={set.seconds ?? ''} onChange={e => onUpdate('seconds', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onComplete?.()}
            />
            <button className="log-stepper" onClick={() => step('seconds', 5)} tabIndex={-1}>+</button>
          </div>
          <span className="text-sm text-muted">s</span>
        </>)}
        {unit === 'distance' && (<>
          <div className="log-field-group">
            <button className="log-stepper" onClick={() => step('metres', -10, 0)} tabIndex={-1}>−</button>
            <input
              className="form-input log-set-input" type="number" placeholder="m"
              inputMode="numeric" enterKeyHint="done"
              value={set.metres ?? ''} onChange={e => onUpdate('metres', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onComplete?.()}
            />
            <button className="log-stepper" onClick={() => step('metres', 10)} tabIndex={-1}>+</button>
          </div>
          <span className="text-sm text-muted">m</span>
        </>)}
        {unit === 'weight_distance' && (<>
          <div className="log-field-group">
            <button className="log-stepper" onClick={() => step('weight', -2.5)} tabIndex={-1}>−</button>
            <input
              className="form-input log-set-input" type="number" placeholder="kg"
              inputMode="decimal" enterKeyHint="next"
              value={set.weight ?? ''}
              onChange={e => onUpdate('weight', e.target.value)}
              onFocus={() => setWeightFocused(true)}
              onBlur={() => setWeightFocused(false)}
              onKeyDown={e => e.key === 'Enter' && distRef.current?.focus()}
            />
            <button className="log-stepper" onClick={() => step('weight', 2.5)} tabIndex={-1}>+</button>
          </div>
          <span className="text-sm text-muted">×</span>
          <div className="log-field-group">
            <button className="log-stepper" onClick={() => step('metres', -10, 0)} tabIndex={-1}>−</button>
            <input
              ref={distRef}
              className="form-input log-set-input" type="number" placeholder="m"
              inputMode="numeric" enterKeyHint="done"
              value={set.metres ?? ''} onChange={e => onUpdate('metres', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onComplete?.()}
            />
            <button className="log-stepper" onClick={() => step('metres', 10)} tabIndex={-1}>+</button>
          </div>
          <span className="text-sm text-muted">m</span>
        </>)}
        {onComplete && (
          <button className={`log-set-done${done ? ' done' : ''}`} onClick={onComplete} title="Mark set done">
            <CheckCircle size={18} />
          </button>
        )}
        {canRemove && (
          <button className="btn btn-outline btn-sm btn-icon" onClick={onRemove} title="Remove set"><X size={12} /></button>
        )}
      </div>
      {hasWeight && weightFocused && (
        <div className="weight-delta-pills">
          {WEIGHT_DELTAS.map(d => (
            <button
              key={d}
              className="weight-delta-pill"
              tabIndex={-1}
              onMouseDown={e => e.preventDefault()}
              onClick={() => step('weight', d)}
            >
              +{d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
