import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Calendar,
  BookOpen, LogOut, TrendingUp, Search, MessageSquare, UserCircle, Sun, Moon, BarChart2, Receipt, PieChart,
  MoreHorizontal, X, ChevronRight, Building2, FileBadge
} from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useState } from 'react';

// Single source of truth for all navigation links
const LINK_DEFS = {
  '/':                 { icon: LayoutDashboard },
  '/clients':          { icon: Users },
  '/schedule':         { icon: Calendar },
  '/messages':         { icon: MessageSquare },
  '/plans':            { icon: ClipboardList },
  '/progress-overview':{ icon: BarChart2 },
  '/invoices':         { icon: Receipt },
  '/analytics':        { icon: PieChart },
  '/exercises':        { icon: BookOpen },
  '/log':              { icon: Dumbbell },
  '/progress':         { icon: TrendingUp },
  '/my-workouts':      { icon: ClipboardList },
  '/profile':          { icon: UserCircle },
  '/operator/studios': { icon: Building2 },
  '/apply':            { icon: FileBadge },
  '/studios/book':     { icon: Calendar },
};

// Route labels, one literal t() per entry. They cannot live in LINK_DEFS above because
// that is module scope with no t() in it — and they must not be looked up dynamically
// either: t() refuses a variable key, which is the same rule that stops an exercise name
// being translated (CLAUDE.md #39).
const navLabels = (t) => ({
  '/':                 { label: t('nav.dashboard'),         mobileLabel: t('nav.home') },
  '/clients':          { label: t('nav.clients') },
  '/schedule':         { label: t('nav.schedule') },
  '/messages':         { label: t('nav.messages') },
  '/plans':            { label: t('nav.plans_full'),        mobileLabel: t('nav.plans_short') },
  '/progress-overview':{ label: t('nav.progress_overview') },
  '/invoices':         { label: t('nav.invoices') },
  '/analytics':        { label: t('nav.analytics') },
  '/exercises':        { label: t('nav.exercise_library') },
  '/log':              { label: t('nav.workout_log'),       mobileLabel: t('nav.log_short') },
  '/progress':         { label: t('nav.progress'),          mobileLabel: t('nav.my_progress') },
  '/my-workouts':      { label: t('nav.my_plans') },
  '/profile':          { label: t('nav.profile') },
  '/operator/studios': { label: t('nav.studios') },
  // Brand name, not UI copy — never translated, in either direction.
  '/apply':            { label: 'gym啦' },
  '/studios/book':     { label: t('nav.book_studio') },
});

const makeLinks = (paths, labels, mobile = false) =>
  paths.map(to => ({ to, icon: LINK_DEFS[to].icon, label: mobile && labels[to].mobileLabel ? labels[to].mobileLabel : labels[to].label }));

// gym啦 hidden — remove '/apply' and '/studios/book' from nav, use 'client' fallback for operator
// Messages hidden — remove '/messages' from nav (route stays registered in App.jsx)
const NAV_CONFIG = {
  trainer: {
    desktop:  { primary: ['/', '/clients', '/schedule', '/plans'], secondary: ['/progress-overview', '/invoices', '/analytics', '/exercises'] },
    mobile:   { primary: ['/', '/clients', '/plans', '/schedule'],   more: ['/invoices', '/analytics', '/progress-overview', '/exercises', '/profile'] },
  },
  client: {
    desktop:  { primary: ['/', '/log', '/progress', '/my-workouts'],    secondary: ['/schedule', '/exercises'] },
    mobile:   { primary: ['/', '/log', '/schedule', '/my-workouts'],    more: ['/progress', '/exercises', '/profile'] },
  },
  operator: {
    desktop:  { primary: ['/', '/profile'], secondary: [] },
    mobile:   { primary: ['/', '/profile'], more: [] },
  },
};

export default function Navigation() {
  const { currentUser, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const role = currentUser?.role === 'trainer' ? 'trainer' : currentUser?.role === 'operator' ? 'operator' : currentUser?.role === 'client' ? 'client' : 'client';
  const labels = navLabels(t);
  const links        = makeLinks(NAV_CONFIG[role].desktop.primary, labels);
  const secondaryLinks = makeLinks(NAV_CONFIG[role].desktop.secondary, labels);
  const primaryLinks = makeLinks(NAV_CONFIG[role].mobile.primary, labels, true);
  const moreLinks    = makeLinks(NAV_CONFIG[role].mobile.more, labels, true);
  const roleLabel = {
    trainer: t('nav.role_trainer'),
    client: t('nav.role_client'),
    operator: t('nav.role_operator'),
  }[role];
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Auto-expand sidebar "More" if current page is a secondary link
  const sidebarSecondaryActive = secondaryLinks.some(l => location.pathname === l.to);
  const [sidebarMoreOpen, setSidebarMoreOpen] = useState(sidebarSecondaryActive);

  const handleLogout = () => { logout(); navigate('/'); };

  // "More" button is active if current path is one of the more-links
  const moreIsActive = moreLinks.some(l => l.to !== '/' && location.pathname === l.to);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">Elite<span>Pro</span></div>
        <div className="sidebar-search">
          <GlobalSearch />
        </div>
        <nav className="sidebar-nav">
          {links.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <link.icon size={19} strokeWidth={2} />
              {link.label}
            </NavLink>
          ))}
          <button
            className={`sidebar-more-toggle ${sidebarSecondaryActive ? 'secondary-active' : ''}`}
            onClick={() => setSidebarMoreOpen(v => !v)}
          >
            <MoreHorizontal size={19} strokeWidth={2} />
            {t('nav.more')}
            <ChevronRight size={14} className={`sidebar-more-chevron ${sidebarMoreOpen ? 'open' : ''}`} />
          </button>
          {sidebarMoreOpen && (
            <div className="sidebar-secondary-links">
              {secondaryLinks.map(link => (
                <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `sidebar-link sidebar-link-secondary ${isActive ? 'active' : ''}`}>
                  <link.icon size={17} strokeWidth={2} />
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        <div className="sidebar-notif">
          <NotificationCenter />
        </div>
        <div className="sidebar-theme-toggle">
          <button className="btn btn-outline btn-sm" onClick={toggleTheme} style={{ width: '100%' }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? t('nav.dark_mode') : t('nav.light_mode')}
          </button>
        </div>
        <div className="sidebar-user">
          <NavLink to="/profile" className="sidebar-user-info sidebar-user-link">
            <div className="sidebar-user-avatar">{currentUser?.name?.[0]}</div>
            <div>
              <div className="sidebar-user-name">{currentUser?.name}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </NavLink>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={14} /> {t('nav.log_out')}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="mobile-header-inner">
          <span className="mobile-header-logo">Elite<span>Pro</span></span>
          <div className="mobile-header-actions">
            <button className="btn-icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="btn-icon" onClick={() => setMobileSearchOpen(!mobileSearchOpen)}>
              <Search size={20} />
            </button>
            <NotificationCenter />
            <NavLink to="/profile" className="btn-icon" style={{ textDecoration: 'none', color: 'inherit' }}>
              <UserCircle size={22} />
            </NavLink>
          </div>
        </div>
        {mobileSearchOpen && (
          <div className="mobile-search-wrapper">
            <GlobalSearch onSelect={() => setMobileSearchOpen(false)} />
          </div>
        )}
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {primaryLinks.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
              <div className="bottom-nav-icon-wrap">
                <link.icon size={20} strokeWidth={2} />
              </div>
              {link.label}
            </NavLink>
          ))}
          <button
            className={`bottom-nav-link bottom-nav-more-btn ${moreOpen || moreIsActive ? 'active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-label={t('nav.more')}
          >
            <div className="bottom-nav-icon-wrap">
              <MoreHorizontal size={20} strokeWidth={2} />
            </div>
            {t('nav.more')}
          </button>
        </div>
      </nav>

      {/* More Sheet Overlay */}
      {moreOpen && (
        <div className="more-sheet-overlay" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            <div className="more-sheet-header">
              <span className="more-sheet-title">{t('nav.more')}</span>
              <button className="btn-icon" onClick={() => setMoreOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="more-sheet-nav">
              {moreLinks.filter(l => l.to !== '/profile').map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => `more-sheet-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <div className="more-sheet-link-icon">
                    <link.icon size={20} strokeWidth={2} />
                  </div>
                  <span className="more-sheet-link-label">{link.label}</span>
                  <ChevronRight size={16} className="more-sheet-link-chevron" />
                </NavLink>
              ))}
              <div className="more-sheet-divider" />
              {moreLinks.filter(l => l.to === '/profile').map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `more-sheet-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <div className="more-sheet-link-icon">
                    <link.icon size={20} strokeWidth={2} />
                  </div>
                  <span className="more-sheet-link-label">{link.label}</span>
                  <ChevronRight size={16} className="more-sheet-link-chevron" />
                </NavLink>
              ))}
              <button className="more-sheet-link more-sheet-logout" onClick={handleLogout}>
                <div className="more-sheet-link-icon more-sheet-logout-icon">
                  <LogOut size={20} strokeWidth={2} />
                </div>
                <span className="more-sheet-link-label">{t('nav.log_out')}</span>
                <ChevronRight size={16} className="more-sheet-link-chevron" />
              </button>
            </nav>
            <div className="more-sheet-user">
              <div className="sidebar-user-avatar">{currentUser?.name?.[0]}</div>
              <div>
                <div className="sidebar-user-name">{currentUser?.name}</div>
                <div className="sidebar-user-role">{roleLabel}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
