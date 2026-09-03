// The translation function, kept pure so it can be tested without React.
//
// Lookup order for a key, given a count:
//   key_one / key_other  →  key_other  →  key
// English needs both plural forms. Chinese has no plural, so zh-HK.js writes a single
// `key_other` (or just `key`) and it serves every count.
//
// What comes back when a key is missing from the requested language:
//   - the English string, if English has it (this is the fallback the whole scheme rests on)
//   - otherwise '' in production — NEVER the raw key. A user who sees "dash.sessions_left"
//     on screen has been shown a bug with no error attached, which is the one failure mode
//     this file exists to make impossible.
//   - otherwise the raw key in development, wrapped so it is visible, plus a console.error.
//
// Interpolation is `{name}` → vars.name. A missing var becomes '' rather than leaving the
// placeholder in the sentence.

export const SUPPORTED_LANGUAGES = ['en', 'zh-HK'];
export const DEFAULT_LANGUAGE = 'en';

const pluralForm = (count) => (count === 1 ? 'one' : 'other');

function lookup(dict, key, vars) {
  if (!dict) return undefined;
  if (vars && typeof vars.count === 'number') {
    const exact = dict[`${key}_${pluralForm(vars.count)}`];
    if (exact !== undefined) return exact;
    const other = dict[`${key}_other`];
    if (other !== undefined) return other;
  }
  return dict[key];
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => (
    vars[name] === undefined || vars[name] === null ? '' : String(vars[name])
  ));
}

export function translate({ en, zh }, lang, key, vars, { dev = false } = {}) {
  const preferred = lang === 'zh-HK' ? lookup(zh, key, vars) : undefined;
  const fallback = lookup(en, key, vars);
  const value = preferred !== undefined ? preferred : fallback;

  // An explicit null means this language needs no word here — Chinese joins a date and a
  // time with nothing between them where English needs "at". Distinct from undefined,
  // which means the key is missing and English should be used instead.
  if (value === null) return '';

  if (value === undefined) {
    if (dev) {
      console.error(`[i18n] missing key "${key}" — add it to src/i18n/en.js`);
      return `⟦${key}⟧`;
    }
    return '';
  }
  return interpolate(value, vars);
}

// Which language a signed-in user sees. Trainers are pinned to English during phase 1:
// their pages are not translated yet and the language card is not shown to them, so a
// trainer document never carries `language` and this never has to guess about one.
export function resolveLanguage(user, browserLanguage) {
  if (user && user.role !== 'client') return DEFAULT_LANGUAGE;
  if (user && SUPPORTED_LANGUAGES.includes(user.language)) return user.language;
  return browserDefault(browserLanguage);
}

// First-run default before the person has chosen anything. Persisted only when they choose
// explicitly from the Profile card — a derived default written back to Firestore would
// look like a choice they made.
export function browserDefault(browserLanguage) {
  const tag = String(browserLanguage || '').toLowerCase();
  return tag.startsWith('zh') ? 'zh-HK' : DEFAULT_LANGUAGE;
}
