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

  const payload = buildFhirObservation(patientExternalId, reading);
  const auth = OPENMRS_USER ? { username: OPENMRS_USER, password: OPENMRS_PASS } : null;

  const headers = { 'Content-Type': 'application/fhir+json' };

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await axios.post(`${OPENMRS_URL}/api/observations`, payload, { auth, headers });
      return { ok: true, status: resp.status, data: resp.data };
    } catch (err) {
      console.error('OpenMRS send attempt', attempt, 'failed:', err.message || err);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('OpenMRS: all attempts failed');
}

module.exports = { sendObservation, buildFhirObservation };
