const db = require('../db');

async function processBatch(batchId) {
  // load batch
  const bRes = await db.query('SELECT id, session_id, payload FROM sync_batches WHERE id=$1', [batchId]);
  if (bRes.rowCount === 0) throw new Error('batch not found');
  const batch = bRes.rows[0];
  let payload = batch.payload;
  if (typeof payload === 'string') payload = JSON.parse(payload);

  const readings = Array.isArray(payload.readings) ? payload.readings : [];
  const created = [];

  try {
    for (const r of readings) {
      // dedupe by patient_id + recorded_at + value
      const patientId = r.patient_id || batch.session_id || null;
      const recordedAt = r.recorded_at || new Date().toISOString();
      const value = r.value;
      const existsQ = 'SELECT 1 FROM readings WHERE patient_id=$1 AND recorded_at=$2 AND value=$3 LIMIT 1';
      const ex = await db.query(existsQ, [patientId, recordedAt, value]);
      if (ex.rowCount > 0) continue; // skip duplicate

      // support client-provided idempotency key
      const clientId = r.client_id || payload.client_id || null;
      const insQ = 'INSERT INTO readings (patient_id, value, unit, recorded_at, metadata, client_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id';
      const insParams = [patientId, value, r.unit || null, recordedAt, JSON.stringify(r.metadata || {}), clientId];
      try {
        const ir = await db.query(insQ, insParams);
        if (ir.rows && ir.rows[0]) created.push(ir.rows[0].id);
      } catch (e) {
        // unique constraint (dedupe) - skip
        if (e && e.code === '23505') continue;
        throw e;
      }
    }

    // mark batch processed
    await db.query('UPDATE sync_batches SET status=$1 WHERE id=$2', ['processed', batchId]);
    // update session last_synced_at
    await db.query('UPDATE sync_sessions SET last_synced_at=now() WHERE id=$1', [batch.session_id]);
    return { created };
  } catch (err) {
    await db.query('UPDATE sync_batches SET status=$1 WHERE id=$2', ['failed', batchId]);
    throw err;
  }
}

// exported for manual processing/integration tests
module.exports = { processBatch };
