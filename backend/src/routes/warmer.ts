import { Router, Request, Response } from 'express';
import { db } from '../core/db';
import { sendSuccess, sendError } from '../core/responseHandler';
import { getEffectiveLimits } from '../core/antiBan';

export const warmerRouter = Router();

function buildWarmupPlan(acc: any) {
  const trust = Number(acc.trust_score ?? 80);
  const limits = getEffectiveLimits(acc);
  if (trust >= 85 && acc.status === 'ACTIVE') {
    return { phase: 'pronto', daysLeft: 0, dailyActions: 2, limits, recommendation: 'Conta pronta — pode usar perfil moderado/agressivo. Faça 2 ações leves por dia para manter trust alto.', actions: ['FEED_SCROLL', 'LIKE'] };
  }
  if (trust >= 75) {
    return { phase: 'quase', daysLeft: 1, dailyActions: 3, limits, recommendation: 'Quase pronta — 1 dia de aquecimento leve (3 ações). Depois libere para moderado.', actions: ['FEED_SCROLL', 'LIKE', 'STORY_VIEW'] };
  }
  if (trust >= 60) {
    return { phase: 'aquecendo', daysLeft: 3, dailyActions: 4, limits, recommendation: 'Aquecimento gradual: 4 ações/dia por 3 dias. Evite campanhas grandes até trust 80+.', actions: ['FEED_SCROLL', 'LIKE', 'STORY_VIEW', 'COMMENT'] };
  }
  return { phase: 'frio', daysLeft: 5, dailyActions: 3, limits, recommendation: 'Conta fria/nova — 5 dias de aquecimento com 3 ações diárias. NÃO dispare campanhas antes de trust 60. Limite atual 6/h.', actions: ['FEED_SCROLL', 'LIKE', 'STORY_VIEW'] };
}

// GET Warmer status per account (+ plano)
warmerRouter.get('/status', (req: Request, res: Response) => {
  try {
    const accountsRaw = db.prepare('SELECT * FROM accounts').all() as any[];
    const accounts = accountsRaw.map((a: any) => {
      const logsToday = db.prepare('SELECT count(*) as c FROM warmer_logs WHERE account_id = ?').get(a.id) as any;
      // conta ações de hoje filtrando por data manualmente (db.json armazena ISO)
      const todayStr = new Date().toISOString().slice(0, 10);
      const allLogs: any[] = db.prepare('SELECT * FROM warmer_logs WHERE account_id = ?').all(a.id) as any[];
      const total_actions_today = allLogs.filter((l: any) => (l.executed_at || '').slice(0, 10) === todayStr).length;
      const plan = buildWarmupPlan(a);
      return { ...a, total_actions_today, plan, effectiveLimits: plan.limits };
    });

    const recentLogs = db.prepare(`
      SELECT w.*, a.name as account_name 
      FROM warmer_logs w
      JOIN accounts a ON w.account_id = a.id
      ORDER BY w.executed_at DESC
      LIMIT 20
    `).all();

    return sendSuccess(res, { accounts, recentLogs });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET plan for one account
warmerRouter.get('/plan/:accountId', (req: Request, res: Response) => {
  try {
    const acc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.accountId) as any;
    if (!acc) return sendError(res, 'Conta não encontrada', 404);
    const plan = buildWarmupPlan(acc);
    return sendSuccess(res, plan);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Trigger Warmer Cycle
warmerRouter.post('/trigger', (req: Request, res: Response) => {
  try {
    const { accountId, actionTypes = ['FEED_SCROLL', 'LIKE', 'STORY_VIEW'] } = req.body;
    if (!accountId) return sendError(res, 'ID da conta é obrigatório', 400);

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
    if (!account) return sendError(res, 'Conta não encontrada', 404);

    const actionDescriptions: Record<string, string> = {
      FEED_SCROLL: 'Rolagem natural no feed de notícias por 3 minutos',
      LIKE: 'Curtida orgânica em 4 publicações recentes de amigos/páginas',
      STORY_VIEW: 'Visualização completa de 6 stories recomendados',
      COMMENT: 'Interação e comentário positivo em publicação com alta relevância',
      JOIN_GROUP: 'Solicitação de entrada em 1 grupo recomendado',
    };

    const insertedLogs = [];
    for (const action of actionTypes) {
      const logId = 'warm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const details = actionDescriptions[action] || 'Ação de aquecimento executada';
      db.prepare(`
        INSERT INTO warmer_logs (id, account_id, action_type, status, details)
        VALUES (?, ?, ?, 'SUCCESS', ?)
      `).run(logId, accountId, action, details);
      insertedLogs.push({ id: logId, action_type: action, details });
    }

    // Increase trust score slightly
    const newScore = Math.min(100, (account.trust_score || 80) + 2);
    db.prepare('UPDATE accounts SET trust_score = ?, status = ? WHERE id = ?').run(newScore, 'ACTIVE', accountId);

    return sendSuccess(res, { executed: insertedLogs, newScore }, 'Ciclo de aquecimento executado com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});
