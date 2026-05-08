import { X } from 'lucide-react';

/*
  Image: /muscle-map.png — 1536×1024px
  Front view = left half (x:0–768, figure center x≈456)
  Back view  = right half (x:768–1536, figure center x≈264 in right-half coords)
  SVG viewBox="0 0 768 1024" for both panels.

  All overlay coordinates derived from pixel-level analysis of the PNG.
  ClipPaths prevent overlays from spilling into white background gaps.
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

        {/* ── FRONT VIEW ── figure center x≈456 */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Front</span>
          <svg viewBox={`0 0 ${VW} ${VH}`} className="muscle-svg">
            <defs>
              {/*
                ClipPath: union of body-shaped primitives.
                Prevents overlay shapes from extending into white background.
                Derived from pixel-row body contour analysis.
              */}
              <clipPath id="frontBodyClip">
                {/* Head */}
                <ellipse cx="455" cy="77" rx="47" ry="55" />
                {/* Neck */}
                <rect x="416" y="126" width="80" height="52" rx="8" />
                {/*
                  Main body outline: shoulders → arms → torso → legs
                  Key pixel bounds per row:
                  y=225: x=318-594 (shoulders)
                  y=350: arm L x=302-350 | gap | torso x=372-538 | gap | arm R x=561-611
                  y=525: arm L x=236-301 | torso x=357-553 | arm R x=611-676
                  y=600: legs x=361-446 | x=465-549
                */}
                <path d="
                  M316,185 C290,195 278,218 278,390
                  L242,462 L240,548 L248,620
                  L358,638 L358,652 L437,652 L437,840
                  L468,840 L468,652 L548,652 L548,638
                  L620,620 L628,548 L626,462
                  L590,390 C590,218 578,195 554,185 Z
                " />
                {/* Legs — explicit rects to catch full height */}
                <rect x="355" y="636" width="88" height="350" rx="20" />
                <rect x="462" y="636" width="88" height="350" rx="20" />
              </clipPath>
            </defs>

            <image href={IMG} x="0" y="0" width={VW * 2} height={VH} style={{ pointerEvents: 'none' }} />

            {/* All muscle overlays clipped to body silhouette */}
            <g clipPath="url(#frontBodyClip)">

              {/* Traps — visible front: small bridge at neck/clavicle */}
              <Muscle name="Traps" selected={selected} onToggle={toggle}>
                <path className="muscle-shape" d="M415,142 C430,136 445,133 456,133 C467,133 482,136 497,142 C514,150 524,166 518,183 C510,198 490,206 456,210 C422,206 401,198 393,183 C387,166 398,150 415,142 Z" />
              </Muscle>

              {/* Shoulders — anterior deltoid caps */}
              <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="344" cy="255" rx="28" ry="52" />
                <ellipse className="muscle-shape" cx="562" cy="255" rx="28" ry="52" />
              </Muscle>

              {/* Chest — two pectoral fans split at sternum (x=456) */}
              <Muscle name="Chest" selected={selected} onToggle={toggle}>
                <path className="muscle-shape" d="M456,248 C446,242 425,240 405,244 C378,250 362,268 360,294 C358,320 370,350 390,366 C410,378 438,382 456,378 Z" />
                <path className="muscle-shape" d="M456,248 C466,242 487,240 507,244 C534,250 550,268 552,294 C554,320 542,350 522,366 C502,378 474,382 456,378 Z" />
              </Muscle>

              {/* Biceps — front of upper arm */}
              <Muscle name="Biceps" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="310" cy="418" rx="28" ry="46" />
                <ellipse className="muscle-shape" cx="600" cy="418" rx="28" ry="46" />
              </Muscle>

              {/* Forearms — elbow to wrist */}
              <Muscle name="Forearms" selected={selected} onToggle={toggle}>
                {/* Pixel bounds: L x=245-297, R x=616-671 at y=460-540 */}
                <ellipse className="muscle-shape" cx="271" cy="524" rx="26" ry="56" />
                <ellipse className="muscle-shape" cx="643" cy="524" rx="26" ry="56" />
              </Muscle>

              {/* Core — abs block + obliques (CRITICAL: obliques now inside torso x=366-538) */}
              <Muscle name="Core" selected={selected} onToggle={toggle}>
                {/* Left oblique — torso left edge: cx=382, x=368-396 (inside x=366-538) */}
                <ellipse className="muscle-shape" cx="382" cy="462" rx="14" ry="52" />
                {/* Right oblique — torso right edge: cx=526, x=512-540 (inside x=366-538) */}
                <ellipse className="muscle-shape" cx="526" cy="462" rx="14" ry="52" />
                {/* Abs six-block */}
                <rect className="muscle-shape" x="385" y="385" width="142" height="155" rx="14" />
              </Muscle>

              {/* Quadriceps — front of thigh: L x=373-436 (cx=404), R x=475-537 (cx=506) */}
              <Muscle name="Quadriceps" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="405" cy="730" rx="30" ry="95" />
                <ellipse className="muscle-shape" cx="506" cy="730" rx="30" ry="95" />
              </Muscle>

              {/* Adductors — inner thigh, in gap x=437-474 between quads */}
              <Muscle name="Adductors" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="446" cy="720" rx="10" ry="70" />
                <ellipse className="muscle-shape" cx="463" cy="720" rx="10" ry="70" />
              </Muscle>

              {/* Calves — shin/lower leg front: L x=383-427, R x=484-528 */}
              <Muscle name="Calves" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="405" cy="900" rx="22" ry="55" />
                <ellipse className="muscle-shape" cx="506" cy="900" rx="22" ry="55" />
              </Muscle>

            </g>
          </svg>
        </div>

        {/* ── BACK VIEW ── figure center x≈264 (right half coords) */}
        <div className="muscle-body-col">
          <span className="muscle-body-label">Back</span>
          <svg viewBox={`0 0 ${VW} ${VH}`} className="muscle-svg">
            <defs>
              {/*
                Back view pixel bounds per row:
                y=225: x=123-405 (shoulders)
                y=350: arm L x=107-155 | gap | lat L x=180-251 | spine | lat R x=278-348 | gap | arm R x=373-421
                y=525: arm L x=43-107 | torso x=164-364 | arm R x=421-486
                y=600: legs x=167-255 | x=273-361
              */}
              <clipPath id="backBodyClip">
                {/* Head */}
                <ellipse cx="267" cy="77" rx="44" ry="55" />
                {/* Neck */}
                <rect x="220" y="126" width="94" height="52" rx="8" />
                {/* Main body outline */}
                <path d="
                  M115,185 C90,200 80,222 80,385
                  L46,462 L46,548 L54,622
                  L168,638 L168,652 L248,652 L248,840
                  L278,840 L278,652 L358,652 L358,638
                  L475,622 L484,548 L484,462
                  L450,385 C450,222 438,200 415,185 Z
                " />
                {/* Legs */}
                <rect x="163" y="636" width="91" height="350" rx="20" />
                <rect x="270" y="636" width="94" height="350" rx="20" />
              </clipPath>
            </defs>

            {/* Shift -768 to reveal right half of image */}
            <image href={IMG} x={-VW} y="0" width={VW * 2} height={VH} style={{ pointerEvents: 'none' }} />

            <g clipPath="url(#backBodyClip)">

              {/* Traps — large kite from neck to mid-back */}
              <Muscle name="Traps" selected={selected} onToggle={toggle}>
                <path className="muscle-shape" d="M264,142 C220,146 168,162 140,190 C120,210 118,240 135,264 C152,288 196,304 264,308 C332,304 376,288 393,264 C410,240 408,210 388,190 C360,162 308,146 264,142 Z" />
              </Muscle>

              {/* Shoulders — rear deltoid caps: L cx≈150, R cx≈378 at y=175-240 */}
              <Muscle name="Shoulders" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="155" cy="255" rx="34" ry="50" />
                <ellipse className="muscle-shape" cx="372" cy="255" rx="34" ry="50" />
              </Muscle>

              {/* Upper Back — rhomboids between shoulder blades */}
              <Muscle name="Upper Back" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="264" cy="316" rx="74" ry="60" />
              </Muscle>

              {/*
                Lats — CRITICAL FIX:
                Pixel analysis: lat L = x=180-249 at y=380-460; lat R = x=279-348
                Old paths were centered at x=128/396 (white arm/gap area) — now corrected.
              */}
              <Muscle name="Lats" selected={selected} onToggle={toggle}>
                <path className="muscle-shape" d="M192,315 C175,332 162,365 155,405 C148,442 152,488 165,518 C176,540 192,546 206,532 C220,516 224,474 222,426 C220,376 210,338 192,315 Z" />
                <path className="muscle-shape" d="M332,315 C349,332 362,365 369,405 C376,442 372,488 359,518 C348,540 332,546 318,532 C304,516 300,474 302,426 C304,376 316,338 332,315 Z" />
              </Muscle>

              {/* Lower Back — erector spinae: torso center x=164-363, cy=460-620 */}
              <Muscle name="Lower Back" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="264" cy="506" rx="80" ry="62" />
              </Muscle>

              {/* Triceps — back of upper arm: L x=87-147 (cx=117), R x=389-442 (cx=416) */}
              <Muscle name="Triceps" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="117" cy="420" rx="28" ry="44" />
                <ellipse className="muscle-shape" cx="416" cy="420" rx="26" ry="44" />
              </Muscle>

              {/* Forearms — back view lower arm: L x=49-116 (cx=82), R x=412-481 (cx=447) */}
              <Muscle name="Forearms" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="82" cy="520" rx="30" ry="55" />
                <ellipse className="muscle-shape" cx="447" cy="520" rx="30" ry="55" />
              </Muscle>

              {/* Glutes — two gluteus maximus: L x=177-245 (cx=211), R x=278-351 (cx=315) */}
              <Muscle name="Glutes" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="211" cy="644" rx="34" ry="58" />
                <ellipse className="muscle-shape" cx="315" cy="644" rx="36" ry="58" />
              </Muscle>

              {/* Abductors — outer hip / TFL: L x=46-87 (cx=66), R x=427-483 (cx=455) */}
              <Muscle name="Abductors" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="80" cy="578" rx="26" ry="40" />
                <ellipse className="muscle-shape" cx="448" cy="578" rx="26" ry="40" />
              </Muscle>

              {/* Hamstrings — back of thigh: L x=177-245 (cx=211), R x=278-351 (cx=315) */}
              <Muscle name="Hamstrings" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="211" cy="730" rx="32" ry="96" />
                <ellipse className="muscle-shape" cx="315" cy="730" rx="34" ry="96" />
              </Muscle>

              {/* Calves — gastrocnemius: L x=192-235 (cx=213), R x=292-334 (cx=313) */}
              <Muscle name="Calves" selected={selected} onToggle={toggle}>
                <ellipse className="muscle-shape" cx="213" cy="898" rx="22" ry="55" />
                <ellipse className="muscle-shape" cx="313" cy="898" rx="22" ry="55" />
              </Muscle>

            </g>
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
