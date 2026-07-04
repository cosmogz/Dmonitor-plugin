-- 009_create_sync_tables.sql
-- Create tables to support offline sync sessions and batch ingestion

CREATE TABLE IF NOT EXISTS sync_sessions (
  id SERIAL PRIMARY KEY,
  device_id TEXT,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_batches (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sync_sessions(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
