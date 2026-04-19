-- ============================================================
-- ClientFlow AI — Full Database Schema (Prompts 51–80)
-- ============================================================

-- ─── TEAM MANAGEMENT (P51) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free', -- free | starter | pro | enterprise
  owner_email   TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'agent', -- super_admin | org_admin | manager | agent | support | viewer
  status          TEXT NOT NULL DEFAULT 'active', -- active | inactive | invited
  invite_token    TEXT,
  invited_at      TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ,
  password_hash   TEXT,
  reset_token     TEXT,
  reset_expires   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- ─── RBAC PERMISSIONS (P52) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        TEXT NOT NULL,
  module      TEXT NOT NULL, -- dashboard | inbox | crm | campaigns | ai_center | billing | integrations | settings | analytics | audit_logs
  action      TEXT NOT NULL, -- view | create | edit | delete | export | manage
  plan_required TEXT DEFAULT NULL, -- null = all plans, otherwise 'starter' | 'pro' | 'enterprise'
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module, action, org_id)
);

-- ─── CUSTOMER TIMELINE (P53) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS timeline_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL,
  event_type  TEXT NOT NULL, -- contact_created | tag_updated | message_sent | message_received | campaign_touched | followup_created | issue_raised | payment_made | note_added | ai_score_changed
  metadata    JSONB DEFAULT '{}',
  created_by  UUID REFERENCES team_members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timeline_client ON timeline_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_events(event_type);

-- ─── INTERNAL NOTES (P58) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- contact | conversation | issue | payment
  entity_id   UUID NOT NULL,
  content     TEXT NOT NULL,
  is_pinned   BOOLEAN DEFAULT FALSE,
  visibility  TEXT DEFAULT 'team', -- team | private | manager_only
  created_by  UUID REFERENCES team_members(id),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);

-- ─── CUSTOM FIELDS (P73) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL, -- contact | lead | issue
  field_key     TEXT NOT NULL,
  label         TEXT NOT NULL,
  field_type    TEXT NOT NULL, -- text | number | date | select | checkbox
  options       JSONB DEFAULT '[]', -- for select fields
  is_required   BOOLEAN DEFAULT FALSE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, entity_type, field_key)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  entity_id     UUID NOT NULL,
  value_text    TEXT,
  value_number  NUMERIC,
  value_date    DATE,
  value_bool    BOOLEAN,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(definition_id, entity_id)
);

-- ─── TAGS (P74) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#6366f1',
  entity_type TEXT NOT NULL, -- contact | conversation | issue
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name, entity_type)
);

CREATE TABLE IF NOT EXISTS entity_tags (
  tag_id      UUID REFERENCES tags(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tag_id, entity_id)
);

CREATE TABLE IF NOT EXISTS auto_tag_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tag_id        UUID REFERENCES tags(id) ON DELETE CASCADE,
  condition_key TEXT NOT NULL, -- e.g., 'message_contains', 'lead_stage'
  condition_val TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SAVED FILTERS / SEGMENTS (P59) ─────────────────────────

CREATE TABLE IF NOT EXISTS saved_segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL DEFAULT 'contact', -- contact | lead | conversation
  filters     JSONB NOT NULL DEFAULT '{}',
  is_shared   BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES team_members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKFLOW AUTOMATION (P60) ───────────────────────────────

CREATE TABLE IF NOT EXISTS workflows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  trigger     JSONB NOT NULL, -- { type, config }
  conditions  JSONB DEFAULT '[]',
  actions     JSONB DEFAULT '[]',
  run_count   INT DEFAULT 0,
  created_by  UUID REFERENCES team_members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  UUID REFERENCES workflows(id) ON DELETE CASCADE,
  entity_id    UUID,
  status       TEXT DEFAULT 'success', -- success | failed
  error        TEXT,
  ran_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMAIL INTEGRATION (P61) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS email_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT DEFAULT 'gmail',
  email           TEXT NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT,
  token_expiry    TIMESTAMPTZ,
  last_synced_at  TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id  UUID REFERENCES email_integrations(id) ON DELETE CASCADE,
  thread_id       TEXT NOT NULL,
  client_id       UUID,
  subject         TEXT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID REFERENCES email_threads(id) ON DELETE CASCADE,
  message_id  TEXT NOT NULL,
  from_email  TEXT,
  to_email    TEXT,
  subject     TEXT,
  body        TEXT,
  direction   TEXT DEFAULT 'inbound', -- inbound | outbound
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CALENDAR INTEGRATION (P62) ──────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT DEFAULT 'google',
  email           TEXT NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT,
  token_expiry    TIMESTAMPTZ,
  last_synced_at  TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id  UUID REFERENCES calendar_integrations(id),
  external_id     TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ,
  client_id       UUID,
  followup_id     UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WEBHOOK ENGINE (P63) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS outgoing_webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  secret      TEXT,
  events      TEXT[] DEFAULT '{}', -- array of event names
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID REFERENCES outgoing_webhooks(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  payload         JSONB,
  response_status INT,
  response_body   TEXT,
  attempt         INT DEFAULT 1,
  status          TEXT DEFAULT 'success', -- success | failed
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TEMPLATE LIBRARY (P64) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS template_library (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL, -- message | followup | email | issue_reply | campaign
  category      TEXT,
  content       TEXT NOT NULL,
  variables     TEXT[] DEFAULT '{}',
  is_default    BOOLEAN DEFAULT FALSE,
  is_favorite   BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES team_members(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI PROMPT LIBRARY (P65) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_prompts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL, -- reply_suggestion | summary | pricing_response | followup_suggestion | issue_classification | lead_scoring | campaign_copywriting
  prompt_text   TEXT NOT NULL,
  version       INT DEFAULT 1,
  is_active     BOOLEAN DEFAULT TRUE,
  is_org_override BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES team_members(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_prompt_test_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id   UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
  input       TEXT,
  output      TEXT,
  tested_by   UUID REFERENCES team_members(id),
  tested_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SENTIMENT (P66) ─────────────────────────────────────────

ALTER TABLE clients ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC DEFAULT 0;

-- ─── LEAD SCORING (P67) ──────────────────────────────────────

ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_tier TEXT DEFAULT 'cold'; -- hot | warm | cold

CREATE TABLE IF NOT EXISTS lead_score_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL,
  score       INT NOT NULL,
  tier        TEXT NOT NULL,
  reason      TEXT,
  scored_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SLA & ESCALATION (P69) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'open', -- open | in_progress | resolved | closed
  priority        TEXT DEFAULT 'medium', -- low | medium | high | critical
  assigned_to     UUID REFERENCES team_members(id),
  sla_hours       INT DEFAULT 24,
  sla_deadline    TIMESTAMPTZ,
  breached        BOOLEAN DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES team_members(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  priority        TEXT NOT NULL,
  escalate_after_hours INT NOT NULL,
  notify_role     TEXT NOT NULL DEFAULT 'manager',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS (P70) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES team_members(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- new_message | issue_breach | followup_due | payment_reminder | ai_failure | integration_error | campaign_completed
  title       TEXT NOT NULL,
  body        TEXT,
  entity_type TEXT,
  entity_id   UUID,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ─── REPORT EXPORTS (P71) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS export_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- contacts | campaigns | ai_usage | issues | payments | analytics_pdf
  status      TEXT DEFAULT 'pending', -- pending | processing | done | failed
  file_url    TEXT,
  requested_by UUID REFERENCES team_members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── DASHBOARD WIDGETS (P72) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS widget_layouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES team_members(id) ON DELETE CASCADE,
  layout      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ─── FILE ATTACHMENTS (P57) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL, -- contact | message | issue
  entity_id     UUID NOT NULL,
  filename      TEXT NOT NULL,
  original_name TEXT,
  mime_type     TEXT,
  file_size     BIGINT,
  url           TEXT NOT NULL,
  uploaded_by   UUID REFERENCES team_members(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ONBOARDING STEPS (P80) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  step        TEXT NOT NULL, -- create_org | choose_plan | connect_ai | import_contacts | invite_team | create_campaign | open_inbox
  completed   BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(org_id, step)
);

-- ─── API USAGE METRICS (P78) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id),
  route         TEXT NOT NULL,
  method        TEXT NOT NULL,
  status_code   INT,
  latency_ms    INT,
  is_error      BOOLEAN DEFAULT FALSE,
  is_auth_fail  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_usage_route ON api_usage_logs(route, created_at DESC);

-- ─── SECURITY AUDIT (P79) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS security_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id),
  user_id     UUID REFERENCES team_members(id),
  event_type  TEXT NOT NULL, -- failed_login | permission_change | api_key_change | suspicious_activity
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_org ON security_audit_log(org_id, created_at DESC);

-- ─── INTEGRATION HEALTH (P77) ────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_health_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id),
  integration   TEXT NOT NULL, -- groq | gmail | calendar | clickup | make
  status        TEXT NOT NULL, -- ok | error
  latency_ms    INT,
  error_message TEXT,
  checked_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NBA RECOMMENDATIONS (P68) ───────────────────────────────

CREATE TABLE IF NOT EXISTS nba_recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL,
  action      TEXT NOT NULL, -- send_followup | assign_sales | send_pricing | escalate_issue | request_payment | move_lead_stage
  reason      TEXT,
  priority    INT DEFAULT 5,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
