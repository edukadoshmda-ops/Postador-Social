import React, { useState, useEffect } from 'react';
import {
  Flame,
  Globe,
  User,
  Users,
  AlertTriangle,
  Clock,
  Hash,
  Play,
  Pause,
  Lock,
  Check,
  Flag,
  Timer,
  Square
} from 'lucide-react';
import { api } from '../core/apiService';

type WarmerTab = 'BROWSER' | 'PROFILE' | 'GROUPS';

export default function WarmerPage() {
  const [activeTab, setActiveTab] = useState<WarmerTab>('BROWSER');

  // Sliders State for Browser Warmer
  const [minInterval, setMinInterval] = useState(1);
  const [maxInterval, setMaxInterval] = useState(60);
  const [minPages, setMinPages] = useState(105);
  const [maxPages, setMaxPages] = useState(152);

  // Execution State & Real-time Metrics (Conforme demonstrado no vídeo)
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [estimatedEndTime, setEstimatedEndTime] = useState<string>('—');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetPagesCount, setTargetPagesCount] = useState(142);
  const [currentPagesCount, setCurrentPagesCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentStatusText, setCurrentStatusText] = useState('Aguardando início...');

  const SAFE_SITES = [
    'g1.globo.com',
    'uol.com.br',
    'google.com.br',
    'wikipedia.org',
    'techcrunch.com',
    'cnnbrasil.com.br',
    'estadao.com.br',
    'tecmundo.com.br',
    'globoesporte.globo.com',
    'r7.com'
  ];

  // Timer de Duração Total
  useEffect(() => {
    if (!isRunning || isPaused) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, isPaused]);

  // Ciclo de Navegação e Aquecimento
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const randomDelayMs = (Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval) * 1000;
    const timeout = setTimeout(() => {
      setCurrentPagesCount((prev) => {
        const next = prev + 1;
        const site = SAFE_SITES[Math.floor(Math.random() * SAFE_SITES.length)];
        setCurrentStatusText(`Navegando em ${site} (página ${next}/${targetPagesCount})...`);
        setConfirmedCount((c) => c + 1);

        api.post('/warmer/trigger', {
          accountId: 'acc_demo_fb',
          actionTypes: ['FEED_SCROLL', 'SAFE_BROWSING']
        }).catch(() => {});

        if (next >= targetPagesCount) {
          setIsRunning(false);
          setCurrentStatusText('Aquecimento do navegador concluído com sucesso!');
        }
        return next;
      });
    }, Math.max(3000, randomDelayMs));

    return () => clearTimeout(timeout);
  }, [isRunning, isPaused, currentPagesCount, minInterval, maxInterval, targetPagesCount]);

  const handleStartWarmer = async () => {
    const target = Math.floor(Math.random() * (maxPages - minPages + 1)) + minPages;
    setTargetPagesCount(target);
    setCurrentPagesCount(0);
    setConfirmedCount(0);
    setFailedCount(0);
    setElapsedSeconds(0);
    setIsPaused(false);
    setIsRunning(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setStartTime(timeStr);

    const avgInterval = (minInterval + maxInterval) / 2;
    const totalEstimatedSecs = target * avgInterval;
    const end = new Date(now.getTime() + totalEstimatedSecs * 1000);
    setEstimatedEndTime(end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    setCurrentStatusText('Identificador detectado: perfil_fb · Aquecimento iniciado...');

    try {
      await api.post('/warmer/trigger', {
        accountId: 'acc_demo_fb',
        actionTypes: activeTab === 'BROWSER' 
          ? ['FEED_SCROLL', 'SAFE_BROWSING']
          : activeTab === 'PROFILE'
          ? ['FEED_SCROLL', 'LIKE', 'STORY_VIEW']
          : ['FEED_SCROLL', 'LIKE', 'COMMENT']
      });
    } catch (e) {
      console.warn('Warmer backend trigger fallback', e);
    }

    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'PULSO_BROWSER_WARMER_START',
        tab: activeTab,
        minInterval,
        maxInterval,
        minPages,
        maxPages
      }, '*');
    }
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
    setCurrentStatusText((prev) => (!isPaused ? 'Aquecedor em pausa.' : 'Aquecedor retomado.'));
  };

  const handleStopWarmer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStatusText('Aquecimento interrompido.');
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'PULSO_WARMER_STOP' }, '*');
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex items-center gap-2.5">
        <Flame className="w-5 h-5 text-[#5b5bd6] stroke-[2.2]" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Aquecedores
        </h1>
      </div>

      {/* 2. Top Tabs Bar */}
      <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#131c31] p-1 rounded-2xl border border-slate-200/80 dark:border-[#1e293b] select-none">
        <button
          type="button"
          onClick={() => setActiveTab('BROWSER')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'BROWSER'
              ? 'bg-white dark:bg-[#0f172a] text-[#5b5bd6] border border-[#5b5bd6] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Aquecedor de Navegador</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'PROFILE'
              ? 'bg-white dark:bg-[#0f172a] text-[#5b5bd6] border border-[#5b5bd6] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Aquecedor de Perfil</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GROUPS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'GROUPS'
              ? 'bg-white dark:bg-[#0f172a] text-[#5b5bd6] border border-[#5b5bd6] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Aquecedor de Grupos</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 3. Sub-Header */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-[#5b5bd6] stroke-[2.2]" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            {activeTab === 'BROWSER' && 'Aquecedor de Navegador'}
            {activeTab === 'PROFILE' && 'Aquecedor de Perfil'}
            {activeTab === 'GROUPS' && 'Aquecedor de Grupos'}
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-semibold">
            <Lock className="w-3 h-3" />
            <span>PRO</span>
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {activeTab === 'BROWSER' &&
            'Abre páginas automaticamente e navega em sites seguros para aquecer o seu navegador sem histórico de navegação.'}
          {activeTab === 'PROFILE' &&
            'Simula navegação humana no feed de notícias do Facebook, curtindo e visualizando histórias para aumentar o trust score do perfil.'}
          {activeTab === 'GROUPS' &&
            'Visita grupos periodicamente, rola feeds de grupos e visualiza discussões para evitar restrições de atividade rápida.'}
        </p>
      </div>

      {/* 4. CARD: Como funciona o Aquecedor de Navegador (Exatamente igual ao print) */}
      <div className="bg-[#fffbeb] dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-800 dark:text-white">
              Como funciona o Aquecedor de Navegador
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assista o vídeo antes de calibrar
            </p>
          </div>
        </div>

        {/* Video Player / Container Mockup */}
        <div className="w-full aspect-video max-h-72 bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center relative group">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#5b5bd6] text-white flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
            <p className="text-[11px] text-slate-400">Clique para reproduzir tutorial de aquecimento seguro</p>
          </div>
        </div>
      </div>

      {/* 5. CARD: Configuração de Execuções e Sliders (Exatamente igual ao print) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 space-y-6 shadow-xs">
        {/* Field 1: Intervalo entre execuções */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Intervalo entre execuções</span>
          </div>

          {/* Visual Slider 1s a 60s */}
          <div className="relative pt-2 pb-1">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
              <div
                className="absolute h-full bg-[#5b5bd6] rounded-full"
                style={{
                  left: `${Math.max(0, (minInterval / 60) * 100)}%`,
                  right: `${Math.max(0, 100 - (maxInterval / 60) * 100)}%`
                }}
              />
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={minInterval}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v < maxInterval) setMinInterval(v);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-auto"
            />
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${(minInterval / 60) * 100}% - 8px)` }}
            />
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${(maxInterval / 60) * 100}% - 8px)` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>{minInterval}s</span>
            <span>{maxInterval}s</span>
          </div>
        </div>

        {/* Field 2: Quantidade de páginas */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Hash className="w-4 h-4 text-slate-500" />
            <span>Quantidade de páginas</span>
          </div>

          {/* Visual Slider 105 a 152 */}
          <div className="relative pt-2 pb-1">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
              <div
                className="absolute h-full bg-[#5b5bd6] rounded-full"
                style={{
                  left: `${Math.max(0, ((minPages - 20) / 200) * 100)}%`,
                  right: `${Math.max(0, 100 - ((maxPages - 20) / 200) * 100)}%`
                }}
              />
            </div>
            <input
              type="range"
              min={20}
              max={220}
              value={minPages}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v < maxPages) setMinPages(v);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-auto"
            />
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${((minPages - 20) / 200) * 100}% - 8px)` }}
            />
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${((maxPages - 20) / 200) * 100}% - 8px)` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>{minPages}</span>
            <span>{maxPages}</span>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Quantidade aleatória dentro do intervalo estabelecido.
          </p>
        </div>

        {/* Action Buttons: Iniciar (quando parado) ou Pausar + Parar (quando executando, exatamente como no vídeo) */}
        {!isRunning ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartWarmer}
              className="px-6 py-2.5 bg-[#5b5bd6] hover:bg-[#4e4ecb] text-white font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all text-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Iniciar</span>
            </button>
          </div>
        ) : (
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePause}
              className="px-5 py-2.5 bg-slate-100 dark:bg-[#131c31] hover:bg-slate-200 dark:hover:bg-[#1a2340] text-slate-800 dark:text-white font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? 'Retomar' : 'Pausar'}</span>
            </button>

            <button
              type="button"
              onClick={handleStopWarmer}
              className="px-5 py-2.5 bg-slate-100 dark:bg-[#131c31] hover:bg-red-500/10 hover:border-red-500/30 text-slate-800 dark:text-white hover:text-red-400 font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Parar</span>
            </button>
          </div>
        )}

        {/* CARD EXECUTANDO (Exatamente como demonstrado no vídeo e nos prints) */}
        {isRunning && (
          <div className="mt-4 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-5 space-y-4 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
                <span className="text-slate-800 dark:text-white font-semibold text-xs">
                  {isPaused ? 'Em Pausa' : 'Executando'}
                </span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-xs font-semibold">
                {currentPagesCount}/{targetPagesCount}
              </span>
            </div>

            {/* Grid de Métricas: Início, Fim, Duração total */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-[#0b1021] border border-slate-100 dark:border-slate-800/80 rounded-xl text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Início</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1 font-mono">
                  {startTime || '12:07:47'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Flag className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fim</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1 font-mono">
                  {estimatedEndTime || '—'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Duração total</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1 font-mono">
                  {formatDuration(elapsedSeconds)}
                </p>
              </div>
            </div>

            {/* Barra de Status e Falhas */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="truncate text-[11px]">{currentStatusText}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-medium text-[11px]">
                <span className="text-emerald-500 dark:text-emerald-400 font-mono">
                  {confirmedCount} Confirmado(s)
                </span>
                <span className="text-slate-400 font-mono">
                  {failedCount} Falhas
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
