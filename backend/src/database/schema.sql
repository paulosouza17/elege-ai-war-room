-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations & Clients (Multi-tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan_tier TEXT DEFAULT 'standard', -- 'presidential', 'governor', 'mayor'
    settings JSONB DEFAULT '{}', -- Custom settings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Data Sources (Configuration)
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'twitter', 'news', 'instagram', 'custom_api'
    layer INTEGER DEFAULT 1, -- 1=Essential, 2=Governor, 3=Deep Dive
    config JSONB DEFAULT '{}', -- API keys, usernames, urls
    status TEXT DEFAULT 'active', -- 'active', 'error', 'paused'
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mentions (Ingested Data)
CREATE TABLE mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    source_id UUID REFERENCES sources(id),
    external_id TEXT,
    text TEXT,
    author TEXT,
    url TEXT,
    media_url TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Classification Fields (Populated by LLM/Worker)
    theme TEXT,
    sentiment TEXT, -- 'positive', 'negative', 'neutral'
    narrative TEXT,
    risk_score INTEGER, -- 0-100
    classification_metadata JSONB DEFAULT '{}', -- confidence, reasoning
    
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source_id, external_id)
);

-- 4. Activations (Demandas / Topics)
CREATE TABLE activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    name TEXT NOT NULL,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    keywords TEXT[],
    people_of_interest TEXT[],
    sources_config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'archived'
    created_by UUID, -- User ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Crisis Packets (War Room)
CREATE TABLE crisis_packets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    title TEXT NOT NULL,
    severity TEXT, -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'draft', -- 'draft', 'review', 'approved', 'sent'
    summary TEXT,
    evidence_ids UUID[], -- Array of mention_ids
    playbook_id UUID,
    
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_mentions_client_id ON mentions(client_id);
CREATE INDEX idx_mentions_created_at ON mentions(created_at);
CREATE INDEX idx_mentions_risk_score ON mentions(risk_score);
