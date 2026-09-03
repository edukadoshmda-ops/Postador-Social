"use strict";
/**
 * Comportamento humano — simula pausas, scroll, digitação e interações leves
 * Quebra padrões robóticos detectáveis pela Meta
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.typingDelayMs = typingDelayMs;
exports.scrollDurationMs = scrollDurationMs;
exports.microPauseMs = microPauseMs;
exports.shouldDoRandomEngagement = shouldDoRandomEngagement;
exports.randomEngagementActions = randomEngagementActions;
exports.humanJitterSeconds = humanJitterSeconds;
exports.naturalPauseAfterMany = naturalPauseAfterMany;
function typingDelayMs(text) {
    const base = Math.min(2500, text.length * 18); // ~18ms por caractere
    const jitter = Math.floor(Math.random() * 600) - 300;
    return Math.max(700, base + jitter);
}
function scrollDurationMs() {
    // scroll natural 1-3s
    return Math.floor(Math.random() * 2000) + 1000;
}
function microPauseMs() {
    // pausa curta entre ações 400-1500ms
    return Math.floor(Math.random() * 1100) + 400;
}
function shouldDoRandomEngagement() {
    // 12% de chance de fazer like/scroll extra antes do post
    return Math.random() < 0.12;
}
function randomEngagementActions() {
    const pool = ['FEED_SCROLL', 'LIKE', 'STORY_VIEW'];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.floor(Math.random() * 2) + 1);
}
function humanJitterSeconds() {
    // jitter extra 5-25s
    return Math.floor(Math.random() * 20) + 5;
}
function naturalPauseAfterMany(postIndex) {
    // a cada N posts, já existe getLongPauseDuration, aqui só adiciona jitter extra
    return 0;
}
