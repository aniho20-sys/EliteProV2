import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X, Star } from 'lucide-react';

// The single conversion point for the whole page. WhatsApp is the primary channel; until a
// number is set here every CTA falls back to email so nothing is ever a dead link.
const WHATSAPP_NUMBER = ''; // digits only, country code first, e.g. '85291234567'
const CONTACT_EMAIL = 'aniho20@gmail.com';
const WHATSAPP_MESSAGE = "Hi Ani — I'm a personal trainer and I'd like one of the founding member places.";

const contactHref = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
  : `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Founding member place')}&body=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const contactLabel = WHATSAPP_NUMBER ? 'Message me on WhatsApp' : 'Email me';

const PAINS = [
  {
    title: 'Your programmes live in five places',
    body: 'A plan in Notes, a spreadsheet of weights, a PDF you keep re-sending, and the rest in a WhatsApp thread you have to scroll back through mid-session.',
  },
  {
    title: 'You lose track of who has sessions left',
    body: 'You think someone has three left. They think they have five. Now you have to check your notes and have an awkward conversation about money.',
  },
  {
    title: 'You find out someone quit after they have gone',
    body: 'Nobody announces they are stopping. They just book less, then not at all — and by the time you notice, it has been a month.',
  },
];

const SOLUTIONS = [
  {
    title: 'Write the plan once. They see it instantly.',
    body: 'Build a plan from your exercise library, assign it, and it appears in your client’s app with your own coaching cues and demo videos. They log their sets against it — you see the numbers without asking.',
    shot: '/screens/plan.png',
    alt: 'A workout plan open in the ElitePro app',
  },
  {
    title: 'Session credits count themselves.',
    body: 'A booking takes one off the balance. Mark it complete and it stays off; cancel in time and it comes straight back. You and your client are always looking at the same number.',
    shot: '/screens/sessions.png',
    alt: 'Session credit balance and booking screen in the ElitePro app',
  },
  {
    title: 'The dashboard tells you who to chase.',
    body: 'Who has gone quiet, who is nearly out of sessions, who still owes you — surfaced the moment it is true, with a message button next to each one.',
    shot: '/screens/dashboard.png',
    alt: 'Trainer dashboard showing clients that need attention',
  },
];

// Every figure below was read off each company's own pricing page on 2026-08-15. Nothing
// here is taken from a comparison blog — the aggregators disagreed with the primary
// sources, so only what the vendor states about itself is quoted.
const PRICING_SOURCES = [
  { name: 'ABC Trainerize', url: 'https://www.trainerize.com/pricing/' },
  { name: 'TrueCoach', url: 'https://truecoach.co/pricing/' },
  { name: 'PT Distinction', url: 'https://www.ptdistinction.com/pricing' },
];

const PRICING_ROWS = [
  { label: 'Starting price', elite: 'Free', others: ['$23/mo', '$26.34/mo', '$19.90/mo'] },
  { label: 'Setup / branded app fee', elite: '$0', others: ['$169 one-time', '$0', '$0'] },
  { label: 'Extra charge to accept payments', elite: '$0', others: ['+$10/mo', '$0', '$0'] },
  { label: 'Commission on money you collect', elite: '0%', others: ['—', '—', '—'] },
];

function Screenshot({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="lp-shot">
      {failed
        ? <div className="lp-shot-pending">Screenshot coming</div>
        : <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />}
    </div>
  );
}

function Cta({ block }) {
  return (
    <a className={`lp-cta${block ? ' lp-cta-block' : ''}`} href={contactHref}>
      {contactLabel} <ArrowRight size={18} />
    </a>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp">
      <header className="lp-bar">
        <span className="lp-logo">Elite<span>Pro</span></span>
        <button className="lp-signin" onClick={() => navigate('/login')}>Sign in</button>
      </header>

      {/* 1 — Hero */}
      <section className="lp-hero">
        <h1>Run your coaching from one app instead of six.</h1>
        <p className="lp-lede">
          Plans, bookings, session credits and payments for independent personal trainers.
          Your clients get their own app. You stop keeping score in your head.
        </p>
        <Cta />
      </section>

      {/* 2 — The problem */}
      <section className="lp-section">
        <h2>If you coach on your own, you know all three of these</h2>
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
        <h2>What ElitePro does about it</h2>
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
        <h2>No setup fee. No cut of your income.</h2>
        <p className="lp-section-sub">
          Coaching software usually charges you before you have earned anything, then again
          to switch payments on. Here is what each company says on its own pricing page.
        </p>
        <div className="lp-table-scroll">
          <table className="lp-table">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col" className="lp-table-us">ElitePro</th>
                <th scope="col">Trainerize</th>
                <th scope="col">TrueCoach</th>
                <th scope="col">PT Distinction</th>
              </tr>
            </thead>
            <tbody>
              {PRICING_ROWS.map(row => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td className="lp-table-us">{row.elite}</td>
                  {row.others.map((v, i) => <td key={i}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lp-sources">
          Entry plans compared at 5 clients. Checked 15 August 2026 —{' '}
          {PRICING_SOURCES.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ', '}
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
            </span>
          ))}. Prices change; check before you decide.
        </p>
      </section>

      {/* 5 — Founding members */}
      <section className="lp-founding">
        <div className="lp-founding-badge"><Star size={13} /> Founding members</div>
        <h2>Five places. Three months free.</h2>
        <p>
          I am looking for five independent trainers to use ElitePro properly with real
          clients, and to tell me what is wrong with it. Three months free, no card, and the
          things you ask for get built first.
        </p>
        <ul className="lp-founding-list">
          <li><Check size={16} /> Three months free from the day you start</li>
          <li><Check size={16} /> No setup fee and no commission, then or later</li>
          <li><Check size={16} /> Your feedback goes to the top of the list</li>
          <li><X size={16} /> Not for you if you do not want to be asked for feedback</li>
        </ul>
      </section>

      {/* 6 — Close */}
      <section className="lp-close">
        <h2>Want one of the five?</h2>
        <Cta block />
        <p className="lp-note">
          I am a personal trainer. I built ElitePro because I was running my own clients out
          of a notes app and a spreadsheet, and I could never answer &ldquo;how many sessions
          do I have left?&rdquo; without going to check. It is the tool I use for my own
          coaching — which is why it does the unglamorous parts properly.
        </p>
        <footer className="lp-foot">
          <button onClick={() => navigate('/privacy')}>Privacy</button>
          <button onClick={() => navigate('/terms')}>Terms</button>
        </footer>
      </section>
    </div>
  );
}
