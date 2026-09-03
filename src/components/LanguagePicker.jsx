import { useState } from 'react';
import { Languages } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/t';

// The language choice, on the client's own Profile.
//
// Each option is written in the language it selects — a person who cannot read the current
// language still has to be able to find their way out, and "繁體中文" labelled in English
// would be exactly the wrong way round. That is also why these two strings are NOT in the
// dictionary: they must not change with the current language.
//
// Open to everyone since 2026-09-02, once the dictionary reached 100%.
//
// It was briefly opened before that and closed again the same day. Ani's ruling: a trainer
// who picks Chinese must get Chinese, not Chinese navigation over English pages — so
// translation came first and the switch second. A warning label was not an acceptable
// substitute for finishing the work.
//
// The flag stays as the thing dictionary.test.js reads. While it is false, that suite
// requires every key in en.js to have a Chinese value, and the build fails otherwise. So
// the guarantee behind this switch is checked on every run rather than remembered: adding
// an untranslated English key now breaks the build.
const CLIENT_ONLY_UNTIL_TRAINER_TRANSLATED = false;
const OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'zh-HK', label: '繁體中文' },
];

export default function LanguagePicker() {
  const { currentUser } = useApp();
  const { lang, setLanguage, t } = useLanguage();
  const [saving, setSaving] = useState(null);

  if (!currentUser) return null;
  if (CLIENT_ONLY_UNTIL_TRAINER_TRANSLATED && currentUser.role !== 'client') return null;

  const choose = async (value) => {
    if (saving || value === lang) return;
    setSaving(value);
    try {
      await setLanguage(value);
    } catch {
      // The write failed, so the choice did not stick. Nothing else to do here — the
      // buttons still show the language actually in effect, which is the honest state.
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Languages size={18} /> {t('profile.language')}
      </h3>
      <p className="invite-desc">{t('profile.language_desc')}</p>
      <div className="lang-options">
        {OPTIONS.filter(o => SUPPORTED_LANGUAGES.includes(o.value)).map(o => (
          <button
            key={o.value}
            type="button"
            className={`lang-option${lang === o.value ? ' lang-option-active' : ''}`}
            onClick={() => choose(o.value)}
            disabled={!!saving}
            aria-pressed={lang === o.value}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
