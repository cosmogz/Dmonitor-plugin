const request = require('supertest');
process.env.JWT_SECRET = 'testsecret';
const app = require('../src/app');

jest.mock('../src/db');
const db = require('../src/db');

describe('patient trends', () => {
  beforeAll(() => {
    // produce a sequence of readings 6 hours apart with increasing values
    const now = new Date();
    const rows = [];
    for (let i=0;i<6;i++){
      rows.push({ value: 100 + i*10, recorded_at: new Date(now.getTime() - (5-i)*6*3600000).toISOString() });
    }
    db.query = jest.fn().mockResolvedValue({ rows });
  });

  test('GET /api/v1/patients/:id/trends returns rolling stats', async () => {
    const res = await request(app).get('/api/v1/patients/7/trends?windowHours=48');
    expect(res.status).toBe(200);
    expect(res.body.trends).toHaveProperty('avg');
    expect(res.body.trends.count).toBeGreaterThan(0);
    expect(res.body.trends).toHaveProperty('slope_per_hour');
  });
});
