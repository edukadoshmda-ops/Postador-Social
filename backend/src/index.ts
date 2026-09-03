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

// Init SQLite DB
initDatabase();

// Init scheduler de campanhas recorrentes (checa a cada 60s)
import { initScheduler } from './core/scheduler';
initScheduler();

// API Routes
app.use('/api/campaigns', campaignsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/warmer', warmerRouter);
app.use('/api/stats', statsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '5.78.9' });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : CONFIG.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Pulso Social Backend running on port ${PORT}`);
});

export default app;
export { app };
