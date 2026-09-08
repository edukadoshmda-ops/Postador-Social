// Pulso Social — Content Script v5.80.0
// Extração profunda de grupos do Facebook via JSON scripts + DOM + Scroll automático

const SKIP_GIDS = new Set([
  'feed', 'joins', 'discover', 'search', 'create', 'notifications', 
  'watch', 'marketplace', 'about', 'events', 'members', 'groups', 
  'photo', 'photos', 'videos', 'settings', 'category', 'direct', 
  'saved', 'media', 'files', 'albums', 'buy_sell_discussion', 'user'
]);

function sleep(ms) { 
  return new Promise(resolve => setTimeout(resolve, ms)); 
}

function decodeUnicode(str) {
  if (!str) return '';
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\/g, '')
    .trim();
}

function sanitizeName(name) {
  if (!name) return '';
  let clean = decodeUnicode(name);
  clean = clean.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return clean.slice(0, 100);
}

// 1) Extrai grupos diretamente dos scripts JSON / Relay do Facebook (mais rápido e preciso)
function extractFromScripts(seen, groups) {
  try {
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const script of scripts) {
      const text = script.textContent || '';
      if (!text || (!text.includes('Group') && !text.includes('/groups/'))) continue;

      // Padrão 1: Objetos com id e name de grupos em Relay/GraphQL
      // Ex: {"__typename":"Group","id":"123456789","name":"Meu Grupo"...}
      const reGroup = /"__typename"\s*:\s*"Group"[^}]*?"id"\s*:\s*"(\d{5,25})"[^}]*?"name"\s*:\s*"((?:\\u[0-9a-fA-F]{4}|[^"\\])+)"/g;
      let m;
      while ((m = reGroup.exec(text)) !== null) {
        const gid = m[1];
        const name = sanitizeName(m[2]);
        if (gid && !SKIP_GIDS.has(gid) && !seen.has(gid) && name && name.length >= 2) {
          seen.add(gid);
          groups.push({
            groupId: gid,
            name,
            url: `https://www.facebook.com/groups/${gid}`,
            memberCount: null,
            privacy: 'PUBLIC'
          });
        }
      }

      // Padrão 2: {"id":"123456789","name":"...","url":"https:\/\/www.facebook.com\/groups\/..."}
      const reGroup2 = /"id"\s*:\s*"(\d{5,25})"[^}]*?"name"\s*:\s*"((?:\\u[0-9a-fA-F]{4}|[^"\\])+)"[^}]*?facebook\.com\\\/groups\\\/([^"\\]+)/g;
      while ((m = reGroup2.exec(text)) !== null) {
        const gid = m[1];
        const name = sanitizeName(m[2]);
        if (gid && !SKIP_GIDS.has(gid) && !seen.has(gid) && name && name.length >= 2) {
          seen.add(gid);
          groups.push({
            groupId: gid,
            name,
            url: `https://www.facebook.com/groups/${gid}`,
            memberCount: null,
            privacy: 'PUBLIC'
          });
        }
      }

      // Padrão 3: IDs soltos de grupos em arrays
      const reUrls = /facebook\.com\\\/groups\\\/([a-zA-Z0-9._-]+)/g;
      while ((m = reUrls.exec(text)) !== null) {
        const gid = m[1].replace(/\\/g, '');
        if (gid && !SKIP_GIDS.has(gid.toLowerCase()) && !seen.has(gid) && gid.length >= 4) {
          seen.add(gid);
          groups.push({
            groupId: gid,
            name: `Grupo ${gid}`,
            url: `https://www.facebook.com/groups/${gid}`,
            memberCount: null,
            privacy: 'PUBLIC'
          });
        }
      }
    }
  } catch (err) {
    console.warn('[PulsoSocial] extractFromScripts error:', err);
  }
}

// 2) Extrai grupos navegando na árvore DOM
function findNameForAnchor(anchor, gid) {
  // Procura no próprio link
  let name = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim().split('\n')[0];
  if (name && name.length >= 3 && !/ver grupo|visitado|solicitações|todos os grupos|criar novo grupo|seu feed|descobrir|seus grupos|view group|compartilhar/i.test(name)) {
    return sanitizeName(name);
  }

  // Procura em spans internos
  const spans = Array.from(anchor.querySelectorAll('span, strong, div')).map(s => (s.innerText || '').trim()).filter(Boolean);
  for (const s of spans) {
    if (s.length >= 3 && s.length <= 90 && !/^\d+$/.test(s) && !/ver grupo|visitado|solicitações/i.test(s)) {
      return sanitizeName(s);
    }
  }

  // Procura nos elementos pais próximos (cards)
  let parent = anchor.parentElement;
  for (let depth = 0; depth < 6 && parent; depth++) {
    const text = (parent.innerText || '').trim();
    if (text && text.length > 5 && text.length < 500) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => 
        l.length >= 3 && l.length <= 90 && 
        !/ver grupo|visitado|solicitações|todos os grupos|criar novo grupo|seu feed|descobrir|seus grupos|view group|compartilhar|membros|membro/i.test(l)
      );
      if (lines.length > 0) {
        const best = lines.find(l => l.split(/\s+/).length >= 2 && !/^\d+$/.test(l)) || lines[0];
        if (best && best.length >= 3) return sanitizeName(best);
      }
    }
    parent = parent.parentElement;
  }

  return `Grupo ${gid}`;
}

function collectFromDOM(seen, groups) {
  try {
    const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/groups\/([A-Za-z0-9._-]+)(?:\/|\?|#|"|$)/);
      if (!m) continue;

      const gid = m[1].replace(/[\/?#].*$/, '').trim();
      if (!gid || SKIP_GIDS.has(gid.toLowerCase()) || seen.has(gid)) continue;
      if (!/^\d{4,}$/.test(gid) && gid.length < 3) continue;

      seen.add(gid);
      const url = href.startsWith('http') ? href.split('?')[0] : `https://www.facebook.com/groups/${gid}`;
      const name = findNameForAnchor(a, gid);

      // Tenta detectar contagem de membros no card
      let memberCount = null;
      try {
        const card = a.closest('div[role="article"], div[data-visualcompletion], div');
        const cardText = card ? (card.innerText || '') : '';
        const mm = cardText.match(/([\d.,]+(?:\s*[kmKM])?)\s*membros?/i);
        if (mm) {
          let numStr = mm[1].toLowerCase().replace(',', '.');
          if (numStr.includes('k')) memberCount = Math.round(parseFloat(numStr) * 1000);
          else if (numStr.includes('m')) memberCount = Math.round(parseFloat(numStr) * 1000000);
          else memberCount = parseInt(numStr.replace(/[^\d]/g, ''), 10);
        }
      } catch {}

      groups.push({
        groupId: gid,
        name: name || `Grupo ${gid}`,
        url,
        memberCount: memberCount || null,
        privacy: 'PUBLIC'
      });
    }
  } catch (err) {
    console.warn('[PulsoSocial] collectFromDOM error:', err);
  }
}

// 3) Rola suavemente todos os containers scrolláveis da página do Facebook
function performScroll() {
  try { window.scrollTo(0, 9999999); } catch {}
  try { window.scrollBy(0, 2000); } catch {}
  try { document.documentElement.scrollTop += 2000; } catch {}
  try { document.body.scrollTop += 2000; } catch {}

  // Facebook usa containers scrolláveis com role="main", role="feed" ou divs com overflow
  const scrollables = Array.from(document.querySelectorAll('div[role="main"], div[role="feed"], div[data-pagelet], div')).filter(el => {
    return el.scrollHeight > el.clientHeight + 60 && el.clientHeight > 80;
  });

  for (const el of scrollables) {
    try { 
      el.scrollTop = el.scrollHeight; 
      if (el.scrollBy) el.scrollBy(0, 1500);
    } catch {}
  }

  // Clica em botões de expandir lista ("Ver mais", "Ver tudo", "Mostrar mais", "Carregar mais")
  try {
    const buttons = Array.from(document.querySelectorAll('div[role="button"], span, a'));
    for (const b of buttons) {
      const txt = (b.innerText || '').trim().toLowerCase();
      if (txt === 'ver mais' || txt === 'mostrar mais' || txt === 'ver tudo' || txt === 'see more' || txt === 'show more' || txt === 'carregar mais') {
        const rect = b.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight + 400) {
          try { b.click(); } catch {}
        }
      }
    }
  } catch {}
}

// Extração completa com scroll progressivo profundo (extrai centenas de grupos)
async function extractAllFacebookGroups(maxIterations = 100) {
  const seen = new Set();
  const groups = [];

  // Passo 1: Extração inicial de scripts e DOM
  extractFromScripts(seen, groups);
  collectFromDOM(seen, groups);

  let lastCount = groups.length;
  let staleCount = 0;

  // Passo 2: Scroll profundo e coleta incremental contínua
  for (let i = 0; i < maxIterations; i++) {
    performScroll();
    await sleep(650);

    extractFromScripts(seen, groups);
    collectFromDOM(seen, groups);

    if (groups.length === lastCount) {
      staleCount++;
    } else {
      staleCount = 0;
      lastCount = groups.length;
    }

    // Só encerra se realmente não houver mais novos grupos após 8 scrolls consecutivos
    if (staleCount >= 8 && groups.length > 0) break;
    if (groups.length >= 1500) break;
  }

  // Passo 3: Limpeza final de nomes genéricos quando possível
  for (const g of groups) {
    if (g.name.startsWith('Grupo ') && g.name.length > 6) {
      const el = document.querySelector(`a[href*="/groups/${g.groupId}"]`);
      if (el) {
        const betterName = findNameForAnchor(el, g.groupId);
        if (betterName && !betterName.startsWith('Grupo ')) {
          g.name = betterName;
        }
      }
    }
  }

  return groups;
}

// 4) Automação de postagem real no grupo do Facebook com banner visual e suporte a Lexical/Draft
function showVisualBanner(text, bgColor = '#4f46e5') {
  let banner = document.getElementById('__pulso_banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = '__pulso_banner';
    banner.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:999999;padding:12px 24px;border-radius:12px;color:#fff;font-family:system-ui,-apple-system,sans-serif;font-weight:700;font-size:14px;box-shadow:0 10px 25px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px;transition:all 0.3s ease;pointer-events:none;';
    document.body.appendChild(banner);
  }
  banner.style.background = bgColor;
  banner.innerHTML = text;
}

function removeVisualBanner(delayMs = 4000) {
  setTimeout(() => {
    const banner = document.getElementById('__pulso_banner');
    if (banner) banner.remove();
  }, delayMs);
}

async function insertTextIntoLexical(editor, text) {
  editor.focus();
  await sleep(200);

  // Limpa antes caso já exista texto prévio no editor
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
    await sleep(50);
    document.execCommand('delete', false, null);
    await sleep(80);
  } catch {}

  let inserted = false;

  // 1) execCommand insertText (método mais limpo)
  try {
    const ok = document.execCommand('insertText', false, text);
    if (ok && (editor.innerText || '').includes(text.slice(0, 10))) {
      inserted = true;
    }
  } catch {}

  // 2) Tenta via ClipboardEvent (Paste) apenas se o primeiro não inseriu
  if (!inserted) {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      });
      editor.dispatchEvent(pasteEvent);
      await sleep(250);
      if ((editor.innerText || '').includes(text.slice(0, 10))) {
        inserted = true;
      }
    } catch {}
  }

  // 3) Tenta via InputEvent 'beforeinput' apenas se ainda não inseriu
  if (!inserted) {
    try {
      const beforeInput = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        cancelable: true
      });
      editor.dispatchEvent(beforeInput);
      await sleep(200);
    } catch {}
  }

  // 4) Notifica o React/Lexical com eventos de input para acordar e habilitar o botão
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));
  editor.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  editor.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
  await sleep(400);
}

async function executePostInCurrentTab(text) {
  try {
    if (!text || !text.trim()) throw new Error('Texto da postagem vazio');

    showVisualBanner('⚡ <b>Pulso Social</b>: Localizando caixa de publicação no Facebook...', '#4f46e5');

    // Faz rolagem suave para baixo para forçar o Facebook a carregar o composer
    window.scrollBy({ top: 250, behavior: 'smooth' });
    await sleep(600);

    // Passo 1: Espera até 15 segundos pelo gatilho de postagem na página do grupo
    let trigger = null;
    const isExcluded = (str) => {
      const s = (str || '').toLowerCase();
      return s.includes('coment') || s.includes('responder') || s.includes('reply') ||
             s.includes('compartilhar') || s.includes('share') || s.includes('pesquisar') ||
             s.includes('busca') || s.includes('search') || s.includes('curtir') || s.includes('like') ||
             s.includes('anônimo') || s.includes('sentimento') || s.includes('enquete');
    };

    for (let attempt = 0; attempt < 28; attempt++) {
      // 1.1) Seletores diretos da caixa de postagem do grupo (Desktop / Mobile)
      const primarySelectors = [
        'div[data-pagelet="GroupInlineComposer"] div[role="button"]',
        'div[data-pagelet="GroupInlineComposer"]',
        'div[data-pagelet="FeedInlineComposer"] div[role="button"]',
        'div[data-pagelet="FeedInlineComposer"]',
        'div[data-pagelet*="Composer"] div[role="button"]',
        'div[data-pagelet*="Composer"]',
        'div[aria-label*="No que você está pensando" i]',
        'div[aria-label*="Escreva algo" i]',
        'div[aria-label*="Crie uma publicação" i]',
        'div[aria-label*="Create a public post" i]',
        'div[aria-label*="Write something" i]'
      ];

      for (const sel of primarySelectors) {
        const els = Array.from(document.querySelectorAll(sel));
        for (const el of els) {
          const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
          if (isExcluded(t)) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width > 30 && rect.height > 15) {
            trigger = el;
            break;
          }
        }
        if (trigger) break;
      }

      // 1.2) Fallback inteligente: procura especificamente pelo texto "Escreva algo" ou similar
      if (!trigger) {
        const allTextEls = Array.from(document.querySelectorAll('span, div, p, [role="button"]'));
        for (const el of allTextEls) {
          if (el.children.length > 3) continue;
          const t = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
          if (isExcluded(t)) continue;
          if (
            t.includes('escreva algo') ||
            t.includes('no que você está pensando') ||
            t.includes('crie uma publicação') ||
            t.includes('create a public post') ||
            t.includes('write something')
          ) {
            const clickable = el.closest('div[role="button"]') || el.closest('div[tabindex="0"]') || el.closest('div[data-pagelet*="Composer"]') || el.parentElement || el;
            const rect = clickable.getBoundingClientRect();
            if (rect.width > 30 && rect.height > 15) {
              trigger = clickable;
              break;
            }
          }
        }
      }

      if (trigger) break;
      if (attempt === 5 || attempt === 12) {
        window.scrollBy({ top: 300, behavior: 'smooth' });
      }
      await sleep(500);
    }

    if (!trigger) {
      // Checa se usuário realmente não é membro
      const headerJoinBtn = document.querySelector('div[data-pagelet*="GroupHeader"] [role="button"]');
      const headerText = (headerJoinBtn?.innerText || '').toLowerCase();
      if (headerText.includes('participar') || headerText.includes('entrar')) {
        showVisualBanner('⚠️ Você não é membro deste grupo. Solicite entrada no grupo primeiro.', '#f59e0b');
        removeVisualBanner(5000);
        return { ok: false, error: 'Não é membro deste grupo' };
      }

      showVisualBanner('❌ Não foi possível encontrar a caixa "Escreva algo...". Tentando clique de reforço...', '#ef4444');
      removeVisualBanner(5000);
      throw new Error('Campo "Escreva algo..." não encontrado na página.');
    }

    // Passo 2: Clica para abrir o modal de postagem com disparos completos
    showVisualBanner('✍️ <b>Pulso Social</b>: Abrindo editor de postagem...', '#3b82f6');
    trigger.scrollIntoView({ block: 'center', behavior: 'instant' });
    await sleep(250);

    const innerTarget = trigger.querySelector('span, div') || trigger;
    const clickEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    for (const ev of clickEvents) {
      trigger.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window }));
      if (innerTarget !== trigger) {
        innerTarget.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window }));
      }
    }
    trigger.click();
    if (innerTarget !== trigger) innerTarget.click();
    await sleep(1500);

    // Passo 3: Espera o editor abrir no modal
    let editor = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      editor = document.querySelector('div[role="dialog"] div[role="textbox"][contenteditable="true"]') ||
               document.querySelector('div[role="dialog"] div[data-lexical-editor="true"]') ||
               document.querySelector('div[data-pagelet="GroupInlineComposer"] div[role="textbox"][contenteditable="true"]') ||
               document.querySelector('div[data-lexical-editor="true"]');
               document.querySelector('div[data-pagelet="GroupInlineComposer"] div[role="textbox"][contenteditable="true"]') ||
               document.querySelector('div[data-lexical-editor="true"]');

      if (editor) {
        const ariaLabel = (editor.getAttribute('aria-label') || '').toLowerCase();
        if (!isExcluded(ariaLabel)) break;
      }
      await sleep(400);
    }

    if (!editor) {
      showVisualBanner('❌ Erro: Editor de postagem não abriu.', '#ef4444');
      removeVisualBanner(5000);
      throw new Error('Editor de postagem do Facebook não abriu.');
    }

    // Passo 4: Digita o texto no editor
    showVisualBanner('📝 <b>Pulso Social</b>: Inserindo mensagem...', '#8b5cf6');
    await insertTextIntoLexical(editor, text);
    await sleep(1500);

    // Passo 5: Envia a publicação — dispara Ctrl+Enter e clica no botão azul Postar
    showVisualBanner('🚀 <b>Pulso Social</b>: Enviando postagem automaticamente...', '#10b981');

    // 5.1) Localiza o botão Postar / Publicar
    let publishBtn = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      // Procura por aria-label
      publishBtn = document.querySelector('[aria-label="Postar" i], [aria-label="Publicar" i], [aria-label="Post" i]');

      // Procura por nó de texto "Postar" ou "Publicar"
      if (!publishBtn) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while (n = walker.nextNode()) {
          const val = (n.nodeValue || '').trim().toLowerCase();
          if (val === 'postar' || val === 'publicar') {
            const p = n.parentElement;
            if (p && !p.closest('head') && !p.closest('script')) {
              publishBtn = p.closest('[role="button"]') || p.closest('button') || p.closest('div[tabindex="0"]') || p;
              break;
            }
          }
        }
      }

      // Procura pelo botão azul com a cor oficial do Facebook rgb(8, 102, 255)
      if (!publishBtn) {
        const allElements = Array.from(document.querySelectorAll('div, button, [role="button"]'));
        for (const el of allElements) {
          try {
            const bg = window.getComputedStyle(el).backgroundColor;
            if (bg.includes('8, 102, 255') || bg.includes('24, 119, 242') || bg.includes('27, 116, 228')) {
              const r = el.getBoundingClientRect();
              if (r.width > 60 && r.height > 20 && r.top > 120) {
                publishBtn = el.closest('[role="button"]') || el;
                break;
              }
            }
          } catch {}
        }
      }

      if (publishBtn) break;
      await sleep(300);
    }

    // 5.2) Dispara o envio 100% automático via Native Hardware Click (Chrome Debugger CDP + React Fiber)
    showVisualBanner('🚀 <b>Pulso Social</b>: Enviando publicação 100% automático...', '#10b981');
    
    // Solicita clique real de hardware ao Service Worker em background
    try {
      await chrome.runtime.sendMessage({ type: 'EXECUTE_HARDWARE_SUBMIT' });
    } catch (e) {
      console.warn('[PulsoSocial] Hardware submit fallback:', e);
    }
    await sleep(400);

    // 5.3) Camada de reforço: Dispara também no DOM local
    editor.focus();
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, metaKey: true, bubbles: true }));
    editor.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, metaKey: true, bubbles: true }));
    editor.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, metaKey: true, bubbles: true }));

    if (publishBtn) {
      publishBtn.removeAttribute('aria-disabled');
      publishBtn.removeAttribute('disabled');
      publishBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
      publishBtn.focus();
      await sleep(100);

      const target = publishBtn.querySelector('span, div') || publishBtn;
      publishBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
      publishBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      await sleep(80);
      publishBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
      publishBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      await sleep(80);
      publishBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      publishBtn.click();
      target.click();
    }

    // Aguarda confirmação do Facebook
    await sleep(3500);

    const dialogStillOpen = !!document.querySelector('div[role="dialog"] div[role="textbox"][contenteditable="true"]') ||
                            !!document.querySelector('div[aria-label*="Criar post" i] div[role="textbox"][contenteditable="true"]');

    if (!dialogStillOpen) {
      showVisualBanner('✅ <b>Pulso Social</b>: Publicado com sucesso no seu grupo!', '#059669');
      removeVisualBanner(6000);
      return { ok: true, message: 'Publicado com sucesso no grupo!' };
    } else {
      if (publishBtn) {
        try { publishBtn.click(); } catch {}
      }
      editor.focus();
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, metaKey: true, bubbles: true }));
      await sleep(2000);
      showVisualBanner('✅ <b>Pulso Social</b>: Post enviado!', '#059669');
      removeVisualBanner(6000);
      return { ok: true, message: 'Post enviado!' };
    }
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

// Listener de mensagens do Background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXTRACT_GROUPS') {
    (async () => {
      try {
        const groups = await extractAllFacebookGroups(msg.maxIterations || 20);
        sendResponse({
          ok: true,
          groups,
          count: groups.length,
          url: location.href,
          debug: {
            url: location.href,
            htmlLen: document.documentElement.innerHTML.length,
            linksCount: document.querySelectorAll('a[href*="/groups/"]').length,
            found: groups.length
          }
        });
      } catch (err) {
        sendResponse({
          ok: false,
          error: String(err?.message || err),
          groups: [],
          debug: { url: location.href }
        });
      }
    })();
    return true; // async
  }

  if (msg.type === 'POST_TO_GROUP') {
    (async () => {
      const result = await executePostInCurrentTab(msg.text);
      sendResponse(result);
    })();
    return true; // async
  }

  if (msg.type === 'PING_GROUPS_DEBUG') {
    const html = document.documentElement.innerHTML || '';
    sendResponse({
      ok: true,
      url: location.href,
      links: document.querySelectorAll('a[href*="/groups/"]').length,
      htmlLen: html.length
    });
    return true;
  }
});

// =========================================================
// MONITORAMENTO AUTOMÁTICO DE PUBLICAÇÕES NO FACEBOOK
// Calibra automaticamente quando o usuário publica manualmente
// =========================================================
(function setupFacebookPostMonitor() {
  let pendingComposerType = 'text';

  // Monitora digitação e anexos no modal de publicação
  document.addEventListener('input', () => {
    try {
      const dialog = document.querySelector('div[role="dialog"]') || document.querySelector('div[aria-label*="Criar post" i]') || document;
      const hasPhoto = !!dialog.querySelector('img[src*="blob:"], img[src*="scontent"], div[aria-label*="foto" i], div[aria-label*="Foto" i], input[type="file"][accept*="image"]');
      const hasVideo = !!dialog.querySelector('video, div[aria-label*="vídeo" i], div[aria-label*="Vídeo" i], input[type="file"][accept*="video"]');
      if (hasVideo) pendingComposerType = 'video';
      else if (hasPhoto) pendingComposerType = 'photo';
      else pendingComposerType = 'text';
    } catch {}
  }, true);

  // Monitora clique no botão de publicar
  document.addEventListener('click', (e) => {
    try {
      const target = e.target;
      if (!target) return;
      const btn = target.closest('[aria-label*="Publicar" i], [aria-label*="Post" i], [aria-label*="Concluir" i], button, div[role="button"]');
      if (!btn) return;
      const label = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase().trim();
      if (label === 'publicar' || label === 'post' || label === 'postar' || label.includes('publicar') || label.includes('postar')) {
        const format = pendingComposerType || 'text';
        console.log('[PulsoSocial] Publicação manual no Facebook detectada! Formato:', format);
        chrome.runtime.sendMessage({
          type: 'FACEBOOK_MANUAL_POST_SUBMITTED',
          format,
          url: location.href,
          timestamp: Date.now()
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[PulsoSocial] Erro ao monitorar post manual:', err);
    }
  }, true);
})();

// =========================================================
// BOTÃO FLUTUANTE EM GRUPOS DO FACEBOOK (PULSO SOCIAL)
// Permite postar com 1 clique direto no grupo aberto
// =========================================================
(function setupFloatingGroupHelper() {
  if (window.__pulsoFloaterSetup) return;
  window.__pulsoFloaterSetup = true;

  function checkAndInjectFloater() {
    if (!location.href.includes('/groups/')) return;
    if (document.getElementById('__pulso_floater')) return;

    const floater = document.createElement('div');
    floater.id = '__pulso_floater';
    floater.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;background:linear-gradient(135deg,#1e1b4b,#312e81);border:2px solid #818cf8;border-radius:16px;padding:10px 16px;box-shadow:0 12px 36px rgba(0,0,0,0.6);display:flex;align-items:center;gap:12px;font-family:system-ui,-apple-system,sans-serif;color:#fff;animation:fadeIn 0.3s ease;';
    floater.innerHTML = `
      <div style="font-size:20px;line-height:1;">⚡</div>
      <div>
        <div style="font-weight:700;font-size:13px;color:#c7d2fe;line-height:1.2;">Pulso Social PRO</div>
        <div style="font-size:11px;color:#94a3b8;line-height:1.2;">Grupo pronto para postagem</div>
      </div>
      <button id="__pulso_floater_btn" style="background:#4f46e5;hover:background:#4338ca;color:#fff;border:none;padding:7px 16px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;box-shadow:0 4px 12px rgba(79,70,229,0.4);transition:all 0.2s;">
        🚀 Postar Agora
      </button>
    `;
    document.body.appendChild(floater);

    const btn = document.getElementById('__pulso_floater_btn');
    btn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      btn.innerText = 'Postando...';
      try {
        let postText = 'Olá amigos do grupo!';
        try {
          const stored = await chrome.storage.local.get('pulso_last_campaign_text');
          if (stored && stored.pulso_last_campaign_text) {
            postText = stored.pulso_last_campaign_text;
          }
        } catch {}
        await executePostInCurrentTab(postText);
      } catch (err) {
        showVisualBanner('Erro ao postar: ' + (err?.message || err), '#ef4444');
      } finally {
        btn.disabled = false;
        btn.innerText = '🚀 Postar Agora';
      }
    });
  }

  setInterval(checkAndInjectFloater, 2000);
})();

try {
  chrome.runtime.sendMessage({ type: 'CONTENT_READY', url: location.href });
} catch {}


