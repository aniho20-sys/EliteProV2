import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ProgressPage() {
  const { currentUser, getBodyStats, addBodyStat } = useApp();
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

      {/* Progress bars */}
      {stats.length > 1 && firstStat && latestStat && (
        <div className="card mb-16">
          <h3 className="card-title mb-16">Progress Overview</h3>
          {metrics.map(key => {
            const first = firstStat[key] || 0;
            const last = latestStat[key] || 0;
            const change = last - first;
            const pct = Math.min(100, Math.max(5, (last / (first * 1.3)) * 100));
            return (
              <div key={key} className="chart-bar-group">
                <div className="chart-bar-label">
                  <span>{labels[key]}</span>
                  <span>
                    {last}{units[key]}
                    <span style={{ color: change > 0 ? 'var(--accent)' : 'var(--danger)', fontSize: '0.75rem', marginLeft: 4 }}>
                      ({change > 0 ? '+' : ''}{change.toFixed(1)})
                    </span>
                  </span>
                </div>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
                </div>
              </div>
            );
          })}
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
                <tr><th>Date</th><th>Weight</th><th>BF%</th><th>Chest</th><th>Waist</th><th>Arms</th><th>Legs</th></tr>
              </thead>
              <tbody>
                {[...stats].reverse().map((s, i) => (
                  <tr key={i}>
                    <td>{s.date}</td><td>{s.weight}kg</td><td>{s.bodyFat}%</td>
                    <td>{s.chest}cm</td><td>{s.waist}cm</td><td>{s.arms}cm</td><td>{s.legs}cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="history-cards-mobile">
            {[...stats].reverse().map((s, i) => (
              <div key={i} className="history-card">
                <div className="history-card-date">{s.date}</div>
                <div className="body-stats-grid">
                  <div className="body-stat-item"><span className="body-stat-label">Weight</span><span className="body-stat-value">{s.weight}kg</span></div>
                  <div className="body-stat-item"><span className="body-stat-label">Body Fat</span><span className="body-stat-value">{s.bodyFat}%</span></div>
                  <div className="body-stat-item"><span className="body-stat-label">Chest</span><span className="body-stat-value">{s.chest}cm</span></div>
                  <div className="body-stat-item"><span className="body-stat-label">Waist</span><span className="body-stat-value">{s.waist}cm</span></div>
                  <div className="body-stat-item"><span className="body-stat-label">Arms</span><span className="body-stat-value">{s.arms}cm</span></div>
                  <div className="body-stat-item"><span className="body-stat-label">Legs</span><span className="body-stat-value">{s.legs}cm</span></div>
                </div>
              </div>
            ))}
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
                <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-input" type="number" step="0.1" required value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Body Fat (%)</label><input className="form-input" type="number" step="0.1" value={form.bodyFat} onChange={e => setForm({ ...form, bodyFat: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Chest (cm)</label><input className="form-input" type="number" step="0.1" value={form.chest} onChange={e => setForm({ ...form, chest: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Waist (cm)</label><input className="form-input" type="number" step="0.1" value={form.waist} onChange={e => setForm({ ...form, waist: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Arms (cm)</label><input className="form-input" type="number" step="0.1" value={form.arms} onChange={e => setForm({ ...form, arms: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Legs (cm)</label><input className="form-input" type="number" step="0.1" value={form.legs} onChange={e => setForm({ ...form, legs: e.target.value })} /></div>
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
