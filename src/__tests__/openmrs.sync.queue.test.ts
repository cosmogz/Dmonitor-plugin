process.env.OPENMRS_BASE_URL = 'http://openmrs.test';
process.env.OPENMRS_USERNAME = 'user';
process.env.OPENMRS_PASSWORD = 'pass';
process.env.OPENMRS_GLUCOSE_CONCEPT = 'gluc-concept';
process.env.OPENMRS_ENCOUNTER_TYPE_UUID = 'enc-uuid';
process.env.OPENMRS_LOCATION_UUID = 'loc-uuid';
process.env.REDIS_URL = 'mock://redis';

const mockQueueStore: string[] = [];

jest.mock('../shared/redis.client', () => ({
  getRedisClient: jest.fn(async () => ({
    lPush: jest.fn(async (_key: string, value: string) => {
      mockQueueStore.unshift(value);
      return mockQueueStore.length;
    }),
    rPop: jest.fn(async (_key: string) => mockQueueStore.pop() ?? null),
  })),
}));

jest.mock('../shared/openmrs.adapter', () => ({
  createOpenmrsEncounter: jest.fn(async () => ({ uuid: 'enc-1' })),
  createOpenmrsObservation: jest.fn(async () => ({ uuid: 'obs-1' })),
}));

import { enqueueOpenmrsSyncJob, processNextOpenmrsSyncJob } from '../shared/openmrs.sync.queue';
import { createOpenmrsEncounter, createOpenmrsObservation } from '../shared/openmrs.adapter';
import { store } from '../shared/store';

describe('OpenMRS sync queue', () => {
  beforeEach(() => {
    mockQueueStore.length = 0;
    store.syncStatuses.length = 0;
    jest.clearAllMocks();
  });

  it('enqueues and processes a reading asynchronously', async () => {
    const result = await enqueueOpenmrsSyncJob({
      patientId: 'p-1',
      openmrsUuid: 'uuid-1',
      reading: {
        id: 'r-1',
        patientId: 'p-1',
        timestamp: new Date().toISOString(),
        clientTimestamp: new Date().toISOString(),
        offlineUploadId: 'upload-1',
        glucoseValue: 110,
        units: 'mg/dL',
        createdAt: new Date().toISOString(),
      },
    });

    expect(result.queued).toBe(true);
    expect(mockQueueStore).toHaveLength(1);

    const processed = await processNextOpenmrsSyncJob();

    expect(processed).toBe(true);
    expect(mockQueueStore).toHaveLength(0);
    expect(createOpenmrsEncounter).toHaveBeenCalledWith('uuid-1');
    expect(createOpenmrsObservation).toHaveBeenCalledWith(
      'uuid-1',
      expect.objectContaining({ id: 'r-1', patientId: 'p-1' }),
    );
    expect(store.syncStatuses.map((status) => status.status)).toContain('completed');
  });
});