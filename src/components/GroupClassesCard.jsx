import { useEffect, useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDayDate } from '../i18n/format';
import { formatCurrency } from '../utils/currencyUtils';
import { contactLinks } from '../utils/contactLinks';
import { localToday } from '../utils/dateUtils';

// Profile card for group classes on the public booking page (B40). The coach puts a class
// on at a set time with its own size, minimum and price; people ask for a place on the
// public page and the coach confirms each one from the dashboard. Putting a class on blocks
// that hour in the calendar (server-side, functions/publicBooking.js). Everything a class
// needs is set per class here — nothing is assumed about how the coach runs them.
const EMPTY = { date: '', time: '', capacity: '3', minPeople: '2', price: '', title: '' };

export default function GroupClassesCard() {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const { currentUser, getSchedule, subscribeGroupClasses, subscribeTrialRequests, saveGroupClass, cancelGroupClass } = useApp();
  const [classes, setClasses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [toTell, setToTell] = useState(null);

  useEffect(() => {
    const offs = [
      subscribeGroupClasses?.(setClasses, () => setClasses([])),
      subscribeTrialRequests?.(setRequests, () => setRequests([])),
    ];
    return () => offs.forEach(off => off && off());
    // Subscribed once per mount: the functions are recreated on every AppContext render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = localToday();
  const upcoming = classes.filter(c => c.status === 'open' && c.date >= today);
  const sessions = getSchedule({ trainerId: currentUser.id });
  const booked = (id) => sessions.filter(s => s.groupClassId === id && !s.isBlocked && s.status !== 'cancelled').length;
  const waiting = (id) => requests.filter(r => r.groupClassId === id).length;
  const currency = currentUser.currency || 'GBP';
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.date || !form.time || form.price === '') {
      toast(t('gclass.err_fields'), 'error');
      return;
    }
    setSaving(true);
    try {
      await saveGroupClass({
        date: form.date, time: form.time, title: form.title,
        capacity: Number(form.capacity), minPeople: Number(form.minPeople), price: Number(form.price),
      });
      toast(t('gclass.toast_added'));
      setForm(EMPTY);
      setAdding(false);
    } catch (err) {
      const code = err?.code || '';
      toast(code === 'functions/failed-precondition' ? t('gclass.err_clash')
        : code === 'functions/invalid-argument' ? t('gclass.err_invalid')
          : t('gclass.err_failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (c) => {
    if (cancelling) return;
    setCancelling(true);
    try {
      const res = await cancelGroupClass(c.id);
      setConfirmCancel(null);
      toast(t('gclass.toast_cancelled'), 'info');
      if (res?.tell?.length) setToTell({ cls: c, people: res.tell });
    } catch {
      toast(t('gclass.err_failed'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={18} style={{ color: 'var(--accent)' }} /> {t('gclass.title')}
      </h3>
      <p className="invite-desc">{t('gclass.desc')}</p>
      {!currentUser.publicBooking?.enabled && <p className="text-sm text-muted mt-8">{t('gclass.page_off')}</p>}

      {upcoming.map(c => (
        <div key={c.id} className="trial-request">
          <div className="trial-request-head">
            <span className="trial-request-name">{formatDayDate(c.date, lang)} {c.time}</span>
            <span className="trial-request-when">{t('gclass.price_each', { price: formatCurrency(c.price, currency) })}</span>
          </div>
          {c.title && <div className="text-sm">{c.title}</div>}
          <div className="text-sm text-muted mt-4">
            {t('gclass.booked', { booked: booked(c.id), capacity: c.capacity, min: c.minPeople })}
            {waiting(c.id) > 0 && <>{' · '}{t('gclass.waiting', { count: waiting(c.id) })}</>}
          </div>
          <div className="trial-request-actions">
            {confirmCancel === c.id ? (
              <>
                <span className="text-sm">{t('gclass.cancel_q')}</span>
                <button className="btn btn-sm btn-danger" disabled={cancelling} onClick={() => cancel(c)}>
                  {cancelling ? t('trial.working') : t('gclass.cancel_yes')}
                </button>
                <button className="btn btn-sm btn-outline" disabled={cancelling} onClick={() => setConfirmCancel(null)}>{t('trial.decline_no')}</button>
              </>
            ) : (
              <button className="btn btn-sm btn-outline" onClick={() => setConfirmCancel(c.id)}>
                <X size={14} /> {t('gclass.cancel')}
              </button>
            )}
          </div>
        </div>
      ))}

      {adding ? (
        <form className="mt-12" onSubmit={save}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="gc-date">{t('gclass.date')}</label>
              <input id="gc-date" className="form-input" type="date" min={today} value={form.date} onChange={set('date')} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gc-time">{t('gclass.time')}</label>
              <input id="gc-time" className="form-input" type="time" step="900" value={form.time} onChange={set('time')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="gc-capacity">{t('gclass.capacity')}</label>
              <input id="gc-capacity" className="form-input" type="number" min="2" max="20" inputMode="numeric" value={form.capacity} onChange={set('capacity')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gc-min">{t('gclass.min_people')}</label>
              <input id="gc-min" className="form-input" type="number" min="1" max="20" inputMode="numeric" value={form.minPeople} onChange={set('minPeople')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="gc-price">{t('gclass.price', { currency })}</label>
            <input id="gc-price" className="form-input" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set('price')} required />
            <p className="text-xs text-muted mt-4">{t('pbook.price_hint')}</p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="gc-title">{t('gclass.class_title')}</label>
            <input id="gc-title" className="form-input" maxLength={60} value={form.title} onChange={set('title')} placeholder={t('gclass.title_ph')} />
          </div>
          <div className="flex gap-8">
            <button type="button" className="btn btn-outline" disabled={saving} onClick={() => { setAdding(false); setForm(EMPTY); }}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('gclass.add')}</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-primary mt-12" onClick={() => setAdding(true)}><Plus size={16} /> {t('gclass.add')}</button>
      )}

      {toTell && (
        <div className="modal-overlay" onClick={() => setToTell(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('gclass.tell_title')}</h3>
            <p className="text-sm text-muted mb-12">
              {t('gclass.tell_desc', { when: `${formatDayDate(toTell.cls.date, lang)} ${toTell.cls.time}` })}
            </p>
            {toTell.people.map((p, i) => {
              const reach = contactLinks(p.contact, { timeZone: currentUser.timeZone });
              return (
                <div key={i} className="trial-request">
                  <div className="trial-request-name">{p.name}</div>
                  {reach && (
                    <div className="trial-request-actions">
                      <a className="btn btn-sm btn-outline" href={reach.href}>{p.contact}</a>
                      {reach.whatsapp && <a className="btn btn-sm btn-outline" href={reach.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setToTell(null)}>{t('common.done')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
