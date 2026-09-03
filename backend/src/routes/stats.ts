import { Router, Request, Response } from 'express';
import { db } from '../core/db';
import { sendSuccess, sendError } from '../core/responseHandler';
import { Parser } from 'json2csv';
import { getAllStates, getEffectiveLimits, DEFAULT_ANTI_BAN } from '../core/antiBan';
import { computeBestTime } from '../core/cooldown';

export const statsRouter = Router();

// GET Stats Overview
statsRouter.get('/overview', (req: Request, res: Response) => {
  try {
    const totalCampaigns = db.prepare('SELECT count(*) as count FROM campaigns').get() as any;
    const totalGroups = db.prepare('SELECT count(*) as count FROM groups').get() as any;
    const totalAccounts = db.prepare('SELECT count(*) as count FROM accounts').get() as any;

    const postsStats = db.prepare(`
      SELECT 
        count(*) as total_posts,
        sum(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as published,
        sum(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) as pending,
        sum(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM campaign_items
    `).get() as any;

    // Atividade real dos últimos 7 dias (baseada em campaign_items.executed_at)
    const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
    const allItems: any[] = store.campaign_items || [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const now = new Date();
    const dailyActivity: { date: string; published: number; pending: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const nextIso = new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let published = 0, pending = 0, failed = 0;
      for (const it of allItems) {
        const ex = (it.executed_at || '').slice(0, 10);
        if (ex < iso || ex >= nextIso) continue;
        if (it.status === 'PUBLISHED') published++;
        else if (it.status === 'PENDING_APPROVAL') pending++;
        else if (it.status === 'FAILED') failed++;
      }
      dailyActivity.push({ date: dayNames[d.getDay()], published, pending, failed });
    }

    return sendSuccess(res, {
      totalCampaigns: totalCampaigns.count || 0,
      totalGroups: totalGroups.count || 0,
      totalAccounts: totalAccounts.count || 0,
      totalPosts: postsStats.total_posts || 0,
      publishedPosts: postsStats.published || 0,
      pendingPosts: postsStats.pending || 0,
      failedPosts: postsStats.failed || 0,
      dailyActivity,
    });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET Anti-ban health por conta (limites efetivos + estado) + IP
statsRouter.get('/health', (req: Request, res: Response) => {
  try {
    const accounts = db.prepare('SELECT * FROM accounts').all() as any[];
    const states = getAllStates();
    const { getIpStates, getProxyKey } = require('../core/ipLimiter');
    const ipStates = getIpStates();
    const health = accounts.map((acc: any) => {
      const eff = getEffectiveLimits(acc);
      const s: any = (states as any)[acc.id] || { postsThisHour: 0, postsToday: 0, consecutiveFailures: 0, errorsThisWindow: 0, totalThisWindow: 0, remainingHour: eff.maxPostsPerHour };
      const errRate = s.totalThisWindow > 0 ? s.errorsThisWindow / s.totalThisWindow : 0;
      const risk = s.consecutiveFailures >= 2 || errRate > 0.25 ? 'alto' : errRate > 0 ? 'medio' : 'baixo';
      const ipKey = getProxyKey(acc);
      return {
        accountId: acc.id,
        name: acc.name,
        platform: acc.platform,
        trust_score: acc.trust_score,
        status: acc.status,
        effectiveLimits: eff,
        state: s,
        risk,
        ipKey,
        ipState: ipStates[ipKey] || null,
      };
    });
    return sendSuccess(res, { defaults: DEFAULT_ANTI_BAN, health, ipStates });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET Melhor horário para postar (baseado em taxa de sucesso real) — suporta ?accountId=
statsRouter.get('/best-time', (req: Request, res: Response) => {
  try {
    const accountId = (req.query.accountId as string) || null;
    const result = computeBestTime(accountId);
    return sendSuccess(res, result);
  } catch (error: any) { return sendError(res, error.message); }
});

// GET Limites por IP/proxy
statsRouter.get('/ip-limits', (req: Request, res: Response) => {
  try {
    const { getIpLimits, getIpStates } = require('../core/ipLimiter');
    return sendSuccess(res, { limits: getIpLimits(), ipStates: getIpStates() });
  } catch (error: any) { return sendError(res, error.message); }
});

// PUT Limites por IP/proxy
statsRouter.put('/ip-limits', (req: Request, res: Response) => {
  try {
    const { perHour, perDay } = req.body;
    const ph = Math.max(5, Math.min(100, Number(perHour) || 18));
    const pd = Math.max(20, Math.min(500, Number(perDay) || 80));
    const { setIpLimits, getIpLimits } = require('../core/ipLimiter');
    setIpLimits(ph, pd);
    return sendSuccess(res, getIpLimits(), `Limites por IP atualizados: ${ph}/h e ${pd}/dia`);
  } catch (error: any) { return sendError(res, error.message); }
});

// GET Relatório de entrega (shadowban check) — filtro por delivered/shadowbanned
statsRouter.get('/delivery', (req: Request, res: Response) => {
  try {
    const accountId = (req.query.accountId as string) || null;
    const filter = (req.query.filter as string) || 'all'; // all|shadowbanned|delivered|pending
    const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [], campaigns: [] };
    let items: any[] = store.campaign_items || [];
    if (accountId) {
      const ids = new Set((store.campaigns || []).filter((c: any) => String(c.account_id) === String(accountId)).map((c: any) => c.id));
      items = items.filter((ci: any) => ids.has(ci.campaign_id));
    }
    // apenas com delivery_checked
    const checked = items.filter((ci: any) => ci.delivery_checked_at);
    let filtered = checked;
    if (filter === 'shadowbanned') filtered = checked.filter((ci: any) => ci.delivery_shadowbanned);
    else if (filter === 'delivered') filtered = checked.filter((ci: any) => ci.delivery_delivered);
    else if (filter === 'pending') filtered = checked.filter((ci: any) => !ci.delivery_delivered && !ci.delivery_shadowbanned);
    const summary = {
      totalChecked: checked.length,
      delivered: checked.filter((ci: any) => ci.delivery_delivered).length,
      shadowbanned: checked.filter((ci: any) => ci.delivery_shadowbanned).length,
      pending: checked.filter((ci: any) => !ci.delivery_delivered && !ci.delivery_shadowbanned).length,
    };
    return sendSuccess(res, { summary, items: filtered.slice(0, 100).map((ci: any) => ({ id: ci.id, campaign_id: ci.campaign_id, group_name: ci.group_name, group_id: ci.group_id, status: ci.status, post_url: ci.post_url, posted_text: ci.posted_text?.slice(0, 140), delivery_delivered: ci.delivery_delivered, delivery_shadowbanned: ci.delivery_shadowbanned, delivery_reason: ci.delivery_reason, delivery_checked_at: ci.delivery_checked_at, executed_at: ci.executed_at })) });
  } catch (error: any) { return sendError(res, error.message); }
});

// POST Limpeza automática de quarentena expirada (>14 dias)
statsRouter.post('/quarantine/cleanup', (req: Request, res: Response) => {
  try {
    const { QUARANTINE_WINDOW_DAYS } = require('../core/cooldown');
    const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
    const cutoff = Date.now() - QUARANTINE_WINDOW_DAYS * 24 * 3600 * 1000;
    let kept = 0;
    // quarentena é calculada em tempo real, não precisa limpar — mas limpamos FAILED muito antigos (>30 dias) para performance
    const before = store.campaign_items.length;
    const thirtyDays = 30 * 24 * 3600 * 1000;
    const oldCutoff = Date.now() - thirtyDays;
    const toKeep: any[] = [];
    for (const ci of store.campaign_items) {
      if (ci.status === 'FAILED' && ci.executed_at && new Date(ci.executed_at).getTime() < oldCutoff) continue;
      toKeep.push(ci);
      kept++;
    }
    store.campaign_items = toKeep;
    (db as any).save();
    const removed = before - kept;
    return sendSuccess(res, { removed }, removed > 0 ? `${removed} registro(s) antigos removidos` : 'Quarentena já limpa — nenhum item expirado além de 14 dias');
  } catch (error: any) { return sendError(res, error.message); }
});

// GET Quarentena — grupos com 2+ falhas em 14 dias
statsRouter.get('/quarantine', (req: Request, res: Response) => {
  try {
    const { getQuarantinedGroups, QUARANTINE_DAYS } = require('../core/cooldown');
    const list = getQuarantinedGroups();
    // enriquece com nome do grupo
    const groups: any[] = (db as any).getStore ? (db as any).getStore().groups : [];
    const enriched = list.map((q: any) => {
      const g = groups.find((x: any) => String(x.group_id) === String(q.group_id));
      return { ...q, group_name: g?.name || q.group_id, group_url: g?.url || null, quarantineDays: QUARANTINE_DAYS };
    });
    return sendSuccess(res, enriched);
  } catch (error: any) { return sendError(res, error.message); }
});

// DELETE Quarentena de um grupo (limpa falhas e libera)
statsRouter.delete('/quarantine/:groupId', (req: Request, res: Response) => {
  try {
    const gid = String(req.params.groupId);
    const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
    let removed = 0;
    // marca falhas antigas como ignoradas: remove ou muda para QUEUED? Vamos remover contagem de falhas mantendo histórico mas limpando status FAILED para não contar
    // estratégia: deleta apenas itens FAILED desse group_id dos últimos 14 dias, mantendo os demais
    const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
    const before = store.campaign_items.length;
    store.campaign_items = store.campaign_items.filter((ci: any) => {
      if (String(ci.group_id) !== gid) return true;
      if (ci.status !== 'FAILED' || !ci.executed_at) return true;
      if (new Date(ci.executed_at).getTime() < cutoff) return true;
      removed++;
      return false;
    });
    // se não removeu nada, tenta limpar todos os FAILED desse grupo
    if (removed === 0) {
      const toRemove = store.campaign_items.filter((ci: any) => String(ci.group_id) === gid && ci.status === 'FAILED');
      removed = toRemove.length;
      store.campaign_items = store.campaign_items.filter((ci: any) => !(String(ci.group_id) === gid && ci.status === 'FAILED'));
    }
    (db as any).save();
    return sendSuccess(res, { removed }, removed > 0 ? `${removed} falha(s) removida(s) — grupo liberado da quarentena` : 'Nenhuma falha encontrada');
  } catch (error: any) { return sendError(res, error.message); }
});

// GET Export CSV — entrega com shadowban (filtros de delivery)
statsRouter.get('/export/delivery-csv', (req: Request, res: Response) => {
  try {
    const accountId = (req.query.accountId as string) || null;
    const filter = (req.query.filter as string) || 'all';
    const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [], campaigns: [] };
    let items: any[] = store.campaign_items || [];
    if (accountId) {
      const ids = new Set((store.campaigns || []).filter((c: any) => String(c.account_id) === String(accountId)).map((c: any) => c.id));
      items = items.filter((ci: any) => ids.has(ci.campaign_id));
    }
    let filtered = items.filter((ci: any) => ci.delivery_checked_at);
    if (filter === 'shadowbanned') filtered = filtered.filter((ci: any) => ci.delivery_shadowbanned);
    else if (filter === 'delivered') filtered = filtered.filter((ci: any) => ci.delivery_delivered);
    else if (filter === 'pending') filtered = filtered.filter((ci: any) => !ci.delivery_delivered && !ci.delivery_shadowbanned);
    const fields = ['id', 'campaign_id', 'group_name', 'group_id', 'status', 'post_url', 'posted_text', 'delivery_delivered', 'delivery_shadowbanned', 'delivery_reason', 'delivery_checked_at', 'executed_at'];
    const parser = new Parser({ fields });
    const csv = parser.parse(filtered.map((ci: any) => ({ id: ci.id, campaign_id: ci.campaign_id, group_name: ci.group_name, group_id: ci.group_id, status: ci.status, post_url: ci.post_url, posted_text: (ci.posted_text || '').slice(0, 300), delivery_delivered: ci.delivery_delivered ? 'SIM' : 'NAO', delivery_shadowbanned: ci.delivery_shadowbanned ? 'SIM' : 'NAO', delivery_reason: ci.delivery_reason || '', delivery_checked_at: ci.delivery_checked_at || '', executed_at: ci.executed_at || '' })));
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`relatorio-entrega-${filter}-${Date.now()}.csv`);
    return res.send(csv);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET Export CSV com colunas de risco e limites
statsRouter.get('/export/csv', (req: Request, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT 
        ci.id, c.name as campaign_name, ci.group_name, ci.group_id, 
        ci.status, ci.post_id, ci.post_url, ci.executed_at, ci.posted_text, c.spintax_enabled
      FROM campaign_items ci
      JOIN campaigns c ON ci.campaign_id = c.id
      ORDER BY ci.executed_at DESC
    `).all() as any[];
    const { validateContent } = require('../core/contentFilter');
    const enriched = items.map((it: any) => {
      let risk = '', score = '', warnings = '';
      try {
        if (it.posted_text) {
          const chk = validateContent(it.posted_text, !!it.spintax_enabled);
          risk = chk.risk; score = String(chk.score); warnings = chk.warnings.join(' | ');
        }
      } catch {}
      return { ...it, spam_risk: risk, spam_score: score, spam_warnings: warnings };
    });
    const fields = ['id', 'campaign_name', 'group_name', 'group_id', 'status', 'post_id', 'post_url', 'executed_at', 'spam_risk', 'spam_score', 'spam_warnings'];
    const parser = new Parser({ fields });
    const csv = parser.parse(enriched);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`relatorio-postagens-${Date.now()}.csv`);
    return res.send(csv);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});
