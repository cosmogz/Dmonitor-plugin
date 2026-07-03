import { config } from '../config/app.config';
import { GlucoseReading } from './store';
import { getRedisClient } from './redis.client';
import { markCircuitOpen, markCircuitClosed } from '../metrics/metrics';

const authHeader = `Basic ${Buffer.from(`${config.openmrsUsername}:${config.openmrsPassword}`).toString('base64')}`;

function getOpenmrsHeaders() {
  return {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  };
}

const RETRIES = Number(process.env.OPENMRS_RETRIES || '3');
const BACKOFF_MS = Number(process.env.OPENMRS_BACKOFF_MS || '200');
const CB_FAILURE_THRESHOLD = Number(process.env.OPENMRS_CB_FAILURE_THRESHOLD || '5');
const CB_RESET_MS = Number(process.env.OPENMRS_CB_RESET_MS || (60 * 1000).toString());

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function isCircuitOpenRedis(keyPrefix = 'openmrs') {
  const client = await getRedisClient();
  if (!client) return false;
  const exists = await client.exists(`${keyPrefix}:cb_open`);
  return exists === 1;
}

async function recordFailureRedis(keyPrefix = 'openmrs') {
  const client = await getRedisClient();
  if (!client) return;
  const failures = await client.incr(`${keyPrefix}:failures`);
  // set expiry window to reset count
  await client.expire(`${keyPrefix}:failures`, Math.ceil(CB_RESET_MS / 1000));
  if (failures >= CB_FAILURE_THRESHOLD) {
    // open circuit for reset window
    await client.set(`${keyPrefix}:cb_open`, '1', { EX: Math.ceil(CB_RESET_MS / 1000) });
    try { markCircuitOpen(); } catch (e) { /* ignore */ }
  }
}

async function resetFailuresRedis(keyPrefix = 'openmrs') {
  const client = await getRedisClient();
  if (!client) return;
  await client.del(`${keyPrefix}:failures`);
  await client.del(`${keyPrefix}:cb_open`);
}

async function fetchWithRetry(url: string, opts: any) {
  if (!config.openmrsBaseUrl) {
    throw new Error('OPENMRS_BASE_URL is not configured');
  }

  // check redis-backed circuit if configured
  if (config.redisUrl) {
    const open = await isCircuitOpenRedis();
    if (open) throw new Error('OpenMRS circuit breaker is open');
  }

  let lastErr: any;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const response = await fetch(url, opts);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${response.status} ${body}`);
      }
      // success -> reset failures
          if (config.redisUrl) await resetFailuresRedis();
          try { markCircuitClosed(); } catch (e) { /* ignore */ }
      return response;
    } catch (err) {
      lastErr = err;
      if (config.redisUrl) await recordFailureRedis();
      const wait = BACKOFF_MS * Math.pow(2, attempt);
      await sleep(wait);
    }
  }

  throw new Error(`OpenMRS request failed after ${RETRIES} attempts: ${lastErr?.message || lastErr}`);
}

export async function createOpenmrsObservation(patientUuid: string, reading: GlucoseReading) {
  if (!config.openmrsBaseUrl) {
    throw new Error('OPENMRS_BASE_URL is not configured');
  }
  if (!config.openmrsGlucoseConcept) {
    throw new Error('OPENMRS_GLUCOSE_CONCEPT is not configured');
  }
  if (!config.openmrsLocationUuid) {
    throw new Error('OPENMRS_LOCATION_UUID is not configured');
  }

  const payload = {
    person: patientUuid,
    concept: config.openmrsGlucoseConcept,
    obsDatetime: reading.timestamp,
    location: config.openmrsLocationUuid,
    value: reading.glucoseValue,
    comment: reading.context?.notes ?? 'Dmonitor glucose reading upload',
  };

  const response = await fetchWithRetry(`${config.openmrsBaseUrl}/ws/rest/v1/obs`, {
    method: 'POST',
    headers: getOpenmrsHeaders(),
    body: JSON.stringify(payload),
  });

  return response.json();
}

export async function createOpenmrsEncounter(patientUuid: string) {
  if (!config.openmrsBaseUrl) {
    throw new Error('OPENMRS_BASE_URL is not configured');
  }
  if (!config.openmrsEncounterTypeUuid) {
    throw new Error('OPENMRS_ENCOUNTER_TYPE_UUID is not configured');
  }
  if (!config.openmrsLocationUuid) {
    throw new Error('OPENMRS_LOCATION_UUID is not configured');
  }

  const payload = {
    patient: patientUuid,
    encounterType: config.openmrsEncounterTypeUuid,
    location: config.openmrsLocationUuid,
    encounterDatetime: new Date().toISOString(),
  };

  const response = await fetchWithRetry(`${config.openmrsBaseUrl}/ws/rest/v1/encounter`, {
    method: 'POST',
    headers: getOpenmrsHeaders(),
    body: JSON.stringify(payload),
  });

  return response.json();
}
