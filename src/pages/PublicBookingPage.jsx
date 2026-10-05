import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarX, CheckCircle2, Send, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDayDate } from '../i18n/format';
import { formatCurrency } from '../utils/currencyUtils';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';

// A coach's public booking page (B38): someone with no account picks a free hour and asks
// for a trial session. Nothing is booked here — the coach confirms, by contacting them.
// Free hours, bounds and spam limits all come from the server (functions/publicBooking.js);
// this page never sees the coach's id or schedule.
export default function PublicBookingPage() {
  const { t, lang } = useLanguage();
  const { slug } = useParams();
  const { getPublicBookingPage, requestTrialSession } = useApp();

  const [page, setPage] = useState(null);       // null = loading
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', message: '', consent: false, website: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  // B40: a 1-to-1 trial or a place in a group class, when the coach has classes on.
  const [kind, setKind] = useState(null);

  const load = async () => {
    setLoadFailed(false);
    try {
      const data = await getPublicBookingPage(slug);
      setPage(data);
      return data;
    } catch (err) {
      if (err?.code === 'functions/not-found') setMissing(true);
      else setLoadFailed(true);
      return null;
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const days = useMemo(() => {
    const byDay = new Map();
    for (const s of page?.slots || []) byDay.set(s.date, [...(byDay.get(s.date) || []), s.time]);
    return [...byDay.entries()].map(([date, times]) => ({ date, times }));
  }, [page]);
  const activeDay = days.find(d => d.date === day) || days[0];
  const classes = page?.groupClasses || [];
  // Classes first only when there is no 1-to-1 time to offer.
  const shownKind = kind || (days.length === 0 && classes.length > 0 ? 'group' : 'trial');
  const pickKind = (k) => { setKind(k); setSlot(null); setError(''); };
  const money = (amount) => (amount > 0 ? formatCurrency(amount, page.currency) : t('book.free'));

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const canSend = slot && form.name.trim() && form.contact.trim() && form.consent && !sending;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      await requestTrialSession({ slug, ...slot, ...form });
      setSent(slot);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'functions/failed-precondition') {
        setError(slot.groupClassId ? t('book.err_class_full') : t('book.err_taken'));
        setSlot(null);
        await load();
      } else if (code === 'functions/resource-exhausted') {
        setError(t('book.err_too_many'));
      } else if (code === 'functions/invalid-argument' && err?.message === 'contact') {
        setError(t('book.err_contact'));
      } else {
        setError(t('book.err_failed'));
      }
    } finally {
      setSending(false);
    }
  };

  const price = page && (page.price > 0 ? formatCurrency(page.price, page.currency) : t('book.free'));

  return (
    <div className="legal-page">
      <div className="legal-container public-book">
        <div className="public-book-brand">Elite<span>Pro</span></div>

        {missing ? (
          <EmptyState icon={CalendarX} title={t('book.missing_title')} description={t('book.missing_desc')} />
        ) : loadFailed ? (
          <EmptyState icon={CalendarX} title={t('book.load_failed')} action={{ label: t('book.retry'), onClick: load }} />
        ) : !page ? (
          <SkeletonCard />
        ) : sent ? (
          <div className="card public-book-done">
            <CheckCircle2 size={40} strokeWidth={1.5} />
            <h1 className="legal-title">{t('book.sent_title')}</h1>
            <p>
              {sent.groupClassId
                ? t('book.sent_desc_group', { coach: page.coachName, when: `${formatDayDate(sent.date, lang)} ${sent.time}` })
                : t('book.sent_desc', { coach: page.coachName, when: `${formatDayDate(sent.date, lang)} ${sent.time}` })}
            </p>
          </div>
        ) : (
          <>
            <h1 className="legal-title">
              {shownKind === 'group' ? t('book.title_group', { coach: page.coachName }) : t('book.title', { coach: page.coachName })}
            </h1>
            <p className="legal-meta">
              {shownKind === 'trial' && t('book.meta', { price, minutes: page.minutes })}
              {page.timeZone && <>{shownKind === 'trial' && <br />}{t('book.times_in', { zone: page.timeZone })}</>}
            </p>

            {classes.length > 0 && (
              <div className="public-book-kinds" role="group" aria-label={t('book.kind_label')}>
                <button type="button" className={`btn btn-sm ${shownKind === 'trial' ? 'btn-primary' : 'btn-outline'}`}
                  aria-pressed={shownKind === 'trial'} onClick={() => pickKind('trial')}>{t('book.kind_trial')}</button>
                <button type="button" className={`btn btn-sm ${shownKind === 'group' ? 'btn-primary' : 'btn-outline'}`}
                  aria-pressed={shownKind === 'group'} onClick={() => pickKind('group')}>{t('book.kind_group')}</button>
              </div>
            )}

            {shownKind === 'group' ? (
              <>
                <h2 className="public-book-step">{t('book.pick_class')}</h2>
                <div className="public-book-classes" role="group" aria-label={t('book.pick_class')}>
                  {classes.map(c => {
                    const chosen = slot?.groupClassId === c.id;
                    return (
                      <button key={c.id} type="button" className={`btn public-book-class ${chosen ? 'btn-primary' : 'btn-outline'}`}
                        aria-pressed={chosen}
                        onClick={() => { setSlot({ groupClassId: c.id, date: c.date, time: c.time }); setError(''); }}>
                        <span className="public-book-class-when">{formatDayDate(c.date, lang)} {c.time}</span>
                        {c.title && <span className="public-book-class-title">{c.title}</span>}
                        {c.address && <span className="public-book-class-meta">{c.address}</span>}
                        <span className="public-book-class-meta">
                          {t('book.class_price', { price: money(c.price) })}{' · '}{t('book.places_left', { count: c.spotsLeft })}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* A link cannot sit inside the class's button, so the chosen class's
                    address gets its own line that opens the map. */}
                {(() => {
                  const chosen = classes.find(c => c.id === slot?.groupClassId);
                  if (!chosen?.address) return null;
                  return (
                    <p className="public-book-class-where">
                      <MapPin size={14} />{' '}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chosen.address)}`}
                        target="_blank" rel="noreferrer" title={t('book.open_map')}>{chosen.address}</a>
                    </p>
                  );
                })()}
              </>
            ) : (<>
            <h2 className="public-book-step">{t('book.pick_time')}</h2>
            {days.length === 0 ? (
              <EmptyState compact icon={CalendarX} title={t('book.no_times')} description={t('book.no_times_desc')}
                action={{ label: t('book.retry'), onClick: load }} />
            ) : (
              <>
                <div className="public-book-days" role="group" aria-label={t('book.pick_day')}>
                  {days.map(d => (
                    <button key={d.date} type="button"
                      className={`btn btn-sm ${activeDay.date === d.date ? 'btn-primary' : 'btn-outline'}`}
                      aria-pressed={activeDay.date === d.date}
                      onClick={() => { setDay(d.date); setSlot(null); }}>
                      {formatDayDate(d.date, lang)}
                    </button>
                  ))}
                </div>
                <div className="public-book-times" role="group" aria-label={t('book.pick_time')}>
                  {activeDay.times.map(time => {
                    const chosen = slot?.date === activeDay.date && slot?.time === time;
                    return (
                      <button key={time} type="button" className={`btn ${chosen ? 'btn-primary' : 'btn-outline'}`}
                        aria-pressed={chosen} onClick={() => { setSlot({ date: activeDay.date, time }); setError(''); }}>
                        {time}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            </>)}

            {error && <p className="public-book-error" role="alert">{error}</p>}

            {slot && (
              <form className="card public-book-form" onSubmit={submit}>
                <h2 className="public-book-step">{t('book.your_details', { when: `${formatDayDate(slot.date, lang)} ${slot.time}` })}</h2>
                <div className="form-group">
                  <label className="form-label" htmlFor="book-name">{t('book.name')}</label>
                  <input id="book-name" className="form-input" autoComplete="name" maxLength={80}
                    value={form.name} onChange={set('name')} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="book-contact">{t('book.contact')}</label>
                  <input id="book-contact" className="form-input" autoComplete="tel" inputMode="email" maxLength={120}
                    value={form.contact} onChange={set('contact')} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="book-message">{t('book.message')}</label>
                  <textarea id="book-message" className="form-textarea" rows={3} maxLength={500}
                    placeholder={t('book.message_hint')} value={form.message} onChange={set('message')} />
                </div>
                {/* Hidden from people; a bot that fills every field fills this one too. Its name
                    must not be one a phone's AutoFill recognises: it was "website", which
                    iPhone fills from the contact card — so a real person's request was
                    dropped as a bot's, while their screen said it had been sent. */}
                <div className="public-book-trap" aria-hidden="true">
                  <input name="bk_extra_7" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                </div>
                <label className="public-book-consent">
                  <input type="checkbox" checked={form.consent} onChange={set('consent')} />
                  <span>
                    {t('book.consent', { coach: page.coachName })}{' '}
                    <Link to="/privacy">{t('book.privacy')}</Link>
                  </span>
                </label>
                <p className="public-book-note">{t('book.not_booked_yet', { coach: page.coachName })}</p>
                <button type="submit" className="btn btn-primary" disabled={!canSend}>
                  <Send size={16} /> {sending ? t('book.sending') : t('book.send')}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
