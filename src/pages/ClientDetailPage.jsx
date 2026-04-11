import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Plus, UserX, LineChart, ClipboardList, NotebookPen } from 'lucide-react';
import NotesSection from '../components/NotesSection';
import EmptyState from '../components/EmptyState';

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const { getClient, getBodyStats, addBodyStat, getWorkoutPlans, getWorkoutLogs, getExercises } = useApp();
  const exerciseLibrary = getExercises();
  const client = getClient(clientId);
  const stats = getBodyStats(clientId);
  const plans = getWorkoutPlans({ clientId });
  const logs = getWorkoutLogs(clientId);
  const [tab, setTab] = useState('overview');
  const [showAddStat, setShowAddStat] = useState(false);
  const [statForm, setStatForm] = useState({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', legs: '' });

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

  const getExerciseName = (id, fallback) => exerciseLibrary.find(e => e.id === id)?.name || fallback || id;

  const normalizeSets = (ex) => {
    if (Array.isArray(ex.sets)) return ex.sets;
    const count = ex.sets || 1;
    const weights = ex.weights || Array(count).fill(ex.weight || 0);
    return Array.from({ length: count }, (_, i) => ({ weight: weights[i] || 0, reps: ex.reps || '0' }));
  };

  return (
    <div>
      <Link to="/clients" className="btn btn-outline btn-sm mb-16"><ArrowLeft size={16} /> Back to Clients</Link>

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
              {/* Simple progress bars for latest vs first */}
              {stats.length > 1 && (
                <div className="card mb-16">
                  <h4 className="card-title mb-16">Progress Overview</h4>
                  {['weight', 'bodyFat', 'chest', 'waist', 'hips', 'arms', 'legs'].map(key => {
                    const first = stats[0][key];
                    const last = stats[stats.length - 1][key];
                    const change = last - first;
                    const pct = Math.min(100, Math.max(5, (last / (first * 1.3)) * 100));
                    const unit = key === 'bodyFat' ? '%' : key === 'weight' ? 'kg' : 'cm';
                    const label = key === 'bodyFat' ? 'Body Fat' : key === 'hips' ? 'Hips' : key.charAt(0).toUpperCase() + key.slice(1);
                    return (
                      <div key={key} className="chart-bar-group">
                        <div className="chart-bar-label">
                          <span>{label}</span>
                          <span>{last}{unit} <span style={{ color: change > 0 ? 'var(--accent)' : 'var(--danger)', fontSize: '0.75rem' }}>({change > 0 ? '+' : ''}{change.toFixed(1)})</span></span>
                        </div>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, var(--primary), var(--accent))` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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
                      <span className="plan-exercise-name">{getExerciseName(entry.exerciseId)}</span>
                      <span className="plan-exercise-detail">
                        {entry.sets.map((s, j) => `${s.weight}kg x ${s.reps}`).join(' | ')}
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
    </div>
  );
}
