-- ClientFlow AI v2 — Schema additions for Prompts 161-180

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(150) NOT NULL,
  slug         VARCHAR(100) UNIQUE NOT NULL,
  owner_id     UUID,  -- references users table when added
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100),
  avatar_url    VARCHAR(255),
  active_org_id UUID REFERENCES organizations(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ADD CONSTRAINT fk_org_owner FOREIGN KEY (owner_id) REFERENCES users(id);

-- ─── ORG MEMBERS ────────────────────────────────────────────────────────────
CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(30) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','manager','member','viewer')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- ─── ORG INVITES ─────────────────────────────────────────────────────────────
CREATE TABLE org_invites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by   UUID REFERENCES users(id),
  email        VARCHAR(150) NOT NULL,
  role         VARCHAR(30) NOT NULL DEFAULT 'member' CHECK (role IN ('admin','manager','member','viewer')),
  token        VARCHAR(255) UNIQUE NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_invites_org ON org_invites(org_id);
CREATE INDEX idx_invites_token ON org_invites(token);
CREATE INDEX idx_invites_email ON org_invites(email);

-- ─── SUBSCRIPTION PLANS ──────────────────────────────────────────────────────
CREATE TABLE subscription_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(50) NOT NULL,
  slug          VARCHAR(50) UNIQUE NOT NULL,
  price_monthly NUMERIC(10,2) DEFAULT 0,
  price_yearly  NUMERIC(10,2) DEFAULT 0,
  seat_limit    INT NOT NULL DEFAULT 5,
  features      JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Default plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, seat_limit, features) VALUES
  ('Free',       'free',       0,     0,      2,  '["basic_inbox","manual_broadcasts"]'),
  ('Starter',    'starter',    29,    290,    5,  '["ai_replies","broadcasts","analytics"]'),
  ('Growth',     'growth',     79,    790,    15, '["ai_replies","broadcasts","analytics","automations","api_access"]'),
  ('Business',   'business',   199,   1990,   50, '["all_features","priority_support","custom_branding"]'),
  ('Enterprise', 'enterprise', 499,   4990,   -1, '["unlimited_seats","sso","dedicated_support"]');

-- ─── ORG SUBSCRIPTIONS ────────────────────────────────────────────────────────
CREATE TABLE org_subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES subscription_plans(id),
  status            VARCHAR(20) DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','paused')),
  billing_cycle     VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  trial_starts_at   TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  canceled_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_org ON org_subscriptions(org_id);

-- ─── BRANDING SETTINGS ───────────────────────────────────────────────────────
CREATE TABLE org_branding (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  company_name   VARCHAR(150),
  logo_url       VARCHAR(255),
  favicon_url    VARCHAR(255),
  primary_color  VARCHAR(7) DEFAULT '#10b981',
  secondary_color VARCHAR(7) DEFAULT '#3b82f6',
  support_email  VARCHAR(150),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────
CREATE TABLE email_templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL CHECK (type IN ('invite','password_reset','billing','notification','onboarding')),
  name         VARCHAR(100) NOT NULL,
  subject      VARCHAR(255) NOT NULL,
  html_body    TEXT NOT NULL,
  variables    JSONB DEFAULT '[]',
  is_default   BOOLEAN DEFAULT FALSE,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_templates_org ON email_templates(org_id);
CREATE INDEX idx_email_templates_type ON email_templates(type);

-- ─── ONBOARDING CHECKLIST ────────────────────────────────────────────────────
CREATE TABLE onboarding_progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item         VARCHAR(50) NOT NULL CHECK (item IN ('complete_profile','connect_ai','import_contacts','invite_team','create_campaign','open_inbox')),
  completed_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id, item)
);
CREATE INDEX idx_onboarding_org ON onboarding_progress(org_id);

-- ─── IN-APP ANNOUNCEMENTS ────────────────────────────────────────────────────
CREATE TABLE announcements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  type         VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info','warning','error','success','maintenance')),
  target_plan  VARCHAR(50),  -- null = all plans
  starts_at    TIMESTAMPTZ DEFAULT NOW(),
  ends_at      TIMESTAMPTZ,
  is_active    BOOLEAN DEFAULT TRUE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcement_dismissals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- ─── RELEASE NOTES ───────────────────────────────────────────────────────────
CREATE TABLE release_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version      VARCHAR(20) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  highlights   JSONB DEFAULT '[]',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE release_note_reads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_note_id UUID NOT NULL REFERENCES release_notes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(release_note_id, user_id)
);

-- ─── HELP CENTER ─────────────────────────────────────────────────────────────
CREATE TABLE help_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  icon        VARCHAR(50),
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE help_articles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id  UUID REFERENCES help_categories(id) ON DELETE SET NULL,
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) UNIQUE NOT NULL,
  body         TEXT NOT NULL,
  is_featured  BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  view_count   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_help_articles_category ON help_articles(category_id);
CREATE INDEX idx_help_articles_featured ON help_articles(is_featured);

-- ─── FAQs ────────────────────────────────────────────────────────────────────
CREATE TABLE faq_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE faqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES faq_categories(id) ON DELETE SET NULL,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_faqs_category ON faqs(category_id);

-- ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────
CREATE TABLE support_tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  category        VARCHAR(50) CHECK (category IN ('billing','technical','feature_request','bug','other')),
  message         TEXT NOT NULL,
  attachment_url  VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority        VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_org ON support_tickets(org_id);

-- ─── CUSTOMER HEALTH SCORES ──────────────────────────────────────────────────
CREATE TABLE customer_health_scores (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_score    SMALLINT DEFAULT 0 CHECK (activity_score BETWEEN 0 AND 100),
  reply_rate_score  SMALLINT DEFAULT 0 CHECK (reply_rate_score BETWEEN 0 AND 100),
  payment_score     SMALLINT DEFAULT 0 CHECK (payment_score BETWEEN 0 AND 100),
  issue_score       SMALLINT DEFAULT 0 CHECK (issue_score BETWEEN 0 AND 100),
  usage_score       SMALLINT DEFAULT 0 CHECK (usage_score BETWEEN 0 AND 100),
  total_score       SMALLINT DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  label             VARCHAR(20) DEFAULT 'healthy' CHECK (label IN ('healthy','at_risk','critical')),
  calculated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_health_scores_org ON customer_health_scores(org_id);

-- ─── LIFECYCLE STAGES ────────────────────────────────────────────────────────
CREATE TABLE lifecycle_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage      VARCHAR(20) NOT NULL CHECK (stage IN ('new','active','engaged','at_risk','churned','won_back')),
  prev_stage VARCHAR(20),
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lifecycle_org ON lifecycle_events(org_id);
CREATE INDEX idx_lifecycle_stage ON lifecycle_events(stage);

-- ─── WIN-BACK CAMPAIGNS ──────────────────────────────────────────────────────
CREATE TABLE winback_campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trigger     VARCHAR(50) CHECK (trigger IN ('no_activity','expired_trial','canceled_plan','low_engagement')),
  action      VARCHAR(50) CHECK (action IN ('email_reminder','followup_task','special_offer')),
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','converted','dismissed')),
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_winback_org ON winback_campaigns(org_id);

-- ─── RENEWAL REMINDERS ────────────────────────────────────────────────────────
CREATE TABLE renewal_reminders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES org_subscriptions(id) ON DELETE CASCADE,
  type            VARCHAR(30) CHECK (type IN ('upcoming_renewal','failed_renewal','admin_reminder','customer_reminder')),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FEATURE FLAGS ────────────────────────────────────────────────────────────
CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  enabled     BOOLEAN DEFAULT FALSE,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('live_chat_support', FALSE, 'Live chat support widget — reserved for future expansion');
