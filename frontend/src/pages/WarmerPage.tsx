import React, { useState, useEffect } from 'react';
import {
  Flame,
  User,
  Users,
  Search,
  SlidersHorizontal,
  Eraser,
  Play,
  Square,
  HelpCircle,
  Package,
  Sparkles,
  Award,
  Heart,
  Crosshair,
  Shield,
  AlertCircle,
  Shuffle,
  ExternalLink,
  CheckCircle2,
  Clock,
  ListOrdered,
  X,
  Globe,
  Compass,
  Eye,
  ThumbsUp,
  Tv,
  ArrowDown,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  History
} from 'lucide-react';
import clsx from 'clsx';
import { api, GroupList, WarmerManager } from '../core/apiService';

type WarmerTab = 'PROFILE' | 'GROUPS' | 'BROWSER';

export default function WarmerPage() {
  const [activeTab, setActiveTab] = useState<WarmerTab>('PROFILE');

  // Groups and lists from DB
  const [groupLists, setGroupLists] = useState<GroupList[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<any[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'GROUPS' | 'LIST'>('GROUPS');

  // ==========================================
  // 1. IMAGE 1: AQUECEDOR DE PERFIL STATE
  // ==========================================
  const [profileMinInterval, setProfileMinInterval] = useState(30);
  const [profileMaxInterval, setProfileMaxInterval] = useState(90);
  const [profileMinTarget, setProfileMinTarget] = useState(5);
  const [profileMaxTarget, setProfileMaxTarget] = useState(20);

  // Checkboxes "Para quem enviar"
  const [sendInCommon, setSendInCommon] = useState(true);
  const [sendMembers, setSendMembers] = useState(true);
  const [sendExperts, setSendExperts] = useState(false);
  const [sendCollaborators, setSendCollaborators] = useState(false);
  const [sendNearby, setSendNearby] = useState(false);
  const [sendAdmins, setSendAdmins] = useState(false);

  // Bottom options
  const [stopIfExcess, setStopIfExcess] = useState(true);
  const [distributeBetweenGroups, setDistributeBetweenGroups] = useState(true);
  const [sendInBatches, setSendInBatches] = useState(false);

  // Profile execution state
  const [isProfileRunning, setIsProfileRunning] = useState(false);
  const [profileElapsed, setProfileElapsed] = useState(0);
  const [profileSentCount, setProfileSentCount] = useState(0);
  const [profileTargetConnections, setProfileTargetConnections] = useState(12);

  // ==========================================
  // 2. IMAGE 2 & 3: AQUECEDOR DE GRUPOS STATE
  // ==========================================
  // 2. AQUECEDOR DE GRUPOS STATE (Imagens 2 e 3)
  // ==========================================
  const initialWarmer = WarmerManager.getState();
  const [searchQuery, setSearchQuery] = useState('');
  const [desiredQty, setDesiredQty] = useState(100);
  const [groupMinInterval, setGroupMinInterval] = useState(initialWarmer.groupMinInterval || 30);
  const [groupMaxInterval, setGroupMaxInterval] = useState(initialWarmer.groupMaxInterval || 90);
  const [answerQuestions, setAnswerQuestions] = useState(true);
  const [showQuestionTooltip, setShowQuestionTooltip] = useState(false);
  const [groupExecutionBatch, setGroupExecutionBatch] = useState(false);

  // Public search groups state (Imagem 2)
  const [publicGroups, setPublicGroups] = useState<any[]>(
    initialWarmer.publicGroups && initialWarmer.publicGroups.length > 0
      ? initialWarmer.publicGroups
      : [
          {
            id: 'fb_grp_mae_1',
            name: 'Grupo de dúvidas e ajuda as mães e futuras mamães',
            url: 'https://www.facebook.com/groups/search/groups/?q=dúvidas+ajuda+mães',
            memberCount: 21000,
            memberCountLabel: '21 mil membros',
            postsPerDay: 95,
            postsPerDayLabel: '90+ posts por dia',
            privacy: 'PUBLIC',
            avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80',
            isMember: false,
            isSafe: true,
          },
          {
            id: 'fb_grp_mae_2',
            name: 'Renda Extra para Mães',
            url: 'https://www.facebook.com/groups/search/groups/?q=renda+extra+para+mães',
            memberCount: 550,
            memberCountLabel: '550 membros',
            postsPerDay: 7,
            postsPerDayLabel: '7 posts por dia',
            privacy: 'PUBLIC',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
            isMember: false,
            isSafe: true,
          },
          {
            id: 'fb_grp_mae_3',
            name: 'Mães Empreendedoras & Negócios',
            url: 'https://www.facebook.com/groups/search/groups/?q=mães+empreendedoras+negócios',
            memberCount: 43200,
            memberCountLabel: '43 mil membros',
            postsPerDay: 120,
            postsPerDayLabel: '100+ posts por dia',
            privacy: 'PUBLIC',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            isMember: false,
            isSafe: true,
          }
        ]
  );
  const [selectedPublicGroupIds, setSelectedPublicGroupIds] = useState<string[]>(
    initialWarmer.selectedPublicGroupIds && initialWarmer.selectedPublicGroupIds.length > 0
      ? initialWarmer.selectedPublicGroupIds
      : ['fb_grp_mae_1', 'fb_grp_mae_2', 'fb_grp_mae_3']
  );
  const [isSearchingPublic, setIsSearchingPublic] = useState(false);
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [memberFilterIndex, setMemberFilterIndex] = useState<number>(0); // 0: Todos, 1: >5k, 2: >20k
  const [postFilterIndex, setPostFilterIndex] = useState<number>(0); // 0: Todos, 1: >10/dia, 2: >50/dia
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Image 3 top filters
  const [executeInListOrder, setExecuteInListOrder] = useState(true);
  const [onlyAlreadyMember, setOnlyAlreadyMember] = useState(initialWarmer.onlyAlreadyMember || false);

  // Image 3 execution dashboard state (synced with background WarmerManager)
  const [isGroupsRunning, setIsGroupsRunning] = useState(initialWarmer.isGroupsRunning);
  const [groupsElapsed, setGroupsElapsed] = useState(initialWarmer.groupsElapsed);
  const [countEntered, setCountEntered] = useState(initialWarmer.countEntered);
  const [countAlreadyMember, setCountAlreadyMember] = useState(initialWarmer.countAlreadyMember);
  const [countWaiting, setCountWaiting] = useState(initialWarmer.countWaiting);
  const [countFailed, setCountFailed] = useState(initialWarmer.countFailed);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(initialWarmer.currentProgressIndex);
  const [totalGroupsCount, setTotalGroupsCount] = useState(initialWarmer.totalGroupsCount || 102);

  const [executionLogs, setExecutionLogs] = useState<any[]>(
    initialWarmer.executionLogs && initialWarmer.executionLogs.length > 0
      ? initialWarmer.executionLogs
      : [
          { id: 'log_1', name: 'GRUPO DE MAMÃES', status: 'Entrou', url: 'https://www.facebook.com/groups/search/groups/?q=mamas' },
          { id: 'log_2', name: 'Classificados e Negócios Brasil', status: 'Já membro', url: 'https://www.facebook.com/groups/search/groups/?q=classificados+negocios+brasil' }
        ]
  );

  // ==========================================
  // 3. AQUECEDOR DE NAVEGADOR STATE
  // ==========================================
  const [browserDuration, setBrowserDuration] = useState(25); // minutos
  const [browserMinInterval, setBrowserMinInterval] = useState(15);
  const [browserMaxInterval, setBrowserMaxInterval] = useState(45);
  const [browserScrollFeed, setBrowserScrollFeed] = useState(true);
  const [browserWatchReels, setBrowserWatchReels] = useState(true);
  const [browserLikePosts, setBrowserLikePosts] = useState(true);
  const [browserAntiDetection, setBrowserAntiDetection] = useState(true);
  const [browserRunning, setBrowserRunning] = useState(false);
  const [browserElapsed, setBrowserElapsed] = useState(252); // 4m 12s demo
  const [browserStats, setBrowserStats] = useState({
    scrolls: 34,
    reels: 6,
    likes: 12,
    pages: 4
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    loadListsAndGroups();
  }, []);

  const loadListsAndGroups = async () => {
    try {
      const resLists = await api.get('/groups/lists');
      const lists = resLists.data.data || [];
      setGroupLists(lists);

      if (lists.length > 0) {
        const resGroups = await api.get(`/groups/lists/${lists[0].id}`);
        const grps = resGroups.data.data?.groups || [];
        setAvailableGroups(grps);
        if (grps.length > 0) {
          setSelectedGroups(grps.slice(0, 10));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isProfileRunning) return;
    const timer = setInterval(() => {
      setProfileElapsed((p) => p + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isProfileRunning]);

  useEffect(() => {
    if (!browserRunning) return;
    const timer = setInterval(() => {
      setBrowserElapsed((p) => p + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [browserRunning]);

  // 1. Subscribe to WarmerManager to sync with background Web Worker & localStorage
  useEffect(() => {
    const unsub = WarmerManager.subscribe((st) => {
      setIsGroupsRunning(st.isGroupsRunning);
      setGroupsElapsed(st.groupsElapsed);
      setCountEntered(st.countEntered);
      setCountAlreadyMember(st.countAlreadyMember);
      setCountWaiting(st.countWaiting);
      setCountFailed(st.countFailed);
      setCurrentProgressIndex(st.currentProgressIndex);
      setTotalGroupsCount(st.totalGroupsCount);
      setExecutionLogs(st.executionLogs);
      if (st.publicGroups && st.publicGroups.length > 0) {
        setPublicGroups(st.publicGroups);
      }
      if (st.selectedPublicGroupIds && st.selectedPublicGroupIds.length > 0) {
        setSelectedPublicGroupIds(st.selectedPublicGroupIds);
      }
    });
    return unsub;
  }, []);

  // 2. Synchronize config changes to WarmerManager
  useEffect(() => {
    WarmerManager.updateState({
      groupMinInterval,
      groupMaxInterval,
      onlyAlreadyMember,
      selectedPublicGroupIds,
      publicGroups,
      totalGroupsCount: publicGroups.length || totalGroupsCount
    });
  }, [groupMinInterval, groupMaxInterval, onlyAlreadyMember, selectedPublicGroupIds, publicGroups, totalGroupsCount]);

  // Public search handlers (Imagem 2)
  const handleSearchPublicGroups = async () => {
    const q = searchQuery.trim() || 'Mães';
    setIsSearchingPublic(true);
    showToast(`Buscando grupos para "${q}" em todo o Facebook...`);
    try {
      const res = await api.get(`/groups/search-public?q=${encodeURIComponent(q)}&quantity=${desiredQty}`);
      const groups = res.data.data?.groups || [];
      if (groups.length > 0) {
        setPublicGroups(groups);
        setSelectedPublicGroupIds(groups.map((g: any) => g.id));
        setTotalGroupsCount(groups.length);
        showToast(`${groups.length} grupos encontrados e prontos para entrar!`);
      }
    } catch (err) {
      console.warn('Erro buscando grupos:', err);
    } finally {
      setIsSearchingPublic(false);
    }
  };

  const toggleSelectAllPublicGroups = () => {
    if (selectedPublicGroupIds.length === publicGroups.length) {
      setSelectedPublicGroupIds([]);
      showToast('Nenhum grupo selecionado');
    } else {
      setSelectedPublicGroupIds(publicGroups.map((g) => g.id));
      showToast(`Todos os ${publicGroups.length} grupos selecionados`);
    }
  };

  const clearPublicGroupSelection = () => {
    setSelectedPublicGroupIds([]);
    showToast('Seleção de grupos desmarcada');
  };

  const togglePublicGroup = (id: string) => {
    if (selectedPublicGroupIds.includes(id)) {
      setSelectedPublicGroupIds(selectedPublicGroupIds.filter((gid) => gid !== id));
    } else {
      setSelectedPublicGroupIds([...selectedPublicGroupIds, id]);
    }
  };

  const displayedPublicGroups = publicGroups
    .filter((g) => {
      if (memberFilterIndex === 1 && g.memberCount < 5000) return false;
      if (memberFilterIndex === 2 && g.memberCount < 20000) return false;
      if (postFilterIndex === 1 && g.postsPerDay < 10) return false;
      if (postFilterIndex === 2 && g.postsPerDay < 50) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'DESC') return b.memberCount - a.memberCount;
      return a.memberCount - b.memberCount;
    });

  const handleToggleProfileWarmer = () => {
    if (isProfileRunning) {
      setIsProfileRunning(false);
      showToast('Aquecimento de perfil interrompido.');
    } else {
      setIsProfileRunning(true);
      setProfileElapsed(0);
      setProfileSentCount(0);
      const target = Math.floor(Math.random() * (profileMaxTarget - profileMinTarget + 1)) + profileMinTarget;
      setProfileTargetConnections(target);
      showToast(`Aquecedor de perfil iniciado! Meta: ${target} conexões.`);
    }
  };

  const handleToggleGroupsWarmer = () => {
    if (isGroupsRunning) {
      WarmerManager.stopGroups();
      showToast('Aquecedor de grupos pausado.');
    } else {
      WarmerManager.startGroups({
        groupMinInterval,
        groupMaxInterval,
        onlyAlreadyMember,
        selectedPublicGroupIds,
        publicGroups
      });
      showToast('Aquecedor de grupos iniciado em segundo plano!');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Deseja limpar todo o histórico de grupos processados?')) return;
    try {
      await api.post('/warmer/clear-history');
    } catch (e) {
      // ignore
    }
    WarmerManager.clearHistory();
    showToast('Histórico limpo com sucesso!');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getSafeGroupUrl = (item: { url?: string; name?: string }) => {
    if (!item) return 'https://www.facebook.com/groups';
    if (item.url && item.url.startsWith('https://www.facebook.com/groups/search')) {
      return item.url;
    }
    if (item.url && /facebook\.com\/groups\/\d+/.test(item.url)) {
      return item.url;
    }
    return `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(item.name || 'grupos')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-3">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-[#0f172a] border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-2.5 pt-1">
        <Flame className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Aquecedores</h1>
      </div>

      {/* Container com as 3 abas de aquecimento */}
      <div className="bg-slate-200/80 dark:bg-[#1e293b] p-1 rounded-xl border border-slate-300 dark:border-slate-700/50 select-none shadow-xs flex items-stretch gap-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('BROWSER')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'BROWSER'
              ? 'bg-[#5054d4] text-white shadow-md border-l-2 border-indigo-300'
              : 'text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
          )}
        >
          <Globe className="w-3.5 h-3.5 opacity-90" />
          <span>Aquecedor de Navegador</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'PROFILE'
              ? 'bg-[#5054d4] text-white shadow-md border-l-2 border-indigo-300'
              : 'text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
          )}
        >
          <User className="w-3.5 h-3.5 opacity-90" />
          <span>Aquecedor de Perfil</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GROUPS')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'GROUPS'
              ? 'bg-[#5054d4] text-white shadow-md border-l-2 border-indigo-300'
              : 'text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
          )}
        >
          <Users className="w-3.5 h-3.5 opacity-90" />
          <span>Aquecedor de Grupos</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. ABA AQUECEDOR DE PERFIL (EXATAMENTE IGUAL À IMAGEM 1)   */}
      {/* ========================================================= */}
      {activeTab === 'PROFILE' && (
        <div className="space-y-6">
          {/* Top Group Selection Card */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-4 md:p-5 space-y-3.5 shadow-xs dark:shadow-xl">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSelectorMode('GROUPS');
                  setShowGroupModal(true);
                }}
                className={clsx(
                  'py-2.5 px-4 rounded-xl text-xs font-bold transition-all border text-center',
                  selectorMode === 'GROUPS'
                    ? 'bg-indigo-50 dark:bg-[#1e2954]/50 border-indigo-400 dark:border-indigo-500/60 text-indigo-700 dark:text-indigo-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-[#1e293b] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                Selecionar grupos
              </button>

              <button
                onClick={() => {
                  setSelectorMode('LIST');
                  setShowGroupModal(true);
                }}
                className={clsx(
                  'py-2.5 px-4 rounded-xl text-xs font-bold transition-all border text-center',
                  selectorMode === 'LIST'
                    ? 'bg-indigo-50 dark:bg-[#1e2954]/50 border-indigo-400 dark:border-indigo-500/60 text-indigo-700 dark:text-indigo-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-[#1e293b] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                Usar lista salva
              </button>
            </div>

            <div className="pt-1 space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {selectedGroups.length === 0
                  ? 'Nenhum grupo. Abra o Facebook e sincronize seus grupos.'
                  : `${selectedGroups.length} grupo(s) selecionado(s) para aquecimento de perfil.`}
              </p>
              <p className="text-[11px] text-slate-500">{selectedGroups.length} grupo(s) selecionado(s)</p>
            </div>
          </div>

          {/* Section: CONTROLES (Imagem 1) */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 md:p-6 space-y-6 shadow-xs dark:shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CONTROLES</h3>

            {/* Sub-item 1: Ritmo do aquecimento */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-white">
                <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Ritmo do aquecimento</span>
              </div>

              {/* Range Slider */}
              <div className="py-2 space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={10}
                    max={180}
                    value={profileMinInterval}
                    onChange={(e) => setProfileMinInterval(Math.min(Number(e.target.value), profileMaxInterval - 5))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-[#172342] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <input
                    type="range"
                    min={10}
                    max={180}
                    value={profileMaxInterval}
                    onChange={(e) => setProfileMaxInterval(Math.max(Number(e.target.value), profileMinInterval + 5))}
                    className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-indigo-500 absolute top-0 left-0 pointer-events-auto"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>{profileMinInterval}s</span>
                  <span>{profileMaxInterval}s</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Intervalo entre conexões. Mais espaçado = mais seguro e natural.
              </p>
            </div>

            {/* Sub-item 2: Meta de conexões */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-white">
                <Crosshair className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Meta de conexões</span>
              </div>

              {/* Range Slider */}
              <div className="py-2 space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={profileMinTarget}
                    onChange={(e) => setProfileMinTarget(Math.min(Number(e.target.value), profileMaxTarget - 1))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-[#172342] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={profileMaxTarget}
                    onChange={(e) => setProfileMaxTarget(Math.max(Number(e.target.value), profileMinTarget + 1))}
                    className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-indigo-500 absolute top-0 left-0 pointer-events-auto"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>{profileMinTarget}</span>
                  <span>{profileMaxTarget}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Uma meta aleatória dentro do intervalo será aquecida neste ciclo.
              </p>
            </div>

            {/* Sub-item 3: Para quem enviar (Grid de 6 opções) */}
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Para quem enviar</span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* 1. Coisas em comum */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                  <input
                    type="checkbox"
                    checked={sendInCommon}
                    onChange={(e) => setSendInCommon(e.target.checked)}
                    className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span>Envia para pessoas com coisas em comum</span>
                  </div>
                </label>

                {/* 2. Membros */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                  <input
                    type="checkbox"
                    checked={sendMembers}
                    onChange={(e) => setSendMembers(e.target.checked)}
                    className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span>Envia para membros</span>
                  </div>
                </label>

                {/* 3. Experts do grupo */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                  <input
                    type="checkbox"
                    checked={sendExperts}
                    onChange={(e) => setSendExperts(e.target.checked)}
                    className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>Envia para experts do grupo</span>
                  </div>
                </label>

                {/* 4. Colaboradores do grupo */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                  <input
                    type="checkbox"
                    checked={sendCollaborators}
                    onChange={(e) => setSendCollaborators(e.target.checked)}
                    className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                    <span>Envia para colaboradores do grupo</span>
                  </div>
                </label>

                {/* 5. Membros perto de mim no grupo */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                  <input
                    type="checkbox"
                    checked={sendNearby}
                    onChange={(e) => setSendNearby(e.target.checked)}
                    className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <Crosshair className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 shrink-0" />
                    <span>Envia para membros perto de mim no grupo</span>
                  </div>
                </label>

                {/* 6. Administradores */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                  <input
                    type="checkbox"
                    checked={sendAdmins}
                    onChange={(e) => setSendAdmins(e.target.checked)}
                    className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <Shield className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                    <span>Envia para administradores</span>
                  </div>
                </label>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                Com mais de um critério marcado, a meta é dividida igualmente entre eles.
              </p>
            </div>

            {/* Sub-item 4: Regras de envio adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={stopIfExcess}
                  onChange={(e) => setStopIfExcess(e.target.checked)}
                  className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>Parar envio se total for maior que a disponibilidade</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={distributeBetweenGroups}
                  onChange={(e) => setDistributeBetweenGroups(e.target.checked)}
                  className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <Shuffle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span>Distribuir entre grupos</span>
                </div>
              </label>
            </div>

            {/* Sub-item 5: Enviar por pacotes */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-500/40 cursor-pointer select-none transition-all">
              <input
                type="checkbox"
                checked={sendInBatches}
                onChange={(e) => setSendInBatches(e.target.checked)}
                className="w-4 h-4 rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                <Package className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span>Enviar por pacotes</span>
              </div>
            </label>

            {/* Botão de Ação: Aquecer perfil */}
            <div className="pt-2">
              <button
                onClick={handleToggleProfileWarmer}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md',
                  isProfileRunning
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                    : 'bg-[#3742fa] hover:bg-[#2f3542] text-white shadow-indigo-600/20 active:scale-95'
                )}
              >
                {isProfileRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar aquecimento</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Aquecer perfil</span>
                  </>
                )}
              </button>
            </div>

            {/* Painel ativo caso em execução */}
            {isProfileRunning && (
              <div className="p-4 bg-indigo-50/70 dark:bg-[#111c38] border border-indigo-200 dark:border-indigo-500/30 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Aquecendo perfil organicamente...
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">Duração: {formatTimer(profileElapsed)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-[#0b1329] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (profileSentCount / profileTargetConnections) * 100 || 20)}%`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ABA AQUECEDOR DE GRUPOS (EXATAMENTE IGUAL ÀS IMAGENS 2 E 3) */}
      {/* ========================================================= */}
      {activeTab === 'GROUPS' && (
        <div className="space-y-6">
          {/* Top Banner de Calibração (Imagem 2) */}
          <div className="bg-emerald-50 dark:bg-[#0b1f1a] border border-emerald-300 dark:border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm dark:shadow-lg">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Tudo calibrado. Pronto para aquecer.</span>
          </div>

          {/* Card 1: BUSCAR GRUPOS (Imagem 2) */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 md:p-6 space-y-4 shadow-sm dark:shadow-xl">
            {/* Header com botões de histórico e fechar no canto direito */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">BUSCAR GRUPOS</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClearHistory();
                    showToast('Histórico de grupos processados exibido.');
                  }}
                  title="Histórico de grupos processados"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#182343] border border-slate-200 dark:border-[#1e293b] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    showToast('Busca limpa');
                  }}
                  title="Limpar busca"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#182343] border border-slate-200 dark:border-[#1e293b] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Input Search Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchPublicGroups(); }}
                  placeholder="Ex.: Jaraguá do Sul, marketing digital..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSearchPublicGroups}
                disabled={isSearchingPublic}
                className="px-5 py-2.5 bg-[#3742fa] hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearchingPublic ? 'Buscando...' : 'Buscar'}</span>
              </button>
            </div>

            {/* Quantidade Desejada */}
            <div className="flex items-center gap-3 pt-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Quantidade desejada</span>
              </div>
              <input
                type="number"
                min={1}
                max={500}
                value={desiredQty}
                onChange={(e) => setDesiredQty(Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Barra de Filtros e Ações (Imagem 2) */}
            <div className="flex items-center justify-between pt-2 pb-1 border-t border-slate-200/80 dark:border-[#182343]">
              {/* Esquerda: 3 botões de filtro em caixas quadradas e contagem */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = sortOrder === 'DESC' ? 'ASC' : 'DESC';
                    setSortOrder(next);
                    showToast(next === 'DESC' ? 'Ordenando por maior número de membros' : 'Ordenando por menor número de membros');
                  }}
                  title="Ordenar por tamanho do grupo"
                  className={clsx(
                    'w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer',
                    sortOrder === 'DESC'
                      ? 'bg-indigo-50 dark:bg-[#182343] border-indigo-300 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-[#0f172a] border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <ArrowDown className={clsx('w-3.5 h-3.5 transition-transform', sortOrder === 'ASC' && 'rotate-180')} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = (memberFilterIndex + 1) % 3;
                    setMemberFilterIndex(next);
                    const labels = ['Filtro de membros: Todos', 'Filtro: Mais de 5 mil membros', 'Filtro: Mais de 20 mil membros'];
                    showToast(labels[next]);
                  }}
                  title="Filtrar por quantidade de membros"
                  className={clsx(
                    'w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer',
                    memberFilterIndex > 0
                      ? 'bg-indigo-50 dark:bg-[#182343] border-indigo-300 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-[#0f172a] border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = (postFilterIndex + 1) % 3;
                    setPostFilterIndex(next);
                    const labels = ['Filtro de atividade: Todos', 'Filtro: Mais de 10 posts/dia', 'Filtro: Mais de 50 posts/dia'];
                    showToast(labels[next]);
                  }}
                  title="Filtrar por postagens por dia"
                  className={clsx(
                    'w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer',
                    postFilterIndex > 0
                      ? 'bg-indigo-50 dark:bg-[#182343] border-indigo-300 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-[#0f172a] border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
                  {selectedPublicGroupIds.length} selecionado(s)
                </span>
              </div>

              {/* Direita: Botões Selecionar todos e Limpar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAllPublicGroups}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  onClick={clearPublicGroupSelection}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Lista dos Grupos Encontrados (Imagem 2) */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 pt-1 divide-y divide-slate-100 dark:divide-slate-800/40">
              {displayedPublicGroups.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Nenhum grupo encontrado com os filtros selecionados.
                </div>
              ) : (
                displayedPublicGroups.map((group) => {
                  const isChecked = selectedPublicGroupIds.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group/item hover:bg-slate-50 dark:hover:bg-[#091022]/40 p-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePublicGroup(group.id)}
                          className="w-4 h-4 rounded bg-slate-50 dark:bg-[#0f172a] border-slate-300 dark:border-slate-700 text-[#3742fa] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                        />

                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
                          {group.avatar ? (
                            <img
                              src={group.avatar}
                              alt={group.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <Users className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-300 transition-colors">
                            {group.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {group.memberCountLabel || `${group.memberCount} membros`} · {group.postsPerDayLabel || `${group.postsPerDay} posts por dia`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {group.isSafe && (
                          <span title="Grupo público verificado para entrada segura">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                          </span>
                        )}
                        <a
                          href={getSafeGroupUrl(group)}
                          target="_blank"
                          rel="noreferrer"
                          title="Ver grupo no Facebook"
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: CONTROLES DE EXECUÇÃO (Imagem 2 e 3) */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 md:p-6 space-y-5 shadow-sm dark:shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CONTROLES DE EXECUÇÃO</h3>

            {/* Filtros da Imagem 3 no topo */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200/80 dark:border-[#182343]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={executeInListOrder}
                  onChange={(e) => setExecuteInListOrder(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-100 dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                  <ListOrdered className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Executar na ordem atual da lista
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAlreadyMember}
                  onChange={(e) => setOnlyAlreadyMember(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-100 dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Grupos que já sou membro
                </span>
              </label>

              <span className="text-slate-500 font-mono ml-auto text-[11px]">
                {totalGroupsCount} grupo(s) selecionado(s)
              </span>
            </div>

            {/* Ritmo (segundos entre ações) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Ritmo (segundos entre ações)</span>
              </div>

              {/* Range Slider */}
              <div className="py-2 space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={10}
                    max={180}
                    value={groupMinInterval}
                    onChange={(e) => setGroupMinInterval(Math.min(Number(e.target.value), groupMaxInterval - 5))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-[#172342] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <input
                    type="range"
                    min={10}
                    max={180}
                    value={groupMaxInterval}
                    onChange={(e) => setGroupMaxInterval(Math.max(Number(e.target.value), groupMinInterval + 5))}
                    className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-indigo-500 absolute top-0 left-0 pointer-events-auto"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>{groupMinInterval}s</span>
                  <span>{groupMaxInterval}s</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Intervalo aleatório entre cada entrada, para reduzir risco de bloqueio.
              </p>
            </div>

            {/* Checkbox: Responder perguntas de entrada com Tooltip (Imagem 3) */}
            <div className="relative">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-300 dark:hover:border-indigo-500/40 cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={answerQuestions}
                  onChange={(e) => setAnswerQuestions(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-100 dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                  <span
                    onMouseEnter={() => setShowQuestionTooltip(true)}
                    onMouseLeave={() => setShowQuestionTooltip(false)}
                    className="cursor-help p-0.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <span className="font-medium">Responder perguntas de entrada</span>
                </div>
              </label>

              {/* Tooltip Popup (Exatamente como aparece na Imagem 3) */}
              {showQuestionTooltip && (
                <div className="absolute left-10 -top-8 z-30 px-3 py-1.5 bg-slate-900 dark:bg-black/90 border border-slate-700 text-white text-[11px] rounded-lg shadow-xl max-w-sm pointer-events-none">
                  Quando o grupo exige perguntas de aprovação, responde cada campo com "ok" quando possível.
                </div>
              )}
            </div>

            {/* Checkbox: Execução por pacote */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e172e] border border-slate-200 dark:border-[#1b2746] hover:border-indigo-300 dark:hover:border-indigo-500/40 cursor-pointer select-none transition-all">
              <input
                type="checkbox"
                checked={groupExecutionBatch}
                onChange={(e) => setGroupExecutionBatch(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-100 dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Execução por pacote</span>
              </div>
            </label>

            {/* Botão: Iniciar / Parar */}
            <div className="pt-2">
              <button
                onClick={handleToggleGroupsWarmer}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md',
                  isGroupsRunning
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                    : 'bg-[#3742fa] hover:bg-indigo-600 text-white shadow-indigo-600/20 active:scale-95'
                )}
              >
                {isGroupsRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Iniciar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* Card 3: DASHBOARD & MONITORAMENTO EM TEMPO REAL (Imagem 3) */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lado Esquerdo: Status e Métricas (Imagem 3) */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
              {/* Header com Status e Ratio */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'w-2.5 h-2.5 rounded-full',
                      isGroupsRunning ? 'bg-cyan-500 animate-ping' : 'bg-slate-400 dark:bg-slate-500'
                    )}
                  ></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {isGroupsRunning ? 'Executando' : 'Parado'}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-bold">
                  {currentProgressIndex}/{totalGroupsCount}
                </span>
              </div>

              {/* Barra de Progresso ciano/teal (Imagem 3) */}
              <div className="w-full h-1.5 bg-slate-200 dark:bg-[#090f1f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (currentProgressIndex / totalGroupsCount) * 100 || 1)}%`
                  }}
                ></div>
              </div>

              {/* Duração total */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Duração total: {formatTimer(groupsElapsed)}</span>
              </div>

              {/* Grid 2x2 de métricas da Imagem 3 */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* 1. Entrou */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#091024] border border-slate-200/80 dark:border-[#1a2544] space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-base font-bold text-slate-900 dark:text-white">{countEntered}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Entrou</span>
                </div>

                {/* 2. Já membro */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#091024] border border-slate-200/80 dark:border-[#1a2544] space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-base font-bold text-slate-900 dark:text-white">{countAlreadyMember}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Já membro</span>
                </div>

                {/* 3. Aguardando */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#091024] border border-slate-200/80 dark:border-[#1a2544] space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span className="text-base font-bold text-slate-900 dark:text-white">{countWaiting}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Aguardando</span>
                </div>

                {/* 4. Falhou */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#091024] border border-slate-200/80 dark:border-[#1a2544] space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    <span className="text-base font-bold text-slate-900 dark:text-white">{countFailed}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Falhou</span>
                </div>
              </div>
            </div>

            {/* Lado Direito: Resultado da execução (Imagem 3) */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl flex flex-col">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Resultado da execução</h3>
              </div>

              {/* Lista de logs de entrada */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                {executionLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-8">
                    <p className="text-xs text-slate-500">Nenhum resultado registrado ainda.</p>
                  </div>
                ) : (
                  executionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#091024] border border-slate-200/80 dark:border-[#1a2544] flex items-center justify-between gap-3 animate-in fade-in"
                    >
                      <div className="space-y-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate uppercase">{log.name}</h4>
                        <span
                          className={clsx(
                            'inline-block text-[11px] font-semibold',
                            log.status === 'Entrou'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : log.status === 'Já membro'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {log.status}
                        </span>
                      </div>

                      <a
                        href={getSafeGroupUrl(log)}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver busca do grupo no Facebook"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#131c31] transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ABA AQUECEDOR DE NAVEGADOR                             */}
      {/* ========================================================= */}
      {activeTab === 'BROWSER' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 shadow-sm dark:shadow-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aquecimento Natural de Navegador & Cookies</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Simula um usuário real navegando no Facebook e na web pelo navegador integrado. 
                Gera histórico autêntico, aquece cookies de sessão, eleva o Trust Score da conta e blinda o perfil contra restrições de atividade.
              </p>
            </div>
          </div>

          {/* Section: CONTROLES DE NAVEGAÇÃO */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 md:p-6 space-y-6 shadow-sm dark:shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CONTROLES DE NAVEGAÇÃO</h3>

            {/* Ritmo entre ações */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Ritmo da navegação (segundos entre ações)</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={30}
                    value={browserMinInterval}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val <= browserMaxInterval) setBrowserMinInterval(val);
                    }}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                  <input
                    type="range"
                    min={31}
                    max={60}
                    value={browserMaxInterval}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= browserMinInterval) setBrowserMaxInterval(val);
                    }}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-400 font-mono">
                  <span>{browserMinInterval}s</span>
                  <span>{browserMaxInterval}s</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Pausa aleatória entre cada clique, scroll e visualização de conteúdo para simular ritmo humano.
              </p>
            </div>

            {/* Duração da Sessão */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Duração máxima da sessão</span>
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{browserDuration} minutos</span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={browserDuration}
                onChange={(e) => setBrowserDuration(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>5 min</span>
                <span>30 min</span>
                <span>60 min</span>
              </div>
            </div>

            {/* Ações a simular */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ações humanas a executar</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={browserScrollFeed}
                    onChange={(e) => setBrowserScrollFeed(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-semibold block">Rolar feed de notícias</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Scroll com pausas em posts aleatórios</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={browserWatchReels}
                    onChange={(e) => setBrowserWatchReels(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-semibold block">Assistir Reels e vídeos</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Pausar 10 a 30s assistindo conteúdo</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={browserLikePosts}
                    onChange={(e) => setBrowserLikePosts(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-semibold block">Curtir publicações do feed</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Deixar reações aleatórias em posts</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={browserAntiDetection}
                    onChange={(e) => setBrowserAntiDetection(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-semibold block">Módulo Anti-Detecção</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Movimento natural do mouse e digitação humana</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Botão de Execução */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (browserRunning) {
                    setBrowserRunning(false);
                    showToast('Aquecimento de navegador pausado');
                  } else {
                    setBrowserRunning(true);
                    showToast('Aquecimento de navegador iniciado no perfil ativo!');
                  }
                }}
                className={clsx(
                  'w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer',
                  browserRunning
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/40'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-950/40'
                )}
              >
                {browserRunning ? (
                  <>
                    <Square className="w-4 h-4 fill-white" />
                    <span>Parar Aquecimento</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Aquecimento de Navegador</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monitoramento em tempo real */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between">
                <span className={clsx(
                  'px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5',
                  browserRunning ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}>
                  <span className={clsx('w-2 h-2 rounded-full', browserRunning ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-slate-400 dark:bg-slate-500')} />
                  {browserRunning ? 'Navegando no Facebook' : 'Parado'}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {Math.floor(browserElapsed / 60)}m {browserElapsed % 60}s
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Progresso da Sessão</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {Math.min(100, Math.round((browserElapsed / (browserDuration * 60)) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#0f172a] h-2 rounded-full overflow-hidden border border-slate-200 dark:border-[#1e293b]">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((browserElapsed / (browserDuration * 60)) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-slate-50 dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200/80 dark:border-[#1e293b]">
                  <p className="text-base font-bold text-slate-900 dark:text-white font-mono">{browserStats.scrolls + (browserRunning ? Math.floor(browserElapsed / 8) : 0)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Scrolls no feed</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200/80 dark:border-[#1e293b]">
                  <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">{browserStats.reels + (browserRunning ? Math.floor(browserElapsed / 30) : 0)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Reels assistidos</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200/80 dark:border-[#1e293b]">
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">{browserStats.likes + (browserRunning ? Math.floor(browserElapsed / 25) : 0)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Curtidas dadas</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200/80 dark:border-[#1e293b]">
                  <p className="text-base font-bold text-cyan-600 dark:text-cyan-400 font-mono">{browserStats.pages + (browserRunning ? Math.floor(browserElapsed / 60) : 0)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Páginas visitadas</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-white dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#182343] rounded-2xl p-5 space-y-3 shadow-sm dark:shadow-xl">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Log de Atividades do Navegador
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b]">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-800 dark:text-slate-200">Sessão inicializada no Facebook com cookies ativos</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">1m atrás</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b]">
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs text-slate-800 dark:text-slate-200">Visualizou post no feed e rolou 420px</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">45s atrás</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b]">
                  <div className="flex items-center gap-2.5">
                    <ThumbsUp className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="text-xs text-slate-800 dark:text-slate-200">Reação 'Curtir' deixada em publicação recomendada</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">20s atrás</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b]">
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                    <span className="text-xs text-slate-800 dark:text-slate-200">Reproduziu Reels por 18 segundos com pausa natural</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Agora</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Selecionar Grupos / Listas */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowGroupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectorMode === 'GROUPS' ? 'Selecionar Grupos' : 'Usar Lista Salva'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Escolha os grupos que serão alvo do aquecimento
              </p>
            </div>

            {selectorMode === 'GROUPS' ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableGroups.map((g) => {
                  const isChecked = selectedGroups.some((sg) => sg.id === g.id);
                  return (
                    <label
                      key={g.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] cursor-pointer hover:border-indigo-500/40"
                    >
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate pr-2">{g.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedGroups(selectedGroups.filter((sg) => sg.id !== g.id));
                          } else {
                            setSelectedGroups([...selectedGroups, g]);
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {groupLists.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      showToast(`Lista "${l.name}" carregada!`);
                      setShowGroupModal(false);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] hover:border-indigo-500/40 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{l.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{l.total_groups || 10} grupos</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#1e293b]">
              <button
                onClick={() => {
                  setSelectedGroups(availableGroups);
                  showToast('Todos os grupos selecionados!');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Selecionar todos
              </button>
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
              >
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
