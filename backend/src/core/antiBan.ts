/**
 * Sistema Anti-Ban — Proteção contra bloqueios da Meta
 * Rate limiting por conta, monitor de erros e decisão de pausa/stop
 */

export interface AntiBanConfig {
  maxPostsPerHour: number;
  maxPostsPerDay: number;
  maxConsecutiveFailures: number;
  maxErrorRate: number; // 0-1
  enableRateLimiting: boolean;
  monitorErrorRates: boolean;
}

export const DEFAULT_ANTI_BAN: AntiBanConfig = {
  maxPostsPerHour: 20,
  maxPostsPerDay: 60,
  maxConsecutiveFailures: 5,
  maxErrorRate: 0.30,
  enableRateLimiting: true,
  monitorErrorRates: true,
};

// estado em memória por conta
interface AccountState {
  postsThisHour: number;
  hourStart: number;
  postsToday: number;
  dayStart: number;
  consecutiveFailures: number;
  errorsThisWindow: number;
  totalThisWindow: number;
}

const states = new Map<string, AccountState>();

function getState(accountId: string): AccountState {
  let s = states.get(accountId);
  if (!s) {
    const now = Date.now();
    s = { postsThisHour: 0, hourStart: now, postsToday: 0, dayStart: now, consecutiveFailures: 0, errorsThisWindow: 0, totalThisWindow: 0 };
    states.set(accountId, s);
  }
  return s;
}

function resetHourIfNeeded(s: AccountState) {
  if (Date.now() - s.hourStart > 3600_000) {
    s.postsThisHour = 0;
    s.hourStart = Date.now();
  }
}
function resetDayIfNeeded(s: AccountState) {
  if (Date.now() - s.dayStart > 24 * 3600_000) {
    s.postsToday = 0;
    s.dayStart = Date.now();
    s.errorsThisWindow = 0;
    s.totalThisWindow = 0;
  }
}

export function getEffectiveLimits(account: any): AntiBanConfig {
  // override manual por conta (definido em Configurações > Conta) tem prioridade
  if (account?.custom_limits) {
    try {
      const custom = typeof account.custom_limits === 'string' ? JSON.parse(account.custom_limits) : account.custom_limits;
      if (custom && (custom.maxPostsPerHour || custom.maxPostsPerDay)) {
        return { ...DEFAULT_ANTI_BAN, maxPostsPerHour: Number(custom.maxPostsPerHour) || DEFAULT_ANTI_BAN.maxPostsPerHour, maxPostsPerDay: Number(custom.maxPostsPerDay) || DEFAULT_ANTI_BAN.maxPostsPerDay, maxConsecutiveFailures: Number(custom.maxConsecutiveFailures) || DEFAULT_ANTI_BAN.maxConsecutiveFailures };
      }
    } catch {}
  }
  let cfg = { ...DEFAULT_ANTI_BAN };
  if (!account) return cfg;
  const trust = Number(account.trust_score ?? 90);
  const status = String(account.status || 'ACTIVE');
  if (status === 'BLOCKED' || status === 'NEEDS_LOGIN') {
    return { ...cfg, maxPostsPerHour: 0, maxPostsPerDay: 0 };
  }
  if (status === 'WARMING') {
    return { ...cfg, maxPostsPerHour: 4, maxPostsPerDay: 15 };
  }
  if (trust < 60) return { ...cfg, maxPostsPerHour: 6, maxPostsPerDay: 15 };
  if (trust < 80) return { ...cfg, maxPostsPerHour: 8, maxPostsPerDay: 25 };
  return cfg; // 80-100 mantém 12/h e 35/dia
}

export function canPostNow(accountId: string, cfg: Partial<AntiBanConfig> = {}): { allowed: boolean; reason?: string } {
  const c = { ...DEFAULT_ANTI_BAN, ...cfg };
  const s = getState(accountId);
  resetHourIfNeeded(s);
  resetDayIfNeeded(s);
  if (!c.enableRateLimiting) return { allowed: true };
  if (s.postsThisHour >= c.maxPostsPerHour) return { allowed: false, reason: `Limite de ${c.maxPostsPerHour} posts/hora atingido — aguarde ${Math.ceil((s.hourStart + 3600_000 - Date.now())/60000)} min` };
  if (s.postsToday >= c.maxPostsPerDay) return { allowed: false, reason: `Limite diário de ${c.maxPostsPerDay} posts atingido` };
  if (s.consecutiveFailures >= c.maxConsecutiveFailures) return { allowed: false, reason: `${s.consecutiveFailures} falhas consecutivas — possível bloqueio/checkpoint, pausando por segurança` };
  if (c.monitorErrorRates && s.totalThisWindow >= 5 && s.errorsThisWindow / s.totalThisWindow > c.maxErrorRate) {
    return { allowed: false, reason: `Taxa de erro alta (${Math.round(s.errorsThisWindow/s.totalThisWindow*100)}%) — pausando para análise` };
  }
  return { allowed: true };
}

export function getStateSnapshot(accountId: string) {
  const s = getState(accountId);
  resetHourIfNeeded(s); resetDayIfNeeded(s);
  return { ...s, remainingHour: Math.max(0, DEFAULT_ANTI_BAN.maxPostsPerHour - s.postsThisHour) };
}

export function getAllStates() {
  const out: Record<string, any> = {};
  for (const [k, v] of states.entries()) {
    resetHourIfNeeded(v); resetDayIfNeeded(v);
    out[k] = { ...v, remainingHour: Math.max(0, DEFAULT_ANTI_BAN.maxPostsPerHour - v.postsThisHour) };
  }
  return out;
}

export function recordPostResult(accountId: string, success: boolean) {
  const s = getState(accountId);
  resetHourIfNeeded(s);
  resetDayIfNeeded(s);
  s.postsThisHour++;
  s.postsToday++;
  s.totalThisWindow++;
  if (success) {
    s.consecutiveFailures = 0;
  } else {
    s.consecutiveFailures++;
    s.errorsThisWindow++;
  }
}

export function detectMetaBlock(errorMsg: string): boolean {
  const msg = (errorMsg || '').toLowerCase();
  return msg.includes('bloquead') || msg.includes('checkpoint') || msg.includes('temporariamente') || msg.includes('limite') || msg.includes('spam') || msg.includes('190') || msg.includes('368');
}

export function getRemainingThisHour(accountId: string): number {
  const s = getState(accountId);
  resetHourIfNeeded(s);
  return Math.max(0, DEFAULT_ANTI_BAN.maxPostsPerHour - s.postsThisHour);
}

export function resetAccount(accountId: string) {
  states.delete(accountId);
}
