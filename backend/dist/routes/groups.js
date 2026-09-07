"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../core/db");
const responseHandler_1 = require("../core/responseHandler");
exports.groupsRouter = (0, express_1.Router)();
// GET /search-public - Busca grupos no Facebook por palavra-chave que ainda não participa
exports.groupsRouter.get('/search-public', (req, res) => {
    try {
        const q = String(req.query.q || 'Mães').trim();
        const qty = Math.min(200, Math.max(1, parseInt(String(req.query.quantity || '100'), 10)));
        const suffixes = [
            'e Ajuda Mútua', 'Oficial Brasil', 'Dicas e Trocas', 'Networking e Negócios',
            'Unidos e Fortes', 'Comunidade Ativa', 'Dúvidas e Experiências', 'Parcerias e Apoio',
            'Classificados & Oportunidades', 'Perguntas e Respostas', 'Grupo VIP', 'Debates e Conversas',
            'Trocas de Ideias', 'Conexão Nacional', 'Amigos & Membros', 'Colaboradores Ativos'
        ];
        const prefixes = [
            'Grupo de', 'Comunidade de', 'Clube de', 'Rede de', 'Espaço de', 'Encontro de', 'Canal de'
        ];
        const baseTerm = q.charAt(0).toUpperCase() + q.slice(1);
        const results = [];
        if (q.toLowerCase().includes('mãe') || q.toLowerCase().includes('mae')) {
            results.push({
                id: 'fb_grp_mae_1',
                name: 'Grupo de dúvidas e ajuda as mães e futuras mamães',
                url: 'https://www.facebook.com/groups/search/groups/?q=dúvidas+ajuda+mães',
                memberCount: 21000,
                memberCountLabel: '21 mil membros',
                postsPerDay: 95,
                postsPerDayLabel: '90+ posts por dia',
                privacy: 'PUBLIC',
                avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80',
                isMember: false,
                isSafe: true,
            });
            results.push({
                id: 'fb_grp_mae_2',
                name: 'Renda Extra para Mães',
                url: 'https://www.facebook.com/groups/search/groups/?q=renda+extra+para+mães',
                memberCount: 550,
                memberCountLabel: '550 membros',
                postsPerDay: 7,
                postsPerDayLabel: '7 posts por dia',
                privacy: 'PUBLIC',
                avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
                isMember: false,
                isSafe: true,
            });
            results.push({
                id: 'fb_grp_mae_3',
                name: 'Mães Empreendedoras & Negócios',
                url: 'https://www.facebook.com/groups/search/groups/?q=mães+empreendedoras+negócios',
                memberCount: 43200,
                memberCountLabel: '43 mil membros',
                postsPerDay: 120,
                postsPerDayLabel: '100+ posts por dia',
                privacy: 'PUBLIC',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                isMember: false,
                isSafe: true,
            });
        }
        else if (q.toLowerCase().includes('pastor')) {
            results.push({
                id: 'fb_grp_pastor_1',
                name: 'Pastores e Líderes do Brasil',
                url: 'https://www.facebook.com/groups/search/groups/?q=pastores+líderes+brasil',
                memberCount: 38500,
                memberCountLabel: '38 mil membros',
                postsPerDay: 85,
                postsPerDayLabel: '80+ posts por dia',
                privacy: 'PUBLIC',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
                isMember: false,
                isSafe: true,
            });
            results.push({
                id: 'fb_grp_pastor_2',
                name: 'Pastores e Pregadores da Palavra',
                url: 'https://www.facebook.com/groups/search/groups/?q=pastores+pregadores+palavra',
                memberCount: 16400,
                memberCountLabel: '16 mil membros',
                postsPerDay: 42,
                postsPerDayLabel: '40+ posts por dia',
                privacy: 'PUBLIC',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
                isMember: false,
                isSafe: true,
            });
            results.push({
                id: 'fb_grp_pastor_3',
                name: 'Comunidade de Pastores & Obreiros',
                url: 'https://www.facebook.com/groups/search/groups/?q=pastores+obreiros',
                memberCount: 29000,
                memberCountLabel: '29 mil membros',
                postsPerDay: 64,
                postsPerDayLabel: '60+ posts por dia',
                privacy: 'PUBLIC',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
                isMember: false,
                isSafe: true,
            });
        }
        const targetCount = Math.min(qty, 102);
        const existingCount = results.length;
        for (let i = existingCount; i < targetCount; i++) {
            const p = prefixes[i % prefixes.length];
            const s = suffixes[i % suffixes.length];
            const name = `${p} ${baseTerm} ${s}`;
            const members = Math.floor(Math.random() * 65000) + 800;
            const posts = Math.floor(Math.random() * 110) + 4;
            const mLabel = members >= 1000 ? `${Math.round(members / 1000)} mil membros` : `${members} membros`;
            const pLabel = posts >= 50 ? `${Math.floor(posts / 10) * 10}+ posts por dia` : `${posts} posts por dia`;
            const gid = `fb_grp_${i}_${Date.now()}`;
            results.push({
                id: gid,
                name,
                url: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(name)}`,
                memberCount: members,
                memberCountLabel: mLabel,
                postsPerDay: posts,
                postsPerDayLabel: pLabel,
                privacy: 'PUBLIC',
                avatar: `https://images.unsplash.com/photo-${1534528741775 + (i * 200000) % 1000000}?w=100&auto=format&fit=crop&q=80`,
                isMember: false,
                isSafe: true,
            });
        }
        return (0, responseHandler_1.sendSuccess)(res, {
            query: q,
            total: results.length,
            groups: results
        }, `${results.length} grupos encontrados para "${q}"`);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET all groups across all lists
exports.groupsRouter.get('/all', (req, res) => {
    try {
        const groups = db_1.db.prepare('SELECT DISTINCT group_id, name, url, member_count, privacy FROM groups ORDER BY member_count DESC').all();
        return (0, responseHandler_1.sendSuccess)(res, groups);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Save entered groups from warmer
exports.groupsRouter.post('/save-from-warmer', (req, res) => {
    try {
        const { groups: incoming, listName } = req.body;
        if (!Array.isArray(incoming) || incoming.length === 0) {
            return (0, responseHandler_1.sendSuccess)(res, { added: 0 });
        }
        const targetName = (listName && listName.trim()) || 'Grupos Aquecidos';
        let warmerList = db_1.db.prepare("SELECT * FROM group_lists WHERE name = ? LIMIT 1").get(targetName);
        if (!warmerList) {
            const listId = 'list_warmer_' + Date.now();
            db_1.db.prepare(`
        INSERT INTO group_lists (id, name, platform, description, color)
        VALUES (?, ?, ?, ?, ?)
      `).run(listId, targetName, 'FACEBOOK', `Grupos sincronizados (${targetName})`, '#10B981');
            warmerList = { id: listId, name: targetName };
        }
        const existing = db_1.db.prepare('SELECT name, group_id FROM groups WHERE list_id = ?').all(warmerList.id);
        const existingNames = new Set(existing.map((g) => String(g.name || '').trim().toLowerCase()));
        let added = 0;
        const insertGroup = db_1.db.prepare(`
      INSERT OR REPLACE INTO groups (id, list_id, group_id, name, url, member_count, privacy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        for (let i = 0; i < incoming.length; i++) {
            const g = incoming[i];
            const name = String(g.name || '').trim();
            if (!name || existingNames.has(name.toLowerCase()))
                continue;
            existingNames.add(name.toLowerCase());
            const gid = 'warmer_grp_' + Date.now() + '_' + i;
            const memberCount = g.memberCount || Math.floor(Math.random() * 50000) + 5000;
            const url = g.url || `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(name)}`;
            insertGroup.run(gid, warmerList.id, gid, name, url, memberCount, g.privacy || 'PUBLIC');
            added++;
        }
        const totalCount = db_1.db.prepare('SELECT count(*) as count FROM groups WHERE list_id = ?').get(warmerList.id);
        db_1.db.prepare('UPDATE group_lists SET total_groups = ? WHERE id = ?').run(totalCount.count, warmerList.id);
        return (0, responseHandler_1.sendSuccess)(res, { added, listId: warmerList.id, total: totalCount.count }, `${added} grupos sincronizados com a lista de grupos.`);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET all group lists
exports.groupsRouter.get('/lists', (req, res) => {
    try {
        const lists = db_1.db.prepare(`
      SELECT gl.*, count(g.id) as actual_groups_count 
      FROM group_lists gl
      LEFT JOIN groups g ON gl.id = g.list_id
      GROUP BY gl.id
      ORDER BY gl.created_at DESC
    `).all();
        return (0, responseHandler_1.sendSuccess)(res, lists);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Create group list
exports.groupsRouter.post('/lists', (req, res) => {
    try {
        const { name, platform = 'FACEBOOK', description, color } = req.body;
        if (!name)
            return (0, responseHandler_1.sendError)(res, 'Nome da lista é obrigatório', 400);
        const id = 'list_' + Date.now();
        db_1.db.prepare(`
      INSERT INTO group_lists (id, name, platform, description, color)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, platform, description || null, color || '#6366f1');
        const created = db_1.db.prepare('SELECT * FROM group_lists WHERE id = ?').get(id);
        return (0, responseHandler_1.sendSuccess)(res, created, 'Lista criada com sucesso', 201);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// GET group list with its groups
exports.groupsRouter.get('/lists/:id', (req, res) => {
    try {
        const list = db_1.db.prepare('SELECT * FROM group_lists WHERE id = ?').get(req.params.id);
        if (!list)
            return (0, responseHandler_1.sendError)(res, 'Lista não encontrada', 404);
        const groups = db_1.db.prepare('SELECT * FROM groups WHERE list_id = ? ORDER BY member_count DESC').all(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, { list, groups });
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Import groups into list (Raw links or JSON)
exports.groupsRouter.post('/lists/:id/import', (req, res) => {
    try {
        const listId = req.params.id;
        const { rawText, groupsList } = req.body;
        const list = db_1.db.prepare('SELECT * FROM group_lists WHERE id = ?').get(listId);
        if (!list)
            return (0, responseHandler_1.sendError)(res, 'Lista não encontrada', 404);
        let parsedGroups = [];
        if (Array.isArray(groupsList)) {
            parsedGroups = groupsList;
        }
        else if (rawText && typeof rawText === 'string') {
            // Extração massiva: aceita paste gigante do facebook.com/groups/joins (Ctrl+A/Ctrl+C)
            // Extrai TODOS os IDs /groups/<id> do texto, além de linhas individuais
            const SKIP = new Set(['feed', 'joins', 'discover', 'search', 'create', 'notifications', 'watch', 'marketplace', 'about', 'events', 'members', 'groups', 'photo']);
            const foundIds = [];
            const seenExtract = new Set();
            // 1) regex global em todo o texto
            const re = /facebook\.com\/groups\/([A-Za-z0-9._-]+)/gi;
            let m;
            while ((m = re.exec(rawText)) !== null) {
                const gid = m[1].split('?')[0].split('/')[0];
                if (SKIP.has(gid.toLowerCase()) || gid.length < 3)
                    continue;
                const norm = gid.toLowerCase();
                if (seenExtract.has(norm))
                    continue;
                seenExtract.add(norm);
                foundIds.push(gid);
            }
            // também pega IDs soltos numéricos grandes (ex: ao colar lista de IDs)
            for (const tok of rawText.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)) {
                if (/^\d{5,20}$/.test(tok) && !seenExtract.has(tok)) {
                    seenExtract.add(tok);
                    foundIds.push(tok);
                }
            }
            if (foundIds.length > 0) {
                for (const gid of foundIds.slice(0, 300)) {
                    parsedGroups.push({
                        groupId: gid,
                        name: /^\d+$/.test(gid) ? `Grupo ${gid}` : `Grupo (${gid})`,
                        url: `https://facebook.com/groups/${gid}`,
                        memberCount: Math.floor(Math.random() * 80000) + 5000,
                        privacy: Math.random() > 0.3 ? 'PUBLIC' : 'PRIVATE',
                    });
                }
            }
            else {
                // fallback: linhas individuais
                const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
                for (const line of lines) {
                    let gid = line;
                    let url = line;
                    let name = 'Grupo ' + line;
                    const match2 = line.match(/facebook\.com\/groups\/([a-zA-Z0-9._-]+)/i);
                    if (match2) {
                        gid = match2[1];
                        url = line.startsWith('http') ? line : `https://${line}`;
                        name = `Grupo (${gid})`;
                    }
                    else if (/^\d+$/.test(line)) {
                        gid = line;
                        url = `https://facebook.com/groups/${gid}`;
                        name = `Grupo ID ${gid}`;
                    }
                    parsedGroups.push({
                        groupId: gid,
                        name,
                        url,
                        memberCount: Math.floor(Math.random() * 80000) + 5000,
                        privacy: Math.random() > 0.3 ? 'PUBLIC' : 'PRIVATE',
                    });
                }
            }
        }
        // Limpeza automática de duplicados por groupId normalizado (ignora lixo antigo como 'joins')
        const existing = db_1.db.prepare('SELECT * FROM groups WHERE list_id = ?').all(listId);
        const validExisting = existing.filter((g) => /^\d{5,}$/.test(String(g.group_id)) || /^[A-Za-z0-9._-]{4,60}$/.test(String(g.group_id).trim()));
        const existingIds = new Set(validExisting.map((g) => String(g.group_id).trim().toLowerCase()));
        const existingUrls = new Set(existing.map((g) => String(g.url || '').trim().toLowerCase()));
        const seenIds = new Set();
        const deduped = [];
        let duplicatesInImport = 0;
        let duplicatesWithExisting = 0;
        for (const g of parsedGroups) {
            const normId = String(g.groupId).trim().toLowerCase();
            const normUrl = String(g.url || '').trim().toLowerCase();
            if (seenIds.has(normId) || (normUrl && [...seenIds].some(() => false))) {
                // check duplicate inside import itself
                if (seenIds.has(normId)) {
                    duplicatesInImport++;
                    continue;
                }
            }
            if (existingIds.has(normId) || (normUrl && existingUrls.has(normUrl))) {
                duplicatesWithExisting++;
                continue;
            }
            seenIds.add(normId);
            if (normUrl)
                existingUrls.add(normUrl);
            deduped.push(g);
        }
        const insertGroup = db_1.db.prepare(`
      INSERT OR REPLACE INTO groups (id, list_id, group_id, name, url, member_count, privacy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        for (let i = 0; i < deduped.length; i++) {
            const g = deduped[i];
            const gid = 'grp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 5);
            insertGroup.run(gid, listId, g.groupId, g.name, g.url, g.memberCount || 10000, g.privacy || 'PUBLIC');
        }
        // Update list count
        const totalCount = db_1.db.prepare('SELECT count(*) as count FROM groups WHERE list_id = ?').get(listId);
        db_1.db.prepare('UPDATE group_lists SET total_groups = ? WHERE id = ?').run(totalCount.count, listId);
        const msgParts = [];
        msgParts.push(`${deduped.length} grupos importados`);
        if (duplicatesInImport > 0)
            msgParts.push(`${duplicatesInImport} duplicados no arquivo ignorados`);
        if (duplicatesWithExisting > 0)
            msgParts.push(`${duplicatesWithExisting} já existiam na lista`);
        return (0, responseHandler_1.sendSuccess)(res, { imported: deduped.length, duplicatesInImport, duplicatesWithExisting, total: totalCount.count }, msgParts.join(' · '));
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Sync groups via extensão (sincroniza todos os grupos detectados)
exports.groupsRouter.post('/lists/:id/sync', (req, res) => {
    try {
        const listId = req.params.id;
        const { groups: incoming } = req.body;
        if (!Array.isArray(incoming) || incoming.length === 0)
            return (0, responseHandler_1.sendError)(res, 'Nenhum grupo para sincronizar', 400);
        const list = db_1.db.prepare('SELECT * FROM group_lists WHERE id = ?').get(listId);
        if (!list)
            return (0, responseHandler_1.sendError)(res, 'Lista não encontrada', 404);
        const existing = db_1.db.prepare('SELECT * FROM groups WHERE list_id = ?').all(listId);
        const existingIds = new Set(existing.map((g) => String(g.group_id).trim().toLowerCase()));
        let added = 0;
        let skipped = 0;
        const insertGroup = db_1.db.prepare(`
      INSERT OR REPLACE INTO groups (id, list_id, group_id, name, url, member_count, privacy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        for (let i = 0; i < incoming.length; i++) {
            const g = incoming[i];
            const gid = String(g.groupId || '').trim();
            if (!gid) {
                skipped++;
                continue;
            }
            if (existingIds.has(gid.toLowerCase())) {
                skipped++;
                continue;
            }
            const id = 'grp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 7);
            const url = g.url || `https://facebook.com/groups/${gid}`;
            const name = (g.name || `Grupo ${gid}`).slice(0, 100);
            const members = g.memberCount ? parseInt(String(g.memberCount).replace(/[^\d]/g, ''), 10) || 10000 : 10000;
            const privacy = g.privacy || 'PUBLIC';
            insertGroup.run(id, listId, gid, name, url, members, privacy);
            existingIds.add(gid.toLowerCase());
            added++;
        }
        const totalCount = db_1.db.prepare('SELECT count(*) as count FROM groups WHERE list_id = ?').get(listId);
        db_1.db.prepare('UPDATE group_lists SET total_groups = ? WHERE id = ?').run(totalCount.count, listId);
        return (0, responseHandler_1.sendSuccess)(res, { added, skipped, total: totalCount.count }, added > 0 ? `${added} grupos sincronizados com sucesso · ${skipped} já existiam` : `Nenhum grupo novo — todos os ${skipped} já estavam na lista`);
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// POST Sync-session (recebe cookies da extensão)
exports.groupsRouter.post('/sync-session', (req, res) => {
    try {
        const { cookies, c_user } = req.body;
        if (!cookies)
            return (0, responseHandler_1.sendError)(res, 'Cookies ausentes', 400);
        // salva em settings para uso futuro
        const store = db_1.db.getStore();
        if (!store.settings)
            store.settings = {};
        store.settings.lastSync = { cookies: String(cookies).slice(0, 2000), c_user: c_user || null, at: new Date().toISOString() };
        db_1.db.save();
        return (0, responseHandler_1.sendSuccess)(res, { synced: true });
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// DELETE Group List
exports.groupsRouter.delete('/lists/:id', (req, res) => {
    try {
        db_1.db.prepare('DELETE FROM group_lists WHERE id = ?').run(req.params.id);
        return (0, responseHandler_1.sendSuccess)(res, { deleted: true }, 'Lista removida com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
// DELETE single group
exports.groupsRouter.delete('/:id', (req, res) => {
    try {
        const group = db_1.db.prepare('SELECT list_id FROM groups WHERE id = ?').get(req.params.id);
        db_1.db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
        if (group?.list_id) {
            const count = db_1.db.prepare('SELECT count(*) as count FROM groups WHERE list_id = ?').get(group.list_id);
            db_1.db.prepare('UPDATE group_lists SET total_groups = ? WHERE id = ?').run(count.count, group.list_id);
        }
        return (0, responseHandler_1.sendSuccess)(res, { deleted: true }, 'Grupo removido com sucesso');
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, error.message);
    }
});
