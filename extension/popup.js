// Pulso Social — Extension Popup PRO v5.80.0
// Estilo visual moderno idêntico ao painel oficial

const statusEl = document.getElementById('status');
const connStatusText = document.getElementById('connStatusText');
const btnSync = document.getElementById('sync');
const btnRunCampaign = document.getElementById('runCampaign');
const btnStop = document.getElementById('stopCampaign');
const btnRefresh = document.getElementById('btnRefresh');
const btnNewCampaign = document.getElementById('btnNewCampaign');
const cardVideoTutorial = document.getElementById('cardVideoTutorial');

const apiInput = document.getElementById('apiInput');
const btnSaveApi = document.getElementById('btnSaveApi');
const btnResetApi = document.getElementById('btnResetApi');
const btnVercelApi = document.getElementById('btnVercelApi');

function setMsg(text, ok = true) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.color = ok ? '#86efac' : '#fca5a5';
}

async function getApiBase() {
  try {
    const data = await chrome.storage.local.get('pulso_api_base');
    if (data && data.pulso_api_base && data.pulso_api_base.trim()) {
      return data.pulso_api_base.trim().replace(/\/+$/, '');
    }
  } catch {}
  return 'http://localhost:3001';
}

function updateConnIndicator(url) {
  if (!connStatusText) return;
  if (url.includes('vercel.app')) {
    connStatusText.textContent = 'Nuvem (Vercel)';
    connStatusText.style.color = '#60a5fa';
  } else if (url.includes('3001') || url.includes('localhost')) {
    connStatusText.textContent = 'Local (3001)';
    connStatusText.style.color = '#818cf8';
  } else {
    connStatusText.textContent = 'Personalizada';
    connStatusText.style.color = '#34d399';
  }
}

// Inicializa o input de conexão
chrome.storage.local.get('pulso_api_base', (res) => {
  const current = res.pulso_api_base || 'http://localhost:3001';
  if (apiInput) apiInput.value = current;
  updateConnIndicator(current);
});

// Calibrador Accordion
const calibratorToggle = document.getElementById('calibratorToggle');
const calibratorContent = document.getElementById('calibratorContent');
const chevronBox = document.getElementById('chevronBox');

calibratorToggle?.addEventListener('click', () => {
  if (!calibratorContent) return;
  const isHidden = calibratorContent.style.display === 'none' || !calibratorContent.style.display;
  calibratorContent.style.display = isHidden ? 'block' : 'none';
  if (chevronBox) {
    if (isHidden) chevronBox.classList.add('open');
    else chevronBox.classList.remove('open');
  }
});

// Botão Salvar API
btnSaveApi?.addEventListener('click', async () => {
  const val = (apiInput?.value || '').trim().replace(/\/+$/, '') || 'http://localhost:3001';
  await chrome.storage.local.set({ pulso_api_base: val });
  updateConnIndicator(val);
  setMsg(`Conexão configurada: ${val}`, true);
});

// Botão Padrão 3001
btnResetApi?.addEventListener('click', async () => {
  if (apiInput) apiInput.value = 'http://localhost:3001';
  await chrome.storage.local.set({ pulso_api_base: 'http://localhost:3001' });
  updateConnIndicator('http://localhost:3001');
  setMsg('Padrão restaurado: http://localhost:3001', true);
});

// Botão Nuvem Vercel
btnVercelApi?.addEventListener('click', async () => {
  const vercelUrl = 'https://postador-social.vercel.app';
  if (apiInput) apiInput.value = vercelUrl;
  await chrome.storage.local.set({ pulso_api_base: vercelUrl });
  updateConnIndicator(vercelUrl);
  setMsg('Nuvem conectada: ' + vercelUrl, true);
});

// Abrir Painel Nuvem (Top nav external link)
document.getElementById('openVercelPanel')?.addEventListener('click', async () => {
  const vercelUrl = 'https://postador-social.vercel.app';
  if (apiInput) apiInput.value = vercelUrl;
  await chrome.storage.local.set({ pulso_api_base: vercelUrl });
  updateConnIndicator(vercelUrl);
  chrome.tabs.create({ url: vercelUrl, active: true });
});

// Abrir Painel Local (Top nav monitor icon)
document.getElementById('openLocalPanel')?.addEventListener('click', async () => {
  const localUrl = 'http://localhost:3001';
  if (apiInput) apiInput.value = localUrl;
  await chrome.storage.local.set({ pulso_api_base: localUrl });
  updateConnIndicator(localUrl);
  chrome.tabs.create({ url: 'http://localhost:5174', active: true });
});

// Navegação entre abas superiores
async function openTabRoute(route) {
  const apiBase = await getApiBase();
  const isCloud = apiBase.includes('vercel.app');
  const baseWeb = isCloud ? 'https://postador-social.vercel.app' : 'http://localhost:5174';
  chrome.tabs.create({ url: `${baseWeb}/${route}`, active: true });
}

document.getElementById('tabPostador')?.addEventListener('click', () => {
  setMsg('Você está no Postador PRO.', true);
});

document.getElementById('tabEngajador')?.addEventListener('click', () => {
  openTabRoute('engajador');
});

document.getElementById('tabWarmer')?.addEventListener('click', () => {
  openTabRoute('aquecedores');
});

document.getElementById('tabLibrary')?.addEventListener('click', () => {
  openTabRoute('biblioteca');
});

document.getElementById('tabPlans')?.addEventListener('click', () => {
  openTabRoute('planos');
});

document.getElementById('tabAccounts')?.addEventListener('click', () => {
  openTabRoute('configuracoes');
});

document.getElementById('btnTutorials')?.addEventListener('click', () => {
  openTabRoute('tutoriais');
});

document.getElementById('btnSupport')?.addEventListener('click', () => {
  openTabRoute('suporte');
});

document.getElementById('btnHelp')?.addEventListener('click', () => {
  openTabRoute('tutoriais');
});

cardVideoTutorial?.addEventListener('click', () => {
  openTabRoute('tutoriais');
});

// Botão Atualizar (Refresh)
btnRefresh?.addEventListener('click', async () => {
  setMsg('Verificando conexão com o painel...', true);
  try {
    const apiBase = await getApiBase();
    const res = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(4000) });
    const json = await res.json();
    if (json.status === 'ok') {
      setMsg(`✓ Conexão ativa com ${apiBase} (v${json.version || '5.80.0'})`, true);
    } else {
      setMsg(`Conectado, mas resposta inesperada de ${apiBase}`, false);
    }
  } catch (err) {
    setMsg('Aviso: API offline ou não respondendo. Verifique se o servidor está ativo.', false);
  }
});

// Botão Nova Campanha
btnNewCampaign?.addEventListener('click', () => {
  openTabRoute('postador');
});

// Sincronizar grupos do Facebook
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
          setMsg(`Detectados ${groups.length} grupos, mas ocorreu erro no backend: ${syncJson.error || 'Erro'}`, false);
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

// Disparar Postagem
btnRunCampaign?.addEventListener('click', async () => {
  setMsg('Consultando campanha ativa no painel...', true);
  if (btnRunCampaign) btnRunCampaign.disabled = true;

  try {
    const apiBase = await getApiBase();
    let campRes = await fetch(`${apiBase}/api/campaigns`).then(r => r.json()).catch(() => null);
    const campaigns = campRes?.data || [];
    const activeCamp = campaigns.find(c => c.status === 'RUNNING') || campaigns[0];
    if (!activeCamp) {
      throw new Error('Nenhuma campanha encontrada no painel. Clique em "Nova Campanha" para criar.');
    }

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

// Parar Postagens
btnStop?.addEventListener('click', async () => {
  setMsg('🛑 Interrompendo todos os disparos agora...', false);
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_CAMPAIGN' });
    setMsg('🛑 Disparos INTERROMPIDOS com sucesso!', false);
  } catch (err) {
    setMsg('Parado.', false);
  }
});
