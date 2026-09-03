import { db } from './db';

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

export function validateProxy(proxy: string): { valid: boolean; reason?: string } {
  if (!proxy) return { valid: true };
  const trimmed = proxy.trim();
  if (!trimmed) return { valid: true };
  // aceita http://user:pass@ip:port , http://ip:port , socks5://ip:port
  const re = /^(https?|socks5):\/\/.+/i;
  if (!re.test(trimmed)) return { valid: false, reason: 'Formato inválido. Use http://ip:porta ou http://usuario:senha@ip:porta ou socks5://ip:porta' };
  try {
    const u = new URL(trimmed);
    if (!u.hostname || !u.port) return { valid: false, reason: 'IP e porta obrigatórios' };
    const port = Number(u.port);
    if (isNaN(port) || port < 1 || port > 65535) return { valid: false, reason: 'Porta inválida' };
    return { valid: true };
  } catch {
    return { valid: false, reason: 'URL de proxy inválida' };
  }
}

export function parseProxy(proxy: string): { protocol: string; host: string; port: number; username?: string; password?: string } | null {
  if (!proxy) return null;
  try {
    const u = new URL(proxy.trim());
    return {
      protocol: u.protocol.replace(':', ''),
      host: u.hostname,
      port: Number(u.port),
      username: u.username || undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
    };
  } catch {
    return null;
  }
}

export function getAccountUA(account: any): string {
  if (account?.user_agent && String(account.user_agent).length > 20) return account.user_agent;
  // atribui um UA persistente por conta (salva no banco na primeira vez)
  const picked = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  // salva de forma assíncrona (não bloqueia)
  try {
    if (account?.id) {
      const current = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id) as any;
      if (current && !current.user_agent) {
        db.prepare('UPDATE accounts SET user_agent = ? WHERE id = ?').run(picked, account.id);
      }
    }
  } catch {}
  return picked;
}

export function rotateAccountUA(accountId: string): string {
  const picked = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  try {
    db.prepare('UPDATE accounts SET user_agent = ? WHERE id = ?').run(picked, accountId);
  } catch {}
  return picked;
}

export function getProxyAgentConfig(proxy: string): any {
  const parsed = parseProxy(proxy);
  if (!parsed) return null;
  // para uso com axios/https-proxy-agent — retornamos config simples
  return {
    host: parsed.host,
    port: parsed.port,
    protocol: parsed.protocol,
    auth: parsed.username ? { username: parsed.username, password: parsed.password || '' } : undefined,
  };
}

export function shouldRotateUA(accountId: string, postsCountInWindow: number): boolean {
  // rotaciona UA a cada 15 posts ou a cada 2 horas (simulado por contagem)
  return postsCountInWindow > 0 && postsCountInWindow % 15 === 0;
}

export const PROXY_TIPS = {
  quando_usar: 'Use proxy quando gerenciar 3+ contas ou quando tomar bloqueio por IP. 1 proxy por conta é o ideal.',
  formato: 'http://usuario:senha@ip:porta — compre proxies residenciais ou móveis para Facebook/Instagram',
  teste: 'Clique em "Testar Conexão" para validar proxy + cookies juntos',
};
