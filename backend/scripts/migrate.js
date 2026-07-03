const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function ensureMigrationTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now()
  );`);
}

async function appliedMigrations() {
  const r = await db.query('SELECT filename FROM migrations');
  return new Set(r.rows.map(r => r.filename));
}

async function applyMigration(file) {
  const sql = fs.readFileSync(file, 'utf8');
  console.log('Applying', path.basename(file));
  await db.query(sql);
  await db.query('INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [path.basename(file)]);
}

async function main() {
  try {
    await ensureMigrationTable();
    const applied = await appliedMigrations();
    const dir = path.resolve(__dirname, '..', 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (!applied.has(f)) {
        await applyMigration(path.join(dir, f));
      } else {
        console.log('Skipping', f);
      }
    }
    console.log('Migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
}

main();
