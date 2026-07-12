import { Router, Request, Response } from 'express';
import { validateReadingBatchPayload, validateReadingPayload, ReadingPayload } from './reading.validators';
import { ReadingRepository } from '../../shared/repositories/reading.repository';
import { PatientLinkRepository } from '../../shared/repositories/patient-link.repository';
import { detectThreshold } from '../analytics/analytics.engine';
import { AlertsRepository } from '../../shared/repositories/alerts.repository';
import { AuditLogRepository } from '../../shared/repositories/audit-log.repository';
import { enqueueOpenmrsSyncJob, OpenmrsSyncResult } from '../../shared/openmrs.sync.queue';
import { publishGatewayReadingEvent } from '../../shared/gateway.adapter';
import { ClinicConfigRepository } from '../../shared/repositories/clinic-config.repository';
import { recordGatewayPublish, recordOpenmrsSyncCompleted, recordReadingIngestion, recordOpenmrsSyncFailed } from '../../metrics/metrics';

export const readingRouter = Router();

async function ingestReading(payload: ReadingPayload) {
  const ingestion = await ReadingRepository.save({
    patientId: payload.patientId,
    timestamp: payload.timestamp,
    clientTimestamp: payload.clientTimestamp,
    offlineUploadId: payload.offlineUploadId,
    glucoseValue: payload.glucoseValue,
    units: payload.units,
    deviceId: payload.deviceId,
    context: payload.context,
  });
  const reading = ingestion.reading;
  const created = ingestion.created;
  recordReadingIngestion(created ? 'created' : 'deduplicated');

  let openmrsSync: OpenmrsSyncResult = { queued: false, attempted: false, success: false, retries: 0 };

  if (created) {
    const link = await PatientLinkRepository.findByIdentifier(payload.patientId);

    if (link?.openmrsUuid) {
      const queued = await enqueueOpenmrsSyncJob({
        patientId: reading.patientId,
        clinicId: reading.clinicId,
        openmrsUuid: link.openmrsUuid,
        reading,
      });

      openmrsSync = queued;

      if (!queued.queued) {
        try {
          const { createOpenmrsEncounter, createOpenmrsObservation } = await import('../../shared/openmrs.adapter');
          await createOpenmrsEncounter(link.openmrsUuid);
          await createOpenmrsObservation(link.openmrsUuid, reading);
          const gatewayResult = await publishGatewayReadingEvent(reading);
          recordGatewayPublish(gatewayResult.published ? 'published' : gatewayResult.attempted ? 'failed' : 'skipped');
          recordOpenmrsSyncCompleted();
          openmrsSync = { queued: false, attempted: true, success: true, retries: 0 };
          if (gatewayResult.attempted && !gatewayResult.published) {
            openmrsSync.error = gatewayResult.error;
          }
        } catch (error) {
          recordOpenmrsSyncFailed();
          openmrsSync = {
            queued: false,
            attempted: true,
            success: false,
            retries: 0,
            error: error instanceof Error ? error.message : 'OpenMRS sync failed',
          };
        }
      }
    }

    try {
      const clinicConfig = reading.clinicId ? await ClinicConfigRepository.findByClinicId(reading.clinicId) : undefined;
      const thresholds = clinicConfig?.alertThresholds ?? { low: 3.9, high: 10.0 };
      const alert = detectThreshold(reading.glucoseValue, thresholds);
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
  } else {
    openmrsSync = {
      enabled: false,
      queued: false,
      attempted: false,
      success: true,
      retries: 0,
      error: undefined,
    };
  }

  try {
    await AuditLogRepository.save({
      actorType: 'patient',
      action: 'reading_ingested',
      patientId: reading.patientId,
      readingId: reading.id,
      status: (openmrsSync.success || openmrsSync.queued) ? 'success' : 'failure',
      message: (openmrsSync.success || openmrsSync.queued)
        ? created
          ? 'Reading ingested successfully'
          : 'Reading upload deduplicated using offline upload id'
        : openmrsSync.queued
          ? 'Reading ingested and OpenMRS sync queued'
          : openmrsSync.attempted
            ? `Reading ingested but OpenMRS sync failed: ${openmrsSync.error ?? 'unknown error'}`
            : 'Reading ingested without OpenMRS sync',
      metadata: {
        openmrsSync,
        units: reading.units,
        glucoseValue: reading.glucoseValue,
        created,
        offlineUploadId: reading.offlineUploadId,
        clientTimestamp: reading.clientTimestamp,
        deduplicated: !created,
        clinicId: reading.clinicId,
      },
    });
  } catch (e) {
    console.warn('Audit log persistence failed', e);
  }

  return { reading, openmrsSync, created };
}

readingRouter.post('/', async (req: Request, res: Response) => {
  const payload = req.body;
  const errors = validateReadingPayload(payload);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const { reading, openmrsSync, created } = await ingestReading(payload);

  return res.status(created ? 201 : 200).json({
    message: 'Reading accepted',
    data: reading,
    created,
    conflict: !created,
    openmrsSync,
  });
});

readingRouter.post('/batch', async (req: Request, res: Response) => {
  const payload = req.body;
  const errors = validateReadingBatchPayload(payload);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const results = [] as Array<{
    index: number;
    reading?: unknown;
    openmrsSync?: OpenmrsSyncResult;
    created?: boolean;
    error?: string;
  }>;

  for (const [index, readingPayload] of payload.readings.entries()) {
    try {
      const { reading, openmrsSync, created } = await ingestReading(readingPayload);
      results.push({ index, reading, openmrsSync, created });
    } catch (error) {
      results.push({
        index,
        error: error instanceof Error ? error.message : 'Reading ingestion failed',
      });
    }
  }

  return res.status(201).json({
    message: 'Batch reading upload processed',
    count: results.length,
    results,
  });
});

readingRouter.get('/:patientId', async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const readings = await ReadingRepository.findByPatientId(patientId);
  return res.json({ patientId, readings });
});
