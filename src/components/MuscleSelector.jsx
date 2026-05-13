import { useState } from 'react';
import { muscleGroups } from '../data/exercises';

export default function MuscleSelector({ selected = [], onChange }) {
  const [customInput, setCustomInput] = useState('');

  const toggle = (name) => {
    onChange(selected.includes(name)
      ? selected.filter(m => m !== name)
      : [...selected, name]);
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    if (!selected.includes(name)) onChange([...selected, name]);
    setCustomInput('');
  };

  const customSelected = selected.filter(m => !muscleGroups.includes(m));

  return (
    <div className="muscle-chip-selector">
      <div className="muscle-chips">
        {muscleGroups.map(m => (
          <button
            key={m}
            type="button"
            className={`muscle-chip${selected.includes(m) ? ' active' : ''}`}
            onClick={() => toggle(m)}
          >
            {m}
          </button>
        ))}
        {customSelected.map(m => (
          <button
            key={m}
            type="button"
            className="muscle-chip active"
            onClick={() => toggle(m)}
            title="Click to remove"
          >
            {m} ×
          </button>
        ))}
      </div>
      <div className="muscle-chip-add">
        <input
          className="form-input"
          style={{ flex: 1, padding: '5px 10px', fontSize: '0.875rem' }}
          type="text"
          placeholder="Custom muscle group…"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={addCustom}
          disabled={!customInput.trim()}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
