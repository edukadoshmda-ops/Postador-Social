// Pulso Social — Extension Popup v5.80.0
const statusEl = document.getElementById('status');
const btnSync = document.getElementById('sync');
const btnOpenJoins = document.getElementById('openJoins');
const btnOpenPanel = document.getElementById('openPanel');

function setMsg(text, ok = true) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.color = ok ? '#86efac' : '#fca5a5';
}

const apiInput = document.getElementById('apiInput');
const btnSaveApi = document.getElementById('btnSaveApi');
const btnResetApi = document.getElementById('btnResetApi');

async function getApiBase() {
  try {
    const data = await chrome.storage.local.get('pulso_api_base');
    if (data && data.pulso_api_base && data.pulso_api_base.trim()) {
      return data.pulso_api_base.trim().replace(/\/+$/, '');
    }
  } catch {}
  return 'http://localhost:3001';
}

// Inicializa o input com a URL salva
chrome.storage.local.get('pulso_api_base', (res) => {
  if (apiInput && res.pulso_api_base) {
    apiInput.value = res.pulso_api_base;
  }
});

btnSaveApi?.addEventListener('click', async () => {
  const val = (apiInput?.value || '').trim().replace(/\/+$/, '');
  await chrome.storage.local.set({ pulso_api_base: val });
  setMsg(val ? `URL configurada: ${val}` : 'Usando padrão local.', true);
});

btnResetApi?.addEventListener('click', async () => {
  if (apiInput) apiInput.value = 'http://localhost:3001';
  await chrome.storage.local.set({ pulso_api_base: 'http://localhost:3001' });
  setMsg('Restaurado para Localhost.', true);
});

btnOpenJoins?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.facebook.com/groups/joins', active: true });
});

btnOpenPanel?.addEventListener('click', async () => {
  const base = await getApiBase();
  let targetUrl = base;
  if (targetUrl.includes(':3001')) {
    targetUrl = targetUrl.replace(':3001', ':5174');
  }
  chrome.tabs.create({ url: targetUrl, active: true });
});

btnSync?.addEventListener('click', async () => {
  setMsg('Varrendo e extraindo grupos do Facebook...', true);
  if (btnSync) btnSync.disabled = true;

  try {
    const res = await chrome.runtime.sendMessage({ type: 'SYNC_GROUPS' });
    if (!res || !res.ok) {
      throw new Error(res?.error || 'Falha ao sincronizar com o Facebook');
    }

    const groups = res.groups || [];
    const count = groups.length;
    const via = res.via || 'extensão';

    if (count === 0) {
      setMsg('Nenhum grupo detectado. Certifique-se de estar logado no Facebook em uma aba do Chrome.', false);
      if (btnSync) btnSync.disabled = false;
      return;
    }

    setMsg(`${count} grupos detectados via ${via}! Salvando no painel...`, true);

    // Envia ao backend (Nuvem ou Local)
    try {
      const apiBase = await getApiBase();
      const listsRes = await fetch(`${apiBase}/api/groups/lists`);
      const listsJson = await listsRes.json();
      const lists = listsJson.data || listsJson || [];
      let targetListId = lists[0]?.id;

      if (!targetListId) {
        const createRes = await fetch(`${apiBase}/api/groups/lists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Grupos Sincronizados (Facebook)',
            description: 'Grupos sincronizados automaticamente via extensão oficial',
            platform: 'FACEBOOK'
          })
        });
        const createJson = await createRes.json();
        targetListId = createJson.data?.id || createJson.id;
      }

      if (targetListId) {
        const syncRes = await fetch(`${apiBase}/api/groups/lists/${targetListId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groups })
        });
        const syncJson = await syncRes.json();

        if (syncJson.success) {
          setMsg(`✓ Sucesso! ${syncJson.data.added} novos grupos adicionados (${syncJson.data.total} no total da lista)!`, true);
        } else {
          setMsg(`Detectados ${count} grupos, mas ocorreu erro no backend: ${syncJson.error || 'Erro'}`, false);
        }
      }
    } catch (apiErr) {
      setMsg(`Encontrados ${count} grupos, mas a API não respondeu. Verifique a URL do painel.`, false);
    }
  } catch (err) {
    setMsg('Erro: ' + (err?.message || err), false);
  } finally {
    if (btnSync) btnSync.disabled = false;
  }
});

const btnRunCampaign = document.getElementById('runCampaign');
btnRunCampaign?.addEventListener('click', async () => {
  setMsg('Consultando campanha ativa no painel...', true);
  if (btnRunCampaign) btnRunCampaign.disabled = true;

  try {
    const apiBase = await getApiBase();
    // 1. Busca campanhas do backend
    let campRes = await fetch(`${apiBase}/api/campaigns`).then(r => r.json()).catch(() => null);
    const campaigns = campRes?.data || [];
    const activeCamp = campaigns.find(c => c.status === 'RUNNING') || campaigns[0];
    if (!activeCamp) {
      throw new Error('Nenhuma campanha encontrada no painel. Abra o painel e crie uma campanha primeiro.');
    }

    // 2. Busca grupos vinculados
    let itemsRes = await fetch(`${apiBase}/api/campaigns/${activeCamp.id}/items`).then(r => r.json()).catch(() => null);
    let items = itemsRes?.data || [];
    if (!items.length) {
      throw new Error(`A campanha "${activeCamp.name}" não possui grupos cadastrados.`);
    }

    let targets = items.filter(it => it.status === 'QUEUED' || it.status === 'IN_PROGRESS');
    if (!targets.length) targets = items;

    setMsg(`Iniciando disparos para ${targets.length} grupos da campanha "${activeCamp.name}"...`, true);

    const res = await chrome.runtime.sendMessage({
      type: 'START_FULL_CAMPAIGN',
      campaign: activeCamp,
      items: targets
    });

    if (!res || !res.ok) {
      throw new Error(res?.error || 'Erro ao comunicar com o processo de segundo plano');
    }

    setMsg(`🚀 Campanha em execução! Postando em ${targets.length} grupos automaticamente. Acompanhe as abas do Facebook.`, true);
  } catch (err) {
    setMsg('Erro: ' + (err?.message || err), false);
  } finally {
    if (btnRunCampaign) btnRunCampaign.disabled = false;
  }
});

const btnStop = document.getElementById('stopCampaign');
btnStop?.addEventListener('click', async () => {
  setMsg('🛑 Interrompendo todos os disparos agora...', false);
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_CAMPAIGN' });
    setMsg('🛑 Disparos INTERROMPIDOS com sucesso!', false);
  } catch (err) {
    setMsg('Parado.', false);
  }
});

