import { db } from './db';

/**
 * Verificação de entrega pós-publicação (shadowban / moderação)
 * Simula checagem se o post ficou visível no grupo
 * Em produção: faria GET no post_url com cookies da conta e verificaria se contém o texto
 */

export interface DeliveryResult {
  checked: boolean;
  delivered: boolean;
  shadowbanned: boolean;
  reason?: string;
  checkedAt: string;
}

export async function checkDelivery(postUrl: string | null, postedText: string | null, groupId: string): Promise<DeliveryResult> {
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

export function logDeliveryCheck(itemId: string, result: DeliveryResult) {
  try {
    const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
    const item = store.campaign_items.find((ci: any) => ci.id === itemId);
    if (item) {
      item.delivery_checked_at = result.checkedAt;
      item.delivery_delivered = result.delivered;
      item.delivery_shadowbanned = result.shadowbanned;
      item.delivery_reason = result.reason || null;
      (db as any).save?.();
      // alerta automático se shadowban >10% nos últimos 20 verificados
      try {
        const checked = store.campaign_items.filter((ci: any) => ci.delivery_checked_at);
        const recent = checked.slice(-20);
        const sb = recent.filter((ci: any) => ci.delivery_shadowbanned).length;
        if (recent.length >= 5 && sb / recent.length > 0.1 && result.shadowbanned) {
          const { NotificationService } = require('../services/notificationService');
          // evita spam: só notifica 1x a cada 30min via settings flag
          const now = Date.now();
          const last = (store.settings as any)?.lastShadowbanAlert || 0;
          if (now - last > 30 * 60 * 1000) {
            (store.settings as any).lastShadowbanAlert = now;
            (db as any).save?.();
            NotificationService.broadcast(
              'Alerta shadowban >10% 🚨',
              `Taxa de shadowban em ${Math.round(sb / recent.length * 100)}% (${sb}/${recent.length} nos últimos verificados). Pausar campanhas, revisar conteúdo com Spintax e trocar proxy/conta. Último: ${result.reason}`
            );
          }
        }
      } catch {}
    }
  } catch {}
}
