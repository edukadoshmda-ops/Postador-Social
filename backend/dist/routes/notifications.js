"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const notificationService_1 = require("../services/notificationService");
const responseHandler_1 = require("../core/responseHandler");
exports.notificationsRouter = (0, express_1.Router)();
// GET Notification settings
exports.notificationsRouter.get('/settings', (req, res) => {
    try {
        const settings = notificationService_1.NotificationService.getSettings();
        return (0, responseHandler_1.sendSuccess)(res, settings);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Save notification settings
exports.notificationsRouter.post('/settings', (req, res) => {
    try {
        const saved = notificationService_1.NotificationService.saveSettings(req.body);
        return (0, responseHandler_1.sendSuccess)(res, saved, 'Configurações de notificação salvas com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Test notification
exports.notificationsRouter.post('/test', async (req, res) => {
    try {
        await notificationService_1.NotificationService.broadcast('Teste de Conexão', 'As notificações do Pulso Social PRO estão configuradas e ativas com sucesso! 🚀');
        return (0, responseHandler_1.sendSuccess)(res, { sent: true }, 'Mensagem de teste disparada com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
