const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// List notifications
router.get('/', auth.optional, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
    res.json({ notifications: r.rows });
  } catch (err) {
    console.error('notifications list error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Retry a notification (re-enqueue)
router.post('/:id/retry', auth.required, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const r = await db.query('SELECT * FROM notifications WHERE id = $1', [id]);
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    const notif = r.rows[0];
    await db.query('UPDATE notifications SET status=$1, attempts=0, error=NULL WHERE id=$2', ['pending', id]);
    if (process.env.REDIS_URL) {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      await redis.rpush('notifications:queue', JSON.stringify({ notification_id: id, channel: notif.channel, payload: notif.payload }));
      redis.disconnect();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('retry notification error', err.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
