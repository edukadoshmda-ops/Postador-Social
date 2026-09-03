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

// POST Create account
accountsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { platform = 'FACEBOOK', name, identifier, cookies, sessionData, proxy, userAgent, accessToken, access_token, igUserId, ig_user_id } = req.body;
    if (!name || !identifier) {
      return sendError(res, 'Nome e Identificador (ID/Usuário) são obrigatórios', 400);
    }
    if (proxy) {
      const pv = validateProxy(proxy);
      if (!pv.valid) return sendError(res, pv.reason || 'Proxy inválido', 400);
    }
    const id = 'acc_' + Date.now();
    const token = accessToken || access_token || null;
    const igId = igUserId || ig_user_id || null;
    // tenta inserção com colunas oficiais se existirem
    try {
      db.prepare(`
        INSERT INTO accounts (id, platform, name, identifier, cookies, session_data, proxy, user_agent, access_token, ig_user_id, status, trust_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 90)
      `).run(id, platform, name, identifier, cookies || null, sessionData || null, proxy || null, userAgent || null, token, igId);
    } catch {
      db.prepare(`
        INSERT INTO accounts (id, platform, name, identifier, cookies, session_data, proxy, user_agent, status, trust_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 90)
      `).run(id, platform, name, identifier, cookies || null, sessionData || null, proxy || null, userAgent || null);
      if (token || igId) {
        // salva via update genérico se colunas não existirem no prepare
        const store: any = (db as any).getStore();
        const acc = store.accounts.find((a: any) => a.id === id);
        if (acc) {
          if (token) acc.access_token = token;
          if (igId) acc.ig_user_id = igId;
          (db as any).save();
        }
      }
    }
    // garante persistência mesmo se INSERT com colunas falhou no saveStore genérico
    if (token || igId) {
      const store: any = (db as any).getStore();
      const acc = store.accounts.find((a: any) => a.id === id);
      if (acc) {
        if (token) { acc.access_token = token; acc.accessToken = token; }
        if (igId) { acc.ig_user_id = igId; acc.igUserId = igId; }
        (db as any).save();
      }
    }

    const created = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return sendSuccess(res, created, 'Conta conectada com sucesso', 201);
  } catch (error: any) {
    return sendError(res, error.message);
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
    const { name, cookies, proxy, status, trust_score, custom_limits } = req.body;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as any;
    if (!account) return sendError(res, 'Conta não encontrada', 404);
    if (proxy !== undefined && proxy) {
      const pv = validateProxy(proxy);
      if (!pv.valid) return sendError(res, pv.reason || 'Proxy inválido', 400);
    }
    // atualiza campos básicos se enviados
    if (name !== undefined || cookies !== undefined || proxy !== undefined || status !== undefined) {
      db.prepare(`
        UPDATE accounts 
        SET name = COALESCE(?, name),
            cookies = COALESCE(?, cookies),
            proxy = COALESCE(?, proxy),
            status = COALESCE(?, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name ?? null, cookies ?? null, proxy ?? null, status ?? null, req.params.id);
    }
    if (custom_limits !== undefined) {
      const json = custom_limits ? JSON.stringify(custom_limits) : null;
      db.prepare('UPDATE accounts SET custom_limits = ? WHERE id = ?').run(json, req.params.id);
    }
    if (trust_score !== undefined) {
      const acc2 = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as any;
      db.prepare('UPDATE accounts SET trust_score = ?, status = ? WHERE id = ?').run(Number(trust_score), acc2.status, req.params.id);
    }
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    return sendSuccess(res, updated, 'Conta atualizada com sucesso');
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
