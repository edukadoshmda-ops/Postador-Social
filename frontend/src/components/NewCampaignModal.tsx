import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Image, Video, FileText, Play, Layers, Copy, Check, AlertTriangle, Users, ShieldCheck, ShieldAlert } from 'lucide-react';
import { api, Account, GroupList, CreativeItem } from '../core/apiService';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewCampaignModal({ isOpen, onClose, onSuccess }: NewCampaignModalProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'FACEBOOK' | 'INSTAGRAM'>('FACEBOOK');
  const [accountId, setAccountId] = useState('');
  const [groupListId, setGroupListId] = useState('');
  const [contentText, setContentText] = useState('');
  const [spintaxEnabled, setSpintaxEnabled] = useState(true);
  const [mediaType, setMediaType] = useState<'TEXT' | 'IMAGE' | 'VIDEO' | 'LINK'>('TEXT');
  const [mediaUrl, setMediaUrl] = useState('');
  const [spintaxSamples, setSpintaxSamples] = useState<string[]>([]);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupLists, setGroupLists] = useState<GroupList[]>([]);
  const [creatives, setCreatives] = useState<CreativeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [accRes, listRes, libRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/groups/lists'),
        api.get('/library'),
      ]);
      setAccounts(accRes.data.data);
      if (accRes.data.data.length > 0) setAccountId(accRes.data.data[0].id);

      setGroupLists(listRes.data.data);
      if (listRes.data.data.length > 0) setGroupListId(listRes.data.data[0].id);

      setCreatives(libRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [contentCheck, setContentCheck] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [accountLimits, setAccountLimits] = useState<any>(null);
  const [allowHighRisk, setAllowHighRisk] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
  const [balancedMode, setBalancedMode] = useState(false);
  const [balancedMaxAccounts, setBalancedMaxAccounts] = useState(3);
  const [cooldownEnabled, setCooldownEnabled] = useState(true);
  const [cooldownDays, setCooldownDays] = useState(7);
  const [cooldownInfo, setCooldownInfo] = useState<any>(null);
  const [filterPrivate, setFilterPrivate] = useState(true);
  const [filterQuarantine, setFilterQuarantine] = useState(true);
  // Agendamento recorrente
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleDays, setScheduleDays] = useState<number[]>([1,2,3,4,5]);
  const [scheduleInterval, setScheduleInterval] = useState(24);

  useEffect(() => {
    if (!accountId) { setAccountLimits(null); return; }
    api.get('/stats/health').then((r) => {
      const h = r.data.data.health.find((x: any) => x.accountId === accountId);
      setAccountLimits(h || null);
    }).catch(() => {});
  }, [accountId]);

  useEffect(() => {
    if (!groupListId) { setCooldownInfo(null); return; }
    const days = cooldownEnabled ? cooldownDays : 0;
    if (!cooldownEnabled) { setCooldownInfo(null); return; }
    api.get(`/campaigns/cooldown-check/${groupListId}?days=${days}`).then((r) => setCooldownInfo(r.data.data)).catch(() => setCooldownInfo(null));
  }, [groupListId, cooldownEnabled, cooldownDays]);

  const handleCopySample = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const countSpintaxVariations = (t: string) => {
    const re = /\{([^{}]+)\}/g;
    let m; let total = 1;
    while ((m = re.exec(t)) !== null) {
      const opts = m[1].split('|').filter(Boolean).length || 1;
      total *= Math.max(1, opts);
      if (total > 9999) break;
    }
    return total;
  };

  const [duplicateHits, setDuplicateHits] = useState<any[]>([]);
  const [isCheckingDup, setIsCheckingDup] = useState(false);

  const handleCheckContent = async () => {
    if (!contentText) return;
    setIsChecking(true);
    try {
      const res = await api.post('/campaigns/validate', { contentText, spintaxEnabled });
      setContentCheck(res.data.data);
    } catch (err) { console.error(err); } finally { setIsChecking(false); }
  };

  const handleCheckDuplicate = async () => {
    if (!contentText) return;
    setIsCheckingDup(true);
    try {
      const res = await api.post('/campaigns/duplicate-check', { contentText, threshold: 0.85 });
      setDuplicateHits(res.data.data.hits || []);
    } catch (err) { console.error(err); } finally { setIsCheckingDup(false); }
  };

  const handleTestSpintax = async () => {
    if (!contentText) return;
    setIsGeneratingSamples(true);
    try {
      const res = await api.post('/library/spintax-preview', { text: contentText, count: 5 });
      setSpintaxSamples(res.data.data.samples);
      if (res.data.data.check) setContentCheck(res.data.data.check);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSamples(false);
    }
  };

  const handleApplyTemplate = (c: CreativeItem) => {
    setContentText(c.content_text);
    setSpintaxEnabled(!!c.spintax_enabled);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contentText || (!balancedMode && !accountId) || !groupListId) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    // checa risco antes de criar — bloqueia alto sem confirmação
    let check = contentCheck;
    if (!check) {
      try {
        const r = await api.post('/campaigns/validate', { contentText, spintaxEnabled });
        check = r.data.data;
        setContentCheck(check);
      } catch {}
    }
    if (check && check.risk === 'alto' && !allowHighRisk) {
      setError(`Conteúdo com risco ALTO (score ${check.score}/100): ${check.warnings[0] || 'ajuste o texto'}. Corrija o texto ou marque "Criar mesmo assim (assumo o risco)" para prosseguir.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      let calibration: any = null;
      try {
        const raw = localStorage.getItem('pulso_calibration');
        if (raw) {
          const c = JSON.parse(raw);
          calibration = {
            minDelaySeconds: c.minDelay,
            maxDelaySeconds: c.maxDelay,
            randomJitterSeconds: c.jitter,
            pauseAfterPosts: c.pauseAfter,
            pauseDurationMinutes: c.pauseDuration,
            maxPostsPerDay: c.maxDaily,
            stopOnBlock: c.stopOnBlock,
            humanPattern: c.humanPattern,
            variationalDelay: true,
            safeWindowEnabled: c.safeWindowEnabled,
            safeWindowStartHour: c.safeWindowStartHour,
            safeWindowEndHour: c.safeWindowEndHour,
          };
        }
      } catch {}
      const schedule = scheduleEnabled ? { enabled: true, frequency: scheduleFreq, time: scheduleTime, daysOfWeek: scheduleDays, intervalHours: scheduleInterval } : null;
      const cooldownPayload = cooldownEnabled ? { cooldownDays, skipCooldownCheck: false } : { skipCooldownCheck: true };
      const filterPayload = { skipPrivateCheck: !filterPrivate, skipQuarantineCheck: !filterQuarantine };
      if (balancedMode) {
        await api.post('/campaigns/balanced', {
          name,
          type: 'POSTER',
          platform,
          groupListId,
          contentText,
          spintaxEnabled,
          mediaType,
          mediaUrls: mediaUrl ? [mediaUrl] : [],
          calibration,
          schedule,
          shuffleEnabled,
          maxAccounts: balancedMaxAccounts,
          ...cooldownPayload,
          ...filterPayload,
        });
      } else {
        await api.post('/campaigns', {
          name,
          type: 'POSTER',
          platform,
          accountId,
          groupListId,
          contentText,
          spintaxEnabled,
          mediaType,
          mediaUrls: mediaUrl ? [mediaUrl] : [],
          calibration,
          schedule,
          shuffleEnabled,
          ...cooldownPayload,
          ...filterPayload,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0c1222]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Send className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Nova Campanha de Postagens</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Nome & Plataforma */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nome da Campanha *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Divulgação Feira do Rolo SP"
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Plataforma
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="FACEBOOK">Facebook Grupos</option>
                <option value="INSTAGRAM">Instagram Feed</option>
              </select>
            </div>
          </div>

          {/* Distribuição inteligente */}
          <div className="p-3 bg-[#131c31] border border-[#1e293b] rounded-xl flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={balancedMode} onChange={(e) => setBalancedMode(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-400" /> Distribuir automaticamente entre contas saudáveis</span>
            </label>
            {balancedMode && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Máx contas</span>
                <input type="number" min={2} max={5} value={balancedMaxAccounts} onChange={(e) => setBalancedMaxAccounts(Number(e.target.value))} className="w-16 px-2 py-1.5 bg-[#0f172a] border border-[#1e293b] rounded-lg text-white text-xs" />
              </div>
            )}
          </div>
          {balancedMode && <p className="text-[11px] text-slate-400 -mt-3">Cria {balancedMaxAccounts} campanhas dividindo os grupos por round-robin entre as contas com mais folga e maior trust. Recomendado para listas grandes.</p>}

          {/* Conta & Lista de Grupos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Conta de Envio * {!balancedMode && <span className="text-red-400">*</span>}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={balancedMode}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-white focus:outline-none focus:border-indigo-500 text-sm ${balancedMode ? 'bg-[#0f172a] border-[#1e293b] opacity-50 cursor-not-allowed' : 'bg-[#131c31] border-[#1e293b]'}`}
                required={!balancedMode}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.platform}) - Score {acc.trust_score}%
                  </option>
                ))}
              </select>
              {balancedMode && <p className="text-[11px] text-slate-500 mt-1">Ignorado no modo distribuído — contas escolhidas automaticamente</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Lista de Grupos Alvo *
              </label>
              <select
                value={groupListId}
                onChange={(e) => setGroupListId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-indigo-500 text-sm"
                required
              >
                {groupLists.map((gl) => (
                  <option key={gl.id} value={gl.id}>
                    {gl.name} ({gl.total_groups} grupos)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Templates rápidos da biblioteca */}
          {creatives.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Modelos Rápidos da Biblioteca
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {creatives.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleApplyTemplate(c)}
                    className="px-3 py-1.5 bg-[#131c31] hover:bg-[#1e293b] border border-[#1e293b] rounded-xl text-xs text-slate-300 hover:text-white transition-colors shrink-0"
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tipo de Mídia */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Formato da Postagem
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'TEXT', label: 'Texto', icon: FileText },
                { id: 'IMAGE', label: 'Foto / Imagem', icon: Image },
                { id: 'VIDEO', label: 'Vídeo', icon: Video },
                { id: 'LINK', label: 'Link Preview', icon: Play },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = mediaType === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setMediaType(fmt.id as any)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-semibold'
                        : 'bg-[#131c31] border-[#1e293b] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {mediaType !== 'TEXT' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Fazer Upload do Computador ou Inserir URL
                </label>
                
                {/* File Upload Zone */}
                <div className="border-2 border-dashed border-[#1e293b] hover:border-indigo-500/50 rounded-2xl p-4 bg-[#131c31]/50 text-center space-y-2 cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept={mediaType === 'VIDEO' ? 'video/*' : 'image/*'}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await api.post('/upload', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        setMediaUrl(res.data.data.url);
                      } catch (err) {
                        console.error('Error uploading file', err);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-slate-400">
                    <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                      📁 Clique ou Arraste o arquivo aqui
                    </span>
                    <span>Formatos: PNG, JPG, WEBP, MP4 (até 100MB)</span>
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Ou cole a URL direta: https://exemplo.com/imagem.jpg"
                  className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* Texto com Spintax */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Texto / Copy da Postagem *
              </label>
              <label className="flex items-center gap-1.5 text-xs text-indigo-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spintaxEnabled}
                  onChange={(e) => setSpintaxEnabled(e.target.checked)}
                  className="rounded border-[#1e293b] text-indigo-600 focus:ring-indigo-500"
                />
                <span>Habilitar Spintax</span>
              </label>
            </div>
            <textarea
              rows={5}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="{Olá|Oi|E aí} pessoal! {Confiram|Vejam} essa {grande|super} novidade..."
              className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-mono"
              required
            />
          </div>

          {/* Limite da conta selecionada */}
          {accountLimits && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${accountLimits.risk === 'alto' ? 'bg-red-500/10 border-red-500/30 text-red-300' : accountLimits.risk === 'medio' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
              <span>Limite desta conta: <b>{accountLimits.effectiveLimits.maxPostsPerHour}/h · {accountLimits.effectiveLimits.maxPostsPerDay}/dia</b> · trust {accountLimits.trust_score}% · {accountLimits.status}{accountLimits.status === 'WARMING' ? ' (aquecimento)' : ''}</span>
              <span className="text-[11px] opacity-80">{accountLimits.state.postsThisHour} nesta hora</span>
            </div>
          )}

          {/* Verificação anti-spam + duplicado */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleCheckContent} disabled={isChecking || !contentText} className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold">{isChecking ? 'Verificando...' : 'Verificar risco de spam'}</button>
            <button type="button" onClick={handleCheckDuplicate} disabled={isCheckingDup || !contentText} className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold">{isCheckingDup ? 'Verificando...' : 'Verificar duplicado >85%'}</button>
            {contentCheck && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${contentCheck.risk === 'alto' ? 'bg-red-500/15 border-red-500/30 text-red-300' : contentCheck.risk === 'medio' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'}`}>
                risco {contentCheck.risk} · score {contentCheck.score}/100
              </span>
            )}
          </div>
          {duplicateHits.length > 0 && (
            <div className="p-3 rounded-xl border bg-red-500/10 border-red-500/20 text-red-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Texto muito similar a campanha existente (&gt;85%):</div>
              {duplicateHits.map((h: any) => (<div key={h.campaignId} className="flex gap-1.5"><span className="font-bold">{Math.round(h.similarity * 100)}% — {h.campaignName}</span><span className="opacity-80 truncate">"{h.preview}"</span></div>))}
              <div className="text-[11px] opacity-80">Reescreva com Spintax variado ou use hashtags/links diferentes. A variação de hashtags/links já é aplicada automaticamente no envio.</div>
            </div>
          )}
          {contentCheck && contentCheck.warnings && contentCheck.warnings.length > 0 && (
            <div className={`p-3 rounded-xl border text-xs space-y-1 ${contentCheck.risk === 'alto' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
              {contentCheck.warnings.map((w: string, i: number) => (<div key={i} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{w}</span></div>))}
              {contentCheck.suggestions.length > 0 && <div className="pt-1 text-[11px] opacity-90">Sugestões: {contentCheck.suggestions.join(' · ')}</div>}
            </div>
          )}
          {contentCheck && contentCheck.risk === 'alto' && (
            <label className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer">
              <input type="checkbox" checked={allowHighRisk} onChange={(e) => setAllowHighRisk(e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
              <span className="text-xs font-bold text-red-300">Criar mesmo assim (assumo o risco de bloqueio)</span>
            </label>
          )}

          {/* Filtros + fila + cooldown */}
          <div className="p-3 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={shuffleEnabled} onChange={(e) => setShuffleEnabled(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white">Embaralhar fila de grupos</span>
              <span className="text-[11px] text-slate-400">Recomendado — quebra padrão sequencial</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cooldownEnabled} onChange={(e) => setCooldownEnabled(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white">Respeitar cooldown por grupo</span>
              <span className="text-[11px] text-slate-400">Não repostar no mesmo grupo em</span>
              <input type="number" min={1} max={30} value={cooldownDays} onChange={(e) => setCooldownDays(Number(e.target.value))} disabled={!cooldownEnabled} className="w-14 px-2 py-1 bg-[#0f172a] border border-[#1e293b] rounded-lg text-white text-xs disabled:opacity-50" />
              <span className="text-[11px] text-slate-400">dias</span>
            </label>
            {cooldownInfo && (
              <div className={`text-[11px] p-2 rounded-lg border ${cooldownInfo.blocked > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                {cooldownInfo.blocked > 0 ? `${cooldownInfo.blocked} grupo(s) em cooldown (${cooldownInfo.days}d) serão ignorados · ${cooldownInfo.allowed} liberados de ${cooldownInfo.total}` : `${cooldownInfo.allowed}/${cooldownInfo.total} grupos liberados (nenhum em cooldown)`}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filterPrivate} onChange={(e) => setFilterPrivate(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white">Pular grupos privados/fechados</span>
              <span className="text-[11px] text-slate-400">Maior risco de moderação</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filterQuarantine} onChange={(e) => setFilterQuarantine(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white">Pular grupos em quarentena (2+ falhas em 14d)</span>
            </label>
          </div>

          <div className="p-3.5 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white">Agendamento recorrente</span>
              <span className="text-[11px] text-slate-400">Repete a campanha automaticamente após concluir</span>
            </label>
            {scheduleEnabled && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Frequência</label>
                    <select value={scheduleFreq} onChange={(e) => setScheduleFreq(e.target.value as any)} className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-xs">
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="custom">A cada N horas</option>
                    </select>
                  </div>
                  {scheduleFreq !== 'custom' ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Horário</label>
                      <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-xs" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Intervalo (horas)</label>
                      <input type="number" min={1} max={168} value={scheduleInterval} onChange={(e) => setScheduleInterval(Number(e.target.value))} className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-xs" />
                    </div>
                  )}
                </div>
                {scheduleFreq === 'weekly' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Dias da semana</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' },
                      ].map((d) => (
                        <button key={d.id} type="button" onClick={() => setScheduleDays((prev) => prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id])} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${scheduleDays.includes(d.id) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#0f172a] border-[#1e293b] text-slate-400'}`}>{d.label}</button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-500">O backend reseta os itens para "Na Fila" e dispara no horário. Agendamento é pausado se a conta entrar em checkpoint.</p>
              </div>
            )}
          </div>

          {/* Auditoria pré-envio — checklist de segurança */}
          <div className="p-3.5 bg-[#0f172a] border border-[#1e293b] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {(() => {
                  const v = countSpintaxVariations(contentText);
                  const okSpam = !contentCheck || contentCheck.risk !== 'alto';
                  const okDup = duplicateHits.length === 0;
                  const okVar = !contentText || v >= 20 || !spintaxEnabled || v >= 5;
                  const okList = !!groupListId;
                  const allOk = okSpam && okDup && okVar && okList && contentText.length > 20;
                  return allOk ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />;
                })()}
                Auditoria pré-envio — checklist de segurança
              </span>
              <button type="button" onClick={async () => { await handleCheckContent(); await handleCheckDuplicate(); await handleTestSpintax(); }} className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">Rodar auditoria completa</button>
            </div>
            <div className="space-y-1.5 text-xs">
              {(() => {
                const v = contentText ? countSpintaxVariations(contentText) : 0;
                const items: { label: string; ok: boolean | null; hint: string }[] = [
                  { label: 'Conteúdo com Spintax variado (20+ variações)', ok: !contentText ? null : v >= 20, hint: v ? `~${v > 9999 ? '9.999+' : v} variações` : 'adicione {a|b}' },
                  { label: 'Risco de spam baixo/médio', ok: !contentCheck ? null : contentCheck.risk !== 'alto', hint: contentCheck ? `${contentCheck.risk} · ${contentCheck.score}/100` : 'clique em Verificar risco' },
                  { label: 'Sem duplicado >85% com outras campanhas', ok: duplicateHits.length === 0 ? (contentText ? true : null) : false, hint: duplicateHits.length ? `${duplicateHits.length} duplicado(s)` : 'ok' },
                  { label: 'Lista de grupos selecionada e com grupos liberados', ok: !groupListId ? false : !cooldownInfo ? null : cooldownInfo.allowed > 0, hint: cooldownInfo ? `${cooldownInfo.allowed}/${cooldownInfo.total} liberados` : groupListId ? 'verificando cooldown...' : 'selecione lista' },
                  { label: 'Filtros de segurança ativos (privados/quarentena)', ok: filterPrivate && filterQuarantine ? true : null, hint: filterPrivate && filterQuarantine ? 'ativos' : 'parcial' },
                  { label: 'Conta dentro do limite e sem risco alto', ok: !accountLimits ? null : accountLimits.risk !== 'alto' && (accountLimits.state.remainingHour ?? 0) > 0, hint: accountLimits ? `${accountLimits.risk} · ${accountLimits.state.remainingHour ?? 0} restantes/h` : 'selecione conta' },
                ];
                return items.map((it, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${it.ok === true ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : it.ok === false ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-[#131c31] border-[#1e293b] text-slate-400'}`}>
                    <span className="flex items-center gap-1.5">{it.ok === true ? <Check className="w-3.5 h-3.5" /> : it.ok === false ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 opacity-60" />}{it.label}</span>
                    <span className="text-[11px] font-bold">{it.hint}</span>
                  </div>
                ));
              })()}
            </div>
            <p className="text-[11px] text-slate-500">Dica: deixe tudo verde antes de criar. O backend também bloqueia risco ALTO e respeita cooldown/quarentena/privados automaticamente.</p>
          </div>

          {/* Spintax Test Preview - turbinado com aninhamento + variação estimada */}
          {spintaxEnabled && (
            <div className="p-3.5 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Testador de Spintax (aninhado)
                </span>
                <button
                  type="button"
                  onClick={handleTestSpintax}
                  disabled={isGeneratingSamples || !contentText}
                  className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-medium transition-colors"
                >
                  {isGeneratingSamples ? 'Gerando...' : 'Gerar 5 variações'}
                </button>
              </div>
              {contentText && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`px-2 py-1 rounded-full border font-bold ${countSpintaxVariations(contentText) < 5 ? 'bg-red-500/15 border-red-500/30 text-red-300' : countSpintaxVariations(contentText) < 20 ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'}`}>
                    ~{countSpintaxVariations(contentText) > 9999 ? '9.999+' : countSpintaxVariations(contentText)} variações possíveis
                  </span>
                  {countSpintaxVariations(contentText) < 5 && (
                    <span className="flex items-center gap-1 text-amber-300"><AlertTriangle className="w-3 h-3" /> Use Spintax: {'{Olá|Oi|Fala} {galera|pessoal} {confira|veja} {essa|esta} oferta'}</span>
                  )}
                  {countSpintaxVariations(contentText) >= 20 && <span className="text-emerald-300 flex items-center gap-1"><Check className="w-3 h-3" /> Bom — baixo risco de duplicado</span>}
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-tight">Dica: agora com <b>aninhamento</b> → <code className="px-1 py-0.5 bg-[#0c1222] border border-[#1e293b] rounded">{'{Olá|{Oi|Fala} galera}'}</code> funciona e multiplica variações. Cada postagem sorteia uma versão diferente.</p>
              {spintaxSamples.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {spintaxSamples.map((sample, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 p-2.5 bg-[#0c1222] border border-[#1e293b] rounded-lg text-xs text-slate-300">
                      <span className="flex-1"><span className="text-indigo-400 font-bold mr-1.5">#{idx + 1}:</span>{sample}</span>
                      <button type="button" onClick={() => handleCopySample(sample, idx)} className="p-1 rounded-lg bg-[#131c31] hover:bg-[#1e293b] text-slate-300 shrink-0" title="Copiar variação">{copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
                    </div>
                  ))}
                  {new Set(spintaxSamples).size < spintaxSamples.length && <p className="text-[11px] text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Variações repetidas — adicione mais opções no Spintax.</p>}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1e293b] bg-[#0c1222]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Criando...' : 'Criar Campanha'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
