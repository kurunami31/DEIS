import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, FileText, GraduationCap, BookOpen, Inbox,
  Users, LayoutGrid, BarChart3, UserCog, CalendarDays, Database, Activity,
  UserCircle, LogOut, Menu, X, Home, BadgeCheck, ChevronDown, UserRound, KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import ChatWidget from '../components/ChatWidget.jsx';
import { initials } from '../lib/utils.js';

const NAV_GROUPS = [
  {
    label: 'General',
    items: [
      { to: '/dashboard', label: 'Home', icon: Home },
      { to: '/calendar', label: 'Calendar of Activities', icon: CalendarDays },
    ],
  },
  {
    label: 'Student Services',
    roles: ['STUDENT'],
    items: [
      { to: '/enroll', label: 'Enrollment', icon: ClipboardList },
      { to: '/requests', label: 'My Requests', icon: FileText },
      { to: '/grades', label: 'Grades', icon: GraduationCap },
      { to: '/clearance', label: 'Clearance', icon: BadgeCheck },
    ],
  },
  {
    label: 'Teaching Load',
    roles: ['FACULTY'],
    items: [{ to: '/my-sections', label: 'My Sections', icon: BookOpen }],
  },
  {
    label: 'Registration',
    roles: ['REGISTRAR', 'ADMIN'],
    items: [
      { to: '/review', label: 'Enrollment Requests', icon: Inbox, roles: ['REGISTRAR'] },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/sections', label: 'Sections', icon: LayoutGrid },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Clearance',
    roles: ['REGISTRAR', 'ADMIN'],
    items: [{ to: '/clearance-review', label: 'Clearance Review', icon: BadgeCheck }],
  },
  {
    label: 'Administration',
    roles: ['ADMIN'],
    items: [
      { to: '/users', label: 'User Accounts', icon: UserCog },
      { to: '/terms', label: 'Academic Terms', icon: CalendarDays },
      { to: '/catalog', label: 'Catalog', icon: Database },
    ],
  },
  {
    label: 'System',
    roles: ['ADMIN', 'REGISTRAR'],
    items: [{ to: '/audit', label: 'Activity Log', icon: Activity }],
  },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const visibleGroups = NAV_GROUPS.filter((group) => !group.roles || group.roles.includes(user?.role));

  useEffect(() => {
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (
    <aside
      className={`flex h-full flex-col bg-primary-800 text-white transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className={`flex items-center gap-3 px-5 py-5 ${collapsed ? 'flex-col px-2' : ''}`}>
        <Logo size={42} className="rounded-full bg-white p-1" />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">DOrSU</p>
            <p className="text-[11px] text-primary-200">Enrollment Information System</p>
          </div>
        )}
        <button
          className="ml-auto text-primary-200 hover:text-white md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {visibleGroups.map((group) => (
          <div key={group.label} className={collapsed ? 'flex flex-col items-center' : ''}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-primary-300">{group.label}</p>
            )}
            {collapsed && <div className="mb-2 h-px w-8 bg-white/10" />}
            <div className="space-y-0.5">
              {group.items
                .filter((item) => !item.roles || item.roles.includes(user?.role))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      setMobileOpen(false);
                      setMenuOpen(false);
                    }}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        collapsed ? 'justify-center px-0' : ''
                      } ${
                        isActive ? 'bg-white/15 font-semibold text-white' : 'text-primary-100 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <item.icon size={17} className="shrink-0" />
                    {!collapsed && item.label}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-100 transition-colors hover:bg-red-500/20 hover:text-white">
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebar}</div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <aside className="flex h-full w-64 flex-col bg-primary-800 text-white">
              <div className="flex items-center gap-3 px-5 py-5">
                <Logo size={42} className="rounded-full bg-white p-1" />
                <div className="leading-tight">
                  <p className="text-sm font-bold tracking-wide">DOrSU</p>
                  <p className="text-[11px] text-primary-200">Enrollment Information System</p>
                </div>
                <button className="ml-auto text-primary-200" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
                {visibleGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-primary-300">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items
                        .filter((item) => !item.roles || item.roles.includes(user?.role))
                        .map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                isActive ? 'bg-white/15 font-semibold text-white' : 'text-primary-100 hover:bg-white/10 hover:text-white'
                              }`
                            }
                          >
                            <item.icon size={17} />
                            {item.label}
                          </NavLink>
                        ))}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="border-t border-white/10 p-3">
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-100 transition-colors hover:bg-red-500/20 hover:text-white">
                  <LogOut size={17} />
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
          <button
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={() => (window.innerWidth < 768 ? setMobileOpen(true) : setCollapsed((v) => !v))}
            aria-label={collapsed || mobileOpen ? 'Expand menu' : 'Collapse menu'}
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-primary-700">{pageTitle(location.pathname)}</h1>
            <p className="hidden text-xs text-slate-400 sm:block">Davao Oriental State University</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-slate-100"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-start to-accent-end text-xs font-bold text-white">
                  {initials(user?.fullName)}
                </span>
                <span className="hidden text-sm font-medium text-slate-700 sm:block">{user?.fullName}</span>
                <ChevronDown size={15} className={`hidden text-slate-400 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[15px] border border-slate-200 bg-white py-1.5 shadow-lg" role="menu">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-800">{user?.fullName}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <UserRound size={15} className="text-slate-400" />
                    View profile
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile?tab=edit');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <UserCircle size={15} className="text-slate-400" />
                    Edit profile
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile?tab=security');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <KeyRound size={15} className="text-slate-400" />
                    Security
                  </button>
                  <div className="my-1.5 border-t border-slate-100" />
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}

const TITLES = {
  '/dashboard': 'Dashboard',
  '/profile': 'My Profile',
  '/enroll': 'Enrollment',
  '/requests': 'My Enrollment Requests',
  '/grades': 'My Grades',
  '/clearance': 'Clearance',
  '/clearance-review': 'Clearance Review',
  '/calendar': 'Calendar of Activities',
  '/my-sections': 'My Sections',
  '/review': 'Enrollment Requests',
  '/students': 'Student Records',
  '/sections': 'Sections',
  '/analytics': 'Enrollment Analytics',
  '/users': 'User Accounts',
  '/terms': 'Academic Terms',
  '/catalog': 'Academic Catalog',
  '/audit': 'Activity Log',
};

function pageTitle(path) {
  const match = TITLES[path];
  if (match) return match;
  if (path.startsWith('/sections/') && path.endsWith('/grades')) return 'Grade Encoding';
  return 'DEIS';
}