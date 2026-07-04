const Redis = require('ioredis');
const { processBatch } = require('./worker');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(redisUrl);

let stopped = false;

async function loop() {
  while (!stopped) {
    try {
      // BRPOP with 5 second timeout
      const res = await redis.brpop('sync:queue', 5);
      if (!res) continue; // timeout
      const payload = JSON.parse(res[1]);
      const batchId = payload.batch_id;
      try {
        console.log('processing sync batch', batchId);
        await processBatch(batchId);
        console.log('processed sync batch', batchId);
      } catch (e) {
        console.error('failed to process batch', batchId, e.message || e);
      }
    } catch (e) {
      console.error('redis error in sync processor', e.message || e);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

process.on('SIGINT', () => { stopped = true; redis.disconnect(); process.exit(0); });
process.on('SIGTERM', () => { stopped = true; redis.disconnect(); process.exit(0); });

if (require.main === module) {
  console.log('starting sync processor');
  loop();
}

module.exports = { loop };
