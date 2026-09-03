-- ==============================================================================
-- PULSO SOCIAL - SCHEMA DO BANCO DE DADOS SUPABASE (PostgreSQL)
-- ==============================================================================
-- Execute este script completo no painel do Supabase em:
-- Dashboard > SQL Editor > New query > Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'USER',
    plan TEXT DEFAULT 'PRO',
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT DEFAULT 'FACEBOOK',
    name TEXT NOT NULL,
    identifier TEXT NOT NULL,
    cookies TEXT,
    proxy TEXT,
    user_agent TEXT,
    custom_limits JSONB,
    status TEXT DEFAULT 'ACTIVE',
    trust_score INTEGER DEFAULT 85,
    daily_posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_lists (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT DEFAULT 'FACEBOOK',
    description TEXT,
    color TEXT DEFAULT '#5b5bd6',
    total_groups INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    list_id TEXT REFERENCES group_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fb_id TEXT,
    url TEXT,
    member_count INTEGER DEFAULT 0,
    privacy TEXT DEFAULT 'PUBLIC',
    can_post BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creative_library (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    folder TEXT DEFAULT 'Geral',
    tags TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'POSTER',
    platform TEXT DEFAULT 'FACEBOOK',
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    group_list_id TEXT REFERENCES group_lists(id) ON DELETE SET NULL,
    content_text TEXT,
    spintax_enabled BOOLEAN DEFAULT TRUE,
    media_type TEXT DEFAULT 'TEXT',
    media_urls TEXT,
    link_url TEXT,
    calibration_json JSONB,
    schedule_json JSONB,
    status TEXT DEFAULT 'IDLE',
    total_targets INTEGER DEFAULT 0,
    completed_targets INTEGER DEFAULT 0,
    successful_posts INTEGER DEFAULT 0,
    pending_posts INTEGER DEFAULT 0,
    failed_posts INTEGER DEFAULT 0,
    progress_percent REAL DEFAULT 0,
    current_target_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_items (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    target_name TEXT,
    target_url TEXT,
    status TEXT DEFAULT 'PENDING',
    error_message TEXT,
    post_url TEXT,
    posted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS warmer_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    status TEXT DEFAULT 'SUCCESS',
    details TEXT,
    score_delta INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_list_id ON groups(list_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign_id ON campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_library_user_id ON creative_library(user_id);
