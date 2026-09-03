"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../core/db");
class NotificationService {
    static getSettings() {
        const store = db_1.db.getStore();
        return (store.settings?.notifications || {
            telegramEnabled: false,
            telegramBotToken: '',
            telegramChatId: '',
            whatsappEnabled: false,
            whatsappWebhookUrl: '',
            notifyOnCompleted: true,
            notifyOnBlock: true,
        });
    }
    static saveSettings(settings) {
        const store = db_1.db.getStore();
        if (!store.settings)
            store.settings = {};
        store.settings.notifications = settings;
        db_1.db.save();
        return settings;
    }
    static async sendTelegram(message) {
        const settings = this.getSettings();
        if (!settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
            return false;
        }
        try {
            const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
            await axios_1.default.post(url, {
                chat_id: settings.telegramChatId,
                text: `🤖 *Pulso Social PRO*\n\n${message}`,
                parse_mode: 'Markdown',
            });
            return true;
        }
        catch (err) {
            console.error('Error sending Telegram notification:', err?.response?.data || err.message);
            return false;
        }
    }
    static async sendWhatsApp(message) {
        const settings = this.getSettings();
        if (!settings.whatsappEnabled || !settings.whatsappWebhookUrl) {
            return false;
        }
        try {
            await axios_1.default.post(settings.whatsappWebhookUrl, {
                app: 'Pulso Social PRO',
                message,
                timestamp: new Date().toISOString(),
            });
            return true;
        }
        catch (err) {
            console.error('Error sending WhatsApp webhook notification:', err.message);
            return false;
        }
    }
    static async broadcast(title, details) {
        const msg = `📢 *${title}*\n${details}\n\n⏰ _${new Date().toLocaleString('pt-BR')}_`;
        await Promise.allSettled([this.sendTelegram(msg), this.sendWhatsApp(msg)]);
    }
}
exports.NotificationService = NotificationService;
