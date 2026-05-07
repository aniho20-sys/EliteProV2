import { X } from 'lucide-react';

// Body silhouette — same outline shapes for both front and back views
function BodyShape() {
  return (
    <g className="muscle-body-shape">
      <ellipse cx="50" cy="11" rx="8" ry="9" />
      <rect x="46" y="19.5" width="8" height="7" rx="3" />
      {/* Torso: V-taper athletic shape with slight waist */}
      <path d="M32,26 Q29,26 27,31 L27,62 Q27,74 29,80 Q29,98 31,113 Q35,116 50,116 Q65,116 69,113 Q71,98 71,80 Q73,74 73,62 L73,31 Q71,26 68,26 Q60,24 50,24 Q40,24 32,26 Z" />
      <rect x="15" y="29" width="12" height="36" rx="5" />
      <rect x="73" y="29" width="12" height="36" rx="5" />
      <rect x="13" y="64" width="11" height="36" rx="5" />
      <rect x="76" y="64" width="11" height="36" rx="5" />
      <rect x="31" y="114" width="18" height="48" rx="7" />
      <rect x="51" y="114" width="18" height="48" rx="7" />
      <rect x="33" y="161" width="15" height="36" rx="6" />
      <rect x="52" y="161" width="15" height="36" rx="6" />
    </g>
  );
}

function Muscle({ name, selected, onToggle, children }) {
  return (
    <g
      className={`muscle-region${selected.includes(name) ? ' active' : ''}`}
      onClick={() => onToggle(name)}
      role="button"
      aria-label={name}
      aria-pressed={selected.includes(name)}
    >
      {children}
    </g>
  );
}

export default function MuscleSelector({ selected = [], onChange }) {
  const toggle = (name) => {
    onChange(selected.includes(name)
      ? selected.filter(m => m !== name)
      : [...selected, name]);
  };

  return (
    <div className="muscle-selector">
      <div className="muscle-bodies">

        {/* ── FRONT VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Front</span>
          <svg viewBox="0 0 100 200" className="muscle-svg">
            <BodyShape />

            {/* Chest */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="50" cy="43" rx="14" ry="11" />
            </Muscle>

            {/* Shoulders – front delts */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="22" cy="34" rx="7.5" ry="6.5" />
              <ellipse className="muscle-shape" cx="78" cy="34" rx="7.5" ry="6.5" />
            </Muscle>

            {/* Traps – small V visible at neck/shoulder from front */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M46,26 Q40,27 35,33 L50,40 L65,33 Q60,27 54,26 Z" />
            </Muscle>

            {/* Biceps */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="21" cy="51" rx="5" ry="10" />
              <ellipse className="muscle-shape" cx="79" cy="51" rx="5" ry="10" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="18" cy="82" rx="4.5" ry="11" />
              <ellipse className="muscle-shape" cx="82" cy="82" rx="4.5" ry="11" />
            </Muscle>

            {/* Core – abs + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="50" cy="78" rx="9" ry="16" />
              <ellipse className="muscle-shape" cx="36" cy="80" rx="5" ry="14" />
              <ellipse className="muscle-shape" cx="64" cy="80" rx="5" ry="14" />
            </Muscle>

            {/* Quadriceps */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="39" cy="138" rx="7.5" ry="21" />
              <ellipse className="muscle-shape" cx="61" cy="138" rx="7.5" ry="21" />
            </Muscle>

            {/* Adductors – inner thigh */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="46" cy="137" rx="3.5" ry="19" />
              <ellipse className="muscle-shape" cx="54" cy="137" rx="3.5" ry="19" />
            </Muscle>
          </svg>
        </div>

        {/* ── BACK VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox="0 0 100 200" className="muscle-svg">
            <BodyShape />

            {/* Lats – large fan shapes, rendered first (behind other muscles) */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M38,50 Q30,64 29,90 Q31,96 44,94 L50,78 Q48,64 44,51 Z" />
              <path className="muscle-shape" d="M62,50 Q70,64 71,90 Q69,96 56,94 L50,78 Q52,64 56,51 Z" />
            </Muscle>

            {/* Upper Back – rhomboids */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="50" cy="65" rx="9" ry="8" />
            </Muscle>

            {/* Trapezius – kite/diamond */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,26 Q64,26 70,42 Q60,58 50,60 Q40,58 30,42 Q36,26 50,26 Z" />
            </Muscle>

            {/* Shoulders – rear delts */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="22" cy="34" rx="7.5" ry="6.5" />
              <ellipse className="muscle-shape" cx="78" cy="34" rx="7.5" ry="6.5" />
            </Muscle>

            {/* Lower Back */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="50" cy="100" rx="8" ry="11" />
            </Muscle>

            {/* Triceps */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="21" cy="51" rx="5" ry="10" />
              <ellipse className="muscle-shape" cx="79" cy="51" rx="5" ry="10" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="18" cy="82" rx="4.5" ry="11" />
              <ellipse className="muscle-shape" cx="82" cy="82" rx="4.5" ry="11" />
            </Muscle>

            {/* Glutes */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="50" cy="124" rx="19" ry="10" />
            </Muscle>

            {/* Abductors – outer hip/TFL, on top of glutes */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="30" cy="123" rx="5" ry="12" />
              <ellipse className="muscle-shape" cx="70" cy="123" rx="5" ry="12" />
            </Muscle>

            {/* Hamstrings */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="40" cy="138" rx="7.5" ry="21" />
              <ellipse className="muscle-shape" cx="60" cy="138" rx="7.5" ry="21" />
            </Muscle>

            {/* Calves */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="40" cy="176" rx="6.5" ry="13" />
              <ellipse className="muscle-shape" cx="60" cy="176" rx="6.5" ry="13" />
            </Muscle>
          </svg>
        </div>

      </div>

      {selected.length > 0 && (
        <div className="muscle-selected-chips">
          {selected.map(m => (
            <span key={m} className="muscle-chip">
              {m}
              <button
                type="button"
                className="muscle-chip-remove"
                onClick={() => toggle(m)}
                aria-label={`Remove ${m}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
