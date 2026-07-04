const express = require('express');
const db = require('../db');

const router = express.Router();

// Start a sync session for a device (client can call once and reuse session_id)
router.post('/start', async (req, res) => {
  const { device_id, patient_id } = req.body || {};
  if (!device_id) return res.status(400).json({ error: 'device_id required' });
  try {
    const q = 'INSERT INTO sync_sessions (device_id, patient_id) VALUES ($1,$2) RETURNING id, device_id, patient_id, last_synced_at, created_at';
    const r = await db.query(q, [device_id, patient_id || null]);
    res.status(201).json({ session: r.rows[0] });
  } catch (err) {
    console.error('sync start error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

// Upload a batch for a session (readings, events, etc.)
router.post('/:sessionId/batch', async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) return res.status(400).json({ error: 'invalid session id' });
  const payload = req.body || {};
  try {
    const q = 'INSERT INTO sync_batches (session_id, payload) VALUES ($1,$2) RETURNING id, status, created_at';
    const r = await db.query(q, [sessionId, JSON.stringify(payload)]);
    // optional: push to Redis queue for processing if configured
    if (process.env.REDIS_URL) {
      try {
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL);
        await redis.rpush('sync:queue', JSON.stringify({ batch_id: r.rows[0].id, session_id: sessionId }));
        redis.disconnect();
      } catch (e) {
        console.error('failed to enqueue sync batch', e.message || e);
      }
    }
    res.status(201).json({ batch: r.rows[0] });
  } catch (err) {
    console.error('sync batch error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

// List batches for a session (for client polling or troubleshooting)
router.get('/:sessionId/batches', async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) return res.status(400).json({ error: 'invalid session id' });
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  try {
    const q = 'SELECT id, status, payload, created_at FROM sync_batches WHERE session_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    const r = await db.query(q, [sessionId, limit, offset]);
    res.json({ batches: r.rows, limit, offset });
  } catch (err) {
    console.error('sync batches error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
