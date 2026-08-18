import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Building2, Calendar, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { localToday, localDateAdd, addDays } from '../utils/dateUtils';

export default function StudioBookingPage() {
  const { currentUser, getStudios, getAvailableSlots, bookStudioSlot, cancelSlotBooking, getMyBookedSlots } = useApp();
  const toast = useToast();
  const today = localToday();

  const studios = getStudios();
  const myBookings = getMyBookedSlots();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedStudioId, setSelectedStudioId] = useState('');
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const allSlots = getAvailableSlots({ date: selectedDate, studioId: selectedStudioId || undefined });
  const availableSlots = allSlots.filter(s => s.status === 'available');

  const handleBook = async () => {
    if (!confirmSlot || booking) return;
    setBooking(true);
    try {
      await bookStudioSlot(confirmSlot.id, currentUser.id);
      toast(`Booked ${confirmSlot.startTime}–${confirmSlot.endTime} at ${confirmSlot.studioName}`);
      setConfirmSlot(null);
    } catch (err) {
      toast(err.message === 'Slot already booked' ? 'This slot was just taken — please choose another' : 'Booking failed', 'error');
      setConfirmSlot(null);
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (slotId) => {
    if (cancelling === slotId) return;
    setCancelling(slotId);
    try {
      await cancelSlotBooking(slotId);
      toast('Booking cancelled');
    } catch {
      toast('Failed to cancel booking', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (slot) => {
    const slotStart = new Date(`${slot.date}T${slot.startTime || '00:00'}:00`);
    const cutoff = new Date(slotStart.getTime() - 24 * 3600 * 1000);
    return new Date() < cutoff;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Book Studio</h1>
        <p className="page-subtitle">Reserve a time slot at a gym啦 venue</p>
      </div>

      {/* Filters */}
      <div className="card mb-16">
        <div className="form-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={selectedDate} min={today} max={localDateAdd(30)} onChange={e => setSelectedDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '2 1 200px' }}>
            <label className="form-label">Studio</label>
            <select className="form-input" value={selectedStudioId} onChange={e => setSelectedStudioId(e.target.value)}>
              <option value="">All Studios</option>
              {studios.filter(s => s.active !== false).map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.district}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Available Slots */}
      <div className="card mb-16">
        <h3 className="card-title mb-16">Available Slots — {selectedDate}</h3>
        {availableSlots.length === 0 ? (
          <EmptyState inCard={false} compact icon={Calendar} title="No available slots" description="Try a different date or studio." action={{ label: 'Try Next Day', onClick: () => setSelectedDate(d => addDays(d, 1)) }} />
        ) : (
          <div className="slot-book-grid">
            {availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
              <div key={slot.id} className="slot-book-card">
                <div className="slot-time">{slot.startTime}–{slot.endTime}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{slot.studioName}</div>
                {slot.priceHKD > 0 && <div className="slot-price">HKD {slot.priceHKD}</div>}
                <button className="btn btn-sm btn-accent" style={{ width: '100%' }} onClick={() => setConfirmSlot(slot)}>
                  Book
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Bookings */}
      {myBookings.length > 0 && (
        <div className="card">
          <h3 className="card-title mb-16">My Bookings</h3>
          {myBookings.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).map(slot => (
            <div key={slot.id} className="booked-slot-item">
              <div>
                <div className="fw-bold">{slot.studioName}</div>
                <div className="text-sm text-muted">{slot.date} · {slot.startTime}–{slot.endTime}</div>
              </div>
              {canCancel(slot) ? (
                <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleCancel(slot.id)} disabled={cancelling === slot.id}>
                  {cancelling === slot.id ? 'Cancelling…' : <><X size={13} /> Cancel</>}
                </button>
              ) : (
                <span className="tag tag-accent">Confirmed</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {confirmSlot && (
        <div className="modal-overlay" onClick={() => !booking && setConfirmSlot(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Confirm Booking</h3>
            <p className="text-sm mb-16">
              <strong>{confirmSlot.studioName}</strong><br />
              {confirmSlot.date} · {confirmSlot.startTime}–{confirmSlot.endTime}
              {confirmSlot.priceHKD > 0 && <><br />HKD {confirmSlot.priceHKD}</>}
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmSlot(null)} disabled={booking}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBook} disabled={booking}>{booking ? 'Booking…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
