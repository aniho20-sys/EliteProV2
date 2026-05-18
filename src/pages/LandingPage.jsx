import { useNavigate } from 'react-router-dom';
import { CheckCircle, Star, ArrowRight, Dumbbell, Calendar, TrendingUp, Users, AlertTriangle, MessageSquare, ChevronRight } from 'lucide-react';

/* ─── CSS Mockup Components ─── */

function MockHeader({ title }) {
  return (
    <div className="lp-mock-header">
      <span className="lp-mock-logo">Elite<span>Pro</span></span>
      <div className="lp-mock-header-icons">
        <div className="lp-mock-icon-dot" />
        <div className="lp-mock-icon-dot" />
        <div className="lp-mock-icon-dot lp-mock-icon-circle" />
      </div>
    </div>
  );
}

function MockDashboard() {
  return (
    <div className="lp-mock-screen">
      <MockHeader />
      <div className="lp-mock-body">
        <div className="lp-mock-greeting">
          <div className="lp-mock-text-lg">Welcome back, Alex!</div>
          <div className="lp-mock-text-sm lp-mock-muted">Here's your overview for today</div>
        </div>
        <div className="lp-mock-stat-grid">
          {[
            { val: '12', label: 'ACTIVE CLIENTS', color: '#4361ee' },
            { val: '3', label: 'SESSIONS TODAY', color: '#ff6b35' },
            { val: '0', label: 'UNREAD MSGS', color: '#10b981' },
            { val: '10', label: 'WORKOUT PLANS', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="lp-mock-stat-card">
              <div className="lp-mock-stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="lp-mock-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="lp-mock-alert-card">
          <div className="lp-mock-alert-title">
            <AlertTriangle size={11} style={{ color: '#ef476f' }} />
            <span>1 Client Needs Attention</span>
          </div>
          <div className="lp-mock-alert-row">
            <div className="lp-mock-avatar">J</div>
            <div className="lp-mock-alert-info">
              <div className="lp-mock-text-sm lp-mock-bold">James</div>
              <div className="lp-mock-tag lp-mock-tag-warn">Inactive 8d</div>
            </div>
            <div className="lp-mock-msg-btn"><MessageSquare size={10} /> Message</div>
          </div>
        </div>
        <div className="lp-mock-schedule-preview">
          <div className="lp-mock-text-sm lp-mock-bold lp-mock-mb4">Today's Schedule</div>
          {[
            { time: '10:00', name: 'Sarah', status: 'confirmed' },
            { time: '14:00', name: 'Marcus', status: 'confirmed' },
          ].map(s => (
            <div key={s.time} className="lp-mock-sched-row">
              <span className="lp-mock-sched-time">{s.time}</span>
              <span className="lp-mock-text-sm">{s.name}</span>
              <span className="lp-mock-tag lp-mock-tag-primary">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lp-mock-bottomnav">
        {['Home', 'Clients', 'Plans', 'Messages'].map((t, i) => (
          <div key={t} className={`lp-mock-tab${i === 0 ? ' lp-mock-tab-active' : ''}`}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function MockSchedule() {
  return (
    <div className="lp-mock-screen">
      <MockHeader />
      <div className="lp-mock-body">
        <div className="lp-mock-page-title">Schedule</div>
        <div className="lp-mock-primary-btn">+ Book Session</div>
        <div className="lp-mock-date-row">
          {[
            { day: 'Mon', num: 18, active: true, dot: true },
            { day: 'Tue', num: 19, dot: true },
            { day: 'Wed', num: 20, dot: false },
            { day: 'Thu', num: 21, dot: true },
            { day: 'Fri', num: 22, dot: false },
          ].map(d => (
            <div key={d.num} className={`lp-mock-date-btn${d.active ? ' lp-mock-date-active' : ''}`}>
              <div className="lp-mock-date-day">{d.day}</div>
              <div className="lp-mock-date-num">{d.num}</div>
              {d.dot && <div className="lp-mock-date-dot" />}
            </div>
          ))}
        </div>
        <div className="lp-mock-card">
          <div className="lp-mock-text-sm lp-mock-bold lp-mock-mb8">Monday, May 18</div>
          {[
            { time: '10:00', name: 'Sarah L.', type: 'PT Session', status: 'confirmed', color: '#4361ee' },
            { time: '14:00', name: 'Marcus T.', type: 'PT Session', status: 'confirmed', color: '#4361ee' },
            { time: '16:30', name: 'Blocked', type: 'Personal', status: 'unavailable', color: '#9ca3af' },
          ].map(s => (
            <div key={s.time} className="lp-mock-session-row">
              <div className="lp-mock-session-bar" style={{ background: s.color }} />
              <div className="lp-mock-session-time">{s.time}</div>
              <div className="lp-mock-session-info">
                <div className="lp-mock-text-sm lp-mock-bold">{s.name}</div>
                <div className="lp-mock-text-xs lp-mock-muted">{s.type}</div>
              </div>
              <div className={`lp-mock-tag lp-mock-tag-${s.status === 'confirmed' ? 'primary' : 'muted'}`}>{s.status}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="lp-mock-bottomnav">
        {['Home', 'Clients', 'Plans', 'Messages'].map((t, i) => (
          <div key={t} className={`lp-mock-tab${i === 1 ? ' lp-mock-tab-active' : ''}`}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function MockProgress() {
  // SVG line chart: Bench Press weight over 8 sessions (60→85kg upward trend)
  const pts = [60, 62.5, 65, 67.5, 70, 75, 80, 85];
  const W = 180, H = 60, pad = 4;
  const minV = 55, maxV = 90;
  const toX = (i) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const toY = (v) => H - pad - ((v - minV) / (maxV - minV)) * (H - pad * 2);
  const linePath = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ');
  const areaPath = `${linePath} L${toX(pts.length - 1)},${H} L${toX(0)},${H} Z`;

  return (
    <div className="lp-mock-screen">
      <MockHeader />
      <div className="lp-mock-body">
        <div className="lp-mock-tabs-row">
          <span className="lp-mock-tab-item">Body</span>
          <span className="lp-mock-tab-item lp-mock-tab-item-active">Exercise</span>
          <span className="lp-mock-tab-item">Volume</span>
        </div>
        <div className="lp-mock-exercise-select">Bench Press (12 sessions) ▾</div>
        <div className="lp-mock-metric-pills">
          <span className="lp-mock-pill lp-mock-pill-active">Max Weight</span>
          <span className="lp-mock-pill">Volume</span>
          <span className="lp-mock-pill">Reps</span>
        </div>
        <div className="lp-mock-card lp-mock-chart-card">
          <div className="lp-mock-text-sm lp-mock-bold">Bench Press</div>
          <div className="lp-mock-text-xs" style={{ color: '#10b981' }}>▲ +25 kg (+41.7%) since first session</div>
          <svg width={W} height={H} style={{ marginTop: 8, overflow: 'visible' }}>
            <defs>
              <linearGradient id="lp-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4361ee" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4361ee" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#lp-chart-grad)" />
            <path d={linePath} fill="none" stroke="#4361ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={toX(7)} cy={toY(85)} r="4" fill="#4361ee" />
            <rect x={toX(7) - 22} y={toY(85) - 22} width="44" height="18" rx="4" fill="#1a1a2e" />
            <text x={toX(7)} y={toY(85) - 9} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">85 kg</text>
          </svg>
        </div>
        <div className="lp-mock-card">
          <div className="lp-mock-text-xs lp-mock-bold lp-mock-mb4">Session History</div>
          <div className="lp-mock-table-header">
            <span>DATE</span><span>MAX WT</span><span>VOL</span>
          </div>
          {[
            { date: '05-14', wt: '85 kg', vol: '2,125', pr: true },
            { date: '05-08', wt: '80 kg', vol: '2,000' },
            { date: '04-29', wt: '75 kg', vol: '1,875' },
          ].map(r => (
            <div key={r.date} className="lp-mock-table-row">
              <span className="lp-mock-text-xs">{r.date}</span>
              <span className="lp-mock-text-xs lp-mock-bold">
                {r.wt} {r.pr && <span className="lp-mock-pr">PR</span>}
              </span>
              <span className="lp-mock-text-xs lp-mock-muted">{r.vol}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockPlans() {
  const days = [
    {
      day: 'Day 1', label: 'MONDAY',
      exercises: [
        { name: 'Bench Press', detail: '4 × 5  80/82.5/85/85kg' },
        { name: 'Squat', detail: '4 × 5  100/105/105/110kg' },
        { name: 'Pull Up', detail: '3 × 8' },
        { name: 'Triceps Extension', detail: '3 × 10  15kg' },
      ],
    },
    {
      day: 'Day 2', label: 'THURSDAY',
      exercises: [
        { name: 'Deadlift', detail: '4 × 3  120kg' },
        { name: 'Overhead Press', detail: '3 × 8  50kg' },
      ],
    },
  ];
  return (
    <div className="lp-mock-screen">
      <MockHeader />
      <div className="lp-mock-body">
        {days.map((d, di) => (
          <div key={d.day} className="lp-mock-card lp-mock-mb8">
            <div className="lp-mock-plan-header">
              <span className="lp-mock-text-sm lp-mock-bold">{d.day}</span>
              <span className="lp-mock-tag lp-mock-tag-primary">{d.label}</span>
            </div>
            {d.exercises.map(ex => (
              <div key={ex.name} className="lp-mock-exercise-row">
                <div>
                  <div className="lp-mock-text-sm lp-mock-bold">{ex.name}</div>
                  <div className="lp-mock-text-xs lp-mock-muted">{ex.detail}</div>
                </div>
                {di === 0 && <ChevronRight size={12} style={{ color: '#ff6b35', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="lp-mock-bottomnav">
        {['Home', 'Clients', 'Plans', 'Messages'].map((t, i) => (
          <div key={t} className={`lp-mock-tab${i === 2 ? ' lp-mock-tab-active' : ''}`}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({ children }) {
  return <div className="lp-phone-wrap">{children}</div>;
}

/* ─── Feature Data ─── */
const FEATURES = [
  {
    icon: Calendar,
    en: 'Smart Scheduling',
    zh: '智能排課',
    desc_en: 'Book sessions, block personal time, and get automatic conflict checks. Clients can book directly — you stay in control.',
    desc_zh: '輕鬆排課、封鎖私人時間，自動防止時間衝突。學員可直接預約，教練完全掌控。',
    mockup: <MockSchedule />,
  },
  {
    icon: TrendingUp,
    en: 'Progress Tracking',
    zh: '進度追蹤',
    desc_en: 'Track strength gains, body composition, and volume for every client. Visual charts show results at a glance.',
    desc_zh: '追蹤每位學員嘅力量進步、體型變化同訓練量。圖表一目了然，成果有據可查。',
    mockup: <MockProgress />,
  },
  {
    icon: Dumbbell,
    en: 'Workout Plan Builder',
    zh: '訓練計劃設計',
    desc_en: 'Build personalised programs with sets, reps, and rest times. Assign to one client or bulk-assign to many in seconds.',
    desc_zh: '設計個人化訓練計劃，包含組數、次數同休息時間。可單獨指派或批量分配。',
    mockup: <MockPlans />,
  },
  {
    icon: Users,
    en: 'Client Management',
    zh: '學員管理',
    desc_en: 'See all your clients at a glance. Get instant alerts when someone goes inactive or is running low on sessions.',
    desc_zh: '一覽所有學員狀態。學員久未訓練或堂數快用完時，即時提醒你跟進。',
    mockup: <MockDashboard />,
  },
];

const INCLUDED = [
  { en: 'Unlimited clients', zh: '無限學員' },
  { en: 'Session scheduling & booking', zh: '排課同預約' },
  { en: 'Workout plan builder', zh: '訓練計劃設計工具' },
  { en: 'Progress & strength charts', zh: '進度同力量圖表' },
  { en: 'Invoice & billing', zh: 'Invoice 同收費管理' },
  { en: 'Push notifications', zh: '推送通知' },
  { en: 'Session quota tracking', zh: '堂數管理' },
  { en: 'In-app messaging', zh: 'App 內訊息' },
  { en: 'Client retention alerts', zh: '學員流失預警' },
  { en: 'Works on iOS & Android', zh: '支援 iOS 同 Android' },
];

/* ─── Main Page ─── */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-root">

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">Elite<span>Pro</span></div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-badge"><Star size={13} /> Built for Personal Trainers · 專為個人教練而設</div>
            <h1 className="lp-h1">The App That<br /><span className="lp-h1-accent">Runs Your PT Business</span></h1>
            <p className="lp-hero-zh">全方位個人教練業務管理 App</p>
            <p className="lp-hero-sub">Schedule sessions, track client progress, send invoices — all in one place. No spreadsheets. No WhatsApp chaos.</p>
            <p className="lp-hero-sub-zh">排課、追蹤學員進度、發 Invoice — 全部喺一個 App 搞掂。唔使 Excel，唔使 WhatsApp 亂搵。</p>
            <div className="lp-hero-ctas">
              <button className="lp-cta-primary" onClick={() => navigate('/')}>Start Free Trial <ArrowRight size={18} /></button>
              <span className="lp-cta-note">No credit card required · 免費試用</span>
            </div>
          </div>
          <div className="lp-hero-phone">
            <PhoneFrame><MockDashboard /></PhoneFrame>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="lp-trust-bar">
        <div className="lp-trust-item"><CheckCircle size={16} /> Free 30-day trial · 免費試用 30 天</div>
        <div className="lp-trust-item"><CheckCircle size={16} /> Works on iOS & Android · 支援 iOS 同 Android</div>
        <div className="lp-trust-item"><CheckCircle size={16} /> Cancel anytime · 隨時取消</div>
      </div>

      {/* Features */}
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
                    <PhoneFrame>{f.mockup}</PhoneFrame>
                  </div>
                  <div className="lp-feature-body">
                    <div className="lp-feature-icon-wrap"><Icon size={20} /></div>
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

      {/* How it works */}
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

      {/* Pricing */}
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
              <div className="lp-pricing-price">£20<span className="lp-pricing-per">/month</span></div>
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

      {/* Final CTA */}
      <section className="lp-cta-section">
        <div className="lp-section-inner lp-cta-inner">
          <h2 className="lp-cta-heading">Ready to level up your PT business?</h2>
          <p className="lp-cta-heading-zh">準備好將你嘅教練業務升級？</p>
          <button className="lp-cta-primary" onClick={() => navigate('/')}>
            Get Started Free <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
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
