import { config } from '../config/app.config';

const authHeader = `Basic ${Buffer.from(`${config.openmrsUsername}:${config.openmrsPassword}`).toString('base64')}`;

export async function getOpenmrsPatient(openmrsUuid: string) {
  if (!config.openmrsBaseUrl) {
    throw new Error('OPENMRS_BASE_URL is not configured');
  }

  const response = await fetch(`${config.openmrsBaseUrl}/ws/rest/v1/patient/${openmrsUuid}?v=full`, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenMRS patient lookup failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function getOpenmrsPatientByNationalId(nationalId: string) {
  if (!config.openmrsBaseUrl) {
    throw new Error('OPENMRS_BASE_URL is not configured');
  }

  const url = new URL(`${config.openmrsBaseUrl}/ws/rest/v1/patient`);
  url.searchParams.set('q', nationalId);
  url.searchParams.set('v', 'full');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenMRS national ID lookup failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.results?.[0] ?? null;
}
