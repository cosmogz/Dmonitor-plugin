const axios = require('axios');

const OPENMRS_URL = process.env.OPENMRS_URL || '';
const OPENMRS_USER = process.env.OPENMRS_USER || '';
const OPENMRS_PASS = process.env.OPENMRS_PASS || '';

function buildFhirObservation(patientExternalId, reading) {
  const { value, unit, recorded_at } = reading;
  const effective = recorded_at || new Date().toISOString();
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
    subject: {
      identifier: { system: 'urn:internal:patient', value: patientExternalId }
    },
    effectiveDateTime: effective,
    valueQuantity: {
      value: Number(value),
      unit: unit || 'mg/dL',
      system: 'http://unitsofmeasure.org',
      code: unit || 'mg/dL'
    }
  };
}

async function sendObservation(patientExternalId, reading) {
  if (!OPENMRS_URL) {
    console.log('OpenMRS adapter: OPENMRS_URL not configured, skipping');
    return { skipped: true };
  }

  // attempt to resolve patient UUID in OpenMRS and update subject reference
  let patientUuid = null;
  try {
    patientUuid = await findPatientUuid(patientExternalId);
  } catch (err) {
    console.warn('OpenMRS patient lookup failed, will send with identifier:', err.message || err);
  }

  const payload = buildFhirObservation(patientExternalId, reading);
  if (patientUuid) payload.subject = { reference: `Patient/${patientUuid}` };
  const auth = OPENMRS_USER ? { username: OPENMRS_USER, password: OPENMRS_PASS } : null;

  const headers = { 'Content-Type': 'application/fhir+json' };

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // use OpenMRS FHIR endpoint if available
      const url = `${OPENMRS_URL.replace(/\/$/, '')}/ws/fhir2/R4/Observation`;
      const resp = await axios.post(url, payload, { auth, headers });
      return { ok: true, status: resp.status, data: resp.data };
    } catch (err) {
      console.error('OpenMRS send attempt', attempt, 'failed:', err.message || err);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('OpenMRS: all attempts failed');
}

async function findPatientUuid(patientExternalId) {
  if (!OPENMRS_URL) throw new Error('OPENMRS_URL not configured');
  const searchUrl = `${OPENMRS_URL.replace(/\/$/, '')}/ws/rest/v1/patient?q=${encodeURIComponent(patientExternalId)}`;
  try {
    const resp = await axios.get(searchUrl, { auth });
    // OpenMRS search may return { results: [{ uuid, display, ...}, ...] }
    if (resp.data && Array.isArray(resp.data.results) && resp.data.results.length > 0) {
      return resp.data.results[0].uuid || null;
    }
    // sometimes OpenMRS returns a single patient object when queried by identifier
    if (resp.data && resp.data.uuid) return resp.data.uuid;
    return null;
  } catch (err) {
    // try lookup by identifier path
    const byIdUrl = `${OPENMRS_URL.replace(/\/$/, '')}/ws/rest/v1/patient/${encodeURIComponent(patientExternalId)}`;
    try {
      const r2 = await axios.get(byIdUrl, { auth });
      if (r2.data && r2.data.uuid) return r2.data.uuid;
    } catch (e) {
      // ignore
    }
    throw err;
  }
}

module.exports = { sendObservation, buildFhirObservation };
