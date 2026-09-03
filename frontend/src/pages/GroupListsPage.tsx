import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Search,
  Palette,
  ExternalLink,
  Shield,
  ArrowDown,
  Check,
  Trash2,
  FolderPlus,
  RefreshCw
} from 'lucide-react';
import { api, GroupList } from '../core/apiService';

const COLOR_SWATCHES = [
  '#4F46E5', '#10B981', '#EF4444', '#F97316', '#06B6D4',
  '#8B5CF6', '#EC4899', '#059669', '#2563EB', '#D97706',
  '#0D9488', '#7C3AED', '#E11D48', '#65A30D', '#1D4ED8',
  '#EA580C', '#0891B2', '#9333EA', '#DC2626', '#16A34A',
  '#3B82F6', '#F59E0B'
];

const INITIAL_GROUPS = [
  { id: 'g_1', name: 'SPIDER-VERSE', member_count: 397406, is_admin: false, avatar: '🕷️', bg: 'bg-red-950/60 text-red-400 border border-red-800/60' },
  { id: 'g_2', name: 'Cassinos e slots confiaveis', member_count: 384654, is_admin: true, avatar: '🎰', bg: 'bg-amber-950/60 text-amber-400 border border-amber-800/60' },
  { id: 'g_3', name: 'Clash Royale (Brasil)', member_count: 308382, is_admin: false, avatar: '👑', bg: 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/60' },
  { id: 'g_4', name: 'ENQUANTO ISSO PELO BRASIL', member_count: 173532, is_admin: false, avatar: '🇧🇷', bg: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' },
  { id: 'g_5', name: 'La Casa de Papel Brasil', member_count: 134291, is_admin: true, avatar: '🎭', bg: 'bg-rose-950/60 text-rose-400 border border-rose-800/60' },
  { id: 'g_6', name: 'Emagrecer e Ser Fitness', member_count: 122009, is_admin: false, avatar: '🥗', bg: 'bg-teal-950/60 text-teal-400 border border-teal-800/60' },
  { id: 'g_7', name: 'SEGUIDORES DO NOBRU', member_count: 112911, is_admin: false, avatar: '🎮', bg: 'bg-purple-950/60 text-purple-400 border border-purple-800/60' },
  { id: 'g_8', name: 'Mercado Livre & Shopee Ofertas', member_count: 98450, is_admin: true, avatar: '🛍️', bg: 'bg-yellow-950/60 text-yellow-400 border border-yellow-800/60' },
  { id: 'g_9', name: 'Carros & Motos Vendas SP', member_count: 84210, is_admin: false, avatar: '🚗', bg: 'bg-blue-950/60 text-blue-400 border border-blue-800/60' },
  { id: 'g_10', name: 'Marketing Digital & Afiliados', member_count: 76300, is_admin: true, avatar: '🚀', bg: 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/60' },
  { id: 'g_11', name: 'Empregos & Oportunidades BR', member_count: 65120, is_admin: false, avatar: '💼', bg: 'bg-slate-950/60 text-slate-400 border border-slate-800/60' }
];

export default function GroupListsPage() {
  const [lists, setLists] = useState<GroupList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4F46E5');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | '1K' | '10K' | '50K' | '100K'>('ALL');
  const [onlyAdmin, setOnlyAdmin] = useState(false);
  const [sortByMembers, setSortByMembers] = useState(true);
  const [allGroups, setAllGroups] = useState<any[]>(INITIAL_GROUPS);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    loadLists();
    loadBackendGroups();
  }, []);

  const loadLists = async () => {
    try {
      const res = await api.get('/groups/lists');
      setLists(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBackendGroups = async () => {
    try {
      const res = await api.get('/groups/lists');
      const allLists = res.data.data || [];
      if (allLists.length > 0) {
        const detailsRes = await api.get(`/groups/lists/${allLists[0].id}`);
        const dbGroups = detailsRes.data.data?.groups || [];
        if (dbGroups.length > 0) {
          const merged = dbGroups.map((g: any, idx: number) => ({
            ...g,
            avatar: INITIAL_GROUPS[idx % INITIAL_GROUPS.length]?.avatar || '👥',
            bg: INITIAL_GROUPS[idx % INITIAL_GROUPS.length]?.bg || 'bg-slate-800 text-slate-300'
          }));
          setAllGroups(merged);
        }
      }
    } catch (err) {
      console.warn('Usando lista demonstrativa', err);
    }
  };

  const filteredGroups = allGroups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    const count = Number(g.member_count) || 0;
    if (activeFilter === '1K' && count < 1000) return false;
    if (activeFilter === '10K' && count < 10000) return false;
    if (activeFilter === '50K' && count < 50000) return false;
    if (activeFilter === '100K' && count < 100000) return false;
    if (onlyAdmin && !g.is_admin && g.privacy !== 'ADMIN') return false;
    return true;
  }).sort((a, b) => {
    if (sortByMembers) {
      return (Number(b.member_count) || 0) - (Number(a.member_count) || 0);
    }
    return 0;
  });

  const toggleSelectGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedGroupIds(new Set(filteredGroups.map((g) => g.id)));
  };

  const handleClearSelection = () => {
    setSelectedGroupIds(new Set());
  };

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      setFeedbackMsg('Por favor, informe o nome da lista.');
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/groups/lists', {
        name: newListName.trim(),
        color: selectedColor,
        platform: 'FACEBOOK'
      });
      const newList = res.data.data;
      const groupsToSync = allGroups
        .filter((g) => selectedGroupIds.has(g.id))
        .map((g) => ({
          groupId: g.group_id || g.id,
          name: g.name,
          url: g.url || `https://facebook.com/groups/${g.group_id || g.id}`,
          memberCount: g.member_count,
          privacy: g.privacy || 'PUBLIC'
        }));
      if (groupsToSync.length > 0 && newList?.id) {
        await api.post(`/groups/lists/${newList.id}/sync`, { groups: groupsToSync });
      }
      setFeedbackMsg(`✓ Lista "${newListName}" salva com sucesso com ${selectedGroupIds.size} grupos!`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      setNewListName('');
      setSelectedGroupIds(new Set());
      loadLists();
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg('Erro ao salvar lista. Tente novamente.');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await api.delete(`/groups/lists/${id}`);
      loadLists();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-2.5">
        <ListChecks className="w-5 h-5 text-[#5b5bd6] dark:text-[#818cf8] stroke-[2.2]" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Listas de grupos</h1>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{feedbackMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveList} className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nome da lista</label>
          <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Ex.: Vendas SP" className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-[#4f46e5] transition-all" required />
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Cor</label>
          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_SWATCHES.map((hex) => {
              const isSelected = selectedColor.toUpperCase() === hex.toUpperCase();
              return (
                <button key={hex} type="button" onClick={() => setSelectedColor(hex)} style={{ backgroundColor: hex }} className={`w-7 h-7 rounded-full transition-all cursor-pointer ${isSelected ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0c1222] ring-[#4F46E5] scale-110 shadow-xs' : 'hover:scale-105'}`} />
              );
            })}
          </div>
          <div className="flex items-center gap-3 pt-0.5">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0f172a] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors shadow-xs">
              <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Cor personalizada</span>
              <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="sr-only" />
            </label>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0f172a] text-xs font-mono text-slate-600 dark:text-slate-400 shadow-xs">
              <div className="w-4 h-4 rounded-md shrink-0" style={{ backgroundColor: selectedColor }} />
              <span>{selectedColor.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar grupos..." className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#0b1021] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#4f46e5] shadow-xs" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
          <button type="button" onClick={() => setActiveFilter('ALL')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${activeFilter === 'ALL' ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>Todos</button>
          <button type="button" onClick={() => setActiveFilter('1K')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${activeFilter === '1K' ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>≥ 1.000</button>
          <button type="button" onClick={() => setActiveFilter('10K')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${activeFilter === '10K' ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>≥ 10.000</button>
          <button type="button" onClick={() => setActiveFilter('50K')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${activeFilter === '50K' ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>≥ 50.000</button>
          <button type="button" onClick={() => setActiveFilter('100K')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${activeFilter === '100K' ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}>≥ 100.000</button>
          <button type="button" onClick={() => setOnlyAdmin(!onlyAdmin)} className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${onlyAdmin ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}><Shield className="w-3.5 h-3.5" /> <span>Só admin</span></button>
          <button type="button" onClick={() => setSortByMembers(!sortByMembers)} className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${sortByMembers ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-white dark:bg-[#131c31] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'}`}><ArrowDown className="w-3.5 h-3.5" /> <span>Membros</span></button>
        </div>

        <div className="flex items-center justify-between pt-1 border-b border-slate-100 dark:border-slate-800/60 pb-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{selectedGroupIds.size} selecionado(s)</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSelectAll} className="px-3 py-1 bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[#4f46e5] dark:text-[#818cf8] text-xs font-semibold rounded-lg transition-colors cursor-pointer">Selecionar todos</button>
            <button type="button" onClick={handleClearSelection} className="px-3.5 py-1 bg-slate-200 dark:bg-[#334155] hover:bg-slate-300 dark:hover:bg-[#475569] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer">Limpar</button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[420px] overflow-y-auto pr-1">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Nenhum grupo encontrado com os filtros selecionados.</div>
          ) : (
            filteredGroups.map((g) => {
              const isChecked = selectedGroupIds.has(g.id);
              return (
                <div key={g.id} onClick={() => toggleSelectGroup(g.id)} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl transition-colors cursor-pointer select-none">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-[#4f46e5] border-[#4f46e5] text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0b1021]'}`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${g.bg || 'bg-slate-800 text-slate-200'}`}><span>{g.avatar || '👥'}</span></div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{g.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs text-slate-400 font-mono">{Number(g.member_count || 10000).toLocaleString('pt-BR')}</span>
                    <a href={g.url || `https://facebook.com/groups/${g.group_id || g.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 text-blue-500 hover:text-blue-400 transition-colors" title="Abrir no Facebook"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50">
            <Check className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar lista'}</span>
          </button>
        </div>
      </form>

      {lists.length > 0 && (
        <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-[#1e293b] rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Listas criadas ({lists.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lists.map((l) => (
              <div key={l.id} className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1021] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: l.color || '#4f46e5' }} />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-white truncate">{l.name}</h4>
                    <span className="text-[11px] text-slate-400">{l.total_groups || l.actual_groups_count || 0} grupos</span>
                  </div>
                </div>
                <button type="button" onClick={() => handleDeleteList(l.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir lista"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
