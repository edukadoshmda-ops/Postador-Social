import fs from 'fs';
import path from 'path';
import os from 'os';
import { CONFIG } from './config';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const baseDataDir = isVercel ? path.join(os.tmpdir(), 'pulso_data') : path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(baseDataDir, 'db.json');
const BACKUP_DIR = path.join(baseDataDir, 'backups');

export function backupDatabase(): { ok: boolean; file?: string; error?: string } {
  try {
    if (!fs.existsSync(DATA_FILE)) return { ok: false, error: 'db.json não encontrado' };
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUP_DIR, `db-${ts}.json`);
    fs.copyFileSync(DATA_FILE, dest);
    // mantém apenas últimos 7 backups
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('db-')).sort();
    while (files.length > 7) {
      const oldest = files.shift();
      if (oldest) try { fs.unlinkSync(path.join(BACKUP_DIR, oldest)); } catch {}
    }
    console.log(`💾 Backup criado: ${dest}`);
    return { ok: true, file: dest };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function listBackups(): string[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('db-')).sort().reverse();
  } catch { return []; }
}
