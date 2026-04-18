-- ClientFlow AI — Migration v2 (run on existing databases)
-- Apply after initial schema.sql deployment

-- Add priority column to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium'
  CHECK (priority IN ('high','medium','low'));

-- Add unique index for message idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_id
  ON messages(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- Add priority index on alerts
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);

-- Add service_delivery_message setting if not exists
INSERT INTO settings (key, value)
VALUES ('service_delivery_message', '🎉 Your service is now active, {{name}}! Here are your details:\n\n[Add service details here]\n\nThank you for choosing us! Feel free to reach out if you need anything. 😊')
ON CONFLICT (key) DO NOTHING;
