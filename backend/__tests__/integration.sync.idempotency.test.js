const db = require('../src/db');
const { processBatch } = require('../src/sync/worker');

describe('Sync idempotency', () => {
  let patientId;
  afterAll(async () => {
    if (patientId) {
      await db.query('DELETE FROM readings WHERE patient_id=$1', [patientId]);
      await db.query('DELETE FROM sync_batches WHERE session_id IN (SELECT id FROM sync_sessions WHERE patient_id=$1)', [patientId]);
      await db.query('DELETE FROM sync_sessions WHERE patient_id=$1', [patientId]);
      await db.query('DELETE FROM patients WHERE id=$1', [patientId]);
    }
    await db.pool.end();
  });

  test('processBatch inserts readings and skips duplicates', async () => {
    // create patient
    const p = await db.query("INSERT INTO patients (external_id, name) VALUES ($1,$2) RETURNING id", ['itest-1', 'Integration Test']);
    patientId = p.rows[0].id;

    // create sync session
    const s = await db.query('INSERT INTO sync_sessions (device_id, patient_id) VALUES ($1,$2) RETURNING id', ['dev-1', patientId]);
    const sessionId = s.rows[0].id;

    const recordedAt = new Date().toISOString();
    const payload = {
      readings: [
        { patient_id: patientId, value: 100, recorded_at: recordedAt, client_id: 'abc' },
        { patient_id: patientId, value: 100, recorded_at: recordedAt, client_id: 'abc' },
        { patient_id: patientId, value: 120, recorded_at: new Date(Date.now()+3600000).toISOString(), client_id: 'def' }
      ]
    };

    const b = await db.query('INSERT INTO sync_batches (session_id, payload) VALUES ($1,$2) RETURNING id', [sessionId, JSON.stringify(payload)]);
    const batchId = b.rows[0].id;

    const res = await processBatch(batchId);
    expect(res).toHaveProperty('created');
    expect(res.created.length).toBe(2);

    // verify database
    const rr = await db.query('SELECT id FROM readings WHERE patient_id=$1', [patientId]);
    expect(rr.rowCount).toBe(2);
  });
});
