-- 006_indexes.sql: performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_readings_patient_id ON readings(patient_id);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
