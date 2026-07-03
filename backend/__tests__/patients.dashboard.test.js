const request = require('supertest');

jest.mock('../src/db');
const db = require('../src/db');
const app = require('../src/app');

beforeEach(() => jest.resetAllMocks());

describe('GET /api/v1/patients/:id/readings', () => {
  test('returns paginated readings', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rows: [{ id: 1, value: 95, unit: 'mg/dL' }] });
    const res = await request(app).get('/api/v1/patients/7/readings?limit=10&offset=0');
    expect(res.statusCode).toBe(200);
    expect(res.body.readings).toHaveLength(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.offset).toBe(0);
  });

  test('accepts ?since= filter', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/v1/patients/7/readings?since=2026-01-01T00:00:00Z');
    expect(res.statusCode).toBe(200);
  });

  test('returns 400 for invalid since', async () => {
    const res = await request(app).get('/api/v1/patients/7/readings?since=bad');
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/v1/patients/:id/alerts', () => {
  test('returns paginated alerts', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rows: [{ id: 1, severity: 'critical' }] });
    const res = await request(app).get('/api/v1/patients/7/alerts');
    expect(res.statusCode).toBe(200);
    expect(res.body.alerts).toHaveLength(1);
  });

  test('filters unresolved when ?unresolved=true', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/v1/patients/7/alerts?unresolved=true');
    expect(res.statusCode).toBe(200);
    // confirm query contained resolved=FALSE (captured via mock call args)
    const sql = db.query.mock.calls[0][0];
    expect(sql).toMatch(/resolved=FALSE/);
  });
});
