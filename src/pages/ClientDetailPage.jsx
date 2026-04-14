import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Plus, UserX, LineChart, ClipboardList, NotebookPen, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import NotesSection from '../components/NotesSection';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { getClient, getBodyStats, addBodyStat, getWorkoutPlans, getWorkoutLogs, getExercises, removeClient } = useApp();
  const toast = useToast();
  const exerciseLibrary = getExercises();
  const client = getClient(clientId);
  const stats = getBodyStats(clientId);
  const plans = getWorkoutPlans({ clientId });
  const logs = getWorkoutLogs(clientId);
  const [tab, setTab] = useState('overview');
  const [showAddStat, setShowAddStat] = useState(false);
  const [statForm, setStatForm] = useState({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', legs: '' });
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [activeMetric, setActiveMetric] = useState('weight');

  if (!client) {
    return (
      <EmptyState
        icon={UserX}
        title="Client not found"
        description="This client may have been removed or you may not have access."
        action={{ label: 'Back to Clients', to: '/clients' }}
      />
    );
  }

  const latestStat = stats[stats.length - 1];

  const handleAddStat = async (e) => {
    e.preventDefault();
    try {
      await addBodyStat(clientId, {
        weight: Number(statForm.weight), bodyFat: Number(statForm.bodyFat),
        chest: Number(statForm.chest), waist: Number(statForm.waist), hips: Number(statForm.hips),
        arms: Number(statForm.arms), legs: Number(statForm.legs),
      });
      setStatForm({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', legs: '' });
      setShowAddStat(false);
    } catch { /* error handled by Firestore listener */ }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeClient(clientId);
      toast(`${client.name} removed from your clients`, 'info');
      navigate('/clients');
    } catch {
      toast('Failed to remove client', 'error');
      setRemoving(false);
    }
  };

  const getExerciseName = (id, fallback) => exerciseLibrary.find(e => e.id === id)?.name || fallback || id;

  const normalizeSets = (ex) => {
    if (Array.isArray(ex.sets)) return ex.sets;
    const count = ex.sets || 1;
    const weights = ex.weights || Array(count).fill(ex.weight || 0);
    return Array.from({ length: count }, (_, i) => ({ weight: weights[i] || 0, reps: ex.reps || '0' }));
  };

  return (
    <div>
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Link to="/clients" className="btn btn-outline btn-sm"><ArrowLeft size={16} /> Back to Clients</Link>
        <button className="btn btn-sm" style={{ color: 'var(--danger)', border: '1px solid var(--danger)', background: 'transparent' }} onClick={() => setShowRemoveConfirm(true)}>
          <Trash2 size={15} /> Remove Client
        </button>
      </div>

      <div className="page-header">
        <h1 className="page-title">{client.name}</h1>
        <p className="page-subtitle">Age: {client.age} | Height: {client.height}cm | Goals: {client.goals}</p>
        {client.notes && <p className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>Notes: {client.notes}</p>}
      </div>

      <div className="tabs">
        {['overview', 'body stats', 'workout plans', 'workout logs', 'notes'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="card-title mb-16">Latest Body Stats</h3>
            {latestStat ? (
              <div className="grid-3">
                {Object.entries(latestStat).filter(([k]) => k !== 'date').map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="fw-bold">{val}{key === 'bodyFat' ? '%' : key === 'weight' ? 'kg' : 'cm'}</div>
                    <div className="text-sm text-muted">{key === 'bodyFat' ? 'Body Fat' : key.charAt(0).toUpperCase() + key.slice(1)}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted">No stats recorded yet</p>}
          </div>
          <div className="card">
            <h3 className="card-title mb-16">Summary</h3>
            <p className="text-sm">Workout Plans: <strong>{plans.length}</strong></p>
            <p className="text-sm mt-8">Completed Workouts: <strong>{logs.filter(l => l.completed).length}</strong></p>
            <p className="text-sm mt-8">Measurements: <strong>{stats.length} records</strong></p>
            <p className="text-sm mt-8">Member since: <strong>{client.joinDate}</strong></p>
          </div>
        </div>
      )}

      {tab === 'body stats' && (
        <div>
          <div className="flex-between mb-16">
            <h3>Body Stats History</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddStat(true)}><Plus size={16} /> Add Record</button>
          </div>
          {stats.length === 0 ? (
            <EmptyState
              icon={LineChart}
              title="No measurements yet"
              description="Add a body stat record to start tracking this client's progress."
              action={{ label: 'Add Record', onClick: () => setShowAddStat(true) }}
            />
          ) : (
            <>
              {/* Recharts progress chart */}
              {stats.length > 0 && (() => {
                const metric = METRICS.find(m => m.key === activeMetric);
                const chartData = stats.filter(s => s[activeMetric] != null).map(s => ({ date: s.date.slice(5), fullDate: s.date, value: Number(s[activeMetric]) }));
                const vals = chartData.map(d => d.value);
                const yMin = vals.length ? Math.floor(Math.min(...vals) * 0.97) : 0;
                const yMax = vals.length ? Math.ceil(Math.max(...vals) * 1.03) : 100;
                const change = stats.length > 1 ? stats[stats.length - 1][activeMetric] - stats[0][activeMetric] : null;
                return (
                  <div className="card mb-16">
                    <div className="progress-stats-grid" style={{ marginBottom: 16 }}>
                      {METRICS.map(m => {
                        const val = latestStat?.[m.key];
                        const diff = stats.length > 1 ? stats[stats.length - 1][m.key] - stats[0][m.key] : null;
                        return (
                          <button key={m.key} className={`progress-stat-tile${activeMetric === m.key ? ' active' : ''}`} style={{ '--tile-color': m.color }} onClick={() => setActiveMetric(m.key)}>
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
                    {chartData.length > 1 && (
                      <>
                        <div className="progress-chart-header">
                          <div>
                            <div className="progress-chart-title">{metric.label} Trend</div>
                            {change !== null && <div className={`progress-chart-change ${change < 0 ? 'down' : change > 0 ? 'up' : 'flat'}`}>{change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change).toFixed(1)}{metric.unit} since start</div>}
                          </div>
                          <div className="progress-metric-pills">
                            {METRICS.map(m => (
                              <button key={m.key} className={`progress-metric-pill${activeMetric === m.key ? ' active' : ''}`} style={activeMetric === m.key ? { background: m.color, borderColor: m.color } : {}} onClick={() => setActiveMetric(m.key)}>{m.label}</button>
                            ))}
                          </div>
                        </div>
                        <div className="progress-chart-wrap">
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`grad-client-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor={metric.color} stopOpacity={0.25} />
                                  <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}${metric.unit}`} />
                              <Tooltip content={<ChartTooltip unit={metric.unit} />} />
                              <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2.5} fill={`url(#grad-client-${activeMetric})`} dot={{ r: 3, fill: metric.color, strokeWidth: 0 }} activeDot={{ r: 5, fill: metric.color, strokeWidth: 2, stroke: 'var(--surface)' }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="card table-wrapper">
                <table>
                  <thead><tr><th>Date</th><th>Weight</th><th>BF%</th><th>Chest</th><th>Waist</th><th>Hips</th><th>Arms</th><th>Legs</th></tr></thead>
                  <tbody>
                    {[...stats].reverse().map((s, i) => (
                      <tr key={i}><td>{s.date}</td><td>{s.weight}kg</td><td>{s.bodyFat}%</td><td>{s.chest}cm</td><td>{s.waist}cm</td><td>{s.hips ? `${s.hips}cm` : '—'}</td><td>{s.arms}cm</td><td>{s.legs}cm</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {showAddStat && (
            <div className="modal-overlay" onClick={() => setShowAddStat(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">Add Body Stats</h3>
                <form onSubmit={handleAddStat}>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-input" type="number" step="0.1" required value={statForm.weight} onChange={e => setStatForm({ ...statForm, weight: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Body Fat (%)</label><input className="form-input" type="number" step="0.1" value={statForm.bodyFat} onChange={e => setStatForm({ ...statForm, bodyFat: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Chest (cm)</label><input className="form-input" type="number" step="0.1" value={statForm.chest} onChange={e => setStatForm({ ...statForm, chest: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Waist (cm)</label><input className="form-input" type="number" step="0.1" value={statForm.waist} onChange={e => setStatForm({ ...statForm, waist: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Hips (cm)</label><input className="form-input" type="number" step="0.1" value={statForm.hips} onChange={e => setStatForm({ ...statForm, hips: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Arms (cm)</label><input className="form-input" type="number" step="0.1" value={statForm.arms} onChange={e => setStatForm({ ...statForm, arms: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Legs (cm)</label><input className="form-input" type="number" step="0.1" value={statForm.legs} onChange={e => setStatForm({ ...statForm, legs: e.target.value })} /></div>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setShowAddStat(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'workout plans' && (
        <div>
          {plans.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No plans assigned"
              description="Create a workout plan to help this client train consistently."
              action={{ label: 'Go to Workout Plans', to: '/plans' }}
            />
          ) : (
            plans.map(p => (
              <div key={p.id} className="card mb-16">
                <div className="card-header">
                  <h3 className="card-title">{p.name}</h3>
                  <span className="tag tag-primary">{p.day}</span>
                </div>
                {p.exercises.map((ex, i) => (
                  <div key={i} className="plan-exercise">
                    <span className="plan-exercise-name">{getExerciseName(ex.exerciseId, ex.name)}</span>
                    {(() => {
                      const sets = normalizeSets(ex);
                      const reps = sets.map(s => s.reps);
                      const weights = sets.map(s => s.weight);
                      const allSameReps = reps.every(r => r === reps[0]);
                      const hasWeight = weights.some(w => w > 0);
                      const allSameWeight = weights.every(w => w === weights[0]);
                      return (
                        <>
                          <span className="plan-exercise-detail">{allSameReps ? `${sets.length} x ${reps[0]}` : `${sets.length} sets`}</span>
                          {hasWeight && <span className="plan-exercise-detail">{allSameWeight ? `${weights[0]}kg` : weights.join('/') + 'kg'}</span>}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'workout logs' && (
        <div>
          {logs.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No workout logs yet"
              description="This client hasn't logged a workout yet. Logs will appear here once they do."
            />
          ) : (
            [...logs].reverse().map(l => {
              const plan = plans.find(p => p.id === l.planId);
              return (
                <div key={l.id} className="card mb-16">
                  <div className="card-header">
                    <h3 className="card-title">{plan?.name || 'Workout'} - {l.date}</h3>
                    <div className="flex gap-8">
                      <span className="tag tag-primary">RPE: {l.rpe}/10</span>
                      <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Completed' : 'Partial'}</span>
                    </div>
                  </div>
                  {l.entries.map((entry, i) => (
                    <div key={i} className="plan-exercise">
                      <span className="plan-exercise-name">{entry.name || getExerciseName(entry.exerciseId)}</span>
                      <span className="plan-exercise-detail">
                        {entry.sets.map((s) => `${s.weight}kg x ${s.reps}`).join(' | ')}
                      </span>
                    </div>
                  ))}
                  {l.notes && <p className="text-sm text-muted mt-8">{l.notes}</p>}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="card">
          <NotesSection clientId={clientId} />
        </div>
      )}

      {showRemoveConfirm && (
        <div className="modal-overlay" onClick={() => setShowRemoveConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Remove Client?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              This will remove <strong>{client.name}</strong> from your client list.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Their account and training history are kept — they can reconnect with your invite code.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowRemoveConfirm(false)} disabled={removing}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRemove} disabled={removing}>
                <Trash2 size={15} /> {removing ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
