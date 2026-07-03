#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL must be set');
  process.exit(2);
}

const pool = new Pool({ connectionString: databaseUrl });

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
}

async function getApplied() {
  const res = await pool.query('SELECT id FROM migrations');
  return new Set(res.rows.map(r => r.id));
}

async function applyMigration(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO migrations (id) VALUES ($1)', [path.basename(filePath)]);
    await pool.query('COMMIT');
    console.log('Applied', filePath);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

(async () => {
  try {
    await ensureMigrationsTable();
    const applied = await getApplied();
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (!applied.has(f)) {
        await applyMigration(path.join(migrationsDir, f));
      }
    }
    console.log('Migrations complete');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    await pool.end();
    process.exit(1);
  }
})();
