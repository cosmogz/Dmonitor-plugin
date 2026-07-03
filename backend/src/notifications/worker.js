const Redis = require('ioredis');
const db = require('../db');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(REDIS_URL);
const QUEUE = 'notifications:queue';

async function processOnce() {
  const item = await redis.blpop(QUEUE, 5);
  if (!item) return;
  const payload = item[1];
  let job;
  try { job = JSON.parse(payload); } catch (e) { console.error('invalid job', e); return; }
  const { notification_id, channel, payload: p } = job;

  try {
    // For now, delivery is a stub — replace with email/SMS/webhook integrations
    console.log('Delivering notification', notification_id, channel, p);
    // mark as sent
    await db.query('UPDATE notifications SET status=$1, attempts=attempts+1, sent_at=now() WHERE id=$2', ['sent', notification_id]);
  } catch (err) {
    console.error('notification delivery failed', err);
    await db.query('UPDATE notifications SET status=$1, attempts=attempts+1, error=$2 WHERE id=$3', ['failed', (err.message||String(err)).slice(0,1000), notification_id]);
  }
}

async function main() {
  console.log('Notification worker starting, connecting to', REDIS_URL);
  while (true) await processOnce();
}

main().catch(err => { console.error('worker fatal', err); process.exit(1); });
