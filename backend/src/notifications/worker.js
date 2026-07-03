const Redis = require('ioredis');
const db = require('../db');
const axios = require('axios');
const nodemailer = require('nodemailer');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(REDIS_URL);
const QUEUE = 'notifications:queue';
const RETRY_SET = 'notifications:retry';
const MAX_ATTEMPTS = parseInt(process.env.NOTIFICATION_MAX_ATTEMPTS || '5', 10);
const BASE_DELAY_SECONDS = parseInt(process.env.NOTIFICATION_BASE_DELAY || '5', 10);
const WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL || '';

function backoffSeconds(attempts) {
  return BASE_DELAY_SECONDS * Math.pow(2, Math.max(0, attempts - 1));
}

async function moveReadyRetriesToQueue() {
  const now = Date.now();
  const items = await redis.zrangebyscore(RETRY_SET, 0, now, 'LIMIT', 0, 50);
  if (!items || items.length === 0) return;
  const pipeline = redis.pipeline();
  for (const it of items) {
    pipeline.lpush(QUEUE, it);
    pipeline.zrem(RETRY_SET, it);
  }
  await pipeline.exec();
}

async function deliverWebhook(notification, p) {
  if (!WEBHOOK_URL) throw new Error('no webhook configured');
  // POST JSON payload
  const res = await axios.post(WEBHOOK_URL, { notification, payload: p }, { timeout: 5000 });
  return res.status >= 200 && res.status < 300;
}

async function deliverEmail(notification, p) {
  const SMTP_URL = process.env.SMTP_URL || process.env.SMTP_URI || '';
  const DEFAULT_TO = process.env.NOTIFICATION_DEFAULT_EMAIL || '';
  if (!SMTP_URL) throw new Error('no SMTP configured');

  let transportOpts;
  if (typeof SMTP_URL === 'string') {
    try {
      const u = new URL(SMTP_URL);
      if (u.protocol.startsWith('smtp')) {
        // prefer explicit host/port config for local servers
        transportOpts = { host: u.hostname, port: parseInt(u.port || '25', 10), secure: u.protocol === 'smtps' };
      } else {
        transportOpts = { url: SMTP_URL };
      }
    } catch (e) {
      transportOpts = { url: SMTP_URL };
    }
  } else {
    transportOpts = SMTP_URL;
  }

  // In test environments or when explicitly allowed, disable TLS verification to accept self-signed certs
  if (process.env.NODE_ENV === 'test' || process.env.SMTP_ALLOW_INSECURE === 'true') {
    transportOpts.tls = Object.assign({}, transportOpts.tls || {}, { rejectUnauthorized: false });
  }

  const transporter = nodemailer.createTransport(transportOpts);
  const to = (notification && notification.to) || DEFAULT_TO;
  if (!to) throw new Error('no recipient email configured');

  const subject = `Alert: ${p && p.rule ? p.rule.type : 'notification'}`;
  const text = p && p.rule ? `${p.rule.message}` : JSON.stringify(p || {});

  const info = await transporter.sendMail({ from: process.env.NOTIFICATION_FROM || 'noreply@example.com', to, subject, text });
  return !!info;
}

async function processOnce() {
  // move any due retries into the queue first
  await moveReadyRetriesToQueue();

  const item = await redis.blpop(QUEUE, 5);
  if (!item) return;
  const payload = item[1];
  let job;
  try { job = JSON.parse(payload); } catch (e) { console.error('invalid job', e); return; }
  const { notification_id, channel, payload: p } = job;

  try {
    if (channel === 'webhook') {
      await deliverWebhook(job, p);
    } else if (channel === 'email') {
      await deliverEmail(job, p);
    } else if (WEBHOOK_URL) {
      // fallback: if a default webhook is configured, deliver there
      await deliverWebhook(job, p);
    } else {
      // other channels not implemented yet
      console.log('Delivering notification (stub)', notification_id, channel);
    }

    await db.query('UPDATE notifications SET status=$1, attempts=attempts+1, sent_at=now() WHERE id=$2', ['sent', notification_id]);
  } catch (err) {
    console.error('notification delivery failed', err && err.message ? err.message : err);
    // increment attempts and store error
    const errText = (err && err.message) ? err.message.slice(0,1000) : String(err).slice(0,1000);
    const qRes = await db.query('UPDATE notifications SET attempts=attempts+1, error=$1 WHERE id=$2 RETURNING attempts', [errText, notification_id]);
    const attempts = qRes && qRes.rows && qRes.rows[0] ? qRes.rows[0].attempts : 1;
    if (attempts >= MAX_ATTEMPTS) {
      await db.query('UPDATE notifications SET status=$1 WHERE id=$2', ['dead', notification_id]);
      console.error('notification exceeded max attempts, marked dead', notification_id);
    } else {
      const delay = backoffSeconds(attempts) * 1000;
      const runAt = Date.now() + delay;
      await redis.zadd(RETRY_SET, runAt, payload);
      console.log('requeued notification', notification_id, 'for retry in', delay, 'ms');
    }
  }
}

async function main() {
  console.log('Notification worker starting, connecting to', REDIS_URL);
  console.log('Webhook URL configured:', !!WEBHOOK_URL);
  while (true) await processOnce();
}

if (require.main === module) {
  main().catch(err => { console.error('worker fatal', err); process.exit(1); });
}

// exported for tests
module.exports = { deliverWebhook, deliverEmail, backoffSeconds, moveReadyRetriesToQueue };
