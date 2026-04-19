-- ClientFlow SaaS - Complete Multi-Tenant Schema
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  plan          VARCHAR(50) DEFAULT 'free',
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan ON organizations(plan);

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255),
  name            VARCHAR(255) NOT NULL,
  avatar_url      TEXT,
  role            VARCHAR(50) DEFAULT 'agent',
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(org_id, role);

-- ─────────────────────────────────────────────
-- ROLES
-- ─────────────────────────────────────────────
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX idx_roles_org_id ON roles(org_id);

-- ─────────────────────────────────────────────
-- REFRESH TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ─────────────────────────────────────────────
-- API KEYS
-- ─────────────────────────────────────────────
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider      VARCHAR(100) NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, provider)
);

CREATE INDEX idx_api_keys_org_id ON api_keys(org_id);

-- ─────────────────────────────────────────────
-- FEATURE FLAGS
-- ─────────────────────────────────────────────
CREATE TABLE feature_flags (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID REFERENCES organizations(id) ON DELETE CASCADE,
  flag_key            VARCHAR(100) NOT NULL,
  is_enabled          BOOLEAN DEFAULT false,
  rollout_percentage  INTEGER DEFAULT 100,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, flag_key)
);

CREATE INDEX idx_feature_flags_org_id ON feature_flags(org_id);
CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);

-- ─────────────────────────────────────────────
-- LEAD STAGES
-- ─────────────────────────────────────────────
CREATE TABLE lead_stages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  order_index INTEGER DEFAULT 0,
  color       VARCHAR(20) DEFAULT '#6366f1',
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_stages_org_id ON lead_stages(org_id);

-- ─────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────
CREATE TABLE contacts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  phone               VARCHAR(50),
  email               VARCHAR(255),
  city                VARCHAR(100),
  country             VARCHAR(100),
  tags                TEXT[] DEFAULT '{}',
  lead_stage          VARCHAR(100),
  lead_source         VARCHAR(100),
  assigned_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  notes               TEXT,
  payment_status      VARCHAR(50) DEFAULT 'none',
  lead_score          INTEGER DEFAULT 0,
  lead_value          DECIMAL(15,2) DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  follow_up_due_at    TIMESTAMPTZ,
  custom_fields       JSONB DEFAULT '{}',
  is_deleted          BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_org_id ON contacts(org_id);
CREATE INDEX idx_contacts_phone ON contacts(org_id, phone);
CREATE INDEX idx_contacts_email ON contacts(org_id, email);
CREATE INDEX idx_contacts_lead_stage ON contacts(org_id, lead_stage);
CREATE INDEX idx_contacts_assigned ON contacts(assigned_user_id);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_follow_up ON contacts(org_id, follow_up_due_at) WHERE is_deleted = false;

-- ─────────────────────────────────────────────
-- CONTACT NOTES
-- ─────────────────────────────────────────────
CREATE TABLE contact_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX idx_contact_notes_org_id ON contact_notes(org_id);

-- ─────────────────────────────────────────────
-- ACTIVITIES
-- ─────────────────────────────────────────────
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type        VARCHAR(100) NOT NULL,
  description TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_org_id ON activities(org_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_created_at ON activities(org_id, created_at DESC);

-- ─────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────
CREATE TABLE conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel          VARCHAR(50) DEFAULT 'whatsapp',
  status           VARCHAR(50) DEFAULT 'open',
  priority         VARCHAR(20) DEFAULT 'normal',
  tags             TEXT[] DEFAULT '{}',
  is_archived      BOOLEAN DEFAULT false,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_org_id ON conversations(org_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_user_id);
CREATE INDEX idx_conversations_status ON conversations(org_id, status);
CREATE INDEX idx_conversations_last_msg ON conversations(org_id, last_message_at DESC);

-- ─────────────────────────────────────────────
-- CONVERSATION MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE conversation_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_type      VARCHAR(20) NOT NULL,
  sender_id        UUID,
  content          TEXT,
  message_type     VARCHAR(50) DEFAULT 'text',
  metadata         JSONB DEFAULT '{}',
  is_internal_note BOOLEAN DEFAULT false,
  is_pinned        BOOLEAN DEFAULT false,
  delivered_at     TIMESTAMPTZ,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX idx_messages_org_id ON conversation_messages(org_id);
CREATE INDEX idx_messages_created_at ON conversation_messages(conversation_id, created_at);

-- ─────────────────────────────────────────────
-- CAMPAIGN TEMPLATES
-- ─────────────────────────────────────────────
CREATE TABLE campaign_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100),
  content     TEXT NOT NULL,
  variables   JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_templates_org_id ON campaign_templates(org_id);

-- ─────────────────────────────────────────────
-- CAMPAIGNS
-- ─────────────────────────────────────────────
CREATE TABLE campaigns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  status            VARCHAR(50) DEFAULT 'draft',
  audience_type     VARCHAR(50) DEFAULT 'all',
  segment_filters   JSONB DEFAULT '{}',
  template_id       UUID REFERENCES campaign_templates(id) ON DELETE SET NULL,
  schedule_at       TIMESTAMPTZ,
  retry_config      JSONB DEFAULT '{"maxRetries":3,"backoffMs":60000}',
  compliance_notes  TEXT,
  is_approved       BOOLEAN DEFAULT false,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_status ON campaigns(org_id, status);
CREATE INDEX idx_campaigns_schedule ON campaigns(schedule_at) WHERE status = 'scheduled';

-- ─────────────────────────────────────────────
-- CAMPAIGN RUNS
-- ─────────────────────────────────────────────
CREATE TABLE campaign_runs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  total_targets INTEGER DEFAULT 0,
  sent          INTEGER DEFAULT 0,
  delivered     INTEGER DEFAULT 0,
  failed        INTEGER DEFAULT 0,
  status        VARCHAR(50) DEFAULT 'running'
);

CREATE INDEX idx_campaign_runs_campaign ON campaign_runs(campaign_id);
CREATE INDEX idx_campaign_runs_org ON campaign_runs(org_id);

-- ─────────────────────────────────────────────
-- CAMPAIGN TARGETS
-- ─────────────────────────────────────────────
CREATE TABLE campaign_targets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status        VARCHAR(50) DEFAULT 'pending',
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_campaign_targets_campaign ON campaign_targets(campaign_id);
CREATE INDEX idx_campaign_targets_status ON campaign_targets(campaign_id, status);

-- ─────────────────────────────────────────────
-- FOLLOW UPS
-- ─────────────────────────────────────────────
CREATE TABLE follow_ups (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type             VARCHAR(100) DEFAULT 'call',
  trigger_type     VARCHAR(50) DEFAULT 'manual',
  scheduled_at     TIMESTAMPTZ NOT NULL,
  completed_at     TIMESTAMPTZ,
  status           VARCHAR(50) DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_org_id ON follow_ups(org_id);
CREATE INDEX idx_follow_ups_contact ON follow_ups(contact_id);
CREATE INDEX idx_follow_ups_assigned ON follow_ups(assigned_user_id);
CREATE INDEX idx_follow_ups_scheduled ON follow_ups(org_id, scheduled_at) WHERE status = 'pending';

-- ─────────────────────────────────────────────
-- REMINDERS
-- ─────────────────────────────────────────────
CREATE TABLE reminders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  due_at       TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_org_id ON reminders(org_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_due_at ON reminders(org_id, due_at) WHERE is_completed = false;

-- ─────────────────────────────────────────────
-- ISSUES
-- ─────────────────────────────────────────────
CREATE TABLE issues (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id  UUID REFERENCES conversations(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  severity         VARCHAR(20) DEFAULT 'medium',
  status           VARCHAR(50) DEFAULT 'open',
  sla_due_at       TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issues_org_id ON issues(org_id);
CREATE INDEX idx_issues_contact ON issues(contact_id);
CREATE INDEX idx_issues_assigned ON issues(assigned_user_id);
CREATE INDEX idx_issues_status ON issues(org_id, status);
CREATE INDEX idx_issues_severity ON issues(org_id, severity);

-- ─────────────────────────────────────────────
-- ISSUE COMMENTS
-- ─────────────────────────────────────────────
CREATE TABLE issue_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issue_comments_issue ON issue_comments(issue_id);
CREATE INDEX idx_issue_comments_org ON issue_comments(org_id);

-- ─────────────────────────────────────────────
-- PLANS
-- ─────────────────────────────────────────────
CREATE TABLE plans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(100) NOT NULL UNIQUE,
  price_monthly  DECIMAL(10,2) DEFAULT 0,
  price_yearly   DECIMAL(10,2) DEFAULT 0,
  features       JSONB DEFAULT '[]',
  limits         JSONB DEFAULT '{}',
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES plans(id),
  status               VARCHAR(50) DEFAULT 'active',
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id)
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);

-- ─────────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────────
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'USD',
  status          VARCHAR(50) DEFAULT 'pending',
  due_at          TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(org_id);
CREATE INDEX idx_invoices_status ON invoices(org_id, status);

-- ─────────────────────────────────────────────
-- INTEGRATIONS
-- ─────────────────────────────────────────────
CREATE TABLE integrations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider    VARCHAR(100) NOT NULL,
  status      VARCHAR(50) DEFAULT 'disconnected',
  config      JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_error  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, provider)
);

CREATE INDEX idx_integrations_org ON integrations(org_id);

-- ─────────────────────────────────────────────
-- INTEGRATION LOGS
-- ─────────────────────────────────────────────
CREATE TABLE integration_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type     VARCHAR(100),
  status         VARCHAR(50),
  details        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_org ON integration_logs(org_id);
CREATE INDEX idx_integration_logs_created ON integration_logs(org_id, created_at DESC);

-- ─────────────────────────────────────────────
-- AI REQUESTS
-- ─────────────────────────────────────────────
CREATE TABLE ai_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  provider        VARCHAR(50) NOT NULL,
  feature         VARCHAR(100),
  prompt_tokens   INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  latency_ms      INTEGER DEFAULT 0,
  success         BOOLEAN DEFAULT true,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_requests_org ON ai_requests(org_id);
CREATE INDEX idx_ai_requests_created ON ai_requests(org_id, created_at DESC);
CREATE INDEX idx_ai_requests_provider ON ai_requests(org_id, provider);

-- ─────────────────────────────────────────────
-- AI PROMPT TEMPLATES
-- ─────────────────────────────────────────────
CREATE TABLE ai_prompt_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category    VARCHAR(100),
  name        VARCHAR(255) NOT NULL,
  prompt_text TEXT NOT NULL,
  variables   JSONB DEFAULT '[]',
  is_default  BOOLEAN DEFAULT false,
  is_enabled  BOOLEAN DEFAULT true,
  version     INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_prompt_templates_org ON ai_prompt_templates(org_id);
CREATE INDEX idx_ai_prompt_templates_category ON ai_prompt_templates(org_id, category);

-- ─────────────────────────────────────────────
-- AI USAGE DAILY
-- ─────────────────────────────────────────────
CREATE TABLE ai_usage_daily (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  provider      VARCHAR(50),
  request_count INTEGER DEFAULT 0,
  token_count   INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  UNIQUE(org_id, date, provider)
);

CREATE INDEX idx_ai_usage_daily_org ON ai_usage_daily(org_id, date DESC);

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(200) NOT NULL,
  resource_type VARCHAR(100),
  resource_id   UUID,
  metadata      JSONB DEFAULT '{}',
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(org_id, resource_type, resource_id);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(100),
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_org ON notifications(org_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ─────────────────────────────────────────────
-- SEED PLANS
-- ─────────────────────────────────────────────
INSERT INTO plans (name, price_monthly, price_yearly, features, limits) VALUES
  ('free',       0,     0,     '["crm","inbox","basic_ai"]',               '{"contacts":100,"campaigns":2,"ai_requests":100}'),
  ('starter',    29,    290,   '["crm","inbox","campaigns","ai","reports"]','{"contacts":1000,"campaigns":10,"ai_requests":1000}'),
  ('pro',        79,    790,   '["crm","inbox","campaigns","ai","reports","integrations","custom_roles"]','{"contacts":10000,"campaigns":50,"ai_requests":10000}'),
  ('enterprise', 199,   1990,  '["all"]',                                  '{"contacts":-1,"campaigns":-1,"ai_requests":-1}');
