"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_IP_LIMIT_PER_DAY = exports.DEFAULT_IP_LIMIT_PER_HOUR = void 0;
exports.getIpLimits = getIpLimits;
exports.setIpLimits = setIpLimits;
exports.getProxyKey = getProxyKey;
exports.canPostByIp = canPostByIp;
exports.recordIpPost = recordIpPost;
exports.getIpStates = getIpStates;
exports.resetIp = resetIp;
const proxyManager_1 = require("./proxyManager");
const db_1 = require("./db");
exports.DEFAULT_IP_LIMIT_PER_HOUR = 18;
exports.DEFAULT_IP_LIMIT_PER_DAY = 80;
function getIpLimits() {
    try {
        const store = db_1.db.getStore ? db_1.db.getStore() : { settings: {} };
        const s = store.settings?.ip_limits;
        if (s && typeof s.perHour === 'number' && typeof s.perDay === 'number')
            return { perHour: s.perHour, perDay: s.perDay };
    }
    catch { }
    return { perHour: exports.DEFAULT_IP_LIMIT_PER_HOUR, perDay: exports.DEFAULT_IP_LIMIT_PER_DAY };
}
function setIpLimits(perHour, perDay) {
    const store = db_1.db.getStore ? db_1.db.getStore() : { settings: {} };
    if (!store.settings)
        store.settings = {};
    store.settings.ip_limits = { perHour, perDay };
    store.settings = store.settings;
    try {
        db_1.db.save?.();
    }
    catch { }
    // atualiza estados para refletir novo limite
    for (const [, s] of states.entries()) {
        // não reseta contadores, só ajusta limite lógico na próxima verificação
        resetIfNeeded(s);
    }
}
const states = new Map();
function getProxyKey(account) {
    if (!account)
        return 'direct';
    const proxy = String(account.proxy || '').trim();
    if (!proxy)
        return 'direct';
    try {
        const p = (0, proxyManager_1.parseProxy)(proxy);
        if (!p)
            return 'direct';
        return `${p.host}:${p.port}`;
    }
    catch {
        return 'direct';
    }
}
function getState(key) {
    let s = states.get(key);
    if (!s) {
        const now = Date.now();
        s = { countHour: 0, hourStart: now, countDay: 0, dayStart: now };
        states.set(key, s);
    }
    return s;
}
function resetIfNeeded(s) {
    const now = Date.now();
    if (now - s.hourStart >= 3600 * 1000) {
        s.countHour = 0;
        s.hourStart = now;
    }
    if (now - s.dayStart >= 24 * 3600 * 1000) {
        s.countDay = 0;
        s.dayStart = now;
    }
}
function canPostByIp(account, limitHour, limitDay) {
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
function recordIpPost(account) {
    const key = getProxyKey(account);
    const s = getState(key);
    resetIfNeeded(s);
    s.countHour++;
    s.countDay++;
}
function getIpStates() {
    const out = {};
    for (const [k, v] of states.entries()) {
        resetIfNeeded(v);
        out[k] = { ...v, key: k, remainingHour: Math.max(0, exports.DEFAULT_IP_LIMIT_PER_HOUR - v.countHour) };
    }
    return out;
}
function resetIp(key) { states.delete(key); }
