// Pulso Social — Background Service Worker v5.80.0
async function getApiBase() {
  try {
    const data = await chrome.storage.local.get('pulso_api_base');
    if (data && data.pulso_api_base && data.pulso_api_base.trim()) {
      return data.pulso_api_base.trim().replace(/\/+$/, '');
    }
  } catch {}
  return 'https://postador-two.vercel.app';
}

async function captureFacebookSession() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: '.facebook.com' });
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const cUser = cookies.find(c => c.name === 'c_user')?.value || '';
    return { cookieStr, cUser, count: cookies.length };
  } catch (e) {
    return null;
  }
}

async function ensureContentScriptInjected(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'PING_GROUPS_DEBUG' }).catch(() => null);
    if (ping && ping.ok) return true;
  } catch {}

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    await new Promise(r => setTimeout(r, 600));
    return true;
  } catch (err) {
    console.warn('[PulsoSocial] Error injecting content.js:', err);
    return false;
  }
}

async function extractViaTab(tabId, maxIterations = 20) {
  try {
    await ensureContentScriptInjected(tabId);
    const resp = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_GROUPS', maxIterations });
    if (resp && Array.isArray(resp.groups)) {
      return { groups: resp.groups, via: 'content-script', debug: resp.debug };
    }
  } catch (e) {
    console.warn('[PulsoSocial] extractViaTab sendMessage failed:', e);
  }

  return { groups: [], via: 'none', debug: { error: 'extract-failed' } };
}

async function waitForTabToLoad(tabId, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }, timeoutMs);

    const listener = (id, changeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          // Pequena pausa para hydration do React do Facebook
          setTimeout(resolve, 1500);
        }
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function handleSyncRequest(msg, sender, sendResponse) {
  try {
    const session = await captureFacebookSession();
    let groups = [];
    let via = 'none';
    let debug = {
      senderOrigin: sender.origin || sender.url || 'unknown',
      senderTabUrl: sender.tab?.url || null
    };

    // 1) Se a mensagem partiu de uma aba do Facebook, extrai dela diretamente
    if (sender.tab?.id && sender.tab?.url && sender.tab.url.includes('facebook.com')) {
      const r = await extractViaTab(sender.tab.id, 20);
      if (r.groups && r.groups.length > 0) {
        groups = r.groups;
        via = 'tab-direta';
        debug.tabId = sender.tab.id;
        debug.extractedCount = groups.length;
      }
    }

    // 2) Se não achou ainda, procura abas existentes do Facebook
    if (groups.length === 0) {
      const tabs = await chrome.tabs.query({ url: ['https://*.facebook.com/*'] });
      
      // Prioriza abas que já estão em /groups/joins ou /groups/
      const sortedTabs = [...tabs].sort((a, b) => {
        const score = (t) => {
          const u = t.url || '';
          if (u.includes('/groups/joins')) return 5;
          if (u.includes('/groups/discover')) return 4;
          if (u.includes('/groups')) return 3;
          if (t.active) return 2;
          return 1;
        };
        return score(b) - score(a);
      });

      if (sortedTabs.length > 0) {
        let bestTab = sortedTabs[0];
        
        // Se a melhor aba não estiver em /groups/joins, navega ela até lá para listar todos
        if (!bestTab.url?.includes('/groups/joins')) {
          await chrome.tabs.update(bestTab.id, { url: 'https://www.facebook.com/groups/joins' });
          await waitForTabToLoad(bestTab.id);
        }

        const r = await extractViaTab(bestTab.id, 25);
        if (r.groups && r.groups.length > 0) {
          groups = r.groups;
          via = 'aba-facebook';
          debug.tabId = bestTab.id;
          debug.tabUrl = bestTab.url;
          debug.extractedCount = groups.length;
        }
      }
    }

    // 3) Se ainda não tem grupos e não havia aba aberta, abre uma aba em segundo plano
    if (groups.length === 0) {
      try {
        const newTab = await chrome.tabs.create({
          url: 'https://www.facebook.com/groups/joins',
          active: false
        });
        await waitForTabToLoad(newTab.id, 10000);
        const r = await extractViaTab(newTab.id, 25);
        if (r.groups && r.groups.length > 0) {
          groups = r.groups;
          via = 'aba-autoaberta';
          debug.tabId = newTab.id;
          debug.extractedCount = groups.length;
        }
      } catch (err) {
        console.warn('[PulsoSocial] Auto-open tab error:', err);
      }
    }

    // Se capturou sessão, envia para o backend
    if (session?.cookieStr) {
      const apiBase = await getApiBase();
      fetch(`${apiBase}/api/accounts/sync-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: session.cookieStr, c_user: session.cUser })
      }).catch(() => {});
    }

    sendResponse({
      ok: true,
      groups,
      count: groups.length,
      session,
      via,
      debug
    });
  } catch (err) {
    sendResponse({
      ok: false,
      error: String(err?.message || err),
      groups: []
    });
  }
}

let currentActiveTabId = null;
let isCampaignRunning = false;
let shouldAbortCampaign = false;

function stopAllPosting() {
  console.log('[PulsoSocial] Interrompendo disparos imediatamente.');
  isCampaignRunning = false;
  shouldAbortCampaign = true;
  if (currentActiveTabId) {
    try { chrome.tabs.remove(currentActiveTabId); } catch {}
    currentActiveTabId = null;
  }
}

async function executePostForGroup(groupId, text) {
  let tab = null;
  try {
    const url = `https://www.facebook.com/groups/${groupId}`;
    tab = await chrome.tabs.create({ url, active: true });
    currentActiveTabId = tab.id;
    await waitForTabToLoad(tab.id, 9000);

    if (shouldAbortCampaign || !isCampaignRunning) {
      if (tab && tab.id) chrome.tabs.remove(tab.id).catch(() => {});
      return { ok: false, error: 'Cancelado pelo usuário' };
    }

    await ensureContentScriptInjected(tab.id);
    await new Promise(r => setTimeout(r, 1500));

    const res = await chrome.tabs.sendMessage(tab.id, { type: 'POST_TO_GROUP', text });

    // FECHA A ABA AUTOMATICAMENTE APÓS POSTAR (3 segundos de segurança)
    await new Promise(r => setTimeout(r, 3000));
    if (tab && tab.id) {
      try { await chrome.tabs.remove(tab.id); } catch {}
      currentActiveTabId = null;
    }

    return res || { ok: false, error: 'Sem resposta da aba' };
  } catch (err) {
    if (tab && tab.id) {
      try { await chrome.tabs.remove(tab.id); } catch {}
      currentActiveTabId = null;
    }
    return { ok: false, error: String(err?.message || err) };
  }
}

async function executeFullCampaign(msg, sendResponse) {
  try {
    stopAllPosting();
    await new Promise(r => setTimeout(r, 100));
    shouldAbortCampaign = false;
    isCampaignRunning = true;

    let activeCamp = msg?.campaign;
    let targets = msg?.items;
    const apiBase = await getApiBase();

    if (!activeCamp || !targets || !targets.length) {
      const campRes = await fetch(`${apiBase}/api/campaigns`).then(r => r.json()).catch(() => null);
      const campaigns = campRes?.data || [];
      activeCamp = campaigns.find(c => c.status === 'RUNNING') || campaigns[0];
      if (!activeCamp) {
        sendResponse({ ok: false, error: 'Nenhuma campanha encontrada no painel.' });
        return;
      }
      const itemsRes = await fetch(`${apiBase}/api/campaigns/${activeCamp.id}/items`).then(r => r.json()).catch(() => null);
      const items = itemsRes?.data || [];
      targets = items.filter(it => it.status === 'QUEUED' || it.status === 'IN_PROGRESS');
      if (!targets.length) targets = items;
    }

    if (!targets || !targets.length) {
      sendResponse({ ok: false, error: 'Nenhum grupo encontrado nesta campanha.' });
      return;
    }

    sendResponse({ ok: true, total: targets.length, campaignName: activeCamp.name });

    // Loop assíncrono que posta grupo por grupo com checagem de parada
    (async () => {
      for (let i = 0; i < targets.length; i++) {
        if (shouldAbortCampaign || !isCampaignRunning) {
          console.log('[PulsoSocial] Loop interrompido pelo usuário.');
          break;
        }

        // Checa se a campanha foi excluída ou cancelada no backend
        const check = await fetch(`${apiBase}/api/campaigns`).then(r => r.json()).catch(() => null);
        const currentCamp = check?.data?.find(c => c.id === activeCamp.id);
        if (!currentCamp || currentCamp.status === 'CANCELLED' || currentCamp.status === 'PAUSED' || currentCamp.status === 'COMPLETED') {
          console.log('[PulsoSocial] Campanha cancelada ou removida do painel. Parando loop.');
          stopAllPosting();
          break;
        }

        const item = targets[i];
        const rawText = activeCamp.content_text || 'Olá amigos!';
        const text = rawText.replace(/\{([^{}]+)\}/g, (_, choices) => {
          const arr = choices.split('|');
          return arr[Math.floor(Math.random() * arr.length)];
        });

        console.log(`[PulsoSocial] Postando no grupo ${i + 1}/${targets.length}: ${item.group_name} (${item.group_id})`);
        
        try {
          const res = await executePostForGroup(item.group_id, text);
          
          await fetch(`${apiBase}/api/campaigns/${activeCamp.id}/item-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              groupId: item.group_id,
              status: (res && res.ok) ? 'PUBLISHED' : 'FAILED',
              error: res?.error || null
            })
          }).catch(() => {});
        } catch (postErr) {
          console.error('[PulsoSocial] Erro no post:', postErr);
        }

        if (shouldAbortCampaign || !isCampaignRunning) break;

        // Intervalo de segurança anti-ban entre postagens (15 a 25 segundos)
        if (i < targets.length - 1) {
          const waitTime = Math.floor(15000 + Math.random() * 10000);
          for (let w = 0; w < waitTime / 1000; w++) {
            if (shouldAbortCampaign || !isCampaignRunning) break;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
      isCampaignRunning = false;
    })();
  } catch (err) {
    isCampaignRunning = false;
    sendResponse({ ok: false, error: String(err?.message || err) });
  }
}

async function executeHardwareSubmit(tabId) {
  try {
    console.log('[PulsoSocial] Iniciando envio 100% automático com clique nativo no tab:', tabId);
    
    // 1) Localiza as coordenadas reais do botão Postar dentro da aba
    const evalRes = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        let btn = document.querySelector('[aria-label="Postar" i], [aria-label="Publicar" i], [aria-label="Post" i]');
        if (!btn) {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n;
          while (n = walker.nextNode()) {
            const val = (n.nodeValue || '').trim().toLowerCase();
            if (val === 'postar' || val === 'publicar') {
              const p = n.parentElement;
              if (p && !p.closest('head') && !p.closest('script')) {
                btn = p.closest('[role="button"]') || p.closest('button') || p.closest('div[tabindex="0"]') || p;
                break;
              }
            }
          }
        }
        if (!btn) {
          const clickables = Array.from(document.querySelectorAll('div, button, [role="button"]'));
          for (const el of clickables) {
            try {
              const bg = window.getComputedStyle(el).backgroundColor;
              if (bg.includes('8, 102, 255') || bg.includes('24, 119, 242') || bg.includes('27, 116, 228')) {
                const r = el.getBoundingClientRect();
                if (r.width > 60 && r.height > 20 && r.top > 120) {
                  btn = el.closest('[role="button"]') || el;
                  break;
                }
              }
            } catch {}
          }
        }
        if (btn) {
          btn.scrollIntoView({ block: 'center', behavior: 'instant' });
          const rect = btn.getBoundingClientRect();
          return {
            found: true,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          };
        }
        return { found: false, x: 0, y: 0 };
      }
    }).catch(() => [{ result: null }]);

    const result = evalRes && evalRes[0] ? evalRes[0].result : null;

    // 2) Tenta via Chrome Debugger (Clique e Teclado com isTrusted=true de Hardware!)
    let debuggerAttached = false;
    try {
      await chrome.debugger.attach({ tabId }, '1.3');
      debuggerAttached = true;
    } catch (debErr) {
      console.warn('[PulsoSocial] Debugger attach aviso:', debErr);
    }

    if (debuggerAttached) {
      try {
        if (result && result.found && result.x > 0 && result.y > 0) {
          console.log('[PulsoSocial] Disparando clique físico de mouse nativo nas coordenadas:', result.x, result.y);
          await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: result.x,
            y: result.y
          });
          await new Promise(r => setTimeout(r, 80));
          await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: result.x,
            y: result.y,
            button: 'left',
            clickCount: 1
          });
          await new Promise(r => setTimeout(r, 120));
          await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: result.x,
            y: result.y,
            button: 'left'
          });
        }

        console.log('[PulsoSocial] Disparando Ctrl+Enter nativo via hardware...');
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'rawKeyDown',
          windowsVirtualKeyCode: 13,
          unmodifiedText: '\r',
          text: '\r',
          modifiers: 2 // Ctrl
        });
        await new Promise(r => setTimeout(r, 100));
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyUp',
          windowsVirtualKeyCode: 13,
          modifiers: 2
        });
      } finally {
        try { await chrome.debugger.detach({ tabId }); } catch {}
      }
    }

    // 3) Camada de reforço: Dispara no contexto MAIN do Facebook (React Fiber)
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        let b = document.querySelector('[aria-label="Postar" i], [aria-label="Publicar" i], [aria-label="Post" i]');
        if (!b) {
          b = Array.from(document.querySelectorAll('[role="button"], button')).find(el => {
            const t = (el.innerText || '').trim().toLowerCase();
            return t === 'postar' || t === 'publicar';
          });
        }
        if (b) {
          const propKey = Object.keys(b).find(k => k.startsWith('__reactProps$'));
          if (propKey && b[propKey]) {
            if (typeof b[propKey].onClick === 'function') {
              try { b[propKey].onClick({ preventDefault() {}, stopPropagation() {} }); } catch {}
            }
            if (typeof b[propKey].onPress === 'function') {
              try { b[propKey].onPress({ preventDefault() {}, stopPropagation() {} }); } catch {}
            }
          }
          b.click();
        }
      }
    }).catch(() => {});

    return { ok: true };
  } catch (err) {
    console.error('[PulsoSocial] Erro em executeHardwareSubmit:', err);
    return { ok: false, error: String(err?.message || err) };
  }
}

// Listener de mensagens internas (da popup ou content scripts)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXECUTE_HARDWARE_SUBMIT') {
    const tabId = sender.tab?.id || msg.tabId;
    if (tabId) {
      executeHardwareSubmit(tabId).then(sendResponse);
      return true; // async
    }
    sendResponse({ ok: false, error: 'TabId não encontrado' });
    return false;
  }
  if (msg.type === 'STOP_CAMPAIGN') {
    stopAllPosting();
    sendResponse({ ok: true, stopped: true });
    return false;
  }
  if (msg.type === 'SYNC_GROUPS') {
    handleSyncRequest(msg, sender, sendResponse);
    return true; // async
  }
  if (msg.type === 'EXECUTE_POST') {
    (async () => {
      const res = await executePostForGroup(msg.groupId, msg.text);
      sendResponse(res);
    })();
    return true; // async
  }
  if (msg.type === 'START_FULL_CAMPAIGN') {
    executeFullCampaign(msg, sendResponse);
    return true; // async
  }
  if (msg.type === 'PING') {
    sendResponse({ ok: true, version: '5.80.0' });
    return false;
  }
  if (msg.type === 'PING_EXT') {
    sendResponse({ ok: true, installed: true, version: '5.80.0' });
    return false;
  }
  return false;
});

// Listener de mensagens externas (do painel web localhost:5174 via window/bridge)
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SYNC_GROUPS' || msg.type === 'PING_EXT') {
      handleSyncRequest(msg, sender, sendResponse);
      return true; // async
    }
    if (msg.type === 'EXECUTE_POST') {
      (async () => {
        const res = await executePostForGroup(msg.groupId, msg.text);
        sendResponse(res);
      })();
      return true; // async
    }
    if (msg.type === 'PING') {
      sendResponse({ ok: true, version: '5.80.0' });
      return false;
    }
    return false;
  });
}

// Sincronização periódica de cookies
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pulso_sync') {
    const session = await captureFacebookSession();
    if (session?.cookieStr) {
      const apiBase = await getApiBase();
      fetch(`${apiBase}/api/accounts/sync-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: session.cookieStr, c_user: session.cUser })
      }).catch(() => {});
    }
  }
});

try {
  chrome.alarms.create('pulso_sync', { periodInMinutes: 30 });
} catch {}

