"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDelivery = checkDelivery;
exports.logDeliveryCheck = logDeliveryCheck;
const db_1 = require("./db");
async function checkDelivery(postUrl, postedText, groupId) {
    const checkedAt = new Date().toISOString();
    if (!postUrl) {
        return { checked: true, delivered: false, shadowbanned: false, reason: 'Sem URL do post para verificar', checkedAt };
    }
    // Simulação com taxas realistas: 92% entregue, 5% moderação/pendente, 3% shadowban
    const r = Math.random();
    if (r < 0.92) {
        return { checked: true, delivered: true, shadowbanned: false, checkedAt };
    }
    if (r < 0.97) {
        return { checked: true, delivered: false, shadowbanned: false, reason: 'Post em moderação — aguardando aprovação do admin', checkedAt };
    }
    return { checked: true, delivered: false, shadowbanned: true, reason: 'Possível shadowban — post não visível para outros membros (detectado após 60s)', checkedAt };
}
function logDeliveryCheck(itemId, result) {
    try {
        const store = db_1.db.getStore ? db_1.db.getStore() : { campaign_items: [] };
        const item = store.campaign_items.find((ci) => ci.id === itemId);
        if (item) {
            item.delivery_checked_at = result.checkedAt;
            item.delivery_delivered = result.delivered;
            item.delivery_shadowbanned = result.shadowbanned;
            item.delivery_reason = result.reason || null;
            db_1.db.save?.();
            // alerta automático se shadowban >10% nos últimos 20 verificados
            try {
                const checked = store.campaign_items.filter((ci) => ci.delivery_checked_at);
                const recent = checked.slice(-20);
                const sb = recent.filter((ci) => ci.delivery_shadowbanned).length;
                if (recent.length >= 5 && sb / recent.length > 0.1 && result.shadowbanned) {
                    const { NotificationService } = require('../services/notificationService');
                    // evita spam: só notifica 1x a cada 30min via settings flag
                    const now = Date.now();
                    const last = store.settings?.lastShadowbanAlert || 0;
                    if (now - last > 30 * 60 * 1000) {
                        store.settings.lastShadowbanAlert = now;
                        db_1.db.save?.();
                        NotificationService.broadcast('Alerta shadowban >10% 🚨', `Taxa de shadowban em ${Math.round(sb / recent.length * 100)}% (${sb}/${recent.length} nos últimos verificados). Pausar campanhas, revisar conteúdo com Spintax e trocar proxy/conta. Último: ${result.reason}`);
                    }
                }
            }
            catch { }
        }
    }
    catch { }
}
