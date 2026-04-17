import { useState } from 'react';
import { X } from 'lucide-react';

const VB_W = 120, VB_H = 290;

const SILHOUETTE = [
  { type: 'circle', cx: 60, cy: 18, r: 13 },
  { type: 'rect', x: 54, y: 30, width: 12, height: 10, rx: 2 },
  { type: 'path', d: 'M30 40 L90 40 L84 148 L36 148 Z' },
  { type: 'rect', x: 8,  y: 44, width: 18, height: 70, rx: 8 },
  { type: 'rect', x: 94, y: 44, width: 18, height: 70, rx: 8 },
  { type: 'rect', x: 10, y: 117, width: 14, height: 46, rx: 6 },
  { type: 'rect', x: 96, y: 117, width: 14, height: 46, rx: 6 },
  { type: 'rect', x: 33, y: 148, width: 24, height: 74, rx: 10 },
  { type: 'rect', x: 63, y: 148, width: 24, height: 74, rx: 10 },
  { type: 'rect', x: 35, y: 224, width: 20, height: 54, rx: 8 },
  { type: 'rect', x: 65, y: 224, width: 20, height: 54, rx: 8 },
];

const FRONT_MUSCLES = [
  { id: 'Chest', shapes: [
    { type: 'rect', x: 36, y: 44, width: 48, height: 30, rx: 4 },
  ]},
  { id: 'Shoulders', shapes: [
    { type: 'ellipse', cx: 17,  cy: 60, rx: 10, ry: 13 },
    { type: 'ellipse', cx: 103, cy: 60, rx: 10, ry: 13 },
  ]},
  { id: 'Biceps', shapes: [
    { type: 'ellipse', cx: 17,  cy: 84, rx: 8, ry: 15 },
    { type: 'ellipse', cx: 103, cy: 84, rx: 8, ry: 15 },
  ]},
  { id: 'Forearms', shapes: [
    { type: 'ellipse', cx: 17,  cy: 136, rx: 6, ry: 18 },
    { type: 'ellipse', cx: 103, cy: 136, rx: 6, ry: 18 },
  ]},
  { id: 'Core', shapes: [
    { type: 'rect', x: 38, y: 76, width: 44, height: 50, rx: 4 },
  ]},
  { id: 'Quadriceps', shapes: [
    { type: 'ellipse', cx: 45, cy: 185, rx: 11, ry: 24 },
    { type: 'ellipse', cx: 75, cy: 185, rx: 11, ry: 24 },
  ]},
  { id: 'Calves', shapes: [
    { type: 'ellipse', cx: 45, cy: 248, rx: 9, ry: 20 },
    { type: 'ellipse', cx: 75, cy: 248, rx: 9, ry: 20 },
  ]},
];

const BACK_MUSCLES = [
  { id: 'Traps', shapes: [
    { type: 'path', d: 'M34 44 L86 44 L78 66 L42 66 Z' },
  ]},
  { id: 'Shoulders', shapes: [
    { type: 'ellipse', cx: 17,  cy: 60, rx: 10, ry: 13 },
    { type: 'ellipse', cx: 103, cy: 60, rx: 10, ry: 13 },
  ]},
  { id: 'Upper Back', shapes: [
    { type: 'rect', x: 38, y: 68, width: 44, height: 24, rx: 4 },
  ]},
  { id: 'Lats', shapes: [
    { type: 'ellipse', cx: 30, cy: 100, rx: 11, ry: 24 },
    { type: 'ellipse', cx: 90, cy: 100, rx: 11, ry: 24 },
  ]},
  { id: 'Lower Back', shapes: [
    { type: 'rect', x: 40, y: 106, width: 40, height: 26, rx: 4 },
  ]},
  { id: 'Triceps', shapes: [
    { type: 'ellipse', cx: 17,  cy: 84, rx: 8, ry: 15 },
    { type: 'ellipse', cx: 103, cy: 84, rx: 8, ry: 15 },
  ]},
  { id: 'Forearms', shapes: [
    { type: 'ellipse', cx: 17,  cy: 136, rx: 6, ry: 18 },
    { type: 'ellipse', cx: 103, cy: 136, rx: 6, ry: 18 },
  ]},
  { id: 'Glutes', shapes: [
    { type: 'ellipse', cx: 45, cy: 158, rx: 12, ry: 14 },
    { type: 'ellipse', cx: 75, cy: 158, rx: 12, ry: 14 },
  ]},
  { id: 'Hamstrings', shapes: [
    { type: 'ellipse', cx: 45, cy: 194, rx: 11, ry: 20 },
    { type: 'ellipse', cx: 75, cy: 194, rx: 11, ry: 20 },
  ]},
  { id: 'Calves', shapes: [
    { type: 'ellipse', cx: 45, cy: 250, rx: 9, ry: 18 },
    { type: 'ellipse', cx: 75, cy: 250, rx: 9, ry: 18 },
  ]},
];

function Shape({ def, ...props }) {
  if (def.type === 'circle')  return <circle cx={def.cx} cy={def.cy} r={def.r} {...props} />;
  if (def.type === 'ellipse') return <ellipse cx={def.cx} cy={def.cy} rx={def.rx} ry={def.ry} {...props} />;
  if (def.type === 'rect')    return <rect x={def.x} y={def.y} width={def.width} height={def.height} rx={def.rx || 0} {...props} />;
  if (def.type === 'path')    return <path d={def.d} {...props} />;
  return null;
}

export default function MuscleSelector({ selected = [], onChange }) {
  const [view, setView]     = useState('front');
  const [hovered, setHovered] = useState(null);

  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(m => m !== id) : [...selected, id]);
  };

  return (
    <div className="muscle-selector">
      <div className="muscle-view-tabs">
        <button type="button" className={`muscle-tab${view === 'front' ? ' active' : ''}`} onClick={() => setView('front')}>Front</button>
        <button type="button" className={`muscle-tab${view === 'back'  ? ' active' : ''}`} onClick={() => setView('back')}>Back</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="120" style={{ display: 'block', overflow: 'visible' }}>
          <g style={{ pointerEvents: 'none' }}>
            {SILHOUETTE.map((s, i) => (
              <Shape key={i} def={s} fill="var(--bg-input)" stroke="var(--border)" strokeWidth="1.5" />
            ))}
          </g>

          {muscles.map(muscle => {
            const isSel = selected.includes(muscle.id);
            const isHov = hovered === muscle.id;
            return (
              <g
                key={muscle.id}
                onClick={() => toggle(muscle.id)}
                onMouseEnter={() => setHovered(muscle.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {muscle.shapes.map((shape, si) => (
                  <Shape
                    key={si}
                    def={shape}
                    fill={isSel || isHov ? 'var(--primary)' : 'transparent'}
                    fillOpacity={isSel ? 0.45 : isHov ? 0.2 : 0}
                    stroke={isSel || isHov ? 'var(--primary)' : 'var(--text-muted)'}
                    strokeWidth={isSel ? 2 : 1.5}
                    strokeOpacity={isSel || isHov ? 1 : 0.35}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="muscle-hover-label" style={{ visibility: hovered ? 'visible' : 'hidden' }}>
        {hovered || '\u00a0'}
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
