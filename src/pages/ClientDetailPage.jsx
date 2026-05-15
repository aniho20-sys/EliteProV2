import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeft, Plus, UserX, ClipboardList, NotebookPen, Trash2, TrendingUp, Play, ExternalLink, Pencil, X, Search, ChevronDown, ChevronUp, Timer } from 'lucide-react';
import { getSessionColor } from '../utils/sessionUtils';
import { normalizeSets, applySetUpdate, serializeEntries, UNIT_OPTIONS, emptySet, hasValue, formatSet } from '../utils/workoutUtils';
import { isSafeUrl, isYouTube } from '../utils/urlUtils';
import { resolveExerciseName } from '../utils/exerciseUtils';
import { METRICS, EMPTY_STAT_FORM } from '../data/metrics';
import { localToday } from '../utils/dateUtils';
import NotesSection from '../components/NotesSection';
import MuscleSelector from '../components/MuscleSelector';
import ProgressView from '../components/ProgressView';
import ExerciseProgress from '../components/ExerciseProgress';
import EmptyState from '../components/EmptyState';
import SessionDateList from '../components/SessionDateList';
import { useToast } from '../context/ToastContext';



function IntakeRow({ label, value }) {
  return (
    <div className="intake-view-row">
      <span className="intake-view-label">{label}</span>
      <span className="intake-view-value">{value}</span>
    </div>
  );
}

function VolumeChart({ logs }) {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i) * 7);
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    const label = start.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    const volume = logs
      .filter(l => l.date >= fmt(start) && l.date <= fmt(end))
      .reduce((sum, l) => sum + (l.entries || []).reduce((s2, e) => {
        if ((e.unit || 'weight_reps') !== 'weight_reps') return s2;
        return s2 + (e.sets || []).reduce((s3, s) => s3 + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
      }, 0), 0);
    return { label, volume };
  });

  const hasData = weeks.some(w => w.volume > 0);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Weekly Training Volume (kg)</h3>
      </div>
      {!hasData ? (
        <p className="text-sm text-muted" style={{ padding: '16px 0' }}>No weight-based logs yet. Volume will appear once workouts are logged.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={v => [`${v.toLocaleString()} kg`, 'Volume']}
            />
            <Bar dataKey="volume" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { currentUser, getClient, getBodyStats, addBodyStat, updateBodyStat, getWorkoutPlans, addWorkoutPlan, getWorkoutLogs, addWorkoutLog, updateWorkoutLog, getExercises, addExercise, removeClient, updateClient, getSessionStats, getBadges, getSchedule, getIntakeForm } = useApp();
  const toast = useToast();
  const exerciseLibrary = getExercises();
  const client = getClient(clientId);
  const stats = getBodyStats(clientId);
  const plans = getWorkoutPlans({ clientId });
  const logs = getWorkoutLogs(clientId);
  const completedSessions = getSchedule({ clientId })
    .filter(s => s.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date));
  const [tab, setTab] = useState('overview');
  const [progressTab, setProgressTab] = useState('body');
  const [showStatModal, setShowStatModal] = useState(false);
  const [editStat, setEditStat] = useState(null);
  const [statForm, setStatForm] = useState(EMPTY_STAT_FORM);
  const [savingStat, setSavingStat] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editingSessions, setEditingSessions] = useState(false);
  const [sessionsInput, setSessionsInput] = useState('');
  const [offsetInput, setOffsetInput] = useState('');
  const [savingSessions, setSavingSessions] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [savingTopUp, setSavingTopUp] = useState(false);
  const [editingNoteLogId, setEditingNoteLogId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [savingTag, setSavingTag] = useState(false);
  const today = localToday();
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
  const [intakeForm, setIntakeForm] = useState(undefined); // undefined = not loaded yet

  useEffect(() => {
    if (tab !== 'intake') return;
    if (intakeForm !== undefined) return;
    getIntakeForm(clientId).then(data => setIntakeForm(data || null));
  }, [tab, clientId, intakeForm, getIntakeForm]);

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

  const openStatAdd = () => { setEditStat(null); setStatForm(EMPTY_STAT_FORM); setShowStatModal(true); };
  const openStatEdit = (s) => {
    setEditStat(s);
    setStatForm({ weight: s.weight ?? '', bodyFat: s.bodyFat ?? '', chest: s.chest ?? '', waist: s.waist ?? '', hips: s.hips ?? '', arms: s.arms ?? '', legs: s.legs ?? '' });
    setShowStatModal(true);
  };
  const handleStatSubmit = async (e) => {
    e.preventDefault();
    setSavingStat(true);
    try {
      const data = {
        weight: Number(statForm.weight) || 0, bodyFat: Number(statForm.bodyFat) || 0,
        chest: Number(statForm.chest) || 0, waist: Number(statForm.waist) || 0,
        hips: Number(statForm.hips) || 0, arms: Number(statForm.arms) || 0,
        legs: Number(statForm.legs) || 0,
      };
      if (editStat) {
        await updateBodyStat(clientId, editStat.id, data);
        toast('Measurement updated');
      } else {
        await addBodyStat(clientId, { ...data, addedBy: 'coach' });
        toast('Measurement added');
      }
      setShowStatModal(false);
    } catch { toast('Failed to save measurement', 'error'); }
    finally { setSavingStat(false); }
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

  const handleTopUp = async () => {
    const qty = Number(topUpAmount);
    if (!qty || qty <= 0) return;
    setSavingTopUp(true);
    try {
      await updateClient(clientId, { totalSessions: (client?.totalSessions ?? 0) + qty });
      setTopUpOpen(false);
      setTopUpAmount('');
      toast(`Added ${qty} sessions`);
    } catch {
      toast('Failed to update sessions', 'error');
    } finally {
      setSavingTopUp(false);
    }
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (!tag) return;
    const existing = client.tags || [];
    if (existing.includes(tag)) { toast('Tag already added', 'info'); setTagInput(''); return; }
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
      setSavePlanLog(null); setSavePlanName(''); setSavePlanDay('');
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
      unit: e.unit || 'weight_reps',
      sets: (e.sets || []).map(s => ({
        weight: s.weight !== undefined ? String(s.weight) : '',
        reps: s.reps !== undefined ? String(s.reps) : '',
        seconds: s.seconds !== undefined ? String(s.seconds) : '',
        metres: s.metres !== undefined ? String(s.metres) : '',
      })),
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

  const getExerciseName = (id, fallback) => resolveExerciseName(exerciseLibrary, id, fallback);
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
        {['overview', 'progress', 'workout plans', 'workout logs', 'notes', 'intake'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
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
                  <div className="flex gap-8">
                    {sessTotal !== null && (
                      <button className="btn btn-primary btn-sm" onClick={() => { setTopUpAmount(''); setTopUpOpen(true); }}>
                        + Top Up
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => { setSessionsInput(sessTotal ?? ''); setOffsetInput(client?.sessionOffset ?? ''); setEditingSessions(true); }}>
                      {sessTotal === null ? 'Set Total' : 'Edit'}
                    </button>
                  </div>
                )}
              </div>
              {editingSessions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <span className="text-sm text-muted" style={{ minWidth: 130 }}>Total sessions:</span>
                    <input className="form-input" style={{ width: 64, padding: '4px 8px' }} type="number" min="0" inputMode="numeric" value={sessionsInput} onChange={e => setSessionsInput(e.target.value)} />
                    <span className="text-sm text-muted">sessions</span>
                  </div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <span className="text-sm text-muted" style={{ minWidth: 130 }}>Sessions used:</span>
                    <input className="form-input" style={{ width: 64, padding: '4px 8px' }} type="number" min="0" inputMode="numeric" value={offsetInput} onChange={e => setOffsetInput(e.target.value)} />
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
                    <div className="session-progress-fill" style={{ width: `${sessTotal > 0 ? Math.min(100, Math.round((sessUsed / sessTotal) * 100)) : 0}%`, background: sessColor }} />
                  </div>
                  <div className="text-sm mt-6" style={{ color: sessColor, fontWeight: 600 }}>{sessRemaining} remaining</div>
                </>
              ) : (
                <p className="text-sm text-muted">Not set — click &quot;Set Total&quot; to configure</p>
              )}
            </div>

            {/* Badges */}
            {(() => {
              const badges = getBadges(clientId);
              if (!badges.length) return null;
              return (
                <div className="mt-16">
                  <div className="text-sm fw-bold mb-8">🏅 Badges</div>
                  <div className="badges-grid">
                    {badges.map(b => (
                      <div key={b.id} className="badge-item">
                        <span className="badge-icon">{b.icon}</span>
                        <span className="badge-name">{b.name}</span>
                        <span className="badge-date">{b.awardedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
        <div className="card mt-16">
          <h3 className="card-title mb-12">Session Dates</h3>
          {completedSessions.length === 0 ? (
            <p className="text-sm text-muted">No completed sessions yet.</p>
          ) : (
            <SessionDateList sessions={completedSessions} />
          )}
        </div>
        </>
      )}

      {tab === 'progress' && (
        <div>
          <div className="flex-between mb-16">
            <div className="tabs" style={{ marginBottom: 0 }}>
              {[['body', 'Body Composition'], ['exercise', 'Exercise Progress'], ['volume', 'Volume']].map(([key, label]) => (
                <button key={key} className={`tab ${progressTab === key ? 'active' : ''}`} onClick={() => setProgressTab(key)}>
                  {label}
                </button>
              ))}
            </div>
            {progressTab === 'body' && (
              <button className="btn btn-primary btn-sm" onClick={openStatAdd}>
                <Plus size={16} /> Add Measurement
              </button>
            )}
          </div>
          {progressTab === 'body' && (
            <ProgressView clientId={clientId} canDelete={false} onAdd={openStatAdd} onEdit={openStatEdit} />
          )}
          {progressTab === 'exercise' && (
            <ExerciseProgress clientId={clientId} />
          )}
          {progressTab === 'volume' && (
            <VolumeChart logs={logs} />
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
            <div className="flex gap-8">
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/log', { state: { clientId: client.id, clientName: client.name } })}>
                Log Session
              </button>
            </div>
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
                    <div className="flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                        {entry.sets.map(s => formatSet(s, entry.unit || 'weight_reps')).join(' | ')}
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

      {tab === 'intake' && (
        <div className="card">
          <h3 className="card-title mb-16">Intake Questionnaire</h3>
          {intakeForm === undefined && <p className="text-sm text-muted">Loading…</p>}
          {intakeForm === null && <p className="text-sm text-muted">This client has not completed the intake questionnaire yet.</p>}
          {intakeForm && !intakeForm.skipped && (
            <div className="intake-view">
              <IntakeRow label="Goals" value={[...intakeForm.goals || [], ...(intakeForm.goalsOther ? [`Other: ${intakeForm.goalsOther}`] : [])].join(', ') || '—'} />
              <IntakeRow label="Weekly Frequency" value={intakeForm.frequency || '—'} />
              <IntakeRow label="Experience" value={intakeForm.experience === 'other' ? `Other: ${intakeForm.experienceOther || ''}` : intakeForm.experience || '—'} />
              <IntakeRow label="Injuries / Notes" value={intakeForm.injuries || 'None'} />
              <IntakeRow label="Height" value={intakeForm.height ? `${intakeForm.height} cm` : 'Not provided'} />
              <IntakeRow label="Weight" value={intakeForm.weight ? `${intakeForm.weight} kg` : 'Not provided'} />
              <IntakeRow label="Completed On" value={intakeForm.completedAt || '—'} />
            </div>
          )}
          {intakeForm && intakeForm.skipped && (
            <p className="text-sm text-muted">Client skipped the intake questionnaire on {intakeForm.completedAt}.</p>
          )}
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

      {topUpOpen && (
        <div className="modal-overlay" onClick={() => { setTopUpOpen(false); setTopUpAmount(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h3 className="modal-title">+ Top Up Sessions</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Currently: <strong>{sessUsed} used</strong> / <strong>{sessTotal} total</strong> — <span style={{ color: sessColor, fontWeight: 600 }}>{sessRemaining} remaining</span>
            </p>
            <div className="flex gap-8 mb-12" style={{ flexWrap: 'wrap' }}>
              {[5, 10, 20].map(n => (
                <button key={n} className={`btn btn-sm ${topUpAmount === String(n) ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTopUpAmount(String(n))}>+{n}</button>
              ))}
            </div>
            <div className="flex gap-8 mb-12" style={{ alignItems: 'center' }}>
              <span className="text-sm text-muted">Custom:</span>
              <input
                className="form-input"
                style={{ width: 72, padding: '4px 8px' }}
                type="number" min="1" inputMode="numeric"
                placeholder="0"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
              />
              <span className="text-sm text-muted">sessions</span>
            </div>
            {Number(topUpAmount) > 0 && (
              <p className="text-sm" style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: 12 }}>
                After top-up: {(sessRemaining ?? 0) + Number(topUpAmount)} remaining
              </p>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setTopUpOpen(false); setTopUpAmount(''); }} disabled={savingTopUp}>Cancel</button>
              <button className="btn btn-primary" onClick={handleTopUp} disabled={savingTopUp || !Number(topUpAmount) || Number(topUpAmount) <= 0}>
                {savingTopUp ? 'Saving…' : 'Confirm'}
              </button>
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
            {editLogEntries.map((entry, exIdx) => {
              const unit = entry.unit || 'weight_reps';
              return (
                <div key={exIdx} className="mb-16">
                  <div className="fw-bold mb-8 text-sm">{entry.name || getExerciseName(entry.exerciseId)}</div>
                  {entry.sets.length === 0
                    ? <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Skipped</p>
                    : entry.sets.map((set, setIdx) => (
                      <div key={setIdx} className="log-set-row">
                        <span className="log-set-num">Set {setIdx + 1}</span>
                        {unit === 'weight_reps' && (<>
                          <input className="form-input log-set-input" type="number" placeholder="kg" value={set.weight ?? ''} onChange={e => updateEditLogSet(exIdx, setIdx, 'weight', e.target.value)} />
                          <span className="text-sm text-muted">×</span>
                          <input className="form-input log-set-input" type="number" placeholder="reps" value={set.reps ?? ''} onChange={e => updateEditLogSet(exIdx, setIdx, 'reps', e.target.value)} />
                        </>)}
                        {unit === 'reps_only' && (<>
                          <span className="text-sm text-muted">×</span>
                          <input className="form-input log-set-input" type="number" placeholder="reps" value={set.reps ?? ''} onChange={e => updateEditLogSet(exIdx, setIdx, 'reps', e.target.value)} />
                        </>)}
                        {unit === 'time' && (<>
                          <input className="form-input log-set-input" type="number" placeholder="sec" value={set.seconds ?? ''} onChange={e => updateEditLogSet(exIdx, setIdx, 'seconds', e.target.value)} />
                          <span className="text-sm text-muted">s</span>
                        </>)}
                        {unit === 'distance' && (<>
                          <input className="form-input log-set-input" type="number" placeholder="m" value={set.metres ?? ''} onChange={e => updateEditLogSet(exIdx, setIdx, 'metres', e.target.value)} />
                          <span className="text-sm text-muted">m</span>
                        </>)}
                      </div>
                    ))
                  }
                </div>
              );
            })}
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

      {showStatModal && (
        <div className="modal-overlay" onClick={() => setShowStatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editStat ? 'Edit Measurement' : 'Add Measurement'}</h3>
            <form onSubmit={handleStatSubmit}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-input" type="number" step="0.1" min="20" max="300" required value={statForm.weight} onChange={e => setStatForm({ ...statForm, weight: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Body Fat (%)</label><input className="form-input" type="number" step="0.1" min="2" max="60" value={statForm.bodyFat} onChange={e => setStatForm({ ...statForm, bodyFat: e.target.value })} /></div>
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
                <button type="button" className="btn btn-outline" onClick={() => setShowStatModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingStat}>{savingStat ? 'Saving…' : editStat ? 'Save Changes' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
