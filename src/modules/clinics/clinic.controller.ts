import { Router, Request, Response } from 'express';
import { ClinicConfigRepository } from '../../shared/repositories/clinic-config.repository';

export const clinicRouter = Router();

clinicRouter.get('/', async (_req: Request, res: Response) => {
  const configs = await ClinicConfigRepository.list();
  return res.json({ clinics: configs });
});

clinicRouter.get('/:clinicId', async (req: Request, res: Response) => {
  const { clinicId } = req.params;
  const clinic = await ClinicConfigRepository.findByClinicId(clinicId);

  if (!clinic) {
    return res.status(404).json({ error: 'Clinic configuration not found' });
  }

  return res.json({ clinic });
});

clinicRouter.post('/', async (req: Request, res: Response) => {
  const { clinicId, name, alertThresholds, featureToggles, adminRoles } = req.body ?? {};
  const errors: string[] = [];

  if (typeof clinicId !== 'string' || clinicId.trim().length === 0) {
    errors.push('clinicId is required and must be a non-empty string');
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }
  if (alertThresholds !== undefined && (typeof alertThresholds !== 'object' || alertThresholds === null)) {
    errors.push('alertThresholds must be an object when provided');
  }
  if (featureToggles !== undefined && (typeof featureToggles !== 'object' || featureToggles === null)) {
    errors.push('featureToggles must be an object when provided');
  }
  if (adminRoles !== undefined && !Array.isArray(adminRoles)) {
    errors.push('adminRoles must be an array when provided');
  }

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const clinic = await ClinicConfigRepository.save({
    clinicId,
    name,
    alertThresholds,
    featureToggles,
    adminRoles,
  });

  return res.status(201).json({ message: 'Clinic configuration saved', clinic });
});

clinicRouter.patch('/:clinicId', async (req: Request, res: Response) => {
  const { clinicId } = req.params;
  const existing = await ClinicConfigRepository.findByClinicId(clinicId);

  if (!existing) {
    return res.status(404).json({ error: 'Clinic configuration not found' });
  }

  const { name = existing.name, alertThresholds = existing.alertThresholds, featureToggles = existing.featureToggles, adminRoles = existing.adminRoles } = req.body ?? {};

  const clinic = await ClinicConfigRepository.save({
    clinicId,
    name,
    alertThresholds,
    featureToggles,
    adminRoles,
  });

  return res.json({ message: 'Clinic configuration updated', clinic });
});