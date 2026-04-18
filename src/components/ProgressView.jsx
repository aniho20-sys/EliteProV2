import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LineChart, TrendingDown, TrendingUp, Minus, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from './EmptyState';
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

export default function ProgressView({ clientId, canDelete = false, onAdd }) {
  const { getBodyStats, deleteBodyStat } = useApp();
  const stats = getBodyStats(clientId);
  const toast = useToast();
  const [activeMetric, setActiveMetric] = useState('weight');

  if (stats.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title="No measurements yet"
        description="Track measurements to start seeing progress trends over time."
        action={onAdd ? { label: 'Add Measurement', onClick: onAdd } : undefined}
      />
    );
  }

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

  return (
    <>
      {/* Current Stats */}
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
                  <linearGradient id={`pv-grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={metric.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}${metric.unit}`} />
                <Tooltip content={<ChartTooltip unit={metric.unit} />} />
                <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2.5} fill={`url(#pv-grad-${activeMetric})`} dot={{ r: 3, fill: metric.color, strokeWidth: 0 }} activeDot={{ r: 5, fill: metric.color, strokeWidth: 2, stroke: 'var(--surface)' }} />
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
              <tr>
                <th>Date</th><th>Weight</th><th>BF%</th><th>Chest</th><th>Waist</th><th>Hips</th><th>Arms</th><th>Legs</th><th>Source</th>
                {canDelete && <th></th>}
              </tr>
            </thead>
            <tbody>
              {[...stats].reverse().map((s) => (
                <tr key={s.id}>
                  <td>{s.date}</td><td>{s.weight}kg</td><td>{s.bodyFat}%</td>
                  <td>{s.chest}cm</td><td>{s.waist}cm</td><td>{s.hips || '—'}cm</td><td>{s.arms}cm</td><td>{s.legs}cm</td>
                  <td>
                    {s.addedBy === 'coach'
                      ? <span className="tag tag-accent" style={{ fontSize: '0.65rem' }}>Coach</span>
                      : s.addedBy === 'self'
                        ? <span className="tag" style={{ fontSize: '0.65rem' }}>Self</span>
                        : '—'}
                  </td>
                  {canDelete && (
                    <td>
                      <button className="btn-icon" title="Delete"
                        onClick={() => { deleteBodyStat(clientId, s.id); toast('Deleted', 'error'); }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
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
                <div className="history-card-date">
                  {s.date}
                  {s.addedBy === 'coach' && <span className="tag tag-accent" style={{ fontSize: '0.6rem', marginLeft: 6 }}>Coach</span>}
                </div>
                {canDelete && (
                  <button className="btn-icon" title="Delete"
                    onClick={() => { deleteBodyStat(clientId, s.id); toast('Deleted', 'error'); }}>
                    <Trash2 size={14} />
                  </button>
                )}
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
  );
}
