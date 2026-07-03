const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db');
const db = require('../src/db');

const app = require('../src/app');

describe('readings endpoints', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  test('POST /api/v1/readings creates patient if missing and inserts reading', async () => {
    // Simulate no patient found, then patient inserted, then reading inserted, then audit log
    db.query = jest.fn()
      // SELECT patient
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      // INSERT patient RETURNING id
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      // INSERT reading RETURNING id, created_at
      .mockResolvedValueOnce({ rows: [{ id: 123, created_at: new Date().toISOString() }] })
      // INSERT audit_logs
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/v1/readings')
      .send({ patient_external_id: 'pt-1', value: 120 });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id', 123);
    // Ensure DB queries were called
    expect(db.query).toHaveBeenCalled();
  });

  test('GET /api/v1/profile returns user when token provided', async () => {
    const token = jwt.sign({ sub: 42, email: 'u@example.com' }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toMatchObject({ sub: 42, email: 'u@example.com' });
  });
});
