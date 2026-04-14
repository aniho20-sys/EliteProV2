import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, LineChart, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const METRICS = [
  { key: 'weight',  label: 'Weight',   unit: 'kg', color: '#FF6B35' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%',  color: '#ef476f' },
  { key: 'chest',   label: 'Chest',    unit: 'cm', color: '#06d6a0' },
  { key: 'waist',   label: 'Waist',    unit: 'cm', color: '#ffd166' },
  { key: 'arms',    label: 'Arms',     unit: 'cm', color: '#118ab2' },
  { key: 'legs',    label: 'Legs',     unit: 'cm', color: '#8338ec' },
];

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="progress-tooltip">
      <div className="progress-tooltip-date">{payload[0]?.payload?.fullDate}</div>
      <div className="progress-tooltip-val">{payload[0]?.value}<span>{unit}</span></div>
    </div>
  );
}

export default function ProgressPage() {
  const { currentUser, getBodyStats, addBodyStat, deleteBodyStat } = useApp();
  const stats = getBodyStats(currentUser.id);
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMetric, setActiveMetric] = useState('weight');
  const [form, setForm] = useState({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', legs: '' });

  const metric = METRICS.find(m => m.key === activeMetric);
  const latestStat = stats[stats.length - 1];
  const firstStat = stats[0];

  const chartData = stats
    .filter(s => s[activeMetric] != null && s[activeMetric] !== '')
    .map(s => ({ date: s.date.slice(5), fullDate: s.date, value: Number(s[activeMetric]) }));

  const chartVals = chartData.map(d => d.value);
  const yMin = chartVals.length ? Math.floor(Math.min(...chartVals) * 0.97) : 0;
  const yMax = chartVals.length ? Math.ceil(Math.max(...chartVals) * 1.03) : 100;

  const change = latestStat && firstStat && stats.length > 1
    ? (latestStat[activeMetric] - firstStat[activeMetric])
    : null;

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addBodyStat(currentUser.id, {
        date: new Date().toISOString().split('T')[0],
        weight: Number(form.weight) || 0,
        bodyFat: Number(form.bodyFat) || 0,
        chest: Number(form.chest) || 0,
        waist: Number(form.waist) || 0,
        hips: Number(form.hips) || 0,
        arms: Number(form.arms) || 0,
        legs: Number(form.legs) || 0,
      });
      setForm({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', legs: '' });
      setShowAdd(false);
      toast('Measurement saved');
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Progress</h1>
          <p className="page-subtitle">{stats.length} measurement{stats.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Measurement
        </button>
      </div>

      {stats.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No measurements yet"
          description="Track your first measurement to start seeing progress trends over time."
          action={{ label: 'Add Measurement', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <>
          {/* Current Stats */}
          {latestStat && (
            <div className="card mb-16">
              <h3 className="card-title mb-16">Current Stats</h3>
              <div className="progress-stats-grid">
                {METRICS.map(m => {
                  const val = latestStat[m.key];
                  const diff = firstStat && stats.length > 1
                    ? (latestStat[m.key] - firstStat[m.key])
                    : null;
                  return (
                    <button
                      key={m.key}
                      className={`progress-stat-tile${activeMetric === m.key ? ' active' : ''}`}
                      style={{ '--tile-color': m.color }}
                      onClick={() => setActiveMetric(m.key)}
                    >
                      <div className="progress-stat-label">{m.label}</div>
                      <div className="progress-stat-val">{val ?? '—'}<span className="progress-stat-unit">{m.unit}</span></div>
                      {diff !== null && (
                        <div className={`progress-stat-diff ${diff < 0 ? 'down' : diff > 0 ? 'up' : 'flat'}`}>
                          {diff > 0 ? <TrendingUp size={10} /> : diff < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}{m.unit}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="card mb-16">
              <div className="progress-chart-header">
                <div>
                  <div className="progress-chart-title">{metric.label} Trend</div>
                  {change !== null && (
                    <div className={`progress-chart-change ${change < 0 ? 'down' : change > 0 ? 'up' : 'flat'}`}>
                      {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
                      {' '}{Math.abs(change).toFixed(1)}{metric.unit} since start
                    </div>
                  )}
                </div>
                <div className="progress-metric-pills">
                  {METRICS.map(m => (
                    <button
                      key={m.key}
                      className={`progress-metric-pill${activeMetric === m.key ? ' active' : ''}`}
                      style={activeMetric === m.key ? { background: m.color, borderColor: m.color } : {}}
                      onClick={() => setActiveMetric(m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="progress-chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={metric.color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${v}${metric.unit}`}
                    />
                    <Tooltip content={<ChartTooltip unit={metric.unit} />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2.5}
                      fill="url(#chartGrad)"
                      dot={{ r: 3, fill: metric.color, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: metric.color, strokeWidth: 2, stroke: 'var(--surface)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* History */}
          <div className="card">
            <h3 className="card-title mb-16">Measurement History</h3>
            {/* Desktop table */}
            <div className="table-wrapper history-table-desktop">
              <table>
                <thead>
                  <tr><th>Date</th><th>Weight</th><th>BF%</th><th>Chest</th><th>Waist</th><th>Hips</th><th>Arms</th><th>Legs</th><th></th></tr>
                </thead>
                <tbody>
                  {[...stats].reverse().map((s) => (
                    <tr key={s.id}>
                      <td>{s.date}</td><td>{s.weight}kg</td><td>{s.bodyFat}%</td>
                      <td>{s.chest}cm</td><td>{s.waist}cm</td><td>{s.hips || '—'}cm</td><td>{s.arms}cm</td><td>{s.legs}cm</td>
                      <td>
                        <button className="btn-icon" title="Delete"
                          onClick={() => { deleteBodyStat(currentUser.id, s.id); toast('Deleted', 'error'); }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="history-cards-mobile">
              {[...stats].reverse().map((s) => (
                  <div key={s.id} className="history-card">
                    <div className="flex-between">
                      <div className="history-card-date">{s.date}</div>
                      <button className="btn-icon" title="Delete"
                        onClick={() => { deleteBodyStat(currentUser.id, s.id); toast('Deleted', 'error'); }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="body-stats-grid">
                      {METRICS.map(m => (
                        <div key={m.key} className="body-stat-item">
                          <span className="body-stat-label">{m.label}</span>
                          <span className="body-stat-value">{s[m.key] ? `${s[m.key]}${m.unit}` : '—'}</span>
                        </div>
                      ))}
                      <div className="body-stat-item">
                        <span className="body-stat-label">Hips</span>
                        <span className="body-stat-value">{s.hips ? `${s.hips}cm` : '—'}</span>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Modal */}
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
                <div className="form-group"><label className="form-label">Chest (cm)</label><input className="form-input" type="number" step="0.1" value={form.chest} onChange={e => setForm({ ...form, chest: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Waist (cm)</label><input className="form-input" type="number" step="0.1" value={form.waist} onChange={e => setForm({ ...form, waist: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Hips (cm)</label><input className="form-input" type="number" step="0.1" value={form.hips} onChange={e => setForm({ ...form, hips: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Arms (cm)</label><input className="form-input" type="number" step="0.1" value={form.arms} onChange={e => setForm({ ...form, arms: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Legs (cm)</label><input className="form-input" type="number" step="0.1" value={form.legs} onChange={e => setForm({ ...form, legs: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
