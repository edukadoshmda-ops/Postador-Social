"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CALIBRATION = void 0;
exports.calculateNextDelay = calculateNextDelay;
exports.shouldTakeLongPause = shouldTakeLongPause;
exports.getLongPauseDuration = getLongPauseDuration;
exports.isOutsideSafeWindow = isOutsideSafeWindow;
exports.msUntilSafeWindow = msUntilSafeWindow;
exports.DEFAULT_CALIBRATION = {
    minDelaySeconds: 60,
    maxDelaySeconds: 180,
    randomJitterSeconds: 25,
    pauseAfterPosts: 8,
    pauseDurationMinutes: 10,
    maxPostsPerDay: 35,
    stopOnBlock: true,
    humanPattern: 'moderado',
    variationalDelay: true,
    safeWindowEnabled: false,
    safeWindowStartHour: 8,
    safeWindowEndHour: 22,
};
const HUMAN_PATTERNS = {
    conservador: { longPauseEvery: 5, longPauseDuration: [8, 15] },
    moderado: { longPauseEvery: 8, longPauseDuration: [10, 18] },
    agressivo: { longPauseEvery: 12, longPauseDuration: [5, 10] },
};
function calculateNextDelay(settings = {}) {
    const cfg = { ...exports.DEFAULT_CALIBRATION, ...settings };
    const base = Math.floor(Math.random() * (cfg.maxDelaySeconds - cfg.minDelaySeconds + 1)) + cfg.minDelaySeconds;
    const jitter = Math.floor(Math.random() * (cfg.randomJitterSeconds * 2 + 1)) - cfg.randomJitterSeconds;
    let delay = Math.max(20, base + jitter);
    // variação extra para quebrar padrões perfeitos detectáveis pela Meta
    if (cfg.variationalDelay) {
        const variance = Math.floor(Math.random() * 31) - 15; // -15 a +15s
        delay = Math.max(20, delay + variance);
    }
    // padrão humano: 5% de chance de delay extra longo (simula distração)
    if (Math.random() < 0.05) {
        delay += Math.floor(Math.random() * 40) + 20;
    }
    return delay;
}
function shouldTakeLongPause(currentPostIndex, settings = {}) {
    const cfg = { ...exports.DEFAULT_CALIBRATION, ...settings };
    if (cfg.pauseAfterPosts <= 0)
        return false;
    const isExact = currentPostIndex > 0 && currentPostIndex % cfg.pauseAfterPosts === 0;
    if (!isExact)
        return false;
    // 80% pausa exata, 20% varia para não parecer robótico
    return Math.random() > 0.2;
}
function getLongPauseDuration(settings = {}) {
    const cfg = { ...exports.DEFAULT_CALIBRATION, ...settings };
    const pattern = HUMAN_PATTERNS[cfg.humanPattern || 'moderado'];
    const [min, max] = pattern.longPauseDuration;
    // retorna em segundos
    const minutes = Math.floor(Math.random() * (max - min + 1)) + min;
    return minutes * 60;
}
function isOutsideSafeWindow(settings = {}) {
    const cfg = { ...exports.DEFAULT_CALIBRATION, ...settings };
    if (!cfg.safeWindowEnabled)
        return false;
    const hour = new Date().getHours();
    const start = cfg.safeWindowStartHour ?? 8;
    const end = cfg.safeWindowEndHour ?? 22;
    if (start === end)
        return false;
    if (start < end)
        return hour < start || hour >= end;
    // atravessa meia-noite: dentro se hour >= start OU hour < end
    const inside = hour >= start || hour < end;
    return !inside;
}
function msUntilSafeWindow(settings = {}) {
    const cfg = { ...exports.DEFAULT_CALIBRATION, ...settings };
    if (!cfg.safeWindowEnabled)
        return 0;
    const now = new Date();
    const start = cfg.safeWindowStartHour ?? 8;
    const end = cfg.safeWindowEndHour ?? 22;
    const curH = now.getHours();
    // se já dentro, 0
    if (!isOutsideSafeWindow(settings))
        return 0;
    let next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setSeconds(0, 0);
    if (start < end) {
        // janela diurna simples: próximo start hoje se ainda não passou, senão amanhã
        if (curH < start)
            next.setHours(start);
        else {
            next.setDate(next.getDate() + 1);
            next.setHours(start);
        }
    }
    else {
        // wrap: fora só entre end e start
        // se curH >= end && curH < start => próximo start hoje se curH < start senão amanhã já é start
        if (curH >= end && curH < start)
            next.setHours(start);
        else {
            next.setDate(next.getDate() + 1);
            next.setHours(start);
        }
    }
    return Math.max(0, next.getTime() - now.getTime());
}
