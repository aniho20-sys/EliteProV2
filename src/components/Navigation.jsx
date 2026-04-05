import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Calendar,
  BookOpen, LogOut, TrendingUp, Search, MessageSquare, UserCircle, Sun, Moon
} from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

const trainerLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/plans', icon: ClipboardList, label: 'Plans' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/exercises', icon: BookOpen, label: 'Exercises' },
];

const clientLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-workouts', icon: Dumbbell, label: 'Workouts' },
  { to: '/log', icon: ClipboardList, label: 'Log' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/exercises', icon: BookOpen, label: 'Exercises' },
];

// Bottom nav: pick key links (max 5) — always include Messages
const trainerBottomLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/plans', icon: ClipboardList, label: 'Plans' },
];

const clientBottomLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-workouts', icon: Dumbbell, label: 'Workouts' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
];

export default function Navigation() {
  const { currentUser, logout, getUnreadCount } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const links = currentUser?.role === 'trainer' ? trainerLinks : clientLinks;
  const bottomLinks = currentUser?.role === 'trainer' ? trainerBottomLinks : clientBottomLinks;
  const unreadCount = getUnreadCount(currentUser?.id);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

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
            <button className="btn-icon" onClick={handleLogout}>
              <LogOut size={20} />
            </button>
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
          {bottomLinks.map(link => (
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
        </div>
      </nav>
    </>
  );
}
