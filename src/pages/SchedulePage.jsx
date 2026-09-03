import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Check, X, CalendarOff, Trash2, Clock, CheckCircle, Send, ChevronLeft, ChevronRight, Lock, RotateCcw } from 'lucide-react';
import { getSessionColor, SESSION_DANGER_THRESHOLD, OVERDRAFT_LIMIT } from '../utils/sessionUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import RenewalPromptModal from '../components/RenewalPromptModal';
import PaymentSheetModal from '../components/PaymentSheetModal';
import { renewalPromptKind, renewalSnoozeUntil, RENEWAL_SNOOZE_FIELD } from '../utils/renewalPrompt';
import { localToday, localDateAdd, parseLocalDate } from '../utils/dateUtils';
import { useLanguage } from '../i18n/LanguageContext';
import { formatLongDate, formatMonthYear, formatWeekdayShort } from '../i18n/format';

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
  const { currentUser, getSchedule, getTrainerSchedule, getClients, getClient, addScheduleItem, updateScheduleItem, deleteScheduleItem, getSessionStats, sendMessage, updateClient } = useApp();
  const toast = useToast();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const isTrainer = currentUser.role === 'trainer';

  // Status is a stored value ('pending'/'confirmed'/…), so it cannot be handed to t()
  // directly — t() refuses a variable key. One literal call per status instead.
  const statusLabel = (status) => ({
    pending: t('sched.status_pending'),
    confirmed: t('sched.status_confirmed'),
    completed: t('sched.status_completed'),
    cancelled: t('sched.status_cancelled'),
  }[status] || status);
  const clients = isTrainer ? getClients(currentUser.id) : [];

  const [selectedDate, setSelectedDate] = useState(localToday());
  const [dateOffset, setDateOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { id, isBlocked }
  const [overdraftModal, setOverdraftModal] = useState(false); // confirm booking on credit
  const [blockedModal, setBlockedModal] = useState(false); // already owes a session
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
  const [renewalPrompt, setRenewalPrompt] = useState(null); // { kind, remainingAfter, trainer }
  const [paymentSheet, setPaymentSheet] = useState(null); // { trainer, remaining }

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
  const selectedMonth = formatMonthYear(dates[0], lang);

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
      toast(t('sched.toast_late_cancelled'), 'info');
      setLateCancelModal(null);
    } catch (err) {
      toast(t('sched.err_failed', { msg: err?.message || t('sched.unknown_error') }), 'error');
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
      if (!form.date) { toast(t('sched.err_select_date'), 'error'); return; }
      if (blockTimes.size === 0) { toast(t('sched.err_select_slot'), 'error'); return; }
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
        toast(t('sched.toast_slots_blocked', { count }));
      } catch (err) {
        toast(t('sched.err_block_failed', { msg: err?.message || t('sched.unknown_error') }), 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validate: client must be connected to a trainer before booking
    if (!isTrainer && !trainerId) {
      toast(t('sched.err_connect_first'), 'error');
      return;
    }
    // Validate: trainer must pick a client
    if (isTrainer && !form.clientId) {
      toast(t('sched.err_select_client'), 'error');
      return;
    }

    if (hasConflict(form.date, form.time, form.duration)) {
      toast(t('sched.err_time_conflict'), 'error');
      return;
    }

    const targetClientId = isTrainer ? form.clientId : currentUser.id;
    const { remaining } = getSessionStats(targetClientId);

    // Overdraft: a client with 0 left may book exactly one session on credit
    // (CLAUDE.md #33). Past that they're hard-blocked. These checks are the
    // UX layer only — onScheduleBooked enforces the same cap server-side,
    // because `remaining` here comes from a listener that lags the trigger.
    // Both of these modals share .modal-overlay's z-index with the booking
    // form, and render EARLIER in the JSX — so with the form still open it
    // paints on top and the confirmation looks like "nothing happened" until
    // the form is dismissed. Closing the form first is what actually makes
    // them visible; the form's inputs survive in `form` state either way.
    if (remaining !== null && remaining <= OVERDRAFT_LIMIT * -1) {
      if (isTrainer) {
        toast(t('sched.err_owes_session'), 'error');
      } else {
        setShowAdd(false);
        setBlockedModal(true);
      }
      return;
    }

    // Going from 0 into credit: the client must knowingly agree, since it
    // becomes a charge on their next renewal. Not a toast — this is about money.
    if (!isTrainer && remaining !== null && remaining <= 0) {
      setShowAdd(false);
      setOverdraftModal(true);
      return;
    }

    await doBookSession(remaining);
  };

  // "Remind me later" is a real answer, so it is recorded on the client's own profile
  // rather than held in component state — otherwise the prompt would be back on their
  // very next booking, which is the nagging this modal is meant to avoid.
  const handleRenewalSnooze = async () => {
    try {
      await updateClient(currentUser.id, { [RENEWAL_SNOOZE_FIELD]: renewalSnoozeUntil(today) });
    } catch {
      // A failed snooze must not trap the client behind the modal — it simply means the
      // prompt may reappear on the next booking.
      toast(t('sched.err_save_prompt'), 'error');
    } finally {
      setRenewalPrompt(null);
    }
  };

  // The actual write. Split out of handleAdd so the overdraft confirmation
  // modal can complete the booking without re-running validation (and without
  // re-triggering its own confirmation).
  const doBookSession = async (remaining) => {
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

      // Booking deducts a credit immediately (onScheduleBooked), so the count
      // the client should hear is one lower than the pre-booking figure — the
      // context listener hasn't caught up yet at this point. Remind them about
      // the rate lock on every booking once they're low, not just on the
      // dashboard, since booking is the moment the number actually drops.
      const trainer = isTrainer ? null : getClient(trainerId);
      const remainingAfter = remaining === null ? null : remaining - 1;

      // The booking itself is confirmed with a toast, because that IS a status message.
      // The renewal ask is a separate decision and gets a modal that waits for an answer
      // — it used to ride along as an 8-second toast and clients never read it.
      toast(t('sched.toast_booked'));
      const kind = isTrainer
        ? null
        : renewalPromptKind({ remainingAfter, trainer, client: currentUser, today });
      if (kind) setRenewalPrompt({ kind, remainingAfter, trainer });
    } catch (err) {
      toast(t('sched.err_book_failed', { msg: err?.message || t('sched.unknown_error') }), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteScheduleItem(deleteModal.id);
      toast(deleteModal.isBlocked ? t('sched.toast_block_removed') : t('sched.toast_session_deleted'), 'info');
      setDeleteModal(null);
    } catch (err) {
      toast(t('sched.err_delete_failed', { msg: err?.message || t('sched.unknown_error') }), 'error');
    } finally {
      setDeleting(false);
    }
  };


  const updateStatus = async (itemId, status) => {
    if (updatingStatus === itemId) return;
    setUpdatingStatus(itemId);
    try {
      await updateScheduleItem(itemId, { status });
      if (status === 'confirmed') toast(t('sched.toast_confirmed'));
      else if (status === 'cancelled') toast(t('sched.toast_cancelled'), 'info');
      else toast(t('sched.toast_status', { status }));
    } catch (err) {
      toast(t('sched.err_update_failed', { msg: err?.message || t('sched.unknown_error') }), 'error');
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

    try {
      await updateScheduleItem(recapSession.id, { status: 'completed' });
    } catch (err) {
      toast(t('sched.err_complete_failed', { msg: err?.message || t('sched.unknown_error') }), 'error');
      setSavingRecap(false);
      return;
    }

    // Credit was already deducted when this session was booked (sessions ARE
    // session credit); the onScheduleCreditUpdate function only charges here
    // as a catch-up for sessions booked before that model shipped.

    if (recapSend && recapNote.trim() && clientId) {
      try {
        const fullMsg = `📋 Session Recap — ${recapSession.date} ${recapSession.time}\nType: ${recapSession.type}\n\n${recapNote.trim()}`;
        await sendMessage(currentUser.id, clientId, fullMsg);
      } catch { /* non-critical */ }
    }

    toast(t('sched.toast_marked_complete'));
    setRecapSession(null);
    setRecapNote('');
    setSavingRecap(false);
  };

  const formatDay = (dateStr) => {
    const d = parseLocalDate(dateStr);
    return { day: formatWeekdayShort(d, lang), date: d.getDate() };
  };

  const getSessionCount = (date) => allSchedule.filter(s => s.date === date && !s.isBlocked).length;

  return (
    <div>
      <div className="page-header schedule-header">
        <div>
          <h1 className="page-title">{t('sched.title')}</h1>
          <p className="page-subtitle">{t('sched.subtitle')}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setBookMode('session'); setShowAdd(true); }}
          disabled={!isTrainer && !trainerId}
          title={!isTrainer && !trainerId ? t('sched.connect_coach_first') : undefined}
        >
          <Plus size={18} /> {t('sched.book_session')}
        </button>
      </div>

      {/* Working hours banner for trainers who haven't set theirs yet */}
      {isTrainer && !currentUser.workingHours && !bannerDismissed && (
        <div className="wh-banner">
          <Clock size={16} style={{ flexShrink: 0 }} />
          <span>{t('sched.wh_banner')}</span>
          <div className="flex gap-8" style={{ flexShrink: 0 }}>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/profile')}>{t('sched.set_hours')}</button>
            <button className="btn-icon" onClick={dismissBanner} title={t('sched.dismiss')} aria-label={t('sched.dismiss_banner')}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Date selector */}
      <div className="date-selector-nav">
        <button className="btn-icon" onClick={() => setDateOffset(p => p - 7)} title={t('sched.prev_week')} aria-label={t('sched.prev_week')}><ChevronLeft size={18} /></button>
        <span className="date-selector-month" style={{ margin: 0 }}>{selectedMonth}</span>
        <button className="btn-icon" onClick={() => setDateOffset(p => p + 7)} title={t('sched.next_week')} aria-label={t('sched.next_week')}><ChevronRight size={18} /></button>
        {dateOffset !== 0 && (
          <button className="btn btn-sm btn-outline" onClick={() => { setDateOffset(0); setSelectedDate(today); }}>{t('sched.today')}</button>
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
              <div className="date-btn-day">{isToday ? t('sched.today') : day}</div>
              <div className="date-btn-num">{num}</div>
              {count > 0 && <div className="date-btn-dot" />}
            </button>
          );
        })}
      </div>

      {/* Schedule list */}
      <div className="card">
        <div className="schedule-day-header mb-16">
          <h3 className="card-title">{formatLongDate(selectedDate, lang)}</h3>
        </div>
        {schedule.length === 0 ? (
          <EmptyState
            inCard={false}
            compact
            icon={CalendarOff}
            title={t('sched.none_title')}
            description={t('sched.none_desc')}
            action={{ label: t('sched.book_a_session'), onClick: () => { setForm(f => ({ ...f, date: selectedDate })); setShowAdd(true); } }}
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
                      <div className="schedule-client">{t('sched.blocked')}</div>
                      {s.notes && <div className="schedule-type">{s.notes}</div>}
                    </div>
                  </div>
                  <div className="schedule-item-bottom">
                    <span className="tag">{t('sched.unavailable')}</span>
                    <button className="btn-icon" aria-label={t('sched.remove_block_aria')} onClick={() => setDeleteModal({ id: s.id, isBlocked: true })} title={t('sched.remove_block_aria')} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            }
            const client = getClient(s.clientId);
            const sessBadge = (() => {
              if (!isTrainer || s.status === 'completed' || s.status === 'cancelled') return null;
              const { remaining, total } = getSessionStats(s.clientId);
              if (total === null) return null;
              return <span style={{ fontSize: '0.72rem', color: getSessionColor(remaining), fontWeight: 600, marginLeft: 6 }}>{t('sched.n_left', { n: remaining })}</span>;
            })();
            return (
              <div key={s.id} className="schedule-item">
                <div className="schedule-item-top">
                  <div className="schedule-time">{s.time}</div>
                  <div className="schedule-info">
                    <div className="schedule-client">{isTrainer ? client?.name : s.type}{sessBadge}</div>
                    <div className="schedule-type">{t('sched.type_duration', { type: s.type })}</div>
                  </div>
                </div>
                <div className="schedule-item-bottom">
                  <div className="flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`tag ${s.status === 'completed' ? 'tag-accent' : s.status === 'confirmed' ? 'tag-primary' : s.status === 'cancelled' ? 'tag' : 'tag-warning'}`}>{statusLabel(s.status)}</span>
                    {s.lateCancellation && <span className="tag tag-warning">{t('sched.late_cancel')}</span>}
                  </div>
                  <div className="flex gap-8">
                    {isTrainer && s.status === 'pending' && (
                      <>
                        <button className="btn-icon" aria-label={t('sched.confirm_aria')} onClick={() => updateStatus(s.id, 'confirmed')} title={t('sched.confirm')} disabled={updatingStatus === s.id}><Check size={16} style={{ color: 'var(--accent)' }} /></button>
                        <button className="btn-icon" aria-label={t('sched.cancel_session_aria')} onClick={() => updateStatus(s.id, 'cancelled')} title={t('common.cancel')} disabled={updatingStatus === s.id}><X size={16} style={{ color: 'var(--danger)' }} /></button>
                      </>
                    )}
                    {isTrainer && (s.status === 'pending' || s.status === 'confirmed') && (
                      <button className="btn-icon" aria-label={t('sched.mark_complete_aria')} onClick={() => openRecap(s)} title={t('sched.mark_as_complete')}><CheckCircle size={16} style={{ color: 'var(--accent)' }} /></button>
                    )}
                    {isTrainer && s.status === 'completed' && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => updateStatus(s.id, 'confirmed')}
                        disabled={updatingStatus === s.id}
                        title={t('sched.undo_complete')}
                      >
                        <RotateCcw size={14} /> {t('sched.reopen')}
                      </button>
                    )}
                    {!isTrainer && (s.status === 'pending' || s.status === 'confirmed') && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleClientCancel(s)} disabled={updatingStatus === s.id} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t('common.cancel')}</button>
                    )}
                    <button className="btn-icon" aria-label={t('sched.delete_session_aria')} onClick={() => setDeleteModal({ id: s.id, isBlocked: false })} title={t('sched.delete_session_aria')} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {renewalPrompt && (
        <RenewalPromptModal
          kind={renewalPrompt.kind}
          remainingAfter={renewalPrompt.remainingAfter}
          trainer={renewalPrompt.trainer}
          onRenew={() => {
            setPaymentSheet({ trainer: renewalPrompt.trainer, remaining: renewalPrompt.remainingAfter });
            setRenewalPrompt(null);
          }}
          onLater={handleRenewalSnooze}
        />
      )}

      {paymentSheet && (
        <PaymentSheetModal
          client={currentUser}
          trainer={paymentSheet.trainer}
          remaining={paymentSheet.remaining}
          onClose={() => setPaymentSheet(null)}
        />
      )}

      {overdraftModal && (() => {
        // Named `coach`, not `t` — `t` is the translation function in this scope.
        const coach = getClient(trainerId);
        const rate = coach?.renewalRateNext;
        return (
          <div className="modal-overlay" onClick={() => { setOverdraftModal(false); setShowAdd(true); }}>
            <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">{t('sched.no_sessions_left_title')}</h3>
              <p className="text-sm text-muted mb-16">
                {t('sched.overdraft_pre')}
                {rate ? <>{t('sched.overdraft_at')}<strong>{formatCurrency(rate, coach.currency)}{t('common.per_session')}</strong></> : null}
                {t('sched.overdraft_post')}
              </p>
              <div className="modal-actions">
                {/* Backing out returns to the booking form with their inputs intact */}
                <button className="btn btn-outline" onClick={() => { setOverdraftModal(false); setShowAdd(true); }} disabled={saving}>{t('common.cancel')}</button>
                <button
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={async () => {
                    setOverdraftModal(false);
                    await doBookSession(getSessionStats(currentUser.id).remaining);
                  }}
                >
                  {saving ? t('sched.booking') : t('sched.book_anyway')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {blockedModal && (
        <div className="modal-overlay" onClick={() => setBlockedModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('sched.blocked_title')}</h3>
            <p className="text-sm text-muted mb-16">
              {t('sched.blocked_body')}
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setBlockedModal(false)}>{t('common.close')}</button>
              <button className="btn btn-primary" onClick={() => { setBlockedModal(false); navigate('/messages'); }}>
                {t('sched.message_coach')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{deleteModal.isBlocked ? t('sched.remove_block_title') : t('sched.delete_session_title')}</h3>
            <p className="text-sm text-muted mb-16">{deleteModal.isBlocked ? t('sched.remove_block_body') : t('sched.delete_session_body')}</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteModal(null)} disabled={deleting}>{t('common.cancel')}</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? t('sched.removing') : deleteModal.isBlocked ? t('sched.remove') : t('sched.delete')}</button>
            </div>
          </div>
        </div>
      )}


      {lateCancelModal && (
        <div className="modal-overlay" onClick={() => !cancelingLate && setLateCancelModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <h3 className="modal-title" style={{ margin: 0 }}>{t('sched.late_title')}</h3>
            </div>
            <p className="text-sm" style={{ marginBottom: 8 }}>
              {t('sched.late_starts_pre')}<strong>{t('sched.late_24h')}</strong>:
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.9rem' }}>
              <div><strong>{lateCancelModal.date}</strong> {t('sched.at')} <strong>{lateCancelModal.time}</strong></div>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{lateCancelModal.type}</div>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              {t('sched.late_policy_pre')}<strong>{t('sched.late_policy_bold')}</strong>{t('sched.late_policy_post')}
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setLateCancelModal(null)} disabled={cancelingLate}>{t('sched.go_back')}</button>
              <button className="btn btn-danger" onClick={handleLateCancelConfirm} disabled={cancelingLate}>
                {cancelingLate ? t('sched.cancelling') : t('sched.cancel_anyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {recapSession && (
        <div className="modal-overlay" onClick={() => !savingRecap && setRecapSession(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('sched.complete_session')}</h3>
            <div className="recap-session-info">
              <div className="recap-row"><span className="form-label">{t('sched.client')}</span><span>{getClient(recapSession.clientId)?.name || '—'}</span></div>
              <div className="recap-row"><span className="form-label">{t('sched.date')}</span><span>{recapSession.date} · {recapSession.time}</span></div>
              <div className="recap-row"><span className="form-label">{t('sched.type')}</span><span>{recapSession.type}</span></div>
              {(() => {
                const { remaining, total, used } = getSessionStats(recapSession.clientId);
                if (total === null) return (
                  <div className="recap-row">
                    <span className="form-label">{t('sched.sessions')}</span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>{t('sched.used_no_quota', { used })}</span>
                  </div>
                );
                // Sessions ARE session credit — deducted at booking time, not here.
                // Only legacy bookings (no deductedAtBooking flag) still get charged now.
                const afterComplete = recapSession.deductedAtBooking ? remaining : Math.max(0, remaining - 1);
                return (
                  <div className="recap-row">
                    <span className="form-label">{t('sched.sessions')}</span>
                    <span style={{ color: getSessionColor(remaining), fontWeight: 600 }}>
                      {t('sched.remaining_after', { remaining, after: afterComplete })}
                      {remaining <= SESSION_DANGER_THRESHOLD && <span style={{ marginLeft: 6, fontSize: '0.8rem' }}>{t('sched.low')}</span>}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="form-group">
              <label className="form-label">{t('sched.message_optional')}</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={recapNote}
                onChange={e => setRecapNote(e.target.value)}
                placeholder={t('sched.note_placeholder')}
                disabled={savingRecap}
              />
            </div>
            <label className="recap-send-toggle">
              <input type="checkbox" checked={recapSend} onChange={e => setRecapSend(e.target.checked)} disabled={savingRecap} />
              <Send size={14} />
              {t('sched.send_recap')}
            </label>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRecapSession(null)} disabled={savingRecap}>{t('common.cancel')}</button>
              <button className="btn btn-accent" onClick={handleConfirmComplete} disabled={savingRecap}>
                {savingRecap ? t('common.saving') : t('sched.mark_complete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setBookMode('session'); setBlockTimes(new Set()); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{bookMode === 'block' ? t('sched.block_time') : t('sched.book_session')}</h3>
            {isTrainer && (
              <div className="log-unit-picker" style={{ marginBottom: 16 }}>
                <button type="button" className={`log-unit-pill${bookMode === 'session' ? ' active' : ''}`} onClick={() => { setBookMode('session'); setBlockTimes(new Set()); }}>{t('sched.book_session')}</button>
                <button type="button" className={`log-unit-pill${bookMode === 'block' ? ' active' : ''}`} onClick={() => setBookMode('block')}><Lock size={13} style={{ marginRight: 4 }} />{t('sched.block_time')}</button>
              </div>
            )}
            <form onSubmit={handleAdd}>
              {bookMode === 'session' && (isTrainer ? (
                <div className="form-group">
                  <label className="form-label">{t('sched.client')}</label>
                  <select className="form-select" required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">{t('sched.select_client')}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">{t('sched.coach')}</label>
                  <input className="form-input" disabled value={getClient(trainerId)?.name || t('sched.your_coach')} />
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
                    <span className="text-sm">{t('sched.sessions_label')} <strong style={{ color }}>{used} / {total}</strong></span>
                    <span className="text-sm" style={{ color, fontWeight: 600 }}>{t('sched.remaining', { n: remaining })}</span>
                  </div>
                );
              })()}
              {bookMode === 'session' ? (
                <div className="book-form-row">
                  <div className="form-group book-form-date">
                    <label className="form-label">{t('sched.date')}</label>
                    <input className="form-input" type="date" required value={form.date} onChange={e => {
                      const newDate = e.target.value;
                      const slots = availableBookingSlots(form.duration, newDate);
                      setForm(f => ({ ...f, date: newDate, time: slots.includes(f.time) ? f.time : (slots[0] || '09:00') }));
                    }} />
                  </div>
                  <div className="form-group book-form-time">
                    <label className="form-label">{t('sched.time')}</label>
                    <select className="form-select" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>
                      {!form.time && <option value="">{t('sched.select_time')}</option>}
                      {availableBookingSlots(form.duration, form.date).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">{t('sched.date')}</label>
                    <input className="form-input" type="date" required value={form.date} onChange={e => {
                      setBlockTimes(new Set());
                      setForm(f => ({ ...f, date: e.target.value }));
                    }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('sched.duration_per_slot')}</label>
                    <select className="form-select" value={form.duration} onChange={e => {
                      setBlockTimes(new Set());
                      setForm(f => ({ ...f, duration: Number(e.target.value) }));
                    }}>
                      <option value={30}>{t('sched.minutes', { n: 30 })}</option>
                      <option value={60}>{t('sched.minutes', { n: 60 })}</option>
                      <option value={90}>{t('sched.minutes', { n: 90 })}</option>
                      <option value={120}>{t('sched.minutes', { n: 120 })}</option>
                    </select>
                  </div>
                  {form.date && (() => {
                    const dur = Number(form.duration);
                    const fittingSlots = BOOKING_SLOTS.filter(s => toMin(s) + dur <= toMin(whEnd));
                    return (
                      <div className="form-group">
                        <label className="form-label">
                          {t('sched.time_slots')}
                          {blockTimes.size > 0 && <span className="block-slot-count">{t('sched.n_selected', { n: blockTimes.size })}</span>}
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
                  <label className="form-label">{t('sched.type')}</label>
                  <input className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
                </div>
              )}
              {bookMode === 'block' && (
                <div className="form-group">
                  <label className="form-label">{t('sched.label')} <span className="text-muted" style={{ fontWeight: 400 }}>{t('common.optional')}</span></label>
                  <input className="form-input" placeholder={t('sched.label_placeholder')} value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAdd(false); setBookMode('session'); setBlockTimes(new Set()); }} disabled={saving}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? (bookMode === 'block' ? t('sched.blocking') : t('sched.booking'))
                    : bookMode === 'block'
                      ? (blockTimes.size > 0 ? t('sched.block_n_slots', { count: blockTimes.size }) : t('sched.block_time'))
                      : t('sched.book')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
