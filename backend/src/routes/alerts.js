const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// List alerts, optional ?patient_id=
router.get('/', auth.optional, async (req, res) => {
  const patientId = req.query.patient_id ? Number(req.query.patient_id) : null;
  try {
    const q = patientId ? 'SELECT * FROM alerts WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 100' : 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100';
    const params = patientId ? [patientId] : [];
    const r = await db.query(q, params);
    res.json({ alerts: r.rows });
  } catch (err) {
    console.error('alerts list error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Resolve an alert
router.post('/:id/resolve', auth.required, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    await db.query('UPDATE alerts SET resolved = true, resolved_at = now() WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('resolve alert error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
