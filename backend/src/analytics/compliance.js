const db = require('../db');
const { createAlert } = require('../alerts/engine');
const { computeTrends } = require('./trends');

/**
 * Compute a simple compliance score for a patient over `windowDays`.
 * score = min(100, (actual_readings / expected_readings) * 100)
 * expected_readings defaults to readings_per_day * windowDays
 */
async function computeCompliance(patientId, opts = {}) {
  const windowDays = opts.windowDays || 7;
  const readingsPerDay = opts.readingsPerDay || 6; // e.g., expected 6 readings/day
  const expected = readingsPerDay * windowDays;

  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
  const q = 'SELECT COUNT(*) as count FROM readings WHERE patient_id=$1 AND recorded_at >= $2';
  const r = await db.query(q, [patientId, since]);
  const actual = r && r.rows && r.rows[0] ? Number(r.rows[0].count) : 0;

  const score = expected === 0 ? 100 : Math.min(100, Math.round((actual / expected) * 100));
  return { windowDays, expected, actual, score };
}

/**
 * Evaluate compliance and emit alerts for missed-reading gaps or very low compliance.
 * Returns the compliance object and any created alert id(s).
 */
async function evaluateAndAlertCompliance(patientId, opts = {}) {
  const gapThresholdMinutes = opts.gapThresholdMinutes || 24 * 60; // 24h default
  const lowComplianceThreshold = opts.lowComplianceThreshold || 30; // percent

  const trends = await computeTrends(patientId, { windowHours: (opts.windowDays || 7) * 24 });
  const compliance = await computeCompliance(patientId, opts);

  const createdAlerts = [];

  // if there is any gap larger than gapThresholdMinutes, create an alert per gap
  for (const g of (trends.gaps || [])) {
    if (g.gapMinutes >= gapThresholdMinutes) {
      const msg = `Missed readings: gap of ${Math.round(g.gapMinutes)} minutes between ${g.from} and ${g.to}`;
      const alertId = await createAlert(patientId, 'missed_readings', 'warning', msg, { gap: g });
      if (alertId) createdAlerts.push(alertId);
    }
  }

  // if compliance is very low, create a compliance alert
  if (compliance.score <= lowComplianceThreshold) {
    const msg = `Low compliance: score ${compliance.score}% over last ${compliance.windowDays} days`;
    const alertId = await createAlert(patientId, 'low_compliance', 'warning', msg, { compliance });
    if (alertId) createdAlerts.push(alertId);
  }

  return { compliance, trends, createdAlerts };
}

module.exports = { computeCompliance, evaluateAndAlertCompliance };
