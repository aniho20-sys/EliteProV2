import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

// Rewritten 2026-10-29 (B81; Grok #6, #36): coach and client parts, money going straight to
// the coach, how sessions and cancellations are counted (B77), monthly plans, liability as
// UK law allows it, and the law of England and Wales. English is the version that applies;
// the Chinese one says so.
const CONTACT_EMAIL = 'elitepro616@gmail.com';

export default function TermsPage() {
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

        <h1 className="legal-title">{t('terms.title')}</h1>
        <p className="legal-meta">{t('terms.updated')}</p>
        {lang !== 'en' && <p className="legal-meta">{t('legal.english_prevails')}</p>}
        <p>{t('terms.intro')}</p>

        <section className="legal-section">
          <h2>{t('terms.s1_h')}</h2>
          <p>{t('terms.s1_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s2_h')}</h2>
          <ul>
            <li>{t('terms.s2_li1')}</li>
            <li>{t('terms.s2_li2')}</li>
            <li>{t('terms.s2_li3')}</li>
            <li>{t('terms.s2_li4')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s3_h')}</h2>
          <ul>
            <li>{t('terms.s3_li1')}</li>
            <li>{t('terms.s3_li2')}</li>
            <li>{t('terms.s3_li3')}</li>
            <li>{t('terms.s3_li4')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s4_h')}</h2>
          <ul>
            <li>{t('terms.s4_li1')}</li>
            <li>{t('terms.s4_li2')}</li>
            <li>{t('terms.s4_li3')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s5_h')}</h2>
          <p>{t('terms.s5_p')}</p>
          <ul>
            <li>{t('terms.s5_li1')}</li>
            <li>{t('terms.s5_li2')}</li>
            <li>{t('terms.s5_li3')}</li>
            <li>{t('terms.s5_li4')}</li>
            <li>{t('terms.s5_li5')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s6_h')}</h2>
          <p>{t('terms.s6_p')}</p>
          <ul>
            <li>{t('terms.s6_li1')}</li>
            <li>{t('terms.s6_li2')}</li>
            <li>{t('terms.s6_li3')}</li>
            <li>{t('terms.s6_li4')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s7_h')}</h2>
          <p>{t('terms.s7_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s8_h')}</h2>
          <p>{t('terms.s8_p')}</p>
          <ul>
            <li>{t('terms.s8_li1')}</li>
            <li>{t('terms.s8_li2')}</li>
            <li>{t('terms.s8_li3')}</li>
            <li>{t('terms.s8_li4')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s9_h')}</h2>
          <p>{t('terms.s9_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s10_h')}</h2>
          <p>{t('terms.s10_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s11_h')}</h2>
          <p>{t('terms.s11_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s12_h')}</h2>
          <p>{t('terms.s12_p1')}</p>
          <p>{t('terms.s12_p2')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s13_h')}</h2>
          <p>{t('terms.s13_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s14_h')}</h2>
          <p>{t('terms.s14_p')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('terms.s15_h')}</h2>
          <p>{t('terms.s15_p')} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </section>

        <div className="legal-footer">
          <Link to="/privacy">{t('terms.to_privacy')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/">{t('legal.to_app')}</Link>
        </div>
      </div>
    </div>
  );
}
