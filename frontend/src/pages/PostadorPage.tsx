import React, { useState, useEffect } from 'react';
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
  Plus
} from 'lucide-react';
import { api, Campaign, Account, GroupList, CreativeItem } from '../core/apiService';
import CalibratorModal from '../components/CalibratorModal';

export default function PostadorPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupLists, setGroupLists] = useState<GroupList[]>([]);
  const [creatives, setCreatives] = useState<CreativeItem[]>([]);

  // Calibration state (Texto, Foto, Vídeo)
  const [calibratorOpen, setCalibratorOpen] = useState(false);
  const [calibrationState, setCalibrationState] = useState<{ text: boolean; photo: boolean; video: boolean }>(() => {
    try {
      const saved = localStorage.getItem('pulso_calibration_status');
      return saved ? JSON.parse(saved) : { text: false, photo: false, video: false };
    } catch {
      return { text: false, photo: false, video: false };
    }
  });

  // Form: Nova Campanha (Exatamente igual ao print)
  const [campaignName, setCampaignName] = useState('');
  const [postSourceMode, setPostSourceMode] = useState<'BIBLIOTECA' | 'UNICO'>('BIBLIOTECA');
  const [mediaFormats, setMediaFormats] = useState<{ text: boolean; image: boolean; video: boolean; intercalar: boolean }>({
    text: true,
    image: true,
    video: true,
    intercalar: false
  });
  const [selectedFolder, setSelectedFolder] = useState('');
  const [minInterval, setMinInterval] = useState(30);
  const [maxInterval, setMaxInterval] = useState(90);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [batchPauseMinutes, setBatchPauseMinutes] = useState(15);
  const [variableMode, setVariableMode] = useState<'PRESET' | 'ALWAYS_ALTERNATE' | 'ALWAYS_ALL'>('PRESET');
  const [targetMode, setTargetMode] = useState<'SELECT_GROUPS' | 'USE_SAVED_LIST'>('SELECT_GROUPS');
  const [selectedGroupListId, setSelectedGroupListId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [uniqueContentText, setUniqueContentText] = useState('');
  const [uniqueMediaUrl, setUniqueMediaUrl] = useState('');

  // Status & Feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Facebook Connection / Right Column State
  // Inicialmente simula ou checa aba do Facebook conforme print
  const [facebookTabConnected, setFacebookTabConnected] = useState(false);
  const [isRetryingFacebook, setIsRetryingFacebook] = useState(false);

  // Modals & Details
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignItems, setCampaignItems] = useState<any[]>([]);
  const [showCalibratorModal, setShowCalibratorModal] = useState(false);

  // Agendamento recorrente modal
  const [editingSchedule, setEditingSchedule] = useState<Campaign | null>(null);
  const [scheduleForm, setScheduleForm] = useState<any>({ enabled: true, frequency: 'daily', time: '09:00', daysOfWeek: [1,2,3,4,5], intervalHours: 24 });
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    checkFacebookTab();
    const interval = setInterval(loadCampaigns, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [campRes, accRes, glRes, libRes] = await Promise.allSettled([
        api.get('/campaigns'),
        api.get('/accounts'),
        api.get('/groups/lists'),
        api.get('/library'),
      ]);

      if (campRes.status === 'fulfilled') {
        setCampaigns(campRes.value.data.data || []);
      }
      if (accRes.status === 'fulfilled') {
        setAccounts(accRes.value.data.data || []);
      }
      if (glRes.status === 'fulfilled') {
        const lists = glRes.value.data.data || [];
        setGroupLists(lists);
        if (lists.length > 0 && !selectedGroupListId) {
          setSelectedGroupListId(lists[0].id);
        }
      }
      if (libRes.status === 'fulfilled') {
        setCreatives(libRes.value.data.data || []);
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
      setCampaigns(res.data.data || []);
    } catch (err) {
      console.error('Error loading campaigns', err);
    }
  };

  const checkFacebookTab = () => {
    // Ping na extensão ou window message
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'PULSO_PING_EXTENSION' }, '*');
    }
  };

  const handleRetryFacebook = () => {
    setIsRetryingFacebook(true);
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'PULSO_SYNC_REQUEST' }, '*');
    }
    setTimeout(() => {
      loadCampaigns();
      setIsRetryingFacebook(false);
    }, 1500);
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

  const toggleMediaFormat = (key: 'text' | 'image' | 'video' | 'intercalar') => {
    if (key === 'intercalar') {
      setMediaFormats(prev => ({ ...prev, intercalar: !prev.intercalar }));
    } else {
      setMediaFormats(prev => ({ ...prev, [key]: !prev[key] }));
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

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!campaignName.trim()) {
      setFormError('Informe o nome da campanha.');
      return;
    }

    if (postSourceMode === 'BIBLIOTECA' && creatives.length === 0) {
      setFormError('Nenhuma mídia ativa de postagem na Biblioteca. Crie pastas e mídias na Biblioteca antes de continuar.');
      return;
    }

    if (accounts.length === 0) {
      setFormError('Conecte pelo menos uma conta nas Configurações.');
      return;
    }

    const accountId = accounts[0]?.id;
    let contentText = uniqueContentText;
    let mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT';
    const mediaUrls: string[] = [];

    if (postSourceMode === 'BIBLIOTECA') {
      if (creatives.length > 0) {
        contentText = creatives[0].content_text || campaignName;
        if (creatives[0].media_type === 'IMAGE') mediaType = 'IMAGE';
        else if (creatives[0].media_type === 'VIDEO') mediaType = 'VIDEO';
      } else {
        contentText = campaignName;
      }
    } else {
      if (!contentText.trim()) {
        setFormError('Preencha o texto da postagem única.');
        return;
      }
      if (mediaFormats.video) mediaType = 'VIDEO';
      else if (mediaFormats.image) mediaType = 'IMAGE';
      if (uniqueMediaUrl) mediaUrls.push(uniqueMediaUrl);
    }

    setCreating(true);
    try {
      await api.post('/campaigns', {
        name: campaignName,
        type: 'POSTER',
        platform: 'FACEBOOK',
        accountId,
        groupListId: selectedGroupListId || undefined,
        selectedGroupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
        contentText,
        spintaxEnabled: true,
        mediaType,
        mediaUrls,
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

      setFormSuccess('Campanha criada com sucesso!');
      setCampaignName('');
      setUniqueContentText('');
      loadCampaigns();
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Erro ao criar campanha');
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (id: string) => {
    setStartError(null);
    try {
      const res = await api.post(`/campaigns/${id}/start`);
      if (res.data?.data?.message && String(res.data.data.message).includes('SIMULAÇÃO')) {
        setStartError(String(res.data.data.message));
        setTimeout(() => setStartError(null), 6000);
      }
      loadCampaigns();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao iniciar campanha';
      setStartError(msg);
      setTimeout(() => setStartError(null), 6000);
    }
  };

  const handlePause = async (id: string) => {
    try { await api.post(`/campaigns/${id}/pause`); loadCampaigns(); } catch (e) { console.error(e); }
  };
  const handleResume = async (id: string) => {
    try { await api.post(`/campaigns/${id}/resume`); loadCampaigns(); } catch (e) { console.error(e); }
  };
  const handleStop = async (id: string) => {
    try { await api.post(`/campaigns/${id}/stop`); loadCampaigns(); } catch (e) { console.error(e); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta campanha?')) return;
    try { await api.delete(`/campaigns/${id}`); loadCampaigns(); } catch (e) { console.error(e); }
  };
  const handleShuffle = async (id: string) => {
    try { await api.post(`/campaigns/${id}/shuffle`); loadCampaigns(); } catch (e: any) { alert(e.message); }
  };
  const handleRetry = async (id: string) => {
    try { await api.post(`/campaigns/${id}/retry-failed`); loadCampaigns(); } catch (e: any) { alert(e.message); }
  };
  const handleViewItems = async (c: Campaign) => {
    setSelectedCampaign(c);
    try {
      const res = await api.get(`/campaigns/${c.id}/items`);
      setCampaignItems(res.data.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Top Header (Exatamente igual ao print) */}
      <div className="flex items-center gap-3">
        <Send className="w-6 h-6 text-[#5b5bd6] stroke-[2.2]" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
          Postador PRO
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-semibold flex items-center gap-1">
            🔒 PRO
          </span>
        </h1>
      </div>

      {startError && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <span>{startError}</span>
        </div>
      )}

      {/* CALIBRADOR Accordion Banner (Exatamente igual ao print) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl overflow-hidden shadow-xs">
        <div
          onClick={() => setCalibratorOpen(!calibratorOpen)}
          className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-[#131c31] transition-colors select-none"
        >
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 dark:bg-[#1e293b] dark:border-slate-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="p-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 shadow-xs">
              {calibratorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {calibratorOpen && (
          <div className="p-6 pt-2 border-t border-slate-100 dark:border-[#1e293b] bg-slate-50/50 dark:bg-[#0c1222] space-y-3 select-none">
            {/* Texto */}
            <div className="p-4 bg-white dark:bg-[#131c31] border border-slate-200/80 dark:border-[#1e293b] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Texto</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${calibrationState.text ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {calibrationState.text ? 'Calibrado ✓' : 'Falta calibrar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCalibration('text')}
                  className="text-xs px-3 py-1 rounded-lg font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                >
                  {calibrationState.text ? 'Calibrado' : '⚡ Calibrar Agora'}
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Para ativar texto, faça 1 publicação manual SÓ COM TEXTO em qualquer grupo.
              </p>
            </div>

            {/* Foto */}
            <div className="p-4 bg-white dark:bg-[#131c31] border border-slate-200/80 dark:border-[#1e293b] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Foto</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${calibrationState.photo ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {calibrationState.photo ? 'Calibrado ✓' : 'Falta calibrar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCalibration('photo')}
                  className="text-xs px-3 py-1 rounded-lg font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  {calibrationState.photo ? 'Calibrado' : '⚡ Calibrar Agora'}
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Para postar imagem, faça 1 publicação manual COM uma foto e um texto.
              </p>
            </div>

            {/* Vídeo */}
            <div className="p-4 bg-white dark:bg-[#131c31] border border-slate-200/80 dark:border-[#1e293b] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-500" />
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Vídeo</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${calibrationState.video ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {calibrationState.video ? 'Calibrado ✓' : 'Falta calibrar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCalibration('video')}
                  className="text-xs px-3 py-1 rounded-lg font-semibold border border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  {calibrationState.video ? 'Calibrado' : '⚡ Calibrar Agora'}
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Vídeo é experimental. Faça 1 publicação manual apenas COM um vídeo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout (Exatamente igual ao print) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Nova Campanha Card */}
        <div className="lg:col-span-6">
          <form onSubmit={handleCreateCampaign} className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Nova campanha</h2>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-600 font-semibold">
                {formSuccess}
              </div>
            )}

            {/* Nome da campanha */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Nome da campanha
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex.: Lançamento março"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#5b5bd6] focus:ring-1 focus:ring-[#5b5bd6] transition-all"
              />
            </div>

            {/* Seletor: Biblioteca / Único */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostSourceMode('BIBLIOTECA')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                  postSourceMode === 'BIBLIOTECA'
                    ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                    : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                }`}
              >
                Biblioteca
              </button>
              <button
                type="button"
                onClick={() => setPostSourceMode('UNICO')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                  postSourceMode === 'UNICO'
                    ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                    : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                }`}
              >
                Único
              </button>
            </div>

            {/* Botões de formato: [ T ] [ 🖼️ ] [ 🎞️ ] [ 🔀 Intercalar ] */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleMediaFormat('text')}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${
                  mediaFormats.text
                    ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                    : 'bg-white dark:bg-[#131c31] text-slate-600 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                }`}
                title="Texto"
              >
                T
              </button>
              <button
                type="button"
                onClick={() => toggleMediaFormat('image')}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
                  mediaFormats.image
                    ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                    : 'bg-white dark:bg-[#131c31] text-slate-600 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                }`}
                title="Imagem"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => toggleMediaFormat('video')}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
                  mediaFormats.video
                    ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                    : 'bg-white dark:bg-[#131c31] text-slate-600 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                }`}
                title="Vídeo"
              >
                <Film className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => toggleMediaFormat('intercalar')}
                className={`flex-1 h-11 px-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  mediaFormats.intercalar
                    ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                    : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                }`}
              >
                <Shuffle className="w-4 h-4" />
                <span>Intercalar</span>
              </button>
            </div>

            {/* Texto explicativo dinâmico */}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getMediaSummaryText()}
            </p>

            {/* Card de Alerta Âmbar */}
            <div className="p-3 bg-[#fff7ed] border border-amber-200/80 rounded-xl text-xs text-amber-800 leading-relaxed">
              Nenhuma mídia ativa de postagem na Biblioteca. Ative mídias na Biblioteca.
            </div>

            {/* Pasta(s) da biblioteca */}
            {postSourceMode === 'BIBLIOTECA' ? (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Pasta(s) da biblioteca
                </label>
                <p className="text-xs text-slate-500">
                  Nenhuma pasta criada ainda. Crie pastas na Biblioteca primeiro.
                </p>
                <p className="text-xs text-red-500 font-medium">
                  Escolha pelo menos 1 pasta da biblioteca antes de continuar.
                </p>
              </div>
            ) : (
              /* Modo Único: Campos de Copy e URL direta */
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-[#131c31] rounded-2xl border border-slate-200 dark:border-[#1e293b]">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Texto / Copy da Postagem Única
                  </label>
                  <textarea
                    rows={3}
                    value={uniqueContentText}
                    onChange={(e) => setUniqueContentText(e.target.value)}
                    placeholder="{Olá|Oi|E aí} pessoal! Confira essa novidade..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs font-mono focus:outline-none focus:border-[#5b5bd6]"
                  />
                </div>
                {(mediaFormats.image || mediaFormats.video) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      URL da Mídia (Imagem ou Vídeo)
                    </label>
                    <input
                      type="text"
                      value={uniqueMediaUrl}
                      onChange={(e) => setUniqueMediaUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.png"
                      className="w-full px-3.5 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#5b5bd6]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Intervalo entre grupos (Dual Slider) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Intervalo entre grupos
              </label>
              
              {/* Visual Dual Slider */}
              <div className="relative pt-2 pb-1">
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                  {/* Purple active bar between min and max */}
                  <div
                    className="absolute h-full bg-[#5b5bd6] rounded-full"
                    style={{
                      left: `${Math.max(0, (minInterval / 180) * 100)}%`,
                      right: `${Math.max(0, 100 - (maxInterval / 180) * 100)}%`
                    }}
                  />
                </div>
                {/* Two slider inputs on top */}
                <input
                  type="range"
                  min={10}
                  max={180}
                  step={5}
                  value={minInterval}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v < maxInterval) setMinInterval(v);
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-auto"
                />
                {/* Indicator handles */}
                <div
                  className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
                  style={{ left: `calc(${(minInterval / 180) * 100}% - 8px)` }}
                />
                <div
                  className="absolute top-1 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5b5bd6] border-2 border-white shadow-xs pointer-events-none"
                  style={{ left: `calc(${(maxInterval / 180) * 100}% - 8px)` }}
                />
              </div>

              {/* Labels 30s and 90s */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-300">
                <span>{minInterval}s</span>
                <span>{maxInterval}s</span>
              </div>
            </div>

            {/* Checkbox: Agendar início (data e hora) */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#5b5bd6] focus:ring-[#5b5bd6]"
                />
                <span className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Agendar início (data e hora)</span>
                </span>
              </label>
              {scheduleEnabled && (
                <div className="pl-7 pt-1">
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#5b5bd6]"
                  />
                </div>
              )}
            </div>

            {/* Checkbox: Enviar por pacotes */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={batchEnabled}
                  onChange={(e) => setBatchEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#5b5bd6] focus:ring-[#5b5bd6]"
                />
                <span className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Enviar por pacotes</span>
                </span>
              </label>
              {batchEnabled && (
                <div className="pl-7 pt-1 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span>Postar</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-lg text-xs"
                  />
                  <span>posts e pausar por</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={batchPauseMinutes}
                    onChange={(e) => setBatchPauseMinutes(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-lg text-xs"
                  />
                  <span>min</span>
                </div>
              )}
            </div>

            {/* Modo das variáveis */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Modo das variáveis
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVariableMode('PRESET')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    variableMode === 'PRESET'
                      ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                      : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                  }`}
                >
                  Seguir predefinição
                </button>
                <button
                  type="button"
                  onClick={() => setVariableMode('ALWAYS_ALTERNATE')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    variableMode === 'ALWAYS_ALTERNATE'
                      ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                      : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                  }`}
                >
                  Sempre alternar
                </button>
                <button
                  type="button"
                  onClick={() => setVariableMode('ALWAYS_ALL')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    variableMode === 'ALWAYS_ALL'
                      ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                      : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                  }`}
                >
                  Sempre usar todos
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Sobrepõe, só nesta campanha, o modo predefinido de cada variável
              </p>
            </div>

            {/* Onde postar */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Onde postar
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode('SELECT_GROUPS')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                    targetMode === 'SELECT_GROUPS'
                      ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                      : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                  }`}
                >
                  Selecionar grupos
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('USE_SAVED_LIST')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                    targetMode === 'USE_SAVED_LIST'
                      ? 'bg-[#ede9fe] text-[#5b5bd6] border-[#818cf8] shadow-xs'
                      : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                  }`}
                >
                  Usar lista salva
                </button>
              </div>

              {/* Mensagem e contador */}
              {targetMode === 'USE_SAVED_LIST' && groupLists.length > 0 ? (
                <div className="pt-2">
                  <select
                    value={selectedGroupListId}
                    onChange={(e) => setSelectedGroupListId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-xs text-slate-800 dark:text-white"
                  >
                    {groupLists.map((gl) => (
                      <option key={gl.id} value={gl.id}>
                        {gl.name} ({gl.total_groups} grupos)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                  Nenhum grupo. Abra o Facebook e sincronize seus grupos.
                </p>
              )}

              <p className="text-xs text-slate-500 font-medium">
                {targetMode === 'USE_SAVED_LIST' && selectedGroupListId
                  ? `${groupLists.find(l => l.id === selectedGroupListId)?.total_groups || 0} grupo(s) alvo`
                  : '0 grupo(s) alvo'}
              </p>
            </div>

            {/* Botão: Criar campanha */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto px-7 py-3 bg-[#5b5bd6] hover:bg-[#4e4ecb] text-white font-semibold rounded-2xl flex items-center justify-center gap-2.5 shadow-sm transition-all text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4 fill-white" />
                <span>{creating ? 'Criando...' : 'Criar campanha'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Campanhas */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Campanhas</h2>
            <button
              onClick={loadCampaigns}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#131c31] border border-slate-200/90 dark:border-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#1e293b] rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Se não há campanhas ou Facebook falhou ao carregar (Exatamente igual ao print) */}
          {campaigns.length === 0 ? (
            <div className="bg-[#fff8f8] dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-3xl p-10 sm:p-12 text-center space-y-4 shadow-xs">
              {/* Red exclamation circle */}
              <div className="w-12 h-12 rounded-full border-2 border-red-400 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
                !
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
                Falha ao carregar. Abra uma aba do Facebook logada e tente de novo.
              </p>
              <div>
                <button
                  type="button"
                  onClick={handleRetryFacebook}
                  disabled={isRetryingFacebook}
                  className="px-4 py-2 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#1e293b] rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors inline-flex items-center gap-2 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRetryingFacebook ? 'animate-spin' : ''}`} />
                  <span>{isRetryingFacebook ? 'Tentando...' : 'Tentar novamente'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Lista de campanhas carregadas */
            <div className="space-y-3">
              {campaigns.map((c) => {
                const isRunning = c.status === 'RUNNING';
                const isPaused = c.status === 'PAUSED';
                const isCompleted = c.status === 'COMPLETED';

                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-5 space-y-3 shadow-xs transition-all hover:border-[#818cf8]/60"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isRunning
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 animate-pulse'
                                : isPaused
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : isCompleted
                                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.account_name || 'Conta conectada'} • {c.total_targets} grupos alvo
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!isRunning && !isCompleted && (
                          <button
                            onClick={() => handleStart(c.id)}
                            title="Iniciar"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors"
                          >
                            <Play className="w-4 h-4 fill-emerald-600" />
                          </button>
                        )}
                        {isRunning && (
                          <button
                            onClick={() => handlePause(c.id)}
                            title="Pausar"
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 transition-colors"
                          >
                            <Pause className="w-4 h-4 fill-amber-600" />
                          </button>
                        )}
                        {isPaused && (
                          <button
                            onClick={() => handleResume(c.id)}
                            title="Retomar"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors"
                          >
                            <Play className="w-4 h-4 fill-emerald-600" />
                          </button>
                        )}
                        {(isRunning || isPaused) && (
                          <button
                            onClick={() => handleStop(c.id)}
                            title="Parar"
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
                          >
                            <Square className="w-4 h-4 fill-red-600" />
                          </button>
                        )}
                        {!isRunning && (
                          <button
                            onClick={() => handleShuffle(c.id)}
                            title="Embaralhar fila"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200"
                          >
                            <Shuffle className="w-4 h-4" />
                          </button>
                        )}
                        {c.failed_posts > 0 && (
                          <button
                            onClick={() => handleRetry(c.id)}
                            title="Retentar falhas"
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewItems(c)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                        >
                          Logs
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          title="Excluir"
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {c.current_target_name ? `Processando: ${c.current_target_name}` : 'Progresso geral'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">{c.progress_percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#5b5bd6] to-indigo-500 transition-all duration-300"
                          style={{ width: `${c.progress_percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Counters */}
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                      <div className="p-2 bg-slate-50 dark:bg-[#131c31] rounded-xl border border-slate-100 dark:border-[#1e293b]">
                        <span className="text-[10px] text-slate-400 block">Total</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{c.total_targets}</span>
                      </div>
                      <div className="p-2 bg-emerald-50/50 dark:bg-[#131c31] rounded-xl border border-emerald-100 dark:border-[#1e293b]">
                        <span className="text-[10px] text-emerald-600 block">Publicados</span>
                        <span className="text-xs font-bold text-emerald-600">{c.successful_posts}</span>
                      </div>
                      <div className="p-2 bg-amber-50/50 dark:bg-[#131c31] rounded-xl border border-amber-100 dark:border-[#1e293b]">
                        <span className="text-[10px] text-amber-600 block">Pendentes</span>
                        <span className="text-xs font-bold text-amber-600">{c.pending_posts}</span>
                      </div>
                      <div className="p-2 bg-red-50/50 dark:bg-[#131c31] rounded-xl border border-red-100 dark:border-[#1e293b]">
                        <span className="text-[10px] text-red-600 block">Erros</span>
                        <span className="text-xs font-bold text-red-600">{c.failed_posts}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Logs Drawer / Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1e293b]">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Relatório de Envios</h3>
                <p className="text-xs text-slate-500">{selectedCampaign.name}</p>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {campaignItems.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Nenhum item na fila ainda.</p>
              ) : (
                campaignItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">{item.group_name}</span>
                      {item.posted_text && (
                        <p className="text-slate-500 italic truncate max-w-md mt-0.5">"{item.posted_text}"</p>
                      )}
                    </div>
                    {item.post_url && (
                      <a
                        href={item.post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[#5b5bd6] font-semibold"
                      >
                        <span>Abrir</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <CalibratorModal
        isOpen={showCalibratorModal}
        onClose={() => setShowCalibratorModal(false)}
      />
    </div>
  );
}
