-- ClientFlow AI — Social Media Integration Schema (Prompts 141-160)
-- Run AFTER schema.sql

-- ─── SOCIAL ACCOUNTS ─────────────────────────────────────────────────────────────
-- Stores connected Facebook Pages and Instagram Business Accounts
CREATE TABLE social_accounts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform            VARCHAR(20) NOT NULL CHECK (platform IN ('facebook','instagram')),
  account_id          VARCHAR(150) NOT NULL,           -- FB page_id or IG account_id
  account_name        VARCHAR(250),
  username            VARCHAR(150),
  access_token        TEXT NOT NULL,
  token_type          VARCHAR(20) DEFAULT 'page' CHECK (token_type IN ('user','page','system')),
  expires_at          TIMESTAMPTZ,                     -- NULL = never expires (page tokens)
  last_refreshed_at   TIMESTAMPTZ DEFAULT NOW(),
  scopes              TEXT,                            -- comma-separated granted scopes
  profile_picture_url TEXT,
  fb_page_id          VARCHAR(150),                    -- parent FB page (for IG accounts)
  is_active           BOOLEAN DEFAULT TRUE,
  error_message       TEXT,                            -- last known error
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id)
);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_active   ON social_accounts(is_active);

-- ─── SOCIAL MESSAGES ─────────────────────────────────────────────────────────────
CREATE TABLE social_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id          UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform            VARCHAR(20) NOT NULL CHECK (platform IN ('facebook','instagram')),
  conversation_id     VARCHAR(200),
  sender_id           VARCHAR(150),
  sender_name         VARCHAR(250),
  direction           VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  content             TEXT,
  message_type        VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','audio','video','attachment','sticker')),
  platform_message_id VARCHAR(250) UNIQUE,
  is_read             BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_social_messages_account        ON social_messages(account_id);
CREATE INDEX idx_social_messages_conversation   ON social_messages(conversation_id);
CREATE INDEX idx_social_messages_created        ON social_messages(created_at DESC);

-- ─── SOCIAL COMMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE social_comments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id          UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform            VARCHAR(20) NOT NULL CHECK (platform IN ('facebook','instagram')),
  post_id             VARCHAR(200),
  comment_id          VARCHAR(250) UNIQUE NOT NULL,
  commenter_id        VARCHAR(150),
  commenter_name      VARCHAR(250),
  content             TEXT,
  replied             BOOLEAN DEFAULT FALSE,
  reply_content       TEXT,
  replied_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_social_comments_account  ON social_comments(account_id);
CREATE INDEX idx_social_comments_replied  ON social_comments(replied);
CREATE INDEX idx_social_comments_post     ON social_comments(post_id);

-- ─── SOCIAL POSTS (Scheduler) ─────────────────────────────────────────────────────
CREATE TABLE social_posts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id          UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform            VARCHAR(20) NOT NULL CHECK (platform IN ('facebook','instagram')),
  content             TEXT NOT NULL,
  media_url           TEXT,
  status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  scheduled_at        TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  platform_post_id    VARCHAR(250),
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_social_posts_account   ON social_posts(account_id);
CREATE INDEX idx_social_posts_status    ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_at);

-- ─── SOCIAL AUTO-REPLY RULES ──────────────────────────────────────────────────────
CREATE TABLE social_auto_replies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id   UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('new_message','keyword','comment')),
  keyword      VARCHAR(200),
  reply_text   TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  match_count  INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_social_auto_replies_account ON social_auto_replies(account_id);
CREATE INDEX idx_social_auto_replies_active  ON social_auto_replies(is_active);
