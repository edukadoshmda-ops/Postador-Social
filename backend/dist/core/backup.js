"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupDatabase = backupDatabase;
exports.listBackups = listBackups;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const baseDataDir = isVercel ? path_1.default.join(os_1.default.tmpdir(), 'pulso_data') : path_1.default.resolve(__dirname, '../../data');
const DATA_FILE = path_1.default.join(baseDataDir, 'db.json');
const BACKUP_DIR = path_1.default.join(baseDataDir, 'backups');
function backupDatabase() {
    try {
        if (!fs_1.default.existsSync(DATA_FILE))
            return { ok: false, error: 'db.json não encontrado' };
        if (!fs_1.default.existsSync(BACKUP_DIR))
            fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const dest = path_1.default.join(BACKUP_DIR, `db-${ts}.json`);
        fs_1.default.copyFileSync(DATA_FILE, dest);
        // mantém apenas últimos 7 backups
        const files = fs_1.default.readdirSync(BACKUP_DIR).filter(f => f.startsWith('db-')).sort();
        while (files.length > 7) {
            const oldest = files.shift();
            if (oldest)
                try {
                    fs_1.default.unlinkSync(path_1.default.join(BACKUP_DIR, oldest));
                }
                catch { }
        }
        console.log(`💾 Backup criado: ${dest}`);
        return { ok: true, file: dest };
    }
    catch (e) {
        return { ok: false, error: e.message };
    }
}
function listBackups() {
    try {
        if (!fs_1.default.existsSync(BACKUP_DIR))
            return [];
        return fs_1.default.readdirSync(BACKUP_DIR).filter(f => f.startsWith('db-')).sort().reverse();
    }
    catch {
        return [];
    }
}
