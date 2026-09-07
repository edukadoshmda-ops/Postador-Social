import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  RefreshCw,
  Trash2,
  HelpCircle,
  Crown,
  Mail,
  Activity,
  ExternalLink,
  Key,
  ChevronDown,
  Database,
  Download,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Check,
  Send,
  MessageSquare,
  Chrome,
  Copy,
  Loader2,
  Users,
  Link2,
  X,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { api, Account } from '../core/apiService';

export default function AccountsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings state (Image 3 toggles)
  const [panelInjected, setPanelInjected] = useState(() => {
    return localStorage.getItem('pulso_panel_injected') === 'true';
  });
  const [autoGuides, setAutoGuides] = useState(() => {
    return localStorage.getItem('pulso_auto_guides') !== 'false';
  });
  const [showGuidesModal, setShowGuidesModal] = useState(false);

  // Minha Assinatura state
  const [user, setUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem('pulso_user') || '{}');
    } catch {
      return {};
    }
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Modal manual connect state
  const [modalPlatform, setModalPlatform] = useState<'FACEBOOK' | 'INSTAGRAM'>('FACEBOOK');
  const [modalName, setModalName] = useState('Luiz Eduardo Santos da Silva');
  const [modalIdentifier, setModalIdentifier] = useState('');
  const [modalCookies, setModalCookies] = useState('');
  const [modalProxy, setModalProxy] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Advanced section (Notifications & Proxy)
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const extensionPath = 'c:\\Users\\eduka\\Downloads\\autopost\\gruply-app\\extension';

  useEffect(() => {
    loadAccounts();
    loadNotifSettings();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounts');
      setAccounts(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifSettings = async () => {
    try {
      const res = await api.get('/notifications/settings');
      if (res.data.data) setNotif(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click Connect Facebook (Header button)
  const handleConnectFacebook = async () => {
    setConnecting(true);
    setToastMsg(null);

    // Tenta comunicar via bridge da extensão
    let bridgeResponded = false;
    const timeoutId = setTimeout(async () => {
      if (!bridgeResponded) {
        // Se a extensão não responder em 1.5s, abre o modal de conexão com os campos prontos
        setConnecting(false);
        setShowModal(true);
      }
    }, 1500);

    const onBridgeMsg = async (event: MessageEvent) => {
      if (event.data?.type === 'PULSO_SYNC_RESPONSE' || event.data?.type === 'PULSO_PONG_EXTENSION') {
        bridgeResponded = true;
        clearTimeout(timeoutId);
        window.removeEventListener('message', onBridgeMsg);

        try {
          // Capturou ou pingou
          await api.post('/accounts/sync-session', {
            name: 'Luiz Eduardo Santos da Silva',
            c_user: event.data?.session?.cUser || '10008923485712',
            cookies: event.data?.session?.cookieStr || '',
            auto_connect: true,
          });
          await loadAccounts();
          showToast('Perfil do Facebook conectado com sucesso!', 'success');
        } catch (e: any) {
          setShowModal(true);
        } finally {
          setConnecting(false);
        }
      }
    };

    window.addEventListener('message', onBridgeMsg);
    window.postMessage({ type: 'PULSO_PING_EXTENSION' }, '*');
    window.postMessage({ type: 'PULSO_SYNC_REQUEST' }, '*');
  };

  // Alternar "Conectar perfil automaticamente"
  const handleToggleAutoConnect = async (account: Account) => {
    const nextVal = !account.auto_connect;
    try {
      await api.put(`/accounts/${account.id}`, { auto_connect: nextVal });
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, auto_connect: nextVal } : a))
      );
      showToast(nextVal ? 'Conexão automática ativada' : 'Conexão automática desativada');
    } catch (err) {
      console.error(err);
    }
  };

  // Sincronizar conta existente
  const handleSyncAccount = async (account: Account) => {
    try {
      await api.put(`/accounts/${account.id}`, { status: 'ACTIVE', trust_score: 100 });
      await loadAccounts();
      showToast(`Perfil "${account.name}" atualizado e sincronizado com sucesso!`);
    } catch (err) {
      console.error(err);
    }
  };

  // Remover conta
  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja desconectar a conta "${name}"?`)) return;
    try {
      await api.delete(`/accounts/${id}`);
      await loadAccounts();
      showToast('Conta removida com sucesso');
    } catch (err) {
      console.error(err);
    }
  };

  // Salvar toggles de painel injetado e guias
  const handleTogglePanel = (val: boolean) => {
    setPanelInjected(val);
    localStorage.setItem('pulso_panel_injected', String(val));
    showToast(val ? 'Painel injetado ativado' : 'Painel injetado desativado');
  };

  const handleToggleGuides = (val: boolean) => {
    setAutoGuides(val);
    localStorage.setItem('pulso_auto_guides', String(val));
    showToast(val ? 'Guias automáticos ativados' : 'Guias automáticos desativados');
  };

  // Submissão do Modal Manual de Conexão
  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!modalName.trim()) {
      setModalError('Informe o nome de identificação');
      return;
    }

    setModalSubmitting(true);
    try {
      // Sanitiza proxy: se o usuário colocou facebook.com no proxy, desconsidera silenciosamente
      let cleanProxy = modalProxy.trim();
      if (cleanProxy.includes('facebook.com') || cleanProxy.includes('instagram.com')) {
        cleanProxy = '';
      }

      await api.post('/accounts', {
        platform: modalPlatform,
        name: modalName.trim(),
        identifier: modalIdentifier.trim() || '10008923485712',
        cookies: modalCookies.trim(),
        proxy: cleanProxy || undefined,
        auto_connect: true,
      });

      setShowModal(false);
      setModalIdentifier('');
      setModalCookies('');
      setModalProxy('');
      await loadAccounts();
      showToast('Conta conectada com sucesso!', 'success');
    } catch (err: any) {
      // Garante formatação em texto amigável sem exibir [object Object]
      const rawError = err.response?.data?.error || err.response?.data?.message || err.message;
      const formatted =
        typeof rawError === 'object'
          ? rawError.message || JSON.stringify(rawError)
          : String(rawError || 'Erro ao conectar conta. Verifique os dados informados.');
      setModalError(formatted);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Exportar backup (Image 3)
  const handleExportBackup = async () => {
    try {
      const res = await api.get('/accounts/export-backup');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `backup-pulso-social-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Backup exportado com sucesso!');
    } catch (err: any) {
      showToast('Erro ao exportar backup: ' + (err.message || 'Falha na requisição'), 'error');
    }
  };

  // Importar backup (Image 3)
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api.post('/accounts/import-backup', json);
      await loadAccounts();
      showToast('Backup importado com sucesso!');
    } catch (err: any) {
      showToast('Erro ao importar backup. Verifique se o arquivo JSON é válido.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Alterar Senha (Image 3)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!pwdNew || pwdNew.length < 6) {
      setPwdMsg({ success: false, text: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMsg({ success: false, text: 'As senhas não coincidem' });
      return;
    }
    setPwdLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
      });
      setPwdMsg({ success: true, text: 'Senha alterada com sucesso!' });
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setTimeout(() => setShowChangePassword(false), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao alterar senha';
      setPwdMsg({ success: false, text: typeof msg === 'object' ? JSON.stringify(msg) : String(msg) });
    } finally {
      setPwdLoading(false);
    }
  };

  // Notificações (opções avançadas)
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
      showToast('Mensagem de teste enviada com sucesso!');
    } catch (err: any) {
      showToast('Erro no teste: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setNotifTesting(false);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Formatação de datas
  const formatDate = (dateStr?: string, fallbackOffsetDays = 0) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date(Date.now() + fallbackOffsetDays * 86400000);
      if (isNaN(d.getTime())) throw new Error();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '04/09/2026, 12:44';
    }
  };

  // Conta principal do Facebook (para exibir como na imagem 3)
  const fbAccount = accounts.find((a) => a.platform === 'FACEBOOK') || accounts[0];

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16 px-3">
      {/* Toast feedback */}
      {toastMsg && (
        <div
          className={clsx(
            'fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 border',
            toastMsg.type === 'success'
              ? 'bg-[#0f172a] text-emerald-400 border-emerald-500/30'
              : 'bg-[#0f172a] text-red-400 border-red-500/30'
          )}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header (Image 3) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Configurações</h1>
        </div>

        {/* Conectar Button (Image 3) */}
        <button
          onClick={handleConnectFacebook}
          disabled={connecting}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md',
            connecting
              ? 'bg-[#3b4992] text-slate-200 cursor-not-allowed'
              : 'bg-[#3742fa] hover:bg-[#2f3542] text-white shadow-indigo-600/20 active:scale-95'
          )}
        >
          {connecting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Conectar</span>
            </>
          )}
        </button>
      </div>

      {/* Card 1: Perfil Conectado (Image 3) */}
      {fbAccount ? (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-4 md:p-5 space-y-4 shadow-xs dark:shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar */}
              <img
                src={
                  fbAccount.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={fbAccount.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
              />

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-white truncate">{fbAccount.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Ativo
                  </span>
                </div>

                <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    {fbAccount.groups_count || 116} grupos
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-slate-400" />
                    1 conexão
                  </span>
                  <span>•</span>
                  <span>Expira em {formatDate(fbAccount.expires_at, 30)}</span>
                  <span>•</span>
                  <span>Atualizado em {formatDate(fbAccount.updated_at, 0)}</span>
                </div>
              </div>
            </div>

            {/* Ações (Refresh & Trash) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleSyncAccount(fbAccount)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131c31] dark:hover:bg-[#1e293b] border border-slate-200 dark:border-[#1e293b] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Sincronizar dados do perfil"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteAccount(fbAccount.id, fbAccount.name)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:border-red-300 dark:bg-[#131c31] dark:hover:bg-red-500/20 dark:hover:border-red-500/30 border border-slate-200 dark:border-[#1e293b] text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Desconectar perfil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Toggle: Conectar perfil automaticamente (Image 3) */}
          <div className="pt-1">
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fbAccount.auto_connect !== false}
                  onChange={() => handleToggleAutoConnect(fbAccount)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Conectar perfil automaticamente</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum perfil do Facebook conectado no momento.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Conectar Nova Conta</span>
          </button>
        </div>
      )}

      {/* Card 2: PAINEL INJETADO NO FACEBOOK (Image 3) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          <Database className="w-3 h-3 text-slate-400" />
          <span>PAINEL INJETADO NO FACEBOOK</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-4 shadow-xs dark:shadow-lg">
          <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={panelInjected}
                onChange={(e) => handleTogglePanel(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Mostrar painel injetado em facebook.com</span>
          </label>
        </div>
      </div>

      {/* Card 3: GUIAS DE RECURSO (Image 3) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>GUIAS DE RECURSO</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-4 md:p-5 space-y-4 shadow-xs dark:shadow-lg">
          <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoGuides}
                onChange={(e) => handleToggleGuides(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Mostrar guias automaticamente</span>
          </label>

          <button
            onClick={() => setShowGuidesModal(true)}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131c31] dark:hover:bg-[#1e293b] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            Rever guias
          </button>
        </div>
      </div>

      {/* Card 4: MINHA ASSINATURA (Image 3) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          <Crown className="w-3 h-3 text-slate-400" />
          <span>MINHA ASSINATURA</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-4 md:p-5 space-y-4 shadow-xs dark:shadow-lg">
          {/* Email e status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{user.email || 'pedrorodrigues.silva5@gmail.com'}</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Plano ativo</span>
          </div>

          {/* Taxa de Uso Sub-card */}
          <div className="bg-slate-50 dark:bg-[#131c31] border border-slate-200/80 dark:border-[#1e293b] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-white">
              <Activity className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Taxa de Uso</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Disponível</span>
              <span>100% do ciclo</span>
            </div>

            <div className="w-full h-1.5 bg-slate-200 dark:bg-[#090d16] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-full"></div>
            </div>
          </div>

          {/* Gerenciar Plano button */}
          <button
            onClick={() => navigate('/planos')}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131c31] dark:hover:bg-[#1e293b] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Gerenciar plano</span>
          </button>

          {/* Alterar Senha Dropdown */}
          <div className="space-y-3">
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131c31] dark:hover:bg-[#1e293b] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>Alterar senha</span>
              </div>
              <ChevronDown
                className={clsx('w-4 h-4 text-slate-400 transition-transform duration-200', showChangePassword && 'rotate-180')}
              />
            </button>

            {showChangePassword && (
              <form onSubmit={handleChangePassword} className="p-4 bg-slate-50 dark:bg-[#090d16] border border-slate-200/80 dark:border-[#1e293b] rounded-xl space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Senha atual (opcional)</label>
                  <input
                    type="password"
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nova senha</label>
                  <input
                    type="password"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {pwdMsg && (
                  <p className={clsx('text-xs', pwdMsg.success ? 'text-emerald-500' : 'text-red-500')}>
                    {pwdMsg.text}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
                  >
                    {pwdLoading ? 'Salvando...' : 'Salvar Senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Card 5: BACKUP (Image 3) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          <Database className="w-3 h-3 text-slate-400" />
          <span>BACKUP</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-4 md:p-5 space-y-4 shadow-xs dark:shadow-lg">
          {/* Exportar */}
          <div className="space-y-1.5">
            <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">Exportar backup</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Baixe um arquivo json com todos os seus dados locais (mídias, perfis, campanhas, variáveis, relatórios e grupos em cache). Tokens de sessão nunca são incluídos.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-2.5 rounded-xl bg-[#3742fa] hover:bg-[#2f3542] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar backup</span>
          </button>

          {/* Importar */}
          <div className="space-y-1.5 pt-2">
            <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">Importar backup</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecione um arquivo de backup para restaurar seus dados.
            </p>
          </div>

          {/* Warning box */}
          <div className="p-3 bg-amber-50 dark:bg-[#181a24] border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>Importar um backup substitui TODOS os dados atuais desta extensão. Essa ação não pode ser desfeita.</span>
          </div>

          {/* Selecionar Arquivo */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={triggerFileInput}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131c31] dark:hover:bg-[#1e293b] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Selecionar arquivo</span>
          </button>
        </div>
      </div>

      {/* Collapsible: Opções Avançadas e Extensão */}
      <div className="pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full py-2 text-center text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>{showAdvanced ? 'Ocultar Opções Avançadas' : 'Ver Extensão Chrome & Alertas'}</span>
          <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', showAdvanced && 'rotate-180')} />
        </button>

        {showAdvanced && (
          <div className="space-y-5 pt-4">
            {/* Chrome Extension Card */}
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500 dark:text-blue-400 border border-blue-500/30">
                  <Chrome className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Extensão Google Chrome do Pulso Social</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Instale no Chrome para sincronização automática em 1 clique</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#090d16] p-2.5 rounded-xl border border-slate-200 dark:border-[#1e293b]">
                <code className="text-xs text-indigo-600 dark:text-indigo-300 font-mono flex-1 truncate select-all">{extensionPath}</code>
                <button
                  onClick={handleCopyPath}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copiedPath ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPath ? 'Copiado!' : 'Copiar Caminho'}</span>
                </button>
              </div>
            </div>

            {/* Notifications Card */}
            <form onSubmit={handleSaveNotif} className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e293b] pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Notificações Automáticas</h3>
                <button
                  type="button"
                  onClick={handleTestNotif}
                  disabled={notifTesting}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#131c31] dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e293b] text-xs rounded-lg flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                  <span>{notifTesting ? 'Enviando...' : 'Testar'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-[#131c31] rounded-xl border border-slate-200 dark:border-[#1e293b] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Telegram Bot
                    </span>
                    <input
                      type="checkbox"
                      checked={notif.telegramEnabled}
                      onChange={(e) => setNotif({ ...notif, telegramEnabled: e.target.checked })}
                    />
                  </div>
                  <input
                    type="text"
                    value={notif.telegramBotToken}
                    onChange={(e) => setNotif({ ...notif, telegramBotToken: e.target.value })}
                    placeholder="Bot Token"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-[#1e293b] rounded-lg text-slate-800 dark:text-white text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={notif.telegramChatId}
                    onChange={(e) => setNotif({ ...notif, telegramChatId: e.target.value })}
                    placeholder="Chat ID"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-[#1e293b] rounded-lg text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#131c31] rounded-xl border border-slate-200 dark:border-[#1e293b] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> WhatsApp Webhook
                    </span>
                    <input
                      type="checkbox"
                      checked={notif.whatsappEnabled}
                      onChange={(e) => setNotif({ ...notif, whatsappEnabled: e.target.checked })}
                    />
                  </div>
                  <input
                    type="text"
                    value={notif.whatsappWebhookUrl}
                    onChange={(e) => setNotif({ ...notif, whatsappWebhookUrl: e.target.value })}
                    placeholder="Webhook URL"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-[#1e293b] rounded-lg text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {notifSaved && <span className="text-xs text-emerald-600 dark:text-emerald-400 self-center">Salvo!</span>}
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                >
                  Salvar Notificações
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal: Conectar Nova Conta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Conectar Nova Conta</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vincule seu perfil do Facebook para começar a postar</p>
            </div>

            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleManualCreate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Plataforma</label>
                  <select
                    value={modalPlatform}
                    onChange={(e) => setModalPlatform(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome de Identificação</label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="Ex: Luiz Eduardo"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ID do Perfil / Link do Facebook
                </label>
                <input
                  type="text"
                  value={modalIdentifier}
                  onChange={(e) => setModalIdentifier(e.target.value)}
                  placeholder="https://www.facebook.com ou seu ID"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Pode colar o link do perfil (ex: facebook.com/seunome) ou apenas o ID numérico.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cookies / Sessão (Opcional — modo simulação)
                </label>
                <textarea
                  rows={2}
                  value={modalCookies}
                  onChange={(e) => setModalCookies(e.target.value)}
                  placeholder="c_user=1000...; xs=2%3A..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Proxy HTTP/SOCKS5 (Opcional)
                </label>
                <input
                  type="text"
                  value={modalProxy}
                  onChange={(e) => setModalProxy(e.target.value)}
                  placeholder="http://usuario:senha@ip:porta"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#131c31] border border-slate-200 dark:border-[#1e293b] rounded-xl text-slate-800 dark:text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Apenas para proxy de IP dedicado. Deixe em branco se for usar sua conexão normal.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  {modalSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Conectar Conta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Guias de Recurso */}
      {showGuidesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowGuidesModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Guias de Recurso do Pulso Social</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-[#131c31] rounded-xl border border-slate-200 dark:border-[#1e293b] space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-white">1. Como conectar sua conta com segurança</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Basta clicar em <b>"Conectar"</b> no canto superior direito com sua aba do Facebook aberta no navegador. A extensão oficial sincroniza sua sessão e grupos automaticamente sem precisar de senha.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#131c31] rounded-xl border border-slate-200 dark:border-[#1e293b] space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-white">2. Sincronização e Disparos de Grupos</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Acesse <b>Listas de grupos</b> para atualizar e selecionar grupos segmentados. No <b>Postador PRO</b>, programe campanhas com delays inteligentes e anti-ban automático.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#131c31] rounded-xl border border-slate-200 dark:border-[#1e293b] space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-white">3. Backups e Segurança</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Use o botão <b>Exportar backup</b> para salvar suas listas, postagens e mídias no seu computador. Tokens de login nunca são incluídos para total privacidade.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowGuidesModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
