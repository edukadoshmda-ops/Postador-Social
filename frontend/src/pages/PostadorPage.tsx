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
  Plus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  Folder,
  Check,
  Layers,
  FastForward
} from 'lucide-react';
import { api, Campaign, Account, GroupList, CreativeItem, LibraryFolder } from '../core/apiService';
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
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [savingFolderConfig, setSavingFolderConfig] = useState(false);
  const [folderConfigSavedMsg, setFolderConfigSavedMsg] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#4F46E5');
  const [minInterval, setMinInterval] = useState(30);
  const [maxInterval, setMaxInterval] = useState(90);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [batchPauseMinutes, setBatchPauseMinutes] = useState(15);
  const [variableMode, setVariableMode] = useState<'PRESET' | 'ALWAYS_ALTERNATE' | 'ALWAYS_ALL'>('PRESET');
  const [targetMode, setTargetMode] = useState<'SELECT_GROUPS' | 'USE_SAVED_LIST'>('USE_SAVED_LIST');
  const [selectedGroupListId, setSelectedGroupListId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [uniqueContentText, setUniqueContentText] = useState('');
  const [uniqueMediaUrl, setUniqueMediaUrl] = useState('');

  // Upload de mídia no postador
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaDragActive, setMediaDragActive] = useState(false);
  const [uploadedMediaName, setUploadedMediaName] = useState<string | null>(null);
  const [uploadedMediaSize, setUploadedMediaSize] = useState<string | null>(null);

  const handleMediaUpload = async (file: File) => {
    if (!file) return;
    setMediaUploadError(null);
    setIsMediaUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.success && res.data.data?.url) {
        setUniqueMediaUrl(res.data.data.url);
        setUploadedMediaName(file.name);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        setUploadedMediaSize(`${sizeMb} MB`);
      } else {
        throw new Error(res.data?.error || 'Falha ao enviar arquivo');
      }
    } catch (err: any) {
      console.error('Erro de upload no Postador:', err);
      const msg = err.response?.data?.error || err.message || 'Erro ao enviar mídia';
      setMediaUploadError(msg);
    } finally {
      setIsMediaUploading(false);
    }
  };

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
      const [campRes, accRes, glRes, libRes, folderRes] = await Promise.allSettled([
        api.get('/campaigns'),
        api.get('/accounts'),
        api.get('/groups/lists'),
        api.get('/library'),
        api.get('/library/folders'),
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
        if (lists.length > 0) {
          setSelectedGroupListId((prev) => (prev && lists.some((l: any) => l.id === prev) ? prev : lists[0].id));
        }
      }
      if (libRes.status === 'fulfilled') {
        setCreatives(libRes.value.data.data || []);
      }
      if (folderRes.status === 'fulfilled') {
        const fList = folderRes.value.data.data || [];
        setFolders(fList);
        if (fList.length > 0) {
          setSelectedFolder((prev) => (prev && fList.some((f: any) => f.id === prev) ? prev : fList[0].id));
        }
      }
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFolder = (f: LibraryFolder) => {
    setSelectedFolder(f.id);
    if (f.config) {
      if (f.config.minInterval) setMinInterval(f.config.minInterval);
      if (f.config.maxInterval) setMaxInterval(f.config.maxInterval);
      if (f.config.batchEnabled !== undefined) setBatchEnabled(f.config.batchEnabled);
      if (f.config.batchSize) setBatchSize(f.config.batchSize);
      if (f.config.batchPauseMinutes) setBatchPauseMinutes(f.config.batchPauseMinutes);
      if (f.config.mediaFormats) setMediaFormats(f.config.mediaFormats);
    }
  };

  const handleSaveCurrentConfigToFolder = async () => {
    if (!selectedFolder) return;
    setSavingFolderConfig(true);
    try {
      const configToSave = {
        minInterval,
        maxInterval,
        batchEnabled,
        batchSize,
        batchPauseMinutes,
        mediaFormats,
        variableMode
      };
      await api.put(`/library/folders/${selectedFolder}`, { config: configToSave });
      setFolderConfigSavedMsg('✓ Configurações salvas dentro da pasta com sucesso!');
      setTimeout(() => setFolderConfigSavedMsg(null), 3500);
      const res = await api.get('/library/folders');
      setFolders(res.data.data || []);
    } catch (err) {
      console.error('Erro ao salvar configurações na pasta:', err);
    } finally {
      setSavingFolderConfig(false);
    }
  };

  const handleQuickCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await api.post('/library/folders', {
        name: newFolderName.trim(),
        color: newFolderColor,
        config: {
          minInterval,
          maxInterval,
          batchEnabled,
          batchSize,
          batchPauseMinutes,
          mediaFormats
        }
      });
      const created = res.data.data;
      setShowNewFolderModal(false);
      setNewFolderName('');
      const resF = await api.get('/library/folders');
      const fList = resF.data.data || [];
      setFolders(fList);
      if (created?.id) setSelectedFolder(created.id);
      setFolderConfigSavedMsg(`✓ Pasta "${created.name}" criada e configurada com sucesso!`);
      setTimeout(() => setFolderConfigSavedMsg(null), 3500);
    } catch (err) {
      console.error('Erro ao criar pasta no postador:', err);
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

    const validAccount = accounts.find((a) => a.cookies && String(a.cookies).length >= 200) || accounts[0];
    const accountId = validAccount?.id;
    let contentText = uniqueContentText;
    let mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT';
    const mediaUrls: string[] = [];

    if (postSourceMode === 'BIBLIOTECA') {
      const activeFolder = selectedFolder || folders[0]?.id;
      if (!activeFolder && folders.length === 0) {
        setFormError('Crie pelo menos 1 pasta na Biblioteca antes de continuar.');
        return;
      }
      const folderCreatives = creatives.filter(
        (c) => c.folder_id === activeFolder || (!c.folder_id && activeFolder === 'f_promocoes')
      );
      const chosen = folderCreatives[0] || creatives[0];
      if (chosen) {
        contentText = chosen.content_text || campaignName;
        if (chosen.media_type === 'IMAGE') mediaType = 'IMAGE';
        else if (chosen.media_type === 'VIDEO') mediaType = 'VIDEO';
        if (chosen.media_urls && Array.isArray(chosen.media_urls)) {
          mediaUrls.push(...chosen.media_urls);
        }
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
  const handleStep = async (id: string) => {
    try { await api.post(`/campaigns/${id}/step`); loadCampaigns(); } catch (e) { console.error(e); }
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

            {/* Card de Informação / Alerta de Mídias e Seleção de Pasta */}
            {postSourceMode === 'BIBLIOTECA' ? (
              <div className="space-y-3">
                {(() => {
                  const selectedFolderObj = folders.find((f) => f.id === selectedFolder);
                  const activeCreativesCount = selectedFolder
                    ? creatives.filter((c) => c.folder_id === selectedFolder || (!c.folder_id && selectedFolder === 'f_promocoes')).length
                    : creatives.length;

                  if (activeCreativesCount > 0) {
                    return (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            <strong>{activeCreativesCount} mídia(s) ativa(s)</strong> prontas na pasta{' '}
                            <strong>{selectedFolderObj?.name || 'padrão'}</strong>.
                          </span>
                        </div>
                        <a
                          href="/library"
                          className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline text-[11px] whitespace-nowrap ml-2"
                        >
                          Biblioteca →
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Nenhuma mídia vinculada a esta pasta ainda.</span>
                      </div>
                      <a
                        href="/library"
                        className="text-amber-700 dark:text-amber-400 font-semibold hover:underline text-[11px] whitespace-nowrap ml-2"
                      >
                        Adicionar na Biblioteca →
                      </a>
                    </div>
                  );
                })()}

                {/* Pasta(s) da biblioteca */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-[#5b5bd6]" />
                      <span>Pasta da Biblioteca</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewFolderModal(true)}
                      className="text-[11px] font-semibold text-[#5b5bd6] hover:text-[#4338ca] flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nova pasta</span>
                    </button>
                  </div>

                  {folders.length === 0 ? (
                    <div className="p-3 border border-dashed border-slate-200 dark:border-[#1e293b] rounded-xl text-center">
                      <p className="text-xs text-slate-500 mb-2">Nenhuma pasta criada ainda.</p>
                      <button
                        type="button"
                        onClick={() => setShowNewFolderModal(true)}
                        className="px-3 py-1.5 bg-[#5b5bd6] text-white rounded-lg text-xs font-semibold hover:bg-[#4338ca] transition-colors"
                      >
                        + Criar primeira pasta
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {folders.map((f) => {
                        const isSelected = selectedFolder === f.id;
                        const count = creatives.filter(
                          (c) => c.folder_id === f.id || (!c.folder_id && f.id === 'f_promocoes')
                        ).length;
                        return (
                          <div
                            key={f.id}
                            onClick={() => handleSelectFolder(f)}
                            role="button"
                            tabIndex={0}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50/70 dark:bg-[#5b5bd6]/15 border-[#5b5bd6] shadow-xs'
                                : 'bg-white dark:bg-[#131c31] border-slate-200 dark:border-[#1e293b] hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: f.color || '#4F46E5' }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                                  {f.name}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {count} {count === 1 ? 'mídia' : 'mídias'}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#5b5bd6] text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Botão de Salvar Configurações nesta pasta */}
                  {selectedFolder && (
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={handleSaveCurrentConfigToFolder}
                        disabled={savingFolderConfig}
                        className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/50 dark:hover:to-purple-900/50 text-xs font-bold text-[#5b5bd6] dark:text-indigo-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                        title="Salva os intervalos de envio, lote e formatos nesta pasta para reutilizar em qualquer campanha"
                      >
                        {savingFolderConfig ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Layers className="w-4 h-4 text-[#5b5bd6] dark:text-indigo-400" />
                        )}
                        <span>Salvar configurações nesta pasta</span>
                      </button>
                    </div>
                  )}

                  {folderConfigSavedMsg && (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{folderConfigSavedMsg}</span>
                    </div>
                  )}
                </div>
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
                  <div className="space-y-3">
                    {/* Upload Dropzone */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Upload de Imagem ou Vídeo
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {mediaFormats.image && mediaFormats.video
                            ? 'PNG, JPG, WEBP, GIF, MP4 ou MOV'
                            : mediaFormats.image
                            ? 'PNG, JPG, WEBP ou GIF (até 15MB)'
                            : 'MP4 ou MOV (até 100MB)'}
                        </span>
                      </div>

                      <div
                        onDragOver={(e) => { e.preventDefault(); setMediaDragActive(true); }}
                        onDragLeave={() => setMediaDragActive(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setMediaDragActive(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleMediaUpload(file);
                        }}
                        className={`relative border-2 border-dashed rounded-2xl p-4 transition-all text-center ${
                          mediaDragActive
                            ? 'border-[#5b5bd6] bg-[#5b5bd6]/10'
                            : 'border-slate-200 dark:border-[#1e293b] hover:border-[#5b5bd6]/60 bg-white dark:bg-[#0f172a]/60'
                        }`}
                      >
                        <input
                          type="file"
                          accept={
                            mediaFormats.image && mediaFormats.video
                              ? 'image/*,video/*'
                              : mediaFormats.image
                              ? 'image/*'
                              : 'video/*'
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMediaUpload(file);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          disabled={isMediaUploading}
                        />

                        {isMediaUploading ? (
                          <div className="flex flex-col items-center justify-center py-3 space-y-2">
                            <Loader2 className="w-8 h-8 text-[#5b5bd6] animate-spin" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Fazendo upload da mídia para o servidor...
                            </span>
                          </div>
                        ) : uniqueMediaUrl ? (
                          <div className="flex items-center gap-3 text-left p-1">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50 shrink-0 relative flex items-center justify-center">
                              {uniqueMediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
                                <Film className="w-8 h-8 text-[#818cf8]" />
                              ) : (
                                <img
                                  src={uniqueMediaUrl}
                                  alt="Prévia"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>Mídia pronta para postagem</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5 font-mono">
                                {uploadedMediaName || uniqueMediaUrl}
                              </p>
                              {uploadedMediaSize && (
                                <span className="text-[10px] text-slate-400 font-mono">{uploadedMediaSize}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUniqueMediaUrl('');
                                setUploadedMediaName(null);
                                setUploadedMediaSize(null);
                              }}
                              className="px-3 py-1.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer z-20"
                            >
                              Trocar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 py-3 cursor-pointer">
                            <div className="w-10 h-10 rounded-xl bg-[#5b5bd6]/10 text-[#5b5bd6] flex items-center justify-center">
                              <UploadCloud className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                Clique para escolher imagem ou vídeo do seu computador
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Ou arraste e solte o arquivo diretamente aqui
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {mediaUploadError && (
                        <div className="mt-2 text-xs text-rose-500 flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{mediaUploadError}</span>
                        </div>
                      )}
                    </div>

                    {/* URL Alternativa */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        URL da Mídia (Imagem ou Vídeo)
                      </label>
                      <input
                        type="text"
                        value={uniqueMediaUrl}
                        onChange={(e) => {
                          setUniqueMediaUrl(e.target.value);
                          setUploadedMediaName(null);
                          setUploadedMediaSize(null);
                        }}
                        placeholder="https://exemplo.com/imagem.png"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#5b5bd6]"
                      />
                    </div>
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
              {groupLists.length > 0 ? (
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
                  Nenhum grupo. Crie uma lista ou sincronize seus grupos.
                </p>
              )}

              <p className="text-xs text-slate-500 font-medium">
                {selectedGroupListId
                  ? `${groupLists.find((l) => l.id === selectedGroupListId)?.total_groups || 0} grupo(s) alvo`
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
                            onClick={() => handleStep(c.id)}
                            title="Enviar próximo grupo agora (pular espera de intervalo)"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs"
                          >
                            <FastForward className="w-3.5 h-3.5 fill-white" />
                            <span>Próximo post agora</span>
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
                            title="Retentar os posts que falharam"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold transition-all shadow-xs"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            <span>Retentar ({c.failed_posts})</span>
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
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 truncate max-w-[80%]">
                          {isRunning && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                          <span className="truncate">{c.current_target_name ? c.current_target_name : 'Progresso geral'}</span>
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white shrink-0">{c.progress_percent}%</span>
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

      {/* Modal: Criar Nova Pasta Rápida */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#5b5bd6]" />
                <span>Nova Pasta da Biblioteca</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateFolder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nome da Pasta
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex.: Promoções Relâmpago, Imóveis..."
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#5b5bd6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Cor da Pasta
                </label>
                <div className="flex items-center gap-2">
                  {['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        newFolderColor === color ? 'scale-125 ring-2 ring-offset-2 ring-[#5b5bd6]' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-[#0f172a] rounded-xl text-[11px] text-slate-500">
                Esta pasta herdará automaticamente os intervalos e lotes configurados nesta tela para você reutilizar sempre que quiser.
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1e293b] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#5b5bd6] text-white text-xs font-semibold rounded-lg hover:bg-[#4338ca] transition-colors"
                >
                  Criar e Selecionar
                </button>
              </div>
            </form>
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
