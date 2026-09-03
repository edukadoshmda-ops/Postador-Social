import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_PATH: path.resolve(__dirname, '../../gruply.sqlite'),
  UPLOADS_DIR: path.resolve(__dirname, '../../uploads'),
  CALIBRATION_DEFAULT: {
    minDelaySeconds: 60,
    maxDelaySeconds: 180,
    randomJitterSeconds: 25,
    pauseAfterPosts: 8,
    pauseDurationMinutes: 10,
    maxPostsPerDay: 35,
    stopOnBlock: true,
    humanPattern: 'moderado',
    variationalDelay: true,
    safeWindowEnabled: false,
    safeWindowStartHour: 8,
    safeWindowEndHour: 22,
  },
};
