require('dotenv').config();
const express = require('express');
const pino = require('pino')();
const rateLimit = require('express-rate-limit');
const auth = require('./middleware/auth');
const db = require('./db');

const app = express();
app.use(express.json());

// Global rate limit: 200 req/min per IP
app.use(rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Tighter limit on auth endpoints to mitigate brute-force
app.use('/auth', rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));

app.get('/health', async (req, res) => {
  let db_ok = false;
  try { await db.query('SELECT 1'); db_ok = true; } catch (e) { /* intentionally silent */ }
  const status = db_ok ? 'ok' : 'degraded';
  res.status(db_ok ? 200 : 503).json({ status, db: db_ok ? 'ok' : 'unreachable' });
});

// Protected example route
app.get('/api/v1/profile', auth.required, (req, res) => {
  res.json({ user: req.user });
});

// Readings endpoint
const readings = require('./routes/readings');
app.use('/api/v1/readings', readings);

// Patients endpoint
const patients = require('./routes/patients');
app.use('/api/v1/patients', patients);

// Alerts endpoint
const alerts = require('./routes/alerts');
app.use('/api/v1/alerts', alerts);

// Notifications endpoint
const notifications = require('./routes/notifications');
app.use('/api/v1/notifications', notifications);

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

module.exports = app;
