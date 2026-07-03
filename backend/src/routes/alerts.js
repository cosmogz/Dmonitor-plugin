const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// List alerts, optional ?patient_id= with pagination
router.get('/', auth.optional, async (req, res) => {
  const patientId = req.query.patient_id ? Number(req.query.patient_id) : null;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  try {
    let q, params;
    if (patientId) {
      q = 'SELECT * FROM alerts WHERE patient_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
      params = [patientId, limit, offset];
    } else {
      q = 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      params = [limit, offset];
    }
    const r = await db.query(q, params);
    res.json({ alerts: r.rows, limit, offset });
  } catch (err) {
    console.error('alerts list error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Summary: alert counts by severity/type, optionally ?since=ISO&patient_id=N
router.get('/summary', auth.optional, async (req, res) => {
  const patientId = req.query.patient_id ? Number(req.query.patient_id) : null;
  const since = req.query.since ? new Date(req.query.since) : null;
  if (since && isNaN(since.getTime())) return res.status(400).json({ error: 'invalid since timestamp' });
  try {
    const conditions = [];
    const params = [];
    if (patientId) { params.push(patientId); conditions.push(`patient_id = $${params.length}`); }
    if (since) { params.push(since.toISOString()); conditions.push(`created_at >= $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const bySeverity = await db.query(
      `SELECT severity, COUNT(*) AS count FROM alerts ${where} GROUP BY severity`, params
    );
    const byType = await db.query(
      `SELECT type, COUNT(*) AS count FROM alerts ${where} GROUP BY type`, params
    );
    const unresolved = await db.query(
      `SELECT COUNT(*) AS count FROM alerts ${where}${conditions.length ? ' AND' : ' WHERE'} resolved=FALSE`, params
    );
    res.json({
      by_severity: Object.fromEntries(bySeverity.rows.map(r => [r.severity, parseInt(r.count, 10)])),
      by_type: Object.fromEntries(byType.rows.map(r => [r.type, parseInt(r.count, 10)])),
      unresolved: parseInt(unresolved.rows[0].count, 10),
    });
  } catch (err) {
    console.error('alerts summary error', err.message || err);
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
