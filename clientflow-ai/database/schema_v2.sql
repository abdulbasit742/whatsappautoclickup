-- ═══════════════════════════════════════════════════════════════════════════════
-- ClientFlow AI — Multi-Tenant PostgreSQL Schema v2
-- PROMPT 101: Multi-Tenant Isolation + PROMPT 102: Shard-Ready Design
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── PLANS ───────────────────────────────────────────────────────────────────────
-- Subscription plans define feature limits
CREATE TABLE plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(50) UNIQUE NOT NULL,           -- 'starter', 'pro', 'enterprise'
  price_usd     NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_clients   INT NOT NULL DEFAULT 500,
  max_broadcasts_per_month INT NOT NULL DEFAULT 10,
  max_ai_calls_per_day     INT NOT NULL DEFAULT 100,
  max_team_members         INT NOT NULL DEFAULT 1,
  features      JSONB DEFAULT '{}',                    -- feature flags per plan
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans (name, price_usd, max_clients, max_broadcasts_per_month, max_ai_calls_per_day, max_team_members, features)
VALUES
  ('starter',    29.00,  500,  10,  100, 1,  '{"whatsapp":true,"ai":false,"analytics":"basic"}'),
  ('pro',        79.00,  5000, 50,  500, 5,  '{"whatsapp":true,"ai":true,"analytics":"full","ab_testing":true}'),
  ('enterprise', 299.00, -1,   -1,  -1,  50, '{"whatsapp":true,"ai":true,"analytics":"full","ab_testing":true,"white_label":true,"custom_domain":true}');

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────────
-- SHARD KEY: org_id — all data is isolated and partitioned by organization
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,           -- used for subdomain: slug.app.com
  plan_id       UUID REFERENCES plans(id),
  whatsapp_phone_number_id VARCHAR(50),
  whatsapp_token           TEXT,
  webhook_verify_token     VARCHAR(100),
  -- Billing
  billing_email VARCHAR(150),
  trial_ends_at TIMESTAMPTZ,
  subscription_status VARCHAR(20) DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','past_due','cancelled')),
  -- White-label / Branding (PROMPT 110)
  brand_name    VARCHAR(150),
  brand_logo_url VARCHAR(255),
  brand_primary_color  VARCHAR(7) DEFAULT '#10B981',
  brand_secondary_color VARCHAR(7) DEFAULT '#0f0f0f',
  brand_custom_css TEXT,
  -- Custom domain (PROMPT 111)
  custom_domain VARCHAR(255) UNIQUE,
  domain_verified BOOLEAN DEFAULT FALSE,
  domain_verified_at TIMESTAMPTZ,
  domain_txt_record VARCHAR(255),                      -- TXT record for DNS verification
  -- Shard metadata (PROMPT 102)
  shard_id      SMALLINT DEFAULT 0,                    -- 0-15 for future sharding
  -- Metadata
  timezone      VARCHAR(50) DEFAULT 'UTC',
  language      VARCHAR(10) DEFAULT 'en',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orgs_slug     ON organizations(slug);
CREATE INDEX idx_orgs_domain   ON organizations(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_orgs_shard    ON organizations(shard_id);

-- ─── USERS (Team Members per Org) ────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         VARCHAR(150) NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(100),
  role          VARCHAR(20) DEFAULT 'agent'
    CHECK (role IN ('owner','admin','agent','viewer')),
  avatar_url    VARCHAR(255),
  is_active     BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);
CREATE INDEX idx_users_org   ON users(org_id);
CREATE INDEX idx_users_email ON users(email);

-- ─── SESSIONS (PROMPT 113) ───────────────────────────────────────────────────────
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,                  -- SHA-256 of the JWT token
  device_name   VARCHAR(150),
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN DEFAULT FALSE,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user      ON sessions(user_id);
CREATE INDEX idx_sessions_org       ON sessions(org_id);
CREATE INDEX idx_sessions_token     ON sessions(token_hash);
CREATE INDEX idx_sessions_expires   ON sessions(expires_at);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────────
-- SHARD KEY: org_id — partitioned by organization
CREATE TABLE clients (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_number  VARCHAR(20) NOT NULL,
  name             VARCHAR(100),
  email            VARCHAR(150),
  tags             TEXT[] DEFAULT '{}',
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at   TIMESTAMPTZ DEFAULT NOW(),
  total_spent_pkr  NUMERIC(12,2) DEFAULT 0,
  referral_code    VARCHAR(10),
  referred_by_id   UUID REFERENCES clients(id),
  notes            TEXT,
  status           VARCHAR(20) DEFAULT 'lead'
    CHECK (status IN ('lead','active','paid','inactive','blocked')),
  language         VARCHAR(10) DEFAULT 'en',
  custom_fields    JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, whatsapp_number)
);
CREATE INDEX idx_clients_org    ON clients(org_id);
CREATE INDEX idx_clients_number ON clients(org_id, whatsapp_number);
CREATE INDEX idx_clients_status ON clients(org_id, status);
CREATE INDEX idx_clients_tags   ON clients USING GIN(tags);

-- Row-Level Security (PROMPT 101)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_org_isolation ON clients
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id) ON DELETE CASCADE,
  direction           VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  content             TEXT,
  message_type        VARCHAR(20) DEFAULT 'text'
    CHECK (message_type IN ('text','image','audio','document','reaction','template')),
  whatsapp_message_id VARCHAR(100),
  ai_provider_used    VARCHAR(30),
  is_flagged          BOOLEAN DEFAULT FALSE,
  flag_reason         TEXT,
  delivered           BOOLEAN DEFAULT FALSE,
  read                BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);  -- PROMPT 102: Time-based partitioning

-- Partition by month for scalability
CREATE TABLE messages_2024_q4 PARTITION OF messages
  FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE messages_2025_q1 PARTITION OF messages
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE messages_2025_q2 PARTITION OF messages
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE messages_2025_q3 PARTITION OF messages
  FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE messages_2025_q4 PARTITION OF messages
  FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE messages_2026_q1 PARTITION OF messages
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE messages_2026_q2 PARTITION OF messages
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE messages_default  PARTITION OF messages DEFAULT;

CREATE INDEX idx_messages_org     ON messages(org_id);
CREATE INDEX idx_messages_client  ON messages(org_id, client_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_flagged ON messages(org_id, is_flagged) WHERE is_flagged = TRUE;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_org_isolation ON messages
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── SERVICES ────────────────────────────────────────────────────────────────────
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  price_pkr     NUMERIC(10,2) NOT NULL,
  delivery_days INT DEFAULT 1,
  category      VARCHAR(50),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_services_org ON services(org_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_org_isolation ON services
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id),
  amount_pkr      NUMERIC(10,2) NOT NULL,
  method          VARCHAR(30) CHECK (method IN ('easypaisa','jazzcash','bank','cash','stripe','paypal')),
  status          VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','rejected','refunded')),
  screenshot_url  VARCHAR(255),
  transaction_ref VARCHAR(100),
  confirmed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_org    ON payments(org_id);
CREATE INDEX idx_payments_client ON payments(org_id, client_id);
CREATE INDEX idx_payments_status ON payments(org_id, status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_org_isolation ON payments
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── ALERTS ──────────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL
    CHECK (type IN ('unresolved_query','pending_payment','new_review','inactive_client','ai_failure','new_client','complaint')),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  message     TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_alerts_org      ON alerts(org_id);
CREATE INDEX idx_alerts_resolved ON alerts(org_id, is_resolved);
CREATE INDEX idx_alerts_created  ON alerts(created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY alerts_org_isolation ON alerts
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  feedback   TEXT,
  sentiment  VARCHAR(20) CHECK (sentiment IN ('positive','neutral','negative')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_org ON reviews(org_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_org_isolation ON reviews
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── BROADCASTS ──────────────────────────────────────────────────────────────────
CREATE TABLE broadcasts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES users(id),
  title           VARCHAR(150),
  message         TEXT NOT NULL,
  target_audience VARCHAR(30) DEFAULT 'all'
    CHECK (target_audience IN ('all','paid','inactive','leads','tagged')),
  target_tags     TEXT[] DEFAULT '{}',
  status          VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sent','failed')),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_sent      INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_read      INT DEFAULT 0,
  -- A/B testing fields (PROMPT 108)
  ab_variant      VARCHAR(1),                          -- 'A' or 'B'
  ab_experiment_id UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_broadcasts_org ON broadcasts(org_id);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY broadcasts_org_isolation ON broadcasts
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE TABLE broadcast_recipients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  delivered    BOOLEAN DEFAULT FALSE,
  read         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcast_id, client_id)
);
CREATE INDEX idx_br_org ON broadcast_recipients(org_id);

-- ─── TEMPLATES ───────────────────────────────────────────────────────────────────
CREATE TABLE templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50),
  content     TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_templates_org ON templates(org_id);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_org_isolation ON templates
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── APPOINTMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  slot_datetime   TIMESTAMPTZ NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed')),
  reminder_sent   BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_appts_org ON appointments(org_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_org_isolation ON appointments
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── REFERRALS ───────────────────────────────────────────────────────────────────
CREATE TABLE referrals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  referred_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  reward_sent       BOOLEAN DEFAULT FALSE,
  reward_sent_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_referrals_org ON referrals(org_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY referrals_org_isolation ON referrals
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── FOLLOW UPS ──────────────────────────────────────────────────────────────────
CREATE TABLE follow_ups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  type         VARCHAR(30)
    CHECK (type IN ('cold_lead','pending_payment','post_delivery','re_engagement','upsell')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ,
  status       VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','sent','skipped','failed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_followups_org       ON follow_ups(org_id);
CREATE INDEX idx_followups_scheduled ON follow_ups(org_id, scheduled_at);
CREATE INDEX idx_followups_status    ON follow_ups(org_id, status);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY followups_org_isolation ON follow_ups
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── AI LOGS ─────────────────────────────────────────────────────────────────────
CREATE TABLE ai_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  provider        VARCHAR(30),
  prompt_tokens   INT,
  response_tokens INT,
  latency_ms      INT,
  success         BOOLEAN DEFAULT TRUE,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_logs_org ON ai_logs(org_id);
CREATE INDEX idx_ai_logs_created ON ai_logs(created_at DESC);

-- ─── SETTINGS ────────────────────────────────────────────────────────────────────
CREATE TABLE settings (
  id         SERIAL PRIMARY KEY,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key        VARCHAR(100) NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, key)
);
CREATE INDEX idx_settings_org ON settings(org_id);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_org_isolation ON settings
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── API LOGS (PROMPT 106) ───────────────────────────────────────────────────────
CREATE TABLE api_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  method       VARCHAR(10),
  path         VARCHAR(500),
  status_code  SMALLINT,
  duration_ms  INT,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  request_body JSONB,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE api_logs_2025_q1 PARTITION OF api_logs FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE api_logs_2025_q2 PARTITION OF api_logs FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE api_logs_2025_q3 PARTITION OF api_logs FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE api_logs_2025_q4 PARTITION OF api_logs FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE api_logs_2026_q1 PARTITION OF api_logs FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE api_logs_2026_q2 PARTITION OF api_logs FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE api_logs_default  PARTITION OF api_logs DEFAULT;

CREATE INDEX idx_api_logs_org     ON api_logs(org_id);
CREATE INDEX idx_api_logs_created ON api_logs(created_at DESC);
CREATE INDEX idx_api_logs_status  ON api_logs(status_code);

-- ─── FEATURE USAGE (PROMPT 107) ──────────────────────────────────────────────────
CREATE TABLE feature_usage (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  feature      VARCHAR(100) NOT NULL,
  action       VARCHAR(100),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE feature_usage_2025_q1 PARTITION OF feature_usage FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE feature_usage_2025_q2 PARTITION OF feature_usage FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE feature_usage_2025_q3 PARTITION OF feature_usage FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE feature_usage_2025_q4 PARTITION OF feature_usage FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE feature_usage_2026_q1 PARTITION OF feature_usage FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE feature_usage_2026_q2 PARTITION OF feature_usage FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE feature_usage_default  PARTITION OF feature_usage DEFAULT;

CREATE INDEX idx_feature_usage_org     ON feature_usage(org_id);
CREATE INDEX idx_feature_usage_feature ON feature_usage(org_id, feature);
CREATE INDEX idx_feature_usage_created ON feature_usage(created_at DESC);

-- ─── A/B EXPERIMENTS (PROMPT 108) ────────────────────────────────────────────────
CREATE TABLE ab_experiments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  type          VARCHAR(50) CHECK (type IN ('broadcast','ai_response','ui','pricing')),
  status        VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft','running','paused','completed')),
  traffic_split SMALLINT DEFAULT 50 CHECK (traffic_split BETWEEN 1 AND 99), -- % to variant A
  variant_a     JSONB NOT NULL DEFAULT '{}',
  variant_b     JSONB NOT NULL DEFAULT '{}',
  winner        VARCHAR(1),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_experiments_org ON ab_experiments(org_id);

CREATE TABLE ab_assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL,
  variant       VARCHAR(1) NOT NULL CHECK (variant IN ('A','B')),
  converted     BOOLEAN DEFAULT FALSE,
  converted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, client_id)
);
CREATE INDEX idx_ab_assignments_exp ON ab_assignments(experiment_id);
CREATE INDEX idx_ab_assignments_org ON ab_assignments(org_id);

-- ─── CUSTOM DOMAINS (PROMPT 111) ─────────────────────────────────────────────────
CREATE TABLE custom_domains (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  domain          VARCHAR(255) NOT NULL UNIQUE,
  verified        BOOLEAN DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  txt_record      VARCHAR(255) NOT NULL,               -- e.g. clientflow-verify=<token>
  ssl_provisioned BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_domains_domain ON custom_domains(domain);

-- ─── PLAN USAGE COUNTERS (for quota enforcement) ─────────────────────────────────
CREATE TABLE plan_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month           DATE NOT NULL,                       -- first day of the month
  broadcasts_sent INT DEFAULT 0,
  ai_calls        INT DEFAULT 0,
  messages_sent   INT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, month)
);
CREATE INDEX idx_plan_usage_org ON plan_usage(org_id, month);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Set org context for RLS — call this at the start of every request transaction
CREATE OR REPLACE FUNCTION set_org_context(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_org_id', p_org_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql;

-- Function to validate org membership (cross-org access check)
CREATE OR REPLACE FUNCTION assert_org_access(p_resource_org_id UUID, p_current_org_id UUID)
RETURNS VOID AS $$
BEGIN
  IF p_resource_org_id != p_current_org_id THEN
    RAISE EXCEPTION 'cross_org_access_denied: Resource belongs to a different organization'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orgs_updated_at    BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at   BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
