"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.libraryRouter = void 0;
const express_1 = require("express");
const db_1 = require("../core/db");
const responseHandler_1 = require("../core/responseHandler");
const spintax_1 = require("../core/spintax");
const contentFilter_1 = require("../core/contentFilter");
exports.libraryRouter = (0, express_1.Router)();
// GET all creatives
exports.libraryRouter.get('/', (req, res) => {
    try {
        const items = db_1.db.prepare('SELECT * FROM creative_library ORDER BY created_at DESC').all();
        return (0, responseHandler_1.sendSuccess)(res, items);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET all folders
exports.libraryRouter.get('/folders', (req, res) => {
    try {
        const folders = db_1.db.prepare('SELECT * FROM library_folders ORDER BY created_at DESC').all();
        return (0, responseHandler_1.sendSuccess)(res, folders);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Create or update folder
exports.libraryRouter.post('/folders', (req, res) => {
    try {
        const { name, color = '#4F46E5', config = {} } = req.body;
        if (!name || !name.trim())
            return (0, responseHandler_1.sendError)(res, 'Nome da pasta é obrigatório', 400);
        const trimmedName = name.trim();
        const existing = db_1.db.prepare('SELECT * FROM library_folders WHERE name = ?').get(trimmedName);
        if (existing) {
            if (color) {
                db_1.db.prepare('UPDATE library_folders SET name = ?, color = ? WHERE id = ?').run(trimmedName, color, existing.id);
            }
            if (config && Object.keys(config).length > 0) {
                db_1.db.prepare('UPDATE library_folders SET config = ? WHERE id = ?').run(JSON.stringify(config), existing.id);
            }
            const updated = db_1.db.prepare('SELECT * FROM library_folders WHERE id = ?').get(existing.id);
            return (0, responseHandler_1.sendSuccess)(res, updated, 'Pasta atualizada com sucesso');
        }
        const id = 'f_' + Date.now();
        db_1.db.prepare('INSERT INTO library_folders (id, name, color, config) VALUES (?, ?, ?, ?)').run(id, trimmedName, color, JSON.stringify(config));
        const created = db_1.db.prepare('SELECT * FROM library_folders WHERE id = ?').get(id);
        return (0, responseHandler_1.sendSuccess)(res, created, 'Pasta criada com sucesso', 201);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// PUT Update folder config / details
exports.libraryRouter.put('/folders/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, config } = req.body;
        const existing = db_1.db.prepare('SELECT * FROM library_folders WHERE id = ?').get(id);
        if (!existing)
            return (0, responseHandler_1.sendError)(res, 'Pasta não encontrada', 404);
        if (name || color) {
            db_1.db.prepare('UPDATE library_folders SET name = ?, color = ? WHERE id = ?').run(name || existing.name, color || existing.color, id);
        }
        if (config !== undefined) {
            db_1.db.prepare('UPDATE library_folders SET config = ? WHERE id = ?').run(JSON.stringify(config), id);
        }
        const updated = db_1.db.prepare('SELECT * FROM library_folders WHERE id = ?').get(id);
        return (0, responseHandler_1.sendSuccess)(res, updated, 'Configurações da pasta salvas com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// DELETE folder
exports.libraryRouter.delete('/folders/:id', (req, res) => {
    try {
        const { id } = req.params;
        db_1.db.prepare('DELETE FROM library_folders WHERE id = ?').run(id);
        return (0, responseHandler_1.sendSuccess)(res, { deleted: true }, 'Pasta excluída com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Move item to folder
exports.libraryRouter.post('/items/:id/folder', (req, res) => {
    try {
        const { id } = req.params;
        const { folderId } = req.body;
        db_1.db.prepare('UPDATE creative_library SET folder_id = ? WHERE id = ?').run(folderId || null, id);
        return (0, responseHandler_1.sendSuccess)(res, { moved: true }, 'Item movido para a pasta');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Create creative
exports.libraryRouter.post('/', (req, res) => {
    try {
        const { title, category = 'Geral', contentText, spintaxEnabled = true, mediaType = 'TEXT', mediaUrls = [], linkUrl, tags, folderId, } = req.body;
        if (!title || !contentText)
            return (0, responseHandler_1.sendError)(res, 'Título e Conteúdo são obrigatórios', 400);
        const id = 'lib_' + Date.now();
        db_1.db.prepare(`
      INSERT INTO creative_library (id, title, category, content_text, spintax_enabled, media_type, media_urls, link_url, tags, folder_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, category, contentText, spintaxEnabled ? 1 : 0, mediaType, JSON.stringify(mediaUrls), linkUrl || null, tags || null, folderId || null);
        const created = db_1.db.prepare('SELECT * FROM creative_library WHERE id = ?').get(id);
        return (0, responseHandler_1.sendSuccess)(res, created, 'Modelo salvo na biblioteca', 201);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// PUT Update creative item
exports.libraryRouter.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { title, contentText, category, folderId } = req.body;
        const item = db_1.db.prepare('SELECT * FROM creative_library WHERE id = ?').get(id);
        if (!item)
            return (0, responseHandler_1.sendError)(res, 'Item não encontrado', 404);
        if (title !== undefined)
            item.title = title;
        if (contentText !== undefined)
            item.content_text = contentText;
        if (category !== undefined)
            item.category = category;
        if (folderId !== undefined)
            item.folder_id = folderId;
        return (0, responseHandler_1.sendSuccess)(res, item, 'Item atualizado com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Spintax preview generator (com checagem anti-spam)
exports.libraryRouter.post('/spintax-preview', (req, res) => {
    try {
        const { text, count = 3 } = req.body;
        if (!text)
            return (0, responseHandler_1.sendSuccess)(res, { samples: [] });
        const samples = (0, spintax_1.generateSpintaxSamples)(text, Math.min(Number(count) || 3, 10));
        const check = (0, contentFilter_1.validateContent)(text, true);
        let variations = 1;
        const re = /\{([^{}]+)\}/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const opts = m[1].split('|').filter(Boolean).length || 1;
            variations *= Math.max(1, opts);
            if (variations > 9999)
                break;
        }
        return (0, responseHandler_1.sendSuccess)(res, { samples, check, variations });
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Validate content (anti-spam) — usado por Library e Campaign
exports.libraryRouter.post('/validate', (req, res) => {
    try {
        const { text, spintaxEnabled = true } = req.body;
        if (!text)
            return (0, responseHandler_1.sendError)(res, 'Conteúdo é obrigatório', 400);
        const result = (0, contentFilter_1.validateContent)(text, Boolean(spintaxEnabled));
        return (0, responseHandler_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// DELETE creative
exports.libraryRouter.delete('/:id', (req, res) => {
    try {
        db_1.db.prepare('DELETE FROM creative_library WHERE id = ?').run(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, { deleted: true }, 'Item removido da biblioteca');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
