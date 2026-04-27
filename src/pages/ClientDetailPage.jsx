import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Plus, UserX, LineChart, ClipboardList, NotebookPen, Trash2, TrendingUp, TrendingDown, Minus, Play, ExternalLink, BarChart2, Pencil, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getSessionColor } from '../utils/sessionUtils';
import { normalizeSets, applySetUpdate, serializeEntries } from '../utils/workoutUtils';
import { isSafeUrl, isYouTube } from '../utils/urlUtils';
import { METRICS, EMPTY_STAT_FORM } from '../data/metrics';
import NotesSection from '../components/NotesSection';
import MuscleSelector from '../components/MuscleSelector';
import ProgressView from '../components/ProgressView';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


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
  const { currentUser, getClient, getBodyStats, addBodyStat, getWorkoutPlans, addWorkoutPlan, getWorkoutLogs, addWorkoutLog, updateWorkoutLog, getExercises, addExercise, removeClient, updateClient, getSessionStats } = useApp();
  const toast = useToast();
  const exerciseLibrary = getExercises();
  const client = getClient(clientId);
  const stats = getBodyStats(clientId);
  const plans = getWorkoutPlans({ clientId });
  const logs = getWorkoutLogs(clientId);
  const [tab, setTab] = useState('overview');
  const [showAddStat, setShowAddStat] = useState(false);
  const [statForm, setStatForm] = useState(EMPTY_STAT_FORM);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [activeMetric, setActiveMetric] = useState('weight');
  const [editingSessions, setEditingSessions] = useState(false);
  const [sessionsInput, setSessionsInput] = useState('');
  const [offsetInput, setOffsetInput] = useState('');
  const [savingSessions, setSavingSessions] = useState(false);
  const [editingNoteLogId, setEditingNoteLogId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [savingTag, setSavingTag] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [showLogModal, setShowLogModal] = useState(false);
  const [logPlanId, setLogPlanId] = useState('');
  const [logIsCustom, setLogIsCustom] = useState(false);
  const [logDate, setLogDate] = useState(today);
  const [logEntries, setLogEntries] = useState([]);
  const [logRpe, setLogRpe] = useState(7);
  const [logNotes, setLogNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [showLogExPicker, setShowLogExPicker] = useState(false);
  const [logExSearch, setLogExSearch] = useState('');
  const [logExMuscles, setLogExMuscles] = useState([]);
  const [showLogExMuscleFilter, setShowLogExMuscleFilter] = useState(false);
  const [savePlanLog, setSavePlanLog] = useState(null);
  const [savePlanName, setSavePlanName] = useState('');
  const [savePlanDay, setSavePlanDay] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editLogEntries, setEditLogEntries] = useState([]);
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogRpe, setEditLogRpe] = useState(7);
  const [editLogNotes, setEditLogNotes] = useState('');
  const [savingEditLog, setSavingEditLog] = useState(false);

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
      setStatForm(EMPTY_STAT_FORM);
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

  const { used: sessUsed, total: sessTotal, remaining: sessRemaining } = getSessionStats(clientId);
  const sessColor = getSessionColor(sessRemaining);

  const handleSaveSessions = async () => {
    setSavingSessions(true);
    try {
      await updateClient(clientId, {
        totalSessions: Number(sessionsInput) || 0,
        sessionOffset: Number(offsetInput) || 0,
      });
      setEditingSessions(false);
      toast('Sessions updated');
    } catch {
      toast('Failed to update sessions', 'error');
    } finally {
      setSavingSessions(false);
    }
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (!tag) return;
    const existing = client.tags || [];
    if (existing.includes(tag)) { setTagInput(''); return; }
    setSavingTag(true);
    try {
      await updateClient(clientId, { tags: [...existing, tag] });
      setTagInput('');
    } catch { toast('Failed to add tag', 'error'); }
    finally { setSavingTag(false); }
  };

  const handleRemoveTag = async (tag) => {
    const updated = (client.tags || []).filter(t => t !== tag);
    try { await updateClient(clientId, { tags: updated }); }
    catch { toast('Failed to remove tag', 'error'); }
  };

  const initLogEntries = (planId) => {
    if (planId === 'custom') {
      setLogIsCustom(true);
      setLogPlanId('');
      setLogEntries([]);
      return;
    }
    setLogIsCustom(false);
    setLogPlanId(planId);
    if (!planId) { setLogEntries([]); return; }
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    const lastLog = [...logs].reverse().find(l => l.planId === planId);
    setLogEntries(plan.exercises.map(ex => {
      const lastEntry = lastLog?.entries?.find(e => e.exerciseId === ex.exerciseId);
      const planSets = normalizeSets(ex);
      return {
        exerciseId: ex.exerciseId,
        name: ex.name || exerciseLibrary.find(e => e.id === ex.exerciseId)?.name || ex.exerciseId,
        sets: planSets.map((ps, i) => {
          const prev = lastEntry?.sets?.[i];
          if (prev) return { weight: String(prev.weight), reps: String(prev.reps) };
          return { weight: ps.weight > 0 ? String(ps.weight) : '', reps: ps.reps || '' };
        }),
      };
    }));
  };

  const addLogExercise = (exercise) => {
    setLogEntries(prev => [...prev, { exerciseId: exercise.id, name: exercise.name, sets: [{ weight: '', reps: '' }] }]);
    setShowLogExPicker(false);
    setLogExSearch('');
  };

  const addCustomLogExercise = (name) => {
    const id = 'custom-' + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setLogEntries(prev => [...prev, { exerciseId: id, name: name.trim(), sets: [{ weight: '', reps: '' }] }]);
    setShowLogExPicker(false);
    setLogExSearch('');
    const exists = exerciseLibrary.some(e => e.id === id);
    if (!exists) addExercise({ id, name: name.trim(), muscle: '', equipment: '', description: '', instructions: '' }).catch(() => {});
  };

  const addLogSet = (exIdx) => {
    setLogEntries(prev => prev.map((e, i) => i === exIdx ? { ...e, sets: [...e.sets, { weight: '', reps: '' }] } : e));
  };

  const removeLogSet = (exIdx, setIdx) => {
    setLogEntries(prev => prev.map((e, i) => i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e));
  };

  const removeLogExercise = (exIdx) => {
    setLogEntries(prev => prev.filter((_, i) => i !== exIdx));
  };

  const resetLogForm = () => {
    setLogPlanId(''); setLogIsCustom(false); setLogEntries([]); setLogRpe(7); setLogNotes('');
  };

  const updateLogSet = (exIdx, setIdx, field, value) => {
    setLogEntries(prev => applySetUpdate(prev, exIdx, setIdx, field, value));
  };

  const handleSaveLog = async () => {
    const entriesToSave = logEntries.map(e => ({
      exerciseId: e.exerciseId,
      name: e.name,
      sets: e.sets.filter(s => s.weight && s.reps).map(s => ({ weight: Number(s.weight), reps: Number(s.reps) })),
    })).filter(e => e.sets.length > 0);
    if (entriesToSave.length === 0) { toast('Please enter at least one set', 'error'); return; }
    setSavingLog(true);
    try {
      await addWorkoutLog({
        clientId: client.id,
        planId: logIsCustom ? null : logPlanId,
        ...(logIsCustom && { workoutName: 'Custom Workout' }),
        date: logDate,
        completed: entriesToSave.length > 0,
        entries: entriesToSave,
        rpe: logRpe,
        notes: logNotes,
        logType: 'pt_session',
      });
      setShowLogModal(false);
      resetLogForm();
      toast('Workout logged');
    } catch { toast('Failed to save log', 'error'); }
    finally { setSavingLog(false); }
  };

  const openSavePlanModal = (log) => {
    const plan = plans.find(p => p.id === log.planId);
    setSavePlanLog(log);
    setSavePlanName(log.workoutName || plan?.name || 'Custom Workout');
    setSavePlanDay('');
  };

  const handleSaveLogAsPlan = async () => {
    if (!savePlanLog || !savePlanName.trim()) return;
    setSavingPlan(true);
    try {
      const exercises = savePlanLog.entries.map(entry => ({
        exerciseId: entry.exerciseId,
        name: entry.name,
        sets: entry.sets?.length || 3,
        reps: String(entry.sets?.[0]?.reps || ''),
        rest: 90,
        notes: '',
        weight: 0,
      }));
      await addWorkoutPlan({
        name: savePlanName.trim(),
        trainerId: currentUser.id,
        clientId: client.id,
        day: savePlanDay.trim(),
        exercises,
      });
      setSavePlanLog(null);
      toast('Plan saved successfully');
    } catch {
      toast('Failed to save plan', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSaveTrainerNote = async (logId) => {
    setSavingNoteId(logId);
    try {
      await updateWorkoutLog(logId, { trainerNotes: noteText.trim() });
      setEditingNoteLogId(null);
      setNoteText('');
      toast('Note saved');
    } catch {
      toast('Failed to save note', 'error');
    } finally {
      setSavingNoteId(null);
    }
  };

  const startEditLog = (log) => {
    setEditingLogId(log.id);
    setEditLogEntries(log.entries.map(e => ({
      ...e,
      sets: (e.sets || []).map(s => ({ weight: String(s.weight), reps: String(s.reps) })),
    })));
    setEditLogDate(log.date);
    setEditLogRpe(log.rpe || 7);
    setEditLogNotes(log.notes || '');
  };

  const updateEditLogSet = (exIdx, setIdx, field, value) => {
    setEditLogEntries(prev => applySetUpdate(prev, exIdx, setIdx, field, value));
  };

  const handleSaveEditLog = async () => {
    const entriesToSave = serializeEntries(editLogEntries);
    if (entriesToSave.every(e => e.sets.length === 0)) { toast('Please enter at least one set', 'error'); return; }
    setSavingEditLog(true);
    try {
      const completed = entriesToSave.some(e => e.sets.length > 0);
      await updateWorkoutLog(editingLogId, { entries: entriesToSave, date: editLogDate, rpe: editLogRpe, notes: editLogNotes, completed });
      setEditingLogId(null);
      toast('Workout updated');
    } catch {
      toast('Failed to update workout', 'error');
    } finally {
      setSavingEditLog(false);
    }
  };

  const getExerciseName = (id, fallback) => exerciseLibrary.find(e => e.id === id)?.name || fallback || id;
  const getExercise = (id) => exerciseLibrary.find(e => e.id === id);


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
        {['overview', 'body stats', 'progress', 'workout plans', 'workout logs', 'notes'].map(t => (
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
            <div className="mt-16">
              <div className="flex-between mb-8" style={{ alignItems: 'center' }}>
                <span className="text-sm fw-bold">Sessions</span>
                {!editingSessions && (
                  <button className="btn btn-outline btn-sm" onClick={() => { setSessionsInput(sessTotal ?? ''); setOffsetInput(client?.sessionOffset ?? ''); setEditingSessions(true); }}>
                    {sessTotal === null ? 'Set Total' : 'Edit'}
                  </button>
                )}
              </div>
              {editingSessions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <span className="text-sm text-muted" style={{ minWidth: 148 }}>Total purchased:</span>
                    <input className="form-input" style={{ width: 64, padding: '4px 8px' }} type="number" min="0" value={sessionsInput} onChange={e => setSessionsInput(e.target.value)} />
                    <span className="text-sm text-muted">sessions</span>
                  </div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <span className="text-sm text-muted" style={{ minWidth: 148 }}>Used before app:</span>
                    <input className="form-input" style={{ width: 64, padding: '4px 8px' }} type="number" min="0" value={offsetInput} onChange={e => setOffsetInput(e.target.value)} />
                    <span className="text-sm text-muted">sessions</span>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-primary btn-sm" onClick={handleSaveSessions} disabled={savingSessions}>{savingSessions ? 'Saving…' : 'Save'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditingSessions(false)} disabled={savingSessions}>Cancel</button>
                  </div>
                </div>
              ) : sessTotal !== null ? (
                <>
                  <div className="flex-between mb-6">
                    <span className="text-sm text-muted">{sessUsed} used</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: sessColor }}>{sessUsed} / {sessTotal}</span>
                  </div>
                  <div className="session-progress-bar">
                    <div className="session-progress-fill" style={{ width: `${Math.min(100, Math.round((sessUsed / sessTotal) * 100))}%`, background: sessColor }} />
                  </div>
                  <div className="text-sm mt-6" style={{ color: sessColor, fontWeight: 600 }}>{sessRemaining} remaining</div>
                </>
              ) : (
                <p className="text-sm text-muted">Not set — click &quot;Set Total&quot; to configure</p>
              )}
            </div>

            {/* Tags */}
            <div className="mt-16">
              <div className="text-sm fw-bold mb-8">Labels</div>
              <div className="client-tags-row">
                {(client.tags || []).map(tag => (
                  <span key={tag} className="client-tag">
                    {tag}
                    <button className="client-tag-remove" onClick={() => handleRemoveTag(tag)} aria-label={`Remove ${tag}`}>×</button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="client-tag-form mt-8">
                <input
                  className="form-input"
                  style={{ flex: 1, padding: '4px 10px', fontSize: '0.85rem' }}
                  placeholder="Add label…"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  maxLength={30}
                />
                <button className="btn btn-outline btn-sm" type="submit" disabled={savingTag || !tagInput.trim()}>Add</button>
              </form>
            </div>
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
                  <thead><tr><th>Date</th><th>Weight</th><th>BF%</th><th>Chest</th><th>Waist</th><th>Hips</th><th>Arms</th><th>Legs</th><th>Source</th></tr></thead>
                  <tbody>
                    {[...stats].reverse().map((s, i) => (
                      <tr key={i}><td>{s.date}</td><td>{s.weight}kg</td><td>{s.bodyFat}%</td><td>{s.chest}cm</td><td>{s.waist}cm</td><td>{s.hips ? `${s.hips}cm` : '—'}</td><td>{s.arms}cm</td><td>{s.legs}cm</td><td>{s.addedBy === 'coach' ? <span className="tag tag-accent" style={{ fontSize: '0.65rem' }}>Coach</span> : s.addedBy === 'self' ? <span className="tag" style={{ fontSize: '0.65rem' }}>Self</span> : '—'}</td></tr>
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

      {tab === 'progress' && (
        <div>
          <div className="flex-between mb-16">
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={18} style={{ color: 'var(--primary)' }} /> Progress Charts
              </h3>
              <p className="text-sm text-muted mt-4">{stats.length} measurement{stats.length !== 1 ? 's' : ''} recorded</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddStat(true)}>
              <Plus size={16} /> Add Measurement
            </button>
          </div>
          <ProgressView clientId={clientId} canDelete={false} />
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
                {p.exercises.map((ex, i) => {
                  const exData = getExercise(ex.exerciseId);
                  const videoUrl = (ex.videoUrl && isSafeUrl(ex.videoUrl)) ? ex.videoUrl
                                 : (exData?.videoUrl && isSafeUrl(exData.videoUrl)) ? exData.videoUrl
                                 : null;
                  return (
                    <div key={i} className="plan-exercise" style={{ flexWrap: 'wrap', gap: '4px 8px' }}>
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
                      {videoUrl && (
                        isYouTube(videoUrl) ? (
                          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Watch Demo" style={{ color: 'var(--danger)', marginLeft: 'auto' }}>
                            <Play size={14} />
                          </a>
                        ) : (
                          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open Link" style={{ color: 'var(--primary)', marginLeft: 'auto' }}>
                            <ExternalLink size={14} />
                          </a>
                        )
                      )}
                      {ex.notes && (
                        <span className="plan-exercise-detail" style={{ width: '100%', fontStyle: 'italic', color: 'var(--warning)' }}>{ex.notes}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'workout logs' && (
        <div>
          <div className="flex-between mb-16">
            <span className="text-sm text-muted">{logs.length} session{logs.length !== 1 ? 's' : ''} logged</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setLogDate(today); resetLogForm(); setShowLogModal(true); }}>
              <Plus size={16} /> Log Workout
            </button>
          </div>
          {logs.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No workout logs yet"
              description="This client hasn't logged a workout yet. Logs will appear here once they do."
            />
          ) : (
            [...logs].reverse().map(l => {
              const plan = plans.find(p => p.id === l.planId);
              const isEditingNote = editingNoteLogId === l.id;
              return (
                <div key={l.id} className="card mb-16">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{plan?.name || l.workoutName || 'Custom Workout'} — {l.date}</h3>
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      {!l.planId && <span className="tag">Custom</span>}
                      {l.logType && <span className={`tag ${l.logType === 'pt_session' ? 'tag-accent' : ''}`}>{l.logType === 'pt_session' ? 'PT Session' : 'Self'}</span>}
                      <span className="tag tag-primary">RPE: {l.rpe}/10</span>
                      <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Completed' : 'Partial'}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => openSavePlanModal(l)} title="Save as Plan" style={{ fontSize: '0.72rem' }}>
                        Save as Plan
                      </button>
                      {l.createdBy === currentUser.id && (
                        <button className="btn btn-outline btn-sm btn-icon" onClick={() => startEditLog(l)} title="Edit workout">
                          <Pencil size={13} />
                        </button>
                      )}
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
                  {l.notes && <p className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>{l.notes}</p>}
                  <div className="trainer-note-section">
                    {isEditingNote ? (
                      <div className="trainer-note-editor">
                        <textarea
                          className="form-textarea"
                          rows={3}
                          autoFocus
                          placeholder="Leave feedback for this session…"
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                        />
                        <div className="flex gap-8 mt-8">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSaveTrainerNote(l.id)}
                            disabled={savingNoteId === l.id}
                          >
                            {savingNoteId === l.id ? 'Saving…' : 'Save Note'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => { setEditingNoteLogId(null); setNoteText(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="trainer-note-display" onClick={() => { setEditingNoteLogId(l.id); setNoteText(l.trainerNotes || ''); }}>
                        {l.trainerNotes
                          ? <span className="trainer-note-text">{l.trainerNotes}</span>
                          : <span className="trainer-note-placeholder">+ Add coach feedback…</span>
                        }
                      </div>
                    )}
                  </div>
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

      {showLogModal && (
        <div className="modal-overlay" onClick={() => { setShowLogModal(false); resetLogForm(); }}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Log PT Session — {client.name}</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Workout</label>
                <select className="form-select" value={logIsCustom ? 'custom' : logPlanId} onChange={e => initLogEntries(e.target.value)}>
                  <option value="">Select a plan</option>
                  <option value="custom">— Custom Workout —</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}{p.day ? ` (${p.day})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
              </div>
            </div>

            {logIsCustom && logEntries.length === 0 && (
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>No exercises yet — add from the exercise library below.</p>
            )}

            {logEntries.map((entry, exIdx) => (
              <div key={exIdx} className="card mb-8" style={{ background: 'var(--bg-hover)', border: 'none', padding: 12 }}>
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="fw-bold">{entry.name}</span>
                  {logIsCustom && (
                    <button className="btn btn-outline btn-sm btn-icon" onClick={() => removeLogExercise(exIdx)}><X size={13} /></button>
                  )}
                </div>
                {entry.sets.map((set, setIdx) => (
                  <div key={setIdx} className="log-set-row">
                    <span className="log-set-num">Set {setIdx + 1}</span>
                    <input className="form-input log-set-input" type="number" placeholder="kg" value={set.weight} onChange={e => updateLogSet(exIdx, setIdx, 'weight', e.target.value)} />
                    <span className="text-sm text-muted">kg ×</span>
                    <input className="form-input log-set-input" type="number" placeholder="reps" value={set.reps} onChange={e => updateLogSet(exIdx, setIdx, 'reps', e.target.value)} />
                    <span className="text-sm text-muted">reps</span>
                    {logIsCustom && entry.sets.length > 1 && (
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => removeLogSet(exIdx, setIdx)}><X size={12} /></button>
                    )}
                  </div>
                ))}
                {logIsCustom && (
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => addLogSet(exIdx)}>
                    <Plus size={13} /> Add Set
                  </button>
                )}
              </div>
            ))}

            {logIsCustom && (
              <button className="btn btn-outline" style={{ width: '100%', marginBottom: 12 }} onClick={() => setShowLogExPicker(true)}>
                <Plus size={15} /> Add Exercise
              </button>
            )}

            {logEntries.length > 0 && (
              <>
                <div className="form-group">
                  <label className="form-label">RPE — {logRpe}/10</label>
                  <input type="range" min="1" max="10" value={logRpe} onChange={e => setLogRpe(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Session Notes</label>
                  <textarea className="form-textarea" value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="How did the session go?" />
                </div>
              </>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowLogModal(false); resetLogForm(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveLog} disabled={logEntries.length === 0 || savingLog}>
                {savingLog ? 'Saving…' : 'Save PT Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {savePlanLog && (
        <div className="modal-overlay" onClick={() => setSavePlanLog(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Save as Plan</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Creates a reusable plan from this session's {savePlanLog.entries.length} exercises.
            </p>
            <div className="form-group">
              <label className="form-label">Plan Name</label>
              <input className="form-input" value={savePlanName} onChange={e => setSavePlanName(e.target.value)} placeholder="e.g. Upper Body A" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Day / Label (optional)</label>
              <input className="form-input" value={savePlanDay} onChange={e => setSavePlanDay(e.target.value)} placeholder="e.g. Monday, Day 1" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSavePlanLog(null)} disabled={savingPlan}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveLogAsPlan} disabled={!savePlanName.trim() || savingPlan}>
                {savingPlan ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogExPicker && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => { setShowLogExPicker(false); setLogExSearch(''); setLogExMuscles([]); setShowLogExMuscleFilter(false); }}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Exercise</h3>
            <div className="form-group" style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name or muscle…" value={logExSearch} onChange={e => setLogExSearch(e.target.value)} autoFocus />
            </div>
            <button
              type="button"
              className="picker-muscle-toggle"
              onClick={() => setShowLogExMuscleFilter(v => !v)}
            >
              <span>Filter by muscle</span>
              {logExMuscles.length > 0 && (
                <span className="picker-muscle-count">{logExMuscles.length}</span>
              )}
              {showLogExMuscleFilter ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showLogExMuscleFilter && (
              <div className="picker-muscle-wrap">
                <MuscleSelector selected={logExMuscles} onChange={setLogExMuscles} />
              </div>
            )}
            <div className="exercise-picker-list">
              {logExSearch.trim() && (
                <button className="exercise-picker-item exercise-picker-custom" onClick={() => addCustomLogExercise(logExSearch)}>
                  <span className="fw-bold" style={{ fontSize: '0.9rem' }}>+ Add "{logExSearch.trim()}" as custom</span>
                  <span className="text-sm text-muted">Not in library — add directly to this session</span>
                </button>
              )}
              {exerciseLibrary
                .filter(e => {
                  const matchText = !logExSearch ||
                    e.name.toLowerCase().includes(logExSearch.toLowerCase()) ||
                    e.muscle?.toLowerCase().includes(logExSearch.toLowerCase());
                  const matchMuscle = logExMuscles.length === 0 ||
                    logExMuscles.some(m => e.muscle?.toLowerCase().includes(m.toLowerCase()));
                  return matchText && matchMuscle;
                })
                .map(exercise => (
                  <button key={exercise.id} className="exercise-picker-item" onClick={() => addLogExercise(exercise)}>
                    <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{exercise.name}</span>
                    <span className="text-sm text-muted">{exercise.muscle}</span>
                  </button>
                ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowLogExPicker(false); setLogExSearch(''); setLogExMuscles([]); setShowLogExMuscleFilter(false); }}>Close</button>
            </div>
          </div>
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

      {editingLogId && (
        <div className="modal-overlay" onClick={() => setEditingLogId(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit PT Session</h3>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={editLogDate} onChange={e => setEditLogDate(e.target.value)} />
            </div>
            {editLogEntries.map((entry, exIdx) => (
              <div key={exIdx} className="mb-16">
                <div className="fw-bold mb-8 text-sm">{entry.name || getExerciseName(entry.exerciseId)}</div>
                {entry.sets.length === 0
                  ? <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Skipped</p>
                  : entry.sets.map((set, setIdx) => (
                    <div key={setIdx} className="log-set-row">
                      <span className="log-set-num">Set {setIdx + 1}</span>
                      <input className="form-input log-set-input" type="number" placeholder="kg" value={set.weight} onChange={e => updateEditLogSet(exIdx, setIdx, 'weight', e.target.value)} />
                      <span className="text-sm text-muted">kg x</span>
                      <input className="form-input log-set-input" type="number" placeholder="reps" value={set.reps} onChange={e => updateEditLogSet(exIdx, setIdx, 'reps', e.target.value)} />
                      <span className="text-sm text-muted">reps</span>
                    </div>
                  ))
                }
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">RPE — {editLogRpe}/10</label>
              <input type="range" min="1" max="10" value={editLogRpe} onChange={e => setEditLogRpe(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea className="form-textarea" value={editLogNotes} onChange={e => setEditLogNotes(e.target.value)} placeholder="Session notes…" rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEditingLogId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEditLog} disabled={savingEditLog}>{savingEditLog ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
