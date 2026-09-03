"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUARANTINE_DAYS = exports.QUARANTINE_WINDOW_DAYS = exports.QUARANTINE_THRESHOLD = exports.DEFAULT_COOLDOWN_DAYS = void 0;
exports.getCooldownRemaining = getCooldownRemaining;
exports.isGroupInCooldown = isGroupInCooldown;
exports.filterGroupsByCooldown = filterGroupsByCooldown;
exports.isGroupQuarantined = isGroupQuarantined;
exports.getQuarantinedGroups = getQuarantinedGroups;
exports.filterQuarantinedGroups = filterQuarantinedGroups;
exports.filterPrivateGroups = filterPrivateGroups;
exports.computeBestTime = computeBestTime;
const db_1 = require("./db");
exports.DEFAULT_COOLDOWN_DAYS = 7;
/**
 * Verifica se um grupo está em cooldown (já recebeu postagem recente)
 * Retorna dias restantes ou null se liberado
 */
function getCooldownRemaining(groupId, days = exports.DEFAULT_COOLDOWN_DAYS) {
    const store = db_1.db.getStore ? db_1.db.getStore() : { campaign_items: [] };
    const items = (store.campaign_items || []).filter((ci) => String(ci.group_id) === String(groupId) && ci.executed_at && (ci.status === 'PUBLISHED' || ci.status === 'PENDING_APPROVAL'));
    if (items.length === 0)
        return null;
    // pega o mais recente
    let latest = null;
    let latestTime = 0;
    for (const it of items) {
        const t = new Date(it.executed_at).getTime();
        if (t > latestTime) {
            latestTime = t;
            latest = it;
        }
    }
    if (!latest)
        return null;
    const elapsedMs = Date.now() - latestTime;
    const cooldownMs = days * 24 * 3600 * 1000;
    if (elapsedMs >= cooldownMs)
        return null;
    const remainingMs = cooldownMs - elapsedMs;
    return Math.ceil(remainingMs / (24 * 3600 * 1000));
}
function isGroupInCooldown(groupId, days = exports.DEFAULT_COOLDOWN_DAYS) {
    return getCooldownRemaining(groupId, days) !== null;
}
function filterGroupsByCooldown(groups, days = exports.DEFAULT_COOLDOWN_DAYS) {
    const allowed = [];
    const blocked = [];
    for (const g of groups) {
        const gid = String(g.group_id || g.groupId || g.id);
        const remaining = getCooldownRemaining(gid, days);
        if (remaining !== null)
            blocked.push({ group: g, remainingDays: remaining });
        else
            allowed.push(g);
    }
    return { allowed, blocked };
}
/**
 * Quarentena de grupos com falhas repetidas (2+ falhas em 14 dias)
 */
exports.QUARANTINE_THRESHOLD = 2;
exports.QUARANTINE_WINDOW_DAYS = 14;
exports.QUARANTINE_DAYS = 14;
function isGroupQuarantined(groupId, threshold = exports.QUARANTINE_THRESHOLD, windowDays = exports.QUARANTINE_WINDOW_DAYS) {
    const store = db_1.db.getStore ? db_1.db.getStore() : { campaign_items: [] };
    const items = (store.campaign_items || []).filter((ci) => String(ci.group_id) === String(groupId) && ci.status === 'FAILED' && ci.executed_at);
    if (items.length < threshold)
        return false;
    const cutoff = Date.now() - windowDays * 24 * 3600 * 1000;
    const recentFailures = items.filter((it) => new Date(it.executed_at).getTime() >= cutoff);
    return recentFailures.length >= threshold;
}
function getQuarantinedGroups(days = exports.QUARANTINE_DAYS) {
    const store = db_1.db.getStore ? db_1.db.getStore() : { campaign_items: [] };
    const items = store.campaign_items || [];
    const cutoff = Date.now() - exports.QUARANTINE_WINDOW_DAYS * 24 * 3600 * 1000;
    const counts = {};
    for (const it of items) {
        if (it.status !== 'FAILED' || !it.executed_at)
            continue;
        const t = new Date(it.executed_at).getTime();
        if (t < cutoff)
            continue;
        const gid = String(it.group_id);
        if (!counts[gid])
            counts[gid] = { failures: 0, lastFailure: 0 };
        counts[gid].failures++;
        if (t > counts[gid].lastFailure)
            counts[gid].lastFailure = t;
    }
    return Object.entries(counts)
        .filter(([, v]) => v.failures >= exports.QUARANTINE_THRESHOLD)
        .map(([gid, v]) => ({ group_id: gid, failures: v.failures, lastFailure: new Date(v.lastFailure).toISOString() }))
        .sort((a, b) => b.failures - a.failures);
}
function filterQuarantinedGroups(groups) {
    const allowed = [];
    const quarantined = [];
    for (const g of groups) {
        const gid = String(g.group_id || g.groupId || g.id);
        if (isGroupQuarantined(gid))
            quarantined.push(g);
        else
            allowed.push(g);
    }
    return { allowed, quarantined };
}
function filterPrivateGroups(groups) {
    const allowed = [];
    const privateGroups = [];
    for (const g of groups) {
        const privacy = String(g.privacy || 'PUBLIC').toUpperCase();
        if (privacy === 'PRIVATE' || privacy === 'CLOSED' || privacy === 'SECRET')
            privateGroups.push(g);
        else
            allowed.push(g);
    }
    return { allowed, privateGroups };
}
/**
 * Calcula melhor horário baseado em sucessos por hora e dia da semana
 * Se accountId for informado, filtra apenas envios dessa conta
 */
function computeBestTime(accountId) {
    const store = db_1.db.getStore ? db_1.db.getStore() : { campaign_items: [], campaigns: [] };
    let items = store.campaign_items || [];
    if (accountId) {
        const campaigns = store.campaigns || [];
        const ids = new Set(campaigns.filter((c) => String(c.account_id) === String(accountId)).map((c) => c.id));
        items = items.filter((it) => ids.has(it.campaign_id));
    }
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const byHour = {};
    const byDay = {};
    for (const it of items) {
        if (!it.executed_at)
            continue;
        const d = new Date(it.executed_at);
        const h = d.getHours();
        const day = d.getDay();
        if (!byHour[h])
            byHour[h] = { total: 0, published: 0 };
        if (!byDay[day])
            byDay[day] = { total: 0, published: 0 };
        byHour[h].total++;
        byDay[day].total++;
        if (it.status === 'PUBLISHED') {
            byHour[h].published++;
            byDay[day].published++;
        }
    }
    const hourly = Object.entries(byHour)
        .map(([hour, v]) => ({ hour: Number(hour), total: v.total, published: v.published, successRate: v.total ? v.published / v.total : 0 }))
        .sort((a, b) => b.successRate - a.successRate || b.total - a.total);
    const daily = Object.entries(byDay)
        .map(([day, v]) => ({ day: Number(day), label: dayLabels[Number(day)], total: v.total, published: v.published, successRate: v.total ? v.published / v.total : 0 }))
        .sort((a, b) => b.successRate - a.successRate || b.total - a.total);
    let recommendation = 'Sem dados suficientes — poste entre 09h e 18h em dias úteis para começar a coletar métricas.';
    if (items.length >= 10 && hourly.length > 0 && daily.length > 0) {
        const bestHour = hourly[0];
        const bestDay = daily[0];
        const hourStr = String(bestHour.hour).padStart(2, '0') + ':00';
        recommendation = `Melhor horário${accountId ? ' desta conta' : ''}: ${hourStr} (taxa ${Math.round(bestHour.successRate * 100)}% em ${bestHour.total} envios) · Melhor dia: ${bestDay.label} (${Math.round(bestDay.successRate * 100)}% em ${bestDay.total} envios). Priorize esse horário na janela segura do Calibrador.`;
    }
    else if (items.length > 0) {
        recommendation = `Coletando dados${accountId ? ' desta conta' : ''}: ${items.length} envios registrados. Continue postando para refinar o melhor horário.`;
    }
    return { hourly, daily, recommendation, accountId: accountId || null };
}
