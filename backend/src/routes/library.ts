import { Router, Request, Response } from 'express';
import { db } from '../core/db';
import { sendSuccess, sendError } from '../core/responseHandler';
import { generateSpintaxSamples } from '../core/spintax';
import { validateContent } from '../core/contentFilter';

export const libraryRouter = Router();

// GET all creatives
libraryRouter.get('/', (req: Request, res: Response) => {
  try {
    const items = db.prepare('SELECT * FROM creative_library ORDER BY created_at DESC').all();
    return sendSuccess(res, items);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Create creative
libraryRouter.post('/', (req: Request, res: Response) => {
  try {
    const { title, category = 'Geral', contentText, spintaxEnabled = true, mediaType = 'TEXT', mediaUrls = [], linkUrl, tags } = req.body;
    if (!title || !contentText) return sendError(res, 'Título e Conteúdo são obrigatórios', 400);

    const id = 'lib_' + Date.now();
    db.prepare(`
      INSERT INTO creative_library (id, title, category, content_text, spintax_enabled, media_type, media_urls, link_url, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, category, contentText, spintaxEnabled ? 1 : 0, mediaType, JSON.stringify(mediaUrls), linkUrl || null, tags || null);

    const created = db.prepare('SELECT * FROM creative_library WHERE id = ?').get(id);
    return sendSuccess(res, created, 'Modelo salvo na biblioteca', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Spintax preview generator (com checagem anti-spam)
libraryRouter.post('/spintax-preview', (req: Request, res: Response) => {
  try {
    const { text, count = 3 } = req.body;
    if (!text) return sendSuccess(res, { samples: [] });
    const samples = generateSpintaxSamples(text, Math.min(Number(count) || 3, 10));
    const check = validateContent(text, true);
    let variations = 1;
    const re = /\{([^{}]+)\}/g; let m;
    while ((m = re.exec(text)) !== null) { const opts = m[1].split('|').filter(Boolean).length || 1; variations *= Math.max(1, opts); if (variations > 9999) break; }
    return sendSuccess(res, { samples, check, variations });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Validate content (anti-spam) — usado por Library e Campaign
libraryRouter.post('/validate', (req: Request, res: Response) => {
  try {
    const { text, spintaxEnabled = true } = req.body;
    if (!text) return sendError(res, 'Conteúdo é obrigatório', 400);
    const result = validateContent(text, Boolean(spintaxEnabled));
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// DELETE creative
libraryRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM creative_library WHERE id = ?').run(req.params.id);
    return sendSuccess(res, { deleted: true }, 'Item removido da biblioteca');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});
