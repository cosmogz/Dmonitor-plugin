const db = require('../db');
const promClient = require('prom-client');

const alertsCreated = new promClient.Counter({
  name: 'dmonitor_alerts_created_total',
  help: 'Total number of alerts created',
  labelNames: ['severity', 'type']
});

// Simple glucose alert rules (Milestone 4 initial):
// - value < 54 => severe_hypoglycemia (critical)
// - value >= 54 and < 70 => hypoglycemia (warning)
// - value > 300 => critical_hyperglycemia (critical)
// - value > 180 => hyperglycemia (warning)

function classifyGlucose(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  // allow overrides via env vars
  const LOW_CRIT = Number(process.env.ALERT_LOW_CRIT || 54);
  const LOW_WARN = Number(process.env.ALERT_LOW_WARN || 70);
  const HIGH_WARN = Number(process.env.ALERT_HIGH_WARN || 180);
  const HIGH_CRIT = Number(process.env.ALERT_HIGH_CRIT || 300);

  if (v < LOW_CRIT) return { severity: 'critical', type: 'severe_hypoglycemia', message: `Glucose critically low: ${v} mg/dL` };
  if (v >= LOW_CRIT && v < LOW_WARN) return { severity: 'warning', type: 'hypoglycemia', message: `Glucose low: ${v} mg/dL` };
  if (v > HIGH_CRIT) return { severity: 'critical', type: 'critical_hyperglycemia', message: `Glucose critically high: ${v} mg/dL` };
  if (v > HIGH_WARN) return { severity: 'warning', type: 'hyperglycemia', message: `Glucose high: ${v} mg/dL` };
  return null;
}

async function evaluateAndCreateAlert(patientId, readingId, reading) {
  // reading: { value, unit, recorded_at, type }
  const value = reading && (reading.value ?? reading);
  const rule = classifyGlucose(value);
  if (!rule) return null;

  const metadata = { reading, created_by: 'alerts-engine' };
  const q = `INSERT INTO alerts (patient_id, reading_id, severity, type, message, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`;
  const params = [patientId, readingId, rule.severity, rule.type, rule.message, JSON.stringify(metadata)];
  const res = await db.query(q, params);
    const alertId = res.rows && res.rows[0] ? res.rows[0].id : null;

    // fan-out notifications per patient preferences, falling back to default channel
    if (alertId) {
      try {
        alertsCreated.inc({ severity: rule.severity || 'unknown', type: rule.type || 'unknown' }, 1);
      } catch (e) { /* metrics should not break flow */ }
      try {
        await _enqueueNotifications(alertId, patientId, rule);
      } catch (e) {
        console.error('failed to create/enqueue notification', e.message || e);
      }
    }

    return alertId;
}

async function createAlert(patientId, type, severity, message, metadata = {}) {
  const meta = Object.assign({}, metadata, { created_by: 'alerts-engine' });
  const q = `INSERT INTO alerts (patient_id, severity, type, message, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING id`;
  const params = [patientId, severity, type, message, JSON.stringify(meta)];
  const res = await db.query(q, params);
  const alertId = res.rows && res.rows[0] ? res.rows[0].id : null;
  if (alertId) {
    try { alertsCreated.inc({ severity: severity || 'unknown', type: type || 'unknown' }, 1); } catch (e) {}
    try { await _enqueueNotifications(alertId, patientId, { severity, type, message }); } catch (e) { console.error('failed to create/enqueue notification', e.message || e); }
  }
  return alertId;
}

module.exports = { evaluateAndCreateAlert, classifyGlucose, createAlert };

// ─── helpers ────────────────────────────────────────────────────────────────

const SEVERITY_ORDINAL = { warning: 1, critical: 2 };
function _severityOrdinal(s) { return SEVERITY_ORDINAL[s] || 0; }

/**
 * Resolve per-patient notification preferences and enqueue one notification
 * per matching preference.  Falls back to DEFAULT_NOTIFICATION_CHANNEL when
 * the patient has no preferences row.
 */
async function _enqueueNotifications(alertId, patientId, rule) {
  let prefs = [];
  try {
    const pRes = await db.query(
      `SELECT channel, destination, severity_min FROM notification_preferences
       WHERE patient_id=$1 AND enabled=TRUE`,
      [patientId]
    );
    prefs = pRes.rows || [];
  } catch (e) {
    // table may not exist yet (migration not applied) or mock returns undefined — fall back silently
    if (e && e.message && !/does not exist/.test(e.message) && !/Cannot read/.test(e.message)) throw e;
  }

  // filter by severity_min preference
  const filtered = prefs.filter(p => {
    const minOrd = _severityOrdinal(p.severity_min || 'warning');
    return _severityOrdinal(rule.severity) >= minOrd;
  });

  // If the patient has no preferences, fall back to the global default channel
  const targets = filtered.length > 0
    ? filtered
    : [{ channel: process.env.DEFAULT_NOTIFICATION_CHANNEL || 'webhook', destination: null }];

  const { buildMessage } = require('../notifications/templates');

  let redis = null;
  if (process.env.REDIS_URL) {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL);
  }

  for (const pref of targets) {
    const msg = buildMessage(pref.channel, rule, patientId, alertId);
    const payload = { alertId, patientId, rule, to: pref.destination, subject: msg.subject, body: msg.body };
    const notifQ = `INSERT INTO notifications (alert_id, channel, payload) VALUES ($1,$2,$3) RETURNING id`;
    const nr = await db.query(notifQ, [alertId, pref.channel, JSON.stringify(payload)]);
    const notifId = nr.rows && nr.rows[0] ? nr.rows[0].id : null;
    if (notifId && redis) {
      await redis.rpush('notifications:queue', JSON.stringify({ notification_id: notifId, channel: pref.channel, payload }));
    }
  }

  if (redis) redis.disconnect();
}
