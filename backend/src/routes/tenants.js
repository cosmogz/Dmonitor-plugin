const express = require('express');
const db = require('../db');

const router = express.Router();

// Create tenant
router.post('/', async (req, res) => {
  const { name, settings } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const q = 'INSERT INTO tenants (name, settings) VALUES ($1,$2) RETURNING id, name, settings, created_at';
    const r = await db.query(q, [name, JSON.stringify(settings || {})]);
    res.status(201).json({ tenant: r.rows[0] });
  } catch (err) {
    console.error('tenant create error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

// List tenants
router.get('/', async (req, res) => {
  try {
    const r = await db.query('SELECT id, name, settings, created_at FROM tenants ORDER BY id DESC');
    res.json({ tenants: r.rows });
  } catch (err) {
    console.error('tenant list error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

// Get tenant
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const r = await db.query('SELECT id, name, settings, created_at FROM tenants WHERE id=$1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ tenant: r.rows[0] });
  } catch (err) {
    console.error('tenant get error', err.message || err);
    res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
