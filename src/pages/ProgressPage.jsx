import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ProgressView from '../components/ProgressView';

export default function ProgressPage() {
  const { currentUser, getBodyStats, addBodyStat } = useApp();
  const stats = getBodyStats(currentUser.id);
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', legs: '' });

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

      <ProgressView clientId={currentUser.id} canDelete onAdd={() => setShowAdd(true)} />

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
