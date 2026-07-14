-- ClientFlow AI — Seed Data

INSERT INTO services (name, description, price_pkr, delivery_days, category) VALUES
  ('Social Media Management', 'Full management of Instagram, Facebook & TikTok for 1 month', 15000, 30, 'Marketing'),
  ('Logo Design', 'Professional logo design with 3 revisions, all formats included', 5000, 3, 'Design'),
  ('WhatsApp Bot Setup', 'Custom WhatsApp automation bot for your business', 25000, 7, 'Automation'),
  ('Website Development', 'Modern responsive website with 5 pages + contact form', 35000, 14, 'Development'),
  ('AI Chatbot Integration', 'AI-powered customer support chatbot for your business', 20000, 5, 'AI Solutions');

INSERT INTO templates (name, category, content) VALUES
  ('Welcome Message', 'onboarding', 'Assalam u Alaikum {{client_name}}! 👋 Welcome to our services. We are glad you reached out. How can we help you today?'),
  ('Pricing Request', 'pricing', 'Here are our current services and pricing:\n\n{{service_catalog}}\n\nFeel free to ask about any service in detail! 😊'),
  ('Payment Instructions', 'payment', 'Great! To proceed with your order, please send payment to:\n\n💚 Easypaisa: 03XXXXXXXXX\n💙 JazzCash: 03XXXXXXXXX\n🏦 Bank: Account details on request\n\nAmount: PKR {{amount}}\n\nPlease send a screenshot after payment. ✅'),
  ('Review Request', 'review', 'Assalam u Alaikum {{client_name}}! 😊 We hope you are satisfied with our service. Could you please share a quick rating from 1-5 and any feedback? Your review helps us improve! ⭐'),
  ('Follow Up Cold Lead', 'followup', 'Hello {{client_name}}! 👋 Just checking in — we noticed you were interested in our services. We are still here to help! Any questions? 😊');

INSERT INTO settings (key, value) VALUES
  ('business_name', 'My Business'),
  ('business_description', 'Professional services for your needs'),
  ('owner_whatsapp', ''),
  ('easypaisa_number', ''),
  ('jazzcash_number', ''),
  ('bank_details', ''),
  ('auto_reply_enabled', 'true'),
  ('working_hours_start', '09:00'),
  ('working_hours_end', '22:00'),
  ('offline_message', 'Thank you for reaching out! We are currently offline. We will get back to you soon. Business hours: 9 AM - 10 PM 🌙'),
  ('follow_up_cold_lead_hours', '24'),
  ('follow_up_payment_hours', '24'),
  ('follow_up_post_delivery_days', '2'),
  ('follow_up_re_engagement_days', '14'),
  ('ai_provider_priority', 'claude,openai,gemini,groq');

INSERT INTO follow_up_sequences (name, trigger_type, is_active) VALUES
  ('No Reply Drip', 'no_reply', true),
  ('Seen No Reply Recovery', 'seen_no_reply', true);

INSERT INTO follow_up_sequence_steps (sequence_id, day_offset, message_template, sort_order)
SELECT id, 1, 'Hey {{client_name}}, just checking if you need help deciding. I can share quick pricing options.', 1
FROM follow_up_sequences WHERE name='No Reply Drip';

INSERT INTO follow_up_sequence_steps (sequence_id, day_offset, message_template, sort_order)
SELECT id, 3, 'Friendly reminder 👋 We still have slots this week. Want details or a custom package?', 2
FROM follow_up_sequences WHERE name='No Reply Drip';

INSERT INTO follow_up_sequence_steps (sequence_id, day_offset, message_template, sort_order)
SELECT id, 7, 'Final reminder: we can lock this offer for you today. Reply anytime to continue.', 3
FROM follow_up_sequences WHERE name='No Reply Drip';

INSERT INTO users (email, full_name, role) VALUES
  ('owner@clientflow.local', 'Workspace Owner', 'owner'),
  ('agent1@clientflow.local', 'Sales Agent 1', 'agent')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tags (name, color) VALUES
  ('hot lead', 'red'),
  ('follow-up', 'amber'),
  ('paid', 'green'),
  ('inactive', 'slate')
ON CONFLICT (name) DO NOTHING;
