const db = require('../db');

/**
 * Compute rolling trend statistics for a patient over the given window (hours).
 * Returns moving average, min, max, and simple slope estimate (delta per hour).
 * Also detects missed-reading gaps larger than expectedIntervalMinutes.
 */
async function computeTrends(patientId, opts = {}) {
  const windowHours = opts.windowHours || 24;
  const expectedIntervalMinutes = opts.expectedIntervalMinutes || 240; // e.g., expect at least one reading every 4h

  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const q = `SELECT value, recorded_at FROM readings WHERE patient_id=$1 AND recorded_at >= $2 ORDER BY recorded_at ASC`;
  const r = await db.query(q, [patientId, since]);
  const rows = r.rows || [];

  if (rows.length === 0) return { count: 0, avg: null, min: null, max: null, slope_per_hour: null, gaps: [] };

  const values = rows.map(x => Number(x.value)).filter(v => !Number.isNaN(v));
  const count = values.length;
  const sum = values.reduce((a,b) => a+b, 0);
  const avg = sum / count;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // simple linear slope estimate (delta value / hours) using first and last points
  const first = rows[0];
  const last = rows[rows.length-1];
  const firstTs = new Date(first.recorded_at).getTime();
  const lastTs = new Date(last.recorded_at).getTime();
  const hours = Math.max( (lastTs - firstTs) / 3600000, 1/60 );
  const slope_per_hour = (Number(last.value) - Number(first.value)) / hours;

  // detect gaps larger than expectedIntervalMinutes
  const gaps = [];
  for (let i=1;i<rows.length;i++){
    const prev = new Date(rows[i-1].recorded_at).getTime();
    const cur = new Date(rows[i].recorded_at).getTime();
    const gapMinutes = (cur - prev)/60000;
    if (gapMinutes > expectedIntervalMinutes) gaps.push({ from: rows[i-1].recorded_at, to: rows[i].recorded_at, gapMinutes });
  }

  // compute standard deviation
  const mean = avg;
  const variance = values.reduce((a,v)=> a + Math.pow(v-mean,2), 0) / Math.max(values.length,1);
  const stddev = Math.sqrt(variance);

  // classify trend: rising, falling, stable based on slope and stddev
  const slopeThreshold = opts.slopeThresholdPerHour || 2; // mg/dL per hour
  let category = 'stable';
  if (slope_per_hour >= slopeThreshold && Math.abs(slope_per_hour) > stddev * 0.1) category = 'rising';
  if (slope_per_hour <= -slopeThreshold && Math.abs(slope_per_hour) > stddev * 0.1) category = 'falling';

  return { count, avg, min, max, slope_per_hour, stddev, category, gaps };
}

module.exports = { computeTrends };
