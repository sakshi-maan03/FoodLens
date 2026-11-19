import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { GlossaryPage } from './pages/GlossaryPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { ScannerPage } from './pages/ScannerPage.jsx';

function AppRouter() {
  const { user, loading } = useAuth();
  const [path, setPath] = useState(() => window.location.pathname || '/');

  const navigate = useCallback((nextPath) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPath(nextPath);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (path.startsWith('/app') && !user) {
      navigate('/auth');
    } else if (path === '/auth' && user) {
      navigate('/app/scan');
    }
  }, [loading, path, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
          <span>Loading FoodLens...</span>
        </div>
      </div>
    );
  }

  if (path === '/auth') {
    return <AuthPage onNavigate={navigate} />;
  }

  if (path === '/app/scan') {
    return user ? <ScannerPage onNavigate={navigate} /> : <AuthPage onNavigate={navigate} />;
  }

  if (path === '/app/profile') {
    return user ? <ProfilePage onNavigate={navigate} /> : <AuthPage onNavigate={navigate} />;
  }

  if (path === '/app/history') {
    return user ? <HistoryPage onNavigate={navigate} /> : <AuthPage onNavigate={navigate} />;
  }

  if (path === '/app/glossary') {
    return user ? <GlossaryPage onNavigate={navigate} /> : <AuthPage onNavigate={navigate} />;
  }

  if (path === '/app/admin') {
    return user ? <AdminPage onNavigate={navigate} /> : <AuthPage onNavigate={navigate} />;
  }

  return <LandingPage onNavigate={navigate} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
