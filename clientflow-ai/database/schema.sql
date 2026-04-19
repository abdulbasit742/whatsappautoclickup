-- ClientFlow AI — PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── CLIENTS ────────────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_number  VARCHAR(20) UNIQUE NOT NULL,
  name             VARCHAR(100),
  email            VARCHAR(150),
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at   TIMESTAMPTZ DEFAULT NOW(),
  total_spent_pkr  NUMERIC(12,2) DEFAULT 0,
  referral_code    VARCHAR(10) UNIQUE,
  referred_by_id   UUID REFERENCES clients(id),
  notes            TEXT,
  status           VARCHAR(20) DEFAULT 'lead' CHECK (status IN ('lead','active','paid','inactive','blocked')),
  language         VARCHAR(10) DEFAULT 'en',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clients_number ON clients(whatsapp_number);
CREATE INDEX idx_clients_status ON clients(status);

-- ─── MESSAGES ───────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID REFERENCES clients(id) ON DELETE CASCADE,
  direction           VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  content             TEXT,
  message_type        VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','audio','document','reaction','template')),
  whatsapp_message_id VARCHAR(100),
  ai_provider_used    VARCHAR(30),
  is_flagged          BOOLEAN DEFAULT FALSE,
  flag_reason         TEXT,
  delivered           BOOLEAN DEFAULT FALSE,
  read                BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_client ON messages(client_id);
CREATE INDEX idx_messages_flagged ON messages(is_flagged);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ─── SERVICES ───────────────────────────────────────────────────────────────────
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  price_pkr     NUMERIC(10,2) NOT NULL,
  delivery_days INT DEFAULT 1,
  category      VARCHAR(50),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENTS ───────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id),
  amount_pkr      NUMERIC(10,2) NOT NULL,
  method          VARCHAR(30) CHECK (method IN ('easypaisa','jazzcash','bank','cash')),
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','refunded')),
  screenshot_url  VARCHAR(255),
  transaction_ref VARCHAR(100),
  confirmed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ─── ALERTS ─────────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(50) NOT NULL CHECK (type IN ('unresolved_query','pending_payment','new_review','inactive_client','ai_failure','new_client','complaint')),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  message     TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_alerts_resolved ON alerts(is_resolved);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- ─── REVIEWS ────────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  feedback   TEXT,
  sentiment  VARCHAR(20) CHECK (sentiment IN ('positive','neutral','negative')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BROADCASTS ─────────────────────────────────────────────────────────────────
CREATE TABLE broadcasts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(150),
  message         TEXT NOT NULL,
  target_audience VARCHAR(30) DEFAULT 'all' CHECK (target_audience IN ('all','paid','inactive','leads')),
  status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','failed')),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_sent      INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_read      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE broadcast_recipients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  delivered    BOOLEAN DEFAULT FALSE,
  read         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcast_id, client_id)
);

-- ─── TEMPLATES ──────────────────────────────────────────────────────────────────
CREATE TABLE templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50),
  content     TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── APPOINTMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  slot_datetime   TIMESTAMPTZ NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  reminder_sent   BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REFERRALS ──────────────────────────────────────────────────────────────────
CREATE TABLE referrals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  referred_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  reward_sent       BOOLEAN DEFAULT FALSE,
  reward_sent_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FOLLOW UPS ─────────────────────────────────────────────────────────────────
CREATE TABLE follow_ups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  type         VARCHAR(30) CHECK (type IN ('cold_lead','pending_payment','post_delivery','re_engagement','upsell')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_followups_scheduled ON follow_ups(scheduled_at);
CREATE INDEX idx_followups_status ON follow_ups(status);

-- ─── AI LOGS ────────────────────────────────────────────────────────────────────
CREATE TABLE ai_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  provider        VARCHAR(30),
  prompt_tokens   INT,
  response_tokens INT,
  latency_ms      INT,
  success         BOOLEAN DEFAULT TRUE,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SETTINGS ───────────────────────────────────────────────────────────────────
CREATE TABLE settings (
  id         SERIAL PRIMARY KEY,
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (Multi-user roles) ─────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name         VARCHAR(100),
  role         VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin','agent','viewer')),
  is_active    BOOLEAN DEFAULT TRUE,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- ─── LEADS ───────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  title           VARCHAR(200),
  source          VARCHAR(50) CHECK (source IN ('whatsapp','website','referral','manual','campaign','social')),
  stage           VARCHAR(30) DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  value_pkr       NUMERIC(12,2),
  lead_score      SMALLINT DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  follow_up_status VARCHAR(30) DEFAULT 'pending' CHECK (follow_up_status IN ('pending','in_progress','done','no_response')),
  payment_status  VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  issue_status    VARCHAR(20) DEFAULT 'none' CHECK (issue_status IN ('none','open','resolved')),
  notes           TEXT,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leads_client ON leads(client_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_score ON leads(lead_score);

-- ─── TAGS ─────────────────────────────────────────────────────────────────────
CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(50) UNIQUE NOT NULL,
  color      VARCHAR(7) DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_tags (
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  tag_id    UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);

-- ─── STRUCTURED NOTES ────────────────────────────────────────────────────────
CREATE TABLE notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,
  lead_id    UUID REFERENCES leads(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  type       VARCHAR(20) DEFAULT 'general' CHECK (type IN ('general','call','meeting','email','ai_summary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notes_client ON notes(client_id);

-- ─── API KEYS ─────────────────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  key_hash   VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  scopes     TEXT[],
  last_used  TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INTEGRATIONS ────────────────────────────────────────────────────────────
CREATE TABLE integrations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) UNIQUE NOT NULL CHECK (name IN ('gmail','google_calendar','clickup','make','stripe','paypal','razorpay')),
  is_enabled  BOOLEAN DEFAULT FALSE,
  config      JSONB DEFAULT '{}',
  last_synced TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PLANS & SUBSCRIPTIONS ───────────────────────────────────────────────────
CREATE TABLE plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  price_pkr     NUMERIC(10,2) NOT NULL,
  price_usd     NUMERIC(10,2),
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','yearly')),
  features      JSONB DEFAULT '[]',
  max_users     INT DEFAULT 3,
  max_contacts  INT DEFAULT 500,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID REFERENCES plans(id),
  status        VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial','active','paused','cancelled','expired')),
  starts_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  payment_method VARCHAR(30),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id),
  amount_pkr     NUMERIC(10,2) NOT NULL,
  amount_usd     NUMERIC(10,2),
  status         VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','overdue','void')),
  due_date       TIMESTAMPTZ,
  paid_at        TIMESTAMPTZ,
  pdf_url        VARCHAR(255),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DRIP CAMPAIGNS ──────────────────────────────────────────────────────────
CREATE TABLE contact_lists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_list_members (
  list_id   UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, client_id)
);

CREATE TABLE drip_campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(150) NOT NULL,
  list_id     UUID REFERENCES contact_lists(id),
  status      VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drip_steps (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id    UUID REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_number    INT NOT NULL,
  delay_hours    INT DEFAULT 24,
  template_id    UUID REFERENCES templates(id),
  message        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drip_enrollments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  current_step  INT DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','completed','unsubscribed')),
  enrolled_at   TIMESTAMPTZ DEFAULT NOW(),
  next_send_at  TIMESTAMPTZ,
  UNIQUE(campaign_id, client_id)
);

-- ─── A/B TESTING ─────────────────────────────────────────────────────────────
CREATE TABLE ab_tests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(150) NOT NULL,
  broadcast_id UUID REFERENCES broadcasts(id),
  variant_a    TEXT NOT NULL,
  variant_b    TEXT NOT NULL,
  winner       CHAR(1) CHECK (winner IN ('A','B')),
  sent_a       INT DEFAULT 0,
  sent_b       INT DEFAULT 0,
  opens_a      INT DEFAULT 0,
  opens_b      INT DEFAULT 0,
  replies_a    INT DEFAULT 0,
  replies_b    INT DEFAULT 0,
  status       VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running','completed','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WEBHOOKS ─────────────────────────────────────────────────────────────────
CREATE TABLE webhook_endpoints (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url        VARCHAR(500) NOT NULL,
  events     TEXT[],
  secret     VARCHAR(100),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event       VARCHAR(100),
  payload     JSONB,
  response_status INT,
  delivered   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
