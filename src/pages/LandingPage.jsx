import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X, Star } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageToggle } from '../components/LanguagePicker';

// The page is self-serve: every CTA goes straight to sign-up. Nobody has to message
// anyone to get started, and the founding places are awarded by order of signup rather
// than by application.
//
// Every word goes through t() (B50, Ani 2026-10-17): a visitor whose phone is in Chinese
// sees Chinese, and the English / 繁體中文 toggle in the bar switches for this visit only.
// Product and company names, and the prices quoted from other companies' pages, are data.

// Every figure below was read off each company's own pricing page on 2026-08-15. Nothing
// here is taken from a comparison blog — the aggregators disagreed with the primary
// sources, so only what the vendor states about itself is quoted.
const PRICING_SOURCES = [
  { name: 'ABC Trainerize', url: 'https://www.trainerize.com/pricing/' },
  { name: 'TrueCoach', url: 'https://truecoach.co/pricing/' },
  { name: 'PT Distinction', url: 'https://www.ptdistinction.com/pricing' },
];

const VENDORS = ['ElitePro', 'Trainerize', 'TrueCoach', 'PT Distinction'];

// A monthly price is { monthly: '$23' }; anything else is shown as written.
const PRICING_ROWS = [
  { label: 'landing.row_start', elite: { free: true }, others: [{ monthly: '$23' }, { monthly: '$26.34' }, { monthly: '$19.90' }] },
  { label: 'landing.row_setup', elite: '$0', others: ['$169', '$0', '$0'] },
  { label: 'landing.row_payments', elite: '$0', others: [{ monthly: '+$10' }, '$0', '$0'] },
  { label: 'landing.row_commission', elite: '0%', others: ['—', '—', '—'] },
];

function Screenshot({ src, alt }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  return (
    <div className="lp-shot">
      {failed
        ? <div className="lp-shot-pending">{t('landing.screenshot_pending')}</div>
        : <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />}
    </div>
  );
}

function Cta({ block, onClick }) {
  const { t } = useLanguage();
  return (
    <button type="button" className={`lp-cta${block ? ' lp-cta-block' : ''}`} onClick={onClick}>
      {t('landing.cta')} <ArrowRight size={18} />
    </button>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const goSignUp = () => navigate('/login?signup=1');

  const PAINS = [
    { title: t('landing.pain1_title'), body: t('landing.pain1_body') },
    { title: t('landing.pain2_title'), body: t('landing.pain2_body') },
    { title: t('landing.pain3_title'), body: t('landing.pain3_body') },
  ];
  const SOLUTIONS = [
    { title: t('landing.sol1_title'), body: t('landing.sol1_body'), shot: '/screens/plan.png', alt: t('landing.sol1_alt') },
    { title: t('landing.sol2_title'), body: t('landing.sol2_body'), shot: '/screens/sessions.png', alt: t('landing.sol2_alt') },
    { title: t('landing.sol3_title'), body: t('landing.sol3_body'), shot: '/screens/dashboard.png', alt: t('landing.sol3_alt') },
  ];
  const rowLabels = {
    'landing.row_start': t('landing.row_start'),
    'landing.row_setup': t('landing.row_setup'),
    'landing.row_payments': t('landing.row_payments'),
    'landing.row_commission': t('landing.row_commission'),
  };
  const cell = (v) => (v && v.free ? t('landing.free') : v && v.monthly ? t('landing.per_month', { amount: v.monthly }) : v);

  return (
    <div className="lp">
      <header className="lp-bar">
        <span className="lp-logo">Elite<span>Pro</span></span>
        <div className="lp-signin-wrap">
          <LanguageToggle />
          <span className="lp-signin-note">{t('landing.have_account')}</span>
          <button className="lp-signin" onClick={() => navigate('/login')}>{t('landing.sign_in')}</button>
        </div>
      </header>

      {/* 1 — Hero */}
      <section className="lp-hero">
        <h1>{t('landing.hero_title')}</h1>
        <p className="lp-lede">{t('landing.hero_lede')}</p>
        <Cta onClick={goSignUp} />
      </section>

      {/* 2 — The problem */}
      <section className="lp-section">
        <h2>{t('landing.pains_title')}</h2>
        <div className="lp-pains">
          {PAINS.map(p => (
            <div key={p.title} className="lp-pain">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — What the app does about it */}
      <section className="lp-section">
        <h2>{t('landing.solutions_title')}</h2>
        {SOLUTIONS.map((s, i) => (
          <div key={s.title} className={`lp-solution${i % 2 ? ' lp-solution-flip' : ''}`}>
            <div className="lp-solution-text">
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
            <Screenshot src={s.shot} alt={s.alt} />
          </div>
        ))}
      </section>

      {/* 4 — Price */}
      <section className="lp-section">
        <h2>{t('landing.price_title')}</h2>
        <p className="lp-section-sub">{t('landing.price_sub')}</p>
        <div className="lp-table-scroll">
          <table className="lp-table">
            <thead>
              <tr>
                <th scope="col"></th>
                {VENDORS.map((v, i) => <th key={v} scope="col" className={i === 0 ? 'lp-table-us' : undefined}>{v}</th>)}
              </tr>
            </thead>
            <tbody>
              {PRICING_ROWS.map(row => (
                <tr key={row.label}>
                  <th scope="row">{rowLabels[row.label]}</th>
                  <td className="lp-table-us">{cell(row.elite)}</td>
                  {row.others.map((v, i) => <td key={i}>{cell(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lp-sources">
          {t('landing.sources')}{' '}
          {PRICING_SOURCES.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ', '}
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
            </span>
          ))}{t('landing.sources_sep')}{t('landing.sources_end')}
        </p>
      </section>

      {/* 5 — Founding members */}
      <section className="lp-founding">
        <div className="lp-founding-badge"><Star size={13} /> {t('landing.founding_badge')}</div>
        <h2>{t('landing.founding_title')}</h2>
        <p>{t('landing.founding_body')}</p>
        <ul className="lp-founding-list">
          <li><Check size={16} /> {t('landing.founding_1')}</li>
          <li><Check size={16} /> {t('landing.founding_2')}</li>
          <li><Check size={16} /> {t('landing.founding_3')}</li>
          <li><X size={16} /> {t('landing.founding_4')}</li>
        </ul>
      </section>

      {/* 6 — Close */}
      <section className="lp-close">
        <h2>{t('landing.close_title')}</h2>
        <Cta block onClick={goSignUp} />
        <p className="lp-cta-sub">{t('landing.cta_sub')}</p>
        <p className="lp-note">{t('landing.note')}</p>
        <footer className="lp-foot">
          <button onClick={() => navigate('/privacy')}>{t('landing.privacy')}</button>
          <button onClick={() => navigate('/terms')}>{t('landing.terms')}</button>
        </footer>
      </section>
    </div>
  );
}
