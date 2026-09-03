"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROXY_TIPS = void 0;
exports.validateProxy = validateProxy;
exports.parseProxy = parseProxy;
exports.getAccountUA = getAccountUA;
exports.rotateAccountUA = rotateAccountUA;
exports.getProxyAgentConfig = getProxyAgentConfig;
exports.shouldRotateUA = shouldRotateUA;
const db_1 = require("./db");
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];
function validateProxy(proxy) {
    if (!proxy)
        return { valid: true };
    const trimmed = proxy.trim();
    if (!trimmed)
        return { valid: true };
    // aceita http://user:pass@ip:port , http://ip:port , socks5://ip:port
    const re = /^(https?|socks5):\/\/.+/i;
    if (!re.test(trimmed))
        return { valid: false, reason: 'Formato inválido. Use http://ip:porta ou http://usuario:senha@ip:porta ou socks5://ip:porta' };
    try {
        const u = new URL(trimmed);
        if (!u.hostname || !u.port)
            return { valid: false, reason: 'IP e porta obrigatórios' };
        const port = Number(u.port);
        if (isNaN(port) || port < 1 || port > 65535)
            return { valid: false, reason: 'Porta inválida' };
        return { valid: true };
    }
    catch {
        return { valid: false, reason: 'URL de proxy inválida' };
    }
}
function parseProxy(proxy) {
    if (!proxy)
        return null;
    try {
        const u = new URL(proxy.trim());
        return {
            protocol: u.protocol.replace(':', ''),
            host: u.hostname,
            port: Number(u.port),
            username: u.username || undefined,
            password: u.password ? decodeURIComponent(u.password) : undefined,
        };
    }
    catch {
        return null;
    }
}
function getAccountUA(account) {
    if (account?.user_agent && String(account.user_agent).length > 20)
        return account.user_agent;
    // atribui um UA persistente por conta (salva no banco na primeira vez)
    const picked = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    // salva de forma assíncrona (não bloqueia)
    try {
        if (account?.id) {
            const current = db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id);
            if (current && !current.user_agent) {
                db_1.db.prepare('UPDATE accounts SET user_agent = ? WHERE id = ?').run(picked, account.id);
            }
        }
    }
    catch { }
    return picked;
}
function rotateAccountUA(accountId) {
    const picked = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    try {
        db_1.db.prepare('UPDATE accounts SET user_agent = ? WHERE id = ?').run(picked, accountId);
    }
    catch { }
    return picked;
}
function getProxyAgentConfig(proxy) {
    const parsed = parseProxy(proxy);
    if (!parsed)
        return null;
    // para uso com axios/https-proxy-agent — retornamos config simples
    return {
        host: parsed.host,
        port: parsed.port,
        protocol: parsed.protocol,
        auth: parsed.username ? { username: parsed.username, password: parsed.password || '' } : undefined,
    };
}
function shouldRotateUA(accountId, postsCountInWindow) {
    // rotaciona UA a cada 15 posts ou a cada 2 horas (simulado por contagem)
    return postsCountInWindow > 0 && postsCountInWindow % 15 === 0;
}
exports.PROXY_TIPS = {
    quando_usar: 'Use proxy quando gerenciar 3+ contas ou quando tomar bloqueio por IP. 1 proxy por conta é o ideal.',
    formato: 'http://usuario:senha@ip:porta — compre proxies residenciais ou móveis para Facebook/Instagram',
    teste: 'Clique em "Testar Conexão" para validar proxy + cookies juntos',
};
