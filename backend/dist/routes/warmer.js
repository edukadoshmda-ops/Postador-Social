"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmerRouter = void 0;
const express_1 = require("express");
const db_1 = require("../core/db");
const responseHandler_1 = require("../core/responseHandler");
const antiBan_1 = require("../core/antiBan");
exports.warmerRouter = (0, express_1.Router)();
function buildWarmupPlan(acc) {
    const trust = Number(acc.trust_score ?? 80);
    const limits = (0, antiBan_1.getEffectiveLimits)(acc);
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
exports.warmerRouter.get('/status', (req, res) => {
    try {
        const accountsRaw = db_1.db.prepare('SELECT * FROM accounts').all();
        const accounts = accountsRaw.map((a) => {
            const logsToday = db_1.db.prepare('SELECT count(*) as c FROM warmer_logs WHERE account_id = ?').get(a.id);
            // conta ações de hoje filtrando por data manualmente (db.json armazena ISO)
            const todayStr = new Date().toISOString().slice(0, 10);
            const allLogs = db_1.db.prepare('SELECT * FROM warmer_logs WHERE account_id = ?').all(a.id);
            const total_actions_today = allLogs.filter((l) => (l.executed_at || '').slice(0, 10) === todayStr).length;
            const plan = buildWarmupPlan(a);
            return { ...a, total_actions_today, plan, effectiveLimits: plan.limits };
        });
        const recentLogs = db_1.db.prepare(`
      SELECT w.*, a.name as account_name 
      FROM warmer_logs w
      JOIN accounts a ON w.account_id = a.id
      ORDER BY w.executed_at DESC
      LIMIT 20
    `).all();
        return (0, responseHandler_1.sendSuccess)(res, { accounts, recentLogs });
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET plan for one account
exports.warmerRouter.get('/plan/:accountId', (req, res) => {
    try {
        const acc = db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.accountId);
        if (!acc)
            return (0, responseHandler_1.sendError)(res, 'Conta não encontrada', 404);
        const plan = buildWarmupPlan(acc);
        return (0, responseHandler_1.sendSuccess)(res, plan);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Trigger Warmer Cycle
exports.warmerRouter.post('/trigger', (req, res) => {
    try {
        const { accountId, actionTypes = ['FEED_SCROLL', 'LIKE', 'STORY_VIEW'] } = req.body;
        if (!accountId)
            return (0, responseHandler_1.sendError)(res, 'ID da conta é obrigatório', 400);
        const account = db_1.db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
        if (!account)
            return (0, responseHandler_1.sendError)(res, 'Conta não encontrada', 404);
        const actionDescriptions = {
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
            db_1.db.prepare(`
        INSERT INTO warmer_logs (id, account_id, action_type, status, details)
        VALUES (?, ?, ?, 'SUCCESS', ?)
      `).run(logId, accountId, action, details);
            insertedLogs.push({ id: logId, action_type: action, details });
        }
        // Increase trust score slightly
        const newScore = Math.min(100, (account.trust_score || 80) + 2);
        db_1.db.prepare('UPDATE accounts SET trust_score = ?, status = ? WHERE id = ?').run(newScore, 'ACTIVE', accountId);
        return (0, responseHandler_1.sendSuccess)(res, { executed: insertedLogs, newScore }, 'Ciclo de aquecimento executado com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
