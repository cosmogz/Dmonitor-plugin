const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const VALID_CHANNELS = ['webhook', 'email', 'sms'];
const VALID_SEVERITY = ['warning', 'critical'];

// List preferences for a patient
router.get('/:patient_id', auth.optional, async (req, res) => {
  const patientId = Number(req.params.patient_id);
  if (!patientId) return res.status(400).json({ error: 'invalid patient_id' });
  try {
    const r = await db.query(
      'SELECT * FROM notification_preferences WHERE patient_id=$1 ORDER BY id',
      [patientId]
    );
    res.json({ preferences: r.rows });
  } catch (err) {
    console.error('list prefs error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Create a preference
router.post('/', auth.required, async (req, res) => {
  const { patient_id, channel, destination, severity_min } = req.body || {};
  if (!patient_id || !channel || !destination) {
    return res.status(400).json({ error: 'patient_id, channel and destination required' });
  }
  if (!VALID_CHANNELS.includes(channel)) {
    return res.status(400).json({ error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` });
  }
  if (severity_min && !VALID_SEVERITY.includes(severity_min)) {
    return res.status(400).json({ error: `severity_min must be one of: ${VALID_SEVERITY.join(', ')}` });
  }
  try {
    const r = await db.query(
      `INSERT INTO notification_preferences (patient_id, channel, destination, severity_min)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (patient_id, channel, destination)
         DO UPDATE SET severity_min=EXCLUDED.severity_min, enabled=TRUE, updated_at=now()
       RETURNING *`,
      [patient_id, channel, destination, severity_min || 'warning']
    );
    res.status(201).json({ preference: r.rows[0] });
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'patient not found' });
    console.error('create pref error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Update a preference
router.patch('/:id', auth.required, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const { destination, severity_min, enabled } = req.body || {};
  const updates = [];
  const vals = [];
  if (destination !== undefined) { updates.push(`destination=$${vals.push(destination)}`); }
  if (severity_min !== undefined) {
    if (!VALID_SEVERITY.includes(severity_min)) return res.status(400).json({ error: 'invalid severity_min' });
    updates.push(`severity_min=$${vals.push(severity_min)}`);
  }
  if (enabled !== undefined) { updates.push(`enabled=$${vals.push(!!enabled)}`); }
  if (updates.length === 0) return res.status(400).json({ error: 'nothing to update' });
  updates.push(`updated_at=now()`);
  vals.push(id);
  try {
    const r = await db.query(
      `UPDATE notification_preferences SET ${updates.join(', ')} WHERE id=$${vals.length} RETURNING *`,
      vals
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ preference: r.rows[0] });
  } catch (err) {
    console.error('update pref error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Delete a preference
router.delete('/:id', auth.required, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const r = await db.query('DELETE FROM notification_preferences WHERE id=$1 RETURNING id', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('delete pref error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
