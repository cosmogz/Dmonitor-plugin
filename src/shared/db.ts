import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/app.config';

const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export function hasDatabase(): boolean {
  return Boolean(pool);
}

export async function query<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  if (!pool) {
    throw new Error('DATABASE_URL must be configured to use the database');
  }
  return pool.query<T>(text, params);
}

export async function initDatabase() {
  if (!pool) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS patient_links (
      id UUID PRIMARY KEY,
      patient_id TEXT,
      national_id TEXT,
      openmrs_uuid TEXT,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patient_history (
      id UUID PRIMARY KEY,
      patient_id TEXT NOT NULL,
      category TEXT NOT NULL,
      details TEXT NOT NULL,
      recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clinic_configs (
      id UUID PRIMARY KEY,
      clinic_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      alert_thresholds JSONB,
      feature_toggles JSONB,
      admin_roles JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS readings (
      id UUID PRIMARY KEY,
      patient_id TEXT NOT NULL,
      clinic_id TEXT,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      client_timestamp TIMESTAMP WITH TIME ZONE,
      offline_upload_id TEXT,
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

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      actor_type TEXT NOT NULL,
      action TEXT NOT NULL,
      patient_id TEXT,
      reading_id UUID,
      status TEXT NOT NULL,
      message TEXT,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
}
