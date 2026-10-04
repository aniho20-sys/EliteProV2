import { useState } from 'react';
import { CalendarPlus, Copy, Check, Share2, ExternalLink, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatWeekdayShort } from '../i18n/format';
import { bookingUrl } from '../utils/inviteLink';

// Profile card for the coach's public booking page (B38). The page offers whole hours
// inside the working hours set above, on the days ticked here, around what is already in
// the calendar. Saving goes through the server, which also issues the page's link.
// Days are JS weekday numbers (0 = Sunday), listed Monday first.
const WEEK = [1, 2, 3, 4, 5, 6, 0];
// 5 October 2026 is a Monday; used only to name the weekdays in the reader's language.
const weekdayName = (day, lang) => formatWeekdayShort(new Date(2026, 9, 4 + (day === 0 ? 7 : day)), lang);

export default function PublicBookingCard() {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const { currentUser, savePublicBooking } = useApp();
  const saved = currentUser.publicBooking || {};
  const [enabled, setEnabled] = useState(!!saved.enabled);
  const [price, setPrice] = useState(String(saved.price ?? 0));
  const [days, setDays] = useState(saved.days || [1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = saved.slug ? bookingUrl(saved.slug) : '';
  const live = saved.enabled && url;
  const hours = `${currentUser.workingHours?.start || '09:00'}–${currentUser.workingHours?.end || '17:00'}`;
  const toggleDay = (d) => setDays(list => (list.includes(d) ? list.filter(x => x !== d) : [...list, d]));

  const save = async () => {
    const amount = Number(price);
    if (price === '' || !Number.isFinite(amount) || amount < 0 || amount > 1000) {
      toast(t('pbook.err_price'), 'error');
      return;
    }
    if (enabled && days.length === 0) {
      toast(t('pbook.err_days'), 'error');
      return;
    }
    setSaving(true);
    try {
      await savePublicBooking({ enabled, price: amount, days });
      toast(enabled ? t('pbook.toast_on') : t('pbook.toast_saved'));
    } catch {
      toast(t('pbook.toast_failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(url)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast(t('pbook.toast_copied')); })
      .catch(() => toast(t('pbook.toast_copy_failed'), 'error'));
  };
  const share = () => {
    navigator.share({ title: t('pbook.share_title'), url }).catch(() => {});
  };

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CalendarPlus size={18} style={{ color: 'var(--accent)' }} /> {t('pbook.title')}
      </h3>
      <p className="invite-desc">{t('pbook.desc')}</p>

      <label className="public-book-consent">
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
        <span>{t('pbook.enable')}</span>
      </label>

      <div className="form-group mt-8">
        <label className="form-label" htmlFor="pbook-price">
          {t('pbook.price', { currency: currentUser.currency || 'GBP' })}
        </label>
        <input id="pbook-price" className="form-input" type="number" inputMode="decimal" min="0" step="1"
          value={price} onChange={e => setPrice(e.target.value)} />
        <p className="text-xs text-muted mt-4">{t('pbook.price_hint')}</p>
      </div>

      <div className="form-group">
        <span className="form-label">{t('pbook.days')}</span>
        <div className="public-book-days-pick" role="group" aria-label={t('pbook.days')}>
          {WEEK.map(d => (
            <button key={d} type="button" aria-pressed={days.includes(d)}
              className={`btn btn-sm ${days.includes(d) ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => toggleDay(d)}>
              {weekdayName(d, lang)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{t('pbook.hours_from', { hours })}</p>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        <Save size={16} /> {saving ? t('profile.saving_dots') : t('pbook.save')}
      </button>

      {live && (
        <>
          <div className="public-book-link">{url}</div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={copy}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('profile.copied') : t('pbook.copy')}
            </button>
            {navigator.share && (
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={share}>
                <Share2 size={16} /> {t('pbook.share')}
              </button>
            )}
            <a className="btn btn-outline" href={url} target="_blank" rel="noreferrer" aria-label={t('pbook.open')}>
              <ExternalLink size={16} />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
