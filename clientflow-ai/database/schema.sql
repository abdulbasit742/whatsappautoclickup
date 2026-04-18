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

-- ─── PLANS ──────────────────────────────────────────────────────────────────────
-- Defines the available subscription tiers and their feature limits.
CREATE TABLE plans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  VARCHAR(50) UNIQUE NOT NULL,          -- 'free' | 'basic' | 'pro' | 'enterprise'
  display_name          VARCHAR(100) NOT NULL,
  price_monthly_pkr     NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly_pkr      NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Feature limits (-1 = unlimited)
  max_clients           INT NOT NULL DEFAULT 50,
  max_broadcasts        INT NOT NULL DEFAULT 5,               -- per month
  max_templates         INT NOT NULL DEFAULT 5,
  max_appointments      INT NOT NULL DEFAULT 20,              -- per month
  max_ai_messages       INT NOT NULL DEFAULT 100,             -- per month
  max_team_members      INT NOT NULL DEFAULT 1,
  -- Feature flags
  ai_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  referrals_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_api_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  custom_branding       BOOLEAN NOT NULL DEFAULT FALSE,
  priority_support      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            SMALLINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO plans (name, display_name, price_monthly_pkr, price_yearly_pkr,
                   max_clients, max_broadcasts, max_templates, max_appointments, max_ai_messages, max_team_members,
                   ai_enabled, analytics_enabled, referrals_enabled, whatsapp_api_enabled, custom_branding, priority_support, sort_order)
VALUES
  ('free',       'Free',       0,        0,
   50,   5,   5,   10,  50,  1,
   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1),

  ('basic',      'Basic',      2999,     29990,
   500,  20,  20,  100, 500, 1,
   TRUE,  FALSE, FALSE, TRUE,  FALSE, FALSE, 2),

  ('pro',        'Pro',        6999,     69990,
   2000, 100, 50,  500, 2000, 3,
   TRUE,  TRUE,  TRUE,  TRUE,  FALSE, FALSE, 3),

  ('enterprise', 'Enterprise', 14999,    149990,
   -1,   -1,  -1,  -1,  -1,  -1,
   TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  4);

-- ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────────────
-- Tracks which plan the owner is currently on and billing cycle details.
CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_email       VARCHAR(150) NOT NULL,
  plan_id           UUID NOT NULL REFERENCES plans(id),
  billing_cycle     VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status            VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','cancelled','past_due','trialing','paused')),
  trial_ends_at     TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at      TIMESTAMPTZ,
  -- Running usage counters for the current billing period
  usage_clients     INT NOT NULL DEFAULT 0,
  usage_broadcasts  INT NOT NULL DEFAULT 0,
  usage_ai_messages INT NOT NULL DEFAULT 0,
  usage_appointments INT NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_owner ON subscriptions(owner_email);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ─── SUBSCRIPTION INVOICES ───────────────────────────────────────────────────────
-- Records every billing event and manual payment confirmation.
CREATE TABLE subscription_invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id  UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  plan_id          UUID NOT NULL REFERENCES plans(id),
  billing_cycle    VARCHAR(10) NOT NULL DEFAULT 'monthly',
  amount_pkr       NUMERIC(10,2) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','failed','refunded','waived')),
  payment_method   VARCHAR(30) CHECK (payment_method IN ('easypaisa','jazzcash','bank','cash','stripe','trial')),
  transaction_ref  VARCHAR(100),
  screenshot_url   VARCHAR(255),
  period_start     TIMESTAMPTZ NOT NULL,
  period_end       TIMESTAMPTZ NOT NULL,
  paid_at          TIMESTAMPTZ,
  due_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sub_invoices_sub     ON subscription_invoices(subscription_id);
CREATE INDEX idx_sub_invoices_status  ON subscription_invoices(status);
CREATE INDEX idx_sub_invoices_created ON subscription_invoices(created_at DESC);
