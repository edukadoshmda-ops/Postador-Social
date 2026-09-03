import express from 'express';
import cors from 'cors';
import path from 'path';
import { CONFIG } from './core/config';
import { initDatabase } from './core/db';
import { errorHandler } from './core/errorHandler';
import { campaignsRouter } from './routes/campaigns';
import { accountsRouter } from './routes/accounts';
import { groupsRouter } from './routes/groups';
import { libraryRouter } from './routes/library';
import { warmerRouter } from './routes/warmer';
import { statsRouter } from './routes/stats';
import { uploadRouter } from './routes/upload';
import { notificationsRouter } from './routes/notifications';
import { authRouter } from './routes/auth';

import './core/supabaseClient';

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

// Init SQLite DB safely
try {
  initDatabase();
} catch (err) {
  console.warn('[PulsoSocial] Aviso initDatabase:', err);
}

// Init scheduler de campanhas recorrentes (apenas em servidor persistente, não serverless)
if (!process.env.VERCEL) {
  import('./core/scheduler').then(m => m.initScheduler()).catch(() => {});
}

// API Routes (suporta com e sem /api)
const routers = [
  { path: 'campaigns', router: campaignsRouter },
  { path: 'accounts', router: accountsRouter },
  { path: 'groups', router: groupsRouter },
  { path: 'library', router: libraryRouter },
  { path: 'warmer', router: warmerRouter },
  { path: 'stats', router: statsRouter },
  { path: 'upload', router: uploadRouter },
  { path: 'notifications', router: notificationsRouter },
  { path: 'auth', router: authRouter },
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
app.use(errorHandler);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : CONFIG.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Pulso Social Backend running on port ${PORT}`);
});

module.exports = app;
export default app;
