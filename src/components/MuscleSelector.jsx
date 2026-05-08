import { X } from 'lucide-react';

/*
  Image: /muscle-map.png — 1536×1024px
  Front view = left half (x:0–768), Back view = right half (x:768–1536).
  SVG viewBox="0 0 768 1024" for both panels.
  Front: image at x=0 shows left half (figure center x≈456).
  Back:  image at x=-768 shifts left, showing right half (figure center x≈264).
  Overlay paths are transparent; hover = blue tint, active = solid blue.

  All coordinates derived from pixel-level analysis of the actual PNG.
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

        {/* ── FRONT VIEW ── figure center x≈456, spans x=229–684 */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Front</span>
          <svg viewBox={`0 0 ${VW} ${VH}`} className="muscle-svg">
            <image href={IMG} x="0" y="0" width={VW * 2} height={VH} style={{ pointerEvents: 'none' }} />

            {/* Traps — visible front: small bridge across neck/clavicle */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M413,145 C428,138 445,135 456,135 C467,135 483,138 498,145 C514,152 524,168 518,185 C510,200 490,208 456,212 C422,208 401,200 393,185 C387,168 398,152 413,145 Z" />
            </Muscle>

            {/* Shoulders — front deltoid caps, outer edges of chest band */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              {/* Left deltoid */}
              <ellipse className="muscle-shape" cx="338" cy="290" rx="42" ry="68" />
              {/* Right deltoid */}
              <ellipse className="muscle-shape" cx="574" cy="290" rx="42" ry="68" />
            </Muscle>

            {/* Chest — two pectoral fans, split at sternum (x=456) */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              {/* Left pec */}
              <path className="muscle-shape" d="M456,248 C446,242 425,240 405,244 C378,250 362,268 360,294 C358,320 370,350 390,366 C410,378 438,382 456,378 Z" />
              {/* Right pec */}
              <path className="muscle-shape" d="M456,248 C466,242 487,240 507,244 C534,250 550,268 552,294 C554,320 542,350 522,366 C502,378 474,382 456,378 Z" />
            </Muscle>

            {/* Biceps — front of upper arm */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="308" cy="418" rx="32" ry="48" />
              <ellipse className="muscle-shape" cx="602" cy="418" rx="32" ry="48" />
            </Muscle>

            {/* Forearms — lower arm, elbow to wrist */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="275" cy="524" rx="33" ry="58" />
              <ellipse className="muscle-shape" cx="638" cy="524" rx="33" ry="58" />
            </Muscle>

            {/* Core — abs six-block + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              {/* Left oblique */}
              <ellipse className="muscle-shape" cx="346" cy="462" rx="24" ry="56" />
              {/* Right oblique */}
              <ellipse className="muscle-shape" cx="566" cy="462" rx="24" ry="56" />
              {/* Abs block */}
              <rect className="muscle-shape" x="380" y="385" width="152" height="155" rx="14" />
            </Muscle>

            {/* Quadriceps — front of thigh */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="405" cy="730" rx="38" ry="100" />
              <ellipse className="muscle-shape" cx="505" cy="730" rx="38" ry="100" />
            </Muscle>

            {/* Adductors — inner thigh, slim wedge between quads */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="446" cy="700" rx="14" ry="78" />
              <ellipse className="muscle-shape" cx="463" cy="700" rx="14" ry="78" />
            </Muscle>

            {/* Calves — partially visible from front (shins/lower leg) */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="405" cy="908" rx="26" ry="54" />
              <ellipse className="muscle-shape" cx="504" cy="908" rx="26" ry="54" />
            </Muscle>

          </svg>
        </div>

        {/* ── BACK VIEW ── figure center x≈264, spans x=35–493 (right half coords) */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox={`0 0 ${VW} ${VH}`} className="muscle-svg">
            {/* Shift -768 to reveal right half of image */}
            <image href={IMG} x={-VW} y="0" width={VW * 2} height={VH} style={{ pointerEvents: 'none' }} />

            {/* Traps — large kite from neck to mid-back center */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M264,145 C220,148 168,162 140,190 C120,210 118,240 135,266 C152,290 196,306 264,310 C332,306 376,290 393,266 C410,240 408,210 388,190 C360,162 308,148 264,145 Z" />
            </Muscle>

            {/* Shoulders — rear deltoid caps */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="150" cy="288" rx="45" ry="62" />
              <ellipse className="muscle-shape" cx="378" cy="288" rx="45" ry="62" />
            </Muscle>

            {/* Upper Back — rhomboids between shoulder blades */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="264" cy="322" rx="82" ry="68" />
            </Muscle>

            {/* Lats — wide fans, armpit to lower back */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              {/* Left lat */}
              <path className="muscle-shape" d="M195,310 C168,325 140,356 128,400 C118,440 122,490 138,520 C152,545 172,550 192,534 C212,516 220,470 218,420 C216,372 208,334 195,310 Z" />
              {/* Right lat */}
              <path className="muscle-shape" d="M333,310 C360,325 388,356 400,400 C410,440 406,490 390,520 C376,545 356,550 336,534 C316,516 308,470 310,420 C312,372 320,334 333,310 Z" />
            </Muscle>

            {/* Lower Back — erector spinae */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="264" cy="506" rx="88" ry="68" />
            </Muscle>

            {/* Triceps — back of upper arm */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="117" cy="420" rx="32" ry="46" />
              <ellipse className="muscle-shape" cx="411" cy="420" rx="32" ry="46" />
            </Muscle>

            {/* Forearms — back view lower arm */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="82" cy="528" rx="36" ry="58" />
              <ellipse className="muscle-shape" cx="447" cy="528" rx="36" ry="58" />
            </Muscle>

            {/* Glutes — two gluteus maximus, split at midline */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="211" cy="644" rx="50" ry="62" />
              <ellipse className="muscle-shape" cx="316" cy="644" rx="50" ry="62" />
            </Muscle>

            {/* Abductors — outer hip / TFL, beside glutes */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="76" cy="578" rx="30" ry="44" />
              <ellipse className="muscle-shape" cx="452" cy="578" rx="30" ry="44" />
            </Muscle>

            {/* Hamstrings — back of thigh */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="211" cy="730" rx="38" ry="100" />
              <ellipse className="muscle-shape" cx="315" cy="730" rx="38" ry="100" />
            </Muscle>

            {/* Calves — gastrocnemius, back of lower leg */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="213" cy="905" rx="26" ry="54" />
              <ellipse className="muscle-shape" cx="313" cy="905" rx="26" ry="54" />
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
