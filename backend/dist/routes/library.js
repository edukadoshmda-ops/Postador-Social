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
// POST Create creative
exports.libraryRouter.post('/', (req, res) => {
    try {
        const { title, category = 'Geral', contentText, spintaxEnabled = true, mediaType = 'TEXT', mediaUrls = [], linkUrl, tags } = req.body;
        if (!title || !contentText)
            return (0, responseHandler_1.sendError)(res, 'Título e Conteúdo são obrigatórios', 400);
        const id = 'lib_' + Date.now();
        db_1.db.prepare(`
      INSERT INTO creative_library (id, title, category, content_text, spintax_enabled, media_type, media_urls, link_url, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, category, contentText, spintaxEnabled ? 1 : 0, mediaType, JSON.stringify(mediaUrls), linkUrl || null, tags || null);
        const created = db_1.db.prepare('SELECT * FROM creative_library WHERE id = ?').get(id);
        return (0, responseHandler_1.sendSuccess)(res, created, 'Modelo salvo na biblioteca', 201);
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
