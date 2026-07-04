-- 011_readings_idempotency.sql
-- Add client_id for idempotency and unique indexes to prevent duplicate readings

ALTER TABLE readings ADD COLUMN IF NOT EXISTS client_id TEXT;

-- unique index for client-provided id per patient
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'uniq_readings_patient_client' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX uniq_readings_patient_client ON readings (patient_id, client_id) WHERE client_id IS NOT NULL;
  END IF;
END $$;

-- unique index to catch exact duplicates by patient, timestamp and value
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'uniq_readings_patient_ts_value' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX uniq_readings_patient_ts_value ON readings (patient_id, recorded_at, value);
  END IF;
END $$;
