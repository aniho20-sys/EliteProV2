import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Dumbbell, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import EmptyState from './EmptyState';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const EX_METRICS = [
  { key: 'maxWeight', label: 'Max Weight', unit: 'kg' },
  { key: 'totalVolume', label: 'Volume', unit: 'kg' },
  { key: 'totalReps', label: 'Total Reps', unit: 'reps' },
];

function buildHistory(logs, exerciseId) {
  return logs
    .filter(log => log.entries?.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(log => {
      const entry = log.entries.find(e => e.exerciseId === exerciseId);
      const completed = (entry?.sets || []).filter(s => s.completed !== false);
      const weights = completed.map(s => Number(s.weight) || 0);
      const maxWeight = weights.length ? Math.max(...weights) : 0;
      const totalVolume = completed.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
      const totalReps = completed.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
      return { date: log.date, shortDate: log.date.slice(5), maxWeight, totalVolume, totalReps, sets: completed.length };
    });
}

function ExChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="progress-tooltip">
      <div className="progress-tooltip-date">{payload[0]?.payload?.date}</div>
      <div className="progress-tooltip-val">
        {unit === 'kg' ? payload[0]?.value?.toLocaleString(undefined, { maximumFractionDigits: 1 }) : payload[0]?.value}
        <span> {unit}</span>
      </div>
    </div>
  );
}

export default function ExerciseProgress({ clientId }) {
  const { getWorkoutLogs, getExercises } = useApp();
  const logs = getWorkoutLogs(clientId);
  const exerciseLibrary = getExercises();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [metric, setMetric] = useState('maxWeight');

  // Build list of exercises that actually appear in logs
  const exerciseIds = useMemo(() => {
    const ids = new Set();
    logs.forEach(log => (log.entries || []).forEach(e => ids.add(e.exerciseId)));
    return [...ids];
  }, [logs]);

  const exerciseOptions = useMemo(() => {
    return exerciseIds
      .map(id => ({ id, name: exerciseLibrary.find(e => e.id === id)?.name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exerciseIds, exerciseLibrary]);

  const filtered = useMemo(() => {
    if (!search.trim()) return exerciseOptions;
    const q = search.toLowerCase();
    return exerciseOptions.filter(e => e.name.toLowerCase().includes(q));
  }, [exerciseOptions, search]);

  const history = useMemo(() => {
    if (!selectedId) return [];
    return buildHistory(logs, selectedId);
  }, [logs, selectedId]);

  const selectedMetric = EX_METRICS.find(m => m.key === metric);

  const chartData = history.map(h => ({ date: h.date, shortDate: h.shortDate, value: h[metric] }));
  const vals = chartData.map(d => d.value);
  const yMin = vals.length ? Math.floor(Math.min(...vals) * 0.95) : 0;
  const yMax = vals.length ? Math.ceil(Math.max(...vals) * 1.05) : 100;

  const first = history[0];
  const last = history[history.length - 1];
  const change = history.length >= 2 ? last[metric] - first[metric] : null;
  const changePct = first && first[metric] > 0 && change !== null ? ((change / first[metric]) * 100).toFixed(1) : null;

  if (exerciseOptions.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No training data yet"
        description="Complete workout sessions to see exercise progression charts."
      />
    );
  }

  return (
    <div className="exercise-progress-wrap">
      {/* Exercise Picker */}
      <div className="card mb-16">
        <h3 className="card-title mb-16">Select Exercise</h3>
        <div className="ex-progress-search-wrap">
          <Search size={14} className="ex-progress-search-icon" />
          <input
            className="form-input ex-progress-search"
            placeholder="Search exercises…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="ex-progress-list">
          {filtered.map(ex => (
            <button
              key={ex.id}
              className={`ex-progress-item ${selectedId === ex.id ? 'active' : ''}`}
              onClick={() => setSelectedId(ex.id)}
            >
              {ex.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="ex-progress-empty">No exercises match "{search}"</p>
          )}
        </div>
      </div>

      {/* Chart */}
      {selectedId && (
        <>
          <div className="card mb-16">
            <div className="progress-chart-header">
              <div>
                <div className="progress-chart-title">
                  {exerciseOptions.find(e => e.id === selectedId)?.name}
                </div>
                {change !== null && (
                  <div className={`progress-chart-change ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`}>
                    {change > 0 ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {' '}
                    {change > 0 ? '+' : ''}{metric === 'totalVolume' ? change.toLocaleString(undefined, { maximumFractionDigits: 0 }) : change.toFixed(1)} {selectedMetric.unit}
                    {changePct && ` (${change > 0 ? '+' : ''}${changePct}%)`}
                    {' '}since first session
                  </div>
                )}
              </div>
              <div className="progress-metric-pills">
                {EX_METRICS.map(m => (
                  <button
                    key={m.key}
                    className={`progress-metric-pill ${metric === m.key ? 'active' : ''}`}
                    style={metric === m.key ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
                    onClick={() => setMetric(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length >= 2 ? (
              <div className="progress-chart-wrap" style={{ marginTop: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="shortDate" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ExChartTooltip unit={selectedMetric.unit} />} />
                    <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} fill="url(#exGrad)" dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="ex-progress-single-note">
                {chartData.length === 1 ? 'Log at least 2 sessions to see a trend chart.' : 'No completed sets found for this exercise.'}
              </p>
            )}
          </div>

          {/* Session History Table */}
          {history.length > 0 && (
            <div className="card">
              <h3 className="card-title mb-16">Session History</h3>
              <div className="ex-progress-table-wrap">
                <table className="ex-progress-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Max Weight</th>
                      <th>Volume</th>
                      <th>Reps</th>
                      <th>Sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((h, i, arr) => {
                      // arr is reversed so earlier sessions are at the end
                      const prevSessions = arr.slice(i + 1); // sessions before this one (chronologically)
                      const prevMax = prevSessions.length ? Math.max(...prevSessions.map(x => x.maxWeight)) : 0;
                      const isPR = h.maxWeight > 0 && h.maxWeight > prevMax;
                      return (
                        <tr key={h.date}>
                          <td>{h.date}</td>
                          <td>
                            {h.maxWeight > 0 ? `${h.maxWeight} kg` : '—'}
                            {isPR && <span className="ex-progress-pr-badge">PR</span>}
                          </td>
                          <td>{h.totalVolume > 0 ? `${h.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg` : '—'}</td>
                          <td>{h.totalReps > 0 ? h.totalReps : '—'}</td>
                          <td>{h.sets}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedId && (
        <div className="ex-progress-placeholder">
          <Dumbbell size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <p>Select an exercise above to see its progression chart.</p>
        </div>
      )}
    </div>
  );
}
