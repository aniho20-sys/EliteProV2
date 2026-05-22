import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Calendar,
  BookOpen, LogOut, TrendingUp, Search, MessageSquare, UserCircle, Sun, Moon, BarChart2, Receipt, PieChart,
  MoreHorizontal, X, ChevronRight, Building2, FileBadge
} from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

// Single source of truth for all navigation links
const LINK_DEFS = {
  '/':                { icon: LayoutDashboard, label: 'Dashboard',        mobileLabel: 'Home' },
  '/clients':         { icon: Users,           label: 'Clients' },
  '/schedule':        { icon: Calendar,        label: 'Schedule' },
  '/messages':        { icon: MessageSquare,   label: 'Messages' },
  '/plans':           { icon: ClipboardList,   label: 'Workout Plans',    mobileLabel: 'Plans' },
  '/progress-overview':{ icon: BarChart2,      label: 'Progress Overview' },
  '/invoices':        { icon: Receipt,         label: 'Invoices' },
  '/analytics':       { icon: PieChart,        label: 'Analytics' },
  '/exercises':       { icon: BookOpen,        label: 'Exercise Library' },
  '/log':             { icon: Dumbbell,        label: 'Workout Log',      mobileLabel: 'Log' },
  '/progress':        { icon: TrendingUp,      label: 'Progress',         mobileLabel: 'My Progress' },
  '/my-workouts':     { icon: ClipboardList,   label: 'My Plans' },
  '/profile':         { icon: UserCircle,      label: 'Profile' },
  '/operator/studios': { icon: Building2,     label: 'Studios' },
  '/apply':           { icon: FileBadge,       label: 'gym啦' },
  '/studios/book':    { icon: Calendar,        label: 'Book Studio' },
};

const makeLinks = (paths, mobile = false) =>
  paths.map(to => ({ to, icon: LINK_DEFS[to].icon, label: mobile && LINK_DEFS[to].mobileLabel ? LINK_DEFS[to].mobileLabel : LINK_DEFS[to].label }));

const NAV_CONFIG = {
  trainer: {
    desktop:  { primary: ['/', '/clients', '/schedule', '/messages'], secondary: ['/progress-overview', '/plans', '/invoices', '/analytics', '/exercises', '/apply'] },
    mobile:   { primary: ['/', '/clients', '/plans', '/messages'],   more: ['/schedule', '/invoices', '/analytics', '/progress-overview', '/exercises', '/apply', '/profile'] },
  },
  client: {
    desktop:  { primary: ['/', '/log', '/progress', '/messages'],    secondary: ['/my-workouts', '/schedule', '/exercises'] },
    mobile:   { primary: ['/', '/log', '/schedule', '/messages'],    more: ['/my-workouts', '/progress', '/exercises', '/profile'] },
  },
  operator: {
    desktop:  { primary: ['/', '/operator/studios', '/profile'], secondary: [] },
    mobile:   { primary: ['/', '/operator/studios', '/profile'], more: [] },
  },
};

export default function Navigation() {
  const { currentUser, logout, getUnreadCount } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const role = currentUser?.role === 'operator' ? 'operator' : currentUser?.role === 'trainer' ? 'trainer' : 'client';
  const links        = makeLinks(NAV_CONFIG[role].desktop.primary);
  const secondaryLinks = makeLinks(NAV_CONFIG[role].desktop.secondary);
  const primaryLinks = makeLinks(NAV_CONFIG[role].mobile.primary, true);
  const moreLinks    = makeLinks(NAV_CONFIG[role].mobile.more, true);
  const unreadCount = getUnreadCount(currentUser?.id);
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
              {link.to === '/messages' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
          <button
            className={`sidebar-more-toggle ${sidebarSecondaryActive ? 'secondary-active' : ''}`}
            onClick={() => setSidebarMoreOpen(v => !v)}
          >
            <MoreHorizontal size={19} strokeWidth={2} />
            More
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
        <div className="sidebar-theme-toggle">
          <button className="btn btn-outline btn-sm" onClick={toggleTheme} style={{ width: '100%' }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>
        <div className="sidebar-user">
          <NavLink to="/profile" className="sidebar-user-info sidebar-user-link">
            <div className="sidebar-user-avatar">{currentUser?.name?.[0]}</div>
            <div>
              <div className="sidebar-user-name">{currentUser?.name}</div>
              <div className="sidebar-user-role">{currentUser?.role}</div>
            </div>
          </NavLink>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={14} /> Log Out
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
                {link.to === '/messages' && unreadCount > 0 && (
                  <span className="nav-badge-dot" />
                )}
              </div>
              {link.label}
            </NavLink>
          ))}
          <button
            className={`bottom-nav-link bottom-nav-more-btn ${moreOpen || moreIsActive ? 'active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-label="More"
          >
            <div className="bottom-nav-icon-wrap">
              <MoreHorizontal size={20} strokeWidth={2} />
            </div>
            More
          </button>
        </div>
      </nav>

      {/* More Sheet Overlay */}
      {moreOpen && (
        <div className="more-sheet-overlay" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            <div className="more-sheet-header">
              <span className="more-sheet-title">More</span>
              <button className="btn-icon" onClick={() => setMoreOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="more-sheet-nav">
              {moreLinks.map(link => (
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
              <button className="more-sheet-link more-sheet-logout" onClick={handleLogout}>
                <div className="more-sheet-link-icon more-sheet-logout-icon">
                  <LogOut size={20} strokeWidth={2} />
                </div>
                <span className="more-sheet-link-label">Log Out</span>
                <ChevronRight size={16} className="more-sheet-link-chevron" />
              </button>
            </nav>
            <div className="more-sheet-user">
              <div className="sidebar-user-avatar">{currentUser?.name?.[0]}</div>
              <div>
                <div className="sidebar-user-name">{currentUser?.name}</div>
                <div className="sidebar-user-role">{currentUser?.role}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
