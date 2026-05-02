import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ProgressView from '../components/ProgressView';
import ExerciseProgress from '../components/ExerciseProgress';
import { EMPTY_STAT_FORM } from '../data/metrics';
import { localToday } from '../utils/dateUtils';

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
            <Bar dataKey="volume" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const { currentUser, getBodyStats, addBodyStat, updateBodyStat, getWorkoutLogs } = useApp();
  const logs = getWorkoutLogs(currentUser.id);
  const stats = getBodyStats(currentUser.id);
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('body');
  const [showModal, setShowModal] = useState(false);
  const [editStat, setEditStat] = useState(null); // null = add mode, object = edit mode
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_STAT_FORM);

  const openAdd = () => { setEditStat(null); setForm(EMPTY_STAT_FORM); setShowModal(true); };
  const openEdit = (stat) => {
    setEditStat(stat);
    setForm({
      weight: stat.weight ?? '',
      bodyFat: stat.bodyFat ?? '',
      chest: stat.chest ?? '',
      waist: stat.waist ?? '',
      hips: stat.hips ?? '',
      arms: stat.arms ?? '',
      legs: stat.legs ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        weight: Number(form.weight) || 0,
        bodyFat: Number(form.bodyFat) || 0,
        chest: Number(form.chest) || 0,
        waist: Number(form.waist) || 0,
        hips: Number(form.hips) || 0,
        arms: Number(form.arms) || 0,
        legs: Number(form.legs) || 0,
      };
      if (editStat) {
        await updateBodyStat(currentUser.id, editStat.id, data);
        toast('Measurement updated');
      } else {
        await addBodyStat(currentUser.id, { ...data, date: localToday() });
        toast('Measurement saved');
      }
      setShowModal(false);
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
        {activeTab === 'body' && (
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Measurement
          </button>
        )}
      </div>

      <div className="tabs mb-16">
        {[['body', 'Body Composition'], ['exercise', 'Exercise Progress'], ['volume', 'Volume']].map(([key, label]) => (
          <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'body' && (
        <ProgressView clientId={currentUser.id} canDelete onAdd={openAdd} onEdit={openEdit} />
      )}
      {activeTab === 'exercise' && (
        <ExerciseProgress clientId={currentUser.id} />
      )}
      {activeTab === 'volume' && (
        <VolumeChart logs={logs} />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editStat ? 'Edit Measurement' : 'Add Measurement'}</h3>
            <form onSubmit={handleSubmit}>
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
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editStat ? 'Save Changes' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
