import { useState } from 'react';
import { X } from 'lucide-react';

const VB_W = 160, VB_H = 378;

// ── Silhouette ──────────────────────────────────────────────────────────────
const SILHOUETTE = [
  { type: 'circle', cx: 80, cy: 22, r: 18 },
  { type: 'path', d: 'M74,38 Q80,34 86,38 L87,52 Q80,49 73,52 Z' },
  { type: 'path', d: 'M26,55 C13,70 11,92 11,150 C11,164 21,171 29,173 L31,188 C35,212 50,222 58,230 L58,234 Q69,238 80,238 Q91,238 102,234 L102,230 C110,222 125,212 129,188 L131,173 C139,171 149,164 149,150 C149,92 147,70 134,55 Q107,61 80,61 Q53,61 26,55 Z' },
  { type: 'path', d: 'M10,59 C3,74 1,95 1,129 C1,137 6,141 11,141 L11,95 L11,61 Z' },
  { type: 'path', d: 'M150,59 C157,74 159,95 159,129 C159,137 154,141 149,141 L149,95 L149,61 Z' },
  { type: 'path', d: 'M1,134 C-1,151 2,169 6,187 C8,192 12,193 14,192 L14,171 L12,145 L10,136 Z' },
  { type: 'path', d: 'M159,134 C161,151 158,169 154,187 C152,192 148,193 146,192 L146,171 L148,145 L150,136 Z' },
  { type: 'path', d: 'M27,236 L57,236 Q60,256 59,283 L55,309 Q52,317 43,317 Q34,317 31,309 L27,283 Q25,256 27,236 Z' },
  { type: 'path', d: 'M103,236 L133,236 Q135,256 134,283 L130,309 Q127,317 118,317 Q109,317 106,309 L102,283 Q100,256 103,236 Z' },
  { type: 'path', d: 'M29,312 Q25,331 27,357 L31,374 Q35,380 43,380 Q51,380 55,374 L59,357 Q61,331 57,312 Q51,318 43,318 Q35,318 29,312 Z' },
  { type: 'path', d: 'M103,312 Q99,331 101,357 L105,374 Q109,380 117,380 Q125,380 129,374 L133,357 Q135,331 131,312 Q125,318 117,318 Q109,318 103,312 Z' },
];

// ── Anatomy detail lines (non-interactive, always visible) ──────────────────
const ANATOMY_FRONT = [
  'M80,55 L80,105',                              // sternum
  'M80,106 L80,174',                             // linea alba
  'M50,118 Q80,115 110,118',                     // abs band 1
  'M46,134 Q80,131 114,134',                     // abs band 2
  'M44,150 Q80,147 116,150',                     // abs band 3
  'M44,166 Q80,163 116,166',                     // abs band 4
  'M28,106 Q55,113 80,110 Q105,113 132,106',     // pec lower edge
  'M35,112 Q30,126 33,136',                      // serratus L
  'M36,126 Q29,140 32,148',
  'M125,112 Q130,126 127,136',                   // serratus R
  'M124,126 Q131,140 128,148',
  'M44,174 Q36,194 40,224',                      // inguinal L
  'M116,174 Q124,194 120,224',                   // inguinal R
  'M43,242 L43,310',                             // quad center L
  'M117,242 L117,310',                           // quad center R
  'M37,300 Q41,310 44,316',                      // VMO L
  'M123,300 Q119,310 116,316',                   // VMO R
  'M43,320 L43,358',                             // calf center L
  'M117,320 L117,358',                           // calf center R
];

const ANATOMY_BACK = [
  'M80,55 L80,174',                              // spine
  'M42,73 Q51,76 63,75',                         // scapula spine L (top)
  'M63,75 Q61,97 56,116',                        // scapula border L
  'M118,73 Q109,76 97,75',                       // scapula spine R
  'M97,75 Q99,97 104,116',                       // scapula border R
  'M44,86 Q52,83 63,84',                         // infraspinatus L
  'M116,86 Q108,83 97,84',                       // infraspinatus R
  'M80,132 L50,154 L80,174 L110,154 Z',         // thoracolumbar fascia
  'M56,234 Q80,239 104,234',                     // glute crease
  'M43,246 L43,308',                             // hamstring sep L
  'M117,246 L117,308',                           // hamstring sep R
  'M43,320 L43,360',                             // calf center L
  'M117,320 L117,360',                           // calf center R
];

// ── Front muscles ───────────────────────────────────────────────────────────
const FRONT_MUSCLES = [
  {
    id: 'Chest',
    shapes: [
      { type: 'path', d: 'M26,61 C21,76 22,96 28,107 C38,114 58,114 80,107 L80,64 C57,58 40,57 26,61 Z' },
      { type: 'path', d: 'M134,61 C139,76 138,96 132,107 C122,114 102,114 80,107 L80,64 C103,58 120,57 134,61 Z' },
    ],
  },
  {
    id: 'Shoulders',
    shapes: [
      { type: 'path', d: 'M11,61 C3,75 1,95 1,118 L1,122 C5,128 11,126 11,120 L11,95 L11,62 Z' },
      { type: 'path', d: 'M149,61 C157,75 159,95 159,118 L159,122 C155,128 149,126 149,120 L149,95 L149,62 Z' },
    ],
  },
  {
    id: 'Biceps',
    shapes: [
      { type: 'path', d: 'M1,120 Q-1,132 1,142 L11,142 L11,120 Z' },
      { type: 'path', d: 'M159,120 Q161,132 159,142 L149,142 L149,120 Z' },
    ],
  },
  {
    id: 'Forearms',
    shapes: [
      { type: 'path', d: 'M1,144 Q-1,160 3,177 L7,193 Q10,197 14,196 L14,176 L12,152 L10,146 Z' },
      { type: 'path', d: 'M159,144 Q161,160 157,177 L153,193 Q150,197 146,196 L146,176 L148,152 L150,146 Z' },
    ],
  },
  {
    id: 'Core',
    shapes: [
      { type: 'path', d: 'M36,107 L124,107 Q133,124 133,152 Q131,170 122,175 L38,175 Q29,170 27,152 Q27,124 36,107 Z' },
    ],
  },
  {
    id: 'Quadriceps',
    shapes: [
      { type: 'path', d: 'M27,237 L57,237 Q60,257 59,284 L55,310 Q52,317 43,317 Q34,317 31,310 L27,284 Q25,257 27,237 Z' },
      { type: 'path', d: 'M103,237 L133,237 Q135,257 134,284 L130,310 Q127,317 118,317 Q109,317 106,310 L102,284 Q100,257 103,237 Z' },
    ],
  },
  {
    id: 'Calves',
    shapes: [
      { type: 'path', d: 'M29,313 Q25,333 27,359 L31,376 Q35,381 43,381 Q51,381 55,376 L59,359 Q61,333 57,313 Q51,318 43,318 Q35,318 29,313 Z' },
      { type: 'path', d: 'M103,313 Q99,333 101,359 L105,376 Q109,381 117,381 Q125,381 129,376 L133,359 Q135,333 131,313 Q125,318 117,318 Q109,318 103,313 Z' },
    ],
  },
];

// ── Back muscles ────────────────────────────────────────────────────────────
const BACK_MUSCLES = [
  {
    id: 'Traps',
    shapes: [
      { type: 'path', d: 'M30,57 Q40,49 80,49 Q120,49 130,57 L118,74 Q80,70 42,74 Z' },
    ],
  },
  {
    id: 'Shoulders',
    shapes: [
      { type: 'path', d: 'M11,61 C3,75 1,95 1,118 L1,122 C5,128 11,126 11,120 L11,95 L11,62 Z' },
      { type: 'path', d: 'M149,61 C157,75 159,95 159,118 L159,122 C155,128 149,126 149,120 L149,95 L149,62 Z' },
    ],
  },
  {
    id: 'Upper Back',
    shapes: [
      { type: 'path', d: 'M34,74 L126,74 Q133,91 131,118 L29,118 Q27,91 34,74 Z' },
    ],
  },
  {
    id: 'Lats',
    shapes: [
      { type: 'path', d: 'M11,97 L30,99 Q37,128 37,158 L26,175 Q12,168 11,156 Z' },
      { type: 'path', d: 'M149,97 L130,99 Q123,128 123,158 L134,175 Q148,168 149,156 Z' },
    ],
  },
  {
    id: 'Lower Back',
    shapes: [
      { type: 'path', d: 'M37,120 L123,120 Q131,136 131,154 Q129,170 120,176 L40,176 Q31,170 29,154 Q29,136 37,120 Z' },
    ],
  },
  {
    id: 'Triceps',
    shapes: [
      { type: 'path', d: 'M1,120 Q-1,132 1,142 L11,142 L11,120 Z' },
      { type: 'path', d: 'M159,120 Q161,132 159,142 L149,142 L149,120 Z' },
    ],
  },
  {
    id: 'Forearms',
    shapes: [
      { type: 'path', d: 'M1,144 Q-1,160 3,177 L7,193 Q10,197 14,196 L14,176 L12,152 L10,146 Z' },
      { type: 'path', d: 'M159,144 Q161,160 157,177 L153,193 Q150,197 146,196 L146,176 L148,152 L150,146 Z' },
    ],
  },
  {
    id: 'Glutes',
    shapes: [
      { type: 'path', d: 'M27,176 L75,176 Q79,192 77,210 Q73,226 56,229 Q37,227 29,212 Q25,196 27,176 Z' },
      { type: 'path', d: 'M85,176 L133,176 Q135,196 131,212 Q123,227 104,229 Q87,226 83,210 Q81,192 85,176 Z' },
    ],
  },
  {
    id: 'Hamstrings',
    shapes: [
      { type: 'path', d: 'M29,232 L57,232 Q60,254 59,280 L55,307 Q52,314 43,315 Q34,315 31,307 L27,280 Q25,254 29,232 Z' },
      { type: 'path', d: 'M103,232 L131,232 Q134,254 133,280 L129,307 Q126,314 117,315 Q108,315 105,307 L101,280 Q99,254 103,232 Z' },
    ],
  },
  {
    id: 'Calves',
    shapes: [
      { type: 'path', d: 'M29,310 Q25,330 27,357 L31,374 Q35,380 43,380 Q51,380 55,374 L59,357 Q61,330 57,310 Q51,316 43,316 Q35,316 29,310 Z' },
      { type: 'path', d: 'M103,310 Q99,330 101,357 L105,374 Q109,380 117,380 Q125,380 129,374 L133,357 Q135,330 131,310 Q125,316 117,316 Q109,316 103,310 Z' },
    ],
  },
];

function Shape({ def, ...props }) {
  if (def.type === 'circle')  return <circle cx={def.cx} cy={def.cy} r={def.r} {...props} />;
  if (def.type === 'ellipse') return <ellipse cx={def.cx} cy={def.cy} rx={def.rx} ry={def.ry} {...props} />;
  if (def.type === 'rect')    return <rect x={def.x} y={def.y} width={def.width} height={def.height} rx={def.rx || 0} {...props} />;
  if (def.type === 'path')    return <path d={def.d} {...props} />;
  return null;
}

function BodySVG({ uid, muscles, anatomyLines, selected, hovered, onToggle, onHover }) {
  const selId = `ms-sel-${uid}`;
  const hovId = `ms-hov-${uid}`;
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id={selId} cx="45%" cy="28%" r="68%">
          <stop offset="0%"   stopColor="#6db8ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1a6fd4" stopOpacity="0.7" />
        </radialGradient>
        <radialGradient id={hovId} cx="45%" cy="28%" r="68%">
          <stop offset="0%"   stopColor="#6db8ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1a6fd4" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Silhouette base */}
      <g style={{ pointerEvents: 'none' }}>
        {SILHOUETTE.map((s, i) => (
          <Shape key={i} def={s} fill="var(--bg-input)" stroke="var(--text-muted)" strokeWidth="1.2" strokeOpacity="0.6" />
        ))}
      </g>

      {/* Interactive muscle regions */}
      {muscles.map(muscle => {
        const isSel = selected.includes(muscle.id);
        const isHov = hovered === muscle.id;
        return (
          <g
            key={muscle.id}
            onClick={() => onToggle(muscle.id)}
            onMouseEnter={() => onHover(muscle.id)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'pointer' }}
          >
            {muscle.shapes.map((shape, si) => (
              <Shape
                key={si}
                def={shape}
                fill={isSel ? `url(#${selId})` : isHov ? `url(#${hovId})` : 'transparent'}
                stroke={isSel ? '#1a6fd4' : isHov ? '#6db8ff' : 'var(--text-muted)'}
                strokeWidth={isSel ? 2 : 1.1}
                strokeOpacity={isSel || isHov ? 1 : 0.5}
              />
            ))}
          </g>
        );
      })}

      {/* Anatomy detail lines */}
      <g style={{ pointerEvents: 'none' }}>
        {anatomyLines.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--text-muted)" strokeWidth="0.8" strokeOpacity="0.5" />
        ))}
      </g>
    </svg>
  );
}

export default function MuscleSelector({ selected = [], onChange }) {
  const [hovered, setHovered] = useState(null);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(m => m !== id) : [...selected, id]);
  };

  return (
    <div className="muscle-selector">
      <div className="muscle-bodies">
        <div className="muscle-body-col">
          <div className="muscle-body-label">Front</div>
          <BodySVG uid="f" muscles={FRONT_MUSCLES} anatomyLines={ANATOMY_FRONT} selected={selected} hovered={hovered} onToggle={toggle} onHover={setHovered} />
        </div>
        <div className="muscle-body-col">
          <div className="muscle-body-label">Back</div>
          <BodySVG uid="b" muscles={BACK_MUSCLES} anatomyLines={ANATOMY_BACK} selected={selected} hovered={hovered} onToggle={toggle} onHover={setHovered} />
        </div>
      </div>

      <div className="muscle-hover-label" style={{ visibility: hovered ? 'visible' : 'hidden' }}>
        {hovered || ' '}
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
