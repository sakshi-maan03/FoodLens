import { Menu, ScanBarcode, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function Navbar({ onNavigate, currentPath }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (e, target) => {
    e.preventDefault();
    setMobileOpen(false);
    if (target.startsWith('#')) {
      if (currentPath !== '/') {
        onNavigate('/');
        setTimeout(() => {
          document.getElementById(target.slice(1))?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        document.getElementById(target.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    onNavigate(target);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="/"
          onClick={(e) => handleLink(e, '/')}
          className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <ScanBarcode className="w-4 h-4" />
          </span>
          <span>FoodLens</span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a
            href="#workflow"
            onClick={(e) => handleLink(e, '#workflow')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
          <a
            href="#verdicts"
            onClick={(e) => handleLink(e, '#verdicts')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Verdicts
          </a>
          <a
            href="#glossary-preview"
            onClick={(e) => handleLink(e, '#glossary-preview')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Glossary
          </a>
          <a
            href="#architecture"
            onClick={(e) => handleLink(e, '#architecture')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Architecture
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate(user ? '/app/scan' : '/auth')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 cursor-pointer"
          >
            {user ? 'Open Workspace' : 'Get Started'}
          </button>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
          <a
            href="#workflow"
            onClick={(e) => handleLink(e, '#workflow')}
            className="block py-2 text-sm font-medium text-slate-700"
          >
            How It Works
          </a>
          <a
            href="#verdicts"
            onClick={(e) => handleLink(e, '#verdicts')}
            className="block py-2 text-sm font-medium text-slate-700"
          >
            Verdicts
          </a>
          <a
            href="#glossary-preview"
            onClick={(e) => handleLink(e, '#glossary-preview')}
            className="block py-2 text-sm font-medium text-slate-700"
          >
            Glossary
          </a>
          <a
            href="#architecture"
            onClick={(e) => handleLink(e, '#architecture')}
            className="block py-2 text-sm font-medium text-slate-700"
          >
            Architecture
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate(user ? '/app/scan' : '/auth');
            }}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-emerald-700 rounded-lg"
          >
            {user ? 'Open Workspace' : 'Get Started'}
          </button>
        </div>
      )}
    </header>
  );
}
