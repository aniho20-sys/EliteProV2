import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import en from './en';
import { translate, resolveLanguage } from './t';

// Which language the signed-in person sees, and the t() bound to it.
//
// Resolution (see resolveLanguage): trainers are English in phase 1; a client sees the
// language stored on their user document if they have chosen one, otherwise the browser's.
// Only an explicit choice from the Profile card is written to Firestore — see setLanguage.
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

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage() must be used inside <LanguageProvider>');
  return ctx;
}
