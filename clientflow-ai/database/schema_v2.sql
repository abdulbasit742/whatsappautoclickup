-- ClientFlow AI — Schema v2 Additions
-- Run this file AFTER schema.sql

-- ─── ADD LEAD SCORE + TAGS TO CLIENTS ────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lead_score    SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags          TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_stage    VARCHAR(30) DEFAULT 'new'
    CHECK (lead_stage IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  ADD COLUMN IF NOT EXISTS assigned_to   UUID,
  ADD COLUMN IF NOT EXISTS follow_up_due TIMESTAMPTZ;

-- ─── CAMPAIGNS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(150) NOT NULL,
  message         TEXT NOT NULL,
  target_audience VARCHAR(30) DEFAULT 'all'
    CHECK (target_audience IN ('all','paid','inactive','leads')),
  status          VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','running','paused','completed','failed')),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_sent      INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_read      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at);

-- ─── ISSUES / TICKETS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  severity         VARCHAR(20) DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  status           VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  assigned_to      UUID,
  resolution_notes TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issues_status   ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_client   ON issues(client_id);

-- ─── SUBSCRIPTIONS / BILLING ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan            VARCHAR(20) DEFAULT 'free'
    CHECK (plan IN ('free','starter','pro','enterprise')),
  status          VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active','cancelled','past_due','trialing')),
  billing_cycle   VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  trial_ends_at   TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_provider     VARCHAR(30),
  external_id          VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── API KEYS (encrypted) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider     VARCHAR(50) UNIQUE NOT NULL,
  label        VARCHAR(100),
  key_hash     TEXT,           -- bcrypt hash for verification
  key_preview  VARCHAR(20),    -- last 4 chars for display e.g. "...abc1"
  is_active    BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  health_ok    BOOLEAN,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default providers
INSERT INTO api_keys (provider, label, notes, is_active) VALUES
  ('groq',        'Groq',             'Active — llama-3.3-70b-versatile', true),
  ('anthropic',   'Claude (Anthropic)','Placeholder — add key to enable',  false),
  ('openai',      'OpenAI',           'Placeholder — add key to enable',  false),
  ('gemini',      'Gemini (Google)',  'Placeholder — add key to enable',  false),
  ('clickup',     'ClickUp',          'Task management integration',       false),
  ('gmail',       'Gmail / Google',   'Email and Calendar access',         false),
  ('make',        'Make (Integromat)','Automation webhooks',               false)
ON CONFLICT (provider) DO NOTHING;

-- ─── INTEGRATION HEALTH LOG ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider     VARCHAR(50) NOT NULL,
  event_type   VARCHAR(50) NOT NULL CHECK (event_type IN ('connect','disconnect','sync','error','health_check')),
  success      BOOLEAN DEFAULT TRUE,
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_integration_events_provider ON integration_events(provider);
CREATE INDEX IF NOT EXISTS idx_integration_events_created  ON integration_events(created_at DESC);
