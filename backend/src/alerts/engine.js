const db = require('../db');

// Simple glucose alert rules (Milestone 4 initial):
// - value < 54 => severe_hypoglycemia (critical)
// - value >= 54 and < 70 => hypoglycemia (warning)
// - value > 300 => critical_hyperglycemia (critical)
// - value > 180 => hyperglycemia (warning)

function classifyGlucose(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  if (v < 54) return { severity: 'critical', type: 'severe_hypoglycemia', message: `Glucose critically low: ${v} mg/dL` };
  if (v >= 54 && v < 70) return { severity: 'warning', type: 'hypoglycemia', message: `Glucose low: ${v} mg/dL` };
  if (v > 300) return { severity: 'critical', type: 'critical_hyperglycemia', message: `Glucose critically high: ${v} mg/dL` };
  if (v > 180) return { severity: 'warning', type: 'hyperglycemia', message: `Glucose high: ${v} mg/dL` };
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

    // create a notification record and enqueue for delivery (default channel: webhook)
    if (alertId) {
      try {
        const notifQ = `INSERT INTO notifications (alert_id, channel, payload) VALUES ($1,$2,$3) RETURNING id`;
        const notifParams = [alertId, process.env.DEFAULT_NOTIFICATION_CHANNEL || 'webhook', JSON.stringify({ alertId, patientId, rule })];
        const nr = await db.query(notifQ, notifParams);
        const notifId = nr.rows && nr.rows[0] ? nr.rows[0].id : null;
        if (notifId && process.env.REDIS_URL) {
          const Redis = require('ioredis');
          const r = new Redis(process.env.REDIS_URL);
          await r.rpush('notifications:queue', JSON.stringify({ notification_id: notifId, channel: process.env.DEFAULT_NOTIFICATION_CHANNEL || 'webhook', payload: { alertId, rule } }));
          r.disconnect();
        }
      } catch (e) {
        console.error('failed to create/enqueue notification', e.message || e);
      }
    }

    return alertId;
}

module.exports = { evaluateAndCreateAlert, classifyGlucose };
