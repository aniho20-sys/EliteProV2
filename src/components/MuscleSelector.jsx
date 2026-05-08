import { X } from 'lucide-react';

/*
  Image: /muscle-map.png — 1536×1024px, front view left half (0-768), back view right half (768-1536).
  Each SVG uses viewBox="0 0 768 1024".
  Front: image at x=0 shows left half.
  Back:  image at x=-768 shifts it left, revealing right half.
  Overlay paths are transparent; hover = light blue, active = solid blue.
*/

const IMG = '/muscle-map.png';
const VW = 768;
const VH = 1024;

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
          <svg viewBox={`0 0 ${VW} ${VH}`} className="muscle-svg">
            <image href={IMG} x="0" y="0" width={VW * 2} height={VH} style={{ pointerEvents: 'none' }} />

            {/* Traps — small V at neck/collar */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M358,168 C342,175 320,188 304,213 L384,243 L463,213 C446,188 423,175 408,168 Z" />
            </Muscle>

            {/* Shoulders — front deltoid caps */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="152" cy="262" rx="60" ry="68" />
              <ellipse className="muscle-shape" cx="614" cy="262" rx="60" ry="68" />
            </Muscle>

            {/* Chest — two pectorals */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M384,228 C358,222 302,228 268,258 C243,283 240,330 254,366 C269,397 316,410 384,410 Z" />
              <path className="muscle-shape" d="M384,228 C410,222 464,228 498,258 C523,283 526,330 512,366 C497,397 450,410 384,410 Z" />
            </Muscle>

            {/* Biceps */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="147" cy="415" rx="50" ry="76" />
              <ellipse className="muscle-shape" cx="619" cy="415" rx="50" ry="76" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="128" cy="548" rx="44" ry="76" />
              <ellipse className="muscle-shape" cx="637" cy="548" rx="44" ry="76" />
            </Muscle>

            {/* Core — abs + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              {/* Left oblique */}
              <ellipse className="muscle-shape" cx="234" cy="492" rx="52" ry="95" />
              {/* Right oblique */}
              <ellipse className="muscle-shape" cx="532" cy="492" rx="52" ry="95" />
              {/* Abs 6-block area */}
              <rect className="muscle-shape" x="304" y="408" width="158" height="200" rx="18" />
            </Muscle>

            {/* Quadriceps */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="280" cy="722" rx="82" ry="105" />
              <ellipse className="muscle-shape" cx="486" cy="722" rx="82" ry="105" />
            </Muscle>

            {/* Adductors — inner thigh */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="352" cy="712" rx="40" ry="90" />
              <ellipse className="muscle-shape" cx="414" cy="712" rx="40" ry="90" />
            </Muscle>

          </svg>
        </div>

        {/* ── BACK VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox={`0 0 ${VW} ${VH}`} className="muscle-svg">
            {/* Shift image -768 to reveal right half */}
            <image href={IMG} x={-VW} y="0" width={VW * 2} height={VH} style={{ pointerEvents: 'none' }} />

            {/* Trapezius — large kite covering upper back */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M384,168 C432,168 514,190 543,234 C558,270 546,324 510,358 C474,384 430,394 384,394 C336,394 292,384 256,358 C220,324 208,270 222,234 C252,190 334,168 384,168 Z" />
            </Muscle>

            {/* Shoulders — rear deltoids */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="152" cy="262" rx="60" ry="68" />
              <ellipse className="muscle-shape" cx="614" cy="262" rx="60" ry="68" />
            </Muscle>

            {/* Lats — wide fans, armpit to lower back */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M196,300 C155,325 130,380 130,438 C130,500 148,552 174,580 C194,602 224,606 254,585 C278,566 290,522 292,462 C294,402 284,346 266,310 Z" />
              <path className="muscle-shape" d="M570,300 C612,325 636,380 636,438 C636,500 618,552 592,580 C572,602 542,606 512,585 C488,566 476,522 474,462 C472,402 482,346 500,310 Z" />
            </Muscle>

            {/* Upper Back — rhomboids */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="384" cy="302" rx="92" ry="68" />
            </Muscle>

            {/* Lower Back — erector spinae */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="384" cy="498" rx="74" ry="72" />
            </Muscle>

            {/* Triceps — back of upper arm */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="147" cy="415" rx="50" ry="76" />
              <ellipse className="muscle-shape" cx="619" cy="415" rx="50" ry="76" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="128" cy="548" rx="44" ry="76" />
              <ellipse className="muscle-shape" cx="637" cy="548" rx="44" ry="76" />
            </Muscle>

            {/* Glutes — two large rounded shapes */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="300" cy="670" rx="98" ry="84" />
              <ellipse className="muscle-shape" cx="466" cy="670" rx="98" ry="84" />
            </Muscle>

            {/* Abductors — outer hip */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="192" cy="638" rx="58" ry="70" />
              <ellipse className="muscle-shape" cx="574" cy="638" rx="58" ry="70" />
            </Muscle>

            {/* Hamstrings */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="282" cy="728" rx="82" ry="105" />
              <ellipse className="muscle-shape" cx="484" cy="728" rx="82" ry="105" />
            </Muscle>

            {/* Calves */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="270" cy="898" rx="64" ry="80" />
              <ellipse className="muscle-shape" cx="492" cy="898" rx="64" ry="80" />
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
