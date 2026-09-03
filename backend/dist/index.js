"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./core/config");
const db_1 = require("./core/db");
const errorHandler_1 = require("./core/errorHandler");
const campaigns_1 = require("./routes/campaigns");
const accounts_1 = require("./routes/accounts");
const groups_1 = require("./routes/groups");
const library_1 = require("./routes/library");
const warmer_1 = require("./routes/warmer");
const stats_1 = require("./routes/stats");
const upload_1 = require("./routes/upload");
const notifications_1 = require("./routes/notifications");
const auth_1 = require("./routes/auth");
require("./core/supabaseClient");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Static uploads serving
app.use('/uploads', express_1.default.static(config_1.CONFIG.UPLOADS_DIR));
// Init SQLite DB safely
try {
    (0, db_1.initDatabase)();
}
catch (err) {
    console.warn('[PulsoSocial] Aviso initDatabase:', err);
}
// Init scheduler de campanhas recorrentes (apenas em servidor persistente, não serverless)
if (!process.env.VERCEL) {
    Promise.resolve().then(() => __importStar(require('./core/scheduler'))).then(m => m.initScheduler()).catch(() => { });
}
// API Routes (suporta com e sem /api)
const routers = [
    { path: 'campaigns', router: campaigns_1.campaignsRouter },
    { path: 'accounts', router: accounts_1.accountsRouter },
    { path: 'groups', router: groups_1.groupsRouter },
    { path: 'library', router: library_1.libraryRouter },
    { path: 'warmer', router: warmer_1.warmerRouter },
    { path: 'stats', router: stats_1.statsRouter },
    { path: 'upload', router: upload_1.uploadRouter },
    { path: 'notifications', router: notifications_1.notificationsRouter },
    { path: 'auth', router: auth_1.authRouter },
];
for (const r of routers) {
    app.use(`/api/${r.path}`, r.router);
    app.use(`/${r.path}`, r.router);
}
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), version: '5.80.0' });
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), version: '5.80.0' });
});
// Error handling
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : config_1.CONFIG.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Pulso Social Backend running on port ${PORT}`);
});
module.exports = app;
exports.default = app;
