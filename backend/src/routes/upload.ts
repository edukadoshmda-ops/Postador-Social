import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../core/config';
import { sendSuccess, sendError } from '../core/responseHandler';

export const uploadRouter = Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
      fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    }
    cb(null, CONFIG.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_MIMES: Record<string, { exts: string[]; maxBytes: number; label: string }> = {
  'image/jpeg': { exts: ['.jpg', '.jpeg'], maxBytes: 10 * 1024 * 1024, label: 'JPEG' },
  'image/png': { exts: ['.png'], maxBytes: 10 * 1024 * 1024, label: 'PNG' },
  'image/webp': { exts: ['.webp'], maxBytes: 10 * 1024 * 1024, label: 'WEBP' },
  'video/mp4': { exts: ['.mp4'], maxBytes: 100 * 1024 * 1024, label: 'MP4' },
  'video/quicktime': { exts: ['.mov'], maxBytes: 100 * 1024 * 1024, label: 'MOV' },
};

function validateUpload(file: Express.Multer.File): string | null {
  const mime = String(file.mimetype || '').toLowerCase();
  const conf = ALLOWED_MIMES[mime];
  if (!conf) return `Formato não permitido (${file.mimetype}). Use JPG, PNG, WEBP ou MP4/MOV.`;
  if (file.size > conf.maxBytes) return `${conf.label} muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo ${conf.maxBytes / 1024 / 1024}MB.`;
  return null;
}

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB fallback; validação fina por mime abaixo
  fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIMES[mime]) return cb(new Error(`Formato não permitido (${file.mimetype}). Use JPG, PNG, WEBP ou MP4/MOV.`), false);
    cb(null, true);
  },
});

// POST /api/upload - Single or Multiple file upload
uploadRouter.post('/', (req: Request, res: Response) => {
  (upload.single('file') as any)(req, res, (err: any) => {
    if (err) {
      const msg = err.message || 'Erro no upload';
      // remove arquivo parcial se houver
      try { if ((req as any).file?.path && fs.existsSync((req as any).file.path)) fs.unlinkSync((req as any).file.path); } catch {}
      return sendError(res, msg, 400);
    }
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return sendError(res, 'Nenhum arquivo enviado', 400);
      const validationError = validateUpload(file);
      if (validationError) {
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
        return sendError(res, validationError, 400);
      }
      const fileUrl = `/uploads/${file.filename}`;
      const fileType = file.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE';
      return sendSuccess(res, { filename: file.filename, originalName: file.originalname, size: file.size, mimeType: file.mimetype, mediaType: fileType, url: fileUrl }, 'Arquivo enviado com sucesso');
    } catch (error: any) {
      return sendError(res, error.message);
    }
  });
});
