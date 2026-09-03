import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { sendSuccess, sendError } from '../core/responseHandler';

export const notificationsRouter = Router();

// GET Notification settings
notificationsRouter.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = NotificationService.getSettings();
    return sendSuccess(res, settings);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Save notification settings
notificationsRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const saved = NotificationService.saveSettings(req.body);
    return sendSuccess(res, saved, 'Configurações de notificação salvas com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Test notification
notificationsRouter.post('/test', async (req: Request, res: Response) => {
  try {
    await NotificationService.broadcast('Teste de Conexão', 'As notificações do Pulso Social PRO estão configuradas e ativas com sucesso! 🚀');
    return sendSuccess(res, { sent: true }, 'Mensagem de teste disparada com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});
