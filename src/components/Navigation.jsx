import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Users, Dumbbell, ClipboardList, Calendar,
  BookOpen, LogOut, TrendingUp, Search
} from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useState } from 'react';

const trainerLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/plans', icon: ClipboardList, label: 'Workout Plans' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/exercises', icon: BookOpen, label: 'Exercise Library' },
];

const clientLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-workouts', icon: Dumbbell, label: 'My Workouts' },
  { to: '/log', icon: ClipboardList, label: 'Workout Log' },
  { to: '/progress', icon: TrendingUp, label: 'My Progress' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/exercises', icon: BookOpen, label: 'Exercise Library' },
];

export default function Navigation() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const links = currentUser?.role === 'trainer' ? trainerLinks : clientLinks;
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
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">{currentUser?.name?.[0]}</div>
            <div>
              <div className="sidebar-user-name">{currentUser?.name}</div>
              <div className="sidebar-user-role">{currentUser?.role}</div>
            </div>
          </div>
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
            <button className="btn-icon" onClick={() => setMobileSearchOpen(!mobileSearchOpen)}>
              <Search size={20} />
            </button>
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
          {links.slice(0, 5).map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
              <link.icon size={20} strokeWidth={2} />
              {link.label.split(' ')[0]}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
