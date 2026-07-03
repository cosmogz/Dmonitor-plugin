const axios = require('axios');

const OPENMRS_URL = process.env.OPENMRS_URL || '';
const OPENMRS_USER = process.env.OPENMRS_USER || '';
const OPENMRS_PASS = process.env.OPENMRS_PASS || '';
const AUTH = OPENMRS_USER ? { username: OPENMRS_USER, password: OPENMRS_PASS } : null;

function mapReading(reading) {
  const r = Object.assign({}, reading);
  // map common types to LOINC + normalize units
  const t = (reading.type || '').toLowerCase();
  if (t === 'glucose' || t === 'blood_glucose') {
    r.code = reading.code || '2339-0';
    r.code_display = reading.code_display || 'Glucose [Mass/volume] in Blood';
    // convert mmol/L to mg/dL if provided
    if (reading.unit === 'mmol/L') {
      r.value = Number(reading.value) * 18.0182;
      r.unit = 'mg/dL';
    } else {
      r.value = Number(reading.value);
      r.unit = reading.unit || 'mg/dL';
    }
  } else if (t === 'hba1c' || t === 'hb_a1c') {
    r.code = reading.code || '4548-4';
    r.code_display = reading.code_display || 'Hemoglobin A1c';
    r.value = Number(reading.value);
    r.unit = reading.unit || '%';
  } else if (t === 'blood_pressure') {
      } else if (t === 'lipid' || t === 'lipids' || t === 'cholesterol') {
        // Expect reading.value to be object: { total, hdl, ldl, triglycerides }
        r.code = reading.code || '2093-3';
        r.code_display = reading.code_display || 'Cholesterol, Total';
        r.value = reading.value || {};
        r.unit = reading.unit || 'mg/dL';
      } else if (t === 'creatinine') {
        r.code = reading.code || '2160-0';
        r.code_display = reading.code_display || 'Creatinine [Mass/volume] in Serum or Plasma';
        r.value = Number(reading.value);
        r.unit = reading.unit || 'mg/dL';
      } else if (t === 'heart_rate' || t === 'pulse') {
        r.code = reading.code || '8867-4';
        r.code_display = reading.code_display || 'Heart rate';
        r.value = Number(reading.value);
        r.unit = reading.unit || 'beats/minute';
      } else if (t === 'temperature' || t === 'temp') {
        r.code = reading.code || '8310-5';
        r.code_display = reading.code_display || 'Body temperature';
        r.value = Number(reading.value);
        r.unit = reading.unit || 'Cel';
    r.code = reading.code || '85354-9';
    r.code_display = reading.code_display || 'Blood pressure panel';
    r.value = reading.value; // expected object { systolic, diastolic }
    r.unit = reading.unit || 'mmHg';
  } else {
    r.value = Number(reading.value);
    r.unit = reading.unit || 'mg/dL';
    r.code = reading.code || '2339-0';
    r.code_display = reading.code_display || 'Glucose';
  }
  return r;
}

function buildPatientPayload(patientExternalId, opts = {}) {
  // opts may contain { name, given, family, gender, birthdate, address, attributes }
  const name = opts.name || opts.display_name || `Patient ${patientExternalId}`;
  const given = opts.given || (opts.name ? opts.name.split(' ')[0] : 'Unknown');
  const family = opts.family || (opts.name ? opts.name.split(' ').slice(1).join(' ') : `Patient-${patientExternalId}`);
  const gender = (opts.gender || 'unknown').toLowerCase();
  const birthdate = opts.birthdate || null;

  const person = {
    names: [{ givenName: given || 'Unknown', familyName: family || `Patient-${patientExternalId}` }],
    gender: ['male','female','other','unknown'].includes(gender) ? gender : 'unknown'
  };
  if (birthdate) person.birthdate = birthdate;
  if (opts.address) person.addresses = [opts.address];

  const identifiers = [
    { identifier: patientExternalId, identifierType: opts.identifierType || process.env.OPENMRS_DEFAULT_IDENTIFIER_TYPE || 'UNKNOWN' }
  ];

  if (opts.location || process.env.OPENMRS_DEFAULT_LOCATION) identifiers[0].location = opts.location || process.env.OPENMRS_DEFAULT_LOCATION;

  const payload = { person, identifiers };
  if (opts.attributes) payload.person.attributes = opts.attributes;
  return payload;
}

function buildFhirObservation(patientExternalId, reading) {
  const norm = mapReading(reading);
  const { value, unit, recorded_at } = norm;
  const effective = recorded_at || new Date().toISOString();
  return {
    resourceType: 'Observation',
    code: {
      coding: [
        { system: 'http://loinc.org', code: norm.code, display: norm.code_display }
      ],
      text: norm.code_display
    },
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

  // attempt to resolve or create patient UUID in OpenMRS and update subject reference
  let patientUuid = null;
  try {
    if (process.env.OPENMRS_AUTO_CREATE === 'true') {
      patientUuid = await findOrCreatePatientUuid(patientExternalId, reading.patient_info || {});
    } else {
      patientUuid = await findPatientUuid(patientExternalId);
    }
  } catch (err) {
    console.warn('OpenMRS patient lookup/create failed, will send with identifier:', err.message || err);
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
  const auth = AUTH;
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

async function findIdentifierTypeUuid(name) {
  if (!OPENMRS_URL) throw new Error('OPENMRS_URL not configured');
  const auth = AUTH;
  const url = `${OPENMRS_URL.replace(/\/$/, '')}/ws/rest/v1/identifiertype?q=${encodeURIComponent(name)}`;
  try {
    const resp = await axios.get(url, { auth });
    if (resp.data && Array.isArray(resp.data.results) && resp.data.results.length > 0) return resp.data.results[0].uuid;
    if (resp.data && resp.data.uuid) return resp.data.uuid;
    return null;
  } catch (err) {
    throw err;
  }
}

async function findOrCreatePatientUuid(patientExternalId, opts = {}) {
  const found = await findPatientUuid(patientExternalId).catch(() => null);
  if (found) return found;
  if (process.env.OPENMRS_CREATE_PATIENT_URL === 'false') throw new Error('patient create disabled');
  if (!OPENMRS_URL) throw new Error('OPENMRS_URL not configured');

  if (process.env.OPENMRS_AUTO_CREATE !== 'true') return null;

  const createUrl = (process.env.OPENMRS_CREATE_PATIENT_URL && process.env.OPENMRS_CREATE_PATIENT_URL.length)
    ? process.env.OPENMRS_CREATE_PATIENT_URL
    : `${OPENMRS_URL.replace(/\/$/, '')}/ws/rest/v1/patient`;

  // resolve identifier type UUID
  let identifierType = null;
  const defaultIdType = process.env.OPENMRS_DEFAULT_IDENTIFIER_TYPE || null;
  if (defaultIdType) {
    const maybeUuid = defaultIdType.trim();
    const uuidRe = /^[0-9a-fA-F-]{32,36}$/;
    if (uuidRe.test(maybeUuid)) identifierType = maybeUuid;
    else identifierType = await findIdentifierTypeUuid(maybeUuid).catch(() => null);
  }

  // build a more robust payload using available opts (name, gender, birthdate, address)
  const payload = buildPatientPayload(patientExternalId, Object.assign({}, opts, { identifierType }));

  const auth = AUTH;
  try {
    const resp = await axios.post(createUrl, payload, { auth });
    if (resp && resp.data && resp.data.uuid) return resp.data.uuid;
    // some OpenMRS installs return created object differently; attempt to parse
    if (resp && resp.headers && resp.headers.location) {
      // try to extract uuid from location header
      const parts = resp.headers.location.split('/');
      return parts[parts.length - 1];
    }
  } catch (err) {
    console.warn('OpenMRS patient create failed:', err.message || err);
    throw err;
  }
  return null;
}

module.exports = { sendObservation, buildFhirObservation, buildPatientPayload, mapReading };
