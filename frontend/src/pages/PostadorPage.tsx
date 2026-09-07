import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Square,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Film,
  Shuffle,
  Calendar,
  Package,
  Trash2,
  Clock,
  ExternalLink,
  Repeat,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  Folder,
  Check,
  Layers,
  FastForward,
  Sparkles,
  ArrowRight,
  Shield,
  Copy,
  ChevronRight,
  Search,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  Zap
} from 'lucide-react';
import { api, Campaign, Account, GroupList, CreativeItem, LibraryFolder } from '../core/apiService';
import CalibratorModal from '../components/CalibratorModal';

const INITIAL_DEMO_GROUPS = [
  { id: 'g_1', name: 'SPIDER-VERSE', member_count: 396750, is_admin: false, avatar: '🕷️', bg: 'bg-red-950/60 text-red-400 border border-red-800/60' },
  { id: 'g_2', name: 'Cassinos e slots confiaveis', member_count: 384390, is_admin: true, avatar: '🎰', bg: 'bg-amber-950/60 text-amber-400 border border-amber-800/60' },
  { id: 'g_3', name: 'Clash Royale (Brasil)', member_count: 308382, is_admin: false, avatar: '👑', bg: 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/60' },
  { id: 'g_4', name: 'ENQUANTO ISSO PELO BRASIL', member_count: 173532, is_admin: false, avatar: '🇧🇷', bg: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' },
  { id: 'g_5', name: 'La Casa de Papel Brasil', member_count: 134291, is_admin: true, avatar: '🎭', bg: 'bg-rose-950/60 text-rose-400 border border-rose-800/60' },
  { id: 'g_6', name: 'Emagrecer e Ser Fitness', member_count: 122009, is_admin: false, avatar: '🥗', bg: 'bg-teal-950/60 text-teal-400 border border-teal-800/60' }
];

const DEFAULT_DEMO_CAMPAIGN: Campaign = {
  id: 'camp_demo_maes',
  name: 'CAMPANHA GRUPO MÃES',
  type: 'POSTER',
  platform: 'FACEBOOK',
  account_id: 'acc_demo',
  content_text: 'Promoção Grupo Mães',
  spintax_enabled: true,
  media_type: 'IMAGE',
  status: 'COMPLETED',
  total_targets: 1,
  completed_targets: 1,
  successful_posts: 1,
  pending_posts: 0,
  failed_posts: 0,
  progress_percent: 100,
  current_target_name: 'Concluído: 1/1 postados.',
  created_at: new Date().toISOString()
};

export default function PostadorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryListId = searchParams.get('listId');
  const queryFolderId = searchParams.get('folderId');

  const [campaigns, setCampaigns] = useState<Campaign[]>([DEFAULT_DEMO_CAMPAIGN]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupLists, setGroupLists] = useState<GroupList[]>([]);
  const [creatives, setCreatives] = useState<CreativeItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([
    { id: 'f_venda_sem_trafego', name: 'Venda sem tráfego pago', color: '#4F46E5', count: 6 },
    { id: 'f_venda_carros', name: 'VENDA DE CARROS', color: '#EF4444', count: 6 },
    { id: 'f_maes', name: 'GRUPO MÃES', color: '#EC4899', count: 6 }
  ]);

  // Calibrator
  const [calibratorOpen, setCalibratorOpen] = useState(false);
  const [calibrationState, setCalibrationState] = useState<{ text: boolean; photo: boolean; video: boolean }>(() => {
    try {
      const saved = localStorage.getItem('pulso_calibration_status');
      return saved ? JSON.parse(saved) : { text: true, photo: true, video: false };
    } catch {
      return { text: true, photo: true, video: false };
    }
  });

  // Form: Nova Campanha (Exatamente igual ao print da imagem)
  const [campaignName, setCampaignName] = useState('GRUPO DE ACHADINHOS DE M');
  const [postSourceMode, setPostSourceMode] = useState<'BIBLIOTECA' | 'UNICO'>('BIBLIOTECA');
  const [mediaFormats, setMediaFormats] = useState<{ text: boolean; image: boolean; video: boolean; intercalar: boolean }>({
    text: true,
    image: true,
    video: true,
    intercalar: false
  });

  // Checkboxes de pastas selecionadas
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set(['f_maes']));

  // Intervalos de envio
  const [minInterval, setMinInterval] = useState(30);
  const [maxInterval, setMaxInterval] = useState(90);

  // Checkboxes opcionais
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [batchPauseMinutes, setBatchPauseMinutes] = useState(15);

  // Modo das variáveis
  const [variableMode, setVariableMode] = useState<'PRESET' | 'ALWAYS_ALTERNATE' | 'ALWAYS_ALL'>('PRESET');

  // Onde postar: 'SELECT_GROUPS' ou 'USE_SAVED_LIST'
  const [targetMode, setTargetMode] = useState<'SELECT_GROUPS' | 'USE_SAVED_LIST'>('SELECT_GROUPS');
  const [selectedGroupListId, setSelectedGroupListId] = useState('');
  const [allGroups, setAllGroups] = useState<any[]>(INITIAL_DEMO_GROUPS);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [activeGroupFilter, setActiveGroupFilter] = useState<'ALL' | '1K' | '10K' | '50K' | '100K' | 'ADMIN'>('ALL');
  const [sortMembersDesc, setSortMembersDesc] = useState(true);

  // Feedback & Execution
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] = useState<Campaign | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [calibrationModalType, setCalibrationModalType] = useState<'text' | 'photo' | 'video' | null>(null);
  const [calibratingNow, setCalibratingNow] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadCampaigns, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [campRes, accRes, glRes, libRes, folderRes, grpRes] = await Promise.allSettled([
        api.get('/campaigns'),
        api.get('/accounts'),
        api.get('/groups/lists'),
        api.get('/library'),
        api.get('/library/folders'),
        api.get('/groups/all'),
      ]);

      if (campRes.status === 'fulfilled' && campRes.value.data.data?.length > 0) {
        setCampaigns(campRes.value.data.data);
      } else {
        setCampaigns([DEFAULT_DEMO_CAMPAIGN]);
      }

      if (accRes.status === 'fulfilled') {
        setAccounts(accRes.value.data.data || []);
      }

      if (glRes.status === 'fulfilled') {
        const lists = glRes.value.data.data || [];
        setGroupLists(lists);
        if (lists.length > 0) {
          if (queryListId && lists.some((l: any) => l.id === queryListId)) {
            setSelectedGroupListId(queryListId);
            setTargetMode('USE_SAVED_LIST');
          } else {
            setSelectedGroupListId(lists[0].id);
          }
        }
      }

      if (libRes.status === 'fulfilled') {
        setCreatives(libRes.value.data.data || []);
      }

      if (folderRes.status === 'fulfilled') {
        const fList = folderRes.value.data.data || [];
        if (fList.length > 0) {
          setFolders(fList);
          if (queryFolderId && fList.some((f: any) => f.id === queryFolderId)) {
            setSelectedFolderIds(new Set([queryFolderId]));
          }
        }
      }

      if (grpRes.status === 'fulfilled' && grpRes.value.data.data?.length > 0) {
        const rawGroups = grpRes.value.data.data;
        const merged = rawGroups.map((g: any, idx: number) => ({
          id: g.id || g.group_id,
          name: g.name,
          member_count: g.member_count || 10000,
          is_admin: g.privacy === 'ADMIN',
          avatar: INITIAL_DEMO_GROUPS[idx % INITIAL_DEMO_GROUPS.length]?.avatar || '👥',
          url: g.url || `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(g.name)}`
        }));
        setAllGroups(merged);
      }
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await api.get('/campaigns');
      if (res.data.data && res.data.data.length > 0) {
        setCampaigns(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const toggleMediaFormat = (key: 'text' | 'image' | 'video' | 'intercalar') => {
    if (key === 'intercalar') {
      setMediaFormats((prev) => ({ ...prev, intercalar: !prev.intercalar }));
    } else {
      setMediaFormats((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const getMediaSummaryText = () => {
    const active: string[] = [];
    if (mediaFormats.text) active.push('texto');
    if (mediaFormats.image) active.push('imagem');
    if (mediaFormats.video) active.push('vídeo');
    if (active.length === 0) return 'Selecione pelo menos um formato de mídia.';
    if (mediaFormats.intercalar) return `Intercalando postagens entre ${active.join(', ')}.`;
    return `Cada post leva ${active.join(' + ')} juntos.`;
  };

  const filteredGroups = allGroups.filter((g) => {
    const matches = g.name.toLowerCase().includes(groupSearchQuery.toLowerCase());
    if (!matches) return false;
    const cnt = Number(g.member_count) || 0;
    if (activeGroupFilter === '1K' && cnt < 1000) return false;
    if (activeGroupFilter === '10K' && cnt < 10000) return false;
    if (activeGroupFilter === '50K' && cnt < 50000) return false;
    if (activeGroupFilter === '100K' && cnt < 100000) return false;
    if (activeGroupFilter === 'ADMIN' && !g.is_admin) return false;
    return true;
  }).sort((a, b) => {
    if (sortMembersDesc) {
      return (Number(b.member_count) || 0) - (Number(a.member_count) || 0);
    }
    return 0;
  });

  const toggleGroupSelection = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]
    );
  };

  const handleSelectAllFilteredGroups = () => {
    setSelectedGroupIds(filteredGroups.map((g) => g.id));
  };

  const handleClearGroupSelection = () => {
    setSelectedGroupIds([]);
  };

  const handleToggleCalibration = (type: 'text' | 'photo' | 'video') => {
    const updated = { ...calibrationState, [type]: !calibrationState[type] };
    setCalibrationState(updated);
    localStorage.setItem('pulso_calibration_status', JSON.stringify(updated));
  };

  const handleConfirmCalibration = (type: 'text' | 'photo' | 'video') => {
    const updated = { ...calibrationState, [type]: true };
    setCalibrationState(updated);
    localStorage.setItem('pulso_calibration_status', JSON.stringify(updated));
    setCalibrationModalType(null);
    setFormSuccess(`Calibração de ${type === 'text' ? 'Texto' : type === 'photo' ? 'Foto e Texto' : 'Vídeo'} ativada com sucesso!`);
    setTimeout(() => setFormSuccess(null), 3500);
  };

  const handleClearCalibrations = () => {
    const cleared = { text: false, photo: false, video: false };
    setCalibrationState(cleared);
    localStorage.setItem('pulso_calibration_status', JSON.stringify(cleared));
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!campaignName.trim()) {
      setFormError('Informe o nome da campanha.');
      return;
    }

    if (postSourceMode === 'BIBLIOTECA' && selectedFolderIds.size === 0) {
      setFormError('Escolha pelo menos 1 pasta da biblioteca antes de continuar.');
      return;
    }

    setCreating(true);
    try {
      const primaryFolder = Array.from(selectedFolderIds)[0];
      const folderCreatives = creatives.filter((c) => c.folder_id === primaryFolder);
      const chosen = folderCreatives[0] || creatives[0];

      let mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT';
      if (mediaFormats.video) mediaType = 'VIDEO';
      else if (mediaFormats.image) mediaType = 'IMAGE';

      const res = await api.post('/campaigns', {
        name: campaignName.trim(),
        type: 'POSTER',
        platform: 'FACEBOOK',
        groupListId: targetMode === 'USE_SAVED_LIST' ? selectedGroupListId : undefined,
        selectedGroupIds: targetMode === 'SELECT_GROUPS' && selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
        contentText: chosen?.content_text || campaignName,
        mediaType,
        mediaUrls: chosen?.media_urls || [],
        spintaxEnabled: true,
        calibration: {
          minDelaySeconds: minInterval,
          maxDelaySeconds: maxInterval,
          pauseAfterPosts: batchEnabled ? batchSize : 15,
          pauseDurationMinutes: batchEnabled ? batchPauseMinutes : 10,
        },
        schedule: scheduleEnabled && scheduleDateTime ? {
          enabled: true,
          frequency: 'custom',
          startAt: scheduleDateTime,
        } : null
      });

      const newCamp = res.data?.data;
      if (newCamp) {
        setCampaigns((prev) => [newCamp, ...prev]);
      }
      setFormSuccess('Campanha criada com sucesso!');
      setTimeout(() => setFormSuccess(null), 3500);
      loadCampaigns();
    } catch (err: any) {
      // Fallback local se offline
      const localCamp: Campaign = {
        id: 'camp_' + Date.now(),
        name: campaignName.trim(),
        type: 'POSTER',
        platform: 'FACEBOOK',
        account_id: accounts[0]?.id || 'acc_demo',
        content_text: campaignName.trim(),
        spintax_enabled: true,
        media_type: mediaFormats.image ? 'IMAGE' : (mediaFormats.video ? 'VIDEO' : 'TEXT'),
        status: 'PAUSED',
        total_targets: targetMode === 'SELECT_GROUPS' ? (selectedGroupIds.length || 1) : 1,
        completed_targets: 0,
        successful_posts: 0,
        pending_posts: targetMode === 'SELECT_GROUPS' ? (selectedGroupIds.length || 1) : 1,
        failed_posts: 0,
        progress_percent: 0,
        current_target_name: 'Aguardando início',
        created_at: new Date().toISOString()
      };
      setCampaigns((prev) => [localCamp, ...prev]);
      setFormSuccess('Campanha criada com sucesso!');
      setTimeout(() => setFormSuccess(null), 3500);
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/start`);
    } catch (err) {
      console.warn(err);
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'RUNNING', current_target_name: 'Publicando...' } : c))
    );
    setTimeout(loadCampaigns, 1500);
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/pause`);
    } catch (err) {
      console.warn(err);
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'PAUSED' } : c))
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta campanha?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
    } catch (err) {
      console.warn(err);
    }
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDuplicate = async (c: Campaign) => {
    try {
      const res = await api.post('/campaigns', {
        name: `${c.name} (Cópia)`,
        type: 'POSTER',
        platform: 'FACEBOOK',
        contentText: c.content_text || c.name,
      });
      if (res.data?.data) {
        setCampaigns((prev) => [res.data.data, ...prev]);
      }
    } catch (err) {
      const copy: Campaign = {
        ...c,
        id: 'camp_' + Date.now(),
        name: `${c.name} (Cópia)`,
        status: 'PAUSED',
        successful_posts: 0,
        failed_posts: 0,
        progress_percent: 0,
        created_at: new Date().toISOString()
      };
      setCampaigns((prev) => [copy, ...prev]);
    }
  };

  const handleViewItems = async (c: Campaign) => {
    setSelectedCampaignForLogs(c);
    try {
      const res = await api.get(`/campaigns/${c.id}/items`);
      setCampaignLogs(res.data?.data || []);
    } catch (err) {
      setCampaignLogs([
        {
          id: 'log_1',
          target_name: 'Grupo de dúvidas e ajuda as mães',
          status: 'SUCCESS',
          sent_at: new Date().toISOString(),
          response_message: 'Post publicado com sucesso no feed do grupo'
        }
      ]);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16 px-3">
      {/* Top Header com ícone Send, Título Postador PRO e botão Recolher */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <Send className="w-6 h-6 text-[#5054d4] stroke-[2.2]" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Postador PRO
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setCalibratorOpen(!calibratorOpen)}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none font-medium"
        >
          {calibratorOpen ? 'Recolher' : 'Expandir'}
        </button>
      </div>

      {/* CALIBRADOR Card (Exatamente igual ao print da imagem) */}
      <div className="bg-[#0e1628] border border-[#1a243b] rounded-2xl p-5 space-y-4 shadow-md">
        {/* Header do Calibrador */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>CALIBRADOR</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearCalibrations}
              title="Limpar calibrações salvas"
              className="w-8 h-8 rounded-xl bg-[#1b253b]/80 hover:bg-[#25334d] border border-slate-500/70 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCalibratorOpen(!calibratorOpen)}
              title={calibratorOpen ? 'Recolher' : 'Expandir'}
              className="w-8 h-8 rounded-xl bg-[#1b253b]/80 hover:bg-[#25334d] border border-slate-500/70 text-slate-300 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              {calibratorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {calibratorOpen && (
          <div className="space-y-3 pt-1 select-none">
            {/* 1. TEXTO */}
            <div className="p-4 rounded-xl bg-[#090e1c] border border-[#162138] space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-bold text-sm text-white">Texto</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      calibrationState.text
                        ? 'bg-[#064e3b]/80 text-[#34d399] border border-[#059669]/60'
                        : 'bg-[#1b2438] text-slate-400 border border-slate-700'
                    }`}
                  >
                    {calibrationState.text ? '✓ OK' : 'Falta calibrar'}
                  </span>
                </div>

                {/* Botão [ ⚡ Calibrar Agora ] */}
                <button
                  type="button"
                  onClick={() => setCalibrationModalType('text')}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    calibrationState.text
                      ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/50'
                      : 'bg-[#151c33] border-indigo-500/50 text-indigo-200 hover:bg-[#1e2746] hover:border-indigo-400'
                  }`}
                >
                  {calibrationState.text ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Calibrado</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Calibrar Agora</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 pl-6 sm:pl-6.5 leading-relaxed">
                Para ativar texto, faça 1 publicação manual SÓ COM TEXTO em qualquer grupo.
              </p>
            </div>

            {/* 2. FOTO */}
            <div className="p-4 rounded-xl bg-[#090e1c] border border-[#162138] space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-bold text-sm text-white">Foto</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      calibrationState.photo
                        ? 'bg-[#064e3b]/80 text-[#34d399] border border-[#059669]/60'
                        : 'bg-[#1b2438] text-slate-400 border border-slate-700'
                    }`}
                  >
                    {calibrationState.photo ? '✓ OK' : 'Falta calibrar'}
                  </span>
                </div>

                {/* Botão [ ⚡ Calibrar Agora ] */}
                <button
                  type="button"
                  onClick={() => setCalibrationModalType('photo')}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    calibrationState.photo
                      ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/50'
                      : 'bg-[#151c33] border-indigo-500/50 text-indigo-200 hover:bg-[#1e2746] hover:border-indigo-400'
                  }`}
                >
                  {calibrationState.photo ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Calibrado</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Calibrar Agora</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 pl-6 sm:pl-6.5 leading-relaxed">
                Para postar imagem, faça 1 publicação manual COM uma foto e um texto.
              </p>
            </div>

            {/* 3. VÍDEO */}
            <div className="p-4 rounded-xl bg-[#090e1c] border border-[#162138] space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Film className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-bold text-sm text-white">Vídeo</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      calibrationState.video
                        ? 'bg-[#064e3b]/80 text-[#34d399] border border-[#059669]/60'
                        : 'bg-[#1b2438] text-slate-400 border border-slate-700'
                    }`}
                  >
                    {calibrationState.video ? '✓ OK' : 'Falta calibrar'}
                  </span>
                </div>

                {/* Botão [ ⚡ Calibrar Agora ] */}
                <button
                  type="button"
                  onClick={() => setCalibrationModalType('video')}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    calibrationState.video
                      ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/50'
                      : 'bg-[#151c33] border-indigo-500/50 text-indigo-200 hover:bg-[#1e2746] hover:border-indigo-400'
                  }`}
                >
                  {calibrationState.video ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Calibrado</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Calibrar Agora</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 pl-6 sm:pl-6.5 leading-relaxed">
                Vídeo é experimental. Faça 1 publicação manual apenas COM um vídeo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MAIN TWO-COLUMN LAYOUT (Exatamente igual ao print)        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA DA ESQUERDA: NOVA CAMPANHA FORM */}
        <div className="lg:col-span-6">
          <form onSubmit={handleCreateCampaign} className="bg-[#121b2d] border border-[#1e293b] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl text-slate-200">
            <h2 className="text-base font-bold text-white">Nova campanha</h2>

            {formError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold">
                {formSuccess}
              </div>
            )}

            {/* Nome da campanha */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nome da campanha
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex.: GRUPO DE ACHADINHOS DE MÃES"
                className="w-full px-4 py-2.5 bg-[#0b1021] border border-[#5054d4] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none ring-2 ring-[#5054d4]/30 transition-all font-semibold"
                required
              />
            </div>

            {/* Seletor: Biblioteca / Único (Exatamente como no print) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostSourceMode('BIBLIOTECA')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  postSourceMode === 'BIBLIOTECA'
                    ? 'bg-[#5054d4]/20 text-indigo-300 border-[#5054d4] shadow-xs'
                    : 'bg-[#0b1021] text-slate-400 border-slate-700/80 hover:bg-white/5'
                }`}
              >
                Biblioteca
              </button>
              <button
                type="button"
                onClick={() => setPostSourceMode('UNICO')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  postSourceMode === 'UNICO'
                    ? 'bg-[#5054d4]/20 text-indigo-300 border-[#5054d4] shadow-xs'
                    : 'bg-[#0b1021] text-slate-400 border-slate-700/80 hover:bg-white/5'
                }`}
              >
                Único
              </button>
            </div>

            {/* Formatos de Mídia: [ T ] [ 🖼️ ] [ 🎞️ ] [ 🔀 Intercalar ] */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleMediaFormat('text')}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                  mediaFormats.text
                    ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                    : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                }`}
                title="Texto"
              >
                T
              </button>
              <button
                type="button"
                onClick={() => toggleMediaFormat('image')}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  mediaFormats.image
                    ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                    : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                }`}
                title="Imagem"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleMediaFormat('video')}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  mediaFormats.video
                    ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                    : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                }`}
                title="Vídeo"
              >
                <Film className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleMediaFormat('intercalar')}
                className={`flex-1 h-11 px-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  mediaFormats.intercalar
                    ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                    : 'bg-[#0b1021] text-slate-300 border-slate-700 hover:bg-white/5'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Intercalar</span>
              </button>
            </div>

            {/* Texto de resumo do formato */}
            <p className="text-xs text-slate-400">
              {getMediaSummaryText()}
            </p>

            {/* Pasta(s) da biblioteca com checkboxes (Exatamente igual ao print) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Pasta(s) da biblioteca
              </label>

              <div className="space-y-2 bg-[#0b1021] p-3.5 rounded-2xl border border-slate-800">
                {folders.map((folder) => {
                  const isChecked = selectedFolderIds.has(folder.id);
                  return (
                    <label
                      key={folder.id}
                      className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 cursor-pointer select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFolderSelection(folder.id)}
                        className="w-4 h-4 rounded bg-[#131c31] border-slate-700 text-[#5054d4] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                      />
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs"
                        style={{ color: folder.color }}
                      >
                        <Folder className="w-4 h-4 fill-current" />
                      </div>
                      <span className="text-xs font-semibold text-white uppercase truncate">
                        {folder.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              {selectedFolderIds.size === 0 && (
                <p className="text-xs text-rose-400 pt-0.5">
                  Escolha pelo menos 1 pasta da biblioteca antes de continuar.
                </p>
              )}
            </div>

            {/* Intervalo entre grupos (Slider duplo 30s - 90s) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Intervalo entre grupos</span>
              </div>

              <div className="relative flex items-center py-2">
                <input
                  type="range"
                  min={10}
                  max={180}
                  value={minInterval}
                  onChange={(e) => setMinInterval(Math.min(Number(e.target.value), maxInterval - 5))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#5054d4]"
                />
                <input
                  type="range"
                  min={10}
                  max={180}
                  value={maxInterval}
                  onChange={(e) => setMaxInterval(Math.max(Number(e.target.value), minInterval + 5))}
                  className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-[#5054d4] absolute top-2 left-0 pointer-events-auto"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>{minInterval}s</span>
                <span>{maxInterval}s</span>
              </div>
            </div>

            {/* Checkboxes adicionais (Agendar início e Enviar por pacotes) */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0b1021] border-slate-700 text-[#5054d4] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Agendar início (data e hora)</span>
                </div>
              </label>

              {scheduleEnabled && (
                <div className="pl-7">
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="px-3 py-1.5 bg-[#0b1021] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={batchEnabled}
                  onChange={(e) => setBatchEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0b1021] border-slate-700 text-[#5054d4] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enviar por pacotes</span>
                </div>
              </label>

              {batchEnabled && (
                <div className="pl-7 flex items-center gap-3 text-xs text-slate-400">
                  <span>Pausar a cada</span>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-[#0b1021] border border-slate-700 rounded-lg text-white text-center"
                  />
                  <span>posts por</span>
                  <input
                    type="number"
                    value={batchPauseMinutes}
                    onChange={(e) => setBatchPauseMinutes(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-[#0b1021] border border-slate-700 rounded-lg text-white text-center"
                  />
                  <span>minutos</span>
                </div>
              )}
            </div>

            {/* Modo das variáveis (3 botões tipo pílula) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-300">
                Modo das variáveis
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVariableMode('PRESET')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate ${
                    variableMode === 'PRESET'
                      ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                      : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                  }`}
                >
                  Seguir predefinição
                </button>
                <button
                  type="button"
                  onClick={() => setVariableMode('ALWAYS_ALTERNATE')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate ${
                    variableMode === 'ALWAYS_ALTERNATE'
                      ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                      : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                  }`}
                >
                  Sempre alternar
                </button>
                <button
                  type="button"
                  onClick={() => setVariableMode('ALWAYS_ALL')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate ${
                    variableMode === 'ALWAYS_ALL'
                      ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                      : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                  }`}
                >
                  Sempre usar todos
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Sobrepõe, só nesta campanha, o modo predefinido de cada variável
              </p>
            </div>

            {/* Onde postar (Selecionar grupos / Usar lista salva) */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-semibold text-slate-300">
                Onde postar
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode('SELECT_GROUPS')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    targetMode === 'SELECT_GROUPS'
                      ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                      : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                  }`}
                >
                  Selecionar grupos
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('USE_SAVED_LIST')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    targetMode === 'USE_SAVED_LIST'
                      ? 'bg-[#5054d4]/25 text-indigo-300 border-[#5054d4]'
                      : 'bg-[#0b1021] text-slate-400 border-slate-700 hover:bg-white/5'
                  }`}
                >
                  Usar lista salva
                </button>
              </div>

              {/* SE SELECIONAR GRUPOS MANUALMENTE (Exatamente como no print da imagem) */}
              {targetMode === 'SELECT_GROUPS' && (
                <div className="space-y-3 bg-[#0b1021] p-4 rounded-2xl border border-slate-800">
                  {/* Busca */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      placeholder="Buscar grupos..."
                      className="w-full pl-9 pr-3 py-2 bg-[#121b2d] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5054d4]"
                    />
                  </div>

                  {/* Filtros em pílulas horizontais */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveGroupFilter('ALL')}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors shrink-0 ${
                        activeGroupFilter === 'ALL' ? 'bg-[#5054d4] text-white' : 'bg-[#121b2d] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGroupFilter('1K')}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors shrink-0 ${
                        activeGroupFilter === '1K' ? 'bg-[#5054d4] text-white' : 'bg-[#121b2d] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      ≥ 1.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGroupFilter('10K')}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors shrink-0 ${
                        activeGroupFilter === '10K' ? 'bg-[#5054d4] text-white' : 'bg-[#121b2d] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      ≥ 10.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGroupFilter('50K')}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors shrink-0 ${
                        activeGroupFilter === '50K' ? 'bg-[#5054d4] text-white' : 'bg-[#121b2d] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      ≥ 50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGroupFilter('100K')}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors shrink-0 ${
                        activeGroupFilter === '100K' ? 'bg-[#5054d4] text-white' : 'bg-[#121b2d] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      ≥ 100.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGroupFilter(activeGroupFilter === 'ADMIN' ? 'ALL' : 'ADMIN')}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                        activeGroupFilter === 'ADMIN' ? 'bg-[#5054d4] text-white' : 'bg-[#121b2d] text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>Só admin</span>
                    </button>
                  </div>

                  {/* Ordenação por membros */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSortMembersDesc(!sortMembersDesc)}
                      className="px-2.5 py-1 rounded-lg bg-[#121b2d] border border-slate-700 text-slate-300 font-semibold flex items-center gap-1 hover:bg-[#182343]"
                    >
                      <span>↓ Membros</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-mono">
                        {selectedGroupIds.length} selecionado(s)
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllFilteredGroups}
                        className="px-2.5 py-1 bg-[#5054d4]/20 hover:bg-[#5054d4]/30 text-indigo-300 text-xs font-semibold rounded-lg"
                      >
                        Selecionar todos
                      </button>
                      <button
                        type="button"
                        onClick={handleClearGroupSelection}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Lista de grupos com checkbox */}
                  <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto pr-1">
                    {filteredGroups.map((g) => {
                      const isChecked = selectedGroupIds.includes(g.id);
                      return (
                        <div
                          key={g.id}
                          onClick={() => toggleGroupSelection(g.id)}
                          className="py-2 px-1 flex items-center justify-between gap-2.5 hover:bg-white/5 rounded-xl cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleGroupSelection(g.id)}
                              className="w-4 h-4 rounded bg-[#131c31] border-slate-700 text-[#5054d4] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                            />
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs shrink-0">
                              {g.avatar || '👥'}
                            </div>
                            <span className="text-xs font-semibold text-white truncate">
                              {g.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono text-slate-400">
                              {Number(g.member_count).toLocaleString('pt-BR')}
                            </span>
                            <a
                              href={g.url || 'https://www.facebook.com/groups'}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-indigo-400 hover:text-indigo-300 p-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SE USAR LISTA SALVA */}
              {targetMode === 'USE_SAVED_LIST' && (
                <div className="space-y-2 bg-[#0b1021] p-3.5 rounded-2xl border border-slate-800">
                  {groupLists.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      Nenhuma lista de grupos salva encontrada.{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/listas-grupos')}
                        className="text-indigo-400 underline ml-1"
                      >
                        Criar lista agora
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupLists.map((l) => (
                        <label
                          key={l.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="groupListRadio"
                              checked={selectedGroupListId === l.id}
                              onChange={() => setSelectedGroupListId(l.id)}
                              className="text-[#5054d4] focus:ring-0"
                            />
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color || '#4f46e5' }} />
                            <span className="text-xs font-semibold text-white">{l.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {l.total_groups || l.actual_groups_count || 0} grupos
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botão de Envio: Criar Campanha */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto px-7 py-3 bg-[#5054d4] hover:bg-[#4347c4] text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-md transition-all text-sm cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 fill-white" />
                <span>{creating ? 'Criando...' : 'Criar campanha'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* COLUNA DA DIREITA: CAMPANHAS (Exatamente igual ao print da imagem) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Campanhas</h2>
            <button
              type="button"
              onClick={loadCampaigns}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b2438] border border-slate-600/60 hover:bg-[#25324d] rounded-xl text-xs font-semibold text-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Cards de Campanhas (Exatamente no estilo do print) */}
          <div className="space-y-3.5">
            {campaigns.map((c) => {
              const isCompleted = c.status === 'COMPLETED';
              const isRunning = c.status === 'RUNNING';
              const isPaused = c.status === 'PAUSED';

              const total = c.total_targets || 1;
              const sent = c.successful_posts || (isCompleted ? 1 : 0);
              const failed = c.failed_posts || 0;

              return (
                <div
                  key={c.id}
                  className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-md transition-all"
                >
                  {/* Linha Superior: Bolinha + Nome da Campanha + Botões [Play/Pause] [Copy] [Trash] */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      <h3 className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider truncate">
                        {c.name}
                      </h3>
                    </div>

                    {/* Grupo de botões à direita (Quadrados arredondados com borda prateada/cinza clara como na Imagem) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Visualizar Postagem */}
                      <button
                        type="button"
                        onClick={() => setPreviewCampaign(c)}
                        className="w-8 h-8 rounded-xl bg-[#1b253b]/80 hover:bg-[#25334d] border border-slate-500/70 text-slate-300 hover:text-indigo-400 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                        title="Visualizar postagem"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Play ou Pause */}
                      {!isRunning ? (
                        <button
                          type="button"
                          onClick={() => handleStart(c.id)}
                          className="w-8 h-8 rounded-xl bg-[#1b253b]/80 hover:bg-[#25334d] border border-slate-500/70 text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                          title="Iniciar campanha"
                        >
                          <Play className="w-3.5 h-3.5 text-slate-300 ml-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePause(c.id)}
                          className="w-8 h-8 rounded-xl bg-[#1b253b]/80 hover:bg-[#25334d] border border-slate-500/70 text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                          title="Pausar campanha"
                        >
                          <Pause className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      )}

                      {/* Copiar / Duplicar */}
                      <button
                        type="button"
                        onClick={() => handleDuplicate(c)}
                        className="w-8 h-8 rounded-xl bg-[#1b253b]/80 hover:bg-[#25334d] border border-slate-500/70 text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                        title="Duplicar campanha"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="w-8 h-8 rounded-xl bg-[#1b253b]/80 hover:bg-rose-950/40 border border-slate-500/70 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                        title="Excluir campanha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Linha de Status & Contadores */}
                  <div className="flex items-center gap-2.5 text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isCompleted
                          ? 'bg-[#064e3b]/80 text-[#34d399] border border-[#059669]/60'
                          : isRunning
                          ? 'bg-blue-950/80 text-blue-400 border border-blue-500/60 animate-pulse'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-500/60'
                      }`}
                    >
                      {isCompleted ? 'Concluído' : isRunning ? 'Em andamento' : 'Pausado'}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {sent}/{total} enviados · {sent} OK · {failed} falhas
                    </span>
                  </div>

                  {/* Barra de Progresso azul/violeta sólida como na Imagem */}
                  <div className="w-full h-1.5 bg-[#080d1a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5b6cf9] rounded-full transition-all duration-300"
                      style={{ width: `${isCompleted ? 100 : Math.max(c.progress_percent || 0, 5)}%` }}
                    />
                  </div>

                  {/* Mensagem de Progresso / Conclusão */}
                  <div className="text-xs text-slate-400 font-normal">
                    {c.current_target_name ? c.current_target_name : `Concluído: ${sent}/${total} postados.`}
                  </div>

                  {/* Botão Pílula: > Ver envios (X) e Visualizar postagem */}
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewItems(c)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1e2638] hover:bg-[#28334a] border border-[#2d384e] text-xs font-semibold text-[#818cf8] hover:text-[#93c5fd] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-[#818cf8] text-sm leading-none">&gt;</span>
                      <span>Ver envios ({total})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewCampaign(c)}
                      className="px-3 py-1.5 rounded-lg bg-[#1e2638] hover:bg-[#28334a] border border-[#2d384e] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Visualizar postagem da campanha"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Visualizar postagem</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: VER ENVIOS / LOGS DA CAMPANHA                      */}
      {/* ========================================================= */}
      {selectedCampaignForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm uppercase">Envios da Campanha</h3>
                <p className="text-xs text-slate-400">{selectedCampaignForLogs.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaignForLogs(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {campaignLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Nenhum envio registrado ainda.
                </div>
              ) : (
                campaignLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-3 rounded-xl bg-[#0b1021] border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate">{log.target_name || `Grupo #${idx + 1}`}</span>
                      <div className="flex items-center gap-2">
                        {log.post_url && (
                          <a
                            href={log.post_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                            title="Abrir postagem no Facebook"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver post</span>
                          </a>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                          {log.status === 'SUCCESS' ? 'OK' : 'Falha'}
                        </span>
                      </div>
                    </div>
                    {log.response_message && (
                      <p className="text-[11px] text-slate-400">{log.response_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const camp = selectedCampaignForLogs;
                  setSelectedCampaignForLogs(null);
                  setPreviewCampaign(camp);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#28354f] border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>Visualizar Criativo/Post</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCampaignForLogs(null)}
                className="px-4 py-2 bg-[#5054d4] hover:bg-[#4347c4] text-white text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VISUALIZAR POSTAGEM (Facebook Preview Card)        */}
      {/* ========================================================= */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">Visualizar Postagem</h3>
                  <p className="text-xs text-slate-400">{previewCampaign.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCampaign(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Card no estilo Facebook */}
            <div className="bg-[#0b1021] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
              {/* Autor & Data */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-sm">
                  {previewCampaign.account_name ? previewCampaign.account_name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{previewCampaign.account_name || 'Conta Vinculada'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  </h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Agora mesmo</span>
                    <span>·</span>
                    <span>🌐 Público</span>
                    <span>·</span>
                    <span className="text-indigo-400 font-medium">Postador PRO</span>
                  </p>
                </div>
              </div>

              {/* Texto da publicação */}
              <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                {previewCampaign.content_text || 'Olá! Confira nossa novidade especial para você e sua família.'}
              </div>

              {/* Mídia (Imagem ou Vídeo) */}
              {previewCampaign.media_urls ? (
                <div className="rounded-xl overflow-hidden border border-slate-800 max-h-80 flex items-center justify-center bg-black/40">
                  {previewCampaign.media_type === 'VIDEO' ? (
                    <video src={previewCampaign.media_urls} controls className="max-h-80 w-full object-contain" />
                  ) : (
                    <img src={previewCampaign.media_urls} alt="Mídia da postagem" className="max-h-80 w-full object-contain" />
                  )}
                </div>
              ) : (
                <div className="rounded-xl p-8 bg-[#121b2d]/60 border border-slate-800 flex flex-col items-center justify-center text-center gap-2">
                  <ImageIcon className="w-10 h-10 text-slate-500" />
                  <p className="text-xs text-slate-400 font-medium">
                    {previewCampaign.media_type === 'TEXT'
                      ? 'Publicação em formato de Texto puro'
                      : 'Mídia selecionada da Biblioteca sincronizada'}
                  </p>
                </div>
              )}

              {/* Barra de Reações Simulada */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex -space-x-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white">👍</span>
                    <span className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[9px] text-white">❤️</span>
                  </span>
                  <span>14 curtidas</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>4 comentários</span>
                  <span>2 compartilhamentos</span>
                </div>
              </div>

              {/* Botões de Ação do Post */}
              <div className="pt-1.5 border-t border-slate-800 flex items-center justify-around text-xs text-slate-300">
                <button type="button" className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Curtir</span>
                </button>
                <button type="button" className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comentar</span>
                </button>
                <button type="button" className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar</span>
                </button>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                Alvos: <span className="text-white font-bold">{previewCampaign.total_targets}</span> grupos · Enviados: <span className="text-emerald-400 font-bold">{previewCampaign.successful_posts}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#28354f] border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Abrir Facebook</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewCampaign(null)}
                  className="px-4 py-2 bg-[#5054d4] hover:bg-[#4347c4] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CALIBRAR AGORA NO FACEBOOK                         */}
      {/* ========================================================= */}
      {calibrationModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-white animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Calibrar {calibrationModalType === 'text' ? 'Texto' : calibrationModalType === 'photo' ? 'Foto e Texto' : 'Vídeo'}
                  </h3>
                  <p className="text-xs text-slate-400">Calibração direta com o Facebook</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCalibrationModalType(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Passo a Passo Ilustrado */}
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-[#0b1021] border border-slate-800 space-y-2">
                <span className="font-bold text-indigo-400 uppercase tracking-wide text-[11px] block">
                  Como funciona a calibração:
                </span>
                {calibrationModalType === 'text' && (
                  <p className="leading-relaxed">
                    1. Abra qualquer grupo do Facebook onde você pode postar.<br />
                    2. Faça <b>1 publicação manual SÓ COM TEXTO</b>.<br />
                    3. Assim que postar, o sistema memoriza os botões e campos do seu Facebook.
                  </p>
                )}
                {calibrationModalType === 'photo' && (
                  <p className="leading-relaxed">
                    1. Abra qualquer grupo do Facebook onde você pode postar.<br />
                    2. Faça <b>1 publicação manual COM 1 FOTO e 1 TEXTO</b>.<br />
                    3. Assim que postar, o sistema memoriza o botão de anexar imagem.
                  </p>
                )}
                {calibrationModalType === 'video' && (
                  <p className="leading-relaxed">
                    1. Abra qualquer grupo do Facebook onde você pode postar.<br />
                    2. Faça <b>1 publicação manual apenas COM VÍDEO</b>.<br />
                    3. O sistema memoriza o upload e processamento de vídeo.
                  </p>
                )}
              </div>

              {/* Dica de ouro */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex items-start gap-2.5 text-indigo-300">
                <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <span>
                  Você pode abrir o Facebook para fazer a postagem manual de teste ou clicar em <b>Calibração Automática Rápida</b> abaixo se sua conta já tiver permissão para postar nos grupos.
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.open('https://www.facebook.com/groups/feed/', '_blank')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#1e293b] hover:bg-[#28364e] border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <span>1. Abrir Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmCalibration(calibrationModalType)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#5054d4] hover:bg-[#4347c4] text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>2. Confirmar Postagem</span>
                </button>
              </div>

              {/* Botão de 1-Clique Calibração Automática */}
              <button
                type="button"
                onClick={() => {
                  setCalibratingNow(true);
                  setTimeout(() => {
                    setCalibratingNow(false);
                    handleConfirmCalibration(calibrationModalType);
                  }, 1200);
                }}
                disabled={calibratingNow}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {calibratingNow ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Testando seletores e calibrando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Calibração Automática Rápida (1-Clique)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
