import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import BaseLayout from './core/BaseLayout';
import PostadorPage from './pages/PostadorPage';
import EngajadorPage from './pages/EngajadorPage';
import GroupListsPage from './pages/GroupListsPage';
import LibraryPage from './pages/LibraryPage';
import WarmerPage from './pages/WarmerPage';
import AccountsPage from './pages/AccountsPage';
import StatsPage from './pages/StatsPage';
import PlansPage from './pages/PlansPage';
import TutorialsPage from './pages/TutorialsPage';
import SupportPage from './pages/SupportPage';
import LoginPage from './pages/LoginPage';
import { api } from './core/apiService';

function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('pulso_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pulso_token'));
  const [checking, setChecking] = useState<boolean>(!!localStorage.getItem('pulso_token'));

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        const u = r.data.data;
        setUser(u);
        localStorage.setItem('pulso_user', JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem('pulso_token');
        localStorage.removeItem('pulso_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const id = api.interceptors.request.use((config: any) => {
      const t = localStorage.getItem('pulso_token');
      if (t) config.headers = { ...(config.headers || {}), Authorization: `Bearer ${t}` };
      return config;
    });
    return () => api.interceptors.request.eject(id);
  }, []);

  if (checking) {
    return <div className="min-h-screen w-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-sm">Verificando sessão...</div>;
  }

  if (!user || !token) {
    return <LoginPage onAuthed={(u, t) => { setUser(u); setToken(t); }} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthGate>
        <BaseLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/postador" replace />} />
            <Route path="/postador" element={<PostadorPage />} />
            <Route path="/engajador" element={<EngajadorPage />} />
            <Route path="/listas-grupos" element={<GroupListsPage />} />
            <Route path="/biblioteca" element={<LibraryPage />} />
            <Route path="/aquecedores" element={<WarmerPage />} />
            <Route path="/estatisticas" element={<StatsPage />} />
            <Route path="/configuracoes" element={<AccountsPage />} />
            <Route path="/planos" element={<PlansPage />} />
            <Route path="/tutoriais" element={<TutorialsPage />} />
            <Route path="/suporte" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="/postador" replace />} />
          </Routes>
        </BaseLayout>
      </AuthGate>
    </Router>
  );
}
