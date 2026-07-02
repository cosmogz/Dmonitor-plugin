import { Router, Request, Response } from 'express';
import { validateReadingPayload } from './reading.validators';
import { ReadingRepository } from '../../shared/repositories/reading.repository';
import { PatientLinkRepository } from '../../shared/repositories/patient-link.repository';
import { createOpenmrsEncounter, createOpenmrsObservation } from '../../shared/openmrs.adapter';
import { detectThreshold } from '../analytics/analytics.engine';
import { AlertsRepository } from '../../shared/repositories/alerts.repository';

export const readingRouter = Router();

readingRouter.post('/', async (req: Request, res: Response) => {
  const payload = req.body;
  const errors = validateReadingPayload(payload);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const reading = await ReadingRepository.save({
    patientId: payload.patientId,
    timestamp: payload.timestamp,
    glucoseValue: payload.glucoseValue,
    units: payload.units,
    deviceId: payload.deviceId,
    context: payload.context,
  });

  const link = await PatientLinkRepository.findByIdentifier(payload.patientId);
  let openmrsSync = { enabled: false, success: false, error: undefined as string | undefined };

  if (link?.openmrsUuid) {
    openmrsSync.enabled = true;
    try {
      await createOpenmrsEncounter(link.openmrsUuid);
      await createOpenmrsObservation(link.openmrsUuid, reading);
      openmrsSync.success = true;
    } catch (error) {
      openmrsSync.error = error instanceof Error ? error.message : 'OpenMRS sync failed';
    }
  }

  // Detect threshold alerts and persist
  try {
    const alert = detectThreshold(reading.glucoseValue, { low: 3.9, high: 10.0 });
    if (alert) {
      await AlertsRepository.save({
        patientId: reading.patientId,
        readingId: reading.id,
        type: alert.type,
        value: alert.value,
        threshold: alert.threshold,
        status: 'open',
      });
    }
  } catch (e) {
    console.warn('Alert detection/persistence failed', e);
  }

  return res.status(201).json({
    message: 'Reading accepted',
    data: reading,
    openmrsSync,
  });
});

readingRouter.get('/:patientId', async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const readings = await ReadingRepository.findByPatientId(patientId);
  return res.json({ patientId, readings });
});
