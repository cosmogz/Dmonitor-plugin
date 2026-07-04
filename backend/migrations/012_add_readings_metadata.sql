-- 012_add_readings_metadata.sql
-- Add metadata column to readings for storing JSON metadata

ALTER TABLE readings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
