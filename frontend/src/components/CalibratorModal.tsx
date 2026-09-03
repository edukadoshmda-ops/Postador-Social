import React, { useState, useEffect } from 'react';
import { Sliders, Shield, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { api } from '../core/apiService';

interface CalibratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS: Record<string, { minDelay: number; maxDelay: number; jitter: number; pauseAfter: number; pauseDuration: number; maxDaily: number; label: string; desc: string; color: string }> = {
  conservador: { minDelay: 90, maxDelay: 220, jitter: 30, pauseAfter: 5, pauseDuration: 12, maxDaily: 25, label: 'Conservador', desc: 'Conta nova ou aquecendo — mais seguro, menos posts/hora', color: 'emerald' },
  moderado: { minDelay: 60, maxDelay: 180, jitter: 25, pauseAfter: 8, pauseDuration: 10, maxDaily: 35, label: 'Moderado', desc: 'Uso diário equilibrado — recomendado', color: 'amber' },
  agressivo: { minDelay: 40, maxDelay: 120, jitter: 15, pauseAfter: 12, pauseDuration: 6, maxDaily: 50, label: 'Agressivo', desc: 'Conta aquecida/trust alto — mais volume, mais risco', color: 'red' },
};

export default function CalibratorModal({ isOpen, onClose }: CalibratorModalProps) {
  const [humanPattern, setHumanPattern] = useState<'conservador' | 'moderado' | 'agressivo'>('moderado');
  const [minDelay, setMinDelay] = useState(PRESETS.moderado.minDelay);
  const [maxDelay, setMaxDelay] = useState(PRESETS.moderado.maxDelay);
  const [jitter, setJitter] = useState(PRESETS.moderado.jitter);
  const [pauseAfter, setPauseAfter] = useState(PRESETS.moderado.pauseAfter);
  const [pauseDuration, setPauseDuration] = useState(PRESETS.moderado.pauseDuration);
  const [maxDaily, setMaxDaily] = useState(PRESETS.moderado.maxDaily);
  const [stopOnBlock, setStopOnBlock] = useState(true);
  const [safeEnabled, setSafeEnabled] = useState(false);
  const [safeStart, setSafeStart] = useState(8);
  const [safeEnd, setSafeEnd] = useState(22);
  const [rotateEnabled, setRotateEnabled] = useState(false);
  const [rotateMax, setRotateMax] = useState(3);
  const [saved, setSaved] = useState(false);

  // carrega salvo ao abrir
  React.useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem('pulso_calibration');
      if (raw) {
        const c = JSON.parse(raw);
        if (c.humanPattern) setHumanPattern(c.humanPattern);
        if (c.minDelay) setMinDelay(c.minDelay);
        if (c.maxDelay) setMaxDelay(c.maxDelay);
        if (c.jitter) setJitter(c.jitter);
        if (c.pauseAfter) setPauseAfter(c.pauseAfter);
        if (c.pauseDuration) setPauseDuration(c.pauseDuration);
        if (c.maxDaily) setMaxDaily(c.maxDaily);
        if (typeof c.stopOnBlock === 'boolean') setStopOnBlock(c.stopOnBlock);
        if (typeof c.safeWindowEnabled === 'boolean') setSafeEnabled(c.safeWindowEnabled);
        if (c.safeWindowStartHour !== undefined) setSafeStart(Number(c.safeWindowStartHour));
        if (c.safeWindowEndHour !== undefined) setSafeEnd(Number(c.safeWindowEndHour));
        if (c.rotatePool) { if (typeof c.rotatePool.enabled === 'boolean') setRotateEnabled(!!c.rotatePool.enabled); if (c.rotatePool.maxAccounts) setRotateMax(Number(c.rotatePool.maxAccounts)); }
      }
    } catch {}
  }, [isOpen]);

  const applyPreset = (k: 'conservador' | 'moderado' | 'agressivo') => {
    const p = PRESETS[k];
    setHumanPattern(k);
    setMinDelay(p.minDelay);
    setMaxDelay(p.maxDelay);
    setJitter(p.jitter);
    setPauseAfter(p.pauseAfter);
    setPauseDuration(p.pauseDuration);
    setMaxDaily(p.maxDaily);
  };

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get('/accounts').then((r) => {
      const list = r.data.data || [];
      setAccounts(list);
      if (list.length > 0 && !selectedAccountId) setSelectedAccountId(list[0].id);
    }).catch(() => {});
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(
      'pulso_calibration',
      JSON.stringify({ humanPattern, minDelay, maxDelay, jitter, pauseAfter, pauseDuration, maxDaily, stopOnBlock, variationalDelay: true, safeWindowEnabled: safeEnabled, safeWindowStartHour: safeStart, safeWindowEndHour: safeEnd, rotatePool: { enabled: rotateEnabled, maxAccounts: rotateMax } })
    );
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const handleApplyToAccount = async () => {
    if (!selectedAccountId) return;
    const mapHour: Record<string, number> = { conservador: 6, moderado: 12, agressivo: 15 };
    try {
      await api.put(`/accounts/${selectedAccountId}/limits`, { maxPostsPerHour: mapHour[humanPattern] ?? 12, maxPostsPerDay: maxDaily });
      setApplyMsg('Aplicado na conta!');
      setTimeout(() => setApplyMsg(null), 2500);
    } catch (e: any) {
      setApplyMsg(e.response?.data?.error || 'Erro ao aplicar');
      setTimeout(() => setApplyMsg(null), 3000);
    }
  };

  const handleReset = () => applyPreset('moderado');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0c1222]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Calibrador Anti-Bloqueio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  PRO Safe
                </span>
              </h2>
              <p className="text-xs text-slate-400">Proteção de contas e ritmo de postagens</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Info Card */}
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-xs text-blue-300">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p>
              O Calibrador simula ritmo humano. Escolha um perfil e ajuste fino se quiser — valores <b>conservadores</b> são mais seguros para contas novas.
            </p>
          </div>

          {/* Perfis anti-ban */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Perfil de segurança</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRESETS) as Array<'conservador' | 'moderado' | 'agressivo'>).map((k) => {
                const p = PRESETS[k];
                const active = humanPattern === k;
                const cls =
                  k === 'conservador'
                    ? active
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#131c31] border-[#1e293b] text-slate-400 hover:border-emerald-500/40'
                    : k === 'moderado'
                    ? active
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-[#131c31] border-[#1e293b] text-slate-400 hover:border-amber-500/40'
                    : active
                    ? 'bg-red-500/20 border-red-500 text-red-300'
                    : 'bg-[#131c31] border-[#1e293b] text-slate-400 hover:border-red-500/40';
                return (
                  <button key={k} type="button" onClick={() => applyPreset(k)} className={`p-3 rounded-xl border text-left transition-all ${cls}`}>
                    <div className="text-xs font-bold leading-none">{p.label}</div>
                    <div className="text-[11px] opacity-80 mt-1 leading-tight">{p.desc}</div>
                    <div className="text-[10px] opacity-60 mt-1">{p.minDelay}-{p.maxDelay}s · a cada {p.pauseAfter} · {p.maxDaily}/dia</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerta perfil agressivo */}
          {humanPattern === 'agressivo' && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-[11px] text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Perfil agressivo só para contas aquecidas com trust alto. Aumenta risco de checkpoint.
            </div>
          )}

          {/* Delays Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Delay Mínimo (segundos)
              </label>
              <input
                type="number"
                min={15}
                max={300}
                value={minDelay}
                onChange={(e) => setMinDelay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Delay Máximo (segundos)
              </label>
              <input
                type="number"
                min={minDelay + 10}
                max={600}
                value={maxDelay}
                onChange={(e) => setMaxDelay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Pausa Longa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pausa a cada N posts
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={pauseAfter}
                onChange={(e) => setPauseAfter(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Duração da pausa (minutos)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={pauseDuration}
                onChange={(e) => setPauseDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Limite Diário */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Limite Máximo Diário de Posts
              </label>
              <input
                type="number"
                min={10}
                max={200}
                value={maxDaily}
                onChange={(e) => setMaxDaily(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopOnBlock}
                  onChange={(e) => setStopOnBlock(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-300">Parar campanha se detectar WAF/Bloqueio</span>
              </label>
            </div>
          </div>

          {/* Horário seguro */}
          <div className="p-3 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={safeEnabled} onChange={(e) => setSafeEnabled(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white">Horário seguro — só postar dentro da janela</span>
              <span className="text-[11px] text-slate-400">Fora da janela a campanha aguarda automaticamente até o horário</span>
            </label>
            {safeEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Início (hora)</label>
                  <input type="number" min={0} max={23} value={safeStart} onChange={(e) => setSafeStart(Number(e.target.value))} className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fim (hora)</label>
                  <input type="number" min={0} max={23} value={safeEnd} onChange={(e) => setSafeEnd(Number(e.target.value))} className="w-full px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <p className="col-span-2 text-[11px] text-slate-500">Ex: 8h às 22h. Para madrugada use 22h às 6h.</p>
              </div>
            )}
          </div>

          {/* Rotação automática entre contas */}
          <div className="p-3 bg-[#131c31] border border-[#1e293b] rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rotateEnabled} onChange={(e) => setRotateEnabled(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-bold text-white">Rotação automática entre contas da mesma campanha</span>
            </label>
            <p className="text-[11px] text-slate-400">Quando ativo, cada postagem escolhe a conta com mais folga (trust + limite por IP). Recomendado para escalar sem sobrecarregar uma conta.</p>
            {rotateEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Pool máximo</span>
                <input type="number" min={2} max={5} value={rotateMax} onChange={(e) => setRotateMax(Number(e.target.value))} className="w-16 px-2 py-1.5 bg-[#0f172a] border border-[#1e293b] rounded-lg text-white text-xs" />
                <span className="text-[11px] text-slate-400">contas</span>
              </div>
            )}
          </div>
        </div>

        {/* Aplicar direto na conta (limite editável por conta) */}
        <div className="px-6 py-3 border-t border-[#1e293b] bg-[#0c1222]/60 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Aplicar limites desta calibragem na conta:</span>
          <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="flex-1 min-w-[160px] px-3 py-2 bg-[#131c31] border border-[#1e293b] rounded-xl text-xs text-white focus:outline-none focus:border-amber-500">
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name} · {a.platform} · trust {a.trust_score}%</option>
            ))}
          </select>
          <button type="button" onClick={handleApplyToAccount} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Aplicar na conta</button>
          {applyMsg && <span className="text-xs font-bold text-emerald-400">{applyMsg}</span>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1e293b] bg-[#0c1222]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              {saved ? <Check className="w-4 h-4" /> : null}
              <span>{saved ? 'Salvo!' : 'Salvar Calibração'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
