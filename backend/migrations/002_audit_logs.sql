-- Audit log table for recording important actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id INTEGER,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
