-- ClientFlow SaaS - Seed Data

-- Demo Organization
INSERT INTO organizations (id, name, slug, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Corp', 'demo-corp', 'pro');

-- Demo Admin User (password: Admin@1234)
INSERT INTO users (id, org_id, email, password_hash, name, role) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'admin@democorp.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'Admin User',
   'admin');

-- Demo Agent
INSERT INTO users (id, org_id, email, password_hash, name, role) VALUES
  ('00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'agent@democorp.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'Demo Agent',
   'agent');

-- Lead Stages
INSERT INTO lead_stages (org_id, name, order_index, color, is_default) VALUES
  ('00000000-0000-0000-0000-000000000001', 'New Lead',      0, '#6366f1', true),
  ('00000000-0000-0000-0000-000000000001', 'Contacted',     1, '#3b82f6', false),
  ('00000000-0000-0000-0000-000000000001', 'Qualified',     2, '#f59e0b', false),
  ('00000000-0000-0000-0000-000000000001', 'Proposal Sent', 3, '#8b5cf6', false),
  ('00000000-0000-0000-0000-000000000001', 'Won',           4, '#10b981', false),
  ('00000000-0000-0000-0000-000000000001', 'Lost',          5, '#ef4444', false);

-- Sample Contacts
INSERT INTO contacts (org_id, name, phone, email, city, lead_stage, lead_source, lead_score, lead_value, tags) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice Johnson', '+1234567890', 'alice@example.com', 'New York',  'Qualified',     'Website',  75, 5000, '{"hot","enterprise"}'),
  ('00000000-0000-0000-0000-000000000001', 'Bob Smith',     '+0987654321', 'bob@example.com',   'London',    'Contacted',     'Referral', 50, 2000, '{"warm"}'),
  ('00000000-0000-0000-0000-000000000001', 'Carol White',   '+1122334455', 'carol@example.com', 'Toronto',   'Proposal Sent', 'Ad',       85, 8000, '{"hot","vip"}');

-- Subscription
INSERT INTO subscriptions (org_id, plan_id, status, current_period_end)
  SELECT '00000000-0000-0000-0000-000000000001', id, 'active', NOW() + INTERVAL '30 days'
  FROM plans WHERE name = 'pro';

-- Feature Flags
INSERT INTO feature_flags (org_id, flag_key, is_enabled) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ai_reply_suggestion', true),
  ('00000000-0000-0000-0000-000000000001', 'campaign_automation',  true),
  ('00000000-0000-0000-0000-000000000001', 'advanced_analytics',   false);

-- AI Prompt Templates
INSERT INTO ai_prompt_templates (org_id, category, name, prompt_text, variables, is_default) VALUES
  ('00000000-0000-0000-0000-000000000001', 'reply', 'Friendly Reply',
   'You are a helpful customer support agent for {{company_name}}. Draft a friendly, concise reply to: {{message}}',
   '["company_name","message"]', true),
  ('00000000-0000-0000-0000-000000000001', 'lead_score', 'Lead Score',
   'Analyze this lead and return a score 0-100 with reasoning. Lead info: {{lead_info}}',
   '["lead_info"]', true),
  ('00000000-0000-0000-0000-000000000001', 'summarize', 'Conversation Summary',
   'Summarize this customer conversation in 3 bullet points:\n{{conversation}}',
   '["conversation"]', true);
