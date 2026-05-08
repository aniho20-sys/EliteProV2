import { X } from 'lucide-react';

/*
  Reference-matched proportions (viewBox 0 0 100 200):
  Head:    cy=12, ry=11.5  → bottom y≈23
  Neck:    y=23-31
  Torso:   shoulder y=32, width x=22-78; waist y=82 width x=35-65; hip y=115
  Arms:    hang to mid-thigh (y≈131), upper arm center x=17/83
  Legs:    thigh center x=40/60, calf narrows; feet at y=200
*/

function BodyOutline() {
  return (
    <g className="muscle-body-shape">
      {/* Head — smooth oval, no features */}
      <ellipse cx="50" cy="12" rx="9.5" ry="11.5" />

      {/* Neck */}
      <path d="M45,23 L44,31 L56,31 L55,23 Q52,21 50,21 Q48,21 45,23 Z" />

      {/* Torso — wide shoulders → narrow waist → medium hips */}
      <path d="
        M50,30 C43,29 36,30 31,33
        C26,35 23,38 22,43 L22,52
        C22,62 23,72 25,82
        C26,92 27,102 28,109
        C29,112 30,115 31,116
        L69,116
        C70,115 71,112 72,109
        C73,102 74,92 75,82
        C77,72 78,62 78,52 L78,43
        C77,38 74,35 69,33
        C64,30 57,29 50,30 Z
      " />

      {/* Left arm — shoulder cap → upper arm → forearm → hand, one continuous shape */}
      <path d="
        M24,33 C20,31 14,34 12,42
        C10,50 10,62 11,74
        C11,80 10,88 10,98
        C10,108 11,118 12,124
        C13,129 16,131 19,131
        C22,131 24,128 24,122
        C24,116 23,106 23,96
        C23,86 23,80 23,74
        C24,62 24,50 24,40
        C24,36 24,34 24,33 Z
      " />

      {/* Right arm */}
      <path d="
        M76,33 C80,31 86,34 88,42
        C90,50 90,62 89,74
        C89,80 90,88 90,98
        C90,108 89,118 88,124
        C87,129 84,131 81,131
        C78,131 76,128 76,122
        C76,116 77,106 77,96
        C77,86 77,80 77,74
        C76,62 76,50 76,40
        C76,36 76,34 76,33 Z
      " />

      {/* Left leg — hip → thigh → knee → calf → foot, one continuous shape */}
      <path d="
        M30,116 C27,120 26,130 26,141
        C26,154 28,165 32,172
        C32,177 33,183 33,190
        C33,196 35,200 40,200
        C43,200 46,200 48,200
        C49,200 49,198 49,194
        C48,189 47,182 47,175
        C47,168 48,161 49,158
        C51,153 52,145 51,136
        C50,126 50,120 50,116
        C49,115 47,115 44,115
        C40,115 35,115 30,116 Z
      " />

      {/* Right leg */}
      <path d="
        M70,116 C73,120 74,130 74,141
        C74,154 72,165 68,172
        C68,177 67,183 67,190
        C67,196 65,200 60,200
        C57,200 54,200 52,200
        C51,200 51,198 51,194
        C52,189 53,182 53,175
        C53,168 52,161 51,158
        C49,153 48,145 49,136
        C50,126 50,120 50,116
        C51,115 53,115 56,115
        C60,115 65,115 70,116 Z
      " />
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
            <BodyOutline />

            {/* Traps — small V at neck base (front) */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M46,27 C42,29 37,33 34,39 L50,46 L66,39 C63,33 58,29 54,27 Z" />
            </Muscle>

            {/* Shoulders — prominent round deltoid caps */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M24,33 C20,31 14,34 12,42 C10,49 10,57 13,62 C16,66 21,67 25,63 C28,59 28,51 27,44 C26,38 25,35 24,33 Z" />
              <path className="muscle-shape" d="M76,33 C80,31 86,34 88,42 C90,49 90,57 87,62 C84,66 79,67 75,63 C72,59 72,51 73,44 C74,38 75,35 76,33 Z" />
            </Muscle>

            {/* Chest — two large fan-shaped pectorals */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,34 C46,33 39,34 33,38 C27,42 25,50 26,57 C27,63 31,68 38,70 C42,71 47,70 50,68 Z" />
              <path className="muscle-shape" d="M50,34 C54,33 61,34 67,38 C73,42 75,50 74,57 C73,63 69,68 62,70 C58,71 53,70 50,68 Z" />
            </Muscle>

            {/* Biceps — front of upper arm */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M11,60 C10,65 10,73 11,79 C12,83 15,85 19,84 C22,83 23,79 23,74 C23,68 22,62 19,60 Z" />
              <path className="muscle-shape" d="M89,60 C90,65 90,73 89,79 C88,83 85,85 81,84 C78,83 77,79 77,74 C77,68 78,62 81,60 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M10,82 C9,88 9,97 10,105 C11,112 13,119 16,123 C17,126 20,127 22,125 C24,122 24,115 23,107 C22,99 22,90 22,83 Z" />
              <path className="muscle-shape" d="M90,82 C91,88 91,97 90,105 C89,112 87,119 84,123 C83,126 80,127 78,125 C76,122 76,115 77,107 C78,99 78,90 78,83 Z" />
            </Muscle>

            {/* Core — 6-block abs + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              {/* Left oblique */}
              <path className="muscle-shape" d="M31,70 C28,75 27,83 28,92 C29,100 33,108 37,111 C39,113 41,112 42,108 C43,103 42,94 40,86 C37,78 34,71 31,70 Z" />
              {/* Right oblique */}
              <path className="muscle-shape" d="M69,70 C72,75 73,83 72,92 C71,100 67,108 63,111 C61,113 59,112 58,108 C57,103 58,94 60,86 C63,78 66,71 69,70 Z" />
              {/* 6-pack: 3 rows × 2 cols */}
              <rect className="muscle-shape" x="41" y="70" width="8" height="10" rx="2.5" />
              <rect className="muscle-shape" x="51" y="70" width="8" height="10" rx="2.5" />
              <rect className="muscle-shape" x="41" y="82" width="8" height="10" rx="2.5" />
              <rect className="muscle-shape" x="51" y="82" width="8" height="10" rx="2.5" />
              <rect className="muscle-shape" x="41" y="94" width="8" height="10" rx="2.5" />
              <rect className="muscle-shape" x="51" y="94" width="8" height="10" rx="2.5" />
            </Muscle>

            {/* Quadriceps — fills front of thigh with vastus medialis teardrop */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M30,117 C27,121 26,131 26,141 C26,154 28,165 32,172 C34,176 38,177 42,175 C46,172 47,165 47,155 C47,144 45,132 42,123 C40,118 36,116 30,117 Z" />
              {/* Vastus medialis teardrop */}
              <path className="muscle-shape" d="M41,169 C39,172 39,178 41,180 C43,182 46,181 47,178 C48,175 47,171 45,169 Z" />
              <path className="muscle-shape" d="M70,117 C73,121 74,131 74,141 C74,154 72,165 68,172 C66,176 62,177 58,175 C54,172 53,165 53,155 C53,144 55,132 58,123 C60,118 64,116 70,117 Z" />
              <path className="muscle-shape" d="M59,169 C61,172 61,178 59,180 C57,182 54,181 53,178 C52,175 53,171 55,169 Z" />
            </Muscle>

            {/* Adductors — inner thigh */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M49,116 C47,120 46,130 46,140 C46,151 47,161 49,168 C50,170 50,170 50,170 L50,116 Z" />
              <path className="muscle-shape" d="M51,116 C53,120 54,130 54,140 C54,151 53,161 51,168 C50,170 50,170 50,170 L50,116 Z" />
            </Muscle>

          </svg>
        </div>

        {/* ── BACK VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox="0 0 100 200" className="muscle-svg">
            <BodyOutline />

            {/* Trapezius — large kite shape dominating upper back */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,27 C59,27 69,30 74,39 C78,47 77,57 70,63 C64,68 57,70 50,70 C43,70 36,68 30,63 C23,57 22,47 26,39 C31,30 41,27 50,27 Z" />
            </Muscle>

            {/* Shoulders — rear deltoids */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M24,33 C20,31 14,34 12,42 C10,49 10,57 13,62 C16,66 21,67 25,63 C28,59 28,51 27,44 C26,38 25,35 24,33 Z" />
              <path className="muscle-shape" d="M76,33 C80,31 86,34 88,42 C90,49 90,57 87,62 C84,66 79,67 75,63 C72,59 72,51 73,44 C74,38 75,35 76,33 Z" />
            </Muscle>

            {/* Lats — wide fan shapes, most prominent back muscles */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M27,53 C23,59 21,70 21,81 C21,93 23,105 28,113 C31,118 37,120 42,116 C47,111 48,100 49,88 C49,76 48,64 44,56 Z" />
              <path className="muscle-shape" d="M73,53 C77,59 79,70 79,81 C79,93 77,105 72,113 C69,118 63,120 58,116 C53,111 52,100 51,88 C51,76 52,64 56,56 Z" />
            </Muscle>

            {/* Upper Back — rhomboids between shoulder blades */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M42,65 C39,69 38,75 40,81 C41,86 45,89 50,89 C55,89 59,86 60,81 C62,75 61,69 58,65 C55,61 52,60 50,60 C48,60 45,61 42,65 Z" />
            </Muscle>

            {/* Lower Back — erector spinae columns */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M43,103 C40,107 39,114 40,120 C41,126 45,129 49,128 L49,103 Z" />
              <path className="muscle-shape" d="M57,103 C60,107 61,114 60,120 C59,126 55,129 51,128 L51,103 Z" />
            </Muscle>

            {/* Triceps — horseshoe on back of upper arm */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M11,53 C10,59 10,68 11,76 C12,81 15,83 19,82 C22,81 23,77 23,72 C23,66 22,59 19,55 Z" />
              <path className="muscle-shape" d="M89,53 C90,59 90,68 89,76 C88,81 85,83 81,82 C78,81 77,77 77,72 C77,66 78,59 81,55 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M10,82 C9,88 9,97 10,105 C11,112 13,119 16,123 C17,126 20,127 22,125 C24,122 24,115 23,107 C22,99 22,90 22,83 Z" />
              <path className="muscle-shape" d="M90,82 C91,88 91,97 90,105 C89,112 87,119 84,123 C83,126 80,127 78,125 C76,122 76,115 77,107 C78,99 78,90 78,83 Z" />
            </Muscle>

            {/* Glutes — two large rounded gluteus maximus */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M32,115 C28,119 27,128 28,137 C29,145 33,152 39,153 C43,154 47,151 49,146 C50,142 50,135 49,128 C47,121 43,116 39,115 C36,114 34,114 32,115 Z" />
              <path className="muscle-shape" d="M68,115 C72,119 73,128 72,137 C71,145 67,152 61,153 C57,154 53,151 51,146 C50,142 50,135 51,128 C53,121 57,116 61,115 C64,114 66,114 68,115 Z" />
            </Muscle>

            {/* Abductors — outer hip / gluteus medius */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M27,111 C24,116 23,124 24,132 C25,138 29,141 34,140 C37,139 38,135 38,129 C38,122 36,114 32,111 Z" />
              <path className="muscle-shape" d="M73,111 C76,116 77,124 76,132 C75,138 71,141 66,140 C63,139 62,135 62,129 C62,122 64,114 68,111 Z" />
            </Muscle>

            {/* Hamstrings — back of thigh */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M30,117 C27,121 26,131 26,141 C26,154 28,165 32,172 C34,176 38,177 42,175 C46,172 47,165 47,155 C47,144 45,132 42,123 C40,118 36,116 30,117 Z" />
              <path className="muscle-shape" d="M70,117 C73,121 74,131 74,141 C74,154 72,165 68,172 C66,176 62,177 58,175 C54,172 53,165 53,155 C53,144 55,132 58,123 C60,118 64,116 70,117 Z" />
            </Muscle>

            {/* Calves — two-headed gastrocnemius */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              {/* Left medial (inner) head */}
              <path className="muscle-shape" d="M34,175 C31,180 30,188 31,194 C32,199 36,201 40,200 C42,198 44,194 44,189 C44,183 42,177 39,174 Z" />
              {/* Left lateral (outer) head */}
              <path className="muscle-shape" d="M45,176 C47,181 47,189 46,194 C45,198 43,200 41,200 C40,197 40,191 41,185 C42,180 44,177 45,176 Z" />
              {/* Right medial head */}
              <path className="muscle-shape" d="M55,176 C53,181 53,189 54,194 C55,198 57,200 59,200 C60,197 60,191 59,185 C58,180 56,177 55,176 Z" />
              {/* Right lateral head */}
              <path className="muscle-shape" d="M66,175 C69,180 70,188 69,194 C68,199 64,201 60,200 C58,198 56,194 56,189 C56,183 58,177 61,174 Z" />
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
