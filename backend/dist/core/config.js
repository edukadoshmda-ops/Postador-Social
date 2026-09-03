"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
dotenv_1.default.config();
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
exports.CONFIG = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_PATH: isVercel ? path_1.default.join(os_1.default.tmpdir(), 'gruply.sqlite') : path_1.default.resolve(__dirname, '../../gruply.sqlite'),
    UPLOADS_DIR: isVercel ? path_1.default.join(os_1.default.tmpdir(), 'uploads') : path_1.default.resolve(__dirname, '../../uploads'),
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
