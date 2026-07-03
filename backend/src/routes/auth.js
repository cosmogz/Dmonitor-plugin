const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();
const getSecret = () => process.env.JWT_SECRET || 'change-me';
const ACCESS_EXPIRY = '15m';
const REFRESH_DAYS = 30;

function issueAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, getSecret(), { expiresIn: ACCESS_EXPIRY });
}

async function issueRefreshToken(userId) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
    [userId, token, expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

// Register: POST /auth/register  { email, password, display_name? }
router.post('/register', async (req, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  try {
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rowCount > 0) return res.status(409).json({ error: 'email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const ins = await db.query(
      'INSERT INTO users (email, display_name, password_hash) VALUES ($1,$2,$3) RETURNING id, email, display_name',
      [email, display_name || null, hash]
    );
    const user = ins.rows[0];
    const accessToken = issueAccessToken(user);
    const { token: refreshToken, expiresAt } = await issueRefreshToken(user.id);
    res.status(201).json({ token: accessToken, refresh_token: refreshToken, expires_at: expiresAt });
  } catch (err) {
    console.error('register error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

// Login: POST /auth/login  { email, password }  (password optional for dev/test convenience)
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const r = await db.query('SELECT id, email, display_name, password_hash FROM users WHERE email = $1', [email]);
    let user;
    if (r.rowCount === 0) {
      // dev/test convenience: create user on first login when no password set
      const ins = await db.query(
        'INSERT INTO users (email) VALUES ($1) RETURNING id, email, display_name',
        [email]
      );
      user = ins.rows[0];
    } else {
      user = r.rows[0];
      // if user has a password_hash, verify
      if (user.password_hash) {
        if (!password) return res.status(401).json({ error: 'password required' });
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'invalid credentials' });
      }
    }
    await db.query('UPDATE users SET last_login=now() WHERE id=$1', [user.id]);
    const accessToken = issueAccessToken(user);
    const { token: refreshToken, expiresAt } = await issueRefreshToken(user.id);
    res.json({ token: accessToken, refresh_token: refreshToken, expires_at: expiresAt });
  } catch (err) {
    console.error('login error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

// Refresh: POST /auth/refresh  { refresh_token }
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
  try {
    const r = await db.query(
      'SELECT rt.*, u.email FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id WHERE rt.token=$1',
      [refresh_token]
    );
    if (r.rowCount === 0) return res.status(401).json({ error: 'invalid refresh token' });
    const rt = r.rows[0];
    if (rt.revoked) return res.status(401).json({ error: 'refresh token revoked' });
    if (new Date(rt.expires_at) < new Date()) return res.status(401).json({ error: 'refresh token expired' });
    // rotate: revoke old, issue new
    await db.query('UPDATE refresh_tokens SET revoked=TRUE WHERE id=$1', [rt.id]);
    const user = { id: rt.user_id, email: rt.email };
    const accessToken = issueAccessToken(user);
    const { token: newRefreshToken, expiresAt } = await issueRefreshToken(user.id);
    res.json({ token: accessToken, refresh_token: newRefreshToken, expires_at: expiresAt });
  } catch (err) {
    console.error('refresh error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

// Logout: POST /auth/logout  { refresh_token }
router.post('/logout', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (refresh_token) {
    await db.query('UPDATE refresh_tokens SET revoked=TRUE WHERE token=$1', [refresh_token]).catch(() => {});
  }
  res.json({ ok: true });
});

module.exports = router;

