const request = require('supertest');

jest.mock('../src/db');
const db = require('../src/db');
const app = require('../src/app');

beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = 'test-secret-hardened';
});

describe('POST /auth/register', () => {
  test('creates user and returns access+refresh tokens', async () => {
    db.query = jest.fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })          // check existing
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.com', display_name: null }] }) // insert user
      .mockResolvedValueOnce({ rows: [] });                      // insert refresh token

    const res = await request(app).post('/auth/register').send({ email: 'a@b.com', password: 'secret123' });
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refresh_token).toBeTruthy();
  });

  test('rejects short passwords', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com', password: 'short' });
    expect(res.statusCode).toBe(400);
  });

  test('returns 409 when email already exists', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
    const res = await request(app).post('/auth/register').send({ email: 'dup@b.com', password: 'validpass' });
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /auth/login', () => {
  test('auto-creates user when no password set (dev/test path)', async () => {
    db.query = jest.fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })           // user not found
      .mockResolvedValueOnce({ rows: [{ id: 2, email: 'new@b.com' }] }) // insert
      .mockResolvedValueOnce({ rows: [] })                        // last_login update
      .mockResolvedValueOnce({ rows: [] });                       // refresh token

    const res = await request(app).post('/auth/login').send({ email: 'new@b.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('rejects wrong password for user with hash', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('correct', 12);
    db.query = jest.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 3, email: 'x@b.com', password_hash: hash }] });
    const res = await request(app).post('/auth/login').send({ email: 'x@b.com', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  test('returns 400 when refresh_token missing', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.statusCode).toBe(400);
  });

  test('returns 401 for unknown token', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).post('/auth/refresh').send({ refresh_token: 'unknown' });
    expect(res.statusCode).toBe(401);
  });

  test('rotates refresh token and returns new pair', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    db.query = jest.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10, user_id: 5, email: 'u@b.com', revoked: false, expires_at: future }] })
      .mockResolvedValueOnce({ rows: [] })    // revoke old
      .mockResolvedValueOnce({ rows: [] });   // insert new

    const res = await request(app).post('/auth/refresh').send({ refresh_token: 'valid-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refresh_token).toBeTruthy();
  });
});

describe('POST /auth/logout', () => {
  test('revokes refresh token and returns ok', async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/auth/logout').send({ refresh_token: 'tok' });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
