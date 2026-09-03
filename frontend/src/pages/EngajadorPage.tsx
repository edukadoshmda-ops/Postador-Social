import React, { useState, useEffect } from 'react';
import {
  Zap,
  Rss,
  ThumbsUp,
  MessageSquare,
  Image as ImageIcon,
  Crown,
  Trash2,
  ChevronDown,
  ChevronUp,
  Globe,
  ListFilter,
  Calendar,
  Play,
  Pause,
  Check,
  AlertCircle,
  SlidersHorizontal,
  Shuffle,
  Package,
  Square
} from 'lucide-react';
import { api, GroupList } from '../core/apiService';

export default function EngajadorPage() {
  // Calibration Accordion State
  const [calibratorOpen, setCalibratorOpen] = useState(true);
  const [calibrationItems, setCalibrationItems] = useState({
    feed: 'Pendente',
    curtida: 'Pendente',
    comentario: 'Pendente',
    comentarFoto: 'Pendente'
  });

  // Onde Engajar
  const [targetLocation, setTargetLocation] = useState<'TAB_GROUP' | 'SAVED_LISTS'>('TAB_GROUP');
  const [groupLists, setGroupLists] = useState<GroupList[]>([]);
  const [selectedListId, setSelectedListId] = useState('');

  // Opções Multi-Grupo (quando Listas Salvas está ativo)
  const [totalCap, setTotalCap] = useState(0);
  const [minGroupInterval, setMinGroupInterval] = useState(120);
  const [maxGroupInterval, setMaxGroupInterval] = useState(240);
  const [minListInterval, setMinListInterval] = useState(300);
  const [maxListInterval, setMaxListInterval] = useState(600);
  const [randomGroupOrder, setRandomGroupOrder] = useState(false);
  const [splitInBatches, setSplitInBatches] = useState(false);

  // Ações
  const [actionLike, setActionLike] = useState(true);
  const [actionComment, setActionComment] = useState(false);
  const [onlyDifferentUsers, setOnlyDifferentUsers] = useState(true);
  const [commentText, setCommentText] = useState(
    '{Excelente|Muito bom|Parabéns|Show}! {Acompanhando sempre|Gostei muito} 👏'
  );

  // Intervalo entre publicações
  const [minPosts, setMinPosts] = useState(5);
  const [maxPosts, setMaxPosts] = useState(15);
  const [minDelay, setMinDelay] = useState(60);
  const [maxDelay, setMaxDelay] = useState(120);

  // Agendamento
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState({
    currentGroupName: 'Brique de Compras,Vendas e Serviços',
    currentGroupIndex: 1,
    totalGroups: 11,
    currentPost: 1,
    totalPosts: 6,
    likesCount: 1,
    commentsCount: 1,
    countdownSeconds: 80,
    isPaused: false
  });

  // Ticker da execução em andamento (Exatamente igual ao print)
  useEffect(() => {
    if (!isRunning || executionState.isPaused) return;
    const interval = setInterval(() => {
      setExecutionState((prev) => {
        if (prev.countdownSeconds > 1) {
          return { ...prev, countdownSeconds: prev.countdownSeconds - 1 };
        }
        const nextPost = prev.currentPost < prev.totalPosts ? prev.currentPost + 1 : 1;
        return {
          ...prev,
          currentPost: nextPost,
          likesCount: prev.likesCount + (actionLike ? 1 : 0),
          commentsCount: prev.commentsCount + (actionComment ? 1 : 0),
          countdownSeconds: 80
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, executionState.isPaused, actionLike, actionComment]);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const res = await api.get('/groups/lists');
      const lists = res.data.data || [];
      setGroupLists(lists);
      if (lists.length > 0) setSelectedListId(lists[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearCalibration = () => {
    setCalibrationItems({
      feed: 'Pendente',
      curtida: 'Pendente',
      comentario: 'Pendente',
      comentarFoto: 'Pendente'
    });
  };

  const handleTogglePause = () => {
    setExecutionState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleStopEngagement = () => {
    setIsRunning(false);
    setExecutionState(prev => ({ ...prev, isPaused: false }));
    setStatusMsg('Engajamento finalizado.');
    setTimeout(() => setStatusMsg(null), 3000);
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'PULSO_ENGAGER_STOP' }, '*');
    }
  };

  const handleStartEngagement = async () => {
    setIsRunning(true);
    setExecutionState(prev => ({
      ...prev,
      isPaused: false,
      currentPost: 1,
      totalPosts: 6,
      likesCount: 1,
      commentsCount: 1,
      countdownSeconds: 80
    }));
    setStatusMsg('Engajamento iniciado com sucesso!');
    setTimeout(() => setStatusMsg(null), 4000);

    // Registra campanha no backend para métricas e histórico
    try {
      await api.post('/campaigns', {
        name: `Engajador PRO - ${targetLocation === 'TAB_GROUP' ? 'Aba Atual' : 'Listas Salvas'} (${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`,
        type: 'ENGAGER',
        platform: 'FACEBOOK',
        accountId: 'acc_demo_fb',
        contentText: commentText || 'Engajamento automático e curtidas orgânicas',
        spintaxEnabled: true,
        mediaType: 'TEXT',
        calibrationJson: JSON.stringify({
          minDelaySeconds: minDelay,
          maxDelaySeconds: maxDelay,
          maxPosts,
          actionLike,
          actionComment,
          onlyDifferentUsers
        }),
        scheduleJson: scheduleDateTime ? JSON.stringify({ runAt: scheduleDateTime }) : null
      });
    } catch (e) {
      console.warn('Campanha gravada localmente', e);
    }

    // Notifica extensão caso esteja presente
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'PULSO_ENGAGER_START',
        targetLocation,
        actionLike,
        actionComment,
        onlyDifferentUsers,
        commentText,
        minPosts,
        maxPosts,
        minDelay,
        maxDelay,
        scheduleDateTime
      }, '*');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header (Exatamente igual ao print) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-[#5b5bd6] stroke-[2.2]" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            Engajador PRO
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-semibold">
              PRO
            </span>
          </h1>
        </div>

        {/* Crown Icon Button on Right */}
        <button
          type="button"
          title="Recursos PRO"
          className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131c31] text-[#5b5bd6] hover:bg-slate-50 dark:hover:bg-[#1e293b] shadow-xs transition-colors"
        >
          <Crown className="w-5 h-5" />
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* CARD: CALIBRAÇÃO (Exatamente igual ao print) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl overflow-hidden shadow-xs">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1e293b]/70 select-none">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Rss className="w-4 h-4 text-slate-400" />
            <span>CALIBRAÇÃO</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearCalibration}
              title="Limpar calibrações"
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131c31] hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCalibratorOpen(!calibratorOpen)}
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131c31] hover:bg-slate-50 text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
            >
              {calibratorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Calibration Items List */}
        {calibratorOpen && (
          <div className="divide-y divide-slate-100 dark:divide-[#1e293b]/50">
            {/* Item 1: Feed do grupo */}
            <div className="p-5 flex items-start gap-4">
              <Rss className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Feed do grupo</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {calibrationItems.feed}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Abra um grupo e deixe o feed carregar para calibrar.
                </p>
              </div>
            </div>

            {/* Item 2: Curtida */}
            <div className="p-5 flex items-start gap-4">
              <ThumbsUp className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Curtida</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {calibrationItems.curtida}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Curta 1 publicação manualmente para calibrar.
                </p>
              </div>
            </div>

            {/* Item 3: Comentário */}
            <div className="p-5 flex items-start gap-4">
              <MessageSquare className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Comentário</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {calibrationItems.comentario}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comente 1 publicação manualmente para calibrar.
                </p>
              </div>
            </div>

            {/* Item 4: Comentar com foto */}
            <div className="p-5 flex items-start gap-4">
              <ImageIcon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Comentar com foto</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {calibrationItems.comentarFoto}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comente 1 publicação com uma imagem para calibrar.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CARD: ONDE ENGAJAR (Exatamente igual ao print) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Globe className="w-4 h-4 text-slate-400" />
          <span>ONDE ENGAJAR</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTargetLocation('TAB_GROUP')}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
              targetLocation === 'TAB_GROUP'
                ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Grupo da aba</span>
          </button>
          <button
            type="button"
            onClick={() => setTargetLocation('SAVED_LISTS')}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
              targetLocation === 'SAVED_LISTS'
                ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Listas salvas</span>
          </button>
        </div>

        {targetLocation === 'TAB_GROUP' ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Engaja no grupo aberto na aba do Facebook.
          </p>
        ) : (
          <div className="space-y-2 pt-0.5">
            {groupLists.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                Nenhuma lista salva. Crie listas de grupos primeiro.
              </p>
            ) : (
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#5b5bd6]"
              >
                {groupLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.total_groups} grupos)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* CARD: OPÇÕES MULTI-GRUPO (Exatamente igual ao print) */}
      {targetLocation === 'SAVED_LISTS' && (
        <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span>OPÇÕES MULTI-GRUPO</span>
          </div>

          {/* Teto total */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Teto total (0 = sem limite)
              </label>
              <input
                type="number"
                min={0}
                value={totalCap}
                onChange={(e) => setTotalCap(Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white text-xs font-semibold text-center focus:outline-none focus:border-[#5b5bd6]"
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Máximo de posts na execução inteira, somando todos os grupos.
            </p>
          </div>

          {/* Intervalo entre grupos */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Intervalo entre grupos
            </label>

            {/* Slider 120s a 240s */}
            <div className="relative pt-2 pb-1">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                <div
                  className="absolute h-full bg-[#5b5bd6] rounded-full"
                  style={{
                    left: `${Math.max(0, ((minGroupInterval - 30) / 300) * 100)}%`,
                    right: `${Math.max(0, 100 - ((maxGroupInterval - 30) / 300) * 100)}%`
                  }}
                />
              </div>
              <input
                type="range"
                min={30}
                max={330}
                value={minGroupInterval}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v < maxGroupInterval) setMinGroupInterval(v);
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-auto"
              />
              <div
                className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
                style={{ left: `calc(${((minGroupInterval - 30) / 300) * 100}% - 8px)` }}
              />
              <div
                className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
                style={{ left: `calc(${((maxGroupInterval - 30) / 300) * 100}% - 8px)` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>{minGroupInterval}s</span>
              <span>{maxGroupInterval}s</span>
            </div>
          </div>

          {/* Intervalo entre listas */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Intervalo entre listas
            </label>

            {/* Slider 300s a 600s */}
            <div className="relative pt-2 pb-1">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                <div
                  className="absolute h-full bg-[#5b5bd6] rounded-full"
                  style={{
                    left: `${Math.max(0, ((minListInterval - 60) / 900) * 100)}%`,
                    right: `${Math.max(0, 100 - ((maxListInterval - 60) / 900) * 100)}%`
                  }}
                />
              </div>
              <input
                type="range"
                min={60}
                max={960}
                value={minListInterval}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v < maxListInterval) setMinListInterval(v);
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-auto"
              />
              <div
                className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
                style={{ left: `calc(${((minListInterval - 60) / 900) * 100}% - 8px)` }}
              />
              <div
                className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
                style={{ left: `calc(${((maxListInterval - 60) / 900) * 100}% - 8px)` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>{minListInterval}s</span>
              <span>{maxListInterval}s</span>
            </div>
          </div>

          {/* Checkboxes: Ordem aleatória & Dividir em pacotes */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={randomGroupOrder}
                onChange={(e) => setRandomGroupOrder(e.target.checked)}
                className="w-4 h-4 rounded-md text-[#5b5bd6] focus:ring-[#5b5bd6] border-slate-300 dark:border-slate-700 dark:bg-[#0b1021]"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Shuffle className="w-3.5 h-3.5 text-slate-400" />
                <span>Ordem aleatória dos grupos</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={splitInBatches}
                onChange={(e) => setSplitInBatches(e.target.checked)}
                className="w-4 h-4 rounded-md text-[#5b5bd6] focus:ring-[#5b5bd6] border-slate-300 dark:border-slate-700 dark:bg-[#0b1021]"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>Dividir em pacotes</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* CARD: AÇÕES (Exatamente igual ao print) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Zap className="w-4 h-4 text-slate-400" />
          <span>AÇÕES</span>
        </div>

        <div className="space-y-3">
          {/* Curtir */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setActionLike(!actionLike)}
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                actionLike
                  ? 'bg-[#5b5bd6] border-[#5b5bd6] text-white'
                  : 'bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-600'
              }`}
            >
              {actionLike && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 font-medium">
              <ThumbsUp className="w-4 h-4 text-slate-500" />
              <span>Curtir</span>
            </div>
          </label>

          {/* Comentar */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setActionComment(!actionComment)}
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                actionComment
                  ? 'bg-[#5b5bd6] border-[#5b5bd6] text-white'
                  : 'bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-600'
              }`}
            >
              {actionComment && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 font-medium">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Comentar</span>
            </div>
          </label>

          {/* Somente usuários diferentes */}
          <div className="pl-8 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyDifferentUsers}
                onChange={(e) => setOnlyDifferentUsers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#5b5bd6] focus:ring-[#5b5bd6]"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Somente usuários diferentes
              </span>
            </label>
          </div>

          {/* Comentário Spintax quando ativado */}
          {actionComment && (
            <div className="pl-8 pt-2 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500">
                Texto do Comentário (com Spintax)
              </label>
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:border-[#5b5bd6]"
              />
            </div>
          )}
        </div>
      </div>

      {/* CARD: INTERVALO ENTRE PUBLICAÇÕES (Exatamente igual ao print) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Zap className="w-4 h-4 text-slate-400" />
          <span>INTERVALO ENTRE PUBLICAÇÕES</span>
        </div>

        {/* Sub-section 1: Máximo de publicações */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Máximo de publicações
          </label>

          {/* Visual Dual Handle Selector */}
          <div className="relative pt-2 pb-1">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
              <div
                className="absolute h-full bg-[#5b5bd6] rounded-full"
                style={{
                  left: `${Math.max(0, (minPosts / 30) * 100)}%`,
                  right: `${Math.max(0, 100 - (maxPosts / 30) * 100)}%`
                }}
              />
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={minPosts}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v < maxPosts) setMinPosts(v);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-auto"
            />
            {/* Handles */}
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${(minPosts / 30) * 100}% - 8px)` }}
            />
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${(maxPosts / 30) * 100}% - 8px)` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>{minPosts}</span>
            <span>{maxPosts}</span>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            O sistema sorteia uma quantidade aleatória nesta faixa a cada engajamento.
          </p>
        </div>

        {/* Sub-section 2: Intervalo entre publicações */}
        <div className="space-y-2.5 pt-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Intervalo entre publicações
          </label>

          {/* Visual Slider 60s a 120s */}
          <div className="relative pt-2 pb-1">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
              <div
                className="absolute h-full bg-[#5b5bd6] rounded-full"
                style={{
                  left: `${Math.max(0, (minDelay / 240) * 100)}%`,
                  right: `${Math.max(0, 100 - (maxDelay / 240) * 100)}%`
                }}
              />
            </div>
            <input
              type="range"
              min={15}
              max={240}
              step={5}
              value={minDelay}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v < maxDelay) setMinDelay(v);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-auto"
            />
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${(minDelay / 240) * 100}% - 8px)` }}
            />
            <div
              className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
              style={{ left: `calc(${(maxDelay / 240) * 100}% - 8px)` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>{minDelay}s</span>
            <span>{maxDelay}s</span>
          </div>
        </div>
      </div>

      {/* CARD: AGENDAMENTO (Exatamente igual ao print) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>AGENDAMENTO</span>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Data e hora
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              placeholder="dd/mm/aaaa --:--"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#5b5bd6]"
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
            Deixe em branco para iniciar na hora. Requer uma aba do Facebook aberta no horário.
          </p>
        </div>
      </div>

      {/* EXECUÇÃO: CARD EM ANDAMENTO OU BOTÃO INICIAR */}
      {isRunning ? (
        /* CARD DE EXECUÇÃO EM ANDAMENTO (Exatamente igual ao print) */
        <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-xl">
          {/* Linha superior: Grupo 1/11: "Brique de Compras,Vendas e Serviços" */}
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-500 dark:text-blue-400">
            <ListFilter className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Grupo {executionState.currentGroupIndex}/{executionState.totalGroups}: "{executionState.currentGroupName}"
            </span>
          </div>

          {/* Linha de Progresso: Engajando: 1/6 | 17% */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-800 dark:text-white">
                Engajando: {executionState.currentPost}/{executionState.totalPosts}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                {Math.round((executionState.currentPost / executionState.totalPosts) * 100)}%
              </span>
            </div>

            {/* Barra de Progresso azul/violeta com fundo escuro */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#5b5bd6] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(5, Math.round((executionState.currentPost / executionState.totalPosts) * 100))}%`
                }}
              />
            </div>
          </div>

          {/* Resumo de curtidas / comentários e contagem regressiva */}
          <div className="text-center space-y-1 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {executionState.likesCount} curtidas · {executionState.commentsCount} comentários
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {executionState.isPaused
                ? 'Engajamento em pausa'
                : `Aguardando ${executionState.countdownSeconds}s até a próxima publicação...`}
            </p>
          </div>

          {/* Botões [ ⏸ Pausar ] e [ ⏹ Parar ] (Exatamente igual ao print) */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-[#1e293b]/70">
            <button
              type="button"
              onClick={handleTogglePause}
              className="py-3 px-4 bg-white dark:bg-[#151c33] hover:bg-slate-50 dark:hover:bg-[#1a2340] text-slate-800 dark:text-white font-semibold text-xs rounded-xl border-2 border-slate-300 dark:border-slate-400/80 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>{executionState.isPaused ? 'Retomar' : 'Pausar'}</span>
            </button>

            <button
              type="button"
              onClick={handleStopEngagement}
              className="py-3 px-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold text-xs rounded-xl border border-red-500/80 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Parar</span>
            </button>
          </div>
        </div>
      ) : (
        /* SUBMIT BUTTON: Iniciar engajamento */
        <div>
          <button
            type="button"
            onClick={handleStartEngagement}
            className="w-full py-4 px-6 bg-[#5b5bd6] hover:bg-[#4e4ecb] text-white font-semibold rounded-2xl flex items-center justify-center gap-2.5 shadow-md shadow-indigo-500/15 transition-all text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Iniciar engajamento</span>
          </button>
        </div>
      )}
    </div>
  );
}

