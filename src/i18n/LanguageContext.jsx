import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import en from './en';
import { translate, resolveLanguage, resolveRecipientLanguage } from './t';
import { buildAuthMessages } from './authMessages';

// Which language the signed-in person sees, and the t() bound to it.
//
// Resolution (see resolveLanguage): anyone signed in sees the language stored on their user
// document if they have chosen one, otherwise the browser's. Only an explicit choice from
// the Profile card is written to Firestore — see setLanguage.
//
// zh-HK.js is loaded with import() the first time it is needed, so an English user never
// downloads it. In the moment between choosing Chinese and the chunk arriving, t() falls
// back to English rather than blocking the page: the fallback is the design, not a gap.

// eslint-disable-next-line react-refresh/only-export-components
export const LanguageContext = createContext(null);

// Dictionaries already fetched, shared by the provider and by translatorFor below so a
// second language is downloaded at most once per session.
const loaded = { 'zh-HK': null };

async function dictionaryFor(lang) {
  if (lang !== 'zh-HK') return null;
  if (!loaded['zh-HK']) loaded['zh-HK'] = (await import('./zh-HK')).default;
  return loaded['zh-HK'];
}

export function LanguageProvider({ children }) {
  const { currentUser, setLanguage } = useApp();
  const lang = resolveLanguage(currentUser, typeof navigator !== 'undefined' ? navigator.language : '');
  const [zh, setZh] = useState(null);

  useEffect(() => {
    if (lang !== 'zh-HK' || zh) return;
    let cancelled = false;
    dictionaryFor('zh-HK').then(d => { if (!cancelled) setZh(d); });
    return () => { cancelled = true; };
  }, [lang, zh]);

  // The document's own language, which is what :lang(zh) in the stylesheet matches on and
  // what a screen reader uses to pick a voice. Set here rather than in index.html because
  // it changes the moment someone switches, with no reload.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // A t() bound to somebody ELSE's language — for text this person writes but another
  // person reads (a message to a student, an invoice they file as an expense). Async
  // because that language's dictionary may not be downloaded yet: an English-speaking
  // trainer never loads zh-HK for themselves, and awaiting here is what stops the message
  // going out in English while the chunk is still in flight.
  //
  // Callers pass the reader and themselves, and resolveRecipientLanguage decides — never
  // read `recipient.language` directly, or the "fall back to the sender, not to English"
  // rule ends up reimplemented per call site.
  const translatorFor = useMemo(() => async (recipient, sender) => {
    const target = resolveRecipientLanguage(recipient, sender);
    const dict = await dictionaryFor(target);
    return {
      lang: target,
      t: (key, vars) => translate({ en, zh: dict }, target, key, vars, { dev: import.meta.env.DEV }),
    };
  }, []);

  const value = useMemo(() => ({
    lang,
    setLanguage,
    translatorFor,
    t: (key, vars) => translate(
      { en, zh: lang === 'zh-HK' ? zh : null },
      lang,
      key,
      vars,
      { dev: import.meta.env.DEV },
    ),
  }), [lang, zh, setLanguage, translatorFor]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// The Firebase Auth and password-reset messages, bound to the current language. Separate
// from t() only because they are a map of literal calls rather than a single lookup — see
// authMessages.js for why they cannot just be t(err.code).
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthMessages() {
  const { t } = useLanguage();
  return useMemo(() => buildAuthMessages(t), [t]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage() must be used inside <LanguageProvider>');
  return ctx;
}
