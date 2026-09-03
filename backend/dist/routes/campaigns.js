"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../core/db");
const responseHandler_1 = require("../core/responseHandler");
const campaignRunner_1 = require("../services/campaignRunner");
const contentFilter_1 = require("../core/contentFilter");
const cooldown_1 = require("../core/cooldown");
const duplicateDetector_1 = require("../core/duplicateDetector");
exports.campaignsRouter = (0, express_1.Router)();
// GET all campaigns
exports.campaignsRouter.get('/', (req, res) => {
    try {
        const campaigns = db_1.db.prepare(`
      SELECT c.*, a.name as account_name, gl.name as group_list_name 
      FROM campaigns c
      LEFT JOIN accounts a ON c.account_id = a.id
      LEFT JOIN group_lists gl ON c.group_list_id = gl.id
      ORDER BY c.created_at DESC
    `).all();
        return (0, responseHandler_1.sendSuccess)(res, campaigns);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET campaign by ID
exports.campaignsRouter.get('/:id', (req, res) => {
    try {
        const campaign = db_1.db.prepare(`
      SELECT c.*, a.name as account_name, gl.name as group_list_name 
      FROM campaigns c
      LEFT JOIN accounts a ON c.account_id = a.id
      LEFT JOIN group_lists gl ON c.group_list_id = gl.id
      WHERE c.id = ?
    `).get(req.params.id);
        if (!campaign)
            return (0, responseHandler_1.sendError)(res, 'Campanha não encontrada', 404);
        return (0, responseHandler_1.sendSuccess)(res, campaign);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET campaign items
exports.campaignsRouter.get('/:id/items', (req, res) => {
    try {
        const items = db_1.db.prepare(`
      SELECT * FROM campaign_items 
      WHERE campaign_id = ? 
      ORDER BY rowid ASC
    `).all(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, items);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Validate content (anti-spam) — usado pelo frontend antes de criar
exports.campaignsRouter.post('/validate', (req, res) => {
    try {
        const { contentText, spintaxEnabled = true } = req.body;
        if (!contentText)
            return (0, responseHandler_1.sendError)(res, 'Conteúdo é obrigatório', 400);
        const result = (0, contentFilter_1.validateContent)(contentText, Boolean(spintaxEnabled));
        return (0, responseHandler_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Check duplicado entre campanhas (similaridade >85%)
exports.campaignsRouter.post('/duplicate-check', (req, res) => {
    try {
        const { contentText, threshold = 0.85 } = req.body;
        if (!contentText)
            return (0, responseHandler_1.sendError)(res, 'Conteúdo é obrigatório', 400);
        const hits = (0, duplicateDetector_1.findDuplicates)(contentText, Number(threshold) || 0.85, true);
        return (0, responseHandler_1.sendSuccess)(res, { hits, isDuplicate: hits.length > 0, threshold });
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Create new campaign
exports.campaignsRouter.post('/', (req, res) => {
    try {
        const { name, type = 'POSTER', platform = 'FACEBOOK', accountId, groupListId, contentText, spintaxEnabled = true, mediaType = 'TEXT', mediaUrls = [], linkUrl, calibration, schedule, cooldownDays, skipCooldownCheck, } = req.body;
        if (!name || !accountId || !contentText) {
            return (0, responseHandler_1.sendError)(res, 'Campos obrigatórios: Nome, Conta e Conteúdo', 400);
        }
        // validação anti-spam leve — não bloqueia, apenas registra aviso no log
        const contentCheck = (0, contentFilter_1.validateContent)(contentText, Boolean(spintaxEnabled));
        if (!contentCheck.ok) {
            console.warn('[anti-spam] Campanha com risco alto criada:', { name, risk: contentCheck.risk, warnings: contentCheck.warnings });
        }
        const campaignId = 'camp_' + Date.now();
        // Get groups from list (+ filtro selectedGroupIds para enviar só aos marcados)
        let groups = [];
        if (groupListId) {
            groups = db_1.db.prepare('SELECT * FROM groups WHERE list_id = ?').all(groupListId);
        }
        const selectedGroupIds = req.body.selectedGroupIds;
        if (Array.isArray(selectedGroupIds) && selectedGroupIds.length > 0) {
            const set = new Set(selectedGroupIds.map((x) => String(x)));
            groups = groups.filter((g) => set.has(String(g.id)) || set.has(String(g.group_id)));
            if (groups.length === 0)
                return (0, responseHandler_1.sendError)(res, 'Nenhum dos grupos selecionados está na lista', 400);
        }
        // Cooldown por grupo: evita repost < N dias no mesmo grupo
        let cooldownBlocked = [];
        const effectiveCooldown = Number(cooldownDays ?? cooldown_1.DEFAULT_COOLDOWN_DAYS);
        if (!skipCooldownCheck && effectiveCooldown > 0 && groups.length > 0) {
            const filtered = (0, cooldown_1.filterGroupsByCooldown)(groups, effectiveCooldown);
            cooldownBlocked = filtered.blocked;
            groups = filtered.allowed;
            if (groups.length === 0) {
                return (0, responseHandler_1.sendError)(res, `Todos os ${cooldownBlocked.length} grupos estão em cooldown de ${effectiveCooldown} dias. Aguarde ${Math.min(...cooldownBlocked.map((b) => b.remainingDays))} dia(s) ou desmarque "Respeitar cooldown" no modal.`, 400);
            }
        }
        // Filtro de criptomoedas: grupos privados/fechados e quarentena (2+ falhas em 14 dias)
        const { skipPrivateCheck, skipQuarantineCheck } = req.body;
        let privateSkipped = [];
        let quarantinedSkipped = [];
        if (!skipPrivateCheck && groups.length > 0) {
            const { allowed, privateGroups } = (0, cooldown_1.filterPrivateGroups)(groups);
            privateSkipped = privateGroups;
            if (privateGroups.length > 0)
                groups = allowed;
            if (groups.length === 0 && privateGroups.length > 0) {
                return (0, responseHandler_1.sendError)(res, `Todos os ${privateGroups.length} grupos são privados/fechados — ative "Incluir privados" no modal ou use lista pública`, 400);
            }
        }
        if (!skipQuarantineCheck && groups.length > 0) {
            const { allowed, quarantined } = (0, cooldown_1.filterQuarantinedGroups)(groups);
            quarantinedSkipped = quarantined;
            if (quarantined.length > 0)
                groups = allowed;
            if (groups.length === 0 && quarantined.length > 0) {
                return (0, responseHandler_1.sendError)(res, `Todos os ${quarantined.length} grupos estão em quarentena (2+ falhas em 14 dias). Limpe a quarentena em Estatísticas ou desmarque o filtro.`, 400);
            }
        }
        const totalTargets = groups.length;
        // schedule opcional (recorrência)
        let scheduleJson = null;
        if (schedule && typeof schedule === 'object') {
            const { computeNextRun } = require('../core/scheduler');
            const nextRun = schedule.enabled ? computeNextRun(schedule, new Date()) : null;
            const toSave = { ...schedule, nextRun: nextRun || schedule.nextRun || null };
            scheduleJson = JSON.stringify(toSave);
        }
        db_1.db.prepare(`
      INSERT INTO campaigns (
        id, name, type, platform, account_id, group_list_id, 
        content_text, spintax_enabled, media_type, media_urls, 
        link_url, calibration_json, status, total_targets, schedule_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDLE', ?, ?)
    `).run(campaignId, name, type, platform, accountId, groupListId || null, contentText, spintaxEnabled ? 1 : 0, mediaType, JSON.stringify(mediaUrls), linkUrl || null, calibration ? JSON.stringify(calibration) : null, totalTargets, scheduleJson);
        // Insert campaign items — embaralha por padrão para quebrar padrão sequencial
        const { shuffleEnabled = true } = req.body;
        const orderedGroups = [...groups];
        if (shuffleEnabled !== false && orderedGroups.length > 1) {
            for (let i = orderedGroups.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = orderedGroups[i];
                orderedGroups[i] = orderedGroups[j];
                orderedGroups[j] = tmp;
            }
        }
        const insertItem = db_1.db.prepare(`
      INSERT INTO campaign_items (id, campaign_id, group_id, group_name, group_url, status)
      VALUES (?, ?, ?, ?, ?, 'QUEUED')
    `);
        for (let i = 0; i < orderedGroups.length; i++) {
            const g = orderedGroups[i];
            insertItem.run(`item_${campaignId}_${i}`, campaignId, g.group_id, g.name, g.url);
        }
        const blockedInfo = cooldownBlocked.length > 0 ? ` · ${cooldownBlocked.length} grupo(s) em cooldown (${effectiveCooldown}d) ignorados` : '';
        const created = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
        const msg = 'Campanha criada com sucesso' + blockedInfo + (cooldownBlocked.length > 0 ? ` — ${cooldownBlocked.map((b) => `${b.group.name} (${b.remainingDays}d)`).slice(0, 3).join(', ')}${cooldownBlocked.length > 3 ? '...' : ''}` : '');
        return (0, responseHandler_1.sendSuccess)(res, { campaign: created, cooldownBlocked, cooldownDays: effectiveCooldown }, msg, 201);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET Cooldown check para lista (usado no modal antes de criar)
exports.campaignsRouter.get('/cooldown-check/:listId', (req, res) => {
    try {
        const days = Number(req.query.days ?? cooldown_1.DEFAULT_COOLDOWN_DAYS);
        const groups = db_1.db.prepare('SELECT * FROM groups WHERE list_id = ?').all(req.params.listId);
        const { allowed, blocked } = (0, cooldown_1.filterGroupsByCooldown)(groups, days);
        return (0, responseHandler_1.sendSuccess)(res, { total: groups.length, allowed: allowed.length, blocked: blocked.length, blockedDetails: blocked.slice(0, 10), days });
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Balanced create — distribui grupos automaticamente entre contas mais saudáveis
exports.campaignsRouter.post('/balanced', (req, res) => {
    try {
        const { name, type = 'POSTER', platform = 'FACEBOOK', groupListId, contentText, spintaxEnabled = true, mediaType = 'TEXT', mediaUrls = [], linkUrl, calibration, schedule, shuffleEnabled = true, maxAccounts = 3, accountIds, cooldownDays, skipCooldownCheck, } = req.body;
        if (!name || !contentText)
            return (0, responseHandler_1.sendError)(res, 'Nome e Conteúdo são obrigatórios', 400);
        if (!groupListId)
            return (0, responseHandler_1.sendError)(res, 'Lista de grupos é obrigatória', 400);
        let allGroups = db_1.db.prepare('SELECT * FROM groups WHERE list_id = ?').all(groupListId);
        if (allGroups.length === 0)
            return (0, responseHandler_1.sendError)(res, 'Lista de grupos vazia', 400);
        const selectedIdsBal = req.body.selectedGroupIds;
        if (Array.isArray(selectedIdsBal) && selectedIdsBal.length > 0) {
            const set = new Set(selectedIdsBal.map((x) => String(x)));
            allGroups = allGroups.filter((g) => set.has(String(g.id)) || set.has(String(g.group_id)));
            if (allGroups.length === 0)
                return (0, responseHandler_1.sendError)(res, 'Nenhum dos grupos selecionados está na lista', 400);
        }
        // filtros balanceado: cooldown, privados e quarentena
        const effCooldown = Number(cooldownDays ?? cooldown_1.DEFAULT_COOLDOWN_DAYS);
        const { skipPrivateCheck: skipPrivBal, skipQuarantineCheck: skipQuarBal } = req.body;
        let balancedQuarantined = [];
        let balancedPrivate = [];
        let balancedCooldownBlocked = [];
        if (!skipCooldownCheck && effCooldown > 0) {
            const filtered = (0, cooldown_1.filterGroupsByCooldown)(allGroups, effCooldown);
            balancedCooldownBlocked = filtered.blocked;
            allGroups = filtered.allowed;
            if (allGroups.length === 0)
                return (0, responseHandler_1.sendError)(res, `Todos os grupos estão em cooldown de ${effCooldown} dias`, 400);
        }
        if (!skipPrivBal) {
            const { allowed, privateGroups } = (0, cooldown_1.filterPrivateGroups)(allGroups);
            balancedPrivate = privateGroups;
            if (privateGroups.length > 0)
                allGroups = allowed;
            if (allGroups.length === 0 && privateGroups.length > 0)
                return (0, responseHandler_1.sendError)(res, `Todos os ${privateGroups.length} grupos são privados/fechados — ative "Incluir privados"`, 400);
        }
        if (!skipQuarBal) {
            const { allowed, quarantined } = (0, cooldown_1.filterQuarantinedGroups)(allGroups);
            balancedQuarantined = quarantined;
            if (quarantined.length > 0)
                allGroups = allowed;
            if (allGroups.length === 0 && quarantined.length > 0)
                return (0, responseHandler_1.sendError)(res, `Todos os ${quarantined.length} grupos em quarentena (2+ falhas em 14 dias)`, 400);
        }
        if (allGroups.length === 0)
            return (0, responseHandler_1.sendError)(res, 'Nenhum grupo liberado após filtros', 400);
        const contentCheck = (0, contentFilter_1.validateContent)(contentText, Boolean(spintaxEnabled));
        if (!contentCheck.ok)
            console.warn('[balanced] risco alto:', contentCheck.warnings);
        // seleciona contas
        let candidateAccounts = [];
        if (Array.isArray(accountIds) && accountIds.length > 0) {
            candidateAccounts = accountIds
                .map((id) => db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id))
                .filter(Boolean)
                .filter((a) => a.platform === platform && a.status !== 'BLOCKED' && a.status !== 'NEEDS_LOGIN');
        }
        else {
            const allAccounts = db_1.db.prepare('SELECT * FROM accounts').all();
            const { getEffectiveLimits: getEff, getAllStates: getStates } = require('../core/antiBan');
            const states = getStates();
            candidateAccounts = allAccounts
                .filter((a) => a.platform === platform && a.status !== 'BLOCKED' && a.status !== 'NEEDS_LOGIN')
                .map((a) => {
                const eff = getEff(a);
                const s = states[a.id] || { postsThisHour: 0, remainingHour: eff.maxPostsPerHour };
                const remaining = s.remainingHour ?? eff.maxPostsPerHour - (s.postsThisHour || 0);
                return { acc: a, eff, remaining, trust: Number(a.trust_score || 0) };
            })
                .sort((x, y) => y.remaining - x.remaining || y.trust - x.trust)
                .slice(0, Math.max(1, Math.min(Number(maxAccounts) || 3, 5)))
                .map((x) => x.acc);
        }
        if (candidateAccounts.length === 0)
            return (0, responseHandler_1.sendError)(res, 'Nenhuma conta saudável disponível para este platform. Conecte contas em Configurações.', 400);
        // embaralha grupos
        const ordered = [...allGroups];
        if (shuffleEnabled !== false && ordered.length > 1) {
            for (let i = ordered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = ordered[i];
                ordered[i] = ordered[j];
                ordered[j] = tmp;
            }
        }
        // round-robin weighted simples
        const buckets = candidateAccounts.map(() => []);
        ordered.forEach((g, idx) => {
            buckets[idx % candidateAccounts.length].push(g);
        });
        // cria campanhas
        const createdIds = [];
        const { computeNextRun } = (() => {
            try {
                return require('../core/scheduler');
            }
            catch {
                return { computeNextRun: () => null };
            }
        })();
        for (let i = 0; i < candidateAccounts.length; i++) {
            const acc = candidateAccounts[i];
            const chunk = buckets[i];
            if (chunk.length === 0)
                continue;
            const cid = 'camp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 4);
            let scheduleJson = null;
            if (schedule && typeof schedule === 'object' && schedule.enabled) {
                const nextRun = computeNextRun(schedule, new Date());
                scheduleJson = JSON.stringify({ ...schedule, nextRun: nextRun || schedule.nextRun || null });
            }
            db_1.db.prepare(`
        INSERT INTO campaigns (
          id, name, type, platform, account_id, group_list_id, 
          content_text, spintax_enabled, media_type, media_urls, 
          link_url, calibration_json, status, total_targets, schedule_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDLE', ?, ?)
      `).run(cid, candidateAccounts.length > 1 ? `${name} — ${acc.name} (${chunk.length} grupos)` : name, type, platform, acc.id, groupListId, contentText, spintaxEnabled ? 1 : 0, mediaType, JSON.stringify(mediaUrls), linkUrl || null, calibration ? JSON.stringify(calibration) : null, chunk.length, scheduleJson);
            const insertItem = db_1.db.prepare(`
        INSERT INTO campaign_items (id, campaign_id, group_id, group_name, group_url, status)
        VALUES (?, ?, ?, ?, ?, 'QUEUED')
      `);
            for (let k = 0; k < chunk.length; k++) {
                const g = chunk[k];
                insertItem.run(`item_${cid}_${k}`, cid, g.group_id, g.name, g.url);
            }
            createdIds.push(cid);
        }
        const created = createdIds.map((id) => db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id));
        return (0, responseHandler_1.sendSuccess)(res, { campaigns: created, distribution: candidateAccounts.map((a, i) => ({ accountId: a.id, name: a.name, trust_score: a.trust_score, groups: buckets[i].length })) }, `${created.length} campanha(s) criada(s) com distribuição inteligente entre ${candidateAccounts.length} conta(s)`, 201);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// Control endpoints
exports.campaignsRouter.post('/:id/start', async (req, res) => {
    try {
        const result = await campaignRunner_1.CampaignRunner.startCampaign(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
exports.campaignsRouter.post('/:id/pause', (req, res) => {
    try {
        const result = campaignRunner_1.CampaignRunner.pauseCampaign(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
exports.campaignsRouter.post('/:id/resume', (req, res) => {
    try {
        const result = campaignRunner_1.CampaignRunner.resumeCampaign(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
exports.campaignsRouter.post('/:id/stop', (req, res) => {
    try {
        const result = campaignRunner_1.CampaignRunner.stopCampaign(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
exports.campaignsRouter.get('/:id/schedule', (req, res) => {
    try {
        const c = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        if (!c)
            return (0, responseHandler_1.sendError)(res, 'Campanha não encontrada', 404);
        let schedule = null;
        try {
            schedule = c.schedule_json ? (typeof c.schedule_json === 'string' ? JSON.parse(c.schedule_json) : c.schedule_json) : null;
        }
        catch { }
        return (0, responseHandler_1.sendSuccess)(res, schedule);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
exports.campaignsRouter.put('/:id/schedule', (req, res) => {
    try {
        const c = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        if (!c)
            return (0, responseHandler_1.sendError)(res, 'Campanha não encontrada', 404);
        const { enabled, frequency = 'daily', time = '09:00', daysOfWeek = [1, 2, 3, 4, 5], intervalHours = 24, timezone = 'America/Sao_Paulo' } = req.body;
        const schedule = { enabled: !!enabled, frequency, time, daysOfWeek, intervalHours: Number(intervalHours) || 24, timezone };
        const { computeNextRun } = require('../core/scheduler');
        schedule.nextRun = schedule.enabled ? computeNextRun(schedule, new Date()) : null;
        schedule.lastRun = c.schedule_json ? (() => { try {
            return JSON.parse(typeof c.schedule_json === 'string' ? c.schedule_json : JSON.stringify(c.schedule_json)).lastRun || null;
        }
        catch {
            return null;
        } })() : null;
        db_1.db.prepare('UPDATE campaigns SET schedule_json = ? WHERE id = ?').run(JSON.stringify(schedule), req.params.id);
        const updated = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, updated, schedule.enabled ? `Agendamento ativado — próximo disparo ${schedule.nextRun ? new Date(schedule.nextRun).toLocaleString('pt-BR') : 'não calculado'}` : 'Agendamento desativado');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
exports.campaignsRouter.delete('/:id/schedule', (req, res) => {
    try {
        db_1.db.prepare('UPDATE campaigns SET schedule_json = ? WHERE id = ?').run(null, req.params.id);
        const updated = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, updated, 'Agendamento removido');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Shuffle fila (embaralha ordem dos itens QUEUED para quebrar padrão sequencial)
exports.campaignsRouter.post('/:id/shuffle', (req, res) => {
    try {
        const c = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        if (!c)
            return (0, responseHandler_1.sendError)(res, 'Campanha não encontrada', 404);
        if (c.status === 'RUNNING')
            return (0, responseHandler_1.sendError)(res, 'Pause a campanha antes de embaralhar', 400);
        const store = db_1.db.getStore();
        const queued = store.campaign_items.filter((ci) => ci.campaign_id === req.params.id && ci.status === 'QUEUED');
        if (queued.length < 2)
            return (0, responseHandler_1.sendError)(res, 'Poucos itens na fila para embaralhar', 400);
        // Fisher-Yates
        for (let i = queued.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queued[i], queued[j]] = [queued[j], queued[i]];
        }
        // reconstrói ordem: mantém não-QUEUED na frente na ordem original, depois QUEUED embaralhados
        const others = store.campaign_items.filter((ci) => !(ci.campaign_id === req.params.id && ci.status === 'QUEUED'));
        const thisQueuedShuffled = queued;
        // reordena apenas desta campanha: others + shuffled
        // precisa manter other campaigns untouched — filtra só desta campanha
        const otherCampaigns = others.filter((ci) => ci.campaign_id !== req.params.id);
        const thisOthers = others.filter((ci) => ci.campaign_id === req.params.id && ci.status !== 'QUEUED');
        store.campaign_items = [...otherCampaigns, ...thisOthers, ...thisQueuedShuffled];
        // reordena global por created order not needed — save
        db_1.db.save();
        return (0, responseHandler_1.sendSuccess)(res, { shuffled: queued.length }, `${queued.length} itens embaralhados`);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Retry falhas (volta FAILED para QUEUED)
exports.campaignsRouter.post('/:id/retry-failed', (req, res) => {
    try {
        const c = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
        if (!c)
            return (0, responseHandler_1.sendError)(res, 'Campanha não encontrada', 404);
        const store = db_1.db.getStore();
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
        if (count === 0)
            return (0, responseHandler_1.sendError)(res, 'Nenhuma falha para retentar', 400);
        // recalcula counters
        const items = store.campaign_items.filter((ci) => ci.campaign_id === req.params.id);
        const failed = items.filter((ci) => ci.status === 'FAILED').length;
        const successful = items.filter((ci) => ci.status === 'PUBLISHED').length;
        const pending = items.filter((ci) => ci.status === 'PENDING_APPROVAL').length;
        const completed = items.filter((ci) => ci.status !== 'QUEUED' && ci.status !== 'IN_PROGRESS').length;
        const progress = Math.round((completed / (items.length || 1)) * 100);
        const camp = store.campaigns.find((x) => x.id === req.params.id);
        if (camp) {
            camp.failed_posts = failed;
            camp.successful_posts = successful;
            camp.pending_posts = pending;
            camp.completed_targets = completed;
            camp.progress_percent = progress;
            if (camp.status === 'COMPLETED' && count > 0)
                camp.status = 'IDLE';
        }
        db_1.db.save();
        return (0, responseHandler_1.sendSuccess)(res, { retried: count }, `${count} falhas voltaram para a fila`);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Item Result (usado pela extensão oficial para atualizar progresso em tempo real)
exports.campaignsRouter.post('/:id/item-result', (req, res) => {
    try {
        const { itemId, status = 'PUBLISHED', error, postUrl } = req.body;
        const store = db_1.db.getStore ? db_1.db.getStore() : null;
        if (!store)
            return (0, responseHandler_1.sendError)(res, 'Banco não disponível', 500);
        const item = store.campaign_items.find((ci) => ci.id === itemId || ci.group_id === req.body.groupId);
        if (item) {
            item.status = status;
            item.error_message = error || null;
            item.post_url = postUrl || null;
            item.executed_at = new Date().toISOString();
        }
        const camp = store.campaigns.find((c) => c.id === req.params.id);
        if (camp) {
            const items = store.campaign_items.filter((ci) => ci.campaign_id === req.params.id);
            camp.successful_posts = items.filter((ci) => ci.status === 'PUBLISHED').length;
            camp.failed_posts = items.filter((ci) => ci.status === 'FAILED').length;
            camp.pending_posts = items.filter((ci) => ci.status === 'PENDING_APPROVAL').length;
            camp.completed_targets = items.filter((ci) => ci.status !== 'QUEUED' && ci.status !== 'IN_PROGRESS').length;
            camp.progress_percent = Math.round((camp.completed_targets / (items.length || 1)) * 100);
            if (camp.progress_percent >= 100)
                camp.status = 'COMPLETED';
        }
        db_1.db.save?.();
        return (0, responseHandler_1.sendSuccess)(res, { ok: true, campaign: camp });
    }
    catch (err) {
        return (0, responseHandler_1.sendError)(res, err.message);
    }
});
exports.campaignsRouter.delete('/:id', (req, res) => {
    try {
        campaignRunner_1.CampaignRunner.stopCampaign(req.params.id);
        db_1.db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, { deleted: true }, 'Campanha removida com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
