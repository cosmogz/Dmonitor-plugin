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
  `);
}
