import { useNavigate } from 'react-router-dom';
import { Calendar, Users, TrendingUp, FileText, CheckCircle, Star, ArrowRight, Dumbbell, Bell, Clock } from 'lucide-react';

const FEATURES = [
  {
    icon: Calendar,
    en: 'Smart Scheduling',
    zh: '智能排課',
    desc_en: 'Book sessions, block personal time, and get automatic conflict checks. Clients can book directly — you stay in control.',
    desc_zh: '輕鬆排課、封鎖私人時間，自動防止時間衝突。學員可直接預約，教練完全掌控。',
    screenshot: '/screenshots/schedule.png',
  },
  {
    icon: TrendingUp,
    en: 'Progress Tracking',
    zh: '進度追蹤',
    desc_en: 'Track strength gains, body composition, and volume for every client. Visual charts show results at a glance.',
    desc_zh: '追蹤每位學員嘅力量進步、體型變化同訓練量。圖表一目了然，成果有據可查。',
    screenshot: '/screenshots/progress.png',
  },
  {
    icon: Dumbbell,
    en: 'Workout Plan Builder',
    zh: '訓練計劃設計',
    desc_en: 'Build personalised programs with sets, reps, and rest times. Assign to one client or bulk-assign to many.',
    desc_zh: '設計個人化訓練計劃，包含組數、次數同休息時間。可單獨指派或批量分配給多位學員。',
    screenshot: '/screenshots/plans.png',
  },
  {
    icon: Users,
    en: 'Client Dashboard',
    zh: '學員管理',
    desc_en: 'See all your clients at a glance. Get instant alerts when someone goes inactive or is running low on sessions.',
    desc_zh: '一覽所有學員狀態。學員久未訓練或堂數快用完時，即時提醒你跟進。',
    screenshot: '/screenshots/dashboard.png',
  },
];

const INCLUDED = [
  { en: 'Unlimited clients', zh: '無限學員' },
  { en: 'Session scheduling & booking', zh: '堂堂排課同預約' },
  { en: 'Workout plan builder', zh: '訓練計劃設計工具' },
  { en: 'Progress & strength charts', zh: '進度同力量圖表' },
  { en: 'Invoice & billing', zh: 'Invoice 同收費管理' },
  { en: 'Push notifications', zh: '推送通知' },
  { en: 'Session quota tracking', zh: '堂數管理' },
  { en: 'In-app messaging', zh: 'App 內訊息' },
  { en: 'Client retention alerts', zh: '學員流失預警' },
  { en: 'Works on iOS & Android', zh: '支援 iOS 同 Android' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-root">

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">Elite<span>Pro</span></div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-badge">
              <Star size={13} /> Built for Personal Trainers · 專為個人教練而設
            </div>
            <h1 className="lp-h1">
              The App That<br />
              <span className="lp-h1-accent">Runs Your PT Business</span>
            </h1>
            <p className="lp-hero-zh">全方位個人教練業務管理 App</p>
            <p className="lp-hero-sub">
              Schedule sessions, track client progress, send invoices — all in one place. No spreadsheets. No WhatsApp chaos.
            </p>
            <p className="lp-hero-sub-zh">
              排課、追蹤學員進度、發 Invoice — 全部喺一個 App 搞掂。唔使 Excel，唔使 WhatsApp 亂搵。
            </p>
            <div className="lp-hero-ctas">
              <button className="lp-cta-primary" onClick={() => navigate('/')}>
                Start Free Trial <ArrowRight size={18} />
              </button>
              <span className="lp-cta-note">No credit card required · 免費試用</span>
            </div>
          </div>
          <div className="lp-hero-phone">
            <div className="lp-phone-frame">
              <img src="/screenshots/dashboard.png" alt="ElitePro dashboard" className="lp-phone-screen" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="lp-trust-bar">
        <div className="lp-trust-item"><CheckCircle size={16} /> Free 30-day trial · 免費試用 30 天</div>
        <div className="lp-trust-item"><CheckCircle size={16} /> Works on iOS & Android · 支援 iOS 同 Android</div>
        <div className="lp-trust-item"><CheckCircle size={16} /> Cancel anytime · 隨時取消</div>
      </div>

      {/* ── Features ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <h2 className="lp-h2">Everything you need <span className="lp-h2-zh">· 一切你需要嘅功能</span></h2>
            <p className="lp-section-sub">Built around how PTs actually work — not how software engineers think they work.</p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.en} className="lp-feature-card">
                  <div className="lp-feature-phone">
                    <div className="lp-phone-frame lp-phone-sm">
                      <img src={f.screenshot} alt={f.en} className="lp-phone-screen" />
                    </div>
                  </div>
                  <div className="lp-feature-body">
                    <div className="lp-feature-icon-wrap">
                      <Icon size={20} />
                    </div>
                    <h3 className="lp-feature-title">{f.en} <span className="lp-feature-zh">· {f.zh}</span></h3>
                    <p className="lp-feature-desc">{f.desc_en}</p>
                    <p className="lp-feature-desc-zh">{f.desc_zh}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <h2 className="lp-h2">Up and running in minutes <span className="lp-h2-zh">· 幾分鐘內即可開始</span></h2>
          </div>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">1</div>
              <h4>Create your account</h4>
              <p>Sign up with Google or email. Your trainer profile is ready instantly.</p>
              <p className="lp-step-zh">用 Google 或 Email 註冊，即時建立教練檔案。</p>
            </div>
            <div className="lp-step-arrow"><ArrowRight size={20} /></div>
            <div className="lp-step">
              <div className="lp-step-num">2</div>
              <h4>Add your clients</h4>
              <p>Invite clients with a unique code or add them manually.</p>
              <p className="lp-step-zh">用專屬邀請碼邀請學員，或手動加入。</p>
            </div>
            <div className="lp-step-arrow"><ArrowRight size={20} /></div>
            <div className="lp-step">
              <div className="lp-step-num">3</div>
              <h4>Start training</h4>
              <p>Build plans, schedule sessions, track progress. All in one place.</p>
              <p className="lp-step-zh">設計計劃、安排課堂、追蹤進度。一切盡在掌握。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="lp-section" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <h2 className="lp-h2">Simple pricing <span className="lp-h2-zh">· 清晰定價</span></h2>
            <p className="lp-section-sub">One plan. Everything included. No hidden fees.</p>
            <p className="lp-section-sub-zh">一個計劃，功能全包，冇隱藏收費。</p>
          </div>
          <div className="lp-pricing-card">
            <div className="lp-pricing-header">
              <div className="lp-pricing-label">Professional</div>
              <div className="lp-pricing-price">
                £20<span className="lp-pricing-per">/month</span>
              </div>
              <div className="lp-pricing-trial">30-day free trial · 免費試用 30 天</div>
            </div>
            <div className="lp-pricing-features">
              {INCLUDED.map(item => (
                <div key={item.en} className="lp-pricing-feature">
                  <CheckCircle size={16} className="lp-check" />
                  <span>{item.en} <span className="lp-pricing-zh">· {item.zh}</span></span>
                </div>
              ))}
            </div>
            <button className="lp-cta-primary lp-pricing-cta" onClick={() => navigate('/')}>
              Start Free Trial <ArrowRight size={18} />
            </button>
            <p className="lp-pricing-note">No credit card required · 唔需要信用卡</p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-section-inner lp-cta-inner">
          <h2 className="lp-cta-heading">Ready to level up your PT business?</h2>
          <p className="lp-cta-heading-zh">準備好將你嘅教練業務升級？</p>
          <button className="lp-cta-primary" onClick={() => navigate('/')}>
            Get Started Free <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-logo">Elite<span>Pro</span></div>
          <div className="lp-footer-links">
            <a href="/#/privacy" className="lp-footer-link">Privacy Policy</a>
            <a href="/#/terms" className="lp-footer-link">Terms of Service</a>
            <a href="mailto:Elitepro616@gmail.com" className="lp-footer-link">Contact · 聯絡我們</a>
          </div>
          <p className="lp-footer-copy">© 2026 ElitePro. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
