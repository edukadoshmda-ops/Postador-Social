import { Router, Request, Response } from 'express';
import { db } from '../core/db';
import { sendSuccess, sendError } from '../core/responseHandler';
import { CampaignRunner } from '../services/campaignRunner';
import { generateSpintaxSamples } from '../core/spintax';
import { validateContent } from '../core/contentFilter';
import { filterGroupsByCooldown, DEFAULT_COOLDOWN_DAYS, filterQuarantinedGroups, filterPrivateGroups, getQuarantinedGroups } from '../core/cooldown';
import { findDuplicates } from '../core/duplicateDetector';

export const campaignsRouter = Router();

// GET all campaigns
campaignsRouter.get('/', (req: Request, res: Response) => {
  try {
    const campaigns = db.prepare(`
      SELECT c.*, a.name as account_name, gl.name as group_list_name 
      FROM campaigns c
      LEFT JOIN accounts a ON c.account_id = a.id
      LEFT JOIN group_lists gl ON c.group_list_id = gl.id
      ORDER BY c.created_at DESC
    `).all();
    return sendSuccess(res, campaigns);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET campaign by ID
campaignsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const campaign = db.prepare(`
      SELECT c.*, a.name as account_name, gl.name as group_list_name 
      FROM campaigns c
      LEFT JOIN accounts a ON c.account_id = a.id
      LEFT JOIN group_lists gl ON c.group_list_id = gl.id
      WHERE c.id = ?
    `).get(req.params.id);
    if (!campaign) return sendError(res, 'Campanha não encontrada', 404);
    return sendSuccess(res, campaign);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET campaign items
campaignsRouter.get('/:id/items', (req: Request, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT * FROM campaign_items 
      WHERE campaign_id = ? 
      ORDER BY rowid ASC
    `).all(req.params.id);
    return sendSuccess(res, items);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Validate content (anti-spam) — usado pelo frontend antes de criar
campaignsRouter.post('/validate', (req: Request, res: Response) => {
  try {
    const { contentText, spintaxEnabled = true } = req.body;
    if (!contentText) return sendError(res, 'Conteúdo é obrigatório', 400);
    const result = validateContent(contentText, Boolean(spintaxEnabled));
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Check duplicado entre campanhas (similaridade >85%)
campaignsRouter.post('/duplicate-check', (req: Request, res: Response) => {
  try {
    const { contentText, threshold = 0.85 } = req.body;
    if (!contentText) return sendError(res, 'Conteúdo é obrigatório', 400);
    const hits = findDuplicates(contentText, Number(threshold) || 0.85, true);
    return sendSuccess(res, { hits, isDuplicate: hits.length > 0, threshold });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Create new campaign
campaignsRouter.post('/', (req: Request, res: Response) => {
  try {
    const {
      name,
      type = 'POSTER',
      platform = 'FACEBOOK',
      accountId,
      groupListId,
      contentText,
      spintaxEnabled = true,
      mediaType = 'TEXT',
      mediaUrls = [],
      linkUrl,
      calibration,
      schedule,
      cooldownDays,
      skipCooldownCheck,
    } = req.body;

    if (!name || !accountId || !contentText) {
      return sendError(res, 'Campos obrigatórios: Nome, Conta e Conteúdo', 400);
    }
    // validação anti-spam leve — não bloqueia, apenas registra aviso no log
    const contentCheck = validateContent(contentText, Boolean(spintaxEnabled));
    if (!contentCheck.ok) {
      console.warn('[anti-spam] Campanha com risco alto criada:', { name, risk: contentCheck.risk, warnings: contentCheck.warnings });
    }

    const campaignId = 'camp_' + Date.now();

    // Get groups from list (+ filtro selectedGroupIds para enviar só aos marcados)
    let groups: any[] = [];
    if (groupListId) {
      groups = db.prepare('SELECT * FROM groups WHERE list_id = ?').all(groupListId);
    }
    const selectedGroupIds: string[] | undefined = (req.body as any).selectedGroupIds;
    if (Array.isArray(selectedGroupIds) && selectedGroupIds.length > 0) {
      const set = new Set(selectedGroupIds.map((x: string) => String(x)));
      groups = groups.filter((g: any) => set.has(String(g.id)) || set.has(String(g.group_id)));
      if (groups.length === 0) return sendError(res, 'Nenhum dos grupos selecionados está na lista', 400);
    }

    // Cooldown por grupo: evita repost < N dias no mesmo grupo
    let cooldownBlocked: { group: any; remainingDays: number }[] = [];
    const effectiveCooldown = Number(cooldownDays ?? DEFAULT_COOLDOWN_DAYS);
    if (!skipCooldownCheck && effectiveCooldown > 0 && groups.length > 0) {
      const filtered = filterGroupsByCooldown(groups, effectiveCooldown);
      cooldownBlocked = filtered.blocked;
      groups = filtered.allowed;
      if (groups.length === 0) {
        return sendError(res, `Todos os ${cooldownBlocked.length} grupos estão em cooldown de ${effectiveCooldown} dias. Aguarde ${Math.min(...cooldownBlocked.map((b) => b.remainingDays))} dia(s) ou desmarque "Respeitar cooldown" no modal.`, 400);
      }
    }

    // Filtro de criptomoedas: grupos privados/fechados e quarentena (2+ falhas em 14 dias)
    const { skipPrivateCheck, skipQuarantineCheck } = req.body as any;
    let privateSkipped: any[] = [];
    let quarantinedSkipped: any[] = [];
    if (!skipPrivateCheck && groups.length > 0) {
      const { allowed, privateGroups } = filterPrivateGroups(groups);
      privateSkipped = privateGroups;
      if (privateGroups.length > 0) groups = allowed;
      if (groups.length === 0 && privateGroups.length > 0) {
        return sendError(res, `Todos os ${privateGroups.length} grupos são privados/fechados — ative "Incluir privados" no modal ou use lista pública`, 400);
      }
    }
    if (!skipQuarantineCheck && groups.length > 0) {
      const { allowed, quarantined } = filterQuarantinedGroups(groups);
      quarantinedSkipped = quarantined;
      if (quarantined.length > 0) groups = allowed;
      if (groups.length === 0 && quarantined.length > 0) {
        return sendError(res, `Todos os ${quarantined.length} grupos estão em quarentena (2+ falhas em 14 dias). Limpe a quarentena em Estatísticas ou desmarque o filtro.`, 400);
      }
    }

    const totalTargets = groups.length;

    // schedule opcional (recorrência)
    let scheduleJson: string | null = null;
    if (schedule && typeof schedule === 'object') {
      const { computeNextRun } = require('../core/scheduler');
      const nextRun = schedule.enabled ? computeNextRun(schedule, new Date()) : null;
      const toSave: any = { ...schedule, nextRun: nextRun || schedule.nextRun || null };
      scheduleJson = JSON.stringify(toSave);
    }

    db.prepare(`
      INSERT INTO campaigns (
        id, name, type, platform, account_id, group_list_id, 
        content_text, spintax_enabled, media_type, media_urls, 
        link_url, calibration_json, status, total_targets, schedule_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDLE', ?, ?)
    `).run(
      campaignId,
      name,
      type,
      platform,
      accountId,
      groupListId || null,
      contentText,
      spintaxEnabled ? 1 : 0,
      mediaType,
      JSON.stringify(mediaUrls),
      linkUrl || null,
      calibration ? JSON.stringify(calibration) : null,
      totalTargets,
      scheduleJson
    );

    // Insert campaign items — embaralha por padrão para quebrar padrão sequencial
    const { shuffleEnabled = true } = req.body as any;
    const orderedGroups = [...groups];
    if (shuffleEnabled !== false && orderedGroups.length > 1) {
      for (let i = orderedGroups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp: any = orderedGroups[i];
        orderedGroups[i] = orderedGroups[j];
        orderedGroups[j] = tmp;
      }
    }
    const insertItem = db.prepare(`
      INSERT INTO campaign_items (id, campaign_id, group_id, group_name, group_url, status)
      VALUES (?, ?, ?, ?, ?, 'QUEUED')
    `);
    for (let i = 0; i < orderedGroups.length; i++) {
      const g: any = orderedGroups[i];
      insertItem.run(`item_${campaignId}_${i}`, campaignId, g.group_id, g.name, g.url);
    }

    const blockedInfo = cooldownBlocked.length > 0 ? ` · ${cooldownBlocked.length} grupo(s) em cooldown (${effectiveCooldown}d) ignorados` : '';
    const created = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    const msg = 'Campanha criada com sucesso' + blockedInfo + (cooldownBlocked.length > 0 ? ` — ${cooldownBlocked.map((b) => `${b.group.name} (${b.remainingDays}d)`).slice(0, 3).join(', ')}${cooldownBlocked.length > 3 ? '...' : ''}` : '');
    return sendSuccess(res, { campaign: created, cooldownBlocked, cooldownDays: effectiveCooldown }, msg, 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET Cooldown check para lista (usado no modal antes de criar)
campaignsRouter.get('/cooldown-check/:listId', (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days ?? DEFAULT_COOLDOWN_DAYS);
    const groups: any[] = db.prepare('SELECT * FROM groups WHERE list_id = ?').all(req.params.listId) as any[];
    const { allowed, blocked } = filterGroupsByCooldown(groups, days);
    return sendSuccess(res, { total: groups.length, allowed: allowed.length, blocked: blocked.length, blockedDetails: blocked.slice(0, 10), days });
  } catch (error: any) { return sendError(res, error.message); }
});

// POST Balanced create — distribui grupos automaticamente entre contas mais saudáveis
campaignsRouter.post('/balanced', (req: Request, res: Response) => {
  try {
    const {
      name,
      type = 'POSTER',
      platform = 'FACEBOOK',
      groupListId,
      contentText,
      spintaxEnabled = true,
      mediaType = 'TEXT',
      mediaUrls = [],
      linkUrl,
      calibration,
      schedule,
      shuffleEnabled = true,
      maxAccounts = 3,
      accountIds,
      cooldownDays,
      skipCooldownCheck,
    } = req.body;

    if (!name || !contentText) return sendError(res, 'Nome e Conteúdo são obrigatórios', 400);
    if (!groupListId) return sendError(res, 'Lista de grupos é obrigatória', 400);

    let allGroups: any[] = db.prepare('SELECT * FROM groups WHERE list_id = ?').all(groupListId) as any[];
    if (allGroups.length === 0) return sendError(res, 'Lista de grupos vazia', 400);
    const selectedIdsBal: string[] | undefined = (req.body as any).selectedGroupIds;
    if (Array.isArray(selectedIdsBal) && selectedIdsBal.length > 0) {
      const set = new Set(selectedIdsBal.map((x: string) => String(x)));
      allGroups = allGroups.filter((g: any) => set.has(String(g.id)) || set.has(String(g.group_id)));
      if (allGroups.length === 0) return sendError(res, 'Nenhum dos grupos selecionados está na lista', 400);
    }
    // filtros balanceado: cooldown, privados e quarentena
    const effCooldown = Number(cooldownDays ?? DEFAULT_COOLDOWN_DAYS);
    const { skipPrivateCheck: skipPrivBal, skipQuarantineCheck: skipQuarBal } = req.body as any;
    let balancedQuarantined: any[] = [];
    let balancedPrivate: any[] = [];
    let balancedCooldownBlocked: any[] = [];
    if (!skipCooldownCheck && effCooldown > 0) {
      const filtered = filterGroupsByCooldown(allGroups, effCooldown);
      balancedCooldownBlocked = filtered.blocked;
      allGroups = filtered.allowed;
      if (allGroups.length === 0) return sendError(res, `Todos os grupos estão em cooldown de ${effCooldown} dias`, 400);
    }
    if (!skipPrivBal) {
      const { allowed, privateGroups } = filterPrivateGroups(allGroups);
      balancedPrivate = privateGroups;
      if (privateGroups.length > 0) allGroups = allowed;
      if (allGroups.length === 0 && privateGroups.length > 0) return sendError(res, `Todos os ${privateGroups.length} grupos são privados/fechados — ative "Incluir privados"`, 400);
    }
    if (!skipQuarBal) {
      const { allowed, quarantined } = filterQuarantinedGroups(allGroups);
      balancedQuarantined = quarantined;
      if (quarantined.length > 0) allGroups = allowed;
      if (allGroups.length === 0 && quarantined.length > 0) return sendError(res, `Todos os ${quarantined.length} grupos em quarentena (2+ falhas em 14 dias)`, 400);
    }
    if (allGroups.length === 0) return sendError(res, 'Nenhum grupo liberado após filtros', 400);

    const contentCheck = validateContent(contentText, Boolean(spintaxEnabled));
    if (!contentCheck.ok) console.warn('[balanced] risco alto:', contentCheck.warnings);

    // seleciona contas
    let candidateAccounts: any[] = [];
    if (Array.isArray(accountIds) && accountIds.length > 0) {
      candidateAccounts = accountIds
        .map((id: string) => db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any)
        .filter(Boolean)
        .filter((a: any) => a.platform === platform && a.status !== 'BLOCKED' && a.status !== 'NEEDS_LOGIN');
    } else {
      const allAccounts: any[] = db.prepare('SELECT * FROM accounts').all() as any[];
      const { getEffectiveLimits: getEff, getAllStates: getStates } = require('../core/antiBan');
      const states: any = getStates();
      candidateAccounts = allAccounts
        .filter((a: any) => a.platform === platform && a.status !== 'BLOCKED' && a.status !== 'NEEDS_LOGIN')
        .map((a: any) => {
          const eff = getEff(a);
          const s = states[a.id] || { postsThisHour: 0, remainingHour: eff.maxPostsPerHour };
          const remaining = s.remainingHour ?? eff.maxPostsPerHour - (s.postsThisHour || 0);
          return { acc: a, eff, remaining, trust: Number(a.trust_score || 0) };
        })
        .sort((x: any, y: any) => y.remaining - x.remaining || y.trust - x.trust)
        .slice(0, Math.max(1, Math.min(Number(maxAccounts) || 3, 5)))
        .map((x: any) => x.acc);
    }

    if (candidateAccounts.length === 0) return sendError(res, 'Nenhuma conta saudável disponível para este platform. Conecte contas em Configurações.', 400);

    // embaralha grupos
    const ordered = [...allGroups];
    if (shuffleEnabled !== false && ordered.length > 1) {
      for (let i = ordered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp: any = ordered[i];
        ordered[i] = ordered[j];
        ordered[j] = tmp;
      }
    }

    // round-robin weighted simples
    const buckets: any[][] = candidateAccounts.map(() => []);
    ordered.forEach((g: any, idx: number) => {
      buckets[idx % candidateAccounts.length].push(g);
    });

    // cria campanhas
    const createdIds: string[] = [];
    const { computeNextRun } = (() => {
      try { return require('../core/scheduler'); } catch { return { computeNextRun: () => null }; }
    })();

    for (let i = 0; i < candidateAccounts.length; i++) {
      const acc = candidateAccounts[i];
      const chunk = buckets[i];
      if (chunk.length === 0) continue;
      const cid = 'camp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 4);
      let scheduleJson: string | null = null;
      if (schedule && typeof schedule === 'object' && schedule.enabled) {
        const nextRun = computeNextRun(schedule, new Date());
        scheduleJson = JSON.stringify({ ...schedule, nextRun: nextRun || (schedule as any).nextRun || null });
      }
      db.prepare(`
        INSERT INTO campaigns (
          id, name, type, platform, account_id, group_list_id, 
          content_text, spintax_enabled, media_type, media_urls, 
          link_url, calibration_json, status, total_targets, schedule_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDLE', ?, ?)
      `).run(
        cid,
        candidateAccounts.length > 1 ? `${name} — ${acc.name} (${chunk.length} grupos)` : name,
        type,
        platform,
        acc.id,
        groupListId,
        contentText,
        spintaxEnabled ? 1 : 0,
        mediaType,
        JSON.stringify(mediaUrls),
        linkUrl || null,
        calibration ? JSON.stringify(calibration) : null,
        chunk.length,
        scheduleJson
      );
      const insertItem = db.prepare(`
        INSERT INTO campaign_items (id, campaign_id, group_id, group_name, group_url, status)
        VALUES (?, ?, ?, ?, ?, 'QUEUED')
      `);
      for (let k = 0; k < chunk.length; k++) {
        const g: any = chunk[k];
        insertItem.run(`item_${cid}_${k}`, cid, g.group_id, g.name, g.url);
      }
      createdIds.push(cid);
    }

    const created = createdIds.map((id) => db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id));
    return sendSuccess(res, { campaigns: created, distribution: candidateAccounts.map((a: any, i: number) => ({ accountId: a.id, name: a.name, trust_score: a.trust_score, groups: buckets[i].length })) }, `${created.length} campanha(s) criada(s) com distribuição inteligente entre ${candidateAccounts.length} conta(s)`, 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// Control endpoints
campaignsRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const result = await CampaignRunner.startCampaign(req.params.id);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

campaignsRouter.post('/:id/pause', (req: Request, res: Response) => {
  try {
    const result = CampaignRunner.pauseCampaign(req.params.id);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

campaignsRouter.post('/:id/resume', (req: Request, res: Response) => {
  try {
    const result = CampaignRunner.resumeCampaign(req.params.id);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

campaignsRouter.post('/:id/stop', (req: Request, res: Response) => {
  try {
    const result = CampaignRunner.stopCampaign(req.params.id);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

campaignsRouter.get('/:id/schedule', (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id) as any;
    if (!c) return sendError(res, 'Campanha não encontrada', 404);
    let schedule = null;
    try { schedule = c.schedule_json ? (typeof c.schedule_json === 'string' ? JSON.parse(c.schedule_json) : c.schedule_json) : null; } catch {}
    return sendSuccess(res, schedule);
  } catch (error: any) { return sendError(res, error.message); }
});

campaignsRouter.put('/:id/schedule', (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id) as any;
    if (!c) return sendError(res, 'Campanha não encontrada', 404);
    const { enabled, frequency = 'daily', time = '09:00', daysOfWeek = [1,2,3,4,5], intervalHours = 24, timezone = 'America/Sao_Paulo' } = req.body;
    const schedule: any = { enabled: !!enabled, frequency, time, daysOfWeek, intervalHours: Number(intervalHours) || 24, timezone };
    const { computeNextRun } = require('../core/scheduler');
    schedule.nextRun = schedule.enabled ? computeNextRun(schedule, new Date()) : null;
    schedule.lastRun = c.schedule_json ? (() => { try { return JSON.parse(typeof c.schedule_json === 'string' ? c.schedule_json : JSON.stringify(c.schedule_json)).lastRun || null; } catch { return null; } })() : null;
    db.prepare('UPDATE campaigns SET schedule_json = ? WHERE id = ?').run(JSON.stringify(schedule), req.params.id);
    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    return sendSuccess(res, updated, schedule.enabled ? `Agendamento ativado — próximo disparo ${schedule.nextRun ? new Date(schedule.nextRun).toLocaleString('pt-BR') : 'não calculado'}` : 'Agendamento desativado');
  } catch (error: any) { return sendError(res, error.message); }
});

campaignsRouter.delete('/:id/schedule', (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE campaigns SET schedule_json = ? WHERE id = ?').run(null, req.params.id);
    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    return sendSuccess(res, updated, 'Agendamento removido');
  } catch (error: any) { return sendError(res, error.message); }
});

// POST Shuffle fila (embaralha ordem dos itens QUEUED para quebrar padrão sequencial)
campaignsRouter.post('/:id/shuffle', (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id) as any;
    if (!c) return sendError(res, 'Campanha não encontrada', 404);
    if (c.status === 'RUNNING') return sendError(res, 'Pause a campanha antes de embaralhar', 400);
    const store: any = (db as any).getStore();
    const queued = store.campaign_items.filter((ci: any) => ci.campaign_id === req.params.id && ci.status === 'QUEUED');
    if (queued.length < 2) return sendError(res, 'Poucos itens na fila para embaralhar', 400);
    // Fisher-Yates
    for (let i = queued.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queued[i], queued[j]] = [queued[j], queued[i]];
    }
    // reconstrói ordem: mantém não-QUEUED na frente na ordem original, depois QUEUED embaralhados
    const others = store.campaign_items.filter((ci: any) => !(ci.campaign_id === req.params.id && ci.status === 'QUEUED'));
    const thisQueuedShuffled = queued;
    // reordena apenas desta campanha: others + shuffled
    // precisa manter other campaigns untouched — filtra só desta campanha
    const otherCampaigns = others.filter((ci: any) => ci.campaign_id !== req.params.id);
    const thisOthers = others.filter((ci: any) => ci.campaign_id === req.params.id && ci.status !== 'QUEUED');
    store.campaign_items = [...otherCampaigns, ...thisOthers, ...thisQueuedShuffled];
    // reordena global por created order not needed — save
    (db as any).save();
    return sendSuccess(res, { shuffled: queued.length }, `${queued.length} itens embaralhados`);
  } catch (error: any) { return sendError(res, error.message); }
});

// POST Retry falhas (volta FAILED para QUEUED)
campaignsRouter.post('/:id/retry-failed', (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id) as any;
    if (!c) return sendError(res, 'Campanha não encontrada', 404);
    const store: any = (db as any).getStore();
    let count = 0;
    for (const ci of store.campaign_items) {
      if (ci.campaign_id === req.params.id && ci.status === 'FAILED') {
        ci.status = 'QUEUED';
        ci.error_message = null;
        ci.post_id = null;
        ci.post_url = null;
        count++;
      }
    }
    if (count === 0) return sendError(res, 'Nenhuma falha para retentar', 400);
    // recalcula counters
    const items = store.campaign_items.filter((ci: any) => ci.campaign_id === req.params.id);
    const failed = items.filter((ci: any) => ci.status === 'FAILED').length;
    const successful = items.filter((ci: any) => ci.status === 'PUBLISHED').length;
    const pending = items.filter((ci: any) => ci.status === 'PENDING_APPROVAL').length;
    const completed = items.filter((ci: any) => ci.status !== 'QUEUED' && ci.status !== 'IN_PROGRESS').length;
    const progress = Math.round((completed / (items.length || 1)) * 100);
    const camp = store.campaigns.find((x: any) => x.id === req.params.id);
    if (camp) {
      camp.failed_posts = failed;
      camp.successful_posts = successful;
      camp.pending_posts = pending;
      camp.completed_targets = completed;
      camp.progress_percent = progress;
      if (camp.status === 'COMPLETED' && count > 0) camp.status = 'IDLE';
    }
    (db as any).save();
    return sendSuccess(res, { retried: count }, `${count} falhas voltaram para a fila`);
  } catch (error: any) { return sendError(res, error.message); }
});

// POST Item Result (usado pela extensão oficial para atualizar progresso em tempo real)
campaignsRouter.post('/:id/item-result', (req: Request, res: Response) => {
  try {
    const { itemId, status = 'PUBLISHED', error, postUrl } = req.body;
    const store: any = (db as any).getStore ? (db as any).getStore() : null;
    if (!store) return sendError(res, 'Banco não disponível', 500);

    const item = store.campaign_items.find((ci: any) => ci.id === itemId || ci.group_id === req.body.groupId);
    if (item) {
      item.status = status;
      item.error_message = error || null;
      item.post_url = postUrl || null;
      item.executed_at = new Date().toISOString();
    }

    const camp = store.campaigns.find((c: any) => c.id === req.params.id);
    if (camp) {
      const items = store.campaign_items.filter((ci: any) => ci.campaign_id === req.params.id);
      camp.successful_posts = items.filter((ci: any) => ci.status === 'PUBLISHED').length;
      camp.failed_posts = items.filter((ci: any) => ci.status === 'FAILED').length;
      camp.pending_posts = items.filter((ci: any) => ci.status === 'PENDING_APPROVAL').length;
      camp.completed_targets = items.filter((ci: any) => ci.status !== 'QUEUED' && ci.status !== 'IN_PROGRESS').length;
      camp.progress_percent = Math.round((camp.completed_targets / (items.length || 1)) * 100);
      if (camp.progress_percent >= 100) camp.status = 'COMPLETED';
    }

    (db as any).save?.();
    return sendSuccess(res, { ok: true, campaign: camp });
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

campaignsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    CampaignRunner.stopCampaign(req.params.id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    return sendSuccess(res, { deleted: true }, 'Campanha removida com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});
