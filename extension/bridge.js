// Pulso Social — Bridge v5.80.0
// Conecta o frontend em localhost:5174 com a extensão oficial

(function () {
  if (window.__pulsoBridgeInstalled) return;
  window.__pulsoBridgeInstalled = true;

  // Responde imediatamente se o bridge está ativo
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // 1) Ping para checar se extensão está presente
    if (data.type === 'PULSO_PING_EXTENSION') {
      const requestId = data.requestId || '';
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'PING_EXT' }, (res) => {
            const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
            window.postMessage({
              type: 'PULSO_PONG_EXTENSION',
              requestId,
              installed: !!(res && res.installed),
              version: res?.version || '5.80.0',
              error: err
            }, '*');
          });
        } else {
          window.postMessage({ type: 'PULSO_PONG_EXTENSION', requestId, installed: false }, '*');
        }
      } catch (e) {
        window.postMessage({ type: 'PULSO_PONG_EXTENSION', requestId, installed: false, error: String(e?.message || e) }, '*');
      }
      return;
    }

    // 2) Requisição de sincronização de grupos
    if (data.type === 'PULSO_SYNC_REQUEST') {
      const requestId = data.requestId || '';
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'SYNC_GROUPS' }, (res) => {
            const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
            window.postMessage({
              type: 'PULSO_SYNC_RESPONSE',
              requestId,
              ok: !!(res && res.ok),
              groups: res?.groups || [],
              count: res?.count || (res?.groups ? res.groups.length : 0),
              via: res?.via || (err ? 'erro: ' + err : 'extensao'),
              session: res?.session || null,
              debug: res?.debug || null,
              error: res?.error || err || null
            }, '*');
          });
        } else {
          window.postMessage({
            type: 'PULSO_SYNC_RESPONSE',
            requestId,
            ok: false,
            groups: [],
            error: 'Extensão não instalada ou não carregada nesta aba'
          }, '*');
        }
      } catch (e) {
        window.postMessage({
          type: 'PULSO_SYNC_RESPONSE',
          requestId,
          ok: false,
          groups: [],
          error: String(e?.message || e)
        }, '*');
      }
      return;
    }

    // 3) Início de campanha completa
    if (data.type === 'PULSO_START_CAMPAIGN' || data.type === 'START_FULL_CAMPAIGN') {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'START_FULL_CAMPAIGN',
            ...(data.payload || data)
          }, (res) => {
            window.postMessage({
              type: 'PULSO_START_CAMPAIGN_RESPONSE',
              requestId: data.requestId || '',
              ok: !!(res && res.ok),
              data: res
            }, '*');
          });
        }
      } catch (e) {
        window.postMessage({ type: 'PULSO_START_CAMPAIGN_RESPONSE', ok: false, error: String(e?.message || e) }, '*');
      }
      return;
    }

    // 4) Início do engajador
    if (data.type === 'PULSO_ENGAGER_START') {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'START_ENGAGER',
            ...data
          }, (res) => {
            window.postMessage({
              type: 'PULSO_ENGAGER_RESPONSE',
              ok: !!(res && res.ok),
              data: res
            }, '*');
          });
        }
      } catch (e) {}
      return;
    }

    // 5) Início do aquecedor de navegador
    if (data.type === 'PULSO_BROWSER_WARMER_START') {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'START_WARMER',
            ...data
          }, (res) => {
            window.postMessage({
              type: 'PULSO_WARMER_RESPONSE',
              ok: !!(res && res.ok),
              data: res
            }, '*');
          });
        }
      } catch (e) {}
      return;
    }
  });

  // Avisa ao frontend que o bridge está carregado
  window.postMessage({ type: 'PULSO_BRIDGE_READY', version: '5.80.0' }, '*');
})();
