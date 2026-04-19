-- ClientFlow AI — Schema v2 Extensions (Prompts 81–100)

-- ─── MULTI-CHANNEL (Prompt 81) ──────────────────────────────────────────────
CREATE TABLE channels (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp','email','sms','chat_widget')),
  is_active   BOOLEAN DEFAULT TRUE,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO channels (name, type) VALUES ('WhatsApp', 'whatsapp'), ('Email', 'email'), ('SMS', 'sms'), ('Chat Widget', 'chat_widget');

CREATE TABLE channel_messages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE,
  channel        VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','email','sms','chat_widget')),
  direction      VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  subject        VARCHAR(255),
  content        TEXT,
  metadata       JSONB DEFAULT '{}',
  is_read        BOOLEAN DEFAULT FALSE,
  assigned_to    UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_channel_msg_client ON channel_messages(client_id);
CREATE INDEX idx_channel_msg_channel ON channel_messages(channel);
CREATE INDEX idx_channel_msg_created ON channel_messages(created_at DESC);

-- ─── ACTIVITY FEED (Prompt 82) ──────────────────────────────────────────────
CREATE TABLE activity_feed (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(50) NOT NULL,
  actor_id    UUID,
  actor_name  VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id   UUID,
  title       TEXT NOT NULL,
  detail      TEXT,
  metadata    JSONB DEFAULT '{}',
  org_id      UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_type ON activity_feed(type);

-- ─── TEAM MEMBERS & PERFORMANCE (Prompt 83) ─────────────────────────────────
CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  role        VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('admin','manager','agent')),
  is_active   BOOLEAN DEFAULT TRUE,
  skills      TEXT[] DEFAULT '{}',
  max_load    INT DEFAULT 20,
  current_load INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_performance (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id         UUID REFERENCES team_members(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  messages_handled  INT DEFAULT 0,
  avg_response_time INT DEFAULT 0,
  resolved_issues   INT DEFAULT 0,
  closed_deals      INT DEFAULT 0,
  followups_done    INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date)
);
CREATE INDEX idx_team_perf_member ON team_performance(member_id);
CREATE INDEX idx_team_perf_date ON team_performance(date DESC);

-- ─── PIPELINE / SALES (Prompt 85) ───────────────────────────────────────────
CREATE TABLE pipeline_stages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(50) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0,
  color      VARCHAR(20) DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO pipeline_stages (name, slug, sort_order, color) VALUES
  ('New Lead',     'new_lead',     1, '#f59e0b'),
  ('Contacted',    'contacted',    2, '#3b82f6'),
  ('Interested',   'interested',   3, '#8b5cf6'),
  ('Negotiation',  'negotiation',  4, '#f97316'),
  ('Won',          'won',          5, '#10b981'),
  ('Lost',         'lost',         6, '#ef4444');

CREATE TABLE pipeline_deals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  stage_slug  VARCHAR(50) REFERENCES pipeline_stages(slug),
  title       VARCHAR(200),
  value_pkr   NUMERIC(12,2) DEFAULT 0,
  assigned_to UUID REFERENCES team_members(id),
  notes       TEXT,
  closed_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_deals_stage ON pipeline_deals(stage_slug);
CREATE INDEX idx_deals_client ON pipeline_deals(client_id);

CREATE TABLE deal_stage_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id     UUID REFERENCES pipeline_deals(id) ON DELETE CASCADE,
  from_stage  VARCHAR(50),
  to_stage    VARCHAR(50),
  changed_by  UUID,
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ASSIGNMENT RULES (Prompt 86) ───────────────────────────────────────────
CREATE TABLE assignment_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  entity_type VARCHAR(30) CHECK (entity_type IN ('lead','chat','issue')),
  strategy    VARCHAR(30) CHECK (strategy IN ('round_robin','load_balance','skill_based')),
  conditions  JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignment_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id     UUID REFERENCES assignment_rules(id),
  entity_type VARCHAR(30),
  entity_id   UUID,
  member_id   UUID REFERENCES team_members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUTO-TAGGING (Prompt 87) ───────────────────────────────────────────────
CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  color      VARCHAR(20) DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES tags(id) ON DELETE CASCADE,
  source     VARCHAR(30) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, tag_id)
);

CREATE TABLE tagging_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100),
  tag_id      UUID REFERENCES tags(id),
  conditions  JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DATA IMPORT (Prompt 88) ────────────────────────────────────────────────
CREATE TABLE import_jobs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename     VARCHAR(255),
  file_url     VARCHAR(255),
  entity_type  VARCHAR(30) DEFAULT 'clients',
  column_map   JSONB DEFAULT '{}',
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','mapping','validating','importing','done','failed')),
  total_rows   INT DEFAULT 0,
  imported     INT DEFAULT 0,
  skipped      INT DEFAULT 0,
  errors       JSONB DEFAULT '[]',
  preview_data JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DATA EXPORT (Prompt 89) ────────────────────────────────────────────────
CREATE TABLE export_jobs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(30),
  filters     JSONB DEFAULT '{}',
  format      VARCHAR(10) CHECK (format IN ('csv','excel','pdf')),
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  file_url    VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BACKUP (Prompt 90) ─────────────────────────────────────────────────────
CREATE TABLE backup_jobs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(20) DEFAULT 'manual' CHECK (type IN ('manual','scheduled')),
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  file_url    VARCHAR(255),
  size_bytes  BIGINT DEFAULT 0,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DATA PRIVACY (Prompt 91) ───────────────────────────────────────────────
CREATE TABLE data_access_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID,
  user_email  VARCHAR(150),
  action      VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id   UUID,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_access_logs_created ON data_access_logs(created_at DESC);

CREATE TABLE data_deletion_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID REFERENCES clients(id),
  reason      TEXT,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  processed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORG SETTINGS (Prompt 92) ───────────────────────────────────────────────
CREATE TABLE org_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name             VARCHAR(100) DEFAULT 'ClientFlow AI',
  logo_url             VARCHAR(255),
  timezone             VARCHAR(50) DEFAULT 'Asia/Karachi',
  primary_color        VARCHAR(20) DEFAULT '#10b981',
  email_notifications  BOOLEAN DEFAULT TRUE,
  whatsapp_alerts      BOOLEAN DEFAULT TRUE,
  ai_provider_priority TEXT[] DEFAULT ARRAY['groq','claude','openai','gemini'],
  integrations         JSONB DEFAULT '{}',
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO org_settings (org_name) VALUES ('ClientFlow AI');

-- ─── CUSTOM DASHBOARD (Prompt 93) ───────────────────────────────────────────
CREATE TABLE dashboard_layouts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  user_id     UUID,
  is_default  BOOLEAN DEFAULT FALSE,
  widgets     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SAVED FILTERS (Prompt 94) ──────────────────────────────────────────────
CREATE TABLE saved_filters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  entity_type VARCHAR(30),
  filter_json JSONB NOT NULL,
  is_shared   BOOLEAN DEFAULT FALSE,
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RULE ENGINE (Prompt 95) ────────────────────────────────────────────────
CREATE TABLE rule_definitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  trigger     VARCHAR(50) NOT NULL,
  conditions  JSONB DEFAULT '[]',
  actions     JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT TRUE,
  run_count   INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rule_execution_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id     UUID REFERENCES rule_definitions(id) ON DELETE CASCADE,
  entity_id   UUID,
  entity_type VARCHAR(50),
  success     BOOLEAN DEFAULT TRUE,
  output      JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI TRAINING DATA (Prompt 96) ───────────────────────────────────────────
CREATE TABLE ai_training_data (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  input        TEXT NOT NULL,
  output       TEXT NOT NULL,
  label        VARCHAR(50),
  quality      SMALLINT DEFAULT 3 CHECK (quality BETWEEN 1 AND 5),
  used_in_prompt BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_training_label ON ai_training_data(label);

-- ─── AI FEEDBACK (Prompt 97) ────────────────────────────────────────────────
CREATE TABLE ai_feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  provider    VARCHAR(30),
  prompt      TEXT,
  response    TEXT,
  rating      SMALLINT CHECK (rating IN (-1, 1)),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_feedback_rating ON ai_feedback(rating);

-- ─── REVENUE (Prompt 84) ────────────────────────────────────────────────────
CREATE TABLE revenue_targets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period      VARCHAR(20) DEFAULT 'monthly',
  target_pkr  NUMERIC(14,2) NOT NULL,
  year        INT,
  month       INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
