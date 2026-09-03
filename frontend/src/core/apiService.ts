import axios from 'axios';

const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: apiBase,
  timeout: 30000,
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

export interface CreativeItem {
  id: string;
  title: string;
  category: string;
  content_text: string;
  spintax_enabled?: boolean;
  media_type: string;
  link_url?: string;
  media_urls?: string[];
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
