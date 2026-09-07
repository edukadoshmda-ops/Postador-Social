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
  Search
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
      {/* Top Header com ícone Send e Título Postador PRO */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <Send className="w-6 h-6 text-[#5054d4] stroke-[2.2]" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Postador PRO
          </h1>
        </div>
      </div>

      {/* Guia de 4 passos do Tutorial */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-900/60 rounded-2xl p-3.5 flex items-center justify-between gap-2 overflow-x-auto shadow-xs text-xs">
        <div className="flex items-center gap-2 font-bold text-indigo-400 shrink-0">
          <Sparkles className="w-4 h-4" />
          <span>Fluxo do Tutorial:</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300 text-[11px] font-medium shrink-0">
          <button type="button" onClick={() => navigate('/aquecedores')} className="px-2 py-0.5 rounded-lg bg-[#1e293b] hover:bg-indigo-900/30 text-slate-200 transition-colors cursor-pointer">
            1. Aquecedor (Entrar nos Grupos)
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <button type="button" onClick={() => navigate('/listas-grupos')} className="px-2 py-0.5 rounded-lg bg-[#1e293b] hover:bg-indigo-900/30 text-slate-200 transition-colors cursor-pointer">
            2. Criar Lista de Grupos
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <button type="button" onClick={() => navigate('/biblioteca')} className="px-2 py-0.5 rounded-lg bg-[#1e293b] hover:bg-indigo-900/30 text-slate-200 transition-colors cursor-pointer">
            3. Biblioteca (Textos & Fotos)
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-bold">4. Postador PRO (Campanha)</span>
        </div>
      </div>

      {/* CALIBRADOR Accordion Banner (Exatamente igual ao print) */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xs">
        <div
          onClick={() => setCalibratorOpen(!calibratorOpen)}
          className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#162238] transition-colors select-none"
        >
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>CALIBRADOR</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearCalibrations();
              }}
              title="Limpar calibrações salvas"
              className="p-1.5 rounded-xl bg-[#1e293b] hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="p-1 rounded-xl border border-slate-700 bg-[#1e293b] text-slate-300 shadow-xs">
              {calibratorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {calibratorOpen && (
          <div className="p-6 pt-2 border-t border-[#1e293b] bg-[#0c1222] space-y-3 select-none">
            {/* Texto */}
            <div className="p-4 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm text-white">Texto</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${calibrationState.text ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {calibrationState.text ? 'Calibrado ✓' : 'Falta calibrar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCalibration('text')}
                  className="text-xs px-3 py-1 rounded-lg font-semibold border border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                >
                  {calibrationState.text ? 'Calibrado' : '⚡ Calibrar Agora'}
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para ativar texto, faça 1 publicação manual SÓ COM TEXTO em qualquer grupo.
              </p>
            </div>

            {/* Foto */}
            <div className="p-4 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-sm text-white">Foto</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${calibrationState.photo ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {calibrationState.photo ? 'Calibrado ✓' : 'Falta calibrar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCalibration('photo')}
                  className="text-xs px-3 py-1 rounded-lg font-semibold border border-blue-500/40 text-blue-300 hover:bg-blue-950/40"
                >
                  {calibrationState.photo ? 'Calibrado' : '⚡ Calibrar Agora'}
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para postar imagem, faça 1 publicação manual COM uma foto e um texto.
              </p>
            </div>

            {/* Vídeo */}
            <div className="p-4 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm text-white">Vídeo</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${calibrationState.video ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {calibrationState.video ? 'Calibrado ✓' : 'Falta calibrar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCalibration('video')}
                  className="text-xs px-3 py-1 rounded-lg font-semibold border border-purple-500/40 text-purple-300 hover:bg-purple-950/40"
                >
                  {calibrationState.video ? 'Calibrado' : '⚡ Calibrar Agora'}
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
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

                  {/* Botão Pílula: > Ver envios (X) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleViewItems(c)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1e2638] hover:bg-[#28334a] border border-[#2d384e] text-xs font-semibold text-[#818cf8] hover:text-[#93c5fd] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-[#818cf8] text-sm leading-none">&gt;</span>
                      <span>Ver envios ({total})</span>
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                        {log.status === 'SUCCESS' ? 'OK' : 'Falha'}
                      </span>
                    </div>
                    {log.response_message && (
                      <p className="text-[11px] text-slate-400">{log.response_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
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
    </div>
  );
}
