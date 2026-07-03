const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { patient_external_id, value, unit, recorded_at } = req.body || {};
  if (!patient_external_id || value == null) return res.status(400).json({ error: 'patient_external_id and value required' });
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
      [patientId, value, unit || 'mg/dL', recorded_at || new Date()]
    );

    res.status(201).json({ id: insert.rows[0].id, created_at: insert.rows[0].created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
