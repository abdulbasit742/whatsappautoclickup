-- ─── PROMPTS 181-200: Schema Additions ─────────────────────────────────────────

-- P183: Activation Events
CREATE TABLE IF NOT EXISTS activation_events (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  event_type  VARCHAR(60) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, event_type)
);

-- P184: Feature Usage
CREATE TABLE IF NOT EXISTS feature_usage (
  id           SERIAL PRIMARY KEY,
  client_id    INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  feature      VARCHAR(60) NOT NULL,
  use_count    INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, feature)
);

-- P187: Add billing recovery columns to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reminder_sent     BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reminder_sent_at  TIMESTAMPTZ;

-- P189: Affiliates
CREATE TABLE IF NOT EXISTS affiliates (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(120),
  phone           VARCHAR(30),
  referral_code   VARCHAR(20) UNIQUE NOT NULL,
  referral_link   TEXT,
  total_paid      NUMERIC(12,2) DEFAULT 0,
  pending_balance NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id                SERIAL PRIMARY KEY,
  affiliate_id      INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  payout_status     VARCHAR(20) DEFAULT 'pending',
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- P190: Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  content     TEXT,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  status      VARCHAR(20) DEFAULT 'pending', -- requested, pending, approved, rejected, published
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- P191: Case Studies
CREATE TABLE IF NOT EXISTS case_studies (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  customer_name   VARCHAR(120),
  logo_url        TEXT,
  problem         TEXT,
  solution        TEXT,
  results         TEXT,
  tags            TEXT,
  is_published    BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- P192: NPS
CREATE TABLE IF NOT EXISTS nps_responses (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  score       SMALLINT CHECK (score BETWEEN 0 AND 10),
  comment     TEXT,
  category    VARCHAR(20), -- promoter, passive, detractor
  status      VARCHAR(20) DEFAULT 'sent', -- sent, responded
  responded_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id)
);

-- P193: CSAT
CREATE TABLE IF NOT EXISTS csat_responses (
  id           SERIAL PRIMARY KEY,
  client_id    INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  survey_type  VARCHAR(30), -- support, campaign
  rating       SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  status       VARCHAR(20) DEFAULT 'sent', -- sent, responded
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- P194: Roadmap Voting
CREATE TABLE IF NOT EXISTS roadmap_items (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  submitted_by  VARCHAR(120),
  status        VARCHAR(30) DEFAULT 'submitted', -- submitted, planned, in_progress, shipped, rejected
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roadmap_votes (
  id         SERIAL PRIMARY KEY,
  item_id    INTEGER REFERENCES roadmap_items(id) ON DELETE CASCADE,
  voter_id   VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (item_id, voter_id)
);

CREATE TABLE IF NOT EXISTS roadmap_comments (
  id         SERIAL PRIMARY KEY,
  item_id    INTEGER REFERENCES roadmap_items(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  author     VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- P195: Beta Programs
CREATE TABLE IF NOT EXISTS beta_programs (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  description  TEXT,
  feature_flag VARCHAR(80),
  is_active    BOOLEAN DEFAULT TRUE,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beta_enrollments (
  id          SERIAL PRIMARY KEY,
  program_id  INTEGER REFERENCES beta_programs(id) ON DELETE CASCADE,
  client_id   INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (program_id, client_id)
);

CREATE TABLE IF NOT EXISTS beta_feedback (
  id          SERIAL PRIMARY KEY,
  program_id  INTEGER REFERENCES beta_programs(id) ON DELETE CASCADE,
  client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- P196: Status Page
CREATE TABLE IF NOT EXISTS status_components (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  category    VARCHAR(80),
  status      VARCHAR(30) DEFAULT 'operational', -- operational, degraded, partial_outage, major_outage, maintenance
  message     TEXT,
  sort_order  INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_windows (
  id                   SERIAL PRIMARY KEY,
  title                VARCHAR(200) NOT NULL,
  description          TEXT,
  scheduled_start      TIMESTAMPTZ,
  scheduled_end        TIMESTAMPTZ,
  affected_components  TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- P197: Incidents (extends status_incidents if exists, else create)
CREATE TABLE IF NOT EXISTS status_incidents (
  id                  SERIAL PRIMARY KEY,
  title               VARCHAR(200) NOT NULL,
  severity            VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  status              VARCHAR(30) DEFAULT 'investigating', -- investigating, identified, monitoring, resolved
  description         TEXT,
  affected_components TEXT,
  resolved_at         TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_updates (
  id          SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES status_incidents(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  status      VARCHAR(30),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- P198: Postmortems
CREATE TABLE IF NOT EXISTS postmortems (
  id                  SERIAL PRIMARY KEY,
  incident_id         INTEGER REFERENCES status_incidents(id) ON DELETE SET NULL,
  summary             TEXT,
  impact              TEXT,
  root_cause          TEXT,
  timeline            TEXT,
  fixes               TEXT,
  prevention_actions  TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- P196: Seed default status components
INSERT INTO status_components (name, category, status, sort_order) VALUES
  ('App',           'Frontend',     'operational', 1),
  ('API',           'Backend',      'operational', 2),
  ('Database',      'Backend',      'operational', 3),
  ('OpenAI',        'AI Providers', 'operational', 4),
  ('Anthropic',     'AI Providers', 'operational', 5),
  ('WhatsApp API',  'Integrations', 'operational', 6),
  ('Stripe/Billing','Integrations', 'operational', 7)
ON CONFLICT DO NOTHING;
