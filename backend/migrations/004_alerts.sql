-- 004_alerts.sql
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  reading_id INTEGER REFERENCES readings(id) ON DELETE SET NULL,
  severity TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
