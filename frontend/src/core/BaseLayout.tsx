import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Send,
  Zap,
  ListChecks,
  ListFilter,
  Library,
  Flame,
  Crown,
  Settings,
  PlayCircle,
  Headphones,
  LogIn,
  Sun,
  Moon,
  Monitor,
  HelpCircle,
  Activity,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import clsx from 'clsx';

interface BaseLayoutProps {
  children: React.ReactNode;
}

export default function BaseLayout({ children }: BaseLayoutProps) {
  const location = useLocation();
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    try {
      return (localStorage.getItem('pulso_theme') as any) || 'light';
    } catch {
      return 'light';
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('pulso_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isDark = theme === 'dark';

  const navItems = [
    { to: '/postador', label: 'Postador PRO', icon: Send, badge: null },
    { to: '/engajador', label: 'Engajador PRO', icon: Zap, badge: null },
    { to: '/listas-grupos', label: 'Listas de grupos', icon: ListChecks, badge: null },
    { to: '/biblioteca', label: 'Biblioteca', icon: Library, badge: null },
    { to: '/aquecedores', label: 'Aquecedores', icon: Flame, badge: null },
    { to: '/estatisticas', label: 'Estatísticas', icon: BarChart3, badge: null },
    { to: '/planos', label: 'Planos', icon: Crown, badge: null },
    { to: '/configuracoes', label: 'Configurações', icon: Settings, badge: null },
    { to: '/tutoriais', label: 'Tutoriais em vídeo', icon: PlayCircle, badge: null },
    { to: '/suporte', label: 'Suporte técnico', icon: Headphones, badge: null },
  ];

  const PulsoLogo = () => (
    <div className="flex items-center gap-3 px-1 py-1 shrink-0">
      {/* Icon: Rounded box with audio waveform / equalizer lines and terminal dots */}
      <div className="w-10 h-10 rounded-xl bg-[#f0f9ff] border border-[#bae6fd] flex items-center justify-center p-2 shadow-sm shrink-0">
        <svg
          viewBox="0 0 36 36"
          className="w-full h-full text-[#0284c7]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="18" r="1.5" fill="currentColor" />
          <line x1="6.5" y1="18" x2="10.5" y2="18" />
          <line x1="11.5" y1="14" x2="11.5" y2="22" strokeWidth="2.2" />
          <line x1="14.5" y1="10" x2="14.5" y2="26" strokeWidth="2.3" />
          <line x1="17.5" y1="6" x2="17.5" y2="30" strokeWidth="2.4" />
          <line x1="20.5" y1="11" x2="20.5" y2="25" strokeWidth="2.3" />
          <line x1="23.5" y1="15" x2="23.5" y2="21" strokeWidth="2.2" />
          <line x1="24.5" y1="18" x2="28.5" y2="18" />
          <circle cx="30" cy="18" r="1.5" fill="currentColor" />
        </svg>
      </div>
      <div className="min-w-0">
        <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
          Pulso Social
        </h1>
        <p className="text-[12px] text-slate-400 dark:text-slate-400 font-medium truncate">Painel PRO</p>
      </div>
    </div>
  );

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="border-b border-slate-200/80 dark:border-[#1e293b]/60 pb-3.5 shrink-0 mb-3">
          <PulsoLogo />
        </div>

        <nav className="flex-1 overflow-y-auto pr-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to === '/postador' && location.pathname === '/');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={clsx(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group border',
                  isActive
                    ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] dark:bg-[#151c33] dark:text-[#818cf8] dark:border-slate-300/80 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-[#131c31] border-transparent'
                )}
              >
                <Icon
                  className={clsx(
                    'w-5 h-5 shrink-0 transition-transform group-hover:scale-105',
                    isActive ? 'text-[#5b5bd6] dark:text-[#818cf8]' : 'text-slate-500 dark:text-slate-400'
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-[#1e293b]/60 shrink-0 mt-1">
        {(() => {
          let u: any = null;
          try { u = JSON.parse(localStorage.getItem('pulso_user') || 'null'); } catch {}
          if (!u) {
            return (
              <NavLink
                to="/configuracoes"
                onClick={onNavigate}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 dark:bg-[#131c31] dark:hover:bg-[#1e293b] dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-[#1e293b] font-medium text-sm transition-all"
              >
                <LogIn className="w-4 h-4 text-slate-400" />
                <span>Contas / Entrar</span>
              </NavLink>
            );
          }
          return (
            <div className="w-full space-y-1.5">
              <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
              </div>
              <button
                onClick={async () => {
                  const t = localStorage.getItem('pulso_token');
                  try { if (t) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); } catch {}
                  localStorage.removeItem('pulso_token');
                  localStorage.removeItem('pulso_user');
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-500/20 font-medium text-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          );
        })()}

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span className="font-mono">v5.80.0</span>
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#131c31] p-0.5 rounded-lg border border-slate-200 dark:border-[#1e293b]">
            <button
              onClick={() => handleThemeChange('system')}
              title="Sistema"
              className={clsx('p-1.5 rounded transition-colors', theme === 'system' ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              title="Claro"
              className={clsx('p-1.5 rounded transition-colors', theme === 'light' ? 'bg-white text-[#5b5bd6] shadow-xs' : 'text-slate-400 hover:text-slate-600')}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              title="Escuro"
              className={clsx('p-1.5 rounded transition-colors', theme === 'dark' ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200')}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button title="Ajuda" className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] w-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-800 dark:text-slate-200 overflow-hidden font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 h-full bg-white dark:bg-[#0c1222] border-r border-slate-200/80 dark:border-[#1e293b]/70 flex-col justify-between p-3 select-none z-20 overflow-hidden shrink-0 shadow-xs">
        <SidebarContent />
      </aside>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white dark:bg-[#0c1222] border-r border-slate-200 dark:border-[#1e293b] flex flex-col p-3 overflow-hidden shadow-2xl">
            <div className="flex justify-end mb-1">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] text-slate-600 dark:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* MOBILE TOP BAR */}
        <header className="lg:hidden flex items-center gap-3 px-3.5 py-3 bg-white dark:bg-[#0c1222] border-b border-slate-200 dark:border-[#1e293b]/70 shrink-0 sticky top-0 z-30 shadow-xs">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-white"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <PulsoLogo />
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#090d16] p-3 sm:p-5 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
