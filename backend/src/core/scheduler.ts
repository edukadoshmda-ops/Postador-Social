import { db } from './db';
import { CampaignRunner } from '../services/campaignRunner';
import { backupDatabase } from './backup';

let timer: NodeJS.Timeout | null = null;

export interface ScheduleConfig {
  enabled: boolean;
  frequency: 'once' | 'daily' | 'weekly' | 'custom';
  time?: string; // HH:MM para daily/weekly
  daysOfWeek?: number[]; // 0-6
  intervalHours?: number; // para custom
  timezone?: string;
  nextRun?: string; // ISO
  lastRun?: string;
}

export function computeNextRun(schedule: ScheduleConfig, from: Date = new Date()): string | null {
  if (!schedule.enabled) return null;
  if (schedule.frequency === 'once') return null;
  const tz = schedule.timezone || 'America/Sao_Paulo';
  // simplificado: usa hora local do servidor
  if (schedule.frequency === 'daily' && schedule.time) {
    const [hh, mm] = schedule.time.split(':').map(Number);
    let next = new Date(from);
    next.setHours(hh, mm, 0, 0);
    if (next <= from) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }
  if (schedule.frequency === 'weekly' && schedule.time && schedule.daysOfWeek?.length) {
    const [hh, mm] = schedule.time.split(':').map(Number);
    for (let i = 0; i < 8; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      d.setHours(hh, mm, 0, 0);
      if (d <= from) continue;
      if (schedule.daysOfWeek.includes(d.getDay())) return d.toISOString();
    }
    return null;
  }
  if (schedule.frequency === 'custom' && schedule.intervalHours) {
    const next = new Date(from.getTime() + schedule.intervalHours * 3600 * 1000);
    return next.toISOString();
  }
  return null;
}

function requeueCampaign(campaignId: string) {
  const campaign = (db as any).getStore ? (db as any).getStore().campaigns.find((c: any) => c.id === campaignId) : null;
  if (!campaign) return;
  const items: any[] = (db as any).getStore().campaign_items.filter((ci: any) => ci.campaign_id === campaignId);
  // reseta todos os itens para QUEUED
  for (const it of items) {
    it.status = 'QUEUED';
    it.post_id = null;
    it.post_url = null;
    it.error_message = null;
    it.posted_text = null;
    it.execution_delay_seconds = null;
    it.executed_at = null;
  }
  campaign.status = 'IDLE';
  campaign.progress_percent = 0;
  campaign.completed_targets = 0;
  campaign.successful_posts = 0;
  campaign.pending_posts = 0;
  campaign.failed_posts = 0;
  campaign.current_target_name = null;
  (db as any).save?.();
}

let lastQuarantineCleanup = 0;
let lastBackup = 0;

function maybeBackupDaily() {
  const now = Date.now();
  if (now - lastBackup < 24 * 3600 * 1000) return;
  lastBackup = now;
  const res = backupDatabase();
  if (!res.ok) console.error('[backup] falha', res.error);
}

function cleanupQuarantineExpired() {
  const now = Date.now();
  if (now - lastQuarantineCleanup < 24 * 3600 * 1000) return;
  lastQuarantineCleanup = now;
  try {
    const store: any = (db as any).getStore ? (db as any).getStore() : { campaign_items: [] };
    const cutoff = now - 14 * 24 * 3600 * 1000;
    const before = store.campaign_items.length;
    // remove FAILED antigos que causavam quarentena, mantendo os últimos 14 dias
    // na prática a quarentena é calculada em tempo real, então só limpamos >30 dias para performance
    const thirtyDays = 30 * 24 * 3600 * 1000;
    const oldCutoff = now - thirtyDays;
    store.campaign_items = store.campaign_items.filter((ci: any) => {
      if (ci.status !== 'FAILED' || !ci.executed_at) return true;
      return new Date(ci.executed_at).getTime() >= oldCutoff;
    });
    if (store.campaign_items.length !== before) {
      (db as any).save?.();
      console.log(`🧹 Limpeza quarentena: ${before - store.campaign_items.length} FAILED antigos removidos`);
    }
  } catch (e) {
    console.error('[cleanup] erro', e);
  }
}

export function initScheduler() {
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    try {
      maybeBackupDaily();
      cleanupQuarantineExpired();
      const store: any = (db as any).getStore ? (db as any).getStore() : { campaigns: [] };
      const now = new Date();
      for (const c of store.campaigns) {
        if (!c.schedule_json) continue;
        let schedule: ScheduleConfig | null = null;
        try {
          schedule = typeof c.schedule_json === 'string' ? JSON.parse(c.schedule_json) : c.schedule_json;
        } catch { continue; }
        if (!schedule || !schedule.enabled || !schedule.nextRun) continue;
        const next = new Date(schedule.nextRun);
        if (next <= now && c.status !== 'RUNNING') {
          // dispara requeue e start
          requeueCampaign(c.id);
          schedule.lastRun = now.toISOString();
          schedule.nextRun = computeNextRun(schedule, now) || undefined;
          c.schedule_json = JSON.stringify(schedule);
          (db as any).save?.();
          // inicia
          try {
            await CampaignRunner.startCampaign(c.id);
            const { NotificationService } = await import('../services/notificationService');
            NotificationService.broadcast('Agendamento disparado ⏰', `Campanha *${c.name}* iniciada automaticamente pelo agendamento recorrente.`);
          } catch (e) {
            console.error('[scheduler] falha ao iniciar campanha agendada', c.id, e);
          }
        }
        // se campanha completou recentemente e frequency once não tem nextRun, desabilita
        // se frequência muda, recomputa nextRun se estiver vazio
        if (schedule.enabled && !schedule.nextRun && schedule.frequency !== 'once') {
          const nxt = computeNextRun(schedule, now);
          if (nxt) {
            schedule.nextRun = nxt;
            c.schedule_json = JSON.stringify(schedule);
            (db as any).save?.();
          }
        }
      }
    } catch (e) {
      console.error('[scheduler] erro', e);
    }
  }, 60 * 1000);
  console.log('⏰ Scheduler de campanhas iniciado (checagem a cada 60s)');
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
