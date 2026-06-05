import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Check, X, CalendarOff, Trash2, Clock, CheckCircle, Send, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { getSessionColor } from '../utils/sessionUtils';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { localToday, localDateAdd, parseLocalDate } from '../utils/dateUtils';

const toMin = (t) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);

const generateSlots = (start, end, step) => {
  const slots = [];
  let cur = toMin(start);
  const endMin = toMin(end);
  while (cur < endMin) {
    slots.push(`${Math.floor(cur / 60).toString().padStart(2, '0')}:${(cur % 60).toString().padStart(2, '0')}`);
    cur += step;
  }
  return slots;
};

export default function SchedulePage() {
  const { currentUser, getSchedule, getTrainerSchedule, getClients, getClient, addScheduleItem, updateScheduleItem, deleteScheduleItem, getSessionStats, incrementSessionOffset, sendMessage } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const isTrainer = currentUser.role === 'trainer';
  const clients = isTrainer ? getClients(currentUser.id) : [];

  const [selectedDate, setSelectedDate] = useState(localToday());
  const [dateOffset, setDateOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { id, isBlocked }
  const [deleting, setDeleting] = useState(false);
  const [lateCancelModal, setLateCancelModal] = useState(null); // session object
  const [cancelingLate, setCancelingLate] = useState(false);
  const [bookMode, setBookMode] = useState('session'); // 'session' | 'block'
  const [form, setForm] = useState({ clientId: '', date: '', time: '', duration: 60, type: 'PT Session', label: '' });
  const [blockTimes, setBlockTimes] = useState(new Set());
  const [recapSession, setRecapSession] = useState(null); // schedule item to recap
  const [recapNote, setRecapNote] = useState('');
  const [recapSend, setRecapSend] = useState(true);
  const [savingRecap, setSavingRecap] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const [bannerDismissed, setBannerDismissed] = useState(
    () => !!localStorage.getItem('elitepro_wh_banner_dismissed')
  );
  const dismissBanner = () => {
    localStorage.setItem('elitepro_wh_banner_dismissed', '1');
    setBannerDismissed(true);
  };

  // For client: find their trainer
  const trainerId = isTrainer ? currentUser.id : currentUser.trainerId;

  // Working hours: trainer's own settings, client reads their trainer's settings
  const trainerUser = isTrainer ? currentUser : getClient(trainerId);
  const whStart = trainerUser?.workingHours?.start || '09:00';
  const whEnd = trainerUser?.workingHours?.end || '17:00';
  const BOOKING_SLOTS = generateSlots(whStart, whEnd, 30);

  // 14-day window starting from offset (can go negative to see past)
  const dates = Array.from({ length: 14 }, (_, i) => localDateAdd(dateOffset + i));
  const today = localToday();

  // Month label based on the first visible date
  const selectedMonth = parseLocalDate(dates[0]).toLocaleDateString('en', { month: 'long', year: 'numeric' });

  const schedule = getSchedule(
    isTrainer ? { trainerId: currentUser.id, date: selectedDate } : { clientId: currentUser.id, date: selectedDate }
  );

  const allSchedule = getSchedule(
    isTrainer ? { trainerId: currentUser.id } : { clientId: currentUser.id }
  );
  // For availability checks: trainers use their own schedule; clients use trainer's full schedule
  const refSchedule = isTrainer ? allSchedule : getTrainerSchedule();

  const isWithin24Hours = (date, time) => {
    const sessionDt = new Date(`${date}T${time}:00`);
    const diffHours = (sessionDt - new Date()) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours < 24;
  };

  const handleClientCancel = (session) => {
    if (isWithin24Hours(session.date, session.time)) {
      setLateCancelModal(session);
    } else {
      updateStatus(session.id, 'cancelled');
    }
  };

  const handleLateCancelConfirm = async () => {
    if (!lateCancelModal) return;
    setCancelingLate(true);
    try {
      await updateScheduleItem(lateCancelModal.id, { status: 'cancelled', lateCancellation: true });
      await incrementSessionOffset(lateCancelModal.clientId);
      toast('Session cancelled — the full session fee still applies per our policy.', 'info');
      setLateCancelModal(null);
    } catch (err) {
      toast(`Failed: ${err?.message || 'unknown error'}`, 'error');
    } finally {
      setCancelingLate(false);
    }
  };

  const sessionOverlaps = (s, startMin, endMin) => {
    if (s.status === 'cancelled') return false;
    const sStart = toMin(s.time);
    const sEnd = sStart + (s.duration || 60);
    return startMin < sEnd && endMin > sStart;
  };

  const hasConflict = (date, time, duration) => {
    const startMin = toMin(time);
    const endMin = startMin + Number(duration);
    if (startMin < toMin(whStart) || endMin > toMin(whEnd)) return true;
    return refSchedule.some(s => s.date === date && sessionOverlaps(s, startMin, endMin));
  };

  // Available booking slots: filter by duration boundary + already-booked slots on selected date
  const availableBookingSlots = (duration, date) =>
    BOOKING_SLOTS.filter(s => {
      const slotMin = toMin(s);
      if (slotMin + duration > toMin(whEnd)) return false;
      if (!date) return true;
      return !refSchedule.some(existing => existing.date === date && sessionOverlaps(existing, slotMin, slotMin + duration));
    });

  const handleAdd = async (e) => {
    e.preventDefault();

    if (bookMode === 'block') {
      if (!form.date) { toast('Please select a date', 'error'); return; }
      if (blockTimes.size === 0) { toast('Please select at least one time slot', 'error'); return; }
      const count = blockTimes.size;
      setSaving(true);
      try {
        await Promise.all([...blockTimes].sort().map(time =>
          addScheduleItem({
            trainerId: currentUser.id,
            clientId: '',
            isBlocked: true,
            date: form.date,
            time,
            duration: Number(form.duration),
            type: 'Blocked',
            status: 'blocked',
            notes: form.label || '',
          })
        ));
        setBlockTimes(new Set());
        setForm({ clientId: '', date: '', time: '', duration: 60, type: 'PT Session', label: '' });
        setShowAdd(false);
        toast(`${count} time slot${count > 1 ? 's' : ''} blocked`);
      } catch (err) {
        toast(`Failed to block time: ${err?.message || 'unknown error'}`, 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

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

    const targetClientId = isTrainer ? form.clientId : currentUser.id;
    const { remaining } = getSessionStats(targetClientId);
    if (remaining !== null && remaining <= 0) {
      toast('Session quota exceeded — add more sessions in client settings', 'error');
      return;
    }

    setSaving(true);
    try {
      await addScheduleItem({
        ...form,
        trainerId,
        clientId: isTrainer ? form.clientId : currentUser.id,
      });
      setForm({ clientId: '', date: '', time: '', duration: 60, type: 'PT Session', label: '' });
      setShowAdd(false);
      setBookMode('session');
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
      await deleteScheduleItem(deleteModal.id);
      toast(deleteModal.isBlocked ? 'Block removed' : 'Session deleted', 'info');
      setDeleteModal(null);
    } catch (err) {
      toast(`Failed to delete: ${err?.message || 'unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };


  const updateStatus = async (itemId, status) => {
    if (updatingStatus === itemId) return;
    setUpdatingStatus(itemId);
    try {
      await updateScheduleItem(itemId, { status });
      if (status === 'confirmed') toast('Session confirmed');
      else if (status === 'cancelled') toast('Session cancelled', 'info');
      else toast(`Session ${status}`);
    } catch (err) {
      toast(`Failed to update: ${err?.message || 'unknown error'}`, 'error');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openRecap = (session) => {
    setRecapSession(session);
    const client = getClient(session.clientId);
    setRecapNote(`Great session today, ${client?.name?.split(' ')[0] || 'client'}! 💪`);
    setRecapSend(true);
  };

  const handleConfirmComplete = async () => {
    if (!recapSession || savingRecap) return;
    setSavingRecap(true);
    const clientId = recapSession.clientId;
    const { remaining: prevRemaining, total, used: prevUsed } = getSessionStats(clientId);

    try {
      await updateScheduleItem(recapSession.id, { status: 'completed' });
    } catch (err) {
      toast(`Failed to complete session: ${err?.message || 'unknown error'}`, 'error');
      setSavingRecap(false);
      return;
    }

    if (!clientId) {
      toast('課堂完成（未能扣堂：session 缺少 clientId）', 'info');
      setRecapSession(null);
      setRecapNote('');
      setSavingRecap(false);
      return;
    }

    let deducted = false;
    try {
      await incrementSessionOffset(clientId);
      deducted = true;
    } catch (err) {
      const errMsg = err?.code || err?.message || String(err) || 'unknown error';
      console.error('[incrementSessionOffset] failed:', errMsg, 'clientId:', clientId);
      toast(`堂數未能自動扣減: ${errMsg}`, 'error');
    }

    if (recapSend && recapNote.trim()) {
      try {
        const fullMsg = `📋 Session Recap — ${recapSession.date} ${recapSession.time}\nType: ${recapSession.type}\n\n${recapNote.trim()}`;
        await sendMessage(currentUser.id, clientId, fullMsg);
      } catch { /* non-critical */ }
    }

    if (deducted) {
      const newUsed = prevUsed + 1;
      const countMsg = total !== null
        ? ` · 剩餘 ${Math.max(0, total - newUsed)} 堂（${newUsed}/${total}）`
        : ` · 已用 ${newUsed} 堂`;
      toast(`課堂完成${countMsg}`);
    } else {
      toast('課堂完成（堂數未扣減）', 'info');
    }

    setRecapSession(null);
    setRecapNote('');
    setSavingRecap(false);
  };

  const formatDay = (dateStr) => {
    const d = parseLocalDate(dateStr);
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), date: d.getDate() };
  };

  const getSessionCount = (date) => allSchedule.filter(s => s.date === date && !s.isBlocked).length;

  return (
    <div>
      <div className="page-header schedule-header">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">Manage your appointments</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setBookMode('session'); setShowAdd(true); }}
          disabled={!isTrainer && !trainerId}
          title={!isTrainer && !trainerId ? 'Connect a coach first' : undefined}
        >
          <Plus size={18} /> Book Session
        </button>
      </div>

      {/* Working hours banner for trainers who haven't set theirs yet */}
      {isTrainer && !currentUser.workingHours && !bannerDismissed && (
        <div className="wh-banner">
          <Clock size={16} style={{ flexShrink: 0 }} />
          <span>Set your working hours so clients can only book within your availability.</span>
          <div className="flex gap-8" style={{ flexShrink: 0 }}>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/profile')}>Set Hours</button>
            <button className="btn-icon" onClick={dismissBanner} title="Dismiss" aria-label="Dismiss banner"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Date selector */}
      <div className="date-selector-nav">
        <button className="btn-icon" onClick={() => setDateOffset(p => p - 7)} title="Previous week" aria-label="Previous week"><ChevronLeft size={18} /></button>
        <span className="date-selector-month" style={{ margin: 0 }}>{selectedMonth}</span>
        <button className="btn-icon" onClick={() => setDateOffset(p => p + 7)} title="Next week" aria-label="Next week"><ChevronRight size={18} /></button>
        {dateOffset !== 0 && (
          <button className="btn btn-sm btn-outline" onClick={() => { setDateOffset(0); setSelectedDate(today); }}>Today</button>
        )}
      </div>
      <div className="date-selector mb-16">
        {dates.map(date => {
          const { day, date: num } = formatDay(date);
          const count = getSessionCount(date);
          const isToday = date === today;
          const isPast = date < today;
          return (
            <button
              key={date}
              className={`date-btn ${selectedDate === date ? 'date-btn-active' : ''} ${isPast ? 'date-btn-past' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="date-btn-day">{isToday ? 'Today' : day}</div>
              <div className="date-btn-num">{num}</div>
              {count > 0 && <div className="date-btn-dot" />}
            </button>
          );
        })}
      </div>

      {/* Schedule list */}
      <div className="card">
        <div className="schedule-day-header mb-16">
          <h3 className="card-title">{parseLocalDate(selectedDate).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
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
            if (s.isBlocked) {
              // Hide block if a real session already occupies that time
              const blockStart = toMin(s.time);
              const blockEnd = s.endTime ? toMin(s.endTime) : blockStart + 60;
              const hidden = schedule.some(r => !r.isBlocked && r.status !== 'cancelled' && toMin(r.time) < blockEnd && (toMin(r.time) + (r.duration || 60)) > blockStart);
              if (hidden) return null;
              return (
                <div key={s.id} className="schedule-item schedule-item-blocked">
                  <div className="schedule-item-top">
                    <div className="schedule-time">{s.time}{s.duration ? ` – ${Math.floor((toMin(s.time) + s.duration) / 60).toString().padStart(2,'0')}:${((toMin(s.time) + s.duration) % 60).toString().padStart(2,'0')}` : ''}</div>
                    <div className="schedule-info">
                      <div className="schedule-client">Blocked</div>
                      {s.notes && <div className="schedule-type">{s.notes}</div>}
                    </div>
                  </div>
                  <div className="schedule-item-bottom">
                    <span className="tag">unavailable</span>
                    <button className="btn-icon" aria-label="Remove block" onClick={() => setDeleteModal({ id: s.id, isBlocked: true })} title="Remove block" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            }
            const client = getClient(s.clientId);
            const sessBadge = (() => {
              if (!isTrainer || s.status === 'completed' || s.status === 'cancelled') return null;
              const { remaining, total } = getSessionStats(s.clientId);
              if (total === null) return null;
              const color = remaining <= 2 ? 'var(--danger)' : remaining <= 5 ? 'var(--warning)' : 'var(--text-muted)';
              return <span style={{ fontSize: '0.72rem', color, fontWeight: 600, marginLeft: 6 }}>{remaining} left</span>;
            })();
            return (
              <div key={s.id} className="schedule-item">
                <div className="schedule-item-top">
                  <div className="schedule-time">{s.time}</div>
                  <div className="schedule-info">
                    <div className="schedule-client">{isTrainer ? client?.name : s.type}{sessBadge}</div>
                    <div className="schedule-type">{s.type} - 60 min</div>
                  </div>
                </div>
                <div className="schedule-item-bottom">
                  <div className="flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`tag ${s.status === 'completed' ? 'tag-accent' : s.status === 'confirmed' ? 'tag-primary' : s.status === 'cancelled' ? 'tag' : 'tag-warning'}`}>{s.status}</span>
                    {s.lateCancellation && <span className="tag tag-warning">late cancel</span>}
                  </div>
                  <div className="flex gap-8">
                    {isTrainer && s.status === 'pending' && (
                      <>
                        <button className="btn-icon" aria-label="Confirm session" onClick={() => updateStatus(s.id, 'confirmed')} title="Confirm" disabled={updatingStatus === s.id}><Check size={16} style={{ color: 'var(--accent)' }} /></button>
                        <button className="btn-icon" aria-label="Cancel session" onClick={() => updateStatus(s.id, 'cancelled')} title="Cancel" disabled={updatingStatus === s.id}><X size={16} style={{ color: 'var(--danger)' }} /></button>
                      </>
                    )}
                    {isTrainer && (s.status === 'pending' || s.status === 'confirmed') && (
                      <button className="btn-icon" aria-label="Mark session complete" onClick={() => openRecap(s)} title="Mark as complete"><CheckCircle size={16} style={{ color: 'var(--accent)' }} /></button>
                    )}
                    {!isTrainer && (s.status === 'pending' || s.status === 'confirmed') && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleClientCancel(s)} disabled={updatingStatus === s.id} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Cancel</button>
                    )}
                    <button className="btn-icon" aria-label="Delete session" onClick={() => setDeleteModal({ id: s.id, isBlocked: false })} title="Delete session" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
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
            <h3 className="modal-title">{deleteModal.isBlocked ? 'Remove Block' : 'Delete Session'}</h3>
            <p className="text-sm text-muted mb-16">{deleteModal.isBlocked ? 'This time slot will become available again.' : 'This will permanently remove this session. This cannot be undone.'}</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteModal(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Removing…' : deleteModal.isBlocked ? 'Remove' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}


      {lateCancelModal && (
        <div className="modal-overlay" onClick={() => !cancelingLate && setLateCancelModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <h3 className="modal-title" style={{ margin: 0 }}>Late Cancellation Notice</h3>
            </div>
            <p className="text-sm" style={{ marginBottom: 8 }}>
              This session starts in less than <strong>24 hours</strong>:
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.9rem' }}>
              <div><strong>{lateCancelModal.date}</strong> at <strong>{lateCancelModal.time}</strong></div>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{lateCancelModal.type}</div>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Per our cancellation policy, <strong>the full session fee still applies</strong> for cancellations made within 24 hours of the scheduled time. Your trainer will be notified.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setLateCancelModal(null)} disabled={cancelingLate}>Go Back</button>
              <button className="btn btn-danger" onClick={handleLateCancelConfirm} disabled={cancelingLate}>
                {cancelingLate ? 'Cancelling…' : 'Cancel Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {recapSession && (
        <div className="modal-overlay" onClick={() => !savingRecap && setRecapSession(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Complete Session</h3>
            <div className="recap-session-info">
              <div className="recap-row"><span className="form-label">Client</span><span>{getClient(recapSession.clientId)?.name || '—'}</span></div>
              <div className="recap-row"><span className="form-label">Date</span><span>{recapSession.date} · {recapSession.time}</span></div>
              <div className="recap-row"><span className="form-label">Type</span><span>{recapSession.type}</span></div>
              {(() => {
                const { remaining, total, used } = getSessionStats(recapSession.clientId);
                if (total === null) return (
                  <div className="recap-row">
                    <span className="form-label">Sessions</span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Used: {used} · No quota set</span>
                  </div>
                );
                return (
                  <div className="recap-row">
                    <span className="form-label">Sessions</span>
                    <span style={{ color: remaining <= 2 ? 'var(--danger)' : 'var(--text)', fontWeight: 600 }}>
                      {remaining} remaining → after: {Math.max(0, remaining - 1)}
                      {remaining <= 2 && <span style={{ marginLeft: 6, fontSize: '0.8rem' }}>⚠️ Low</span>}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="form-group">
              <label className="form-label">Message to client (optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={recapNote}
                onChange={e => setRecapNote(e.target.value)}
                placeholder="Add a note for the client…"
                disabled={savingRecap}
              />
            </div>
            <label className="recap-send-toggle">
              <input type="checkbox" checked={recapSend} onChange={e => setRecapSend(e.target.checked)} disabled={savingRecap} />
              <Send size={14} />
              Send recap message to client
            </label>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRecapSession(null)} disabled={savingRecap}>Cancel</button>
              <button className="btn btn-accent" onClick={handleConfirmComplete} disabled={savingRecap}>
                {savingRecap ? 'Saving…' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setBookMode('session'); setBlockTimes(new Set()); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{bookMode === 'block' ? 'Block Time' : 'Book Session'}</h3>
            {isTrainer && (
              <div className="log-unit-picker" style={{ marginBottom: 16 }}>
                <button type="button" className={`log-unit-pill${bookMode === 'session' ? ' active' : ''}`} onClick={() => { setBookMode('session'); setBlockTimes(new Set()); }}>Book Session</button>
                <button type="button" className={`log-unit-pill${bookMode === 'block' ? ' active' : ''}`} onClick={() => setBookMode('block')}><Lock size={13} style={{ marginRight: 4 }} />Block Time</button>
              </div>
            )}
            <form onSubmit={handleAdd}>
              {bookMode === 'session' && (isTrainer ? (
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
              ))}
              {bookMode === 'session' && (() => {
                const cId = isTrainer ? form.clientId : currentUser.id;
                if (!cId) return null;
                const { used, total, remaining } = getSessionStats(cId);
                if (total === null) return null;
                const color = getSessionColor(remaining);
                return (
                  <div className="session-info-banner" style={{ borderColor: color }}>
                    <span className="text-sm">Sessions: <strong style={{ color }}>{used} / {total}</strong></span>
                    <span className="text-sm" style={{ color, fontWeight: 600 }}>{remaining} remaining</span>
                  </div>
                );
              })()}
              {bookMode === 'session' ? (
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
                      {!form.time && <option value="">Select time</option>}
                      {availableBookingSlots(form.duration, form.date).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="form-input" type="date" required value={form.date} onChange={e => {
                      setBlockTimes(new Set());
                      setForm(f => ({ ...f, date: e.target.value }));
                    }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration per slot</label>
                    <select className="form-select" value={form.duration} onChange={e => {
                      setBlockTimes(new Set());
                      setForm(f => ({ ...f, duration: Number(e.target.value) }));
                    }}>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </div>
                  {form.date && (() => {
                    const dur = Number(form.duration);
                    const fittingSlots = BOOKING_SLOTS.filter(s => toMin(s) + dur <= toMin(whEnd));
                    return (
                      <div className="form-group">
                        <label className="form-label">
                          Time Slots
                          {blockTimes.size > 0 && <span className="block-slot-count">{blockTimes.size} selected</span>}
                        </label>
                        <div className="time-slot-grid">
                          {fittingSlots.map(slot => {
                            const slotMin = toMin(slot);
                            const busy = refSchedule.some(s => s.date === form.date && s.status !== 'cancelled' && sessionOverlaps(s, slotMin, slotMin + dur));
                            const selected = blockTimes.has(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                className={`time-slot-chip${selected ? ' selected' : ''}${busy ? ' busy' : ''}`}
                                disabled={busy}
                                onClick={() => setBlockTimes(prev => {
                                  const next = new Set(prev);
                                  if (next.has(slot)) next.delete(slot); else next.add(slot);
                                  return next;
                                })}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
              {bookMode === 'session' && (
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <input className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
                </div>
              )}
              {bookMode === 'block' && (
                <div className="form-group">
                  <label className="form-label">Label <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                  <input className="form-input" placeholder="e.g. Lunch, Personal, Meeting" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAdd(false); setBookMode('session'); setBlockTimes(new Set()); }} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? (bookMode === 'block' ? 'Blocking…' : 'Booking…')
                    : bookMode === 'block'
                      ? (blockTimes.size > 0 ? `Block ${blockTimes.size} Slot${blockTimes.size > 1 ? 's' : ''}` : 'Block Time')
                      : 'Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
