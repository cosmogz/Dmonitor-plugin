import { config } from '../config/app.config';
import { getRedisClient } from './redis.client';
import { createOpenmrsEncounter, createOpenmrsObservation } from './openmrs.adapter';
import { publishGatewayReadingEvent } from './gateway.adapter';
import { GlucoseReading } from './store';
import { SyncStatusRepository } from './repositories/sync-status.repository';
import { decrementOpenmrsSyncQueueDepth, recordGatewayPublish, recordOpenmrsSyncCompleted, recordOpenmrsSyncFailed, recordOpenmrsSyncQueued, recordOpenmrsSyncRetryScheduled } from '../metrics/metrics';

const QUEUE_KEY = 'openmrs:sync:queue';
const RETRY_PREFIX = 'openmrs:sync:retry';
const MAX_ATTEMPTS = Number(process.env.OPENMRS_SYNC_MAX_ATTEMPTS || '3');
const INITIAL_RETRY_DELAY_MS = Number(process.env.OPENMRS_SYNC_RETRY_DELAY_MS || '500');
const POLL_INTERVAL_MS = Number(process.env.OPENMRS_SYNC_POLL_INTERVAL_MS || '1000');

export interface OpenmrsSyncJob {
  id: string;
  patientId: string;
  clinicId?: string;
  openmrsUuid: string;
  reading: GlucoseReading;
  attempts: number;
  enqueuedAt: string;
  lastError?: string;
}

export interface OpenmrsSyncResult {
  queued: boolean;
  attempted: boolean;
  success: boolean;
  retries: number;
  error?: string;
  jobId?: string;
}

function hasRequiredConfig() {
  return Boolean(config.openmrsBaseUrl && config.openmrsEncounterTypeUuid && config.openmrsLocationUuid);
}

async function pushJob(client: any, job: OpenmrsSyncJob) {
  await client.lPush(QUEUE_KEY, JSON.stringify(job));
}

async function popJob(client: any): Promise<OpenmrsSyncJob | null> {
  const raw = await client.rPop(QUEUE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as OpenmrsSyncJob;
}

async function processJob(job: OpenmrsSyncJob): Promise<void> {
  await SyncStatusRepository.save({
    patientId: job.patientId,
    status: 'processing',
    details: `OpenMRS sync job ${job.id} attempt ${job.attempts + 1}`,
  });

  await createOpenmrsEncounter(job.openmrsUuid);
  await createOpenmrsObservation(job.openmrsUuid, job.reading);

  const gatewayResult = await publishGatewayReadingEvent(job.reading);
  if (gatewayResult.attempted) {
    recordGatewayPublish(gatewayResult.published ? 'published' : 'failed');
    await SyncStatusRepository.save({
      patientId: job.patientId,
      status: gatewayResult.published ? 'gateway_published' : 'gateway_failed',
      details: gatewayResult.published
        ? `Gateway event published for reading ${job.reading.id}`
        : `Gateway publish failed for reading ${job.reading.id}: ${gatewayResult.error ?? 'unknown error'}`,
    });
  }

  await SyncStatusRepository.save({
    patientId: job.patientId,
    status: 'completed',
    details: `OpenMRS sync job ${job.id} completed`,
  });
  recordOpenmrsSyncCompleted();
}

async function scheduleRetry(client: any, job: OpenmrsSyncJob, errorMessage: string) {
  const nextAttempt = job.attempts + 1;
  if (nextAttempt >= MAX_ATTEMPTS) {
    await SyncStatusRepository.save({
      patientId: job.patientId,
      status: 'failed',
      details: `OpenMRS sync job ${job.id} failed after ${nextAttempt} attempts: ${errorMessage}`,
    });
    return;
  }

  const retryJob: OpenmrsSyncJob = {
    ...job,
    attempts: nextAttempt,
    lastError: errorMessage,
  };

  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, job.attempts);
  await SyncStatusRepository.save({
    patientId: job.patientId,
    status: 'retry_scheduled',
    details: `OpenMRS sync job ${job.id} retry ${nextAttempt} scheduled in ${delay}ms: ${errorMessage}`,
  });
  recordOpenmrsSyncRetryScheduled();

  setTimeout(() => {
    pushJob(client, retryJob).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to requeue OpenMRS sync job', err);
    });
  }, delay);
}

export async function enqueueOpenmrsSyncJob(job: Omit<OpenmrsSyncJob, 'id' | 'attempts' | 'enqueuedAt'>): Promise<OpenmrsSyncResult> {
  if (!hasRequiredConfig()) {
    return { queued: false, attempted: false, success: false, retries: 0, error: 'OpenMRS configuration is incomplete' };
  }

  const client = await getRedisClient();
  if (!client) {
    return { queued: false, attempted: false, success: false, retries: 0, error: 'Redis is not configured' };
  }

  const queuedJob: OpenmrsSyncJob = {
    ...job,
    id: `${job.reading.id}:openmrs`,
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
  };

  await pushJob(client, queuedJob);
  recordOpenmrsSyncQueued();

  await SyncStatusRepository.save({
    patientId: job.patientId,
    status: 'queued',
    details: `OpenMRS sync job ${queuedJob.id} queued for patient ${job.patientId}${job.clinicId ? ` in clinic ${job.clinicId}` : ''}`,
  });

  return { queued: true, attempted: false, success: false, retries: 0, jobId: queuedJob.id };
}

export async function processNextOpenmrsSyncJob(): Promise<boolean> {
  const client = await getRedisClient();
  if (!client || !hasRequiredConfig()) {
    return false;
  }

  const job = await popJob(client);
  if (!job) {
    return false;
  }
  decrementOpenmrsSyncQueueDepth();

  try {
    await processJob(job);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenMRS sync failed';
    await scheduleRetry(client, job, message);
    recordOpenmrsSyncFailed();
    return true;
  }
}

export function startOpenmrsSyncWorker() {
  if (!hasRequiredConfig()) {
    return { stop: () => undefined };
  }

  let stopped = false;
  const loop = async () => {
    if (stopped) return;
    try {
      const processed = await processNextOpenmrsSyncJob();
      if (!processed) {
        setTimeout(loop, POLL_INTERVAL_MS);
      } else {
        setImmediate(loop);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('OpenMRS sync worker error', error);
      setTimeout(loop, POLL_INTERVAL_MS);
    }
  };

  setImmediate(loop);

  return {
    stop: () => {
      stopped = true;
    },
  };
}