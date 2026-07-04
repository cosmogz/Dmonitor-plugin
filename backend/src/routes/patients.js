const express = require('express');
const db = require('../db');

const router = express.Router();

const { computeTrends } = require('../analytics/trends');

// Lookup patient by external mapping
router.get('/lookup', async (req, res) => {
  const { external_system, external_id } = req.query;
  if (!external_system || !external_id) return res.status(400).json({ error: 'external_system and external_id required' });
  try {
    const r = await db.query('SELECT p.* FROM patients p JOIN patient_links l ON l.patient_id = p.id WHERE l.external_system = $1 AND l.external_id = $2', [external_system, external_id]);
    if (r.rowCount === 0) return res.json({ found: false });
    return res.json({ found: true, patient: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// Pair an existing patient with external id
router.post('/pair', async (req, res) => {
  const { patient_id, external_system, external_id } = req.body || {};
  if (!patient_id || !external_system || !external_id) return res.status(400).json({ error: 'patient_id, external_system and external_id required' });
  try {
    await db.query('INSERT INTO patient_links (patient_id, external_system, external_id) VALUES ($1,$2,$3) ON CONFLICT (external_system, external_id) DO NOTHING', [patient_id, external_system, external_id]);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// Get patient by id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const r = await db.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// Recent readings for a patient (paginated)
router.get('/:id/readings', async (req, res) => {
  const patientId = Number(req.params.id);
  if (!patientId) return res.status(400).json({ error: 'invalid patient id' });
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const since = req.query.since ? new Date(req.query.since) : null;
  if (since && isNaN(since.getTime())) return res.status(400).json({ error: 'invalid since timestamp' });
  try {
    let q, params;
    if (since) {
      q = 'SELECT * FROM readings WHERE patient_id=$1 AND recorded_at>=$2 ORDER BY recorded_at DESC LIMIT $3 OFFSET $4';
      params = [patientId, since.toISOString(), limit, offset];
    } else {
      q = 'SELECT * FROM readings WHERE patient_id=$1 ORDER BY recorded_at DESC LIMIT $2 OFFSET $3';
      params = [patientId, limit, offset];
    }
    const r = await db.query(q, params);
    res.json({ readings: r.rows, limit, offset });
  } catch (err) {
    console.error('patient readings error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Alerts for a patient (paginated, optional ?unresolved=true)
router.get('/:id/alerts', async (req, res) => {
  const patientId = Number(req.params.id);
  if (!patientId) return res.status(400).json({ error: 'invalid patient id' });
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const unresolved = req.query.unresolved === 'true';
  try {
    const q = unresolved
      ? 'SELECT * FROM alerts WHERE patient_id=$1 AND resolved=FALSE ORDER BY created_at DESC LIMIT $2 OFFSET $3'
      : 'SELECT * FROM alerts WHERE patient_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    const r = await db.query(q, [patientId, limit, offset]);
    res.json({ alerts: r.rows, limit, offset });
  } catch (err) {
    console.error('patient alerts error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Trends for a patient (rolling stats)
router.get('/:id/trends', async (req, res) => {
  const patientId = Number(req.params.id);
  if (!patientId) return res.status(400).json({ error: 'invalid patient id' });
  const windowHours = Math.min(Math.max(Number(req.query.windowHours) || 24, 1), 168);
  try {
    const t = await computeTrends(patientId, { windowHours });
    res.json({ trends: t });
  } catch (err) {
    console.error('patient trends error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
