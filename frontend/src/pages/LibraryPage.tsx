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
  ChevronRight,
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
  ArrowRight,
  MoreVertical,
  SlidersHorizontal,
  FolderInput
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

const DEFAULT_FOLDERS: LibraryFolder[] = [
  { id: 'f_venda_sem_trafego', name: 'Venda sem tráfego pago', color: '#4F46E5', count: 6 },
  { id: 'f_venda_carros', name: 'VENDA DE CARROS', color: '#EF4444', count: 6 },
  { id: 'f_maes', name: 'GRUPO MÃES', color: '#EC4899', count: 6 }
];

const DEFAULT_ITEMS: CreativeItem[] = [
  {
    id: 'item_mae_img_1',
    title: 'IMAGEM 1',
    category: 'Ambos',
    content_text: 'Roupas, brinquedos e utilidades para os pequenos no grupo de achadinhos',
    media_type: 'IMAGE',
    media_urls: ['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80'],
    folder_id: 'f_maes',
    created_at: new Date().toISOString()
  },
  {
    id: 'item_mae_img_3',
    title: 'IMAGEM 3',
    category: 'Ambos',
    content_text: 'Mães, olha os achadinhos que encontrei para os pequenos! Entre no grupo',
    media_type: 'IMAGE',
    media_urls: ['https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500&auto=format&fit=crop&q=80'],
    folder_id: 'f_maes',
    created_at: new Date().toISOString()
  },
  {
    id: 'item_mae_img_2',
    title: 'IMAGEM 2',
    category: 'Ambos',
    content_text: 'Achadinhos e utilidades para mamães',
    media_type: 'IMAGE',
    media_urls: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80'],
    folder_id: 'f_maes',
    created_at: new Date().toISOString()
  },
  {
    id: 'item_mae_txt_1',
    title: 'TEXTO 1',
    category: 'Ambos',
    content_text: 'Oi mamães! Criei um grupo no WhatsApp com os melhores achadinhos e descontos para bebês e crianças. Quem quiser entrar comenta EU!',
    media_type: 'TEXT',
    media_urls: [],
    folder_id: 'f_maes',
    created_at: new Date().toISOString()
  },
  {
    id: 'item_mae_txt_2',
    title: 'texto 2',
    category: 'Ambos',
    content_text: 'Dica do dia para mães práticas: economize em roupinhas e brinquedos educativos direto dos fornecedores. Link no primeiro comentário!',
    media_type: 'TEXT',
    media_urls: [],
    folder_id: 'f_maes',
    created_at: new Date().toISOString()
  },
  {
    id: 'item_mae_txt_3',
    title: 'TEXTO 3',
    category: 'Ambos',
    content_text: 'Achadinhos de mães com até 70% de desconto na Shopee e Mercado Livre. Entre no grupo VIP para receber em primeira mão.',
    media_type: 'TEXT',
    media_urls: [],
    folder_id: 'f_maes',
    created_at: new Date().toISOString()
  },
  {
    id: 'item_txt_01',
    title: 'TEXTO 01',
    category: 'Ambos',
    content_text: 'Olá pessoal, tudo bem? Confiram essa novidade incrível!',
    media_type: 'TEXT',
    media_urls: [],
    folder_id: undefined,
    created_at: new Date().toISOString()
  }
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryTab>('FOLDER');
  const [isInsertCollapsed, setIsInsertCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetScope, setTargetScope] = useState<ScopeType>('Ambos');

  // New media inputs
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaContent, setMediaContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);

  // New folder inputs
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#4F46E5');

  // Variables inputs
  const [varName, setVarName] = useState('');
  const [varDescription, setVarDescription] = useState('');

  // Mass toggles
  const [massComment, setMassComment] = useState(false);
  const [massPost, setMassPost] = useState(false);
  const [massImage, setMassImage] = useState(true);

  // Library & Folders state
  const [items, setItems] = useState<CreativeItem[]>([]);
  const [itemActiveStates, setItemActiveStates] = useState<Record<string, boolean>>({});
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [folderFeedback, setFolderFeedback] = useState<string | null>(null);

  // Accordion state: set of open folder IDs
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set(['f_maes']));

  // Modals & Item Actions
  const [previewItem, setPreviewItem] = useState<CreativeItem | null>(null);
  const [editingItem, setEditingItem] = useState<CreativeItem | null>(null);
  const [movingItem, setMovingItem] = useState<CreativeItem | null>(null);
  const [folderToEditColor, setFolderToEditColor] = useState<LibraryFolder | null>(null);
  const [folderToRename, setFolderToRename] = useState<LibraryFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadLibrary();
    loadFolders();
  }, []);

  const loadLibrary = async () => {
    try {
      const res = await api.get('/library');
      const data = res.data.data || [];
      if (data.length === 0) {
        setItems(DEFAULT_ITEMS);
        const actives: Record<string, boolean> = {};
        DEFAULT_ITEMS.forEach((i) => { actives[i.id] = true; });
        setItemActiveStates(actives);
      } else {
        setItems(data);
        const actives: Record<string, boolean> = {};
        data.forEach((i: CreativeItem) => { actives[i.id] = true; });
        setItemActiveStates(actives);
      }
    } catch (err) {
      console.warn('Erro ao carregar itens da biblioteca:', err);
      setItems(DEFAULT_ITEMS);
    }
  };

  const loadFolders = async () => {
    try {
      const res = await api.get('/library/folders');
      const data = res.data.data || [];
      if (data.length === 0) {
        setFolders(DEFAULT_FOLDERS);
        setTargetFolderId(DEFAULT_FOLDERS[0].id);
      } else {
        setFolders(data);
        if (data.length > 0 && !targetFolderId) {
          setTargetFolderId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar pastas:', err);
      setFolders(DEFAULT_FOLDERS);
    }
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
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
      setFolderFeedback(`✓ Pasta "${created?.name || folderName}" criada com sucesso!`);
      setTimeout(() => setFolderFeedback(null), 4000);
      await loadFolders();
      if (created?.id) {
        setTargetFolderId(created.id);
        setExpandedFolderIds((prev) => new Set([...prev, created.id]));
      }
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
      const newF: LibraryFolder = {
        id: 'f_' + Date.now(),
        name: folderName.trim(),
        color: folderColor,
        count: 0
      };
      setFolders((prev) => [newF, ...prev]);
      setExpandedFolderIds((prev) => new Set([...prev, newF.id]));
      setFolderName('');
    }
  };

  const handleUpdateFolderColor = async (folderId: string, color: string) => {
    try {
      await api.put(`/library/folders/${folderId}`, { color });
      setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, color } : f)));
      setFolderToEditColor(null);
    } catch (err) {
      console.error('Erro ao atualizar cor:', err);
      setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, color } : f)));
      setFolderToEditColor(null);
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameValue.trim()) return;
    const fId = folderToRename.id;
    const newName = renameValue.trim();
    try {
      await api.put(`/library/folders/${fId}`, { name: newName });
      setFolders((prev) => prev.map((f) => (f.id === fId ? { ...f, name: newName } : f)));
      setFolderToRename(null);
      setRenameValue('');
    } catch (err) {
      console.error('Erro ao renomear pasta:', err);
      setFolders((prev) => prev.map((f) => (f.id === fId ? { ...f, name: newName } : f)));
      setFolderToRename(null);
      setRenameValue('');
    }
  };

  const handleEmptyFolder = async (folderId: string) => {
    const f = folders.find((item) => item.id === folderId);
    if (!confirm(`Deseja desassociar todos os itens da pasta "${f?.name || ''}"?`)) return;
    try {
      await api.post(`/library/folders/${folderId}/empty`);
    } catch (e) {
      console.warn(e);
    }
    setItems((prev) => prev.map((item) => (item.folder_id === folderId ? { ...item, folder_id: undefined } : item)));
    setFolders((prev) => prev.map((item) => (item.id === folderId ? { ...item, count: 0 } : item)));
    setFolderFeedback(`✓ Pasta "${f?.name}" esvaziada.`);
    setTimeout(() => setFolderFeedback(null), 3000);
  };

  const handleDeleteFolder = async (folderId: string) => {
    const f = folders.find((item) => item.id === folderId);
    if (!confirm(`Deseja realmente excluir a pasta "${f?.name || ''}"?`)) return;
    try {
      await api.delete(`/library/folders/${folderId}`);
    } catch (err) {
      console.error('Erro ao excluir pasta:', err);
    }
    setFolders((prev) => prev.filter((item) => item.id !== folderId));
    setItems((prev) => prev.map((item) => (item.folder_id === folderId ? { ...item, folder_id: undefined } : item)));
  };

  const handleMoveItemToFolder = async (itemId: string, folderId: string | null) => {
    try {
      await api.post(`/library/items/${itemId}/folder`, { folderId });
    } catch (err) {
      console.error('Erro ao mover item para pasta:', err);
    }
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, folder_id: folderId || undefined } : i)));
    setMovingItem(null);
  };

  const handleAddText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() && !mediaContent.trim()) return;
    const finalTitle = mediaTitle.trim() || 'TEXTO ' + (items.length + 1);
    const finalContent = mediaContent.trim() || 'Olá! Confira nossa novidade.';
    const activeFolder = targetFolderId || folders[0]?.id || undefined;

    try {
      const res = await api.post('/library', {
        title: finalTitle,
        category: targetScope,
        contentText: finalContent,
        mediaType: 'TEXT',
        folderId: activeFolder,
      });
      const created = res.data.data || {
        id: 'item_' + Date.now(),
        title: finalTitle,
        category: targetScope,
        content_text: finalContent,
        media_type: 'TEXT',
        media_urls: [],
        folder_id: activeFolder,
        created_at: new Date().toISOString()
      };
      setItems((prev) => [created, ...prev]);
      setItemActiveStates((prev) => ({ ...prev, [created.id]: true }));
      setMediaTitle('');
      setMediaContent('');
      setFolderFeedback(`✓ ${finalTitle} adicionado com sucesso!`);
      setTimeout(() => setFolderFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleAddMedia = async (e: React.FormEvent, type: 'IMAGE' | 'VIDEO') => {
    e.preventDefault();
    if (!mediaTitle.trim() && !mediaUrl.trim()) return;
    const finalTitle = mediaTitle.trim() || (type === 'IMAGE' ? 'IMAGEM ' : 'VÍDEO ') + (items.length + 1);
    const activeFolder = targetFolderId || folders[0]?.id || undefined;

    try {
      const res = await api.post('/library', {
        title: finalTitle,
        category: targetScope,
        contentText: finalTitle,
        mediaType: type,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        folderId: activeFolder,
      });
      const created = res.data.data || {
        id: 'item_' + Date.now(),
        title: finalTitle,
        category: targetScope,
        content_text: finalTitle,
        media_type: type,
        media_urls: mediaUrl ? [mediaUrl] : [],
        folder_id: activeFolder,
        created_at: new Date().toISOString()
      };
      setItems((prev) => [created, ...prev]);
      setItemActiveStates((prev) => ({ ...prev, [created.id]: true }));
      setMediaTitle('');
      setMediaUrl('');
      setUploadedFileName(null);
      setUploadedFileSize(null);
      setUploadError(null);
      setFolderFeedback(`✓ ${finalTitle} adicionado com sucesso!`);
      setTimeout(() => setFolderFeedback(null), 3000);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.delete(`/library/${id}`);
    } catch (e) {
      console.warn(e);
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
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? editingItem : i)));
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.content_text && item.content_text.toLowerCase().includes(q))
    );
  });

  // Items outside any folder
  const unassignedItems = filteredItems.filter((i) => !i.folder_id || !folders.some((f) => f.id === i.folder_id));

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16 px-2 sm:px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Library className="w-5 h-5 text-[#5b5bd6] dark:text-[#818cf8] stroke-[2.2]" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Biblioteca
          </h1>
        </div>
      </div>

      {/* Banner 4 passos do Tutorial */}
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

      {folderFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{folderFeedback}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAINEL INSERIR NOVO (Exatamente igual ao print da imagem 1) */}
      {/* ========================================================= */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-5 space-y-4 shadow-xl text-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            INSERIR NOVO
          </span>
          <button
            type="button"
            onClick={() => setIsInsertCollapsed(!isInsertCollapsed)}
            className="w-7 h-7 rounded-xl bg-[#1e293b] hover:bg-[#2d3b55] text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            {isInsertCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {!isInsertCollapsed && (
          <div className="space-y-4">
            {/* Abas: Texto | Imagem | Vídeo | { } Variáveis | Pasta */}
            <div className="grid grid-cols-5 border-b border-[#1e293b] text-xs font-semibold select-none">
              <button
                type="button"
                onClick={() => setActiveTab('TEXT')}
                className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'TEXT'
                    ? 'border-[#5b5bd6] text-[#818cf8] bg-[#5b5bd6]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Texto</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('IMAGE')}
                className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'IMAGE'
                    ? 'border-[#5b5bd6] text-[#818cf8] bg-[#5b5bd6]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Imagem</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('VIDEO')}
                className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'VIDEO'
                    ? 'border-[#5b5bd6] text-[#818cf8] bg-[#5b5bd6]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Vídeo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('VARIABLES')}
                className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'VARIABLES'
                    ? 'border-[#5b5bd6] text-[#818cf8] bg-[#5b5bd6]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Variáveis</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('FOLDER')}
                className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'FOLDER'
                    ? 'border-[#5b5bd6] text-[#818cf8] bg-[#5b5bd6]/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>Pasta</span>
              </button>
            </div>

            {/* CONTEÚDO DA ABA PASTA (Exatamente igual à Imagem 1) */}
            {activeTab === 'FOLDER' && (
              <form onSubmit={handleCreateFolder} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome da pasta
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Ex.: Promoções"
                    className="w-full px-4 py-2.5 bg-[#0b1021] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5b5bd6]"
                    required
                  />
                </div>

                {/* Seletor com as 22 cores em bolinhas redondas */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {COLOR_SWATCHES.map((hex) => {
                    const isSelected = folderColor.toUpperCase() === hex.toUpperCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setFolderColor(hex)}
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-offset-2 ring-offset-[#121b2d] ring-white scale-110' : 'hover:scale-110 opacity-90 hover:opacity-100'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Cor personalizada com preview do código hex */}
                <div className="flex items-center gap-3 pt-0.5">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-[#0f172a] text-xs font-medium text-slate-300 cursor-pointer hover:bg-[#1e293b] transition-colors">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cor personalizada</span>
                    <input
                      type="color"
                      value={folderColor}
                      onChange={(e) => setFolderColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-[#0f172a] text-xs font-mono text-slate-300">
                    <div className="w-4 h-4 rounded-md shrink-0" style={{ backgroundColor: folderColor }} />
                    <span>{folderColor.toUpperCase()}</span>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#5054d4] hover:bg-[#4347c4] text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Criar pasta
                  </button>
                </div>
              </form>
            )}

            {/* CONTEÚDO DA ABA TEXTO */}
            {activeTab === 'TEXT' && (
              <form onSubmit={handleAddText} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome da mídia
                  </label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="Ex.: Texto 1"
                    className="w-full px-4 py-2.5 bg-[#0b1021] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5b5bd6]"
                  />
                </div>
                <div>
                  <textarea
                    rows={4}
                    value={mediaContent}
                    onChange={(e) => setMediaContent(e.target.value)}
                    placeholder="Digite o texto da postagem (suporta Spintax {oi|olá})..."
                    className="w-full px-4 py-3 bg-[#0b1021] border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5b5bd6] resize-y"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 select-none">
                  {(['Comentário', 'Postagem', 'Ambos'] as ScopeType[]).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setTargetScope(sc)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        targetScope === sc
                          ? 'bg-[#5b5bd6]/30 text-[#818cf8] border-[#5b5bd6] shadow-xs font-bold'
                          : 'bg-[#0b1021] text-slate-400 border-slate-700/80 hover:bg-[#182343]'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
                {folders.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                              ? 'bg-indigo-950/80 text-[#818cf8] border-[#818cf8]'
                              : 'bg-[#0b1021] text-slate-400 border-slate-700'
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
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#5054d4] hover:bg-[#4347c4] text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Adicionar Texto
                  </button>
                </div>
              </form>
            )}

            {/* CONTEÚDO DA ABA IMAGEM */}
            {activeTab === 'IMAGE' && (
              <form onSubmit={(e) => handleAddMedia(e, 'IMAGE')} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome da mídia
                  </label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="Ex.: Imagem 1"
                    className="w-full px-4 py-2.5 bg-[#0b1021] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5b5bd6]"
                  />
                </div>

                <div>
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
                      dragActive ? 'border-[#5b5bd6] bg-[#5b5bd6]/10' : 'border-slate-700/80 bg-[#0b1021]/50'
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
                      <div className="flex flex-col items-center py-3 space-y-2">
                        <Loader2 className="w-8 h-8 text-[#5b5bd6] animate-spin" />
                        <span className="text-xs text-slate-300">Enviando imagem...</span>
                      </div>
                    ) : mediaUrl ? (
                      <div className="flex items-center gap-3 p-1">
                        <img src={mediaUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-700" />
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Imagem pronta
                          </span>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{uploadedFileName || mediaUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMediaUrl(''); }}
                          className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-3 cursor-pointer">
                        <UploadCloud className="w-6 h-6 text-indigo-400" />
                        <p className="text-xs font-semibold text-slate-300">Clique para enviar imagem do computador ou arraste aqui</p>
                      </div>
                    )}
                  </div>
                  {uploadError && <p className="text-xs text-rose-400 mt-1">{uploadError}</p>}
                </div>

                {folders.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                              ? 'bg-indigo-950/80 text-[#818cf8] border-[#818cf8]'
                              : 'bg-[#0b1021] text-slate-400 border-slate-700'
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
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 bg-[#5054d4] hover:bg-[#4347c4] text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Adicionar Imagem
                  </button>
                </div>
              </form>
            )}

            {/* CONTEÚDO DA ABA VÍDEO */}
            {activeTab === 'VIDEO' && (
              <form onSubmit={(e) => handleAddMedia(e, 'VIDEO')} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome do vídeo
                  </label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="Ex.: Vídeo 1"
                    className="w-full px-4 py-2.5 bg-[#0b1021] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5b5bd6]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://... URL do vídeo MP4"
                    className="w-full px-4 py-2.5 bg-[#0b1021] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5b5bd6]"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#5054d4] hover:bg-[#4347c4] text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Adicionar Vídeo
                  </button>
                </div>
              </form>
            )}

            {/* CONTEÚDO DA ABA VARIÁVEIS */}
            {activeTab === 'VARIABLES' && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-400">
                  Use variáveis dinâmicas nas suas postagens como {'{primeiro_nome}'}, {'{saudacao}'}, etc.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={varName}
                    onChange={(e) => setVarName(e.target.value)}
                    placeholder="Ex.: {saudacao}"
                    className="flex-1 px-4 py-2 bg-[#0b1021] border border-slate-700/80 rounded-xl text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!varName.trim()) return;
                      setFolderFeedback(`✓ Variável ${varName} salva!`);
                      setVarName('');
                      setTimeout(() => setFolderFeedback(null), 3000);
                    }}
                    className="px-4 py-2 bg-[#5054d4] text-white text-xs font-semibold rounded-xl"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* CAMPO DE BUSCA (Exatamente igual ao print da imagem 1)    */}
      {/* ========================================================= */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-11 pr-4 py-2.5 bg-[#121b2d] border border-[#1e293b] rounded-2xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5b5bd6] shadow-xs"
        />
      </div>

      {/* ========================================================= */}
      {/* HABILITAR MÍDIAS EM MASSA (Imagem 1)                      */}
      {/* ========================================================= */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 space-y-2.5 shadow-xs">
        <span className="block text-xs font-semibold text-slate-400">
          Habilitar mídias em massa
        </span>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={massComment}
              onClick={() => setMassComment(!massComment)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                massComment ? 'bg-[#5054d4]' : 'bg-slate-700'
              }`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                massComment ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
            <span className="text-xs text-slate-300">Comentário</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={massPost}
              onClick={() => setMassPost(!massPost)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                massPost ? 'bg-[#5054d4]' : 'bg-slate-700'
              }`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                massPost ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
            <span className="text-xs text-slate-300">Postagem</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={massImage}
              onClick={() => setMassImage(!massImage)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                massImage ? 'bg-[#5054d4]' : 'bg-slate-700'
              }`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                massImage ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
            <span className="text-xs text-slate-300">Imagem</span>
          </label>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LISTA DE PASTAS EM FORMATO ACCORDION (Imagens 1 e 2)      */}
      {/* ========================================================= */}
      <div className="space-y-3.5">
        {folders.map((folder) => {
          const isOpen = expandedFolderIds.has(folder.id);
          const folderItems = filteredItems.filter((i) => i.folder_id === folder.id);
          const itemCount = folderItems.length;

          return (
            <div
              key={folder.id}
              className="bg-[#121b2d] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm transition-all"
            >
              {/* Barra da Pasta (Exatamente como nas Imagens 1 e 2) */}
              <div
                onClick={() => toggleFolderExpand(folder.id)}
                className="w-full px-4 py-3 bg-[#1e2738] hover:bg-[#253044] flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Ícone de pasta com a cor configurada */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: `${folder.color}25`, color: folder.color, border: `1px solid ${folder.color}50` }}
                  >
                    <Folder className="w-4 h-4 fill-current" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-white tracking-wide uppercase truncate">
                      {folder.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 block">
                      {itemCount} item(ns)
                    </span>
                  </div>
                </div>

                {/* Seta chevron: > quando fechado, v quando aberto */}
                <div className="text-slate-400 shrink-0">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>

              {/* CONTEÚDO DA PASTA QUANDO ABERTA (Imagem 2) */}
              {isOpen && (
                <div className="p-4 space-y-4 border-t border-[#1e293b] bg-[#0e1626]">
                  {/* Sub-barra de Ações da Pasta (Imagem 2) */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[#1e293b]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Botão Alterar cor */}
                      <button
                        type="button"
                        onClick={() => setFolderToEditColor(folder)}
                        className="px-3 py-1.5 rounded-full bg-[#1b2537] hover:bg-[#243147] border border-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                      >
                        Alterar cor
                      </button>

                      {/* Botão Esvaziar pasta */}
                      <button
                        type="button"
                        onClick={() => handleEmptyFolder(folder.id)}
                        className="px-3 py-1.5 rounded-full bg-[#1b2537] hover:bg-[#243147] border border-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                      >
                        Esvaziar pasta
                      </button>

                      {/* Botão Lápis (editar nome) */}
                      <button
                        type="button"
                        onClick={() => {
                          setFolderToRename(folder);
                          setRenameValue(folder.name);
                        }}
                        className="w-7 h-7 rounded-xl bg-[#1b2537] hover:bg-[#243147] border border-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Renomear pasta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão Lixeira vermelha (excluir pasta) */}
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="w-7 h-7 rounded-xl bg-[#1b2537] hover:bg-rose-950/40 border border-slate-700 hover:border-rose-700 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                        title="Excluir pasta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Botão Criar Campanha com esta pasta */}
                    <button
                      type="button"
                      onClick={() => navigate(`/postador?folderId=${folder.id}`)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#5054d4] hover:bg-[#4347c4] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
                      title="Criar campanha no Postador PRO usando esta pasta"
                    >
                      <Send className="w-3 h-3" />
                      <span>Criar Campanha</span>
                    </button>
                  </div>

                  {/* ITENS DENTRO DA PASTA (Imagem 2) */}
                  {folderItems.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Nenhum item nesta pasta ainda. Adicione textos ou imagens acima!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {folderItems.map((item) => {
                        const isImage = item.media_type === 'IMAGE';
                        const isVideo = item.media_type === 'VIDEO';
                        const isText = !isImage && !isVideo;
                        const isActive = itemActiveStates[item.id] !== false;

                        return (
                          <div
                            key={item.id}
                            className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-3.5 space-y-3 shadow-xs hover:border-slate-700 transition-all"
                          >
                            {/* Barra Superior do Item: Título | Ativo | Botões de Ação */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-xs text-white uppercase truncate">
                                  {item.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                {isText && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e293b] text-slate-400 border border-slate-700">
                                    {item.category || 'Ambos'}
                                  </span>
                                )}

                                {/* Toggle Ativo */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isActive}
                                    onClick={() => toggleItemActive(item.id)}
                                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                      isActive ? 'bg-[#5054d4]' : 'bg-slate-700'
                                    }`}
                                  >
                                    <span
                                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        isActive ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <span className="text-xs font-semibold text-slate-300">
                                    Ativo
                                  </span>
                                </div>

                                {/* Grupo de Botões Arredondados Cinza (Imagem 2) */}
                                <div className="flex items-center gap-1 bg-[#1b2537] p-1 rounded-xl border border-slate-700/80">
                                  {/* 1. Botão Olho (Visualizar) */}
                                  <button
                                    type="button"
                                    onClick={() => setPreviewItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Visualizar"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 2. Botão Lápis (Editar) */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 3. Botão Pasta (Mover para outra pasta) */}
                                  <button
                                    type="button"
                                    onClick={() => setMovingItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Mover para outra pasta"
                                  >
                                    <FolderInput className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 4. Botão Duplicar */}
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Duplicar"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 5. Botão 3 pontinhos (Mais opções) */}
                                  <button
                                    type="button"
                                    onClick={() => setPreviewItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Mais opções"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 6. Botão Lixeira vermelha */}
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(item.id)}
                                    className="w-7 h-7 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Preview Central da Imagem (Exatamente como na Imagem 2) */}
                            {isImage && item.media_urls && item.media_urls[0] && (
                              <div className="flex justify-center pt-1 pb-1">
                                <div className="max-w-[240px] max-h-[240px] rounded-xl overflow-hidden border border-slate-700 shadow-md bg-black/40">
                                  <img
                                    src={item.media_urls[0]}
                                    alt={item.title}
                                    className="w-full h-full object-cover max-h-[220px]"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Preview de Texto caso tenha conteúdo relevante */}
                            {isText && item.content_text && (
                              <p className="text-xs text-slate-300 line-clamp-2 px-1">
                                {item.content_text}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ========================================================= */}
        {/* ITENS FORA DAS PASTAS (Ex: TEXTO 01 na imagem 1 e 2)      */}
        {/* ========================================================= */}
        {unassignedItems.map((item) => {
          const isActive = itemActiveStates[item.id] !== false;
          return (
            <div
              key={item.id}
              className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-bold text-xs text-white uppercase truncate">
                  {item.title}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e293b] text-slate-400 border border-slate-700">
                  {item.category || 'Ambos'}
                </span>

                {/* Toggle Ativo */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => toggleItemActive(item.id)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      isActive ? 'bg-[#5054d4]' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-slate-300">
                    Ativo
                  </span>
                </div>

                {/* Grupo de Botões */}
                <div className="flex items-center gap-1 bg-[#1b2537] p-1 rounded-xl border border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Visualizar"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovingItem(item)}
                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Mover para pasta"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(item)}
                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="w-7 h-7 rounded-lg hover:bg-[#27344a] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Mais opções"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="w-7 h-7 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* MODAL: VISUALIZAR ITEM                                    */}
      {/* ========================================================= */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase">{previewItem.title}</h3>
              <button type="button" onClick={() => setPreviewItem(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {previewItem.media_urls && previewItem.media_urls[0] && (
              <div className="rounded-xl overflow-hidden max-h-64 border border-slate-700 flex items-center justify-center bg-black">
                <img src={previewItem.media_urls[0]} alt="Preview" className="max-h-64 object-contain" />
              </div>
            )}
            <div className="p-3 bg-[#0b1021] border border-slate-800 rounded-xl text-xs whitespace-pre-wrap text-slate-300">
              {previewItem.content_text || 'Sem texto definido.'}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-[#5054d4] hover:bg-[#4347c4] text-white text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR ITEM                                        */}
      {/* ========================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Editar Mídia</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Título</label>
              <input
                type="text"
                value={editingItem.title}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#0b1021] border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Conteúdo</label>
              <textarea
                rows={4}
                value={editingItem.content_text}
                onChange={(e) => setEditingItem({ ...editingItem, content_text: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#0b1021] border border-slate-700 rounded-xl text-xs text-white resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-[#1b2537] text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#5054d4] hover:bg-[#4347c4] text-white text-xs font-semibold rounded-xl"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MOVER ITEM PARA PASTA                              */}
      {/* ========================================================= */}
      {movingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Mover para Pasta</h3>
              <button type="button" onClick={() => setMovingItem(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Escolha a pasta de destino para o item <strong className="text-white">"{movingItem.title}"</strong>:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleMoveItemToFolder(movingItem.id, null)}
                className="w-full text-left px-3.5 py-2 rounded-xl bg-[#0b1021] hover:bg-[#1b2537] text-xs font-semibold text-slate-300 flex items-center gap-2 border border-slate-800"
              >
                <span>Nenhuma pasta (item solto)</span>
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleMoveItemToFolder(movingItem.id, f.id)}
                  className="w-full text-left px-3.5 py-2 rounded-xl bg-[#0b1021] hover:bg-[#1b2537] text-xs font-semibold text-white flex items-center gap-2.5 border border-slate-800"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ALTERAR COR DA PASTA                               */}
      {/* ========================================================= */}
      {folderToEditColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Alterar cor da pasta</h3>
              <button type="button" onClick={() => setFolderToEditColor(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Escolha a nova cor para a pasta <strong className="text-white">"{folderToEditColor.name}"</strong>:
            </p>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleUpdateFolderColor(folderToEditColor.id, hex)}
                  style={{ backgroundColor: hex }}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 cursor-pointer"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RENOMEAR PASTA                                     */}
      {/* ========================================================= */}
      {folderToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleRenameFolder} className="bg-[#121b2d] border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Renomear Pasta</h3>
              <button type="button" onClick={() => setFolderToRename(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Novo nome</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0b1021] border border-slate-700 rounded-xl text-xs text-white"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFolderToRename(null)}
                className="px-4 py-2 bg-[#1b2537] text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#5054d4] hover:bg-[#4347c4] text-white text-xs font-semibold rounded-xl"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
