// Locale-aware display formatting. Storage never changes — dates stay 'YYYY-MM-DD'
// (CLAUDE.md #18) and this file only decides how one is shown.
//
// The English outputs are pinned by format.test.js to be byte-identical to the calls
// these helpers replace (toLocaleDateString('en-US', …) in dateUtils, ('en', …) in
// SchedulePage), so wiring a page onto them cannot change what an English user sees.
//
// Currency is deliberately NOT here. formatCurrency() in utils/currencyUtils.js uses
// en-GB, and zh-HK produces the identical string for HKD and GBP — so there is nothing to
// localise and no reason to touch a #31 surface.

import { parseLocalDate } from '../utils/dateUtils';

// The BCP-47 tag handed to Intl for each app language. English keeps the exact tags the
// pages used before this file existed, because 'en' and 'en-US' do not format identically
// and the point of phase 1 is that English does not move.
const INTL = {
  en: { dayDate: 'en-US', other: 'en' },
  'zh-HK': { dayDate: 'zh-HK', other: 'zh-HK' },
};

const tags = (lang) => INTL[lang] || INTL.en;

// "Wed, June 10" / 「6月10日週三」 — dashboard greeting header.
export function formatDayDate(dateStr, lang = 'en') {
  return parseLocalDate(dateStr).toLocaleDateString(tags(lang).dayDate, {
    weekday: 'short', day: 'numeric', month: 'long',
  });
}

// "Wednesday, June 10" / 「6月10日星期三」 — selected-day heading on the schedule.
export function formatLongDate(dateStr, lang = 'en') {
  return parseLocalDate(dateStr).toLocaleDateString(tags(lang).other, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// "June 2026" / 「2026年6月」 — schedule month label.
export function formatMonthYear(dateStr, lang = 'en') {
  return parseLocalDate(dateStr).toLocaleDateString(tags(lang).other, {
    month: 'long', year: 'numeric',
  });
}

// "Wed" / 「週三」 — the day strip on the schedule.
export function formatWeekdayShort(date, lang = 'en') {
  const d = date instanceof Date ? date : parseLocalDate(date);
  return d.toLocaleDateString(tags(lang).other, { weekday: 'short' });
}
