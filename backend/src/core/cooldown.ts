import { db } from './db';

export const DEFAULT_COOLDOWN_DAYS = 7;

/**
 * Verifica se um grupo está em cooldown (já recebeu postagem recente)
 * Retorna dias restantes ou null se liberado
 */
export function getCooldownRemaining(groupId: string, days: number = DEFAULT_COOLDOWN_DAYS): number | null {
  const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
  const items: any[] = (store.campaign_items || []).filter((ci: any) => String(ci.group_id) === String(groupId) && ci.executed_at && (ci.status === 'PUBLISHED' || ci.status === 'PENDING_APPROVAL'));
  if (items.length === 0) return null;
  // pega o mais recente
  let latest: any = null;
  let latestTime = 0;
  for (const it of items) {
    const t = new Date(it.executed_at).getTime();
    if (t > latestTime) { latestTime = t; latest = it; }
  }
  if (!latest) return null;
  const elapsedMs = Date.now() - latestTime;
  const cooldownMs = days * 24 * 3600 * 1000;
  if (elapsedMs >= cooldownMs) return null;
  const remainingMs = cooldownMs - elapsedMs;
  return Math.ceil(remainingMs / (24 * 3600 * 1000));
}

export function isGroupInCooldown(groupId: string, days: number = DEFAULT_COOLDOWN_DAYS): boolean {
  return getCooldownRemaining(groupId, days) !== null;
}

export function filterGroupsByCooldown(groups: any[], days: number = DEFAULT_COOLDOWN_DAYS): { allowed: any[]; blocked: { group: any; remainingDays: number }[] } {
  const allowed: any[] = [];
  const blocked: { group: any; remainingDays: number }[] = [];
  for (const g of groups) {
    const gid = String(g.group_id || g.groupId || g.id);
    const remaining = getCooldownRemaining(gid, days);
    if (remaining !== null) blocked.push({ group: g, remainingDays: remaining });
    else allowed.push(g);
  }
  return { allowed, blocked };
}

/**
 * Quarentena de grupos com falhas repetidas (2+ falhas em 14 dias)
 */
export const QUARANTINE_THRESHOLD = 2;
export const QUARANTINE_WINDOW_DAYS = 14;
export const QUARANTINE_DAYS = 14;

export function isGroupQuarantined(groupId: string, threshold: number = QUARANTINE_THRESHOLD, windowDays: number = QUARANTINE_WINDOW_DAYS): boolean {
  const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
  const items: any[] = (store.campaign_items || []).filter((ci: any) => String(ci.group_id) === String(groupId) && ci.status === 'FAILED' && ci.executed_at);
  if (items.length < threshold) return false;
  const cutoff = Date.now() - windowDays * 24 * 3600 * 1000;
  const recentFailures = items.filter((it: any) => new Date(it.executed_at).getTime() >= cutoff);
  return recentFailures.length >= threshold;
}

export function getQuarantinedGroups(days: number = QUARANTINE_DAYS): { group_id: string; failures: number; lastFailure: string }[] {
  const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
  const items: any[] = store.campaign_items || [];
  const cutoff = Date.now() - QUARANTINE_WINDOW_DAYS * 24 * 3600 * 1000;
  const counts: Record<string, { failures: number; lastFailure: number }> = {};
  for (const it of items) {
    if (it.status !== 'FAILED' || !it.executed_at) continue;
    const t = new Date(it.executed_at).getTime();
    if (t < cutoff) continue;
    const gid = String(it.group_id);
    if (!counts[gid]) counts[gid] = { failures: 0, lastFailure: 0 };
    counts[gid].failures++;
    if (t > counts[gid].lastFailure) counts[gid].lastFailure = t;
  }
  return Object.entries(counts)
    .filter(([, v]) => v.failures >= QUARANTINE_THRESHOLD)
    .map(([gid, v]) => ({ group_id: gid, failures: v.failures, lastFailure: new Date(v.lastFailure).toISOString() }))
    .sort((a, b) => b.failures - a.failures);
}

export function filterQuarantinedGroups(groups: any[]): { allowed: any[]; quarantined: any[] } {
  const allowed: any[] = [];
  const quarantined: any[] = [];
  for (const g of groups) {
    const gid = String(g.group_id || g.groupId || g.id);
    if (isGroupQuarantined(gid)) quarantined.push(g);
    else allowed.push(g);
  }
  return { allowed, quarantined };
}

export function filterPrivateGroups(groups: any[]): { allowed: any[]; privateGroups: any[] } {
  const allowed: any[] = [];
  const privateGroups: any[] = [];
  for (const g of groups) {
    const privacy = String(g.privacy || 'PUBLIC').toUpperCase();
    if (privacy === 'PRIVATE' || privacy === 'CLOSED' || privacy === 'SECRET') privateGroups.push(g);
    else allowed.push(g);
  }
  return { allowed, privateGroups };
}

/**
 * Calcula melhor horário baseado em sucessos por hora e dia da semana
 * Se accountId for informado, filtra apenas envios dessa conta
 */
export function computeBestTime(accountId?: string | null): { hourly: { hour: number; successRate: number; total: number; published: number }[]; daily: { day: number; label: string; successRate: number; total: number; published: number }[]; recommendation: string; accountId?: string | null } {
  const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [], campaigns: [] };
  let items: any[] = store.campaign_items || [];
  if (accountId) {
    const campaigns: any[] = store.campaigns || [];
    const ids = new Set(campaigns.filter((c: any) => String(c.account_id) === String(accountId)).map((c: any) => c.id));
    items = items.filter((it: any) => ids.has(it.campaign_id));
  }
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const byHour: Record<number, { total: number; published: number }> = {};
  const byDay: Record<number, { total: number; published: number }> = {};

  for (const it of items) {
    if (!it.executed_at) continue;
    const d = new Date(it.executed_at);
    const h = d.getHours();
    const day = d.getDay();
    if (!byHour[h]) byHour[h] = { total: 0, published: 0 };
    if (!byDay[day]) byDay[day] = { total: 0, published: 0 };
    byHour[h].total++;
    byDay[day].total++;
    if (it.status === 'PUBLISHED') {
      byHour[h].published++;
      byDay[day].published++;
    }
  }

  const hourly = Object.entries(byHour)
    .map(([hour, v]: any) => ({ hour: Number(hour), total: v.total, published: v.published, successRate: v.total ? v.published / v.total : 0 }))
    .sort((a, b) => b.successRate - a.successRate || b.total - a.total);

  const daily = Object.entries(byDay)
    .map(([day, v]: any) => ({ day: Number(day), label: dayLabels[Number(day)], total: v.total, published: v.published, successRate: v.total ? v.published / v.total : 0 }))
    .sort((a, b) => b.successRate - a.successRate || b.total - a.total);

  let recommendation = 'Sem dados suficientes — poste entre 09h e 18h em dias úteis para começar a coletar métricas.';
  if (items.length >= 10 && hourly.length > 0 && daily.length > 0) {
    const bestHour = hourly[0];
    const bestDay = daily[0];
    const hourStr = String(bestHour.hour).padStart(2, '0') + ':00';
    recommendation = `Melhor horário${accountId ? ' desta conta' : ''}: ${hourStr} (taxa ${Math.round(bestHour.successRate * 100)}% em ${bestHour.total} envios) · Melhor dia: ${bestDay.label} (${Math.round(bestDay.successRate * 100)}% em ${bestDay.total} envios). Priorize esse horário na janela segura do Calibrador.`;
  } else if (items.length > 0) {
    recommendation = `Coletando dados${accountId ? ' desta conta' : ''}: ${items.length} envios registrados. Continue postando para refinar o melhor horário.`;
  }

  return { hourly, daily, recommendation, accountId: accountId || null };
}
