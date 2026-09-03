import axios from 'axios';
import { db } from '../core/db';

export interface NotificationSettings {
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  whatsappEnabled: boolean;
  whatsappWebhookUrl: string;
  notifyOnCompleted: boolean;
  notifyOnBlock: boolean;
}

export class NotificationService {
  static getSettings(): NotificationSettings {
    const store = db.getStore();
    return (
      store.settings?.notifications || {
        telegramEnabled: false,
        telegramBotToken: '',
        telegramChatId: '',
        whatsappEnabled: false,
        whatsappWebhookUrl: '',
        notifyOnCompleted: true,
        notifyOnBlock: true,
      }
    );
  }

  static saveSettings(settings: NotificationSettings) {
    const store = db.getStore();
    if (!store.settings) store.settings = {};
    store.settings.notifications = settings;
    db.save();
    return settings;
  }

  static async sendTelegram(message: string): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: settings.telegramChatId,
        text: `🤖 *Pulso Social PRO*\n\n${message}`,
        parse_mode: 'Markdown',
      });
      return true;
    } catch (err: any) {
      console.error('Error sending Telegram notification:', err?.response?.data || err.message);
      return false;
    }
  }

  static async sendWhatsApp(message: string): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.whatsappEnabled || !settings.whatsappWebhookUrl) {
      return false;
    }

    try {
      await axios.post(settings.whatsappWebhookUrl, {
        app: 'Pulso Social PRO',
        message,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (err: any) {
      console.error('Error sending WhatsApp webhook notification:', err.message);
      return false;
    }
  }

  static async broadcast(title: string, details: string) {
    const msg = `📢 *${title}*\n${details}\n\n⏰ _${new Date().toLocaleString('pt-BR')}_`;
    await Promise.allSettled([this.sendTelegram(msg), this.sendWhatsApp(msg)]);
  }
}
