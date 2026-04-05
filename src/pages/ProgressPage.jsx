import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

function TrendChart({ stats, metricKey, label, unit, color }) {
  if (stats.length < 2) return null;
  const values = stats.map(s => s[metricKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const w = 280, h = 100, padX = 8, padY = 12;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const points = values.map((v, i) => ({
    x: padX + (i / (values.length - 1)) * chartW,
    y: padY + chartH - ((v - min) / range) * chartH,
  }));

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${points[points.length - 1].x},${h - padY} L${points[0].x},${h - padY} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;

  return (
    <div className="trend-chart-card">
      <div className="trend-chart-header">
        <span className="trend-chart-label">{label}</span>
        <span className="trend-chart-value">
          {last}{unit}
          <span className={`trend-chart-change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="trend-chart-svg">
        <defs>
          <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${metricKey})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? color : 'var(--bg-card)'} stroke={color} strokeWidth="1.5" />
        ))}
      </svg>
      <div className="trend-chart-dates">
        <span>{stats[0].date.slice(5)}</span>
        <span>{stats[stats.length - 1].date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { currentUser, getBodyStats, addBodyStat, deleteBodyStat } = useApp();
  const stats = getBodyStats(currentUser.id);
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ weight: '', bodyFat: '', chest: '', waist: '', arms: '', legs: '' });

  const latestStat = stats[stats.length - 1];
  const firstStat = stats[0];

  const handleAdd = (e) => {
    e.preventDefault();
    addBodyStat(currentUser.id, {
      weight: Number(form.weight), bodyFat: Number(form.bodyFat),
      chest: Number(form.chest), waist: Number(form.waist),
      arms: Number(form.arms), legs: Number(form.legs),
    });
    setForm({ weight: '', bodyFat: '', chest: '', waist: '', arms: '', legs: '' });
    setShowAdd(false);
    toast('Measurement saved');
  };

  const metrics = ['weight', 'bodyFat', 'chest', 'waist', 'arms', 'legs'];
  const labels = { weight: 'Weight', bodyFat: 'Body Fat', chest: 'Chest', waist: 'Waist', arms: 'Arms', legs: 'Legs' };
  const units = { weight: 'kg', bodyFat: '%', chest: 'cm', waist: 'cm', arms: 'cm', legs: 'cm' };
  const colors = {
    weight: '#4361ee', bodyFat: '#ef476f', chest: '#06d6a0',
    waist: '#ffd166', arms: '#118ab2', legs: '#8338ec',
  };

  return (
    <div>
      <div className="page-header progress-header">
        <div>
          <h1 className="page-title">My Progress</h1>
          <p className="page-subtitle">{stats.length} measurements recorded</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={18} /> Add Measurement</button>
      </div>

      {/* Current stats - left aligned */}
      {latestStat && (
        <div className="card mb-16">
          <h3 className="card-title mb-16">Current Stats</h3>
          <div className="body-stats-grid">
            {metrics.map(key => {
              const change = firstStat && stats.length > 1 ? (latestStat[key] - firstStat[key]).toFixed(1) : null;
              return (
                <div key={key} className="body-stat-row">
                  <span className="body-stat-label">{labels[key]}</span>
                  <span className="body-stat-value">{latestStat[key]}{units[key]}</span>
                  {change !== null && (
                    <span className={`body-stat-change ${parseFloat(change) > 0 ? 'positive' : 'negative'}`}>
                      {parseFloat(change) > 0 ? '+' : ''}{change}{units[key]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trend charts */}
      {stats.length > 1 && (
        <div className="card mb-16">
          <h3 className="card-title mb-16">Trend Charts</h3>
          <div className="trend-charts-grid">
            {metrics.map(key => (
              <TrendChart key={key} stats={stats} metricKey={key} label={labels[key]} unit={units[key]} color={colors[key]} />
            ))}
          </div>
        </div>
      )}

      {/* History - table on desktop, cards on mobile */}
      {stats.length > 0 ? (
        <div className="card">
          <h3 className="card-title mb-16">Measurement History</h3>
          {/* Desktop table */}
          <div className="table-wrapper history-table-desktop">
            <table>
              <thead>
                <tr><th>Date</th><th>Weight</th><th>BF%</th><th>Chest</th><th>Waist</th><th>Arms</th><th>Legs</th><th></th></tr>
              </thead>
              <tbody>
                {[...stats].reverse().map((s, i) => {
                  const origIdx = stats.length - 1 - i;
                  return (
                    <tr key={i}>
                      <td>{s.date}</td><td>{s.weight}kg</td><td>{s.bodyFat}%</td>
                      <td>{s.chest}cm</td><td>{s.waist}cm</td><td>{s.arms}cm</td><td>{s.legs}cm</td>
                      <td><button className="btn-icon" onClick={() => { deleteBodyStat(currentUser.id, origIdx); toast('Measurement deleted', 'error'); }} title="Delete"><Trash2 size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="history-cards-mobile">
            {[...stats].reverse().map((s, i) => {
              const origIdx = stats.length - 1 - i;
              return (
                <div key={i} className="history-card">
                  <div className="flex-between">
                    <div className="history-card-date">{s.date}</div>
                    <button className="btn-icon" onClick={() => { deleteBodyStat(currentUser.id, origIdx); toast('Measurement deleted', 'error'); }} title="Delete"><Trash2 size={14} /></button>
                  </div>
                  <div className="body-stats-grid">
                    <div className="body-stat-item"><span className="body-stat-label">Weight</span><span className="body-stat-value">{s.weight}kg</span></div>
                    <div className="body-stat-item"><span className="body-stat-label">Body Fat</span><span className="body-stat-value">{s.bodyFat}%</span></div>
                    <div className="body-stat-item"><span className="body-stat-label">Chest</span><span className="body-stat-value">{s.chest}cm</span></div>
                    <div className="body-stat-item"><span className="body-stat-label">Waist</span><span className="body-stat-value">{s.waist}cm</span></div>
                    <div className="body-stat-item"><span className="body-stat-label">Arms</span><span className="body-stat-value">{s.arms}cm</span></div>
                    <div className="body-stat-item"><span className="body-stat-label">Legs</span><span className="body-stat-value">{s.legs}cm</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <p className="empty-state-text">No measurements yet. Add your first one!</p>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Measurement</h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-input" type="number" step="0.1" min="20" max="300" required value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Body Fat (%)</label><input className="form-input" type="number" step="0.1" min="2" max="60" value={form.bodyFat} onChange={e => setForm({ ...form, bodyFat: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Chest (cm)</label><input className="form-input" type="number" step="0.1" min="50" max="200" value={form.chest} onChange={e => setForm({ ...form, chest: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Waist (cm)</label><input className="form-input" type="number" step="0.1" min="40" max="200" value={form.waist} onChange={e => setForm({ ...form, waist: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Arms (cm)</label><input className="form-input" type="number" step="0.1" min="15" max="60" value={form.arms} onChange={e => setForm({ ...form, arms: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Legs (cm)</label><input className="form-input" type="number" step="0.1" min="30" max="100" value={form.legs} onChange={e => setForm({ ...form, legs: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
