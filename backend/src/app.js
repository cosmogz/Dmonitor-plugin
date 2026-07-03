require('dotenv').config();
const express = require('express');
const pino = require('pino')();
const auth = require('./middleware/auth');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Protected example route
app.get('/api/v1/profile', auth.required, (req, res) => {
  res.json({ user: req.user });
});

// Readings endpoint
const readings = require('./routes/readings');
app.use('/api/v1/readings', readings);

// Alerts endpoint
const alerts = require('./routes/alerts');
app.use('/api/v1/alerts', alerts);

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

module.exports = app;
