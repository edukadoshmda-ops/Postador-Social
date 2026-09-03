"use strict";
/**
 * Sistema Anti-Ban — Proteção contra bloqueios da Meta
 * Rate limiting por conta, monitor de erros e decisão de pausa/stop
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ANTI_BAN = void 0;
exports.getEffectiveLimits = getEffectiveLimits;
exports.canPostNow = canPostNow;
exports.getStateSnapshot = getStateSnapshot;
exports.getAllStates = getAllStates;
exports.recordPostResult = recordPostResult;
exports.detectMetaBlock = detectMetaBlock;
exports.getRemainingThisHour = getRemainingThisHour;
exports.resetAccount = resetAccount;
exports.DEFAULT_ANTI_BAN = {
    maxPostsPerHour: 20,
    maxPostsPerDay: 60,
    maxConsecutiveFailures: 5,
    maxErrorRate: 0.30,
    enableRateLimiting: true,
    monitorErrorRates: true,
};
const states = new Map();
function getState(accountId) {
    let s = states.get(accountId);
    if (!s) {
        const now = Date.now();
        s = { postsThisHour: 0, hourStart: now, postsToday: 0, dayStart: now, consecutiveFailures: 0, errorsThisWindow: 0, totalThisWindow: 0 };
        states.set(accountId, s);
    }
    return s;
}
function resetHourIfNeeded(s) {
    if (Date.now() - s.hourStart > 3600_000) {
        s.postsThisHour = 0;
        s.hourStart = Date.now();
    }
}
function resetDayIfNeeded(s) {
    if (Date.now() - s.dayStart > 24 * 3600_000) {
        s.postsToday = 0;
        s.dayStart = Date.now();
        s.errorsThisWindow = 0;
        s.totalThisWindow = 0;
    }
}
function getEffectiveLimits(account) {
    // override manual por conta (definido em Configurações > Conta) tem prioridade
    if (account?.custom_limits) {
        try {
            const custom = typeof account.custom_limits === 'string' ? JSON.parse(account.custom_limits) : account.custom_limits;
            if (custom && (custom.maxPostsPerHour || custom.maxPostsPerDay)) {
                return { ...exports.DEFAULT_ANTI_BAN, maxPostsPerHour: Number(custom.maxPostsPerHour) || exports.DEFAULT_ANTI_BAN.maxPostsPerHour, maxPostsPerDay: Number(custom.maxPostsPerDay) || exports.DEFAULT_ANTI_BAN.maxPostsPerDay, maxConsecutiveFailures: Number(custom.maxConsecutiveFailures) || exports.DEFAULT_ANTI_BAN.maxConsecutiveFailures };
            }
        }
        catch { }
    }
    let cfg = { ...exports.DEFAULT_ANTI_BAN };
    if (!account)
        return cfg;
    const trust = Number(account.trust_score ?? 90);
    const status = String(account.status || 'ACTIVE');
    if (status === 'BLOCKED' || status === 'NEEDS_LOGIN') {
        return { ...cfg, maxPostsPerHour: 0, maxPostsPerDay: 0 };
    }
    if (status === 'WARMING') {
        return { ...cfg, maxPostsPerHour: 4, maxPostsPerDay: 15 };
    }
    if (trust < 60)
        return { ...cfg, maxPostsPerHour: 6, maxPostsPerDay: 15 };
    if (trust < 80)
        return { ...cfg, maxPostsPerHour: 8, maxPostsPerDay: 25 };
    return cfg; // 80-100 mantém 12/h e 35/dia
}
function canPostNow(accountId, cfg = {}) {
    const c = { ...exports.DEFAULT_ANTI_BAN, ...cfg };
    const s = getState(accountId);
    resetHourIfNeeded(s);
    resetDayIfNeeded(s);
    if (!c.enableRateLimiting)
        return { allowed: true };
    if (s.postsThisHour >= c.maxPostsPerHour)
        return { allowed: false, reason: `Limite de ${c.maxPostsPerHour} posts/hora atingido — aguarde ${Math.ceil((s.hourStart + 3600_000 - Date.now()) / 60000)} min` };
    if (s.postsToday >= c.maxPostsPerDay)
        return { allowed: false, reason: `Limite diário de ${c.maxPostsPerDay} posts atingido` };
    if (s.consecutiveFailures >= c.maxConsecutiveFailures)
        return { allowed: false, reason: `${s.consecutiveFailures} falhas consecutivas — possível bloqueio/checkpoint, pausando por segurança` };
    if (c.monitorErrorRates && s.totalThisWindow >= 5 && s.errorsThisWindow / s.totalThisWindow > c.maxErrorRate) {
        return { allowed: false, reason: `Taxa de erro alta (${Math.round(s.errorsThisWindow / s.totalThisWindow * 100)}%) — pausando para análise` };
    }
    return { allowed: true };
}
function getStateSnapshot(accountId) {
    const s = getState(accountId);
    resetHourIfNeeded(s);
    resetDayIfNeeded(s);
    return { ...s, remainingHour: Math.max(0, exports.DEFAULT_ANTI_BAN.maxPostsPerHour - s.postsThisHour) };
}
function getAllStates() {
    const out = {};
    for (const [k, v] of states.entries()) {
        resetHourIfNeeded(v);
        resetDayIfNeeded(v);
        out[k] = { ...v, remainingHour: Math.max(0, exports.DEFAULT_ANTI_BAN.maxPostsPerHour - v.postsThisHour) };
    }
    return out;
}
function recordPostResult(accountId, success) {
    const s = getState(accountId);
    resetHourIfNeeded(s);
    resetDayIfNeeded(s);
    s.postsThisHour++;
    s.postsToday++;
    s.totalThisWindow++;
    if (success) {
        s.consecutiveFailures = 0;
    }
    else {
        s.consecutiveFailures++;
        s.errorsThisWindow++;
    }
}
function detectMetaBlock(errorMsg) {
    const msg = (errorMsg || '').toLowerCase();
    return msg.includes('bloquead') || msg.includes('checkpoint') || msg.includes('temporariamente') || msg.includes('limite') || msg.includes('spam') || msg.includes('190') || msg.includes('368');
}
function getRemainingThisHour(accountId) {
    const s = getState(accountId);
    resetHourIfNeeded(s);
    return Math.max(0, exports.DEFAULT_ANTI_BAN.maxPostsPerHour - s.postsThisHour);
}
function resetAccount(accountId) {
    states.delete(accountId);
}
