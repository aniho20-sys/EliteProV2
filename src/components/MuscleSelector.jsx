import { X } from 'lucide-react';

/*
  Body structure (viewBox 0 0 100 200):
  Each limb = one closed path (not two disconnected ellipses).
  Torso = single tapered path. Head = ellipse + neck.
  Muscle regions overlay on top with stroke borders for definition.
*/

function BodyOutline() {
  return (
    <g className="muscle-body-shape">
      {/* Head */}
      <ellipse cx="50" cy="11" rx="8.5" ry="10.5" />
      {/* Neck */}
      <path d="M46,20 L46,27 L54,27 L54,20 Q52,19 50,19 Q48,19 46,20 Z" />
      {/* Torso: wide shoulders → narrow waist → medium hips */}
      <path d="M50,26 C43,25 36,26 31,29 C27,31 26,35 26,43 L26,75 C26,83 28,93 30,102 C32,108 33,112 34,115 L66,115 C67,112 68,108 70,102 C72,93 74,83 74,75 L74,43 C74,35 73,31 69,29 C64,26 57,25 50,26 Z" />
      {/* Left arm: shoulder → upper arm → forearm → hand as one shape */}
      <path d="M27,34 C21,32 15,36 13,43 C11,50 11,60 13,68 C14,71 17,73 20,72 C20,76 19,83 19,90 C19,97 21,103 24,105 C26,106 28,104 29,101 C30,97 28,89 28,82 C29,74 31,67 33,63 C35,58 35,50 33,44 C30,38 28,35 27,34 Z" />
      {/* Right arm */}
      <path d="M73,34 C79,32 85,36 87,43 C89,50 89,60 87,68 C86,71 83,73 80,72 C80,76 81,83 81,90 C81,97 79,103 76,105 C74,106 72,104 71,101 C70,97 72,89 72,82 C71,74 69,67 67,63 C65,58 65,50 67,44 C70,38 72,35 73,34 Z" />
      {/* Left leg: hip → thigh → knee → calf → foot as one shape */}
      <path d="M31,115 C28,118 27,126 27,135 C27,146 29,157 33,165 C33,170 34,176 34,183 C34,190 36,195 40,198 C42,199 44,200 47,200 C49,200 49,200 49,200 C48,200 47,200 46,200 C43,200 41,198 40,195 C39,191 40,184 41,178 C42,171 44,165 45,161 C47,154 48,146 48,136 C48,126 47,119 47,115 C46,115 44,115 40,115 C37,115 34,115 31,115 Z" />
      {/* Right leg */}
      <path d="M69,115 C72,118 73,126 73,135 C73,146 71,157 67,165 C67,170 66,176 66,183 C66,190 64,195 60,198 C58,199 56,200 53,200 C51,200 51,200 51,200 C52,200 53,200 54,200 C57,200 59,198 60,195 C61,191 60,184 59,178 C58,171 56,165 55,161 C53,154 52,146 52,136 C52,126 53,119 53,115 C54,115 56,115 60,115 C63,115 66,115 69,115 Z" />
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

            {/* Chest – 2 fan shapes divided at sternum */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,33 C46,32 40,33 35,37 C30,40 29,46 30,52 C31,56 35,59 41,60 C45,61 48,61 50,60 Z" />
              <path className="muscle-shape" d="M50,33 C54,32 60,33 65,37 C70,40 71,46 70,52 C69,56 65,59 59,60 C55,61 52,61 50,60 Z" />
            </Muscle>

            {/* Traps – V at neck/shoulder (front) */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M46,27 C42,28 37,32 34,38 L50,45 L66,38 C63,32 58,28 54,27 Z" />
            </Muscle>

            {/* Shoulders – front deltoids (cap of arm) */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M27,34 C21,32 15,36 13,43 C11,48 12,54 16,57 C19,59 23,57 26,53 C29,48 29,41 27,34 Z" />
              <path className="muscle-shape" d="M73,34 C79,32 85,36 87,43 C89,48 88,54 84,57 C81,59 77,57 74,53 C71,48 71,41 73,34 Z" />
            </Muscle>

            {/* Biceps – front of upper arm, below deltoid */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M14,53 C12,57 11,62 13,68 C14,71 17,73 20,72 C23,71 25,68 25,63 C25,58 23,54 20,53 Z" />
              <path className="muscle-shape" d="M86,53 C88,57 89,62 87,68 C86,71 83,73 80,72 C77,71 75,68 75,63 C75,58 77,54 80,53 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M13,69 C11,73 11,80 12,87 C13,92 16,96 20,95 C23,94 25,90 25,85 C25,79 23,72 20,69 Z" />
              <path className="muscle-shape" d="M87,69 C89,73 89,80 88,87 C87,92 84,96 80,95 C77,94 75,90 75,85 C75,79 77,72 80,69 Z" />
            </Muscle>

            {/* Core – 6-pack abs + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M33,61 C30,64 29,71 30,78 C30,85 33,91 36,94 C38,96 40,95 41,91 C42,86 41,78 39,71 Z" />
              <path className="muscle-shape" d="M67,61 C70,64 71,71 70,78 C70,85 67,91 64,94 C62,96 60,95 59,91 C58,86 59,78 61,71 Z" />
              <rect className="muscle-shape" x="42" y="62" width="7.5" height="8" rx="2" />
              <rect className="muscle-shape" x="50.5" y="62" width="7.5" height="8" rx="2" />
              <rect className="muscle-shape" x="42" y="72" width="7.5" height="8" rx="2" />
              <rect className="muscle-shape" x="50.5" y="72" width="7.5" height="8" rx="2" />
              <rect className="muscle-shape" x="42" y="82" width="7.5" height="8" rx="2" />
              <rect className="muscle-shape" x="50.5" y="82" width="7.5" height="8" rx="2" />
            </Muscle>

            {/* Quadriceps – front of thigh + vastus medialis teardrop */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M32,116 C29,119 28,127 28,136 C28,147 30,158 34,165 C36,168 39,169 42,167 C45,164 46,158 46,149 C46,139 44,128 41,120 C39,117 36,115 32,116 Z" />
              <path className="muscle-shape" d="M40,163 C38,166 38,171 40,173 C42,175 45,174 46,171 C47,168 46,165 44,163 Z" />
              <path className="muscle-shape" d="M68,116 C71,119 72,127 72,136 C72,147 70,158 66,165 C64,168 61,169 58,167 C55,164 54,158 54,149 C54,139 56,128 59,120 C61,117 64,115 68,116 Z" />
              <path className="muscle-shape" d="M60,163 C62,166 62,171 60,173 C58,175 55,174 54,171 C53,168 54,165 56,163 Z" />
            </Muscle>

            {/* Adductors – inner thigh */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M48,115 C46,119 45,127 45,136 C45,145 46,154 48,161 C49,164 50,164 50,164 L50,115 Z" />
              <path className="muscle-shape" d="M52,115 C54,119 55,127 55,136 C55,145 54,154 52,161 C51,164 50,164 50,164 L50,115 Z" />
            </Muscle>

          </svg>
        </div>

        {/* ── BACK VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox="0 0 100 200" className="muscle-svg">
            <BodyOutline />

            {/* Trapezius – kite from neck to mid-back */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,26 C58,26 67,29 72,37 C76,44 75,53 68,59 C62,63 56,65 50,65 C44,65 38,63 32,59 C25,53 24,44 28,37 C33,29 42,26 50,26 Z" />
            </Muscle>

            {/* Shoulders – rear deltoids */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M27,34 C21,32 15,36 13,43 C11,48 12,54 16,57 C19,59 23,57 26,53 C29,48 29,41 27,34 Z" />
              <path className="muscle-shape" d="M73,34 C79,32 85,36 87,43 C89,48 88,54 84,57 C81,59 77,57 74,53 C71,48 71,41 73,34 Z" />
            </Muscle>

            {/* Lats – wide fan from armpit to lower waist */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M28,48 C24,53 23,63 23,73 C23,84 25,96 29,103 C32,108 37,109 41,105 C45,100 47,90 48,78 C48,66 47,55 43,49 Z" />
              <path className="muscle-shape" d="M72,48 C76,53 77,63 77,73 C77,84 75,96 71,103 C68,108 63,109 59,105 C55,100 53,90 52,78 C52,66 53,55 57,49 Z" />
            </Muscle>

            {/* Upper Back – rhomboids */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M42,61 C39,64 39,69 40,74 C41,78 45,80 50,80 C55,80 59,78 60,74 C61,69 61,64 58,61 C55,58 52,57 50,57 C48,57 45,58 42,61 Z" />
            </Muscle>

            {/* Lower Back – erector spinae */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M43,100 C40,103 39,108 39,113 C39,119 42,123 46,124 C48,125 50,125 50,125 C50,125 52,125 54,124 C58,123 61,119 61,113 C61,108 60,103 57,100 C54,97 52,96 50,96 C48,96 46,97 43,100 Z" />
            </Muscle>

            {/* Triceps – back of upper arm */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M14,44 C12,49 11,57 13,65 C14,69 17,72 20,71 C23,70 25,66 25,61 C25,55 23,49 20,46 Z" />
              <path className="muscle-shape" d="M86,44 C88,49 89,57 87,65 C86,69 83,72 80,71 C77,70 75,66 75,61 C75,55 77,49 80,46 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M13,69 C11,73 11,80 12,87 C13,92 16,96 20,95 C23,94 25,90 25,85 C25,79 23,72 20,69 Z" />
              <path className="muscle-shape" d="M87,69 C89,73 89,80 88,87 C87,92 84,96 80,95 C77,94 75,90 75,85 C75,79 77,72 80,69 Z" />
            </Muscle>

            {/* Glutes – two rounded gluteus maximus */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M33,114 C29,117 28,124 29,132 C30,139 34,145 39,146 C43,147 47,144 49,139 C50,135 50,128 49,121 C47,115 43,113 39,113 C36,113 34,113 33,114 Z" />
              <path className="muscle-shape" d="M67,114 C71,117 72,124 71,132 C70,139 66,145 61,146 C57,147 53,144 51,139 C50,135 50,128 51,121 C53,115 57,113 61,113 C64,113 66,113 67,114 Z" />
            </Muscle>

            {/* Abductors – outer hip / gluteus medius */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M28,110 C25,114 24,121 25,128 C26,134 30,137 34,136 C37,135 38,131 38,125 C38,118 36,111 32,109 Z" />
              <path className="muscle-shape" d="M72,110 C75,114 76,121 75,128 C74,134 70,137 66,136 C63,135 62,131 62,125 C62,118 64,111 68,109 Z" />
            </Muscle>

            {/* Hamstrings – back of thigh */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M32,116 C29,119 28,127 28,136 C28,147 30,158 34,165 C36,168 39,169 42,167 C45,164 46,158 46,149 C46,139 44,128 41,120 C39,117 36,115 32,116 Z" />
              <path className="muscle-shape" d="M68,116 C71,119 72,127 72,136 C72,147 70,158 66,165 C64,168 61,169 58,167 C55,164 54,158 54,149 C54,139 56,128 59,120 C61,117 64,115 68,116 Z" />
            </Muscle>

            {/* Calves – two-headed gastrocnemius */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M34,166 C31,169 30,176 31,183 C32,189 36,194 40,193 C43,192 44,189 44,184 C44,178 42,171 39,166 Z" />
              <path className="muscle-shape" d="M45,167 C47,171 47,178 46,184 C45,189 43,193 41,193 C40,191 40,185 41,179 C42,173 44,168 45,167 Z" />
              <path className="muscle-shape" d="M55,167 C53,171 53,178 54,184 C55,189 57,193 59,193 C60,191 60,185 59,179 C58,173 56,168 55,167 Z" />
              <path className="muscle-shape" d="M66,166 C69,169 70,176 69,183 C68,189 64,194 60,193 C57,192 56,189 56,184 C56,178 58,171 61,166 Z" />
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
