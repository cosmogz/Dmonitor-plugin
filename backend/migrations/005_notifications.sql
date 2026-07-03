-- 005_notifications.sql
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
