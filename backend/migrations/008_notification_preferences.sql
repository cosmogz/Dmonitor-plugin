-- Migration 008: per-patient notification preferences
-- Stores one row per patient per channel with destination address/phone
-- and optional severity filter so patients only get alerts above a threshold.

CREATE TABLE IF NOT EXISTS notification_preferences (
  id            SERIAL PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  channel       VARCHAR(32) NOT NULL CHECK (channel IN ('webhook','email','sms')),
  destination   TEXT NOT NULL,           -- email address, E.164 phone, or webhook URL
  severity_min  VARCHAR(16) NOT NULL DEFAULT 'warning'
                  CHECK (severity_min IN ('warning','critical')),
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, channel, destination)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_patient ON notification_preferences (patient_id);
