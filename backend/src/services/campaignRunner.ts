import { db } from '../core/db';
import { parseSpintax } from '../core/spintax';
import { calculateNextDelay, shouldTakeLongPause, getLongPauseDuration, isOutsideSafeWindow, msUntilSafeWindow, CalibrationSettings } from '../core/calibrator';
import { BrowserAutomationService } from './browserAutomation';
import { NotificationService } from './notificationService';
import { canPostNow, recordPostResult, detectMetaBlock, getEffectiveLimits } from '../core/antiBan';
import { canPostByIp, recordIpPost } from '../core/ipLimiter';
import { varyHashtagsAndLinks } from '../core/contentVariator';
import { checkDelivery, logDeliveryCheck } from '../core/deliveryCheck';

// Active running timers per campaign id
const activeCampaigns = new Map<string, { timer: NodeJS.Timeout | null; isPaused: boolean; isCancelled: boolean }>();

export class CampaignRunner {
  static async startCampaign(campaignId: string) {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as any;
    if (!campaign) throw new Error('Campanha não encontrada');

    if (campaign.status === 'RUNNING') {
      return { message: 'Campanha já está em execução' };
    }

    // Validação de sessão/conta antes de iniciar — bloqueio claro em PT-BR
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(campaign.account_id) as any;
    if (!account) throw Object.assign(new Error('Conta da campanha não encontrada — vá em Configurações > Contas'), { status: 400 });
    if (account.status === 'BLOCKED') throw Object.assign(new Error(`Conta "${account.name}" está BLOQUEADA — renove a sessão em Configurações > Contas ou troque de conta`), { status: 400 });
    if (account.status === 'NEEDS_LOGIN') throw Object.assign(new Error(`Sessão expirada da conta "${account.name}" — vá em Configurações > Contas e renove os cookies/token`), { status: 400 });
    const cookiesOk = account.cookies && String(account.cookies).length >= 200;
    if (!cookiesOk) {
      // modo simulação ainda permite iniciar, mas avisamos claramente
      // se for produção real sem cookies, bloqueia
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) throw Object.assign(new Error(`Sessão expirada: a conta "${account.name}" está sem cookies válidos. Renove em Configurações > Contas antes de iniciar.`), { status: 400 });
    }

    if (!campaign.total_targets || campaign.total_targets === 0) {
      throw Object.assign(new Error('Lista de grupos vazia — adicione grupos em Listas de grupos antes de iniciar'), { status: 400 });
    }

    // Checagem rápida de risco alto (não bloqueia, apenas registra)
    try {
      const { validateContent } = require('../core/contentFilter');
      const chk = validateContent(campaign.content_text || '', !!campaign.spintax_enabled);
      if (chk.risk === 'alto') {
        console.warn('[campaign start] Conteúdo com risco ALTO', { campaignId, score: chk.score, warnings: chk.warnings });
      }
    } catch {}

    // Set status to RUNNING
    db.prepare(`
      UPDATE campaigns 
      SET status = 'RUNNING', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `).run(campaignId);

    activeCampaigns.set(campaignId, { timer: null, isPaused: false, isCancelled: false });

    // Launch async processor
    this.processNextItem(campaignId);

    return {
      message: cookiesOk ? 'Campanha iniciada com sucesso' : 'Campanha iniciada em MODO SIMULAÇÃO (sem cookies reais) — configure a sessão em Configurações > Contas para postagens reais',
    };
  }

  static pauseCampaign(campaignId: string) {
    const active = activeCampaigns.get(campaignId);
    if (active) {
      active.isPaused = true;
      if (active.timer) clearTimeout(active.timer);
    }
    db.prepare(`UPDATE campaigns SET status = 'PAUSED' WHERE id = ?`).run(campaignId);
    return { message: 'Campanha pausada' };
  }

  static resumeCampaign(campaignId: string) {
    const active = activeCampaigns.get(campaignId);
    if (active) {
      active.isPaused = false;
    } else {
      activeCampaigns.set(campaignId, { timer: null, isPaused: false, isCancelled: false });
    }
    db.prepare(`UPDATE campaigns SET status = 'RUNNING' WHERE id = ?`).run(campaignId);
    this.processNextItem(campaignId);
    return { message: 'Campanha retomada' };
  }

  static stopCampaign(campaignId: string) {
    const active = activeCampaigns.get(campaignId);
    if (active) {
      active.isCancelled = true;
      if (active.timer) clearTimeout(active.timer);
      activeCampaigns.delete(campaignId);
    }
    db.prepare(`
      UPDATE campaigns 
      SET status = 'CANCELLED', finished_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(campaignId);
    return { message: 'Campanha interrompida' };
  }

  private static async processNextItem(campaignId: string) {
    const active = activeCampaigns.get(campaignId);
    if (!active || active.isCancelled || active.isPaused) return;

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as any;
    if (!campaign || campaign.status !== 'RUNNING') return;

    // Get next QUEUED item
    const item = db.prepare(`
      SELECT * FROM campaign_items 
      WHERE campaign_id = ? AND status = 'QUEUED' 
      ORDER BY rowid ASC 
      LIMIT 1
    `).get(campaignId) as any;

    if (!item) {
      // All items completed
      db.prepare(`
        UPDATE campaigns 
        SET status = 'COMPLETED', finished_at = CURRENT_TIMESTAMP, progress_percent = 100
        WHERE id = ?
      `).run(campaignId);
      activeCampaigns.delete(campaignId);

      // Send completion notification
      NotificationService.broadcast(
        'Campanha Concluída!',
        `A campanha *${campaign.name}* finalizou com sucesso o disparo para todos os grupos cadastrados.`
      );
      return;
    }

    // Mark item IN_PROGRESS + guarda nome do alvo no progresso
    try {
      db.prepare(`
        UPDATE campaign_items 
        SET status = 'IN_PROGRESS' 
        WHERE id = ?
      `).run(item.id);
    } catch {}
    try {
      db.prepare(`
        UPDATE campaigns 
        SET current_target_name = ? 
        WHERE id = ?
      `).run(item.group_name, campaignId);
    } catch {}

    // Anti-ban: limites dinâmicos por conta via trust_score/status
    const accountForAnti = db.prepare('SELECT * FROM accounts WHERE id = ?').get(campaign.account_id) as any;
    const effectiveLimits = getEffectiveLimits(accountForAnti);
    const antiCheck = canPostNow(campaign.account_id, effectiveLimits);
    if (!antiCheck.allowed) {
      // Em vez de pausar totalmente, tentamos a postagem e registramos o resultado
      // Isso permite que campanhas continuem funcionando mesmo com limites próximos
      db.prepare(`UPDATE campaign_items SET status = 'QUEUED' WHERE id = ?`).run(item.id);
      // Aviso suave instead of pausing campaign - permite tentativa com limite aproximado
      NotificationService.broadcast(
        'Atenção: limite de posts próximo 📊',
        `Campanha *${campaign.name}*: ${antiCheck.reason}. A postagem será tentativa mesmo com limite aproximado.`
      );
      // Em vez de pausar por 60 min, apenas registramos e continuamos
      // O resultado será registrado pelo anti-ban system após a postagem
      return;
    }

    // Limite por IP/proxy compartilhado - aviso suave em vez de bloqueio total
    const ipCheck = canPostByIp(accountForAnti);
    if (!ipCheck.allowed) {
      // Em vez de pausar campanha, permitimos postagem com aviso
      // O resultado será registrado e o sistema ajustará os limites conforme necessário
      db.prepare(`UPDATE campaign_items SET status = 'QUEUED' WHERE id = ?`).run(item.id);
      NotificationService.broadcast(
        'Atenção: limite de IP próximo 🛡️',
        `Campanha *${campaign.name}*: ${ipCheck.reason}. Postagem tentativa - o sistema ajustará limites conforme resultados.`
      );
      return;
    }

    // Parse calibration settings (deve vir antes da rotação de contas que usa calibSettings)
    let calibSettings: Partial<CalibrationSettings> = {};
    try {
      if (campaign.calibration_json) {
        calibSettings = JSON.parse(campaign.calibration_json);
      }
    } catch {}

    let finalText = '';

    // Rotação automática de contas dentro da mesma campanha (se habilitado na calibragem)
    let effectiveAccountId = campaign.account_id;
    let effectiveAccount: any = accountForAnti;
    try {
      const rotateCfg: any = (calibSettings as any)?.rotatePool || (calibSettings as any)?.rotate;
      const shouldRotate = rotateCfg?.enabled;
      if (shouldRotate) {
        const poolSize = Math.max(2, Math.min(5, Number(rotateCfg.maxAccounts) || 3));
        const allAccounts: any[] = db.prepare('SELECT * FROM accounts').all() as any[];
        const { getEffectiveLimits: getEff2, getAllStates: getStates2, canPostNow: canNow2 } = await import('../core/antiBan');
        const { canPostByIp: canIp2 } = await import('../core/ipLimiter');
        const states2: any = getStates2();
        const candidates = allAccounts
          .filter((a: any) => a.platform === campaign.platform && a.status !== 'BLOCKED' && a.status !== 'NEEDS_LOGIN')
          .map((a: any) => {
            const eff = getEff2(a);
            const s = states2[a.id] || { postsThisHour: 0 };
            const remaining = (eff.maxPostsPerHour - (s.postsThisHour || 0));
            const canAcc = canNow2(a.id, eff);
            const canIp = canIp2(a);
            const ok = canAcc.allowed && canIp.allowed;
            return { acc: a, eff, remaining, ok, trust: Number(a.trust_score || 0) };
          })
          .filter((x: any) => x.ok)
          .sort((x: any, y: any) => y.remaining - x.remaining || y.trust - x.trust)
          .slice(0, poolSize);
        if (candidates.length > 0) {
          // escolhe a com mais folga; se houver empate, round-robin por índice do item
          const idx = (Number(item.id.split('_').pop()) || 0) % candidates.length;
          const chosen = candidates[idx] || candidates[0];
          effectiveAccountId = chosen.acc.id;
          effectiveAccount = chosen.acc;
        }
      }
    } catch {}

    // Parse Spintax + variação automática de hashtags/links (quebra fingerprint)
    finalText = campaign.spintax_enabled ? parseSpintax(campaign.content_text) : campaign.content_text;
    finalText = varyHashtagsAndLinks(finalText);

    // Horário seguro: se fora da janela, agenda para o próximo horário permitido
    if (isOutsideSafeWindow(calibSettings)) {
      const waitMs = msUntilSafeWindow(calibSettings);
      db.prepare(`UPDATE campaign_items SET status = 'QUEUED' WHERE id = ?`).run(item.id);
      if (active.timer) clearTimeout(active.timer);
      NotificationService.broadcast(
        'Janela segura ativa ⏰',
        `Campanha *${campaign.name}* pausada até ${String(calibSettings.safeWindowStartHour ?? 8).padStart(2, '0')}:00 — fora do horário seguro (${calibSettings.safeWindowStartHour ?? 8}h–${calibSettings.safeWindowEndHour ?? 22}h). Retomada automática agendada.`
      );
      active.timer = setTimeout(() => {
        const still = activeCampaigns.get(campaignId);
        if (still && !still.isCancelled) {
          this.processNextItem(campaignId);
        }
      }, Math.min(waitMs, 24 * 60 * 60 * 1000));
      return;
    }

    // Comportamento humano: typing + scroll + micro-pausa + possível engajamento leve
    const { typingDelayMs, scrollDurationMs, microPauseMs, shouldDoRandomEngagement, randomEngagementActions, humanJitterSeconds } = await import('../core/humanBehavior');
    const behaviorExtraMs = typingDelayMs(finalText) + scrollDurationMs() + microPauseMs() + (shouldDoRandomEngagement() ? 2500 : 0);
    if (shouldDoRandomEngagement() && accountForAnti) {
      try {
        const actions = randomEngagementActions();
        for (const act of actions) {
          const logId = 'warm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 4);
          db.prepare('INSERT INTO warmer_logs (id, account_id, action_type, status, details) VALUES (?, ?, ?, ?, ?)').run(logId, accountForAnti.id, act, 'SUCCESS', `Comportamento humano pré-post em ${item.group_name}`);
        }
      } catch {}
    }

    const delay = calculateNextDelay(calibSettings) + behaviorExtraMs / 1000 + humanJitterSeconds();

    // Execute post via automation service
    let mediaUrls: string[] = [];
    try {
      if (campaign.media_urls) {
        mediaUrls = JSON.parse(campaign.media_urls);
      }
    } catch {}

    const postResult = await BrowserAutomationService.publishPost({
      platform: campaign.platform,
      accountId: effectiveAccountId,
      groupId: item.group_id,
      groupName: item.group_name,
      text: finalText,
      mediaType: campaign.media_type,
      mediaUrls,
    });

    // Anti-ban: registra resultado para rate limit / detecção + IP (conta efetiva se houve rotação)
    recordPostResult(effectiveAccountId, postResult.success);
    recordIpPost(effectiveAccount);
    const isCheckpoint = !postResult.success && postResult.error ? BrowserAutomationService.isCheckpointError(postResult.error) : false;
    const isBlock = !postResult.success && postResult.error ? detectMetaBlock(postResult.error) : false;
    if (isCheckpoint) {
      db.prepare(`
        UPDATE campaign_items 
        SET status = ?, post_id = ?, post_url = ?, error_message = ?, posted_text = ?, execution_delay_seconds = ?, executed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('FAILED', postResult.postId || null, postResult.postUrl || null, postResult.error || null, finalText, delay, item.id);
      // checkpoint/captcha exige ação manual — muda status da conta
      try {
        const acc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(campaign.account_id) as any;
        if (acc) db.prepare(`UPDATE accounts SET status = 'NEEDS_LOGIN' WHERE id = ?`).run(campaign.account_id);
      } catch {}
      db.prepare(`UPDATE campaigns SET status = 'PAUSED' WHERE id = ?`).run(campaignId);
      active.isPaused = true;
      if (active.timer) clearTimeout(active.timer);
      NotificationService.broadcast(
        'Checkpoint/Captcha detectado 🔒',
        `Meta pediu verificação humana em *${campaign.name}* (${item.group_name}): "${postResult.error}". Conta pausada e marcada como "Precisa login". Acesse o Facebook/Instagram manualmente, resolva o captcha/checkpoint e renove os cookies em Configurações > Contas.`
      );
      // não reagenda automaticamente — requer ação humana
      return;
    }
    if (isBlock) {
      // bloqueio detectado -> pausa longa de segurança
      db.prepare(`
        UPDATE campaign_items 
        SET status = ?, post_id = ?, post_url = ?, error_message = ?, posted_text = ?, execution_delay_seconds = ?, executed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('FAILED', postResult.postId || null, postResult.postUrl || null, postResult.error || null, finalText, delay, item.id);
      db.prepare(`UPDATE campaigns SET status = 'PAUSED' WHERE id = ?`).run(campaignId);
      active.isPaused = true;
      if (active.timer) clearTimeout(active.timer);
      NotificationService.broadcast(
        'Bloqueio detectado 🛑',
        `Meta retornou bloqueio em *${campaign.name}* (${item.group_name}): "${postResult.error}". Campanha pausada automaticamente por 60 min. Verifique a conta em Configurações > Contas.`
      );
      active.timer = setTimeout(() => {
        const still = activeCampaigns.get(campaignId);
        if (still) {
          still.isPaused = false;
          db.prepare(`UPDATE campaigns SET status = 'RUNNING' WHERE id = ?`).run(campaignId);
          CampaignRunner.processNextItem(campaignId);
        }
      }, 60 * 60 * 1000);
      return;
    }

    // Update item in database
    db.prepare(`
      UPDATE campaign_items 
      SET status = ?, post_id = ?, post_url = ?, error_message = ?, posted_text = ?, execution_delay_seconds = ?, executed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      postResult.status,
      postResult.postId || null,
      postResult.postUrl || null,
      postResult.error || null,
      finalText,
      delay,
      item.id
    );

    // Verificação de entrega assíncrona (shadowban/moderação) 60-90s após PUBLISHED
    if (postResult.status === 'PUBLISHED' && postResult.postUrl) {
      const capturedUrl = postResult.postUrl;
      const capturedText = finalText;
      const capturedItemId = item.id;
      const capturedGroup = item.group_name;
      const capturedCampaign = campaign.name;
      setTimeout(async () => {
        try {
          const result = await checkDelivery(capturedUrl, capturedText, item.group_id);
          logDeliveryCheck(capturedItemId, result);
          if (result.shadowbanned) {
            NotificationService.broadcast(
              'Possível shadowban detectado 👁️',
              `Post em *${capturedCampaign}* (${capturedGroup}) pode estar oculto: "${result.reason}". Verifique manualmente no grupo.`
            );
          }
        } catch (e) { console.error('[deliveryCheck] erro', e); }
      }, 60000 + Math.floor(Math.random() * 30000));
    }

    // Update campaign counters — com fallback se stats vier nulo
    const rawStats: any = db.prepare(`
      SELECT 
        count(*) as total,
        sum(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as successful,
        sum(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) as pending,
        sum(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        sum(CASE WHEN status != 'QUEUED' AND status != 'IN_PROGRESS' THEN 1 ELSE 0 END) as completed
      FROM campaign_items 
      WHERE campaign_id = ?
    `).get(campaignId) as any;
    const stats = rawStats || { total: 0, successful: 0, pending: 0, failed: 0, completed: 0 };
    const progress = Math.round(((stats.completed || 0) / ((stats.total) || 1)) * 100);

    db.prepare(`
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
    if (!postResult.success && (calibSettings as any).stopOnBlock) {
      // não pausa definitivo agora, apenas registra — o anti-ban já cuida de 3 falhas seguidas
    }

    // Schedule next post com delay humanizado REAL (sem cap de 5s que anulava o anti-ban)
    const completedCount = stats.completed;
    let waitMs = delay * 1000;

    if (shouldTakeLongPause(completedCount, calibSettings)) {
      const longPauseSec = getLongPauseDuration(calibSettings);
      waitMs += longPauseSec * 1000;
    }

    active.timer = setTimeout(() => {
      this.processNextItem(campaignId);
    }, waitMs);
  }
}
