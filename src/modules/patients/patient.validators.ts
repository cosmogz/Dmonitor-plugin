export interface PatientLinkPayload {
  patientId?: string;
  nationalId?: string;
  openmrsUuid?: string;
  name?: string;
}

export function validatePatientLinkPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return errors;
  }

  const body = payload as Partial<PatientLinkPayload>;
  if (!body.patientId && !body.nationalId && !body.openmrsUuid) {
    errors.push('At least one of patientId, nationalId, or openmrsUuid is required');
  }
  if (body.nationalId && typeof body.nationalId !== 'string') {
    errors.push('nationalId must be a string');
  }
  if (body.openmrsUuid && typeof body.openmrsUuid !== 'string') {
    errors.push('openmrsUuid must be a string');
  }
  if (body.name && typeof body.name !== 'string') {
    errors.push('name must be a string');
  }

  return errors;
}
