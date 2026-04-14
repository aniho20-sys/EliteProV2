import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Check, X, CalendarOff, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';

// Booking window: 09:00–16:00, 30-min slots
const BOOKING_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30',
];
// Hourly bubbles for the availability display
const DISPLAY_SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00'];
const toMin = (t) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);

export default function SchedulePage() {
  const { currentUser, getSchedule, getTrainerSchedule, getClients, getClient, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useApp();
  const toast = useToast();
  const isTrainer = currentUser.role === 'trainer';
  const clients = isTrainer ? getClients(currentUser.id) : [];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // schedId
  const [deleting, setDeleting] = useState(false);
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
  // For availability checks: trainers use their own schedule; clients use trainer's full schedule
  const refSchedule = isTrainer ? allSchedule : getTrainerSchedule();

  const sessionOverlaps = (s, startMin, endMin) => {
    if (s.status === 'cancelled') return false;
    const sStart = toMin(s.time);
    const sEnd = sStart + (s.duration || 60);
    return startMin < sEnd && endMin > sStart;
  };

  const hasConflict = (date, time, duration) => {
    const startMin = toMin(time);
    const endMin = startMin + Number(duration);
    if (startMin < 9 * 60 || endMin > 16 * 60) return true;
    return refSchedule.some(s => s.date === date && sessionOverlaps(s, startMin, endMin));
  };

  // Is a display-slot hour occupied on a given date?
  const isSlotOccupied = (date, slot) => {
    const slotStart = toMin(slot);
    const slotEnd = slotStart + 60;
    return refSchedule.some(s => s.date === date && sessionOverlaps(s, slotStart, slotEnd));
  };

  // Available booking slots: filter by duration boundary + already-booked slots on selected date
  const availableBookingSlots = (duration, date) =>
    BOOKING_SLOTS.filter(s => {
      const slotMin = toMin(s);
      if (slotMin + duration > 16 * 60) return false;
      if (!date) return true;
      return !refSchedule.some(existing => existing.date === date && sessionOverlaps(existing, slotMin, slotMin + duration));
    });

  const handleAdd = async (e) => {
    e.preventDefault();

    // Validate: client must be connected to a trainer before booking
    if (!isTrainer && !trainerId) {
      toast('Connect to a coach first from your Profile before booking', 'error');
      return;
    }
    // Validate: trainer must pick a client
    if (isTrainer && !form.clientId) {
      toast('Please select a client', 'error');
      return;
    }

    if (hasConflict(form.date, form.time, form.duration)) {
      toast('Time conflict! There is already a session at this time.', 'error');
      return;
    }

    setSaving(true);
    try {
      await addScheduleItem({
        ...form,
        trainerId,
        clientId: isTrainer ? form.clientId : currentUser.id,
      });
      setForm({ clientId: '', date: '', time: '09:00', duration: 60, type: 'PT Session' });
      setShowAdd(false);
      toast('Session booked');
    } catch (err) {
      toast(`Failed to book session: ${err?.message || 'unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteScheduleItem(deleteModal);
      toast('Session deleted', 'error');
      setDeleteModal(null);
    } catch (err) {
      toast(`Failed to delete: ${err?.message || 'unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const updateStatus = async (itemId, status) => {
    try {
      await updateScheduleItem(itemId, { status });
      if (status === 'confirmed') toast('Session confirmed');
      else if (status === 'cancelled') toast('Session cancelled', 'error');
      else toast(`Session ${status}`);
    } catch (err) {
      toast(`Failed to update: ${err?.message || 'unknown error'}`, 'error');
    }
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
        <button
          className="btn btn-primary"
          onClick={() => setShowAdd(true)}
          disabled={!isTrainer && !trainerId}
          title={!isTrainer && !trainerId ? 'Connect a coach first' : undefined}
        >
          <Plus size={18} /> Book Session
        </button>
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
        <div className="schedule-day-header mb-16">
          <h3 className="card-title">{new Date(selectedDate).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          {(() => {
            const freeCount = DISPLAY_SLOTS.filter(s => !isSlotOccupied(selectedDate, s)).length;
            return <span className="text-sm text-muted">{freeCount} slot{freeCount !== 1 ? 's' : ''} free</span>;
          })()}
        </div>
        <div className="slot-row mb-16">
          {DISPLAY_SLOTS.map(slot => {
            const occupied = isSlotOccupied(selectedDate, slot);
            return (
              <button
                key={slot}
                className={`slot-bubble ${occupied ? 'booked' : 'free'}`}
                disabled={occupied}
                title={occupied ? 'Booked' : `Book ${slot}`}
                onClick={() => { setForm(f => ({ ...f, date: selectedDate, time: slot })); setShowAdd(true); }}
              >
                {parseInt(slot)}
              </button>
            );
          })}
        </div>
        {schedule.length === 0 ? (
          <EmptyState
            inCard={false}
            compact
            icon={CalendarOff}
            title="No sessions on this day"
            description="Tap below to book a session for this date."
            action={{ label: 'Book a Session', onClick: () => { setForm(f => ({ ...f, date: selectedDate })); setShowAdd(true); } }}
          />
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
                  <span className={`tag ${s.status === 'confirmed' ? 'tag-accent' : s.status === 'cancelled' ? 'tag' : 'tag-warning'}`}>{s.status}</span>
                  <div className="flex gap-8">
                    {isTrainer && s.status === 'pending' && (
                      <>
                        <button className="btn-icon" onClick={() => updateStatus(s.id, 'confirmed')} title="Confirm"><Check size={16} style={{ color: 'var(--accent)' }} /></button>
                        <button className="btn-icon" onClick={() => updateStatus(s.id, 'cancelled')} title="Cancel"><X size={16} style={{ color: 'var(--danger)' }} /></button>
                      </>
                    )}
                    {!isTrainer && s.status === 'pending' && (
                      <button className="btn btn-sm btn-outline" onClick={() => updateStatus(s.id, 'cancelled')} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Cancel</button>
                    )}
                    <button className="btn-icon" onClick={() => setDeleteModal(s.id)} title="Delete session" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete Session</h3>
            <p className="text-sm text-muted mb-16">This will permanently remove this session. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteModal(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

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
                  <input className="form-input" type="date" required value={form.date} onChange={e => {
                    const newDate = e.target.value;
                    const slots = availableBookingSlots(form.duration, newDate);
                    setForm(f => ({ ...f, date: newDate, time: slots.includes(f.time) ? f.time : (slots[0] || '09:00') }));
                  }} />
                </div>
                <div className="form-group book-form-time">
                  <label className="form-label">Time</label>
                  <select className="form-select" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>
                    {availableBookingSlots(form.duration, form.date).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="book-form-row">
                <div className="form-group book-form-duration">
                  <label className="form-label">Duration</label>
                  <select className="form-select" value={form.duration} onChange={e => {
                    const dur = Number(e.target.value);
                    const slots = availableBookingSlots(dur, form.date);
                    setForm(f => ({ ...f, duration: dur, time: slots.includes(f.time) ? f.time : (slots[0] || '09:00') }));
                  }}>
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
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Booking…' : 'Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
