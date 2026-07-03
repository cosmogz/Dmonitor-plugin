const request = require('supertest');

jest.mock('../src/db');
const db = require('../src/db');
const app = require('../src/app');

beforeEach(() => jest.resetAllMocks());

test('GET /api/v1/notifications/metrics returns counts by status', async () => {
  db.query = jest.fn().mockResolvedValueOnce({
    rows: [
      { status: 'sent', count: '10' },
      { status: 'pending', count: '3' },
      { status: 'dead', count: '2' },
    ],
  });

  const res = await request(app).get('/api/v1/notifications/metrics');
  expect(res.statusCode).toBe(200);
  expect(res.body.metrics).toEqual({ sent: 10, pending: 3, dead: 2 });
});

test('GET /api/v1/notifications/metrics returns empty object when no notifications', async () => {
  db.query = jest.fn().mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/v1/notifications/metrics');
  expect(res.statusCode).toBe(200);
  expect(res.body.metrics).toEqual({});
});
