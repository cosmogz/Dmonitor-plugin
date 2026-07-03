const Redis = require('ioredis');
const adapter = require('./adapter');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(REDIS_URL);

const QUEUE_KEY = 'openmrs:queue';
const DELAYED_KEY = 'openmrs:delayed';
const MAX_ATTEMPTS = 5;

async function requeueDue() {
  const now = Date.now();
  const items = await redis.zrangebyscore(DELAYED_KEY, '-inf', now);
  if (items.length === 0) return;
  for (const item of items) {
    const removed = await redis.zrem(DELAYED_KEY, item);
    if (removed) await redis.rpush(QUEUE_KEY, item);
  }
}

async function processOnce() {
  try {
    await requeueDue();
    const res = await redis.blpop(QUEUE_KEY, 5);
    if (!res) return;
    const payload = res[1];
    const job = JSON.parse(payload);
    try {
      await adapter.sendObservation(job.patient_external_id, job.reading);
      console.log('OpenMRS job delivered for', job.patient_external_id);
    } catch (err) {
      console.error('OpenMRS delivery failed:', err.message || err);
      job.attempts = (job.attempts || 0) + 1;
      if (job.attempts >= MAX_ATTEMPTS) {
        console.error('OpenMRS job permanently failed after attempts:', job);
      } else {
        const delay = Math.pow(2, job.attempts) * 1000; // exponential backoff
        const score = Date.now() + delay;
        await redis.zadd(DELAYED_KEY, score, JSON.stringify(job));
        console.log('Requeued job with delay', delay);
      }
    }
  } catch (err) {
    console.error('Worker error', err.message || err);
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function main() {
  console.log('OpenMRS worker starting, connecting to', REDIS_URL);
  while (true) await processOnce();
}

main().catch(err => {
  console.error('Worker fatal', err);
  process.exit(1);
});
