import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';

export interface DatabaseSchema {
  accounts: any[];
  group_lists: any[];
  groups: any[];
  creative_library: any[];
  campaigns: any[];
  campaign_items: any[];
  warmer_logs: any[];
  users: any[];
  settings: Record<string, any>;
}

const DB_FILE = path.resolve(__dirname, '../../data/db.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let store: DatabaseSchema = {
  accounts: [],
  group_lists: [],
  groups: [],
  creative_library: [],
  campaigns: [],
  campaign_items: [],
  warmer_logs: [],
  users: [],
  settings: {},
};

function loadStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      store = JSON.parse(data);
      if (!Array.isArray((store as any).users)) (store as any).users = [];
    } else {
      saveStore();
    }
  } catch (err) {
    console.error('Error loading db.json', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json', err);
  }
}

// Database helper
export const db = {
  getStore: () => store,
  save: () => saveStore(),

  prepare: (query: string) => {
    const q = query.trim();

    return {
      all: (...params: any[]) => {
        loadStore();
        if (q.includes('FROM campaigns')) {
          return store.campaigns.map((c) => {
            const acc = store.accounts.find((a) => a.id === c.account_id);
            const gl = store.group_lists.find((l) => l.id === c.group_list_id);
            return {
              ...c,
              account_name: acc ? acc.name : 'Conta',
              group_list_name: gl ? gl.name : 'Lista',
            };
          });
        }
        if (q.includes('FROM campaign_items')) {
          if (params.length > 0) {
            return store.campaign_items.filter((ci) => ci.campaign_id === params[0]);
          }
          return store.campaign_items;
        }
        if (q.includes('FROM accounts')) {
          return store.accounts;
        }
        if (q.includes('FROM group_lists')) {
          return store.group_lists.map((gl) => {
            const actualCount = store.groups.filter((g) => g.list_id === gl.id).length;
            return { ...gl, actual_groups_count: actualCount };
          });
        }
        if (q.includes('FROM groups')) {
          if (params.length > 0) {
            return store.groups.filter((g) => g.list_id === params[0]);
          }
          return store.groups;
        }
        if (q.includes('FROM creative_library')) {
          return store.creative_library;
        }
        if (q.includes('FROM warmer_logs')) {
          return store.warmer_logs.map((w) => {
            const acc = store.accounts.find((a) => a.id === w.account_id);
            return { ...w, account_name: acc ? acc.name : 'Conta' };
          });
        }
        return [];
      },

      get: (...params: any[]) => {
        loadStore();
        if (q.includes('count(*) as count FROM group_lists')) {
          return { count: store.group_lists.length };
        }
        if (q.includes('count(*) as count FROM groups')) {
          if (params.length > 0) {
            return { count: store.groups.filter((g) => g.list_id === params[0]).length };
          }
          return { count: store.groups.length };
        }
        if (q.includes('count(*) as count FROM campaigns')) {
          return { count: store.campaigns.length };
        }
        if (q.includes('count(*) as count FROM accounts')) {
          return { count: store.accounts.length };
        }
        if (q.includes('FROM campaign_items') && q.includes("status = 'QUEUED'")) {
          return store.campaign_items.find((ci) => ci.campaign_id === params[0] && ci.status === 'QUEUED') || null;
        }
        if (q.includes('FROM campaign_items') && q.includes('SELECT count(*) as total')) {
          const cid = params[0];
          const items = store.campaign_items.filter((ci) => ci.campaign_id === cid);
          if (!cid) return { total: 0, completed: 0, successful: 0, pending: 0, failed: 0 };
          const completed = items.filter((ci) => ci.status !== 'QUEUED' && ci.status !== 'IN_PROGRESS').length;
          const successful = items.filter((ci) => ci.status === 'PUBLISHED').length;
          const pending = items.filter((ci) => ci.status === 'PENDING_APPROVAL').length;
          const failed = items.filter((ci) => ci.status === 'FAILED').length;
          return { total: items.length, completed, successful, pending, failed };
        }
        if (q.includes('FROM campaign_items') && q.includes('total_posts')) {
          const items = store.campaign_items;
          const published = items.filter((ci) => ci.status === 'PUBLISHED').length;
          const pending = items.filter((ci) => ci.status === 'PENDING_APPROVAL').length;
          const failed = items.filter((ci) => ci.status === 'FAILED').length;
          return { total_posts: items.length, published, pending, failed };
        }
        if (q.includes('FROM campaigns') && (q.includes('WHERE id = ?') || q.includes('WHERE c.id = ?'))) {
          const c = store.campaigns.find((c) => c.id === params[0]);
          if (!c) return null;
          const acc = store.accounts.find((a) => a.id === c.account_id);
          const gl = store.group_lists.find((l) => l.id === c.group_list_id);
          return {
            ...c,
            account_name: acc ? acc.name : 'Conta',
            group_list_name: gl ? gl.name : 'Lista',
          };
        }
        if (q.includes('FROM accounts WHERE id = ?')) {
          return store.accounts.find((a) => a.id === params[0]) || null;
        }
        if (q.includes('FROM group_lists WHERE id = ?')) {
          return store.group_lists.find((gl) => gl.id === params[0]) || null;
        }
        if (q.includes('FROM groups WHERE id = ?')) {
          return store.groups.find((g) => g.id === params[0]) || null;
        }
        if (q.includes('FROM creative_library WHERE id = ?')) {
          return store.creative_library.find((cl) => cl.id === params[0]) || null;
        }
        return null;
      },

      run: (...params: any[]) => {
        loadStore();
        if (q.includes('INSERT INTO campaigns')) {
          const [id, name, type, platform, accountId, groupListId, contentText, spintax, mediaType, mediaUrls, linkUrl, calib, totalTargets, scheduleJson] = params;
          store.campaigns.unshift({
            id,
            name,
            type,
            platform,
            account_id: accountId,
            group_list_id: groupListId,
            content_text: contentText,
            spintax_enabled: Boolean(spintax),
            media_type: mediaType,
            media_urls: mediaUrls,
            link_url: linkUrl,
            calibration_json: calib,
            status: 'IDLE',
            total_targets: totalTargets || 0,
            schedule_json: scheduleJson || null,
            completed_targets: 0,
            successful_posts: 0,
            pending_posts: 0,
            failed_posts: 0,
            progress_percent: 0,
            created_at: new Date().toISOString(),
          });
        } else if (q.includes('INSERT INTO campaign_items')) {
          const [id, campaignId, groupId, groupName, groupUrl, status] = params;
          store.campaign_items.push({
            id,
            campaign_id: campaignId,
            group_id: groupId,
            group_name: groupName,
            group_url: groupUrl,
            status: status || 'QUEUED',
          });
        } else if (q.startsWith('UPDATE campaigns') && q.includes("SET status = '")) {
          // genérico para literais 'RUNNING','PAUSED','COMPLETED','CANCELLED' com ou sem started_at/finished_at
          const m = q.match(/SET status = '([^']+)'/);
          const statusLit = m ? m[1] : null;
          const id = params[0];
          const c = store.campaigns.find((c) => c.id === id);
          if (c && statusLit) {
            c.status = statusLit as any;
            if (q.includes('started_at') && !c.started_at) c.started_at = new Date().toISOString();
            if (q.includes('finished_at')) c.finished_at = new Date().toISOString();
            if (statusLit === 'COMPLETED') c.progress_percent = 100;
          }
        } else if (q.startsWith('UPDATE campaign_items') && q.includes("SET status = '")) {
          const m = q.match(/SET status = '([^']+)'/);
          const statusLit = m ? m[1] : null;
          const id = params[0];
          const item = store.campaign_items.find((ci) => ci.id === id);
          if (item && statusLit) item.status = statusLit as any;
        } else if (q.includes('UPDATE campaigns SET status = ?') && q.includes('started_at')) {
          const c = store.campaigns.find((c) => c.id === params[1]);
          if (c) {
            c.status = params[0];
            c.started_at = c.started_at || new Date().toISOString();
          }
        } else if (q.includes('UPDATE campaigns SET status = ?') && q.includes('finished_at')) {
          const c = store.campaigns.find((c) => c.id === params[1]);
          if (c) {
            c.status = params[0];
            c.finished_at = new Date().toISOString();
          }
        } else if (q.includes('UPDATE campaigns SET status = ?')) {
          const c = store.campaigns.find((c) => c.id === params[1]);
          if (c) c.status = params[0];
        } else if (q.includes('UPDATE campaigns SET current_target_name = ?')) {
          const c = store.campaigns.find((c) => c.id === params[1]);
          if (c) c.current_target_name = params[0];
        } else if (q.includes('UPDATE campaigns SET completed_targets = ?')) {
          const [completed, successful, pending, failed, progress, id] = params;
          const c = store.campaigns.find((c) => c.id === id);
          if (c) {
            c.completed_targets = completed;
            c.successful_posts = successful;
            c.pending_posts = pending;
            c.failed_posts = failed;
            c.progress_percent = progress;
          }
        } else if (q.includes('UPDATE campaign_items SET status = ?') && q.includes('post_id = ?')) {
          const [status, postId, postUrl, error, text, delay, id] = params;
          const item = store.campaign_items.find((ci) => ci.id === id);
          if (item) {
            item.status = status;
            item.post_id = postId;
            item.post_url = postUrl;
            item.error_message = error;
            item.posted_text = text;
            item.execution_delay_seconds = delay;
            item.executed_at = new Date().toISOString();
          }
        } else if (q.includes('UPDATE campaign_items SET status = ?')) {
          const item = store.campaign_items.find((ci) => ci.id === params[1]);
          if (item) item.status = params[0];
        } else if (q.includes('INSERT INTO accounts') && q.includes('access_token')) {
          const [id, platform, name, identifier, cookies, sessionData, proxy, userAgent, accessToken, igUserId] = params;
          const exists = store.accounts.find((a) => a.id === id);
          if (!exists) {
            store.accounts.push({
              id,
              platform,
              name,
              identifier,
              cookies: cookies || null,
              session_data: sessionData || null,
              proxy: proxy || null,
              user_agent: userAgent || null,
              access_token: accessToken || null,
              ig_user_id: igUserId || null,
              status: 'ACTIVE',
              trust_score: 90,
              created_at: new Date().toISOString(),
            });
          }
        } else if (q.includes('INSERT INTO accounts') || q.includes('INSERT OR IGNORE INTO accounts')) {
          const [id, platform, name, identifier, cookies, sessionData, proxy, userAgent] = params;
          const exists = store.accounts.find((a) => a.id === id);
          if (!exists) {
            store.accounts.push({
              id,
              platform,
              name,
              identifier,
              cookies: cookies || null,
              session_data: sessionData || null,
              proxy: proxy || null,
              user_agent: userAgent || null,
              access_token: null,
              ig_user_id: null,
              status: 'ACTIVE',
              trust_score: 90,
              created_at: new Date().toISOString(),
            });
          }
        } else if (q.includes('INSERT INTO group_lists')) {
          const [id, name, platform, description, color, totalGroups] = params;
          store.group_lists.push({
            id,
            name,
            platform,
            description: description || null,
            color: color || '#6366f1',
            total_groups: totalGroups || 0,
            created_at: new Date().toISOString(),
          });
        } else if (q.includes('INSERT INTO groups') || q.includes('INSERT OR REPLACE INTO groups')) {
          const [id, listId, groupId, name, url, members, privacy] = params;
          const existing = store.groups.findIndex((g) => g.id === id);
          const newG = { id, list_id: listId, group_id: groupId, name, url, member_count: members || 10000, privacy: privacy || 'PUBLIC' };
          if (existing >= 0) {
            store.groups[existing] = newG;
          } else {
            store.groups.push(newG);
          }
        } else if (q.includes('INSERT INTO creative_library') || q.includes('INSERT OR IGNORE INTO creative_library')) {
          const [id, title, category, text, spintax, mediaType, mediaUrls, linkUrl, tags] = params;
          store.creative_library.push({
            id,
            title,
            category: category || 'Geral',
            content_text: text,
            spintax_enabled: Boolean(spintax),
            media_type: mediaType || 'TEXT',
            media_urls: mediaUrls || null,
            link_url: linkUrl || null,
            tags: tags || null,
            created_at: new Date().toISOString(),
          });
        } else if (q.includes('INSERT INTO warmer_logs')) {
          const [id, accountId, actionType, status, details] = params;
          store.warmer_logs.unshift({
            id,
            account_id: accountId,
            action_type: actionType,
            status: status || 'SUCCESS',
            details: details || '',
            executed_at: new Date().toISOString(),
          });
        } else if (q.includes('UPDATE campaigns SET schedule_json = ?')) {
          const [scheduleJson, id] = params;
          const c = store.campaigns.find((c: any) => c.id === id);
          if (c) (c as any).schedule_json = scheduleJson;
        } else if (q.includes('UPDATE accounts SET custom_limits = ?')) {
          const [customLimits, id] = params;
          const acc = store.accounts.find((a) => a.id === id);
          if (acc) acc.custom_limits = customLimits;
        } else if (q.includes('UPDATE accounts SET status = ?') && q.includes('NEEDS_LOGIN')) {
          const [status, id] = params;
          const acc = store.accounts.find((a) => a.id === id);
          if (acc) acc.status = status;
        } else if (q.includes('UPDATE accounts SET status = ?')) {
          const [status, id] = params;
          const acc = store.accounts.find((a) => a.id === id);
          if (acc) acc.status = status;
        } else if (q.includes('UPDATE accounts SET trust_score = ?')) {
          const [score, status, id] = params;
          const acc = store.accounts.find((a) => a.id === id);
          if (acc) {
            acc.trust_score = score;
            acc.status = status;
          }
        } else if (q.includes('UPDATE group_lists SET total_groups = ?')) {
          const [count, id] = params;
          const gl = store.group_lists.find((l) => l.id === id);
          if (gl) gl.total_groups = count;
        } else if (q.includes('DELETE FROM campaigns WHERE id = ?')) {
          store.campaigns = store.campaigns.filter((c) => c.id !== params[0]);
          store.campaign_items = store.campaign_items.filter((ci) => ci.campaign_id !== params[0]);
        } else if (q.includes('DELETE FROM accounts WHERE id = ?')) {
          store.accounts = store.accounts.filter((a) => a.id !== params[0]);
        } else if (q.includes('DELETE FROM group_lists WHERE id = ?')) {
          store.group_lists = store.group_lists.filter((gl) => gl.id !== params[0]);
          store.groups = store.groups.filter((g) => g.list_id !== params[0]);
        } else if (q.includes('DELETE FROM groups WHERE id = ?')) {
          store.groups = store.groups.filter((g) => g.id !== params[0]);
        } else if (q.includes('DELETE FROM creative_library WHERE id = ?')) {
          store.creative_library = store.creative_library.filter((cl) => cl.id !== params[0]);
        }

        saveStore();
        return { changes: 1 };
      },
    };
  },
};

export function initDatabase() {
  loadStore();
  if (store.group_lists.length === 0) {
    seedDefaultData();
  }
}

function seedDefaultData() {
  const listId = 'list_demo_1';
  store.group_lists.push({
    id: listId,
    name: 'Grupos de Vendas & Classificados Brasil',
    platform: 'FACEBOOK',
    description: 'Lista principal de grupos de alto engajamento no Brasil',
    color: '#6366f1',
    total_groups: 5,
    created_at: new Date().toISOString(),
  });

  const sampleGroups = [
    { id: 'grp_1', gid: '1092837465', name: 'Feira do Rolo e Vendas SP Capital', url: 'https://facebook.com/groups/1092837465', members: 125000, privacy: 'PUBLIC' },
    { id: 'grp_2', gid: '2093847561', name: 'Classificados e Oportunidades Brasil', url: 'https://facebook.com/groups/2093847561', members: 89000, privacy: 'PUBLIC' },
    { id: 'grp_3', gid: '3049586712', name: 'Compre & Venda Direto com Proprietário', url: 'https://facebook.com/groups/3049586712', members: 45000, privacy: 'PRIVATE' },
    { id: 'grp_4', gid: '4095867123', name: 'Empreendedores e Negócios Online', url: 'https://facebook.com/groups/4095867123', members: 67200, privacy: 'PUBLIC' },
    { id: 'grp_5', gid: '5096871234', name: 'Marketing Digital e Afiliados Brasil', url: 'https://facebook.com/groups/5096871234', members: 110000, privacy: 'PUBLIC' },
  ];

  for (const g of sampleGroups) {
    store.groups.push({
      id: g.id,
      list_id: listId,
      group_id: g.gid,
      name: g.name,
      url: g.url,
      member_count: g.members,
      privacy: g.privacy,
    });
  }

  store.accounts.push(
    {
      id: 'acc_demo_fb',
      platform: 'FACEBOOK',
      name: 'Perfil Principal - Vendas',
      identifier: '10008923485712',
      status: 'ACTIVE',
      trust_score: 92,
      created_at: new Date().toISOString(),
    },
    {
      id: 'acc_demo_ig',
      platform: 'INSTAGRAM',
      name: 'Perfil Comercial @pulsosocialpro',
      identifier: 'pulsosocialpro',
      status: 'ACTIVE',
      trust_score: 88,
      created_at: new Date().toISOString(),
    }
  );

  store.creative_library.push(
    {
      id: 'lib_1',
      title: 'Oferta Relâmpago com Spintax',
      category: 'Vendas',
      content_text: '{Olá|Oi|E aí} {pessoal|galera|amigos}! 👋\n\n{Confiram|Vejam|Aproveitem} essa {super|grande|imperdível} oportunidade de {hoje|esta semana}.\n\n🔥 {Vagas limitadas|Poucas unidades disponíveis}!\n👉 {Clique no link|Acesse agora|Comente aqui} para mais detalhes.',
      spintax_enabled: true,
      media_type: 'TEXT',
      created_at: new Date().toISOString(),
    },
    {
      id: 'lib_2',
      title: 'Anti-Ban: Conversa Natural (baixo risco)',
      category: 'Anti-Ban',
      content_text: '{Olá pessoal|Oi galera|Fala {amigos|vizinhança}}! {Alguém aqui já |Vocês conhecem } {essa dica|esse {achado|conteúdo}} sobre {organização da casa|economia doméstica}?\n\n{Queria compartilhar|Deixando aqui} {minha experiência|o que funcionou comigo} {essa semana|recentemente}. {Me contem|Comentem} o que acharam! 👇',
      spintax_enabled: true,
      media_type: 'TEXT',
      created_at: new Date().toISOString(),
    },
    {
      id: 'lib_3',
      title: 'Anti-Ban: Pergunta + Engajamento',
      category: 'Anti-Ban',
      content_text: '{Pessoal, me ajudem|Galera, preciso de opinião|Amigos, {o que acham|qual preferem}}?\n\n{Estou entre|Tô na dúvida entre} {essa|esta} {opção A|alternativa A} e {opção B|alternativa B} para {minha sala|meu projeto}. {Qual combina mais|O que vocês fariam}?\n\n{Deixem nos comentários|Comentem aqui} 👇 {Obrigado desde já|Agradeço a ajuda}!',
      spintax_enabled: true,
      media_type: 'TEXT',
      created_at: new Date().toISOString(),
    },
    {
      id: 'lib_4',
      title: 'Anti-Ban: Valor sem link direto',
      category: 'Anti-Ban',
      content_text: '{Dica rápida|Compartilhando aprendizado|Hoje aprendi que} {organizar|planejar} {com antecedência|um pouco por dia} {economiza tempo|evita estresse}.\n\n{Alguém mais faz assim|Vocês têm alguma técnica}? {Quero trocar ideia|Vamos compartilhar dicas} nos comentários! ✨',
      spintax_enabled: true,
      media_type: 'TEXT',
      created_at: new Date().toISOString(),
    },
    {
      id: 'lib_5',
      title: 'Anti-Ban: Variação Hashtags/Links',
      category: 'Anti-Ban',
      content_text: '{Confira|Veja} {essa novidade|este {achado|lançamento}} {de hoje|da semana}!\n\n{Detalhes|Informações} no {comentário fixado|primeiro comentário} 👇\n\n{ #dica #organizacao #casa | #economia #lar #inspiracao | #dicasuteis #rotina }',
      spintax_enabled: true,
      media_type: 'TEXT',
      created_at: new Date().toISOString(),
    }
  );

  saveStore();
}
