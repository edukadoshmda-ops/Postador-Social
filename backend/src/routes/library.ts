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

// GET all folders
libraryRouter.get('/folders', (req: Request, res: Response) => {
  try {
    const folders = db.prepare('SELECT * FROM library_folders ORDER BY created_at DESC').all();
    return sendSuccess(res, folders);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Create or update folder
libraryRouter.post('/folders', (req: Request, res: Response) => {
  try {
    const { name, color = '#4F46E5', config = {} } = req.body;
    if (!name || !name.trim()) return sendError(res, 'Nome da pasta é obrigatório', 400);

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT * FROM library_folders WHERE name = ?').get(trimmedName) as any;

    if (existing) {
      if (color) {
        db.prepare('UPDATE library_folders SET name = ?, color = ? WHERE id = ?').run(trimmedName, color, existing.id);
      }
      if (config && Object.keys(config).length > 0) {
        db.prepare('UPDATE library_folders SET config = ? WHERE id = ?').run(JSON.stringify(config), existing.id);
      }
      const updated = db.prepare('SELECT * FROM library_folders WHERE id = ?').get(existing.id);
      return sendSuccess(res, updated, 'Pasta atualizada com sucesso');
    }

    const id = 'f_' + Date.now();
    db.prepare('INSERT INTO library_folders (id, name, color, config) VALUES (?, ?, ?, ?)').run(
      id,
      trimmedName,
      color,
      JSON.stringify(config)
    );

    const created = db.prepare('SELECT * FROM library_folders WHERE id = ?').get(id);
    return sendSuccess(res, created, 'Pasta criada com sucesso', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// PUT Update folder config / details
libraryRouter.put('/folders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, config } = req.body;

    const existing = db.prepare('SELECT * FROM library_folders WHERE id = ?').get(id) as any;
    if (!existing) return sendError(res, 'Pasta não encontrada', 404);

    if (name || color) {
      db.prepare('UPDATE library_folders SET name = ?, color = ? WHERE id = ?').run(
        name || existing.name,
        color || existing.color,
        id
      );
    }
    if (config !== undefined) {
      db.prepare('UPDATE library_folders SET config = ? WHERE id = ?').run(JSON.stringify(config), id);
    }

    const updated = db.prepare('SELECT * FROM library_folders WHERE id = ?').get(id);
    return sendSuccess(res, updated, 'Configurações da pasta salvas com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// DELETE folder
libraryRouter.delete('/folders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM library_folders WHERE id = ?').run(id);
    return sendSuccess(res, { deleted: true }, 'Pasta excluída com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Empty folder
libraryRouter.post('/folders/:id/empty', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE creative_library SET folder_id = NULL WHERE folder_id = ?').run(id);
    return sendSuccess(res, { emptied: true }, 'Pasta esvaziada com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Move item to folder
libraryRouter.post('/items/:id/folder', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { folderId } = req.body;
    db.prepare('UPDATE creative_library SET folder_id = ? WHERE id = ?').run(folderId || null, id);
    return sendSuccess(res, { moved: true }, 'Item movido para a pasta');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Create creative
libraryRouter.post('/', (req: Request, res: Response) => {
  try {
    const {
      title,
      category = 'Geral',
      contentText,
      spintaxEnabled = true,
      mediaType = 'TEXT',
      mediaUrls = [],
      linkUrl,
      tags,
      folderId,
    } = req.body;
    if (!title || !contentText) return sendError(res, 'Título e Conteúdo são obrigatórios', 400);

    const id = 'lib_' + Date.now();
    db.prepare(`
      INSERT INTO creative_library (id, title, category, content_text, spintax_enabled, media_type, media_urls, link_url, tags, folder_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      category,
      contentText,
      spintaxEnabled ? 1 : 0,
      mediaType,
      JSON.stringify(mediaUrls),
      linkUrl || null,
      tags || null,
      folderId || null
    );

    const created = db.prepare('SELECT * FROM creative_library WHERE id = ?').get(id);
    return sendSuccess(res, created, 'Modelo salvo na biblioteca', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// PUT Update creative item
libraryRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, contentText, category, folderId } = req.body;
    const item = db.prepare('SELECT * FROM creative_library WHERE id = ?').get(id) as any;
    if (!item) return sendError(res, 'Item não encontrado', 404);

    if (title !== undefined) item.title = title;
    if (contentText !== undefined) item.content_text = contentText;
    if (category !== undefined) item.category = category;
    if (folderId !== undefined) item.folder_id = folderId;

    return sendSuccess(res, item, 'Item atualizado com sucesso');
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
    const re = /\{([^{}]+)\}/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const opts = m[1].split('|').filter(Boolean).length || 1;
      variations *= Math.max(1, opts);
      if (variations > 9999) break;
    }
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
