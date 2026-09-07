import { Router, Request, Response } from 'express';
import { db } from '../core/db';
import { sendSuccess, sendError } from '../core/responseHandler';
import { validateProxy, parseProxy, PROXY_TIPS } from '../core/proxyManager';

export const accountsRouter = Router();

// GET all accounts
accountsRouter.get('/', (req: Request, res: Response) => {
  try {
    const accounts = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
    return sendSuccess(res, accounts);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Validate proxy format (usado no frontend antes de salvar)
accountsRouter.post('/validate-proxy', (req: Request, res: Response) => {
  try {
    const { proxy } = req.body;
    if (!proxy) return sendSuccess(res, { valid: true, tips: PROXY_TIPS });
    const v = validateProxy(proxy);
    if (!v.valid) return sendError(res, v.reason || 'Proxy inválido', 400);
    const parsed = parseProxy(proxy);
    return sendSuccess(res, { valid: true, parsed, tips: PROXY_TIPS });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Rotate User-Agent for account
accountsRouter.post('/:id/rotate-ua', (req: Request, res: Response) => {
  try {
    const { rotateAccountUA } = require('../core/proxyManager');
    const ua = rotateAccountUA(req.params.id);
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    return sendSuccess(res, { user_agent: ua, account: updated }, 'User-Agent rotacionado');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

function cleanIdentifier(input: string, platform: string, cookies?: string): string {
  if (!input) {
    if (cookies) {
      const match = cookies.match(/c_user=(\d+)/);
      if (match) return match[1];
    }
    return 'perfil_' + Date.now().toString().slice(-6);
  }
  let str = input.trim();
  // Se for URL do Facebook
  if (str.includes('facebook.com')) {
    // Caso 1: profile.php?id=1000...
    const idMatch = str.match(/[?&]id=(\d+)/);
    if (idMatch) return idMatch[1];
    // Caso 2: facebook.com/username
    const userMatch = str.match(/facebook\.com\/([a-zA-Z0-9._-]+)/);
    if (userMatch && !['groups', 'profile.php', 'watch', 'marketplace', 'home', 'messages'].includes(userMatch[1])) {
      return userMatch[1];
    }
    // Caso 3: apenas https://www.facebook.com ou https://www.facebook.com/
    if (cookies) {
      const match = cookies.match(/c_user=(\d+)/);
      if (match) return match[1];
    }
    return 'fb_' + Date.now().toString().slice(-6);
  }
  // Se for URL do Instagram
  if (str.includes('instagram.com')) {
    const igMatch = str.match(/instagram\.com\/([a-zA-Z0-9._-]+)/);
    if (igMatch) return igMatch[1];
  }
  return str;
}

function sanitizeProxyInput(proxy?: string): { sanitized: string | null; error?: string } {
  if (!proxy) return { sanitized: null };
  const p = proxy.trim();
  if (!p) return { sanitized: null };
  // Se o usuário colou uma URL normal de rede social em vez de proxy, desconsidera gentilmente
  if (p.includes('facebook.com') || p.includes('instagram.com') || p.includes('google.com')) {
    return { sanitized: null };
  }
  const pv = validateProxy(p);
  if (!pv.valid) {
    return { sanitized: null, error: pv.reason || 'Proxy inválido (formato esperado: http://ip:porta ou http://usuario:senha@ip:porta)' };
  }
  return { sanitized: p };
}

// GET /backup (exportar backup)
accountsRouter.get('/export-backup', (req: Request, res: Response) => {
  try {
    const store = (db as any).getStore();
    const backupData = {
      version: '5.80.0',
      exported_at: new Date().toISOString(),
      accounts: (store.accounts || []).map((a: any) => ({ ...a, cookies: undefined })),
      group_lists: store.group_lists || [],
      groups: store.groups || [],
      creative_library: store.creative_library || [],
      campaigns: store.campaigns || [],
      settings: store.settings || {},
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-pulso-social-${Date.now()}.json`);
    return res.json(backupData);
  } catch (error: any) {
    return sendError(res, error.message || 'Erro ao exportar backup');
  }
});

// POST /import-backup (restaurar backup)
accountsRouter.post('/import-backup', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return sendError(res, 'Arquivo de backup inválido ou vazio', 400);
    }
    const store = (db as any).getStore();
    if (Array.isArray(data.accounts)) store.accounts = data.accounts;
    if (Array.isArray(data.group_lists)) store.group_lists = data.group_lists;
    if (Array.isArray(data.groups)) store.groups = data.groups;
    if (Array.isArray(data.creative_library)) store.creative_library = data.creative_library;
    if (Array.isArray(data.campaigns)) store.campaigns = data.campaigns;
    if (data.settings && typeof data.settings === 'object') store.settings = data.settings;
    (db as any).save();
    return sendSuccess(res, { ok: true }, 'Backup restaurado com sucesso!');
  } catch (error: any) {
    return sendError(res, error.message || 'Erro ao importar backup');
  }
});

// POST /sync-session (extensão ou conexão direta 1-click)
accountsRouter.post('/sync-session', (req: Request, res: Response) => {
  try {
    const { cookies, c_user, name, avatar, auto_connect } = req.body;
    const store = (db as any).getStore();
    const cleanId = c_user || (cookies ? cookies.match(/c_user=(\d+)/)?.[1] : null) || 'fb_user';
    
    // Procura conta existente do Facebook
    let acc = store.accounts.find((a: any) => 
      a.platform === 'FACEBOOK' && (a.identifier === cleanId || (c_user && a.cookies?.includes(`c_user=${c_user}`)))
    );
    
    if (!acc) {
      acc = store.accounts.find((a: any) => a.platform === 'FACEBOOK');
    }

    const groupsCount = store.groups?.length || 116;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (acc) {
      if (name) acc.name = name;
      if (cookies) acc.cookies = cookies;
      if (cleanId) acc.identifier = cleanId;
      if (avatar) acc.avatar_url = avatar;
      if (auto_connect !== undefined) acc.auto_connect = Boolean(auto_connect);
      acc.status = 'ACTIVE';
      acc.trust_score = 95;
      acc.groups_count = groupsCount;
      acc.expires_at = expiresAt;
      acc.updated_at = now.toISOString();
      (db as any).save();
      return sendSuccess(res, acc, 'Sessão do Facebook sincronizada com sucesso');
    } else {
      const id = 'acc_' + Date.now();
      const newAcc = {
        id,
        platform: 'FACEBOOK',
        name: name || 'Luiz Eduardo Santos da Silva',
        identifier: cleanId,
        cookies: cookies || null,
        session_data: null,
        proxy: null,
        user_agent: null,
        avatar_url: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        groups_count: groupsCount,
        auto_connect: auto_connect !== undefined ? Boolean(auto_connect) : true,
        expires_at: expiresAt,
        status: 'ACTIVE',
        trust_score: 95,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      store.accounts.unshift(newAcc);
      (db as any).save();
      return sendSuccess(res, newAcc, 'Conta do Facebook conectada com sucesso!', 201);
    }
  } catch (error: any) {
    return sendError(res, error.message || 'Erro ao sincronizar sessão');
  }
});

// POST Create account
accountsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { platform = 'FACEBOOK', name, identifier, cookies, sessionData, proxy, userAgent, accessToken, access_token, igUserId, ig_user_id, avatar_url, auto_connect } = req.body;
    if (!name) {
      return sendError(res, 'Nome de identificação é obrigatório', 400);
    }
    
    // Sanitiza e extrai identificador se colado como URL
    const cleanId = cleanIdentifier(identifier, platform, cookies);
    
    // Sanitiza proxy sem quebrar caso tenha sido colada URL normal
    const proxyCheck = sanitizeProxyInput(proxy);
    if (proxyCheck.error) {
      return sendError(res, proxyCheck.error, 400);
    }
    const cleanProxy = proxyCheck.sanitized;

    const id = 'acc_' + Date.now();
    const token = accessToken || access_token || null;
    const igId = igUserId || ig_user_id || null;
    const store: any = (db as any).getStore();
    const groupsCount = store.groups?.length || 116;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newAcc = {
      id,
      platform,
      name: String(name).trim(),
      identifier: cleanId,
      cookies: cookies ? String(cookies).trim() : null,
      session_data: sessionData || null,
      proxy: cleanProxy,
      user_agent: userAgent || null,
      access_token: token,
      ig_user_id: igId,
      avatar_url: avatar_url || (platform === 'FACEBOOK' ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' : null),
      groups_count: groupsCount,
      auto_connect: auto_connect !== undefined ? Boolean(auto_connect) : true,
      expires_at: expiresAt,
      status: 'ACTIVE',
      trust_score: 95,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    store.accounts.unshift(newAcc);
    (db as any).save();

    return sendSuccess(res, newAcc, 'Conta conectada com sucesso', 201);
  } catch (error: any) {
    const msg = typeof error === 'string' ? error : (error.message || 'Erro ao conectar conta');
    return sendError(res, msg);
  }
});

// POST Validar credenciais oficiais do Instagram (token + IG User ID)
accountsRouter.post('/validate-instagram', async (req: Request, res: Response) => {
  try {
    const { accessToken, access_token, igUserId, ig_user_id } = req.body;
    const token = accessToken || access_token;
    const igId = igUserId || ig_user_id;
    if (!token || !igId) return sendError(res, 'Informe access_token e ig_user_id', 400);
    const { InstagramGraphService } = require('../services/instagramGraphService');
    const result = await InstagramGraphService.validateCredentials(String(token), String(igId));
    if (!result.valid) return sendError(res, result.error || 'Credenciais inválidas', 400);
    return sendSuccess(res, result.info, 'Credenciais válidas — pronto para publicar via API oficial');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// PUT Update account (suporta custom_limits por conta para anti-ban)
accountsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, cookies, proxy, status, trust_score, custom_limits, auto_connect, avatar_url } = req.body;
    const store: any = (db as any).getStore();
    const account = store.accounts.find((a: any) => a.id === req.params.id);
    if (!account) return sendError(res, 'Conta não encontrada', 404);
    if (proxy !== undefined && proxy) {
      const pv = validateProxy(proxy);
      if (!pv.valid) return sendError(res, pv.reason || 'Proxy inválido', 400);
    }
    if (name !== undefined) account.name = name;
    if (cookies !== undefined) account.cookies = cookies;
    if (proxy !== undefined) account.proxy = proxy;
    if (status !== undefined) account.status = status;
    if (trust_score !== undefined) account.trust_score = Number(trust_score);
    if (custom_limits !== undefined) account.custom_limits = custom_limits;
    if (auto_connect !== undefined) account.auto_connect = Boolean(auto_connect);
    if (avatar_url !== undefined) account.avatar_url = avatar_url;
    account.updated_at = new Date().toISOString();
    (db as any).save();
    return sendSuccess(res, account, 'Conta atualizada com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// PUT custom limits dedicated endpoint
accountsRouter.put('/:id/limits', (req: Request, res: Response) => {
  try {
    const { maxPostsPerHour, maxPostsPerDay, maxConsecutiveFailures } = req.body;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as any;
    if (!account) return sendError(res, 'Conta não encontrada', 404);
    const limits: any = {};
    if (maxPostsPerHour !== undefined) limits.maxPostsPerHour = Math.max(1, Math.min(30, Number(maxPostsPerHour)));
    if (maxPostsPerDay !== undefined) limits.maxPostsPerDay = Math.max(5, Math.min(150, Number(maxPostsPerDay)));
    if (maxConsecutiveFailures !== undefined) limits.maxConsecutiveFailures = Math.max(1, Math.min(10, Number(maxConsecutiveFailures)));
    db.prepare('UPDATE accounts SET custom_limits = ? WHERE id = ?').run(JSON.stringify(limits), req.params.id);
    // também reseta estado anti-ban para aplicar imediatamente
    const { resetAccount } = require('../core/antiBan');
    resetAccount(req.params.id);
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    return sendSuccess(res, updated, 'Limites da conta atualizados');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// DELETE custom limits (volta ao automático por trust_score)
accountsRouter.delete('/:id/limits', (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE accounts SET custom_limits = ? WHERE id = ?').run(null, req.params.id);
    const { resetAccount } = require('../core/antiBan');
    resetAccount(req.params.id);
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    return sendSuccess(res, updated, 'Limites voltaram ao automático');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// DELETE Account
accountsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
    return sendSuccess(res, { deleted: true }, 'Conta removida com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Test account connection (valida proxy com latência, cookies e status)
accountsRouter.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as any;
    if (!account) return sendError(res, 'Conta não encontrada', 404);
    const checks: string[] = [];
    let proxyLatencyMs: number | null = null;
    let proxyOk: boolean | null = null;
    if (account.proxy) {
      const v = validateProxy(account.proxy);
      if (!v.valid) return sendSuccess(res, { valid: false, status: `Proxy inválido: ${v.reason}`, proxyChecked: false, checks });
      const p = parseProxy(account.proxy);
      checks.push(`Proxy ${p?.host}:${p?.port} (${p?.protocol}) formato ok`);
      // teste real de latência (http/https). SOCKS5 exige agente externo, então apenas valida formato.
      if (p && (p.protocol === 'http' || p.protocol === 'https')) {
        const start = Date.now();
        try {
          // usa axios com proxy nativo (5s timeout)
          const axios = require('axios');
          await axios.get('https://httpbin.org/ip', {
            proxy: { host: p.host, port: p.port, auth: p.username ? { username: p.username, password: p.password || '' } : undefined },
            timeout: 5000,
          });
          proxyLatencyMs = Date.now() - start;
          proxyOk = true;
          checks.push(`Proxy respondendo — latência ${proxyLatencyMs}ms`);
        } catch (e: any) {
          proxyLatencyMs = Date.now() - start;
          proxyOk = false;
          checks.push(`Proxy sem resposta em ${proxyLatencyMs}ms — ${e.message?.slice(0, 80) || 'timeout'}`);
        }
      } else if (p?.protocol === 'socks5') {
        checks.push('SOCKS5: formato ok — teste de latência requer proxy SOCKS ativo (validado apenas formato)');
        proxyOk = null;
      }
    } else {
      checks.push('Sem proxy (IP direto)');
    }
    const hasCookies = account.cookies && String(account.cookies).length >= 100;
    checks.push(hasCookies ? 'Cookies presentes' : 'Sem cookies — modo simulação');
    if (account.status === 'BLOCKED') return sendSuccess(res, { valid: false, status: 'Conta BLOQUEADA — renove em Configurações', trustScore: account.trust_score, checks, proxyLatencyMs, proxyOk });
    if (account.status === 'NEEDS_LOGIN') return sendSuccess(res, { valid: false, status: 'Sessão expirada — renove cookies/token', trustScore: account.trust_score, checks, proxyLatencyMs, proxyOk });
    if (!hasCookies) return sendSuccess(res, { valid: true, status: 'Conexão em modo simulação (sem cookies reais) — configure sessão para posts reais', trustScore: account.trust_score, checks, proxyLatencyMs, proxyOk });
    // se proxy falhou, ainda considera válido mas avisa
    if (proxyOk === false) return sendSuccess(res, { valid: true, status: `Conexão ok mas proxy com falha (latência ${proxyLatencyMs}ms) — verifique proxy`, trustScore: account.trust_score, checks, proxyLatencyMs, proxyOk });
    return sendSuccess(res, { valid: true, status: proxyLatencyMs !== null ? `Conexão ativa — proxy ${proxyLatencyMs}ms` : 'Conexão ativa e verificada', trustScore: account.trust_score, checks, proxyLatencyMs, proxyOk });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});
