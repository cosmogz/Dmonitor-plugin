const request = require('supertest');

jest.mock('../src/db');
const db = require('../src/db');
const app = require('../src/app');

beforeEach(() => jest.resetAllMocks());

describe('GET /api/v1/alerts/summary', () => {
  test('returns counts by severity, type and unresolved total', async () => {
    db.query = jest.fn()
      // bySeverity
      .mockResolvedValueOnce({ rows: [{ severity: 'critical', count: '3' }, { severity: 'warning', count: '5' }] })
      // byType
      .mockResolvedValueOnce({ rows: [{ type: 'hypoglycemia', count: '2' }, { type: 'hyperglycemia', count: '6' }] })
      // unresolved
      .mockResolvedValueOnce({ rows: [{ count: '4' }] });

    const res = await request(app).get('/api/v1/alerts/summary');
    expect(res.statusCode).toBe(200);
    expect(res.body.by_severity).toEqual({ critical: 3, warning: 5 });
    expect(res.body.by_type).toEqual({ hypoglycemia: 2, hyperglycemia: 6 });
    expect(res.body.unresolved).toBe(4);
  });

  test('accepts ?since= and ?patient_id= filters', async () => {
    db.query = jest.fn()
      .mockResolvedValue({ rows: [{ count: '0' }] });

    const res = await request(app)
      .get('/api/v1/alerts/summary?patient_id=1&since=2026-01-01T00:00:00Z');
    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  test('returns 400 for invalid since', async () => {
    const res = await request(app).get('/api/v1/alerts/summary?since=not-a-date');
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/v1/alerts pagination', () => {
  test('passes limit and offset to query', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/v1/alerts?limit=10&offset=20');
    expect(res.statusCode).toBe(200);
    expect(res.body.limit).toBe(10);
    expect(res.body.offset).toBe(20);
  });
});
