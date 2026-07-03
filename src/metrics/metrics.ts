import * as client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const labels = ['method', 'path', 'status'];

export const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: labels,
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500],
  registers: [register],
});

export const readingIngestionTotal = new client.Counter({
  name: 'reading_ingestion_total',
  help: 'Counts ingestion outcomes for glucose readings',
  labelNames: ['result'],
  registers: [register],
});

export const openmrsSyncQueuedTotal = new client.Counter({
  name: 'openmrs_sync_queued_total',
  help: 'Counts OpenMRS sync jobs queued for async processing',
  registers: [register],
});

export const openmrsSyncCompletedTotal = new client.Counter({
  name: 'openmrs_sync_completed_total',
  help: 'Counts completed OpenMRS sync jobs',
  registers: [register],
});

export const openmrsSyncFailedTotal = new client.Counter({
  name: 'openmrs_sync_failed_total',
  help: 'Counts failed OpenMRS sync jobs',
  registers: [register],
});

export const openmrsSyncRetryScheduledTotal = new client.Counter({
  name: 'openmrs_sync_retry_scheduled_total',
  help: 'Counts OpenMRS sync retries that were scheduled',
  registers: [register],
});

export const openmrsSyncQueueDepth = new client.Gauge({
  name: 'openmrs_sync_queue_depth',
  help: 'Approximate number of OpenMRS sync jobs waiting in the queue',
  registers: [register],
});

export const gatewayPublishTotal = new client.Counter({
  name: 'gateway_publish_total',
  help: 'Counts gateway publish results',
  labelNames: ['result'],
  registers: [register],
});

export const openmrsCircuitOpen = new client.Gauge({
  name: 'openmrs_circuit_open',
  help: '1 when OpenMRS circuit is open',
  registers: [register],
});

export const openmrsCircuitOpenCount = new client.Counter({
  name: 'openmrs_circuit_open_count',
  help: 'Counts how many times the OpenMRS circuit has opened',
  registers: [register],
});

export async function metricsHandler() {
  return await register.metrics();
}

export function markCircuitOpen() {
  openmrsCircuitOpen.set(1);
  openmrsCircuitOpenCount.inc();
}

export function markCircuitClosed() {
  openmrsCircuitOpen.set(0);
}

export function observeRequestDuration(method: string, path: string, status: number, durationMs: number) {
  httpRequestDurationMs.observe({ method, path, status: String(status) }, durationMs);
}

export function recordReadingIngestion(result: 'created' | 'deduplicated') {
  readingIngestionTotal.inc({ result });
}

export function recordOpenmrsSyncQueued() {
  openmrsSyncQueuedTotal.inc();
  openmrsSyncQueueDepth.inc();
}

export function recordOpenmrsSyncCompleted() {
  openmrsSyncCompletedTotal.inc();
}

export function recordOpenmrsSyncFailed() {
  openmrsSyncFailedTotal.inc();
}

export function decrementOpenmrsSyncQueueDepth() {
  openmrsSyncQueueDepth.dec();
}

export function recordOpenmrsSyncRetryScheduled() {
  openmrsSyncRetryScheduledTotal.inc();
}

export function recordGatewayPublish(result: 'published' | 'failed' | 'skipped') {
  gatewayPublishTotal.inc({ result });
}

export default register;
