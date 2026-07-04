const request = require('supertest');
const app = require('../src/app');

describe('metrics endpoint', () => {
  test('GET /metrics returns prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    // default node metrics should be present
    expect(res.text).toMatch(/process_cpu_user_seconds_total|nodejs_eventloop_lag_seconds/);
  });
});
