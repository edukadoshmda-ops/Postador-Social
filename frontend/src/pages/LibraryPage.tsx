import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library,
  Type,
  Image as ImageIcon,
  Film,
  Code2,
  Folder,
  Search,
  Eye,
  Edit3,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Palette,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  Check,
  Send,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api, CreativeItem, LibraryFolder } from '../core/apiService';

type LibraryTab = 'TEXT' | 'IMAGE' | 'VIDEO' | 'VARIABLES' | 'FOLDER';
type ScopeType = 'Comentário' | 'Postagem' | 'Ambos';

const COLOR_SWATCHES = [
  '#4F46E5', '#10B981', '#EF4444', '#F97316', '#06B6D4',
  '#8B5CF6', '#EC4899', '#059669', '#2563EB', '#D97706',
  '#0D9488', '#7C3AED', '#E11D48', '#65A30D', '#1D4ED8',
  '#EA580C', '#0891B2', '#9333EA', '#DC2626', '#16A34A',
  '#3B82F6', '#F59E0B'
];

const INITIAL_DEMO_ITEMS: CreativeItem[] = [
  {
    id: 'item_1',
    title: 'Texto 1',
    category: 'Ambos',
    content_text: 'Oii, tudo bem?',
    media_type: 'TEXT',
    media_urls: [],
    created_at: new Date().toISOString()
  }
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryTab>('TEXT');
  const [isInsertCollapsed, setIsInsertCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [targetScope, setTargetScope] = useState<ScopeType>('Ambos');

  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaContent, setMediaContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);

  const handleFileUpload = async (file: File, expectedType: 'IMAGE' | 'VIDEO') => {
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);

    if (!mediaTitle.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setMediaTitle(nameWithoutExt);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.success && res.data.data?.url) {
        setMediaUrl(res.data.data.url);
        setUploadedFileName(file.name);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        setUploadedFileSize(`${sizeMb} MB`);
      } else {
        throw new Error(res.data?.error || 'Falha ao processar upload');
      }
    } catch (err: any) {
      console.error('Erro de upload:', err);
      const errMsg = err.response?.data?.error || err.message || 'Erro ao enviar arquivo para o servidor';
      setUploadError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#4F46E5');

  const [varName, setVarName] = useState('');
  const [varDescription, setVarDescription] = useState('');

  const [massComment, setMassComment] = useState(false);
  const [massPost, setMassPost] = useState(false);
  const [massImage, setMassImage] = useState(false);

  const [items, setItems] = useState<CreativeItem[]>([]);
  const [itemActiveStates, setItemActiveStates] = useState<Record<string, boolean>>({});
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('ALL');
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [folderFeedback, setFolderFeedback] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<CreativeItem | null>(null);
  const [editingItem, setEditingItem] = useState<CreativeItem | null>(null);

  useEffect(() => {
    loadLibrary();
    loadFolders();
  }, []);

  const loadLibrary = async () => {
    try {
      const res = await api.get('/library');
      const data = res.data.data || [];
      setItems(data);
      const actives: Record<string, boolean> = {};
      data.forEach((i: CreativeItem) => {
        actives[i.id] = true;
      });
      setItemActiveStates(actives);
    } catch (err) {
      console.warn('Erro ao carregar itens da biblioteca:', err);
    }
  };

  const loadFolders = async () => {
    try {
      const res = await api.get('/library/folders');
      const data = res.data.data || [];
      setFolders(data);
      if (data.length > 0 && !targetFolderId) {
        setTargetFolderId(data[0].id);
      }
    } catch (err) {
      console.warn('Erro ao carregar pastas:', err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    try {
      const res = await api.post('/library/folders', {
        name: folderName.trim(),
        color: folderColor,
      });
      const created = res.data.data;
      setFolderName('');
      setFolderFeedback(`✓ Pasta "${created.name}" salva com sucesso!`);
      setTimeout(() => setFolderFeedback(null), 4000);
      await loadFolders();
      if (created?.id) {
        setTargetFolderId(created.id);
      }
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Deseja realmente excluir esta pasta?')) return;
    try {
      await api.delete(`/library/folders/${folderId}`);
      if (selectedFolderFilter === folderId) setSelectedFolderFilter('ALL');
      if (targetFolderId === folderId) setTargetFolderId('');
      await loadFolders();
      await loadLibrary();
    } catch (err) {
      console.error('Erro ao excluir pasta:', err);
    }
  };

  const handleMoveItemToFolder = async (itemId: string, folderId: string) => {
    try {
      await api.post(`/library/items/${itemId}/folder`, { folderId });
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, folder_id: folderId } : i))
      );
      loadFolders();
    } catch (err) {
      console.error('Erro ao mover item para pasta:', err);
    }
  };

  const handleAddText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() && !mediaContent.trim()) return;
    const finalTitle = mediaTitle.trim() || 'Texto ' + (items.length + 1);
    const finalContent = mediaContent.trim() || 'Oii, tudo bem?';

    try {
      const activeFolder = targetFolderId || (folders[0]?.id || null);
      const res = await api.post('/library', {
        title: finalTitle,
        category: targetScope,
        contentText: finalContent,
        mediaType: 'TEXT',
        folderId: activeFolder,
      });
      const created = res.data.data;
      const itemToAdd: CreativeItem = created || {
        id: 'item_' + Date.now(),
        title: finalTitle,
        category: targetScope,
        content_text: finalContent,
        media_type: 'TEXT',
        media_urls: [],
        folder_id: activeFolder,
        created_at: new Date().toISOString()
      };
      setItems((prev) => [itemToAdd, ...prev]);
      setItemActiveStates((prev) => ({ ...prev, [itemToAdd.id]: true }));
      setMediaTitle('');
      setMediaContent('');
      loadFolders();
    } catch (err) {
      console.error('Erro ao salvar texto:', err);
    }
  };

  const handleAddMedia = async (e: React.FormEvent, type: 'IMAGE' | 'VIDEO') => {
    e.preventDefault();
    if (!mediaTitle.trim() && !mediaUrl.trim()) return;
    const finalTitle = mediaTitle.trim() || (type === 'IMAGE' ? 'Imagem ' : 'Vídeo ') + (items.length + 1);

    try {
      const activeFolder = targetFolderId || (folders[0]?.id || null);
      const res = await api.post('/library', {
        title: finalTitle,
        category: targetScope,
        contentText: finalTitle,
        mediaType: type,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        folderId: activeFolder,
      });
      const created = res.data.data;
      const itemToAdd: CreativeItem = created || {
        id: 'item_' + Date.now(),
        title: finalTitle,
        category: targetScope,
        content_text: finalTitle,
        media_type: type,
        media_urls: mediaUrl ? [mediaUrl] : [],
        folder_id: activeFolder,
        created_at: new Date().toISOString()
      };
      setItems((prev) => [itemToAdd, ...prev]);
      setItemActiveStates((prev) => ({ ...prev, [itemToAdd.id]: true }));
      setMediaTitle('');
      setMediaUrl('');
      setUploadedFileName(null);
      setUploadedFileSize(null);
      setUploadError(null);
      loadFolders();
    } catch (err) {
      console.error('Erro ao salvar mídia:', err);
    }
  };

  const toggleItemActive = (id: string) => {
    setItemActiveStates((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }));
  };

  const handleDuplicateItem = async (item: CreativeItem) => {
    try {
      const res = await api.post('/library', {
        title: `${item.title} (Cópia)`,
        category: item.category,
        contentText: item.content_text,
        mediaType: item.media_type,
        mediaUrls: item.media_urls || [],
        folderId: item.folder_id,
      });
      const dup = res.data.data || {
        ...item,
        id: 'item_' + Date.now(),
        title: `${item.title} (Cópia)`
      };
      setItems((prev) => [dup, ...prev]);
      setItemActiveStates((prev) => ({ ...prev, [dup.id]: true }));
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.delete(`/library/${id}`);
      loadFolders();
    } catch (e) {
      console.warn('Excluído localmente', e);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await api.put(`/library/${editingItem.id}`, {
        title: editingItem.title,
        contentText: editingItem.content_text,
        category: editingItem.category,
        folderId: editingItem.folder_id,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? editingItem : i))
      );
      setEditingItem(null);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content_text.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFolderFilter !== 'ALL') {
      const itemFolder = item.folder_id || 'f_promocoes';
      if (itemFolder !== selectedFolderFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-2.5">
        <Library className="w-5 h-5 text-[#5b5bd6] dark:text-[#818cf8] stroke-[2.2]" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Biblioteca
        </h1>
      </div>

      {/* Guia de 4 passos do Tutorial */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-3.5 flex items-center justify-between gap-2 overflow-x-auto shadow-xs text-xs">
        <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
          <Sparkles className="w-4 h-4" />
          <span>Fluxo do Tutorial:</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-[11px] font-medium shrink-0">
          <button type="button" onClick={() => navigate('/aquecedores')} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1e293b] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer">
            1. Aquecedor (Entrar nos Grupos)
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <button type="button" onClick={() => navigate('/listas-grupos')} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1e293b] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer">
            2. Criar Lista de Grupos
          </button>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-bold">3. Biblioteca (Textos & Fotos)</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <button type="button" onClick={() => navigate('/postador')} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1e293b] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer">
            4. Postador PRO (Campanha)
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            INSERIR NOVO
          </span>
          <button
            type="button"
            onClick={() => setIsInsertCollapsed(!isInsertCollapsed)}
            className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-[#1e293b] hover:bg-slate-200 dark:hover:bg-[#2d3b55] text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            {isInsertCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {!isInsertCollapsed && (
          <div className="space-y-5">
            <div className="grid grid-cols-5 border-b border-slate-200 dark:border-slate-800/80 text-xs font-semibold select-none">
              <button type="button" onClick={() => setActiveTab('TEXT')} className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'TEXT' ? 'border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                <Type className="w-4 h-4 stroke-[2.5]" />
                <span>Texto</span>
              </button>
              <button type="button" onClick={() => setActiveTab('IMAGE')} className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'IMAGE' ? 'border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                <ImageIcon className="w-4 h-4" />
                <span>Imagem</span>
              </button>
              <button type="button" onClick={() => setActiveTab('VIDEO')} className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'VIDEO' ? 'border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                <Film className="w-4 h-4" />
                <span>Vídeo</span>
              </button>
              <button type="button" onClick={() => setActiveTab('VARIABLES')} className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'VARIABLES' ? 'border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                <Code2 className="w-4 h-4" />
                <span>Variáveis</span>
              </button>
              <button type="button" onClick={() => setActiveTab('FOLDER')} className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'FOLDER' ? 'border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                <Folder className="w-4 h-4" />
                <span>Pasta</span>
              </button>
            </div>

            {activeTab === 'TEXT' && (
              <form onSubmit={handleAddText} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da mídia</label>
                  <input type="text" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} placeholder="Texto 1" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div>
                  <textarea rows={4} value={mediaContent} onChange={(e) => setMediaContent(e.target.value)} placeholder="Oii, tudo bem?" className="w-full px-4 py-3 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#4f46e5] resize-y" />
                </div>
                <div className="grid grid-cols-3 gap-2 select-none">
                  {(['Comentário', 'Postagem', 'Ambos'] as ScopeType[]).map((sc) => (
                    <button key={sc} type="button" onClick={() => setTargetScope(sc)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${targetScope === sc ? 'bg-[#4f46e5]/30 text-[#818cf8] border-[#4f46e5] shadow-xs font-bold' : 'bg-white dark:bg-[#0b1021] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>
                      {sc}
                    </button>
                  ))}
                </div>
                {folders.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Salvar na pasta
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTargetFolderId(f.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            targetFolderId === f.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-[#818cf8] border-[#4f46e5] shadow-xs'
                              : 'bg-white dark:bg-[#0b1021] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                          <span>{f.name}</span>
                          {targetFolderId === f.id && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <button type="submit" className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">Adicionar Texto</button>
                </div>
              </form>
            )}

            {activeTab === 'IMAGE' && (
              <form onSubmit={(e) => handleAddMedia(e, 'IMAGE')} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da mídia</label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="Ex.: Banner de Lançamento"
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]"
                  />
                </div>

                {/* Upload do Computador */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Upload da Imagem
                    </label>
                    <span className="text-[11px] text-slate-400">PNG, JPG, WEBP ou GIF (até 15MB)</span>
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file, 'IMAGE');
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-4 transition-all text-center ${
                      dragActive
                        ? 'border-[#4f46e5] bg-[#4f46e5]/10'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-[#4f46e5]/60 bg-slate-50/50 dark:bg-[#0b1021]/50'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'IMAGE');
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      disabled={isUploading}
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center py-3 space-y-2">
                        <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Fazendo upload da imagem para o servidor...
                        </span>
                      </div>
                    ) : mediaUrl ? (
                      <div className="flex items-center gap-3 text-left p-1">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50 shrink-0 relative flex items-center justify-center">
                          <img
                            src={mediaUrl}
                            alt="Prévia"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Imagem pronta</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            {uploadedFileName || mediaUrl}
                          </p>
                          {uploadedFileSize && (
                            <span className="text-[10px] text-slate-400 font-mono">{uploadedFileSize}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaUrl('');
                            setUploadedFileName(null);
                            setUploadedFileSize(null);
                          }}
                          className="px-3 py-1.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer z-20"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-3 cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Clique para escolher do computador ou arraste aqui
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            O arquivo é carregado automaticamente
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="mt-2 text-xs text-rose-500 flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                {/* URL Alternativa */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    URL da Imagem
                  </label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      setUploadedFileName(null);
                      setUploadedFileSize(null);
                    }}
                    placeholder="https://meusite.com/banner.jpg"
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 select-none">
                  {(['Comentário', 'Postagem', 'Ambos'] as ScopeType[]).map((sc) => (
                    <button key={sc} type="button" onClick={() => setTargetScope(sc)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${targetScope === sc ? 'bg-[#4f46e5]/30 text-[#818cf8] border-[#4f46e5] shadow-xs font-bold' : 'bg-white dark:bg-[#0b1021] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>
                      {sc}
                    </button>
                  ))}
                </div>
                {folders.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Salvar na pasta
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTargetFolderId(f.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            targetFolderId === f.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-[#818cf8] border-[#4f46e5] shadow-xs'
                              : 'bg-white dark:bg-[#0b1021] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                          <span>{f.name}</span>
                          {targetFolderId === f.id && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <button type="submit" disabled={isUploading} className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50">
                    Adicionar Imagem
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'VIDEO' && (
              <form onSubmit={(e) => handleAddMedia(e, 'VIDEO')} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da mídia</label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="Ex.: Vídeo Demonstrativo"
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]"
                  />
                </div>

                {/* Upload de Vídeo */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Upload de Vídeo
                    </label>
                    <span className="text-[11px] text-slate-400">MP4 ou MOV (até 100MB)</span>
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file, 'VIDEO');
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-4 transition-all text-center ${
                      dragActive
                        ? 'border-[#4f46e5] bg-[#4f46e5]/10'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-[#4f46e5]/60 bg-slate-50/50 dark:bg-[#0b1021]/50'
                    }`}
                  >
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'VIDEO');
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      disabled={isUploading}
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center py-3 space-y-2">
                        <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Fazendo upload do vídeo para o servidor...
                        </span>
                      </div>
                    ) : mediaUrl ? (
                      <div className="flex items-center gap-3 text-left p-1">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50 shrink-0 relative flex items-center justify-center">
                          <Film className="w-8 h-8 text-[#818cf8]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Vídeo pronto</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            {uploadedFileName || mediaUrl}
                          </p>
                          {uploadedFileSize && (
                            <span className="text-[10px] text-slate-400 font-mono">{uploadedFileSize}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaUrl('');
                            setUploadedFileName(null);
                            setUploadedFileSize(null);
                          }}
                          className="px-3 py-1.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer z-20"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-3 cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Clique para escolher vídeo do computador ou arraste aqui
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            O arquivo é carregado automaticamente
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="mt-2 text-xs text-rose-500 flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                {/* URL Alternativa */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    URL do Vídeo
                  </label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      setUploadedFileName(null);
                      setUploadedFileSize(null);
                    }}
                    placeholder="https://meusite.com/video.mp4"
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 select-none">
                  {(['Comentário', 'Postagem', 'Ambos'] as ScopeType[]).map((sc) => (
                    <button key={sc} type="button" onClick={() => setTargetScope(sc)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${targetScope === sc ? 'bg-[#4f46e5]/30 text-[#818cf8] border-[#4f46e5] shadow-xs font-bold' : 'bg-white dark:bg-[#0b1021] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>
                      {sc}
                    </button>
                  ))}
                </div>
                {folders.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Salvar na pasta
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTargetFolderId(f.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            targetFolderId === f.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-[#818cf8] border-[#4f46e5] shadow-xs'
                              : 'bg-white dark:bg-[#0b1021] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                          <span>{f.name}</span>
                          {targetFolderId === f.id && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <button type="submit" disabled={isUploading} className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50">
                    Adicionar Vídeo
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'VARIABLES' && (
              <form onSubmit={(e) => { e.preventDefault(); if (!varName.trim()) return; const finalVar = varName.startsWith('{') ? varName : `{${varName}}`; const newItem: CreativeItem = { id: 'item_' + Date.now(), title: finalVar, category: 'Variável', content_text: varDescription || finalVar, media_type: 'TEXT', media_urls: [], created_at: new Date().toISOString() }; setItems((prev) => [newItem, ...prev]); setItemActiveStates((prev) => ({ ...prev, [newItem.id]: true })); setVarName(''); setVarDescription(''); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da variável</label>
                  <input type="text" value={varName} onChange={(e) => setVarName(e.target.value)} placeholder="Ex.: {primeiro_nome}" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Descrição</label>
                  <input type="text" value={varDescription} onChange={(e) => setVarDescription(e.target.value)} placeholder="Ex.: Olá|Oi" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div>
                  <button type="submit" className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">Adicionar Variável</button>
                </div>
              </form>
            )}

            {activeTab === 'FOLDER' && (
              <form onSubmit={handleCreateFolder} className="space-y-3.5">
                {folderFeedback && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{folderFeedback}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da pasta</label>
                  <input type="text" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Ex.: Promoções" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#4f46e5]" required />
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {COLOR_SWATCHES.map((hex) => (
                    <button key={hex} type="button" onClick={() => setFolderColor(hex)} style={{ backgroundColor: hex }} className={`w-7 h-7 rounded-full transition-all cursor-pointer ${folderColor.toUpperCase() === hex.toUpperCase() ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0c1222] ring-[#4F46E5] scale-110 shadow-xs' : 'hover:scale-105'}`} />
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-0.5">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0f172a] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors shadow-xs">
                    <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Cor personalizada</span>
                    <input type="color" value={folderColor} onChange={(e) => setFolderColor(e.target.value)} className="sr-only" />
                  </label>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0f172a] text-xs font-mono text-slate-600 dark:text-slate-400 shadow-xs">
                    <div className="w-4 h-4 rounded-md shrink-0" style={{ backgroundColor: folderColor }} />
                    <span>{folderColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <button type="submit" className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">Criar pasta</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Pastas da Biblioteca (Persistentes e organizadas) */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-3xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-[#5b5bd6] dark:text-[#818cf8]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Pastas Salvas ({folders.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsInsertCollapsed(false);
              setActiveTab('FOLDER');
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#5b5bd6] dark:text-[#818cf8] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Nova pasta</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Todas as mídias */}
          <button
            type="button"
            onClick={() => setSelectedFolderFilter('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
              selectedFolderFilter === 'ALL'
                ? 'bg-[#5b5bd6] text-white border-[#5b5bd6] shadow-xs'
                : 'bg-slate-50 dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100'
            }`}
          >
            <span>Todas as mídias</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedFolderFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {items.length}
            </span>
          </button>

          {/* Pastas individuais com drop zone */}
          {folders.map((f) => (
            <div
              key={f.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('scale-105', 'ring-2', 'ring-indigo-500');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('scale-105', 'ring-2', 'ring-indigo-500');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('scale-105', 'ring-2', 'ring-indigo-500');
                const itemId = e.dataTransfer.getData('text/plain');
                if (itemId) {
                  handleMoveItemToFolder(itemId, f.id);
                  setFolderFeedback(`✓ Item movido para a pasta "${f.name}"!`);
                  setTimeout(() => setFolderFeedback(null), 3000);
                }
              }}
              onClick={() => setSelectedFolderFilter(f.id)}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer select-none ${
                selectedFolderFilter === f.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-400 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
              <span>{f.name}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {f.count || 0}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/postador?folderId=${f.id}`);
                }}
                className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-500 hover:text-indigo-600 transition-opacity"
                title="Criar campanha com esta pasta no Postador PRO"
              >
                <Send className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(f.id);
                }}
                className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-500 transition-opacity"
                title="Excluir pasta"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-[#1e293b] rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#4f46e5] shadow-xs" />
      </div>

      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-4 space-y-2.5 shadow-xs">
        <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Habilitar mídias em massa</span>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button type="button" role="switch" aria-checked={massComment} onClick={() => setMassComment(!massComment)} className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${massComment ? 'bg-[#5b5bd6]' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${massComment ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs text-slate-700 dark:text-slate-300">Comentário</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button type="button" role="switch" aria-checked={massPost} onClick={() => setMassPost(!massPost)} className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${massPost ? 'bg-[#5b5bd6]' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${massPost ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs text-slate-700 dark:text-slate-300">Postagem</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button type="button" role="switch" aria-checked={massImage} onClick={() => setMassImage(!massImage)} className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${massImage ? 'bg-[#5b5bd6]' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${massImage ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs text-slate-700 dark:text-slate-300">Imagem</span>
          </label>
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
            className="p-3.5 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all select-none cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-semibold text-xs text-slate-800 dark:text-white truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {folders.length > 0 && (
                <select
                  value={item.folder_id || (folders.find(f => f.name === 'Promoções')?.id || folders[0]?.id || '')}
                  onChange={(e) => handleMoveItemToFolder(item.id, e.target.value)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  title="Mudar pasta deste item"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">{item.category || 'Ambos'}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" role="switch" aria-checked={itemActiveStates[item.id] !== false} onClick={() => toggleItemActive(item.id)} className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${itemActiveStates[item.id] !== false ? 'bg-[#5b5bd6]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${itemActiveStates[item.id] !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ativo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setPreviewItem(item)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-[#334155] flex items-center justify-center"><Eye className="w-4 h-4 text-slate-500" /></button>
                <button type="button" onClick={() => setEditingItem(item)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-[#334155] flex items-center justify-center"><Edit3 className="w-4 h-4 text-slate-500" /></button>
                <button type="button" onClick={() => handleDuplicateItem(item)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-[#334155] flex items-center justify-center"><Copy className="w-4 h-4 text-slate-500" /></button>
                <button type="button" onClick={() => handleDelete(item.id)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-700/80 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center"><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between"><h3 className="font-bold text-sm text-slate-800 dark:text-white">{previewItem.title}</h3><button type="button" onClick={() => setPreviewItem(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button></div>
            <div className="p-3.5 bg-slate-50 dark:bg-[#0b1021] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{previewItem.content_text}</div>
            <div className="flex justify-end"><button type="button" onClick={() => setPreviewItem(null)} className="px-4 py-2 bg-[#4f46e5] text-white text-xs font-semibold rounded-xl">Fechar</button></div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between"><h3 className="font-bold text-sm text-slate-800 dark:text-white">Editar Mídia</h3><button type="button" onClick={() => setEditingItem(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button></div>
            <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Título</label><input type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} className="w-full px-3.5 py-2 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Conteúdo</label><textarea rows={4} value={editingItem.content_text} onChange={(e) => setEditingItem({ ...editingItem, content_text: e.target.value })} className="w-full px-3.5 py-2 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white resize-y" /></div>
            <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 bg-slate-100 dark:bg-[#1e293b] text-slate-700 text-xs font-semibold rounded-xl">Cancelar</button><button type="button" onClick={handleSaveEdit} className="px-4 py-2 bg-[#4f46e5] text-white text-xs font-semibold rounded-xl">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
