"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignRunner = void 0;
const db_1 = require("../core/db");
const spintax_1 = require("../core/spintax");
const calibrator_1 = require("../core/calibrator");
const browserAutomation_1 = require("./browserAutomation");
const notificationService_1 = require("./notificationService");
const antiBan_1 = require("../core/antiBan");
const ipLimiter_1 = require("../core/ipLimiter");
const contentVariator_1 = require("../core/contentVariator");
const deliveryCheck_1 = require("../core/deliveryCheck");
// Active running timers per campaign id
const activeCampaigns = new Map();
class CampaignRunner {
    static resumeAllRunningCampaigns() {
        try {
            const running = db_1.db.prepare(`SELECT id FROM campaigns WHERE status = 'RUNNING'`).all();
            for (const c of running) {
                if (!activeCampaigns.has(c.id)) {
                    activeCampaigns.set(c.id, { timer: null, isPaused: false, isCancelled: false });
                    setTimeout(() => {
                        CampaignRunner.processNextItem(c.id);
                    }, 3000);
                }
            }
        }
        catch (e) {
            console.error('[CampaignRunner] Erro ao retomar campanhas no boot:', e);
        }
    }
    static async startCampaign(campaignId) {
        const campaign = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
        if (!campaign)
            throw new Error('Campanha não encontrada');
        if (campaign.status === 'RUNNING') {
            if (!activeCampaigns.has(campaignId)) {
                activeCampaigns.set(campaignId, { timer: null, isPaused: false, isCancelled: false });
                this.processNextItem(campaignId);
                return { message: 'Campanha retomada com sucesso' };
            }
            return { message: 'Campanha já está em execução' };
        }
        // Campanhas do Facebook precisam de uma conta sincronizada; em modo demo, usamos uma conta interna para permitir testes locais.
        let account = db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get(campaign.account_id);
        const isDemoAccount = campaign.account_id === 'acc_demo_fb' || campaign.account_id === 'acc_demo' || campaign.account_id === 'acc_default';
        if (!account && isDemoAccount) {
            db_1.db.prepare(`
        INSERT INTO accounts (id, platform, name, identifier, cookies, session_data, proxy, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('acc_demo_fb', 'FACEBOOK', 'Conta Demo', 'demo_fb_user', 'c_user=100000000000000; xs=demo_xs;', null, null, null);
            account = db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get('acc_demo_fb');
        }
        if (!account) {
            throw new Error('Nenhuma conta real foi selecionada para esta campanha. Conecte uma conta do Facebook em Contas.');
        }
        const cookieStr = String(account.cookies || '');
        const cookiesOk = cookieStr.length > 200 && cookieStr.includes('c_user') && cookieStr.includes('xs');
        const isDemoCookie = /^c_user=100000000000000;?\s*xs=demo_xs;?/i.test(cookieStr) || cookieStr.includes('demo_xs');
        if (campaign.platform === 'FACEBOOK' && !cookiesOk && !isDemoCookie) {
            throw new Error('A conta selecionada não tem uma sessão real do Facebook sincronizada. Faça login no Chrome e sincronize c_user e xs pela extensão antes de iniciar.');
        }
        if (!campaign.total_targets || campaign.total_targets === 0) {
            // Se a campanha não tiver targets, garante que tem pelo menos 1 grupo
            const itemsCount = db_1.db.prepare('SELECT count(*) as count FROM campaign_items WHERE campaign_id = ?').get(campaignId)?.count || 0;
            if (itemsCount > 0) {
                db_1.db.prepare('UPDATE campaigns SET total_targets = ? WHERE id = ?').run(itemsCount, campaignId);
            }
        }
        // Checagem rápida de risco alto (não bloqueia, apenas registra)
        try {
            const { validateContent } = require('../core/contentFilter');
            const chk = validateContent(campaign.content_text || '', !!campaign.spintax_enabled);
            if (chk.risk === 'alto') {
                console.warn('[campaign start] Conteúdo com risco ALTO', { campaignId, score: chk.score, warnings: chk.warnings });
            }
        }
        catch { }
        // Set status to RUNNING
        db_1.db.prepare(`
      UPDATE campaigns 
      SET status = 'RUNNING', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `).run(campaignId);
        activeCampaigns.set(campaignId, { timer: null, isPaused: false, isCancelled: false });
        // Launch async processor
        this.processNextItem(campaignId);
        return { message: 'Campanha iniciada com sucesso' };
    }
    static pauseCampaign(campaignId) {
        const active = activeCampaigns.get(campaignId);
        if (active) {
            active.isPaused = true;
            if (active.timer)
                clearTimeout(active.timer);
        }
        db_1.db.prepare(`UPDATE campaigns SET status = 'PAUSED' WHERE id = ?`).run(campaignId);
        return { message: 'Campanha pausada' };
    }
    static resumeCampaign(campaignId) {
        const active = activeCampaigns.get(campaignId);
        if (active) {
            active.isPaused = false;
        }
        else {
            activeCampaigns.set(campaignId, { timer: null, isPaused: false, isCancelled: false });
        }
        db_1.db.prepare(`UPDATE campaigns SET status = 'RUNNING' WHERE id = ?`).run(campaignId);
        this.processNextItem(campaignId);
        return { message: 'Campanha retomada' };
    }
    static triggerNextImmediate(campaignId) {
        const active = activeCampaigns.get(campaignId);
        if (active) {
            if (active.timer)
                clearTimeout(active.timer);
            active.isPaused = false;
            active.isCancelled = false;
        }
        else {
            activeCampaigns.set(campaignId, { timer: null, isPaused: false, isCancelled: false });
        }
        db_1.db.prepare(`UPDATE campaigns SET status = 'RUNNING' WHERE id = ?`).run(campaignId);
        this.processNextItem(campaignId);
        return { message: 'Próximo grupo disparado imediatamente' };
    }
    static stopCampaign(campaignId) {
        const active = activeCampaigns.get(campaignId);
        if (active) {
            active.isCancelled = true;
            if (active.timer)
                clearTimeout(active.timer);
            activeCampaigns.delete(campaignId);
        }
        db_1.db.prepare(`
      UPDATE campaigns 
      SET status = 'CANCELLED', finished_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(campaignId);
        return { message: 'Campanha interrompida' };
    }
    static async processNextItem(campaignId) {
        const active = activeCampaigns.get(campaignId);
        if (!active || active.isCancelled || active.isPaused)
            return;
        const campaign = db_1.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
        if (!campaign || campaign.status !== 'RUNNING')
            return;
        // Get next QUEUED item
        const item = db_1.db.prepare(`
      SELECT * FROM campaign_items 
      WHERE campaign_id = ? AND status = 'QUEUED' 
      ORDER BY rowid ASC 
      LIMIT 1
    `).get(campaignId);
        if (!item) {
            // All items completed
            db_1.db.prepare(`
        UPDATE campaigns 
        SET status = 'COMPLETED', finished_at = CURRENT_TIMESTAMP, progress_percent = 100
        WHERE id = ?
      `).run(campaignId);
            activeCampaigns.delete(campaignId);
            // Send completion notification
            notificationService_1.NotificationService.broadcast('Campanha Concluída!', `A campanha *${campaign.name}* finalizou com sucesso o disparo para todos os grupos cadastrados.`);
            return;
        }
        // Mark item IN_PROGRESS + guarda nome do alvo no progresso
        try {
            db_1.db.prepare(`
        UPDATE campaign_items 
        SET status = 'IN_PROGRESS' 
        WHERE id = ?
      `).run(item.id);
        }
        catch { }
        try {
            db_1.db.prepare(`
        UPDATE campaigns 
        SET current_target_name = ? 
        WHERE id = ?
      `).run(item.group_name, campaignId);
        }
        catch { }
        // Anti-ban: limites dinâmicos por conta via trust_score/status
        const accountForAnti = db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get(campaign.account_id);
        const effectiveLimits = (0, antiBan_1.getEffectiveLimits)(accountForAnti);
        const antiCheck = (0, antiBan_1.canPostNow)(campaign.account_id, effectiveLimits);
        if (!antiCheck.allowed) {
            db_1.db.prepare(`UPDATE campaign_items SET status = 'QUEUED' WHERE id = ?`).run(item.id);
            const waitMs = 60 * 1000;
            try {
                db_1.db.prepare('UPDATE campaigns SET current_target_name = ? WHERE id = ?').run(`Pausa Anti-Ban: aguardando 60s antes do próximo grupo`, campaignId);
            }
            catch { }
            if (active.timer)
                clearTimeout(active.timer);
            active.timer = setTimeout(() => {
                const still = activeCampaigns.get(campaignId);
                if (still && !still.isCancelled && !still.isPaused) {
                    CampaignRunner.processNextItem(campaignId);
                }
            }, waitMs);
            return;
        }
        // Limite por IP/proxy compartilhado
        const ipCheck = (0, ipLimiter_1.canPostByIp)(accountForAnti);
        if (!ipCheck.allowed) {
            db_1.db.prepare(`UPDATE campaign_items SET status = 'QUEUED' WHERE id = ?`).run(item.id);
            const waitMs = 60 * 1000;
            try {
                db_1.db.prepare('UPDATE campaigns SET current_target_name = ? WHERE id = ?').run(`Pausa IP: aguardando 60s antes do próximo grupo`, campaignId);
            }
            catch { }
            if (active.timer)
                clearTimeout(active.timer);
            active.timer = setTimeout(() => {
                const still = activeCampaigns.get(campaignId);
                if (still && !still.isCancelled && !still.isPaused) {
                    CampaignRunner.processNextItem(campaignId);
                }
            }, waitMs);
            return;
        }
        // Parse calibration settings (deve vir antes da rotação de contas que usa calibSettings)
        let calibSettings = {};
        try {
            if (campaign.calibration_json) {
                calibSettings = JSON.parse(campaign.calibration_json);
            }
        }
        catch { }
        let finalText = '';
        // Rotação automática de contas dentro da mesma campanha (se habilitado na calibragem)
        let effectiveAccountId = campaign.account_id;
        let effectiveAccount = accountForAnti;
        try {
            const rotateCfg = calibSettings?.rotatePool || calibSettings?.rotate;
            const shouldRotate = rotateCfg?.enabled;
            if (shouldRotate) {
                const poolSize = Math.max(2, Math.min(5, Number(rotateCfg.maxAccounts) || 3));
                const allAccounts = db_1.db.prepare('SELECT * FROM accounts').all();
                const { getEffectiveLimits: getEff2, getAllStates: getStates2, canPostNow: canNow2 } = await Promise.resolve().then(() => __importStar(require('../core/antiBan')));
                const { canPostByIp: canIp2 } = await Promise.resolve().then(() => __importStar(require('../core/ipLimiter')));
                const states2 = getStates2();
                const candidates = allAccounts
                    .filter((a) => a.platform === campaign.platform && a.status !== 'BLOCKED' && a.status !== 'NEEDS_LOGIN')
                    .map((a) => {
                    const eff = getEff2(a);
                    const s = states2[a.id] || { postsThisHour: 0 };
                    const remaining = (eff.maxPostsPerHour - (s.postsThisHour || 0));
                    const canAcc = canNow2(a.id, eff);
                    const canIp = canIp2(a);
                    const ok = canAcc.allowed && canIp.allowed;
                    return { acc: a, eff, remaining, ok, trust: Number(a.trust_score || 0) };
                })
                    .filter((x) => x.ok)
                    .sort((x, y) => y.remaining - x.remaining || y.trust - x.trust)
                    .slice(0, poolSize);
                if (candidates.length > 0) {
                    // escolhe a com mais folga; se houver empate, round-robin por índice do item
                    const idx = (Number(item.id.split('_').pop()) || 0) % candidates.length;
                    const chosen = candidates[idx] || candidates[0];
                    effectiveAccountId = chosen.acc.id;
                    effectiveAccount = chosen.acc;
                }
            }
        }
        catch { }
        // Parse Spintax + variação automática de hashtags/links (quebra fingerprint)
        finalText = campaign.spintax_enabled ? (0, spintax_1.parseSpintax)(campaign.content_text) : campaign.content_text;
        finalText = (0, contentVariator_1.varyHashtagsAndLinks)(finalText);
        // Horário seguro: se fora da janela, agenda para o próximo horário permitido
        if ((0, calibrator_1.isOutsideSafeWindow)(calibSettings)) {
            const waitMs = (0, calibrator_1.msUntilSafeWindow)(calibSettings);
            db_1.db.prepare(`UPDATE campaign_items SET status = 'QUEUED' WHERE id = ?`).run(item.id);
            if (active.timer)
                clearTimeout(active.timer);
            notificationService_1.NotificationService.broadcast('Janela segura ativa ⏰', `Campanha *${campaign.name}* pausada até ${String(calibSettings.safeWindowStartHour ?? 8).padStart(2, '0')}:00 — fora do horário seguro (${calibSettings.safeWindowStartHour ?? 8}h–${calibSettings.safeWindowEndHour ?? 22}h). Retomada automática agendada.`);
            active.timer = setTimeout(() => {
                const still = activeCampaigns.get(campaignId);
                if (still && !still.isCancelled) {
                    this.processNextItem(campaignId);
                }
            }, Math.min(waitMs, 24 * 60 * 60 * 1000));
            return;
        }
        // Comportamento humano: typing + scroll + micro-pausa + possível engajamento leve
        const { typingDelayMs, scrollDurationMs, microPauseMs, shouldDoRandomEngagement, randomEngagementActions, humanJitterSeconds } = await Promise.resolve().then(() => __importStar(require('../core/humanBehavior')));
        const behaviorExtraMs = typingDelayMs(finalText) + scrollDurationMs() + microPauseMs() + (shouldDoRandomEngagement() ? 2500 : 0);
        if (shouldDoRandomEngagement() && accountForAnti) {
            try {
                const actions = randomEngagementActions();
                for (const act of actions) {
                    const logId = 'warm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 4);
                    db_1.db.prepare('INSERT INTO warmer_logs (id, account_id, action_type, status, details) VALUES (?, ?, ?, ?, ?)').run(logId, accountForAnti.id, act, 'SUCCESS', `Comportamento humano pré-post em ${item.group_name}`);
                }
            }
            catch { }
        }
        const delay = (0, calibrator_1.calculateNextDelay)(calibSettings) + behaviorExtraMs / 1000 + humanJitterSeconds();
        // Execute post via automation service
        let mediaUrls = [];
        try {
            if (campaign.media_urls) {
                mediaUrls = JSON.parse(campaign.media_urls);
            }
        }
        catch { }
        const postResult = await browserAutomation_1.BrowserAutomationService.publishPost({
            platform: campaign.platform,
            accountId: effectiveAccountId,
            groupId: item.group_id,
            groupName: item.group_name,
            text: finalText,
            mediaType: campaign.media_type,
            mediaUrls,
        });
        // Anti-ban: registra resultado para rate limit / detecção + IP (conta efetiva se houve rotação)
        (0, antiBan_1.recordPostResult)(effectiveAccountId, postResult.success);
        (0, ipLimiter_1.recordIpPost)(effectiveAccount);
        const isCheckpoint = !postResult.success && postResult.error ? browserAutomation_1.BrowserAutomationService.isCheckpointError(postResult.error) : false;
        const isBlock = !postResult.success && postResult.error ? (0, antiBan_1.detectMetaBlock)(postResult.error) : false;
        if (isCheckpoint) {
            db_1.db.prepare(`
        UPDATE campaign_items 
        SET status = ?, post_id = ?, post_url = ?, error_message = ?, posted_text = ?, execution_delay_seconds = ?, executed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('FAILED', postResult.postId || null, postResult.postUrl || null, postResult.error || null, finalText, delay, item.id);
            // checkpoint/captcha exige ação manual — muda status da conta
            try {
                const acc = db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get(campaign.account_id);
                if (acc)
                    db_1.db.prepare(`UPDATE accounts SET status = 'NEEDS_LOGIN' WHERE id = ?`).run(campaign.account_id);
            }
            catch { }
            db_1.db.prepare(`UPDATE campaigns SET status = 'PAUSED' WHERE id = ?`).run(campaignId);
            active.isPaused = true;
            if (active.timer)
                clearTimeout(active.timer);
            notificationService_1.NotificationService.broadcast('Checkpoint/Captcha detectado 🔒', `Meta pediu verificação humana em *${campaign.name}* (${item.group_name}): "${postResult.error}". Conta pausada e marcada como "Precisa login". Acesse o Facebook/Instagram manualmente, resolva o captcha/checkpoint e renove os cookies em Configurações > Contas.`);
            // não reagenda automaticamente — requer ação humana
            return;
        }
        if (isBlock) {
            // bloqueio detectado -> pausa longa de segurança
            db_1.db.prepare(`
        UPDATE campaign_items 
        SET status = ?, post_id = ?, post_url = ?, error_message = ?, posted_text = ?, execution_delay_seconds = ?, executed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('FAILED', postResult.postId || null, postResult.postUrl || null, postResult.error || null, finalText, delay, item.id);
            db_1.db.prepare(`UPDATE campaigns SET status = 'PAUSED' WHERE id = ?`).run(campaignId);
            active.isPaused = true;
            if (active.timer)
                clearTimeout(active.timer);
            notificationService_1.NotificationService.broadcast('Bloqueio detectado 🛑', `Meta retornou bloqueio em *${campaign.name}* (${item.group_name}): "${postResult.error}". Campanha pausada automaticamente por 60 min. Verifique a conta em Configurações > Contas.`);
            active.timer = setTimeout(() => {
                const still = activeCampaigns.get(campaignId);
                if (still) {
                    still.isPaused = false;
                    db_1.db.prepare(`UPDATE campaigns SET status = 'RUNNING' WHERE id = ?`).run(campaignId);
                    CampaignRunner.processNextItem(campaignId);
                }
            }, 60 * 60 * 1000);
            return;
        }
        // Se a falha for genérica/temporária, não marca a campanha como pausada; apenas registra erro e continua
        // Isso evita que uma sessão expirada, permissão negada ou problema transitório "pause" a automação inteira.
        // Update item in database
        db_1.db.prepare(`
      UPDATE campaign_items 
      SET status = ?, post_id = ?, post_url = ?, error_message = ?, posted_text = ?, execution_delay_seconds = ?, executed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(postResult.status, postResult.postId || null, postResult.postUrl || null, postResult.error || null, finalText, delay, item.id);
        // Verificação de entrega assíncrona (shadowban/moderação) 60-90s após PUBLISHED
        if (postResult.status === 'PUBLISHED' && postResult.postUrl) {
            const capturedUrl = postResult.postUrl;
            const capturedText = finalText;
            const capturedItemId = item.id;
            const capturedGroup = item.group_name;
            const capturedCampaign = campaign.name;
            setTimeout(async () => {
                try {
                    const result = await (0, deliveryCheck_1.checkDelivery)(capturedUrl, capturedText, item.group_id);
                    (0, deliveryCheck_1.logDeliveryCheck)(capturedItemId, result);
                    if (result.shadowbanned) {
                        notificationService_1.NotificationService.broadcast('Possível shadowban detectado 👁️', `Post em *${capturedCampaign}* (${capturedGroup}) pode estar oculto: "${result.reason}". Verifique manualmente no grupo.`);
                    }
                }
                catch (e) {
                    console.error('[deliveryCheck] erro', e);
                }
            }, 60000 + Math.floor(Math.random() * 30000));
        }
        // Update campaign counters — com fallback se stats vier nulo
        const rawStats = db_1.db.prepare(`
      SELECT 
        count(*) as total,
        sum(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as successful,
        sum(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) as pending,
        sum(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        sum(CASE WHEN status != 'QUEUED' AND status != 'IN_PROGRESS' THEN 1 ELSE 0 END) as completed
      FROM campaign_items 
      WHERE campaign_id = ?
    `).get(campaignId);
        const stats = rawStats || { total: 0, successful: 0, pending: 0, failed: 0, completed: 0 };
        const progress = Math.round(((stats.completed || 0) / ((stats.total) || 1)) * 100);
        db_1.db.prepare(`
      UPDATE campaigns 
      SET 
        completed_targets = ?,
        successful_posts = ?,
        pending_posts = ?,
        failed_posts = ?,
        progress_percent = ?
      WHERE id = ?
    `).run(stats.completed, stats.successful, stats.pending, stats.failed, progress, campaignId);
        // Se campanha tem stopOnBlock e falhou, pode pausar conforme calibragem
        if (!postResult.success && calibSettings.stopOnBlock) {
            // não pausa definitivo agora, apenas registra — o anti-ban já cuida de 3 falhas seguidas
        }
        // Schedule next post com delay humanizado REAL (sem cap de 5s que anulava o anti-ban)
        const completedCount = stats.completed;
        let waitMs = delay * 1000;
        if ((0, calibrator_1.shouldTakeLongPause)(completedCount, calibSettings)) {
            const longPauseSec = (0, calibrator_1.getLongPauseDuration)(calibSettings);
            waitMs += longPauseSec * 1000;
        }
        const waitSec = Math.round(waitMs / 1000);
        const nextMsg = waitSec > 90
            ? `Pausa de segurança Anti-Ban (~${Math.round(waitSec / 60)} min) antes do próximo envio`
            : `Intervalo seguro: enviando próximo grupo em ~${waitSec}s`;
        try {
            db_1.db.prepare('UPDATE campaigns SET current_target_name = ? WHERE id = ?').run(nextMsg, campaignId);
        }
        catch { }
        active.timer = setTimeout(() => {
            this.processNextItem(campaignId);
        }, waitMs);
    }
}
exports.CampaignRunner = CampaignRunner;
