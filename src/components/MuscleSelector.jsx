import { X } from 'lucide-react';

function BodyOutline({ view }) {
  if (view === 'front') {
    return (
      <g className="muscle-body-shape">
        {/* Head */}
        <ellipse cx="50" cy="10" rx="8.5" ry="10" />
        {/* Neck */}
        <path d="M46,19.5 C46,19.5 44,23 44,26 L56,26 C56,23 54,19.5 54,19.5 Z" />
        {/* Body outline: torso + arms + legs */}
        <path d="
          M44,26
          C40,26 34,27 30,29
          C24,31 18,32 16,36
          C14,40 14,46 16,50
          C18,54 22,56 25,56
          C26,57 27,58 27,60
          C24,64 22,70 20,80
          C18,90 17,100 17,105
          C17,108 18,110 20,110
          C22,110 24,108 25,105
          C26,100 27,92 28,86
          C29,80 30,76 31,74
          C32,78 33,88 34,100
          C35,110 35,116 36,120
          L35,122
          C33,128 32,140 32,152
          C32,162 33,172 34,180
          C35,185 37,188 40,188
          C43,188 45,185 46,180
          C47,172 47,162 47,152
          C47,142 46,133 46,128
          L50,128
          C50,133 54,142 54,152
          C54,162 53,172 54,180
          C55,185 57,188 60,188
          C63,188 65,185 66,180
          C67,172 68,162 68,152
          C68,140 67,128 65,122
          L64,120
          C65,116 65,110 66,100
          C67,88 68,78 69,74
          C70,76 71,80 72,86
          C73,92 74,100 75,105
          C76,108 78,110 80,110
          C82,110 83,108 83,105
          C83,100 82,90 80,80
          C78,70 76,64 73,60
          C73,58 74,57 75,56
          C78,56 82,54 84,50
          C86,46 86,40 84,36
          C82,32 76,31 70,29
          C66,27 60,26 56,26
          Z
        " />
      </g>
    );
  }
  return (
    <g className="muscle-body-shape">
      {/* Head */}
      <ellipse cx="50" cy="10" rx="8.5" ry="10" />
      {/* Neck */}
      <path d="M46,19.5 C46,19.5 44,23 44,26 L56,26 C56,23 54,19.5 54,19.5 Z" />
      {/* Body outline back: wider shoulders, rounder glutes */}
      <path d="
        M44,26
        C40,26 33,27 29,29
        C23,31 17,33 15,37
        C13,41 13,47 15,51
        C17,55 21,57 25,57
        C26,58 27,59 27,61
        C24,65 22,71 20,81
        C18,91 17,101 17,106
        C17,109 18,111 20,111
        C22,111 24,109 25,106
        C26,101 27,93 28,87
        C29,81 30,77 31,75
        C32,80 33,92 34,104
        C35,114 35,120 36,124
        L35,126
        C32,132 31,144 31,156
        C31,166 32,175 33,182
        C34,187 36,190 39,190
        C42,190 44,187 45,182
        C46,175 46,165 46,155
        C46,146 45,137 45,131
        L50,131
        C50,137 55,146 55,155
        C55,165 54,175 55,182
        C56,187 58,190 61,190
        C64,190 66,187 67,182
        C68,175 69,166 69,156
        C69,144 68,132 65,126
        L64,124
        C65,120 65,114 66,104
        C67,92 68,80 69,75
        C70,77 71,81 72,87
        C73,93 74,101 75,106
        C76,109 78,111 80,111
        C82,111 83,109 83,106
        C83,101 82,91 80,81
        C78,71 76,65 73,61
        C73,59 74,58 75,57
        C79,57 83,55 85,51
        C87,47 87,41 85,37
        C83,33 77,31 71,29
        C67,27 60,26 56,26
        Z
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
            <BodyOutline view="front" />

            {/* Chest — 2 fan shapes with sternum gap */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,30 C44,29 38,30 33,33 C28,36 26,41 27,47 C28,51 31,55 37,57 C41,58 46,58 50,57 Z" />
              <path className="muscle-shape" d="M50,30 C56,29 62,30 67,33 C72,36 74,41 73,47 C72,51 69,55 63,57 C59,58 54,58 50,57 Z" />
            </Muscle>

            {/* Traps — small V visible at neck/shoulder from front */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M46,25 C42,26 37,30 34,35 L50,42 L66,35 C63,30 58,26 54,25 Z" />
            </Muscle>

            {/* Shoulders — front deltoids, teardrop shape */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M29,27 C24,26 18,29 16,36 C14,41 15,47 19,50 C22,52 26,51 29,46 C32,41 32,33 29,27 Z" />
              <path className="muscle-shape" d="M71,27 C76,26 82,29 84,36 C86,41 85,47 81,50 C78,52 74,51 71,46 C68,41 68,33 71,27 Z" />
            </Muscle>

            {/* Biceps */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M17,51 C14,53 13,58 13,63 C13,68 15,73 18,74 C21,75 24,72 25,67 C26,62 25,56 22,52 Z" />
              <path className="muscle-shape" d="M83,51 C86,53 87,58 87,63 C87,68 85,73 82,74 C79,75 76,72 75,67 C74,62 75,56 78,52 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M14,76 C12,79 11,84 12,90 C13,96 16,101 19,102 C21,103 23,101 24,97 C25,92 24,85 22,79 Z" />
              <path className="muscle-shape" d="M86,76 C88,79 89,84 88,90 C87,96 84,101 81,102 C79,103 77,101 76,97 C75,92 76,85 78,79 Z" />
            </Muscle>

            {/* Core — 6 abs + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              {/* Left oblique */}
              <path className="muscle-shape" d="M33,58 C30,60 29,65 29,70 C29,76 31,82 34,86 C36,88 38,87 39,84 C40,80 40,73 38,66 Z" />
              {/* Right oblique */}
              <path className="muscle-shape" d="M67,58 C70,60 71,65 71,70 C71,76 69,82 66,86 C64,88 62,87 61,84 C60,80 60,73 62,66 Z" />
              {/* Abs — 6 blocks (3 rows × 2 cols) */}
              <rect className="muscle-shape" x="42" y="57" width="7" height="8" rx="2" />
              <rect className="muscle-shape" x="51" y="57" width="7" height="8" rx="2" />
              <rect className="muscle-shape" x="42" y="67" width="7" height="8" rx="2" />
              <rect className="muscle-shape" x="51" y="67" width="7" height="8" rx="2" />
              <rect className="muscle-shape" x="42" y="77" width="7" height="8" rx="2" />
              <rect className="muscle-shape" x="51" y="77" width="7" height="8" rx="2" />
            </Muscle>

            {/* Quadriceps */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              {/* Left quad */}
              <path className="muscle-shape" d="M36,122 C33,124 31,130 31,138 C31,147 33,156 36,160 C38,163 41,163 43,161 C45,159 46,153 46,145 C46,136 44,127 41,123 Z" />
              {/* Left vastus medialis teardrop near knee */}
              <path className="muscle-shape" d="M37,158 C35,160 35,164 37,166 C39,168 42,167 43,164 C44,161 43,158 41,157 Z" />
              {/* Right quad */}
              <path className="muscle-shape" d="M64,122 C67,124 69,130 69,138 C69,147 67,156 64,160 C62,163 59,163 57,161 C55,159 54,153 54,145 C54,136 56,127 59,123 Z" />
              {/* Right vastus medialis teardrop */}
              <path className="muscle-shape" d="M63,158 C65,160 65,164 63,166 C61,168 58,167 57,164 C56,161 57,158 59,157 Z" />
            </Muscle>

            {/* Adductors — inner thigh */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M47,122 C45,124 44,130 44,138 C44,146 45,153 47,157 C48,159 49,159 50,159 C51,159 52,159 53,157 C55,153 56,146 56,138 C56,130 55,124 53,122 C52,121 51,121 50,121 C49,121 48,121 47,122 Z" />
            </Muscle>

          </svg>
        </div>

        {/* ── BACK VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox="0 0 100 200" className="muscle-svg">
            <BodyOutline view="back" />

            {/* Trapezius — large kite/diamond from neck to mid-back */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,24 C58,24 66,27 71,34 C75,40 74,48 68,54 C62,58 56,60 50,60 C44,60 38,58 32,54 C26,48 25,40 29,34 C34,27 42,24 50,24 Z" />
            </Muscle>

            {/* Shoulders — rear deltoids */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M29,27 C24,26 18,29 16,36 C14,41 15,47 19,50 C22,52 26,51 29,46 C32,41 32,33 29,27 Z" />
              <path className="muscle-shape" d="M71,27 C76,26 82,29 84,36 C86,41 85,47 81,50 C78,52 74,51 71,46 C68,41 68,33 71,27 Z" />
            </Muscle>

            {/* Lats — wide fan shapes, from armpit down to lower waist */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M32,48 C28,52 26,60 26,70 C26,80 28,90 31,96 C34,100 38,100 42,96 C46,92 48,84 49,74 C49,64 48,54 44,49 Z" />
              <path className="muscle-shape" d="M68,48 C72,52 74,60 74,70 C74,80 72,90 69,96 C66,100 62,100 58,96 C54,92 52,84 51,74 C51,64 52,54 56,49 Z" />
            </Muscle>

            {/* Upper Back — rhomboids between shoulder blades */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M42,56 C40,58 39,62 40,67 C41,71 44,73 50,73 C56,73 59,71 60,67 C61,62 60,58 58,56 C55,54 52,53 50,53 C48,53 45,54 42,56 Z" />
            </Muscle>

            {/* Lower Back — erector spinae */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M42,96 C40,98 39,102 39,108 C39,114 41,118 44,119 C46,120 48,120 50,120 C52,120 54,120 56,119 C59,118 61,114 61,108 C61,102 60,98 58,96 C55,94 52,93 50,93 C48,93 45,94 42,96 Z" />
            </Muscle>

            {/* Triceps */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M17,51 C14,53 13,58 13,63 C13,68 15,73 18,74 C21,75 24,72 25,67 C26,62 25,56 22,52 Z" />
              <path className="muscle-shape" d="M83,51 C86,53 87,58 87,63 C87,68 85,73 82,74 C79,75 76,72 75,67 C74,62 75,56 78,52 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M14,76 C12,79 11,84 12,90 C13,96 16,101 19,102 C21,103 23,101 24,97 C25,92 24,85 22,79 Z" />
              <path className="muscle-shape" d="M86,76 C88,79 89,84 88,90 C87,96 84,101 81,102 C79,103 77,101 76,97 C75,92 76,85 78,79 Z" />
            </Muscle>

            {/* Glutes — 2 rounded shapes with central divide */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M32,118 C29,120 28,126 29,133 C30,139 34,144 39,145 C43,146 47,144 49,140 C50,137 50,132 49,127 C48,121 45,117 41,116 C37,115 34,116 32,118 Z" />
              <path className="muscle-shape" d="M68,118 C71,120 72,126 71,133 C70,139 66,144 61,145 C57,146 53,144 51,140 C50,137 50,132 51,127 C52,121 55,117 59,116 C63,115 66,116 68,118 Z" />
            </Muscle>

            {/* Abductors — outer hip / gluteus medius */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M28,110 C25,113 24,118 25,124 C26,129 29,132 33,131 C36,130 37,126 37,120 C37,115 35,110 32,108 Z" />
              <path className="muscle-shape" d="M72,110 C75,113 76,118 75,124 C74,129 71,132 67,131 C64,130 63,126 63,120 C63,115 65,110 68,108 Z" />
            </Muscle>

            {/* Hamstrings */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M35,146 C32,149 31,155 31,163 C31,171 33,179 36,182 C38,184 41,183 43,181 C45,178 46,172 46,163 C46,154 44,147 41,145 Z" />
              <path className="muscle-shape" d="M65,146 C68,149 69,155 69,163 C69,171 67,179 64,182 C62,184 59,183 57,181 C55,178 54,172 54,163 C54,154 56,147 59,145 Z" />
            </Muscle>

            {/* Calves — inverted heart (two-headed gastrocnemius) */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              {/* Left calf */}
              <path className="muscle-shape" d="M33,182 C31,184 30,188 31,193 C32,197 35,199 38,199 C40,199 42,197 42,194 C43,191 42,186 40,183 C38,181 36,180 34,181 Z" />
              <path className="muscle-shape" d="M43,182 C45,184 46,188 45,193 C44,197 41,199 39,199 C38,199 38,197 38,194 C38,191 39,186 41,183 Z" />
              {/* Right calf */}
              <path className="muscle-shape" d="M57,182 C55,184 54,188 55,193 C56,197 59,199 62,199 C64,199 66,197 66,194 C67,191 66,186 64,183 C62,181 60,180 58,181 Z" />
              <path className="muscle-shape" d="M67,182 C69,184 70,188 69,193 C68,197 65,199 63,199 C62,199 62,197 62,194 C62,191 63,186 65,183 Z" />
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
