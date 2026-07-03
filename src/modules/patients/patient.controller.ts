import { Router, Request, Response } from 'express';
import { validatePatientLinkPayload } from './patient.validators';
import { PatientLinkRepository } from '../../shared/repositories/patient-link.repository';
import { getOpenmrsPatientByNationalId } from '../../shared/openmrs.client';
import { PatientHistoryRepository } from '../../shared/repositories/patient-history.repository';

type PatientHistoryCategory = 'allergies' | 'medications' | 'conditions' | 'demographics' | 'other';

export const patientRouter = Router();

patientRouter.post('/link', async (req: Request, res: Response) => {
  const payload = req.body;
  const errors = validatePatientLinkPayload(payload);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  let openmrsUuid = payload.openmrsUuid;
  if (!openmrsUuid && payload.nationalId) {
    try {
      const patient = await getOpenmrsPatientByNationalId(payload.nationalId);
      openmrsUuid = patient?.uuid;
    } catch (error) {
      console.warn('OpenMRS lookup failed:', error);
    }
  }

  const link = await PatientLinkRepository.save({
    patientId: payload.patientId,
    nationalId: payload.nationalId,
    openmrsUuid,
    name: payload.name,
  });

  return res.status(200).json({ message: 'Patient link saved', data: link });
});

patientRouter.get('/:id/history', async (req: Request, res: Response) => {
  const { id } = req.params;
  const link = await PatientLinkRepository.findByIdentifier(id);

  if (!link) {
    return res.status(404).json({ error: 'Patient link not found' });
  }

  const history = await PatientHistoryRepository.findByPatientId(link.patientId ?? id);
  res.json({ patientId: link.patientId ?? id, link, history });
});

patientRouter.post('/:id/history', async (req: Request, res: Response) => {
  const { id } = req.params;
  const link = await PatientLinkRepository.findByIdentifier(id);

  if (!link) {
    return res.status(404).json({ error: 'Patient link not found' });
  }

  const body = req.body ?? {};
  const category = body.category as PatientHistoryCategory;
  const details = body.details;
  const recordedAt = body.recordedAt;

  const validCategories: PatientHistoryCategory[] = ['allergies', 'medications', 'conditions', 'demographics', 'other'];
  const errors: string[] = [];
  if (!validCategories.includes(category)) {
    errors.push('category must be one of allergies, medications, conditions, demographics, other');
  }
  if (typeof details !== 'string' || details.trim().length === 0) {
    errors.push('details is required and must be a non-empty string');
  }
  if (recordedAt !== undefined && (typeof recordedAt !== 'string' || Number.isNaN(Date.parse(recordedAt)))) {
    errors.push('recordedAt must be a valid ISO timestamp when provided');
  }

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const history = await PatientHistoryRepository.save({
    patientId: link.patientId ?? id,
    category,
    details,
    recordedAt,
  });

  return res.status(201).json({ message: 'Patient history saved', data: history });
});
