"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../core/config");
const responseHandler_1 = require("../core/responseHandler");
exports.uploadRouter = (0, express_1.Router)();
// Configure Multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (!fs_1.default.existsSync(config_1.CONFIG.UPLOADS_DIR)) {
            fs_1.default.mkdirSync(config_1.CONFIG.UPLOADS_DIR, { recursive: true });
        }
        cb(null, config_1.CONFIG.UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const uniqueName = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, uniqueName);
    },
});
const ALLOWED_MIMES = {
    'image/jpeg': { exts: ['.jpg', '.jpeg'], maxBytes: 10 * 1024 * 1024, label: 'JPEG' },
    'image/png': { exts: ['.png'], maxBytes: 10 * 1024 * 1024, label: 'PNG' },
    'image/webp': { exts: ['.webp'], maxBytes: 10 * 1024 * 1024, label: 'WEBP' },
    'video/mp4': { exts: ['.mp4'], maxBytes: 100 * 1024 * 1024, label: 'MP4' },
    'video/quicktime': { exts: ['.mov'], maxBytes: 100 * 1024 * 1024, label: 'MOV' },
};
function validateUpload(file) {
    const mime = String(file.mimetype || '').toLowerCase();
    const conf = ALLOWED_MIMES[mime];
    if (!conf)
        return `Formato não permitido (${file.mimetype}). Use JPG, PNG, WEBP ou MP4/MOV.`;
    if (file.size > conf.maxBytes)
        return `${conf.label} muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo ${conf.maxBytes / 1024 / 1024}MB.`;
    return null;
}
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB fallback; validação fina por mime abaixo
    fileFilter: (req, file, cb) => {
        const mime = String(file.mimetype || '').toLowerCase();
        if (!ALLOWED_MIMES[mime])
            return cb(new Error(`Formato não permitido (${file.mimetype}). Use JPG, PNG, WEBP ou MP4/MOV.`), false);
        cb(null, true);
    },
});
// POST /api/upload - Single or Multiple file upload
exports.uploadRouter.post('/', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            const msg = err.message || 'Erro no upload';
            // remove arquivo parcial se houver
            try {
                if (req.file?.path && fs_1.default.existsSync(req.file.path))
                    fs_1.default.unlinkSync(req.file.path);
            }
            catch { }
            return (0, responseHandler_1.sendError)(res, msg, 400);
        }
        try {
            const file = req.file;
            if (!file)
                return (0, responseHandler_1.sendError)(res, 'Nenhum arquivo enviado', 400);
            const validationError = validateUpload(file);
            if (validationError) {
                try {
                    if (fs_1.default.existsSync(file.path))
                        fs_1.default.unlinkSync(file.path);
                }
                catch { }
                return (0, responseHandler_1.sendError)(res, validationError, 400);
            }
            const fileUrl = `/uploads/${file.filename}`;
            const fileType = file.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE';
            return (0, responseHandler_1.sendSuccess)(res, { filename: file.filename, originalName: file.originalname, size: file.size, mimeType: file.mimetype, mediaType: fileType, url: fileUrl }, 'Arquivo enviado com sucesso');
        }
        catch (error) {
            return (0, responseHandler_1.sendError)(res, error.message);
        }
    });
});
