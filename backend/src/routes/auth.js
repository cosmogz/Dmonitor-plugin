const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const secret = process.env.JWT_SECRET || 'change-me';

// Simple login endpoint for testing: provide { email, display_name }
// Creates user if missing and returns a signed JWT
router.post('/login', async (req, res) => {
  const { email, display_name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const r = await db.query('SELECT id, email, display_name FROM users WHERE email = $1', [email]);
    let user;
    if (r.rowCount === 0) {
      const ins = await db.query('INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id, email, display_name', [email, display_name || null]);
      user = ins.rows[0];
    } else {
      user = r.rows[0];
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
