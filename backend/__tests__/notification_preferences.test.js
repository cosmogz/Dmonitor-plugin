const request = require('supertest');

// Must be set before requiring app so middleware picks it up
process.env.JWT_SECRET = 'testsecret';

const app = require('../src/app');

// We mock the db module so tests work without a real Postgres connection.
jest.mock('../src/db', () => {
  const rows = [];
  const mockQuery = jest.fn(async (sql, params) => {
    // INSERT => return a fake row
    if (/INSERT/.test(sql)) {
      const row = { id: 1, patient_id: params[0], channel: params[1], destination: params[2], severity_min: params[3] || 'warning', enabled: true };
      rows.push(row);
      return { rows: [row], rowCount: 1 };
    }
    // SELECT => return rows matching patient_id
    if (/SELECT/.test(sql)) {
      const pid = params && params[0];
      return { rows: rows.filter(r => !pid || r.patient_id === pid), rowCount: rows.length };
    }
    // UPDATE
    if (/UPDATE/.test(sql)) {
      const id = params[params.length - 1];
      const row = rows.find(r => r.id === id);
      if (!row) return { rows: [], rowCount: 0 };
      // apply changes (simplified)
      Object.assign(row, { updated_at: new Date().toISOString() });
      return { rows: [row], rowCount: 1 };
    }
    // DELETE
    if (/DELETE/.test(sql)) {
      const id = params[0];
      const idx = rows.findIndex(r => r.id === id);
      if (idx === -1) return { rows: [], rowCount: 0 };
      rows.splice(idx, 1);
      return { rows: [{ id }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  return { query: mockQuery };
});

const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: 1, email: 'admin@test.com' }, process.env.JWT_SECRET || 'testsecret');
const authHeader = { Authorization: `Bearer ${token}` };

describe('notification preferences API', () => {
  test('POST / creates a preference', async () => {
    const res = await request(app)
      .post('/api/v1/notification-preferences')
      .set(authHeader)
      .send({ patient_id: 5, channel: 'email', destination: 'nurse@hospital.org', severity_min: 'critical' });
    expect(res.status).toBe(201);
    expect(res.body.preference).toMatchObject({ patient_id: 5, channel: 'email', destination: 'nurse@hospital.org' });
  });

  test('POST / rejects invalid channel', async () => {
    const res = await request(app)
      .post('/api/v1/notification-preferences')
      .set(authHeader)
      .send({ patient_id: 5, channel: 'carrier-pigeon', destination: 'somewhere' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/channel/);
  });

  test('POST / requires auth', async () => {
    const res = await request(app)
      .post('/api/v1/notification-preferences')
      .send({ patient_id: 5, channel: 'sms', destination: '+15551234567' });
    expect(res.status).toBe(401);
  });

  test('GET /:patient_id returns list', async () => {
    const res = await request(app)
      .get('/api/v1/notification-preferences/5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.preferences)).toBe(true);
  });

  test('POST / creates sms preference', async () => {
    const res = await request(app)
      .post('/api/v1/notification-preferences')
      .set(authHeader)
      .send({ patient_id: 5, channel: 'sms', destination: '+15551234567' });
    expect(res.status).toBe(201);
    expect(res.body.preference.channel).toBe('sms');
  });

  test('POST / rejects missing destination', async () => {
    const res = await request(app)
      .post('/api/v1/notification-preferences')
      .set(authHeader)
      .send({ patient_id: 5, channel: 'email' });
    expect(res.status).toBe(400);
  });
});
