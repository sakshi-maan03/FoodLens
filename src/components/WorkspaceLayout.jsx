import {
  BookOpen,
  History,
  LogOut,
  Menu,
  ScanBarcode,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function WorkspaceLayout({
  currentPath,
  onNavigate,
  title,
  subtitle,
  children,
}) {
  const { user, profile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/app/scan', label: 'Product Scanner', icon: ScanBarcode },
    { path: '/app/profile', label: 'Dietary Profile', icon: UserCheck },
    { path: '/app/history', label: 'Scan History', icon: History },
    { path: '/app/glossary', label: 'Ingredient Glossary', icon: BookOpen },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/app/admin', label: 'Admin Console', icon: ShieldCheck });
  }

  const activeRuleCount =
    (profile?.allergies?.length || 0) +
    (profile?.preferences?.length || 0) +
    (profile?.restrictions?.length || 0) +
    (profile?.customAvoid?.length || 0) +
    (profile?.dietPlanEnabled ? 1 : 0);

  const handleNav = (path) => {
    setSidebarOpen(false);
    onNavigate(path);
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleNav('/')}
          className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap cursor-pointer"
        >
          <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <ScanBarcode className="w-4 h-4" />
          </span>
          <span>FoodLens</span>
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="px-2 space-y-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          <p className="text-xs text-slate-500 tabular-nums pt-0.5">
            {user?.role === 'admin' ? 'Administrator' : 'Member'} · {activeRuleCount} active dietary{' '}
            {activeRuleCount === 1 ? 'rule' : 'rules'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold text-slate-900 truncate">
                {title}
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentPath !== '/app/profile' && (
              <button
                type="button"
                onClick={() => onNavigate('/app/profile')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Edit Profile ({activeRuleCount})
              </button>
            )}
            {currentPath !== '/app/scan' && (
              <button
                type="button"
                onClick={() => onNavigate('/app/scan')}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                New Scan
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
