-- Initial schema for Dmonitor

CREATE TABLE IF NOT EXISTS patient_links (
  id UUID PRIMARY KEY,
  patient_id TEXT,
  national_id TEXT,
  openmrs_uuid TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY,
  patient_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  glucose_value DOUBLE PRECISION NOT NULL,
  units TEXT NOT NULL,
  device_id TEXT,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_statuses (
  id UUID PRIMARY KEY,
  patient_id TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY,
  patient_id TEXT NOT NULL,
  reading_id UUID,
  type TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  threshold DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE
);
