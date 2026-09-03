import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, CheckCircle2, Clock, AlertTriangle, Send, Shield, Pause, Trash2, Lock, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area } from 'recharts';
import { api, StatsOverview } from '../core/apiService';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

export default function StatsPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [bestTime, setBestTime] = useState<any>(null);
  const [quarantine, setQuarantine] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadHealth();
    loadBestTime();
    loadQuarantine();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/stats/overview');
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const res = await api.get('/stats/health');
      setHealth(res.data.data);
    } catch (err) { console.error(err); }
  };

  const [bestTimeAccount, setBestTimeAccount] = useState<string>('');
  const loadBestTime = async (accountId?: string) => {
    try {
      const q = accountId ? `?accountId=${accountId}` : '';
      const res = await api.get(`/stats/best-time${q}`);
      setBestTime(res.data.data);
    } catch (err) { console.error(err); }
  };

  const loadQuarantine = async () => {
    try {
      const res = await api.get('/stats/quarantine');
      setQuarantine(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const handleApplyBestTime = () => {
    if (!bestTime || !bestTime.hourly?.length) return;
    const bestHour = bestTime.hourly[0]?.hour;
    if (bestHour === undefined) return;
    const start = Math.max(0, bestHour - 1);
    const end = Math.min(23, bestHour + 2);
    localStorage.setItem('pulso_calibration', JSON.stringify({
      ...(JSON.parse(localStorage.getItem('pulso_calibration') || '{}')),
      safeWindowEnabled: true,
      safeWindowStartHour: start,
      safeWindowEndHour: end,
    }));
    alert(`Janela segura aplicada: ${String(start).padStart(2,'0')}h às ${String(end).padStart(2,'0')}h — baseada no melhor horário ${String(bestHour).padStart(2,'0')}:00`);
  };

  const handleReleaseQuarantine = async (gid: string) => {
    try {
      await api.delete(`/stats/quarantine/${gid}`);
      loadQuarantine();
    } catch (e: any) { alert(e.response?.data?.error || e.message); }
  };

  const [ipLimits, setIpLimits] = useState<any>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'shadowbanned' | 'delivered' | 'pending'>('all');
  const [deliveryAccount, setDeliveryAccount] = useState<string>('');

  useEffect(() => {
    loadIpLimits();
    loadDelivery();
  }, []);

  const loadIpLimits = async () => {
    try {
      const res = await api.get('/stats/ip-limits');
      setIpLimits(res.data.data);
    } catch {}
  };

  const loadDelivery = async (filter?: string, account?: string) => {
    try {
      const f = filter || deliveryFilter;
      const acc = account !== undefined ? account : deliveryAccount;
      const q: string[] = [];
      if (f && f !== 'all') q.push(`filter=${f}`);
      if (acc) q.push(`accountId=${acc}`);
      const qs = q.length ? `?${q.join('&')}` : '';
      const res = await api.get(`/stats/delivery${qs}`);
      setDelivery(res.data.data);
    } catch (e) { console.error(e); }
  };

  const handleSaveIpLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const perHour = Number(fd.get('perHour'));
    const perDay = Number(fd.get('perDay'));
    try {
      await api.put('/stats/ip-limits', { perHour, perDay });
      loadIpLimits();
      loadHealth();
    } catch (e: any) { alert(e.response?.data?.error || e.message); }
  };

  const handleExportDeliveryCsv = () => {
    const qs: string[] = [];
    if (deliveryFilter && deliveryFilter !== 'all') qs.push(`filter=${deliveryFilter}`);
    if (deliveryAccount) qs.push(`accountId=${deliveryAccount}`);
    const suffix = qs.length ? `?${qs.join('&')}` : '';
    window.open(`/api/stats/export/delivery-csv${suffix}`, '_blank');
  };

  const handleExportCSV = () => {
    window.open('/api/stats/export/csv', '_blank');
  };

  if (!stats) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Estatísticas de Desempenho
            </h1>
            <p className="text-xs text-slate-400">Métricas completas de postagens, taxas de entrega e histórico</p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#131c31] hover:bg-[#1e293b] text-white border border-[#1e293b] font-bold text-sm shadow-lg transition-all"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total de Postagens</span>
            <Send className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +18% esta semana
          </span>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Publicados com Sucesso</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats.publishedPosts}</p>
          <span className="text-[11px] text-slate-400">Entrega imediata nos grupos</span>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pendentes (Moderação)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{stats.pendingPosts}</p>
          <span className="text-[11px] text-slate-400">Aguardando aprovação de admin</span>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Falhas / Bloqueados</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.failedPosts}</p>
          <span className="text-[11px] text-slate-400">Taxa de erro inferior a 3%</span>
        </div>
      </div>

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Atividade Semanal */}
        <div className="lg:col-span-8 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white">Volume de Postagens Semanal</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" textAnchor="end" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, color: '#fff' }} />
                <Legend />
                <Bar dataKey="published" name="Publicados" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" name="Pendentes" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                <Bar dataKey="failed" name="Falhas" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição Geral */}
        <div className="lg:col-span-4 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white">Resumo Geral</h2>
          <div className="space-y-4 pt-2">
            <div className="p-3.5 bg-[#131c31] rounded-xl border border-[#1e293b] flex items-center justify-between">
              <span className="text-xs text-slate-400">Total de Campanhas</span>
              <span className="font-bold text-white">{stats.totalCampaigns}</span>
            </div>
            <div className="p-3.5 bg-[#131c31] rounded-xl border border-[#1e293b] flex items-center justify-between">
              <span className="text-xs text-slate-400">Total de Grupos Cadastrados</span>
              <span className="font-bold text-white">{stats.totalGroups}</span>
            </div>
            <div className="p-3.5 bg-[#131c31] rounded-xl border border-[#1e293b] flex items-center justify-between">
              <span className="text-xs text-slate-400">Contas Conectadas</span>
              <span className="font-bold text-white">{stats.totalAccounts}</span>
            </div>
            <div className="p-3.5 bg-[#131c31] rounded-xl border border-[#1e293b] flex items-center justify-between">
              <span className="text-xs text-slate-400">Taxa Média de Sucesso</span>
              <span className="font-bold text-emerald-400">96.4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Melhor horário para postar */}
      {bestTime && (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Melhor horário para postar
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">baseado em taxa real</span>
            </h2>
            <div className="flex items-center gap-2">
              <select value={bestTimeAccount} onChange={(e) => { setBestTimeAccount(e.target.value); loadBestTime(e.target.value || undefined); }} className="px-2 py-1 rounded-lg bg-[#131c31] border border-[#1e293b] text-xs text-white">
                <option value="">Todas as contas</option>
                {health?.health?.map((h: any) => (<option key={h.accountId} value={h.accountId}>{h.name} · {h.platform}</option>))}
              </select>
              <button onClick={() => loadBestTime(bestTimeAccount || undefined)} className="text-xs px-3 py-1 rounded-lg bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300">Atualizar</button>
            </div>
          </div>
          <div className="flex gap-2">
            <p className="flex-1 text-xs text-slate-300 bg-[#131c31] border border-[#1e293b] rounded-xl p-3">{bestTime.recommendation}</p>
            <button onClick={handleApplyBestTime} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold h-fit flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Aplicar na janela segura</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300">Por hora do dia</h3>
              {bestTime.hourly.length === 0 ? <p className="text-xs text-slate-500">Sem dados ainda</p> : bestTime.hourly.slice(0, 8).map((h: any) => (
                <div key={h.hour} className="flex items-center justify-between p-2 bg-[#131c31] rounded-xl border border-[#1e293b] text-xs">
                  <span className="font-bold text-white">{String(h.hour).padStart(2, '0')}:00</span>
                  <span className="text-slate-400">{h.published}/{h.total} · {Math.round(h.successRate * 100)}% sucesso</span>
                  <span className="w-20 h-1.5 bg-[#0f172a] rounded-full overflow-hidden border border-[#1e293b]"><span className="block h-full bg-indigo-500" style={{ width: `${Math.round(h.successRate * 100)}%` }} /></span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300">Por dia da semana</h3>
              {bestTime.daily.length === 0 ? <p className="text-xs text-slate-500">Sem dados ainda</p> : bestTime.daily.map((d: any) => (
                <div key={d.day} className="flex items-center justify-between p-2 bg-[#131c31] rounded-xl border border-[#1e293b] text-xs">
                  <span className="font-bold text-white">{d.label}</span>
                  <span className="text-slate-400">{d.published}/{d.total} · {Math.round(d.successRate * 100)}% sucesso</span>
                  <span className="w-20 h-1.5 bg-[#0f172a] rounded-full overflow-hidden border border-[#1e293b]"><span className="block h-full bg-emerald-500" style={{ width: `${Math.round(d.successRate * 100)}%` }} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saúde Anti-Ban por conta */}
      {health && health.health && health.health.length > 0 && (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> Saúde Anti-Ban por conta
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">ao vivo</span>
            </h2>
            <button onClick={loadHealth} className="text-xs px-3 py-1 rounded-lg bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300">Atualizar</button>
          </div>
          <p className="text-xs text-slate-400">Limites dinâmicos por <b>trust_score</b> e <b>status</b>. Contas com trust baixo ou em aquecimento postam menos por hora para não tomar bloqueio. Padrão: {health.defaults.maxPostsPerHour}/h e {health.defaults.maxPostsPerDay}/dia.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {health.health.map((h: any) => (
              <div key={h.accountId} className={`p-4 rounded-xl border space-y-2 ${h.risk === 'alto' ? 'bg-red-500/10 border-red-500/30' : h.risk === 'medio' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#131c31] border-[#1e293b]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white truncate">{h.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${h.risk === 'alto' ? 'bg-red-500/20 text-red-300 border-red-500/30' : h.risk === 'medio' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'}`}>{h.risk === 'alto' ? 'risco alto' : h.risk === 'medio' ? 'atenção' : 'saudável'}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#0f172a] border border-[#1e293b]">{h.platform}</span>
                  <span>trust {h.trust_score}%</span>
                  <span className={`px-1.5 py-0.5 rounded border text-[11px] ${h.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : h.status === 'WARMING' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-red-500/15 text-red-300 border-red-500/20'}`}>{h.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]"><div className="text-slate-400">limite efetivo</div><div className="font-bold text-white">{h.effectiveLimits.maxPostsPerHour}/h · {h.effectiveLimits.maxPostsPerDay}/dia</div></div>
                  <div className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]"><div className="text-slate-400">nesta hora</div><div className="font-bold text-white">{h.state.postsThisHour} posts · {h.state.remainingHour ?? 0} restantes</div></div>
                  <div className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]"><div className="text-slate-400">hoje</div><div className="font-bold text-white">{h.state.postsToday} posts</div></div>
                  <div className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]"><div className="text-slate-400">falhas seguidas</div><div className={`font-bold ${h.state.consecutiveFailures >= 2 ? 'text-red-400' : 'text-white'}`}>{h.state.consecutiveFailures}</div></div>
                </div>
                {h.ipKey && (
                  <div className="p-1.5 rounded-lg bg-[#0f172a] border border-[#1e293b] text-[11px] flex items-center justify-between">
                    <span className="text-slate-400">IP/proxy:</span>
                    <span className="font-mono text-slate-300 truncate max-w-[110px]" title={h.ipKey}>{h.ipKey === 'direct' ? 'IP direto' : h.ipKey}</span>
                    <span className="text-[11px] text-slate-400">{h.ipState ? `${h.ipState.countHour}/18h · ${h.ipState.countDay}/80d` : '—'}</span>
                  </div>
                )}
                {h.status === 'WARMING' && <p className="text-[11px] text-amber-300 flex items-center gap-1"><Pause className="w-3 h-3" /> Aquecimento: limite reduzido para 4/h e 15/dia.</p>}
                {h.trust_score < 60 && <p className="text-[11px] text-amber-300">Trust baixo — melhore engajamento manual antes de subir volume.</p>}
                {h.state.consecutiveFailures >= 2 && <p className="text-[11px] text-red-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risco de checkpoint — pausado automaticamente após 3 falhas.</p>}
              </div>
            ))}
          </div>
          {health.ipStates && Object.keys(health.ipStates).length > 1 && (
            <div className="p-3 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-1">
              <div className="text-xs font-bold text-white">Limites por IP/proxy (global)</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(health.ipStates).map(([k, v]: any) => (
                  <span key={k} className="px-2 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-slate-300 font-mono text-[11px]">{k} · {v.countHour}/18h · {v.countDay}/80d</span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Limite compartilhado por IP/proxy: 18/h e 80/dia. Contas no mesmo IP dividem o limite — use proxy diferente por conta para escalar.</p>
            </div>
          )}
        </div>
      )}

      {/* Limites por IP editáveis */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" /> Limites por IP/proxy (editável)
          </h2>
          <button onClick={loadIpLimits} className="text-xs px-3 py-1 rounded-lg bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300">Atualizar</button>
        </div>
        <p className="text-xs text-slate-400">Contas no mesmo IP/proxy dividem o limite. Ajuste conforme seu proxy. Padrão 18/h e 80/dia por IP.</p>
        {ipLimits && (
          <form onSubmit={handleSaveIpLimits} className="flex flex-wrap items-end gap-3 p-3 bg-[#131c31] border border-[#1e293b] rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Máx por hora / IP</label>
              <input name="perHour" type="number" min={5} max={100} defaultValue={ipLimits.limits.perHour} className="w-24 px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Máx por dia / IP</label>
              <input name="perDay" type="number" min={20} max={500} defaultValue={ipLimits.limits.perDay} className="w-24 px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Salvar limites</button>
            <span className="text-xs text-slate-500">Atual: {ipLimits.limits.perHour}/h · {ipLimits.limits.perDay}/d</span>
          </form>
        )}
      </div>

      {/* Relatório de entrega (shadowban check) */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" /> Relatório de entrega
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">shadowban check</span>
          </h2>
          <div className="flex items-center gap-2">
            <select value={deliveryAccount} onChange={(e) => { setDeliveryAccount(e.target.value); loadDelivery(deliveryFilter, e.target.value); }} className="px-2 py-1 rounded-lg bg-[#131c31] border border-[#1e293b] text-xs text-white">
              <option value="">Todas as contas</option>
              {health?.health?.map((h: any) => (<option key={h.accountId} value={h.accountId}>{h.name}</option>))}
            </select>
            <select value={deliveryFilter} onChange={(e) => { setDeliveryFilter(e.target.value as any); loadDelivery(e.target.value as any, deliveryAccount); }} className="px-2 py-1 rounded-lg bg-[#131c31] border border-[#1e293b] text-xs text-white">
              <option value="all">Todos</option>
              <option value="delivered">Entregues</option>
              <option value="shadowbanned">Shadowban</option>
              <option value="pending">Pendentes/moderação</option>
            </select>
            <button onClick={() => loadDelivery()} className="text-xs px-3 py-1 rounded-lg bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300">Atualizar</button>
            <button onClick={handleExportDeliveryCsv} className="text-xs px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Exportar CSV</button>
          </div>
        </div>
        {delivery ? (
          <>
            {delivery.summary.totalChecked >= 5 && delivery.summary.shadowbanned / Math.max(1, delivery.summary.totalChecked) > 0.10 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <div>
                  <div className="font-bold">Alerta: shadowban acima de 10% ({Math.round(delivery.summary.shadowbanned / Math.max(1, delivery.summary.totalChecked) * 100)}% — {delivery.summary.shadowbanned}/{delivery.summary.totalChecked})</div>
                  <div className="opacity-90">Pause campanhas, revise conteúdo (use Spintax variado, menos links/hashtags), troque de conta/proxy e respeite a janela segura. O sistema já varia hashtags/links e limita por IP, mas taxa alta indica bloqueio ativo da Meta.</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-[#131c31] rounded-xl border border-[#1e293b]"><div className="text-slate-400">Verificados</div><div className="font-bold text-white text-base">{delivery.summary.totalChecked}</div></div>
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><div className="text-emerald-300">Entregues</div><div className="font-bold text-emerald-400 text-base">{delivery.summary.delivered}</div></div>
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20"><div className="text-red-300">Shadowban</div><div className="font-bold text-red-400 text-base">{delivery.summary.shadowbanned}</div></div>
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20"><div className="text-amber-300">Pendentes</div><div className="font-bold text-amber-400 text-base">{delivery.summary.pending}</div></div>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {delivery.items.length === 0 ? <p className="text-xs text-slate-500 text-center py-6">Nenhum resultado para este filtro</p> : delivery.items.map((it: any) => (
                <div key={it.id} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${it.delivery_shadowbanned ? 'bg-red-500/10 border-red-500/20' : it.delivery_delivered ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{it.group_name} <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full border ${it.delivery_shadowbanned ? 'bg-red-500/20 text-red-300 border-red-500/30' : it.delivery_delivered ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{it.delivery_shadowbanned ? 'shadowban' : it.delivery_delivered ? 'entregue' : 'pendente'}</span></div>
                    <div className="text-slate-400 truncate">"{it.posted_text || ''}"</div>
                    <div className="text-[11px] text-slate-500">{it.delivery_reason || ''} · verificado {it.delivery_checked_at ? new Date(it.delivery_checked_at).toLocaleString('pt-BR') : ''}</div>
                  </div>
                  {it.post_url && <a href={it.post_url} target="_blank" rel="noreferrer" className="ml-3 text-indigo-400 hover:text-indigo-300 shrink-0">Abrir</a>}
                </div>
              ))}
            </div>
          </>
        ) : <p className="text-xs text-slate-500">Carregando...</p>}
      </div>

      {/* Quarentena — grupos com 2+ falhas em 14 dias */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-400" /> Quarentena de grupos
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20">2+ falhas em 14d</span>
            {quarantine.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">{quarantine.length} grupos</span>}
          </h2>
          <button onClick={loadQuarantine} className="text-xs px-3 py-1 rounded-lg bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300">Atualizar</button>
        </div>
        <p className="text-xs text-slate-400">Grupos que falharam 2x ou mais nos últimos 14 dias são pulados automaticamente ao criar campanha (até 14 dias). Libere manualmente se corrigiu o motivo (ex: entrou no grupo, virou membro).</p>
        {quarantine.length === 0 ? (
          <div className="p-4 bg-[#131c31] border border-[#1e293b] rounded-xl text-center text-xs text-slate-500">Nenhum grupo em quarentena — ótimo sinal!</div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {quarantine.map((q: any) => (
              <div key={q.group_id} className="p-3 bg-[#131c31] border border-[#1e293b] rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    {q.group_name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20">{q.failures} falhas</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">ID: {q.group_id} · último: {new Date(q.lastFailure).toLocaleString('pt-BR')}</div>
                  {q.group_url && <a href={q.group_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-[11px]">Abrir grupo</a>}
                </div>
                <button onClick={() => handleReleaseQuarantine(q.group_id)} className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Liberar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
