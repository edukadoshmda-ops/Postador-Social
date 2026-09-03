import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, ShieldCheck, RefreshCw, Key, Globe, CheckCircle2, Bell, Send, MessageSquare, Chrome, Download, Copy, Check, Shield, AlertTriangle, Pause } from 'lucide-react';
import { api, Account } from '../core/apiService';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [platform, setPlatform] = useState<'FACEBOOK' | 'INSTAGRAM'>('FACEBOOK');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [cookies, setCookies] = useState('');
  const [proxy, setProxy] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [proxyValidating, setProxyValidating] = useState(false);
  const [proxyMsg, setProxyMsg] = useState<string | null>(null);
  const [uaRotatingId, setUaRotatingId] = useState<string | null>(null);
  const [igToken, setIgToken] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [igValidating, setIgValidating] = useState(false);
  const [igMsg, setIgMsg] = useState<string | null>(null);

  // Notification settings state
  const [notif, setNotif] = useState({
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    whatsappEnabled: false,
    whatsappWebhookUrl: '',
    notifyOnCompleted: true,
    notifyOnBlock: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifTesting, setNotifTesting] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const [health, setHealth] = useState<any>(null);
  const [editingLimitsId, setEditingLimitsId] = useState<string | null>(null);
  const [limitsForm, setLimitsForm] = useState({ maxPostsPerHour: 12, maxPostsPerDay: 35 });

  const extensionPath = 'c:\\Users\\eduka\\Downloads\\autopost\\gruply-app\\extension';

  useEffect(() => {
    loadAccounts();
    loadNotifSettings();
    loadHealth();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHealth = async () => {
    try {
      const res = await api.get('/stats/health');
      setHealth(res.data.data);
    } catch {}
  };

  const loadNotifSettings = async () => {
    try {
      const res = await api.get('/notifications/settings');
      if (res.data.data) setNotif(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/notifications/settings', notif);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestNotif = async () => {
    setNotifTesting(true);
    try {
      await api.post('/notifications/test');
      alert('Mensagem de teste enviada com sucesso!');
    } catch (err: any) {
      alert('Erro ao enviar teste: ' + (err.response?.data?.error || err.message));
    } finally {
      setNotifTesting(false);
    }
  };

  const handleValidateProxy = async () => {
    if (!proxy) { setProxyMsg('Informe um proxy para validar'); setTimeout(() => setProxyMsg(null), 2500); return; }
    setProxyValidating(true);
    try {
      const res = await api.post('/accounts/validate-proxy', { proxy });
      setProxyMsg(`✓ Válido — ${res.data.data.parsed.host}:${res.data.data.parsed.port} (${res.data.data.parsed.protocol})`);
      setTimeout(() => setProxyMsg(null), 4000);
    } catch (err: any) {
      setProxyMsg(err.response?.data?.error || 'Proxy inválido');
      setTimeout(() => setProxyMsg(null), 4000);
    } finally { setProxyValidating(false); }
  };

  const handleValidateInstagram = async () => {
    if (!igToken || !igUserId) { setIgMsg('Informe token e IG User ID'); setTimeout(() => setIgMsg(null), 3000); return; }
    setIgValidating(true);
    try {
      await api.post('/accounts/validate-instagram', { access_token: igToken, ig_user_id: igUserId });
      setIgMsg('✓ Credenciais válidas — pronto para API oficial');
      setTimeout(() => setIgMsg(null), 4000);
    } catch (err: any) {
      setIgMsg(err.response?.data?.error || 'Credenciais inválidas');
      setTimeout(() => setIgMsg(null), 4000);
    } finally { setIgValidating(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !identifier) return;
    try {
      await api.post('/accounts', { platform, name, identifier, cookies, proxy, access_token: igToken || undefined, ig_user_id: igUserId || undefined });
      setShowModal(false);
      setName(''); setIdentifier(''); setCookies(''); setProxy(''); setProxyMsg(null); setIgToken(''); setIgUserId(''); setIgMsg(null);
      loadAccounts(); loadHealth();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar conta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover esta conta?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      loadAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestAccount = async (id: string) => {
    try {
      const res = await api.post(`/accounts/${id}/test`);
      setTestResult({ id, ...res.data.data });
      setTimeout(() => setTestResult(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const startEditLimits = (acc: any) => {
    const h = health?.health?.find((x: any) => x.accountId === acc.id);
    setEditingLimitsId(acc.id);
    setLimitsForm({ maxPostsPerHour: h?.effectiveLimits.maxPostsPerHour ?? 12, maxPostsPerDay: h?.effectiveLimits.maxPostsPerDay ?? 35 });
  };
  const saveLimits = async (id: string) => {
    try {
      await api.put(`/accounts/${id}/limits`, limitsForm);
      setEditingLimitsId(null);
      await loadAccounts();
      await loadHealth();
    } catch (e) { console.error(e); }
  };
  const resetLimits = async (id: string) => {
    try {
      await api.delete(`/accounts/${id}/limits`);
      setEditingLimitsId(null);
      await loadAccounts();
      await loadHealth();
    } catch (e) { console.error(e); }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Configurações & Contas Conectadas
            </h1>
            <p className="text-xs text-slate-400">Gerencie seus perfis, extensão Chrome e alertas automáticos</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Conectar Nova Conta</span>
        </button>
      </div>

      {/* Grid of Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-[#0f172a] border border-[#1e293b] hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">{acc.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {acc.platform}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">ID / User: {acc.identifier}</p>
              </div>

              <button
                onClick={() => handleDelete(acc.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Remover conta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#131c31] rounded-xl border border-[#1e293b] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Trust Score:</span>
                <span className={`font-bold ${acc.trust_score < 60 ? 'text-red-400' : acc.trust_score < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{acc.trust_score}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold flex items-center gap-1 ${acc.status === 'ACTIVE' ? 'text-emerald-400' : acc.status === 'WARMING' ? 'text-amber-400' : 'text-red-400'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" /> {acc.status}
                </span>
              </div>
              {(() => {
                const h = health?.health?.find((x: any) => x.accountId === acc.id);
                if (!h) return null;
                const isCustom = !!(acc as any).custom_limits;
                return (
                  <div className={`p-2 rounded-lg border space-y-1 ${h.risk === 'alto' ? 'bg-red-500/10 border-red-500/20 text-red-300' : h.risk === 'medio' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Limite: <b>{h.effectiveLimits.maxPostsPerHour}/h · {h.effectiveLimits.maxPostsPerDay}/dia</b>{isCustom && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">manual</span>}</span>
                      <span className="text-[11px] opacity-80">{h.state.postsThisHour}/h · {h.state.remainingHour ?? 0} restantes</span>
                    </div>
                    {!isCustom && <span className="text-[10px] opacity-60">Automático por trust {acc.trust_score}% · {acc.status === 'WARMING' ? 'aquecimento 4/h' : acc.trust_score < 60 ? '6/h' : acc.trust_score < 80 ? '8/h' : '12/h'}</span>}
                  </div>
                );
              })()}
              {editingLimitsId === acc.id ? (
                <div className="p-2.5 rounded-xl bg-[#0f172a] border border-indigo-500/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400">Máx por hora</label>
                      <input type="number" min={1} max={30} value={limitsForm.maxPostsPerHour} onChange={(e) => setLimitsForm({ ...limitsForm, maxPostsPerHour: Number(e.target.value) })} className="w-full px-2 py-1.5 bg-[#090d16] border border-[#1e293b] rounded-lg text-white text-xs" />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Máx por dia</label>
                      <input type="number" min={5} max={150} value={limitsForm.maxPostsPerDay} onChange={(e) => setLimitsForm({ ...limitsForm, maxPostsPerDay: Number(e.target.value) })} className="w-full px-2 py-1.5 bg-[#090d16] border border-[#1e293b] rounded-lg text-white text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveLimits(acc.id)} className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Salvar</button>
                    <button onClick={() => setEditingLimitsId(null)} className="px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-slate-700 text-slate-300 text-xs">Cancelar</button>
                    <button onClick={() => resetLimits(acc.id)} className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs">Voltar ao automático</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => startEditLimits(acc)} className="w-full py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-[11px] text-slate-400 hover:text-white">⚙️ Editar limites desta conta</button>
              )}
              {acc.proxy && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Proxy:</span>
                  <span className="font-mono text-[11px] truncate max-w-[120px]">{acc.proxy}</span>
                </div>
              )}
              {(() => {
                const h = health?.health?.find((x: any) => x.accountId === acc.id);
                if (!h || h.risk === 'baixo') return null;
                return <p className={`text-[11px] flex items-center gap-1 ${h.risk === 'alto' ? 'text-red-300' : 'text-amber-300'}`}>{h.risk === 'alto' ? <AlertTriangle className="w-3 h-3" /> : <Pause className="w-3 h-3" />}{h.risk === 'alto' ? 'Risco alto — pausado após 3 falhas' : 'Atenção — taxa de erro subindo'}</p>;
              })()}
            </div>

            {testResult && testResult.id === acc.id && (
              <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${testResult.valid === false ? 'bg-red-500/10 border-red-500/30 text-red-300' : testResult.proxyOk === false ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{testResult.status}</span></div>
                {testResult.checks && <div className="text-[11px] opacity-80 space-y-0.5">{testResult.checks.map((c: string, i: number) => (<div key={i}>• {c}</div>))}</div>}
                {testResult.proxyLatencyMs !== null && testResult.proxyLatencyMs !== undefined && (
                  <div className={`text-[11px] font-bold px-2 py-1 rounded-full border inline-block ${testResult.proxyOk ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : testResult.proxyOk === false ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-slate-700/30 border-slate-600/30 text-slate-300'}`}>
                    Latência proxy: {testResult.proxyLatencyMs}ms
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTestAccount(acc.id)}
                className="py-2 bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Testar Conexão</span>
              </button>
              <button
                onClick={async () => {
                  setUaRotatingId(acc.id);
                  try { await api.post(`/accounts/${acc.id}/rotate-ua`); await loadAccounts(); } catch {} finally { setUaRotatingId(null); }
                }}
                disabled={uaRotatingId === acc.id}
                className="py-2 bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{uaRotatingId === acc.id ? 'Rotacionando...' : 'Rotacionar UA'}</span>
              </button>
            </div>
            {acc.user_agent && <p className="text-[10px] text-slate-500 font-mono truncate" title={acc.user_agent}>UA: {acc.user_agent.slice(0, 80)}...</p>}
          </div>
        ))}
      </div>

      {/* Chrome Extension Card */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Chrome className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Extensão Google Chrome do Pulso Social</h2>
            <p className="text-xs text-slate-400">Instale a extensão oficial no seu navegador para sincronizar sessões e postar direto das abas abertas</p>
          </div>
        </div>

        <div className="p-4 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-3 text-xs">
          <div className="space-y-1.5 text-slate-300">
            <p className="font-semibold text-white">📌 Como instalar em 3 passos simples:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Abra o Chrome e acesse <code className="text-indigo-400 bg-black/40 px-1.5 py-0.5 rounded">chrome://extensions/</code></li>
              <li>Ative a chave <b>"Modo do desenvolvedor"</b> no canto superior direito.</li>
              <li>Clique em <b>"Carregar sem compactação"</b> e selecione a pasta da extensão abaixo:</li>
            </ol>
          </div>

          <div className="flex items-center gap-2 bg-[#090d16] p-2.5 rounded-xl border border-[#1e293b]">
            <code className="text-xs text-indigo-300 font-mono flex-1 select-all">{extensionPath}</code>
            <button
              onClick={handleCopyPath}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {copiedPath ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPath ? 'Copiado!' : 'Copiar Caminho'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Configuration */}
      <form onSubmit={handleSaveNotif} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Alertas & Notificações Automáticas</h2>
              <p className="text-xs text-slate-400">Receba avisos no seu Telegram ou WhatsApp quando uma campanha terminar</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestNotif}
            disabled={notifTesting}
            className="px-4 py-2 bg-[#131c31] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>{notifTesting ? 'Enviando teste...' : 'Disparar Teste'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Telegram Settings */}
          <div className="p-4 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" /> Telegram Bot
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notif.telegramEnabled}
                  onChange={(e) => setNotif({ ...notif, telegramEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bot Token</label>
              <input
                type="text"
                value={notif.telegramBotToken}
                onChange={(e) => setNotif({ ...notif, telegramBotToken: e.target.value })}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full px-3 py-2 bg-[#090d16] border border-[#1e293b] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Chat ID (Seu ID ou do Grupo)</label>
              <input
                type="text"
                value={notif.telegramChatId}
                onChange={(e) => setNotif({ ...notif, telegramChatId: e.target.value })}
                placeholder="987654321"
                className="w-full px-3 py-2 bg-[#090d16] border border-[#1e293b] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* WhatsApp Webhook Settings */}
          <div className="p-4 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Webhook
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notif.whatsappEnabled}
                  onChange={(e) => setNotif({ ...notif, whatsappEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Webhook URL (Evolution / Z-API / Baileys)</label>
              <input
                type="text"
                value={notif.whatsappWebhookUrl}
                onChange={(e) => setNotif({ ...notif, whatsappWebhookUrl: e.target.value })}
                placeholder="https://api.meuzap.com/message/sendText/..."
                className="w-full px-3 py-2 bg-[#090d16] border border-[#1e293b] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <p className="text-[11px] text-slate-400 pt-3">
              Envia um payload JSON com status da campanha e alertas diretamente no seu webhook.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {notifSaved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Salvo com sucesso!
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Salvar Configurações de Notificação
          </button>
        </div>
      </form>

      {/* Modal Add Account */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCreate} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Conectar Nova Conta</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plataforma</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="FACEBOOK">Facebook</option>
                  <option value="INSTAGRAM">Instagram</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Identificação</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Perfil Vendas 01"
                  className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {platform === 'FACEBOOK' ? 'ID do Perfil / c_user' : 'Nome de Usuário (@)'}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={platform === 'FACEBOOK' ? '10008923485712' : 'minha_loja_oficial'}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cookies / Sessão (Opcional — modo simulação)</label>
              <textarea
                rows={3}
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                placeholder="c_user=1000...; xs=2%3A..."
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Para Facebook, cookies ainda funcionam em simulação. Para Instagram oficial use o bloco abaixo.</p>
            </div>

            {platform === 'INSTAGRAM' && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">✨ Instagram API Oficial (seguro — sem risco de ban)</h4>
                  <button type="button" onClick={handleValidateInstagram} disabled={igValidating} className="text-[11px] px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold">{igValidating ? 'Validando...' : 'Validar credenciais'}</button>
                </div>
                <p className="text-[11px] text-slate-400">Cole o Access Token de longa duração e o IG User ID do seu App em developers.facebook.com. Quando preenchido, a publicação usa a Graph API oficial (2 passos) em vez de cookies.</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Access Token (longa duração)</label>
                  <input type="text" value={igToken} onChange={(e) => setIgToken(e.target.value)} placeholder="EAAB..." className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">IG User ID (instagram_business_account.id)</label>
                  <input type="text" value={igUserId} onChange={(e) => setIgUserId(e.target.value)} placeholder="1784..." className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" />
                </div>
                {igMsg && <p className={`text-xs ${igMsg.startsWith('✓') ? 'text-emerald-400' : 'text-amber-300'}`}>{igMsg}</p>}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Proxy HTTP/SOCKS5 (Opcional)</label>
                <button type="button" onClick={handleValidateProxy} disabled={proxyValidating} className="text-[11px] px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold">{proxyValidating ? 'Validando...' : 'Validar proxy'}</button>
              </div>
              <input
                type="text"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder="http://usuario:senha@ip:porta"
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              {proxyMsg && <p className={`text-xs mt-1 ${proxyMsg.startsWith('✓') ? 'text-emerald-400' : 'text-amber-300'}`}>{proxyMsg}</p>}
              <p className="text-[11px] text-slate-500 mt-1">1 proxy por conta. Use residencial/móvel para Facebook e Instagram. Deixe vazio se for usar IP direto.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Conectar Conta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
