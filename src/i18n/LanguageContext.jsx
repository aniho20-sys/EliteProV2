import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import en from './en';
import { translate, resolveLanguage } from './t';
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

export function LanguageProvider({ children }) {
  const { currentUser, setLanguage } = useApp();
  const lang = resolveLanguage(currentUser, typeof navigator !== 'undefined' ? navigator.language : '');
  const [zh, setZh] = useState(null);

  useEffect(() => {
    if (lang !== 'zh-HK' || zh) return;
    let cancelled = false;
    import('./zh-HK').then(m => { if (!cancelled) setZh(m.default); });
    return () => { cancelled = true; };
  }, [lang, zh]);

  // The document's own language, which is what :lang(zh) in the stylesheet matches on and
  // what a screen reader uses to pick a voice. Set here rather than in index.html because
  // it changes the moment someone switches, with no reload.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLanguage,
    t: (key, vars) => translate(
      { en, zh: lang === 'zh-HK' ? zh : null },
      lang,
      key,
      vars,
      { dev: import.meta.env.DEV },
    ),
  }), [lang, zh, setLanguage]);

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
