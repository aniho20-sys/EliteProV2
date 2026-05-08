import { X } from 'lucide-react';

/*
  Pure-SVG body model — no PNG dependency.
  viewBox: 0 0 120 280 (center x=60)

  Proportions (athletic figure):
  - Head: 24px wide, 30px tall (cy=17)
  - Shoulder span: ~64px outer-to-outer (deltoid centres at cx=32/88)
  - Trunk: 38px at chest, 36px waist (y=110), 38px hip (y=138)
  - Gap between thighs: 8px (x=56–64)
  - Upper arms: 12px wide; Forearms: 10px wide
  - Thighs: 15px wide each; Calves: 13px wide each
*/

const W = 120;
const H = 280;

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

function BodySilhouette() {
  return (
    <g className="body-silhouette" aria-hidden="true">
      {/* Head */}
      <ellipse cx="60" cy="17" rx="12" ry="15" />
      {/* Neck */}
      <rect x="55" y="30" width="10" height="18" rx="5" />
      {/* Trunk: shoulder → chest → waist taper → hip */}
      <path d="M41,46 C33,48 32,56 33,62 C35,72 38,84 40,96 C41,108 44,122 41,138 L79,138 C76,122 79,108 80,96 C82,84 85,72 87,62 C88,56 87,48 79,46 Z" />
      {/* Deltoid caps */}
      <ellipse cx="32" cy="55" rx="9" ry="12" />
      <ellipse cx="88" cy="55" rx="9" ry="12" />
      {/* Gluteal flare (wider than trunk at hip) */}
      <ellipse cx="48" cy="150" rx="10" ry="22" />
      <ellipse cx="72" cy="150" rx="10" ry="22" />
      {/* Upper arms */}
      <rect x="26" y="58" width="12" height="56" rx="6" />
      <rect x="82" y="58" width="12" height="56" rx="6" />
      {/* Forearms */}
      <rect x="27" y="116" width="10" height="42" rx="5" />
      <rect x="83" y="116" width="10" height="42" rx="5" />
      {/* Thighs (8px gap at centre) */}
      <rect x="41" y="136" width="15" height="70" rx="6" />
      <rect x="64" y="136" width="15" height="70" rx="6" />
      {/* Calves */}
      <rect x="42" y="208" width="13" height="48" rx="5" />
      <rect x="65" y="208" width="13" height="48" rx="5" />
      {/* Feet */}
      <ellipse cx="49" cy="260" rx="8" ry="5" />
      <ellipse cx="71" cy="260" rx="8" ry="5" />
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
          <svg viewBox={`0 0 ${W} ${H}`} className="muscle-svg">
            <BodySilhouette />

            {/* Traps — small clavicle strip */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,30 Q60,28 70,30 L75,46 Q60,43 45,46 Z" />
            </Muscle>

            {/* Shoulders — anterior deltoid */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="32" cy="55" rx="8" ry="10" />
              <ellipse className="muscle-shape" cx="88" cy="55" rx="8" ry="10" />
            </Muscle>

            {/* Chest — two pec fans split at sternum */}
            <Muscle name="Chest" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M44,48 Q52,46 60,46 L60,78 Q50,82 42,74 Q37,66 38,56 Q40,50 44,48 Z" />
              <path className="muscle-shape" d="M60,46 Q68,46 76,48 Q80,50 82,56 Q83,66 78,74 Q70,82 60,78 Z" />
            </Muscle>

            {/* Biceps */}
            <Muscle name="Biceps" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="28" y="64" width="9" height="44" rx="4" />
              <rect className="muscle-shape" x="83" y="64" width="9" height="44" rx="4" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="28" y="118" width="8" height="38" rx="4" />
              <rect className="muscle-shape" x="84" y="118" width="8" height="38" rx="4" />
            </Muscle>

            {/* Core — abs + obliques */}
            <Muscle name="Core" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="47" y="78" width="26" height="52" rx="6" />
              <path className="muscle-shape" d="M41,84 Q47,82 47,88 L47,132 Q44,134 40,130 Q36,120 36,106 Q36,92 41,84 Z" />
              <path className="muscle-shape" d="M79,84 Q73,82 73,88 L73,132 Q76,134 80,130 Q84,120 84,106 Q84,92 79,84 Z" />
            </Muscle>

            {/* Quadriceps */}
            <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="43" y="140" width="12" height="62" rx="5" />
              <rect className="muscle-shape" x="65" y="140" width="12" height="62" rx="5" />
            </Muscle>

            {/* Adductors — inner thigh */}
            <Muscle name="Adductors" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M55,142 Q60,140 65,142 L63,200 Q60,202 57,200 Z" />
            </Muscle>

            {/* Calves */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="44" y="212" width="10" height="42" rx="4" />
              <rect className="muscle-shape" x="66" y="212" width="10" height="42" rx="4" />
            </Muscle>
          </svg>
        </div>

        {/* ── BACK VIEW ── */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox={`0 0 ${W} ${H}`} className="muscle-svg">
            <BodySilhouette />

            {/* Traps — large kite neck→mid-back */}
            <Muscle name="Traps" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M50,30 Q60,28 70,30 C82,36 90,48 87,62 C82,74 72,80 60,80 C48,80 38,74 33,62 C30,48 38,36 50,30 Z" />
            </Muscle>

            {/* Shoulders — posterior deltoid */}
            <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="32" cy="55" rx="8" ry="10" />
              <ellipse className="muscle-shape" cx="88" cy="55" rx="8" ry="10" />
            </Muscle>

            {/* Upper Back — rhomboids */}
            <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="60" cy="82" rx="16" ry="14" />
            </Muscle>

            {/* Lats — fan from armpit to lower-back */}
            <Muscle name="Lats" selected={selected} onToggle={toggle}>
              <path className="muscle-shape" d="M38,64 C34,76 32,92 33,108 C34,122 38,132 44,134 C48,136 50,130 50,120 C50,106 46,86 44,74 Z" />
              <path className="muscle-shape" d="M82,64 C86,76 88,92 87,108 C86,122 82,132 76,134 C72,136 70,130 70,120 C70,106 74,86 76,74 Z" />
            </Muscle>

            {/* Lower Back — erector spinae */}
            <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="46" y="94" width="28" height="40" rx="6" />
            </Muscle>

            {/* Triceps — back of upper arm */}
            <Muscle name="Triceps" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="28" y="62" width="9" height="46" rx="4" />
              <rect className="muscle-shape" x="83" y="62" width="9" height="46" rx="4" />
            </Muscle>

            {/* Forearms */}
            <Muscle name="Forearms" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="28" y="118" width="8" height="38" rx="4" />
              <rect className="muscle-shape" x="84" y="118" width="8" height="38" rx="4" />
            </Muscle>

            {/* Glutes */}
            <Muscle name="Glutes" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="50" cy="157" rx="9" ry="19" />
              <ellipse className="muscle-shape" cx="70" cy="157" rx="9" ry="19" />
            </Muscle>

            {/* Abductors — outer hip */}
            <Muscle name="Abductors" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="44" cy="140" rx="6" ry="11" />
              <ellipse className="muscle-shape" cx="76" cy="140" rx="6" ry="11" />
            </Muscle>

            {/* Hamstrings */}
            <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
              <rect className="muscle-shape" x="43" y="178" width="12" height="26" rx="5" />
              <rect className="muscle-shape" x="65" y="178" width="12" height="26" rx="5" />
            </Muscle>

            {/* Calves — gastrocnemius */}
            <Muscle name="Calves" selected={selected} onToggle={toggle}>
              <ellipse className="muscle-shape" cx="49" cy="230" rx="5" ry="16" />
              <ellipse className="muscle-shape" cx="71" cy="230" rx="5" ry="16" />
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
