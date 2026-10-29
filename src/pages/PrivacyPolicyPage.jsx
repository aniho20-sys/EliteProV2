import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

// Rewritten 2026-10-29 (B81; Grok #5, #36, #42): what the app really collects, the
// consent asked when a client connects to a coach (B79), Stripe and GoCardless, where the
// data is, and a Hong Kong section (PDPO). English is the version that applies; the
// Chinese one says so. The person responsible is named once Ani gives the name (BACKLOG B81).
const CONTACT_EMAIL = 'elitepro616@gmail.com';

const Email = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export default function PrivacyPolicyPage() {
  const { t, lang } = useLanguage();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-back">
          <Link to="/" className="btn btn-outline btn-sm">
            <ArrowLeft size={14} /> {t('legal.back')}
          </Link>
        </div>

        <h1 className="legal-title">{t('privacy.title')}</h1>
        <p className="legal-meta">{t('privacy.updated')}</p>
        {lang !== 'en' && <p className="legal-meta">{t('legal.english_prevails')}</p>}
        <p>{t('privacy.intro')}</p>

        <section className="legal-section">
          <h2>{t('privacy.s1_h')}</h2>
          <p>{t('privacy.s1_p1')}</p>
          <p>{t('privacy.s1_p2')}</p>
          <p>{t('privacy.contact_pre')} <Email /></p>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s2_h')}</h2>
          <h3>{t('privacy.account_h')}</h3>
          <ul>
            <li>{t('privacy.account_li1')}</li>
            <li>{t('privacy.account_li2')}</li>
          </ul>
          <h3>{t('privacy.coach_h')}</h3>
          <ul>
            <li>{t('privacy.coach_li1')}</li>
            <li>{t('privacy.coach_li2')}</li>
            <li>{t('privacy.coach_li3')}</li>
          </ul>
          <h3>{t('privacy.client_h')}</h3>
          <ul>
            <li>{t('privacy.client_li1')}</li>
            <li>{t('privacy.client_li2')}</li>
            <li>{t('privacy.client_li3')}</li>
            <li>{t('privacy.client_li4')}</li>
          </ul>
          <p>{t('privacy.health_note')}</p>
          <h3>{t('privacy.sessions_h')}</h3>
          <ul>
            <li>{t('privacy.sessions_li1')}</li>
            <li>{t('privacy.sessions_li2')}</li>
            <li>{t('privacy.sessions_li3')}</li>
          </ul>
          <h3>{t('privacy.trial_h')}</h3>
          <p>{t('privacy.trial_p')}</p>
          <h3>{t('privacy.tech_h')}</h3>
          <ul>
            <li>{t('privacy.tech_li1')}</li>
            <li>{t('privacy.tech_li2')}</li>
            <li>{t('privacy.tech_li3')}</li>
            <li>{t('privacy.tech_li4')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s3_h')}</h2>
          <table className="legal-table">
            <thead>
              <tr><th>{t('privacy.col_purpose')}</th><th>{t('privacy.col_basis')}</th></tr>
            </thead>
            <tbody>
              <tr><td>{t('privacy.r1_purpose')}</td><td>{t('privacy.r1_basis')}</td></tr>
              <tr><td>{t('privacy.r2_purpose')}</td><td>{t('privacy.r2_basis')}</td></tr>
              <tr><td>{t('privacy.r3_purpose')}</td><td>{t('privacy.r3_basis')}</td></tr>
              <tr><td>{t('privacy.r4_purpose')}</td><td>{t('privacy.r4_basis')}</td></tr>
              <tr><td>{t('privacy.r5_purpose')}</td><td>{t('privacy.r5_basis')}</td></tr>
              <tr><td>{t('privacy.r6_purpose')}</td><td>{t('privacy.r6_basis')}</td></tr>
            </tbody>
          </table>
          <p>{t('privacy.s3_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s4_h')}</h2>
          <ul>
            <li>{t('privacy.s4_li1')}</li>
            <li>{t('privacy.s4_li2')}</li>
            <li>{t('privacy.s4_li3')}</li>
          </ul>
          <table className="legal-table">
            <thead>
              <tr><th>{t('privacy.col_provider')}</th><th>{t('privacy.col_does')}</th><th>{t('privacy.col_where')}</th></tr>
            </thead>
            <tbody>
              <tr><td>{t('privacy.p_google')}</td><td>{t('privacy.p_google_does')}</td><td>{t('privacy.p_google_where')}</td></tr>
              <tr><td>{t('privacy.p_stripe')}</td><td>{t('privacy.p_stripe_does')}</td><td>{t('privacy.p_stripe_where')}</td></tr>
              <tr><td>{t('privacy.p_gc')}</td><td>{t('privacy.p_gc_does')}</td><td>{t('privacy.p_gc_where')}</td></tr>
            </tbody>
          </table>
          <p>{t('privacy.s4_providers_note')}</p>
          <ul>
            <li>{t('privacy.s4_li4')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s5_h')}</h2>
          <p>{t('privacy.s5_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s6_h')}</h2>
          <ul>
            <li>{t('privacy.s6_li1')}</li>
            <li>{t('privacy.s6_li2')}</li>
            <li>{t('privacy.s6_li3')}</li>
            <li>{t('privacy.s6_li4')}</li>
            <li>{t('privacy.s6_li5')}</li>
            <li>{t('privacy.s6_li6')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s7_h')}</h2>
          <p>{t('privacy.s7_p1')}</p>
          <ul>
            <li>{t('privacy.s7_li1')}</li>
            <li>{t('privacy.s7_li2')}</li>
            <li>{t('privacy.s7_li3')}</li>
            <li>{t('privacy.s7_li4')}</li>
            <li>{t('privacy.s7_li5')}</li>
            <li>{t('privacy.s7_li6')}</li>
          </ul>
          <p>{t('privacy.s7_p2')} <Email /></p>
          <p>{t('privacy.s7_p3')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s8_h')}</h2>
          <p>{t('privacy.s8_p')} <Email /></p>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s9_h')}</h2>
          <p>{t('privacy.s9_p')}</p>
          <ul>
            <li>{t('privacy.s9_li1')}</li>
            <li>{t('privacy.s9_li2')}</li>
            <li>{t('privacy.s9_li3')}</li>
            <li>{t('privacy.s9_li4')} <Email /></li>
            <li>{t('privacy.s9_li5')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s10_h')}</h2>
          <p>{t('privacy.s10_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('privacy.s11_h')}</h2>
          <p>{t('privacy.s11_p')} <Email /></p>
        </section>

        <div className="legal-footer">
          <Link to="/terms">{t('privacy.to_terms')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/">{t('legal.to_app')}</Link>
        </div>
      </div>
    </div>
  );
}
