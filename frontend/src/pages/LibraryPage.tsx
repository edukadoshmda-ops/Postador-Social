import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { api, CreativeItem } from '../core/apiService';

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
  const [activeTab, setActiveTab] = useState<LibraryTab>('TEXT');
  const [isInsertCollapsed, setIsInsertCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [targetScope, setTargetScope] = useState<ScopeType>('Ambos');

  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaContent, setMediaContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#4F46E5');

  const [varName, setVarName] = useState('');
  const [varDescription, setVarDescription] = useState('');

  const [massComment, setMassComment] = useState(false);
  const [massPost, setMassPost] = useState(false);
  const [massImage, setMassImage] = useState(false);

  const [items, setItems] = useState<CreativeItem[]>(INITIAL_DEMO_ITEMS);
  const [itemActiveStates, setItemActiveStates] = useState<Record<string, boolean>>({
    item_1: true
  });

  const [folders, setFolders] = useState([
    { id: 'f_1', name: 'Promoções', count: 1, color: '#4f46e5' },
    { id: 'f_2', name: 'Lançamentos', count: 0, color: '#10b981' }
  ]);

  const [previewItem, setPreviewItem] = useState<CreativeItem | null>(null);
  const [editingItem, setEditingItem] = useState<CreativeItem | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const res = await api.get('/library');
      const data = res.data.data || [];
      if (data.length > 0) {
        setItems(data);
        const actives: Record<string, boolean> = {};
        data.forEach((i: CreativeItem) => {
          actives[i.id] = true;
        });
        setItemActiveStates(actives);
      }
    } catch (err) {
      console.warn('Carregando itens demonstrativos', err);
    }
  };

  const handleAddText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() && !mediaContent.trim()) return;
    const finalTitle = mediaTitle.trim() || 'Texto ' + (items.length + 1);
    const finalContent = mediaContent.trim() || 'Oii, tudo bem?';

    const newItem: CreativeItem = {
      id: 'item_' + Date.now(),
      title: finalTitle,
      category: targetScope,
      content_text: finalContent,
      media_type: 'TEXT',
      media_urls: [],
      created_at: new Date().toISOString()
    };

    setItems((prev) => [newItem, ...prev]);
    setItemActiveStates((prev) => ({ ...prev, [newItem.id]: true }));
    setMediaTitle('');
    setMediaContent('');
  };

  const handleAddMedia = async (e: React.FormEvent, type: 'IMAGE' | 'VIDEO') => {
    e.preventDefault();
    if (!mediaTitle.trim() && !mediaUrl.trim()) return;
    const finalTitle = mediaTitle.trim() || (type === 'IMAGE' ? 'Imagem ' : 'Vídeo ') + (items.length + 1);

    const newItem: CreativeItem = {
      id: 'item_' + Date.now(),
      title: finalTitle,
      category: targetScope,
      content_text: finalTitle,
      media_type: type,
      media_urls: mediaUrl ? [mediaUrl] : [],
      created_at: new Date().toISOString()
    };

    setItems((prev) => [newItem, ...prev]);
    setItemActiveStates((prev) => ({ ...prev, [newItem.id]: true }));
    setMediaTitle('');
    setMediaUrl('');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    const newF = {
      id: 'f_' + Date.now(),
      name: folderName.trim(),
      count: 0,
      color: folderColor
    };
    setFolders((prev) => [newF, ...prev]);
    setFolderName('');
  };

  const toggleItemActive = (id: string) => {
    setItemActiveStates((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }));
  };

  const handleDuplicateItem = (item: CreativeItem) => {
    const dup: CreativeItem = {
      ...item,
      id: 'item_' + Date.now(),
      title: `${item.title} (Cópia)`
    };
    setItems((prev) => [dup, ...prev]);
    setItemActiveStates((prev) => ({ ...prev, [dup.id]: true }));
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.delete(`/library/${id}`);
    } catch (e) {
      console.warn('Excluído localmente', e);
    }
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItems((prev) =>
      prev.map((i) => (i.id === editingItem.id ? editingItem : i))
    );
    setEditingItem(null);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content_text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-2.5">
        <Library className="w-5 h-5 text-[#5b5bd6] dark:text-[#818cf8] stroke-[2.2]" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Biblioteca
        </h1>
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
                <div>
                  <button type="submit" className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">Adicionar Texto</button>
                </div>
              </form>
            )}

            {activeTab === 'IMAGE' && (
              <form onSubmit={(e) => handleAddMedia(e, 'IMAGE')} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da mídia</label>
                  <input type="text" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} placeholder="Imagem 1" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">URL da Imagem</label>
                  <input type="text" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://meusite.com/banner.jpg" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div className="grid grid-cols-3 gap-2 select-none">
                  {(['Comentário', 'Postagem', 'Ambos'] as ScopeType[]).map((sc) => (
                    <button key={sc} type="button" onClick={() => setTargetScope(sc)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${targetScope === sc ? 'bg-[#4f46e5]/30 text-[#818cf8] border-[#4f46e5] shadow-xs font-bold' : 'bg-white dark:bg-[#0b1021] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>
                      {sc}
                    </button>
                  ))}
                </div>
                <div>
                  <button type="submit" className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">Adicionar Imagem</button>
                </div>
              </form>
            )}

            {activeTab === 'VIDEO' && (
              <form onSubmit={(e) => handleAddMedia(e, 'VIDEO')} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da mídia</label>
                  <input type="text" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} placeholder="Vídeo 1" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">URL do Vídeo</label>
                  <input type="text" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://meusite.com/video.mp4" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div className="grid grid-cols-3 gap-2 select-none">
                  {(['Comentário', 'Postagem', 'Ambos'] as ScopeType[]).map((sc) => (
                    <button key={sc} type="button" onClick={() => setTargetScope(sc)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${targetScope === sc ? 'bg-[#4f46e5]/30 text-[#818cf8] border-[#4f46e5] shadow-xs font-bold' : 'bg-white dark:bg-[#0b1021] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>
                      {sc}
                    </button>
                  ))}
                </div>
                <div>
                  <button type="submit" className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">Adicionar Vídeo</button>
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
          <div key={item.id} className="p-3.5 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-semibold text-xs text-slate-800 dark:text-white truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
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
