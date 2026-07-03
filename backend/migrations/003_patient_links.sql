-- Patient links mapping to external systems (e.g., OpenMRS)
CREATE TABLE IF NOT EXISTS patient_links (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  external_system TEXT NOT NULL,
  external_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (external_system, external_id)
);
