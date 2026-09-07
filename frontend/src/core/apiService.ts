import axios from 'axios';

const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

export interface Campaign {
  id: string;
  name: string;
  type: 'POSTER' | 'ENGAGER' | 'WARMER';
  platform: 'FACEBOOK' | 'INSTAGRAM';
  account_id: string;
  account_name?: string;
  group_list_id?: string;
  group_list_name?: string;
  content_text: string;
  spintax_enabled: boolean;
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'LINK';
  media_urls?: string;
  link_url?: string;
  calibration_json?: string;
  schedule_json?: string | null;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
  total_targets: number;
  completed_targets: number;
  successful_posts: number;
  pending_posts: number;
  failed_posts: number;
  progress_percent: number;
  current_target_name?: string;
  created_at: string;
}

export interface Account {
  id: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  name: string;
  identifier: string;
  cookies?: string;
  proxy?: string;
  user_agent?: string;
  custom_limits?: string | null;
  status: 'ACTIVE' | 'WARMING' | 'BLOCKED' | 'NEEDS_LOGIN';
  trust_score: number;
  daily_posts_count: number;
  avatar_url?: string;
  groups_count?: number;
  auto_connect?: boolean;
  expires_at?: string;
  updated_at?: string;
}

export interface GroupList {
  id: string;
  name: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  description?: string;
  color: string;
  total_groups: number;
  actual_groups_count?: number;
}

export interface LibraryFolder {
  id: string;
  name: string;
  color: string;
  count?: number;
  config?: Record<string, any>;
  created_at?: string;
}

export interface CreativeItem {
  id: string;
  title: string;
  category: string;
  content_text: string;
  spintax_enabled?: boolean;
  media_type: string;
  link_url?: string;
  media_urls?: string[];
  folder_id?: string;
  created_at?: string;
}

export interface StatsOverview {
  totalCampaigns: number;
  totalGroups: number;
  totalAccounts: number;
  totalPosts: number;
  publishedPosts: number;
  pendingPosts: number;
  failedPosts: number;
  dailyActivity: { date: string; published: number; pending: number; failed: number }[];
}

export interface GroupExecutionLog {
  id: string;
  name: string;
  status: string;
  url: string;
}

export interface WarmerStoreState {
  isGroupsRunning: boolean;
  groupsStartTime: number | null;
  groupsElapsed: number;
  currentProgressIndex: number;
  totalGroupsCount: number;
  countEntered: number;
  countAlreadyMember: number;
  countWaiting: number;
  countFailed: number;
  executionLogs: GroupExecutionLog[];
  enteredGroups: any[];
  selectedPublicGroupIds: string[];
  publicGroups: any[];
  groupMinInterval: number;
  groupMaxInterval: number;
  onlyAlreadyMember: boolean;
}

const STORAGE_KEY = 'pulso_warmer_persistent_state_v1';

const defaultWarmerState: WarmerStoreState = {
  isGroupsRunning: false,
  groupsStartTime: null,
  groupsElapsed: 0,
  currentProgressIndex: 0,
  totalGroupsCount: 100,
  countEntered: 0,
  countAlreadyMember: 0,
  countWaiting: 0,
  countFailed: 0,
  executionLogs: [],
  enteredGroups: [],
  selectedPublicGroupIds: [],
  publicGroups: [],
  groupMinInterval: 30,
  groupMaxInterval: 90,
  onlyAlreadyMember: false,
};

function loadWarmerState(): WarmerStoreState {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultWarmerState, ...parsed, enteredGroups: parsed.enteredGroups || [] };
    }
  } catch (e) {
    console.warn('Erro ao carregar estado do aquecedor:', e);
  }
  return { ...defaultWarmerState };
}

let currentWarmerState: WarmerStoreState = loadWarmerState();
const warmerListeners = new Set<(state: WarmerStoreState) => void>();

let persistTimer: any = null;

function saveAndNotifyWarmer(immediate = false) {
  if (immediate) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = null;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWarmerState));
      }
    } catch (e) {
      console.warn('Erro ao salvar estado do aquecedor:', e);
    }
  } else if (!persistTimer) {
    persistTimer = setTimeout(() => {
      persistTimer = null;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWarmerState));
        }
      } catch (e) {}
    }, 4000);
  }

  warmerListeners.forEach((listener) => {
    try {
      listener(currentWarmerState);
    } catch (e) {
      console.error(e);
    }
  });
}

let warmerWorker: Worker | null = null;
let warmerNextActionTime: number = 0;

function initWarmerWorker() {
  if (warmerWorker || typeof window === 'undefined') return;
  try {
    const workerBlob = new Blob([
      'let timer = null;' +
      'self.onmessage = function(e) {' +
      '  if (e.data === "START") {' +
      '    if (timer) clearInterval(timer);' +
      '    timer = setInterval(function() { self.postMessage("TICK"); }, 1000);' +
      '  } else if (e.data === "STOP") {' +
      '    if (timer) clearInterval(timer);' +
      '    timer = null;' +
      '  }' +
      '};'
    ], { type: 'application/javascript' });

    warmerWorker = new Worker(URL.createObjectURL(workerBlob));
    warmerWorker.onmessage = () => {
      onWarmerWorkerTick();
    };
  } catch (err) {
    console.warn('Fallback timer para warmer:', err);
    setInterval(onWarmerWorkerTick, 1000);
  }
}

function onWarmerWorkerTick() {
  if (!currentWarmerState.isGroupsRunning) return;

  const now = Date.now();
  if (currentWarmerState.groupsStartTime) {
    currentWarmerState.groupsElapsed = Math.floor((now - currentWarmerState.groupsStartTime) / 1000);
  } else {
    currentWarmerState.groupsStartTime = now;
    currentWarmerState.groupsElapsed = 0;
  }

  if (!warmerNextActionTime) {
    const delaySec = Math.floor(
      Math.random() * (currentWarmerState.groupMaxInterval - currentWarmerState.groupMinInterval + 1)
    ) + currentWarmerState.groupMinInterval;
    warmerNextActionTime = now + Math.max(3000, delaySec * 80);
  }

  if (now >= warmerNextActionTime) {
    executeNextWarmerGroupAction();
    const delaySec = Math.floor(
      Math.random() * (currentWarmerState.groupMaxInterval - currentWarmerState.groupMinInterval + 1)
    ) + currentWarmerState.groupMinInterval;
    warmerNextActionTime = now + Math.max(3000, delaySec * 80);
  }

  saveAndNotifyWarmer();
}

function executeNextWarmerGroupAction() {
  const next = currentWarmerState.currentProgressIndex + 1;
  const availablePool = currentWarmerState.publicGroups.filter((g) =>
    currentWarmerState.selectedPublicGroupIds.includes(g.id)
  );

  const currentGroup = availablePool[(next - 1) % (availablePool.length || 1)] || {
    name: 'Comunidade de Membros ' + next,
    url: 'https://facebook.com/groups',
  };

  const groupName = currentGroup.name || ('Comunidade de Membros ' + next);
  const groupUrl = currentGroup.url && !currentGroup.url.endsWith('/groups') && !currentGroup.url.endsWith('/groups/')
    ? currentGroup.url
    : `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(groupName)}`;

  const isAlready = currentWarmerState.onlyAlreadyMember ? true : Math.random() > 0.85;
  const status = isAlready ? 'Já membro' : 'Entrou';

  if (isAlready) {
    currentWarmerState.countAlreadyMember += 1;
  } else {
    currentWarmerState.countEntered += 1;
  }

  const enteredItem = {
    id: currentGroup.id || ('grp_' + Date.now() + '_' + next),
    group_id: currentGroup.id || ('grp_' + Date.now() + '_' + next),
    name: groupName,
    status,
    url: groupUrl,
    member_count: currentGroup.memberCount || Math.floor(Math.random() * 50000) + 5000,
    avatar: '🔥',
    bg: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60',
    is_admin: false,
    source: 'AQUECEDOR',
    privacy: 'PUBLIC',
  };

  const prevEntered = currentWarmerState.enteredGroups || [];
  currentWarmerState.enteredGroups = [
    enteredItem,
    ...prevEntered.filter((g: any) => g.name?.toLowerCase() !== groupName.toLowerCase()).slice(0, 499)
  ];

  currentWarmerState.currentProgressIndex = next;
  currentWarmerState.executionLogs = [
    {
      id: 'log_' + Date.now(),
      name: groupName,
      status,
      url: groupUrl,
    },
    ...currentWarmerState.executionLogs.slice(0, 199),
  ];

  api.post('/warmer/trigger', {
    accountId: 'acc_demo_fb',
    actionTypes: ['JOIN_GROUP', 'FEED_SCROLL'],
  }).catch(() => {});

  if (next >= currentWarmerState.totalGroupsCount) {
    currentWarmerState.isGroupsRunning = false;
    (warmerWorker as any)?.postMessage('STOP');
  }
}

export const WarmerManager = {
  getState(): WarmerStoreState {
    return currentWarmerState;
  },

  getEnteredGroups(): any[] {
    const res: any[] = [...(currentWarmerState.enteredGroups || [])];
    const seen = new Set(res.map((g) => g.name?.toLowerCase()));

    (currentWarmerState.executionLogs || []).forEach((log, idx) => {
      if (!log.name || seen.has(log.name.toLowerCase())) return;
      seen.add(log.name.toLowerCase());
      res.push({
        id: 'log_' + log.id,
        group_id: 'log_' + log.id,
        name: log.name,
        url: log.url,
        member_count: 18000 + (idx * 850) % 55000,
        status: log.status,
        avatar: '🔥',
        bg: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60',
        is_admin: false,
        source: 'AQUECEDOR',
        privacy: 'PUBLIC',
      });
    });

    (currentWarmerState.publicGroups || []).forEach((p, idx) => {
      if (!p.name || seen.has(p.name.toLowerCase())) return;
      seen.add(p.name.toLowerCase());
      res.push({
        id: p.id,
        group_id: p.id,
        name: p.name,
        url: p.url,
        member_count: p.memberCount || 16000,
        status: 'Entrou',
        avatar: '🔥',
        bg: 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/60',
        is_admin: false,
        source: 'AQUECEDOR',
        privacy: 'PUBLIC',
      });
    });

    return res;
  },

  subscribe(listener: (state: WarmerStoreState) => void): () => void {
    warmerListeners.add(listener);
    listener(currentWarmerState);
    return () => {
      warmerListeners.delete(listener);
    };
  },

  startGroups(config?: Partial<WarmerStoreState>) {
    initWarmerWorker();
    const now = Date.now();
    currentWarmerState = {
      ...currentWarmerState,
      ...(config || {}),
      isGroupsRunning: true,
      groupsStartTime: now,
      groupsElapsed: 0,
      currentProgressIndex: 0,
      countEntered: 0,
      countAlreadyMember: 0,
      countWaiting: 0,
      countFailed: 0,
    };
    warmerNextActionTime = now + 2000;
    (warmerWorker as any)?.postMessage('START');
    saveAndNotifyWarmer(true);
  },

  stopGroups() {
    currentWarmerState.isGroupsRunning = false;
    (warmerWorker as any)?.postMessage('STOP');
    saveAndNotifyWarmer(true);
  },

  updateState(partial: Partial<WarmerStoreState>) {
    currentWarmerState = { ...currentWarmerState, ...partial };
    saveAndNotifyWarmer(true);
  },

  clearHistory() {
    currentWarmerState.executionLogs = [];
    currentWarmerState.currentProgressIndex = 0;
    currentWarmerState.countEntered = 0;
    currentWarmerState.countAlreadyMember = 0;
    currentWarmerState.countWaiting = 0;
    currentWarmerState.countFailed = 0;
    currentWarmerState.groupsElapsed = 0;
    saveAndNotifyWarmer(true);
  },
};

if (typeof window !== 'undefined' && currentWarmerState.isGroupsRunning) {
  initWarmerWorker();
  (warmerWorker as any)?.postMessage('START');
}
