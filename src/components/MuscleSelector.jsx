import { X } from 'lucide-react';

/*
  Body proportions (viewBox 0 0 100 200):
  Head:    cy=11, ry=10.5
  Neck:    y=21-28
  Torso:   y=27-112, wide at shoulders (x28-72), narrow at waist (x37-63), hip (x33-67)
  Upper arm: cx=19/81, cy=47, rx=6.5, ry=14
  Forearm:   cx=17/83, cy=79, rx=5.5, ry=12
  Thigh:     cx=40/60, cy=136, rx=9, ry=24
  Calf:      cx=39/61, cy=174, rx=7, ry=16
*/

function BodyOutline({ view }) {
  const isBack = view === 'back';
  return (
    <g className="muscle-body-shape">
      {/* Head — blank oval, no features */}
      <ellipse cx="50" cy="11" rx="8.5" ry="10.5" />

      {/* Neck */}
      <rect x="45.5" y="21" width="9" height="8" rx="2.5" />

      {/* Torso — V-taper: wide shoulders, narrow waist, medium hips */}
      <path d={
        isBack
          ? 'M50,25 C43,25 35,26 29,29 C25,31 24,35 24,42 L24,72 C24,80 26,88 29,97 C31,104 32,108 33,112 L67,112 C68,108 69,104 71,97 C74,88 76,80 76,72 L76,42 C76,35 75,31 71,29 C65,26 57,25 50,25 Z'
          : 'M50,25 C43,25 35,26 30,29 C26,31 25,35 25,42 L25,72 C25,80 27,88 30,97 C32,104 33,108 34,112 L66,112 C67,108 68,104 70,97 C73,88 75,80 75,72 L75,42 C75,35 74,31 70,29 C65,26 57,25 50,25 Z'
      } />

      {/* Upper arms */}
      <ellipse cx="19" cy="47" rx="6.5" ry="14" />
      <ellipse cx="81" cy="47" rx="6.5" ry="14" />

      {/* Forearms */}
      <ellipse cx="17" cy="79" rx="5.5" ry="12" />
      <ellipse cx="83" cy="79" rx="5.5" ry="12" />

      {/* Hands */}
      <ellipse cx="16" cy="96" rx="4.5" ry="5" />
      <ellipse cx="84" cy="96" rx="4.5" ry="5" />

      {/* Thighs */}
      <ellipse cx="40" cy="136" rx="9" ry="24" />
      <ellipse cx="60" cy="136" rx="9" ry="24" />

      {/* Lower legs */}
      <ellipse cx="39" cy="174" rx="7" ry="16" />
      <ellipse cx="61" cy="174" rx="7" ry="16" />

      {/* Feet */}
      <ellipse cx="38" cy="193" rx="8" ry="5" />
      <ellipse cx="62" cy="193" rx="8" ry="5" />
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

            {/* Chest — 2 fan shapes meeting at sternum */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,32 C46,31 40,32 35,36 C30,39 29,45 30,51 C31,55 35,58 41,59 C45,60 48,60 50,59 Z" />
              <path className="muscle-shape" d="M50,32 C54,31 60,32 65,36 C70,39 71,45 70,51 C69,55 65,58 59,59 C55,60 52,60 50,59 Z" />
            </Muscle>

            {/* Traps — small V visible at neck/shoulder from front */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M46,26 C42,27 37,31 34,36 L50,43 L66,36 C63,31 58,27 54,26 Z" />
            </Muscle>

            {/* Shoulders — front deltoids, teardrop cap */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M28,28 C23,27 17,31 15,37 C13,43 14,50 18,53 C22,55 26,53 28,48 C31,43 31,34 28,28 Z" />
              <path className="muscle-shape" d="M72,28 C77,27 83,31 85,37 C87,43 86,50 82,53 C78,55 74,53 72,48 C69,43 69,34 72,28 Z" />
            </Muscle>

            {/* Biceps — lower half of upper arm */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M13,50 C12,53 12,58 13,63 C14,67 17,70 21,69 C24,68 26,65 26,60 C26,55 24,50 20,48 Z" />
              <path className="muscle-shape" d="M87,50 C88,53 88,58 87,63 C86,67 83,70 79,69 C76,68 74,65 74,60 C74,55 76,50 80,48 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M12,67 C11,71 11,77 12,83 C13,88 16,92 19,91 C22,90 23,86 23,81 C23,75 21,69 18,67 Z" />
              <path className="muscle-shape" d="M88,67 C89,71 89,77 88,83 C87,88 84,92 81,91 C78,90 77,86 77,81 C77,75 79,69 82,67 Z" />
            </Muscle>

            {/* Core — 6-block abs + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              {/* Left oblique */}
              <path className="muscle-shape" d="M33,59 C30,62 29,68 30,74 C30,80 33,86 36,89 C38,91 40,90 41,87 C42,83 41,75 39,68 Z" />
              {/* Right oblique */}
              <path className="muscle-shape" d="M67,59 C70,62 71,68 70,74 C70,80 67,86 64,89 C62,91 60,90 59,87 C58,83 59,75 61,68 Z" />
              {/* Abs: 3 rows × 2 cols */}
              <rect className="muscle-shape" x="42" y="60" width="7.5" height="8.5" rx="2" />
              <rect className="muscle-shape" x="50.5" y="60" width="7.5" height="8.5" rx="2" />
              <rect className="muscle-shape" x="42" y="70.5" width="7.5" height="8.5" rx="2" />
              <rect className="muscle-shape" x="50.5" y="70.5" width="7.5" height="8.5" rx="2" />
              <rect className="muscle-shape" x="42" y="81" width="7.5" height="8.5" rx="2" />
              <rect className="muscle-shape" x="50.5" y="81" width="7.5" height="8.5" rx="2" />
            </Muscle>

            {/* Quadriceps — front of thigh + vastus medialis teardrop */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              {/* Left quad body */}
              <path className="muscle-shape" d="M33,114 C30,117 29,125 29,133 C29,143 31,153 35,159 C37,162 40,163 43,161 C46,158 47,151 47,142 C47,132 45,122 42,115 Z" />
              {/* Left vastus medialis teardrop */}
              <path className="muscle-shape" d="M36,157 C34,160 35,165 37,167 C39,169 42,168 43,165 C44,162 43,158 41,157 Z" />
              {/* Right quad body */}
              <path className="muscle-shape" d="M67,114 C70,117 71,125 71,133 C71,143 69,153 65,159 C63,162 60,163 57,161 C54,158 53,151 53,142 C53,132 55,122 58,115 Z" />
              {/* Right vastus medialis teardrop */}
              <path className="muscle-shape" d="M64,157 C66,160 65,165 63,167 C61,169 58,168 57,165 C56,162 57,158 59,157 Z" />
            </Muscle>

            {/* Adductors — inner thigh strip */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M48,113 C46,116 45,123 45,132 C45,141 46,150 48,157 C49,160 50,160 50,160 C50,160 51,160 52,157 C54,150 55,141 55,132 C55,123 54,116 52,113 C51,112 50,112 50,112 C50,112 49,112 48,113 Z" />
            </Muscle>

          </svg>
        </div>

        {/* ── BACK VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox="0 0 100 200" className="muscle-svg">
            <BodyOutline view="back" />

            {/* Trapezius — large kite from neck to mid-back */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,25 C58,25 67,28 72,36 C76,43 74,52 68,58 C62,62 56,64 50,64 C44,64 38,62 32,58 C26,52 24,43 28,36 C33,28 42,25 50,25 Z" />
            </Muscle>

            {/* Shoulders — rear deltoids */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M28,28 C23,27 17,31 15,37 C13,43 14,50 18,53 C22,55 26,53 28,48 C31,43 31,34 28,28 Z" />
              <path className="muscle-shape" d="M72,28 C77,27 83,31 85,37 C87,43 86,50 82,53 C78,55 74,53 72,48 C69,43 69,34 72,28 Z" />
            </Muscle>

            {/* Lats — wide fan from armpit to lower waist */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M31,48 C27,53 25,62 25,72 C25,83 27,93 31,99 C34,103 38,104 42,100 C46,95 48,86 48,75 C48,64 47,53 43,48 Z" />
              <path className="muscle-shape" d="M69,48 C73,53 75,62 75,72 C75,83 73,93 69,99 C66,103 62,104 58,100 C54,95 52,86 52,75 C52,64 53,53 57,48 Z" />
            </Muscle>

            {/* Upper Back — rhomboids between shoulder blades */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M42,58 C39,61 39,66 40,71 C41,75 45,77 50,77 C55,77 59,75 60,71 C61,66 61,61 58,58 C55,55 52,54 50,54 C48,54 45,55 42,58 Z" />
            </Muscle>

            {/* Lower Back — erector spinae */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M43,97 C40,100 39,105 39,110 C39,116 42,120 46,121 C48,122 50,122 50,122 C50,122 52,122 54,121 C58,120 61,116 61,110 C61,105 60,100 57,97 C54,94 52,93 50,93 C48,93 46,94 43,97 Z" />
            </Muscle>

            {/* Triceps — back of upper arm */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M13,50 C12,53 12,58 13,63 C14,67 17,70 21,69 C24,68 26,65 26,60 C26,55 24,50 20,48 Z" />
              <path className="muscle-shape" d="M87,50 C88,53 88,58 87,63 C86,67 83,70 79,69 C76,68 74,65 74,60 C74,55 76,50 80,48 Z" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M12,67 C11,71 11,77 12,83 C13,88 16,92 19,91 C22,90 23,86 23,81 C23,75 21,69 18,67 Z" />
              <path className="muscle-shape" d="M88,67 C89,71 89,77 88,83 C87,88 84,92 81,91 C78,90 77,86 77,81 C77,75 79,69 82,67 Z" />
            </Muscle>

            {/* Glutes — two rounded gluteus maximus shapes */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M33,112 C29,115 28,122 29,130 C30,137 34,143 39,144 C43,145 47,142 49,137 C50,133 50,127 49,120 C47,113 43,110 39,109 C36,108 34,110 33,112 Z" />
              <path className="muscle-shape" d="M67,112 C71,115 72,122 71,130 C70,137 66,143 61,144 C57,145 53,142 51,137 C50,133 50,127 51,120 C53,113 57,110 61,109 C64,108 66,110 67,112 Z" />
            </Muscle>

            {/* Abductors — outer hip / gluteus medius */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M27,108 C24,112 24,119 25,126 C26,131 30,134 34,133 C37,132 38,128 38,122 C38,115 36,109 32,107 Z" />
              <path className="muscle-shape" d="M73,108 C76,112 76,119 75,126 C74,131 70,134 66,133 C63,132 62,128 62,122 C62,115 64,109 68,107 Z" />
            </Muscle>

            {/* Hamstrings — back of thigh */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M33,114 C30,117 29,125 29,133 C29,143 31,153 35,159 C37,162 40,163 43,161 C46,158 47,151 47,142 C47,132 45,122 42,115 Z" />
              <path className="muscle-shape" d="M67,114 C70,117 71,125 71,133 C71,143 69,153 65,159 C63,162 60,163 57,161 C54,158 53,151 53,142 C53,132 55,122 58,115 Z" />
            </Muscle>

            {/* Calves — two-headed gastrocnemius */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              {/* Left medial head */}
              <path className="muscle-shape" d="M32,161 C29,164 28,170 29,177 C30,183 34,188 38,188 C41,188 43,185 43,181 C44,176 42,169 40,163 Z" />
              {/* Left lateral head */}
              <path className="muscle-shape" d="M44,163 C46,167 46,173 45,179 C44,184 42,188 40,188 C39,186 39,182 40,177 C41,171 43,165 44,163 Z" />
              {/* Right medial head */}
              <path className="muscle-shape" d="M56,163 C54,167 54,173 55,179 C56,184 58,188 60,188 C61,186 61,182 60,177 C59,171 57,165 56,163 Z" />
              {/* Right lateral head */}
              <path className="muscle-shape" d="M68,161 C71,164 72,170 71,177 C70,183 66,188 62,188 C59,188 57,185 57,181 C56,176 58,169 60,163 Z" />
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
