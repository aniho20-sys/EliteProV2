import { useState } from 'react';
import { X } from 'lucide-react';

const VB_W = 160, VB_H = 378;

// Human body silhouette — smooth bezier paths
const SILHOUETTE = [
  { type: 'circle', cx: 80, cy: 21, r: 16 },
  { type: 'path', d: 'M75,35 Q80,32 85,35 L85,48 Q80,45 75,48 Z' },
  { type: 'path', d: 'M27,56 C14,70 12,92 12,150 C12,163 22,169 30,171 L32,186 C36,210 50,220 56,228 L56,231 Q68,235 80,235 Q92,235 104,231 L104,228 C110,220 124,210 128,186 L130,171 C138,169 148,163 148,150 C148,92 146,70 133,56 C108,62 80,62 Q52,62 27,56 Z' },
  { type: 'path', d: 'M10,59 C3,73 2,93 2,127 C2,134 7,137 12,137 L12,93 L12,61 Z' },
  { type: 'path', d: 'M150,59 C157,73 158,93 158,127 C158,134 153,137 148,137 L148,93 L148,61 Z' },
  { type: 'path', d: 'M2,131 C0,147 2,164 6,181 C8,186 12,187 14,186 L14,165 L12,141 L10,133 Z' },
  { type: 'path', d: 'M158,131 C160,147 158,164 154,181 C152,186 148,187 146,186 L146,165 L148,141 L150,133 Z' },
  { type: 'path', d: 'M28,233 L56,233 Q59,252 58,278 L54,303 Q51,310 42,310 Q33,310 30,303 L26,278 Q25,252 28,233 Z' },
  { type: 'path', d: 'M104,233 L132,233 Q135,252 134,278 L130,303 Q127,310 118,310 Q109,310 106,303 L102,278 Q101,252 104,233 Z' },
  { type: 'path', d: 'M28,306 Q25,324 27,349 L30,367 Q33,373 42,373 Q51,373 54,367 L57,349 Q59,324 56,306 Q51,311 42,311 Q33,311 28,306 Z' },
  { type: 'path', d: 'M104,306 Q101,324 103,349 L106,367 Q109,373 118,373 Q127,373 130,367 L133,349 Q135,324 132,306 Q127,311 118,311 Q109,311 104,306 Z' },
];

const FRONT_MUSCLES = [
  {
    id: 'Chest',
    shapes: [
      { type: 'path', d: 'M27,63 C22,77 22,95 28,105 C36,111 54,111 72,104 L72,66 C54,60 38,59 27,63 Z' },
      { type: 'path', d: 'M133,63 C138,77 138,95 132,105 C124,111 106,111 88,104 L88,66 C106,60 122,59 133,63 Z' },
    ],
  },
  {
    id: 'Shoulders',
    shapes: [
      { type: 'path', d: 'M11,61 C3,74 2,93 2,112 L2,115 C6,120 12,118 12,113 L12,93 L12,62 Z' },
      { type: 'path', d: 'M149,61 C157,74 158,93 158,112 L158,115 C154,120 148,118 148,113 L148,93 L148,62 Z' },
    ],
  },
  {
    id: 'Biceps',
    shapes: [
      { type: 'path', d: 'M2,114 Q0,125 2,134 L12,134 L12,114 Z' },
      { type: 'path', d: 'M158,114 Q160,125 158,134 L148,134 L148,114 Z' },
    ],
  },
  {
    id: 'Forearms',
    shapes: [
      { type: 'path', d: 'M2,136 Q0,151 3,166 L7,182 Q10,187 14,186 L14,166 L12,143 L10,138 Z' },
      { type: 'path', d: 'M158,136 Q160,151 157,166 L153,182 Q150,187 146,186 L146,166 L148,143 L150,138 Z' },
    ],
  },
  {
    id: 'Core',
    shapes: [
      { type: 'path', d: 'M38,106 L122,106 Q130,121 130,149 Q128,165 120,171 L40,171 Q32,165 30,149 Q30,121 38,106 Z' },
    ],
  },
  {
    id: 'Quadriceps',
    shapes: [
      { type: 'path', d: 'M28,234 L56,234 Q59,253 58,279 L54,304 Q51,310 42,310 Q33,310 30,304 L26,279 Q25,253 28,234 Z' },
      { type: 'path', d: 'M104,234 L132,234 Q135,253 134,279 L130,304 Q127,310 118,310 Q109,310 106,304 L102,279 Q101,253 104,234 Z' },
    ],
  },
  {
    id: 'Calves',
    shapes: [
      { type: 'path', d: 'M28,307 Q25,325 27,350 L30,368 Q33,374 42,374 Q51,374 54,368 L57,350 Q59,325 56,307 Q51,311 42,311 Q33,311 28,307 Z' },
      { type: 'path', d: 'M104,307 Q101,325 103,350 L106,368 Q109,374 118,374 Q127,374 130,368 L133,350 Q135,325 132,307 Q127,311 118,311 Q109,311 104,307 Z' },
    ],
  },
];

const BACK_MUSCLES = [
  {
    id: 'Traps',
    shapes: [
      { type: 'path', d: 'M32,58 Q40,50 80,50 Q120,50 128,58 L116,73 Q80,68 44,73 Z' },
    ],
  },
  {
    id: 'Shoulders',
    shapes: [
      { type: 'path', d: 'M11,61 C3,74 2,93 2,112 L2,115 C6,120 12,118 12,113 L12,93 L12,62 Z' },
      { type: 'path', d: 'M149,61 C157,74 158,93 158,112 L158,115 C154,120 148,118 148,113 L148,93 L148,62 Z' },
    ],
  },
  {
    id: 'Upper Back',
    shapes: [
      { type: 'path', d: 'M36,74 L124,74 Q130,88 128,112 L32,112 Q30,88 36,74 Z' },
    ],
  },
  {
    id: 'Lats',
    shapes: [
      { type: 'path', d: 'M12,95 L30,96 Q36,122 36,151 L26,169 Q13,164 12,151 Z' },
      { type: 'path', d: 'M148,95 L130,96 Q124,122 124,151 L134,169 Q147,164 148,151 Z' },
    ],
  },
  {
    id: 'Lower Back',
    shapes: [
      { type: 'path', d: 'M38,114 L122,114 Q128,128 128,149 Q126,165 118,171 L42,171 Q34,165 32,149 Q32,128 38,114 Z' },
    ],
  },
  {
    id: 'Triceps',
    shapes: [
      { type: 'path', d: 'M2,114 Q0,125 2,134 L12,134 L12,114 Z' },
      { type: 'path', d: 'M158,114 Q160,125 158,134 L148,134 L148,114 Z' },
    ],
  },
  {
    id: 'Forearms',
    shapes: [
      { type: 'path', d: 'M2,136 Q0,151 3,166 L7,182 Q10,187 14,186 L14,166 L12,143 L10,138 Z' },
      { type: 'path', d: 'M158,136 Q160,151 157,166 L153,182 Q150,187 146,186 L146,166 L148,143 L150,138 Z' },
    ],
  },
  {
    id: 'Glutes',
    shapes: [
      { type: 'path', d: 'M28,171 L74,171 Q78,185 76,202 Q72,216 56,219 Q38,217 30,203 Q26,188 28,171 Z' },
      { type: 'path', d: 'M86,171 L132,171 Q134,188 130,203 Q122,217 104,219 Q88,216 84,202 Q82,185 86,171 Z' },
    ],
  },
  {
    id: 'Hamstrings',
    shapes: [
      { type: 'path', d: 'M29,222 L56,222 Q59,244 58,270 L54,296 Q51,304 42,304 Q33,304 30,296 L26,270 Q25,244 29,222 Z' },
      { type: 'path', d: 'M104,222 L131,222 Q134,244 133,270 L129,296 Q126,304 117,304 Q108,304 105,296 L101,270 Q100,244 104,222 Z' },
    ],
  },
  {
    id: 'Calves',
    shapes: [
      { type: 'path', d: 'M28,300 Q25,318 27,343 L30,361 Q33,367 42,367 Q51,367 54,361 L57,343 Q59,318 56,300 Q51,305 42,305 Q33,305 28,300 Z' },
      { type: 'path', d: 'M104,300 Q101,318 103,343 L106,361 Q109,367 118,367 Q127,367 130,361 L133,343 Q135,318 132,300 Q127,305 118,305 Q109,305 104,300 Z' },
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

function BodySVG({ muscles, selected, hovered, onToggle, onHover }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id="sel-grad" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="hov-grad" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.1" />
        </radialGradient>
      </defs>

      <g style={{ pointerEvents: 'none' }}>
        {SILHOUETTE.map((s, i) => (
          <Shape key={i} def={s} fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
        ))}
      </g>

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
                fill={isSel ? 'url(#sel-grad)' : isHov ? 'url(#hov-grad)' : 'transparent'}
                stroke={isSel || isHov ? 'var(--primary)' : 'var(--text-muted)'}
                strokeWidth={isSel ? 2 : 1.2}
                strokeOpacity={isSel || isHov ? 1 : 0.3}
              />
            ))}
          </g>
        );
      })}
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
          <BodySVG muscles={FRONT_MUSCLES} selected={selected} hovered={hovered} onToggle={toggle} onHover={setHovered} />
        </div>
        <div className="muscle-body-col">
          <div className="muscle-body-label">Back</div>
          <BodySVG muscles={BACK_MUSCLES} selected={selected} hovered={hovered} onToggle={toggle} onHover={setHovered} />
        </div>
      </div>

      <div className="muscle-hover-label" style={{ visibility: hovered ? 'visible' : 'hidden' }}>
        {hovered || ' '}
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
