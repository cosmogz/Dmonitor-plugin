const express = require('express');
const db = require('../db');

const router = express.Router();
const openmrs = require('../openmrs/adapter');
const alerts = require('../alerts/engine');

router.post('/', async (req, res) => {
  const { patient_external_id, value, unit, recorded_at } = req.body || {};
  // Basic validation
  if (!patient_external_id) return res.status(400).json({ error: 'patient_external_id required' });
  if (value == null || isNaN(Number(value))) return res.status(400).json({ error: 'value must be a number' });
  const numValue = Number(value);
  if (numValue <= 0) return res.status(400).json({ error: 'value must be > 0' });
  const allowedUnits = ['mg/dL', 'mmol/L'];
  const unitVal = unit || 'mg/dL';
  if (!allowedUnits.includes(unitVal)) return res.status(400).json({ error: `unit must be one of ${allowedUnits.join(',')}` });
  const recordedAt = recorded_at ? new Date(recorded_at) : new Date();
  if (isNaN(recordedAt.getTime())) return res.status(400).json({ error: 'recorded_at must be a valid timestamp' });

  try {
    // ensure patient exists
    const p = await db.query('SELECT id FROM patients WHERE external_id = $1', [patient_external_id]);
    let patientId;
    if (p.rowCount === 0) {
      const ins = await db.query('INSERT INTO patients (external_id) VALUES ($1) RETURNING id', [patient_external_id]);
      patientId = ins.rows[0].id;
    } else {
      patientId = p.rows[0].id;
    }

    const insert = await db.query(
      'INSERT INTO readings (patient_id, value, unit, recorded_at) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [patientId, numValue, unitVal, recordedAt]
    );

    const readingId = insert.rows[0].id;

    // Audit log
    const actorId = req.user && req.user.sub ? req.user.sub : null;
    await db.query('INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, payload) VALUES ($1,$2,$3,$4,$5)', [
      actorId,
      'create:reading',
      'reading',
      readingId,
      JSON.stringify({ patient_external_id, value: numValue, unit: unitVal, recorded_at: recordedAt.toISOString() })
    ]);

    // Enqueue for OpenMRS delivery: prefer Redis queue if available, else attempt async send
    // allow optional patient_info to be provided in the request body
    const patient_info = req.body.patient_info || null;
    const job = { patient_external_id, reading: { value: numValue, unit: unitVal, recorded_at: recordedAt.toISOString(), patient_info }, attempts: 0 };
    const REDIS_URL = process.env.REDIS_URL || '';
    if (REDIS_URL) {
      try {
        const Redis = require('ioredis');
        const r = new Redis(REDIS_URL);
        await r.rpush('openmrs:queue', JSON.stringify(job));
        r.disconnect();
      } catch (err) {
        console.error('Failed to enqueue OpenMRS job, falling back to async send:', err.message || err);
        (async () => {
          try { await openmrs.sendObservation(patient_external_id, job.reading); } catch (e) { console.error('OpenMRS send failed (non-fatal):', e.message || e); }
        })();
      }
    } else {
      (async () => {
        try { await openmrs.sendObservation(patient_external_id, job.reading); } catch (e) { console.error('OpenMRS send failed (non-fatal):', e.message || e); }
      })();
    }

    // Evaluate alerts asynchronously (non-blocking)
    (async () => {
      try {
        await alerts.evaluateAndCreateAlert(patientId, readingId, { value: numValue, unit: unitVal, recorded_at: recordedAt.toISOString(), type: 'glucose' });
      } catch (e) {
        console.error('Alert evaluation failed:', e.message || e);
      }
    })();

    res.status(201).json({ id: readingId, created_at: insert.rows[0].created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
