import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Check, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function SchedulePage() {
  const { currentUser, getSchedule, getClients, getClient, addScheduleItem, updateScheduleItem } = useApp();
  const toast = useToast();
  const isTrainer = currentUser.role === 'trainer';
  const clients = isTrainer ? getClients(currentUser.id) : [];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ clientId: '', date: '', time: '09:00', duration: 60, type: 'PT Session' });

  // For client: find their trainer
  const trainerId = isTrainer ? currentUser.id : currentUser.trainerId;

  // Get next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  // Month label for date selector
  const selectedMonth = new Date(selectedDate).toLocaleDateString('en', { month: 'long', year: 'numeric' });

  const schedule = getSchedule(
    isTrainer ? { trainerId: currentUser.id, date: selectedDate } : { clientId: currentUser.id, date: selectedDate }
  );

  const allSchedule = getSchedule(
    isTrainer ? { trainerId: currentUser.id } : { clientId: currentUser.id }
  );

  const handleAdd = (e) => {
    e.preventDefault();
    addScheduleItem({
      ...form,
      trainerId,
      clientId: isTrainer ? form.clientId : currentUser.id,
    });
    setForm({ clientId: '', date: '', time: '09:00', duration: 60, type: 'PT Session' });
    setShowAdd(false);
    toast('Session booked');
  };

  const formatDay = (dateStr) => {
    const d = new Date(dateStr);
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), date: d.getDate() };
  };

  const getSessionCount = (date) => allSchedule.filter(s => s.date === date).length;

  return (
    <div>
      <div className="page-header schedule-header">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">Manage your appointments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={18} /> Book Session</button>
      </div>

      {/* Date selector */}
      <div className="date-selector-month">{selectedMonth}</div>
      <div className="date-selector mb-16">
        {dates.map(date => {
          const { day, date: num } = formatDay(date);
          const count = getSessionCount(date);
          return (
            <button
              key={date}
              className={`date-btn ${selectedDate === date ? 'date-btn-active' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="date-btn-day">{day}</div>
              <div className="date-btn-num">{num}</div>
              {count > 0 && <div className="date-btn-dot" />}
            </button>
          );
        })}
      </div>

      {/* Schedule list */}
      <div className="card">
        <h3 className="card-title mb-16">{new Date(selectedDate).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        {schedule.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">No sessions on this day</p>
            <button className="btn btn-outline btn-sm mt-8" onClick={() => setShowAdd(true)}>Book a session</button>
          </div>
        ) : (
          schedule.sort((a, b) => a.time.localeCompare(b.time)).map(s => {
            const client = getClient(s.clientId);
            return (
              <div key={s.id} className="schedule-item">
                <div className="schedule-item-top">
                  <div className="schedule-time">{s.time}</div>
                  <div className="schedule-info">
                    <div className="schedule-client">{isTrainer ? client?.name : s.type}</div>
                    <div className="schedule-type">{s.type} - {s.duration}min</div>
                  </div>
                </div>
                <div className="schedule-item-bottom">
                  <span className={`tag ${s.status === 'confirmed' ? 'tag-accent' : 'tag-warning'}`}>{s.status}</span>
                  {isTrainer && s.status === 'pending' && (
                    <div className="flex gap-8">
                      <button className="btn-icon" onClick={() => { updateScheduleItem(s.id, { status: 'confirmed' }); toast('Session confirmed'); }} title="Confirm"><Check size={16} style={{ color: 'var(--accent)' }} /></button>
                      <button className="btn-icon" onClick={() => { updateScheduleItem(s.id, { status: 'cancelled' }); toast('Session cancelled', 'error'); }} title="Cancel"><X size={16} style={{ color: 'var(--danger)' }} /></button>
                    </div>
                  )}
                  {!isTrainer && s.status === 'pending' && (
                    <button className="btn btn-sm btn-outline" onClick={() => { updateScheduleItem(s.id, { status: 'cancelled' }); toast('Session cancelled', 'error'); }} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Cancel</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Book Session</h3>
            <form onSubmit={handleAdd}>
              {isTrainer ? (
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-select" required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Coach</label>
                  <input className="form-input" disabled value={getClient(trainerId)?.name || 'Your Coach'} />
                </div>
              )}
              <div className="book-form-row">
                <div className="form-group book-form-date">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group book-form-time">
                  <label className="form-label">Time</label>
                  <input className="form-input" type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div className="book-form-row">
                <div className="form-group book-form-duration">
                  <label className="form-label">Duration</label>
                  <select className="form-select" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })}>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
                <div className="form-group book-form-type">
                  <label className="form-label">Type</label>
                  <input className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
