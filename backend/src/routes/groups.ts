import { Router, Request, Response } from 'express';
import { db } from '../core/db';
import { sendSuccess, sendError } from '../core/responseHandler';

export const groupsRouter = Router();

// GET all group lists
groupsRouter.get('/lists', (req: Request, res: Response) => {
  try {
    const lists = db.prepare(`
      SELECT gl.*, count(g.id) as actual_groups_count 
      FROM group_lists gl
      LEFT JOIN groups g ON gl.id = g.list_id
      GROUP BY gl.id
      ORDER BY gl.created_at DESC
    `).all();
    return sendSuccess(res, lists);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Create group list
groupsRouter.post('/lists', (req: Request, res: Response) => {
  try {
    const { name, platform = 'FACEBOOK', description, color } = req.body;
    if (!name) return sendError(res, 'Nome da lista é obrigatório', 400);

    const id = 'list_' + Date.now();
    db.prepare(`
      INSERT INTO group_lists (id, name, platform, description, color)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, platform, description || null, color || '#6366f1');

    const created = db.prepare('SELECT * FROM group_lists WHERE id = ?').get(id);
    return sendSuccess(res, created, 'Lista criada com sucesso', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// GET group list with its groups
groupsRouter.get('/lists/:id', (req: Request, res: Response) => {
  try {
    const list = db.prepare('SELECT * FROM group_lists WHERE id = ?').get(req.params.id);
    if (!list) return sendError(res, 'Lista não encontrada', 404);

    const groups = db.prepare('SELECT * FROM groups WHERE list_id = ? ORDER BY member_count DESC').all(req.params.id);
    return sendSuccess(res, { list, groups });
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Import groups into list (Raw links or JSON)
groupsRouter.post('/lists/:id/import', (req: Request, res: Response) => {
  try {
    const listId = req.params.id;
    const { rawText, groupsList } = req.body;

    const list = db.prepare('SELECT * FROM group_lists WHERE id = ?').get(listId);
    if (!list) return sendError(res, 'Lista não encontrada', 404);

    let parsedGroups: { groupId: string; name: string; url: string; memberCount?: number; privacy?: string }[] = [];

    if (Array.isArray(groupsList)) {
      parsedGroups = groupsList;
    } else if (rawText && typeof rawText === 'string') {
      // Extração massiva: aceita paste gigante do facebook.com/groups/joins (Ctrl+A/Ctrl+C)
      // Extrai TODOS os IDs /groups/<id> do texto, além de linhas individuais
      const SKIP = new Set(['feed','joins','discover','search','create','notifications','watch','marketplace','about','events','members','groups','photo']);
      const foundIds: string[] = [];
      const seenExtract = new Set<string>();
      // 1) regex global em todo o texto
      const re = /facebook\.com\/groups\/([A-Za-z0-9._-]+)/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(rawText)) !== null) {
        const gid = m[1].split('?')[0].split('/')[0];
        if (SKIP.has(gid.toLowerCase()) || gid.length < 3) continue;
        const norm = gid.toLowerCase();
        if (seenExtract.has(norm)) continue;
        seenExtract.add(norm);
        foundIds.push(gid);
      }
      // também pega IDs soltos numéricos grandes (ex: ao colar lista de IDs)
      for (const tok of rawText.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean)) {
        if (/^\d{5,20}$/.test(tok) && !seenExtract.has(tok)) { seenExtract.add(tok); foundIds.push(tok); }
      }

      if (foundIds.length > 0) {
        for (const gid of foundIds.slice(0, 300)) {
          parsedGroups.push({
            groupId: gid,
            name: /^\d+$/.test(gid) ? `Grupo ${gid}` : `Grupo (${gid})`,
            url: `https://facebook.com/groups/${gid}`,
            memberCount: Math.floor(Math.random()*80000)+5000,
            privacy: Math.random()>0.3?'PUBLIC':'PRIVATE',
          });
        }
      } else {
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
          } else if (/^\d+$/.test(line)) {
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
    const existing: any[] = db.prepare('SELECT * FROM groups WHERE list_id = ?').all(listId) as any[];
    const validExisting = existing.filter((g:any)=> /^\d{5,}$/.test(String(g.group_id)) || /^[A-Za-z0-9._-]{4,60}$/.test(String(g.group_id).trim()));
    const existingIds = new Set(validExisting.map((g: any) => String(g.group_id).trim().toLowerCase()));
    const existingUrls = new Set(existing.map((g: any) => String(g.url || '').trim().toLowerCase()));

    const seenIds = new Set<string>();
    const deduped: typeof parsedGroups = [];
    let duplicatesInImport = 0;
    let duplicatesWithExisting = 0;
    for (const g of parsedGroups) {
      const normId = String(g.groupId).trim().toLowerCase();
      const normUrl = String(g.url || '').trim().toLowerCase();
      if (seenIds.has(normId) || (normUrl && [...seenIds].some(() => false))) {
        // check duplicate inside import itself
        if (seenIds.has(normId)) { duplicatesInImport++; continue; }
      }
      if (existingIds.has(normId) || (normUrl && existingUrls.has(normUrl))) {
        duplicatesWithExisting++;
        continue;
      }
      seenIds.add(normId);
      if (normUrl) existingUrls.add(normUrl);
      deduped.push(g);
    }

    const insertGroup = db.prepare(`
      INSERT OR REPLACE INTO groups (id, list_id, group_id, name, url, member_count, privacy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < deduped.length; i++) {
      const g = deduped[i];
      const gid = 'grp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 5);
      insertGroup.run(gid, listId, g.groupId, g.name, g.url, g.memberCount || 10000, g.privacy || 'PUBLIC');
    }

    // Update list count
    const totalCount = db.prepare('SELECT count(*) as count FROM groups WHERE list_id = ?').get(listId) as any;
    db.prepare('UPDATE group_lists SET total_groups = ? WHERE id = ?').run(totalCount.count, listId);

    const msgParts: string[] = [];
    msgParts.push(`${deduped.length} grupos importados`);
    if (duplicatesInImport > 0) msgParts.push(`${duplicatesInImport} duplicados no arquivo ignorados`);
    if (duplicatesWithExisting > 0) msgParts.push(`${duplicatesWithExisting} já existiam na lista`);
    return sendSuccess(res, { imported: deduped.length, duplicatesInImport, duplicatesWithExisting, total: totalCount.count }, msgParts.join(' · '));
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Sync groups via extensão (sincroniza todos os grupos detectados)
groupsRouter.post('/lists/:id/sync', (req: Request, res: Response) => {
  try {
    const listId = req.params.id;
    const { groups: incoming } = req.body as { groups: { groupId: string; name: string; url: string; memberCount?: any; privacy?: string }[] };
    if (!Array.isArray(incoming) || incoming.length === 0) return sendError(res, 'Nenhum grupo para sincronizar', 400);
    const list = db.prepare('SELECT * FROM group_lists WHERE id = ?').get(listId) as any;
    if (!list) return sendError(res, 'Lista não encontrada', 404);

    const existing: any[] = db.prepare('SELECT * FROM groups WHERE list_id = ?').all(listId) as any[];
    const existingIds = new Set(existing.map((g: any) => String(g.group_id).trim().toLowerCase()));

    let added = 0;
    let skipped = 0;
    const insertGroup = db.prepare(`
      INSERT OR REPLACE INTO groups (id, list_id, group_id, name, url, member_count, privacy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < incoming.length; i++) {
      const g = incoming[i];
      const gid = String(g.groupId || '').trim();
      if (!gid) { skipped++; continue; }
      if (existingIds.has(gid.toLowerCase())) { skipped++; continue; }
      const id = 'grp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 7);
      const url = g.url || `https://facebook.com/groups/${gid}`;
      const name = (g.name || `Grupo ${gid}`).slice(0, 100);
      const members = g.memberCount ? parseInt(String(g.memberCount).replace(/[^\d]/g, ''), 10) || 10000 : 10000;
      const privacy = g.privacy || 'PUBLIC';
      insertGroup.run(id, listId, gid, name, url, members, privacy);
      existingIds.add(gid.toLowerCase());
      added++;
    }

    const totalCount = db.prepare('SELECT count(*) as count FROM groups WHERE list_id = ?').get(listId) as any;
    db.prepare('UPDATE group_lists SET total_groups = ? WHERE id = ?').run(totalCount.count, listId);
    return sendSuccess(res, { added, skipped, total: totalCount.count }, added > 0 ? `${added} grupos sincronizados com sucesso · ${skipped} já existiam` : `Nenhum grupo novo — todos os ${skipped} já estavam na lista`);
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// POST Sync-session (recebe cookies da extensão)
groupsRouter.post('/sync-session', (req: Request, res: Response) => {
  try {
    const { cookies, c_user } = req.body;
    if (!cookies) return sendError(res, 'Cookies ausentes', 400);
    // salva em settings para uso futuro
    const store: any = (db as any).getStore();
    if (!store.settings) store.settings = {};
    store.settings.lastSync = { cookies: String(cookies).slice(0, 2000), c_user: c_user || null, at: new Date().toISOString() };
    (db as any).save();
    return sendSuccess(res, { synced: true });
  } catch (error: any) { return sendError(res, error.message); }
});

// DELETE Group List
groupsRouter.delete('/lists/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM group_lists WHERE id = ?').run(req.params.id);
    return sendSuccess(res, { deleted: true }, 'Lista removida com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});

// DELETE single group
groupsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const group = db.prepare('SELECT list_id FROM groups WHERE id = ?').get(req.params.id) as any;
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);

    if (group?.list_id) {
      const count = db.prepare('SELECT count(*) as count FROM groups WHERE list_id = ?').get(group.list_id) as any;
      db.prepare('UPDATE group_lists SET total_groups = ? WHERE id = ?').run(count.count, group.list_id);
    }

    return sendSuccess(res, { deleted: true }, 'Grupo removido com sucesso');
  } catch (error: any) {
    return sendError(res, error.message);
  }
});
