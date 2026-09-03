import { parseProxy } from './proxyManager';
import { db } from './db';

export const DEFAULT_IP_LIMIT_PER_HOUR = 18;
export const DEFAULT_IP_LIMIT_PER_DAY = 80;

export function getIpLimits(): { perHour: number; perDay: number } {
  try {
    const store: any = (db as any).getStore ? (db as any).getStore() : { settings: {} };
    const s = store.settings?.ip_limits;
    if (s && typeof s.perHour === 'number' && typeof s.perDay === 'number') return { perHour: s.perHour, perDay: s.perDay };
  } catch {}
  return { perHour: DEFAULT_IP_LIMIT_PER_HOUR, perDay: DEFAULT_IP_LIMIT_PER_DAY };
}

export function setIpLimits(perHour: number, perDay: number) {
  const store: any = (db as any).getStore ? (db as any).getStore() : { settings: {} };
  if (!store.settings) store.settings = {};
  store.settings.ip_limits = { perHour, perDay };
  (store as any).settings = store.settings;
  try { (db as any).save?.(); } catch {}
  // atualiza estados para refletir novo limite
  for (const [, s] of states.entries()) {
    // não reseta contadores, só ajusta limite lógico na próxima verificação
    resetIfNeeded(s);
  }
}

interface IpState {
  countHour: number;
  hourStart: number;
  countDay: number;
  dayStart: number;
}

const states = new Map<string, IpState>();

export function getProxyKey(account: any): string {
  if (!account) return 'direct';
  const proxy = String(account.proxy || '').trim();
  if (!proxy) return 'direct';
  try {
    const p = parseProxy(proxy);
    if (!p) return 'direct';
    return `${p.host}:${p.port}`;
  } catch { return 'direct'; }
}

function getState(key: string): IpState {
  let s = states.get(key);
  if (!s) {
    const now = Date.now();
    s = { countHour: 0, hourStart: now, countDay: 0, dayStart: now };
    states.set(key, s);
  }
  return s;
}

function resetIfNeeded(s: IpState) {
  const now = Date.now();
  if (now - s.hourStart >= 3600 * 1000) { s.countHour = 0; s.hourStart = now; }
  if (now - s.dayStart >= 24 * 3600 * 1000) { s.countDay = 0; s.dayStart = now; }
}

export function canPostByIp(account: any, limitHour?: number, limitDay?: number): { allowed: boolean; reason?: string; key: string; remainingHour: number } {
  const lim = getIpLimits();
  const lh = limitHour ?? lim.perHour;
  const ld = limitDay ?? lim.perDay;
  const key = getProxyKey(account);
  const s = getState(key);
  resetIfNeeded(s);
  if (s.countHour >= lh) {
    const waitMin = Math.ceil((s.hourStart + 3600 * 1000 - Date.now()) / 60000);
    return { allowed: false, reason: `Limite por IP/proxy ${key} atingido: ${lh}/hora — aguarde ${waitMin} min ou use proxy diferente`, key, remainingHour: 0 };
  }
  if (s.countDay >= ld) {
    return { allowed: false, reason: `Limite diário por IP ${key} atingido: ${ld}/dia`, key, remainingHour: Math.max(0, lh - s.countHour) };
  }
  return { allowed: true, key, remainingHour: Math.max(0, lh - s.countHour) };
}

export function recordIpPost(account: any) {
  const key = getProxyKey(account);
  const s = getState(key);
  resetIfNeeded(s);
  s.countHour++;
  s.countDay++;
}

export function getIpStates() {
  const out: Record<string, IpState & { key: string; remainingHour: number }> = {};
  for (const [k, v] of states.entries()) {
    resetIfNeeded(v);
    out[k] = { ...v, key: k, remainingHour: Math.max(0, DEFAULT_IP_LIMIT_PER_HOUR - v.countHour) };
  }
  return out;
}

export function resetIp(key: string) { states.delete(key); }
