import { useCallback } from 'react';
import Model from 'react-body-highlighter';
import { X } from 'lucide-react';

// Map our muscle group names → package muscle IDs
const MUSCLE_TO_IDS = {
  'Chest':       ['chest'],
  'Shoulders':   ['front-deltoids', 'back-deltoids'],
  'Traps':       ['trapezius'],
  'Upper Back':  ['upper-back'],
  'Lower Back':  ['lower-back'],
  'Biceps':      ['biceps'],
  'Triceps':     ['triceps'],
  'Forearms':    ['forearm'],
  'Core':        ['abs', 'obliques'],
  'Glutes':      ['gluteal'],
  'Quadriceps':  ['quadriceps'],
  'Hamstrings':  ['hamstring'],
  'Calves':      ['calves'],
};

// Reverse map: package ID → our muscle group name
const ID_TO_MUSCLE = {};
Object.entries(MUSCLE_TO_IDS).forEach(([name, ids]) => {
  ids.forEach(id => { if (!ID_TO_MUSCLE[id]) ID_TO_MUSCLE[id] = name; });
});

function musclesToData(selected) {
  const ids = selected.flatMap(name => MUSCLE_TO_IDS[name] || []);
  if (!ids.length) return [];
  return [{ name: 'selected', muscles: ids, frequency: 1 }];
}

export default function MuscleSelector({ selected = [], onChange }) {
  const data = musclesToData(selected);

  const handleClick = useCallback(({ muscle }) => {
    const name = ID_TO_MUSCLE[muscle];
    if (!name) return;
    onChange(selected.includes(name) ? selected.filter(m => m !== name) : [...selected, name]);
  }, [selected, onChange]);

  return (
    <div className="muscle-selector">
      <div className="muscle-bodies">
        <div className="muscle-body-col">
          <div className="muscle-body-label">Front</div>
          <Model
            data={data}
            highlightedColors={['#4361ee']}
            type="anterior"
            onClick={handleClick}
            style={{ width: '100%' }}
          />
        </div>
        <div className="muscle-body-col">
          <div className="muscle-body-label">Back</div>
          <Model
            data={data}
            highlightedColors={['#4361ee']}
            type="posterior"
            onClick={handleClick}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="muscle-selected-chips">
          {selected.map(m => (
            <span key={m} className="muscle-chip">
              {m}
              <button type="button" className="muscle-chip-remove" onClick={() => onChange(selected.filter(x => x !== m))}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
