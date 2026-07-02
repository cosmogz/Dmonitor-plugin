import { Router, Request, Response } from 'express';
import { validatePatientLinkPayload } from './patient.validators';
import { PatientLinkRepository } from '../../shared/repositories/patient-link.repository';
import { getOpenmrsPatientByNationalId } from '../../shared/openmrs.client';

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

  res.json({ patientId: id, link, history: [] });
});
