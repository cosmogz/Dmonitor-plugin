require('dotenv').config();
const express = require('express');
const pino = require('pino')();
const pinoHttp = require('pino-http');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const promClient = require('prom-client');
const auth = require('./middleware/auth');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const db = require('./db');

const app = express();

// Prometheus metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.send(metrics);
  } catch (e) {
    res.status(500).send('error');
  }
});

// Security headers
app.use(helmet());

// CORS — origins configurable via CORS_ORIGIN env var (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());
app.use(requestId);
app.use(pinoHttp({ logger: pino, genReqId: (req) => req.id }));

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

// Sync (offline/batch ingestion)
const sync = require('./routes/sync');
app.use('/api/v1/sync', sync);

// Alerts endpoint
const alerts = require('./routes/alerts');
app.use('/api/v1/alerts', alerts);

// Notifications endpoint
const notifications = require('./routes/notifications');
app.use('/api/v1/notifications', notifications);

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Notification preferences (per-patient channel/recipient configuration)
const notifPrefs = require('./routes/notification_preferences');
app.use('/api/v1/notification-preferences', notifPrefs);

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
