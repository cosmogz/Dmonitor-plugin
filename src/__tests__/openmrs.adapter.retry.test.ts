process.env.OPENMRS_BASE_URL = 'http://openmrs.test';
process.env.OPENMRS_USERNAME = 'user';
process.env.OPENMRS_PASSWORD = 'pass';
process.env.OPENMRS_GLUCOSE_CONCEPT = 'gluc-concept';
process.env.OPENMRS_ENCOUNTER_TYPE_UUID = 'enc-uuid';
process.env.OPENMRS_LOCATION_UUID = 'loc-uuid';
process.env.OPENMRS_RETRIES = '4';
process.env.OPENMRS_BACKOFF_MS = '10';
process.env.OPENMRS_CB_FAILURE_THRESHOLD = '3';
process.env.OPENMRS_CB_RESET_MS = '200';
process.env.REDIS_URL = 'mock://local';

import { createOpenmrsEncounter } from '../shared/openmrs.adapter';

describe('OpenMRS adapter retry and circuit-breaker', () => {
  afterEach(() => {
    // @ts-ignore
    if (global.fetch && (global.fetch as any).mockRestore) (global.fetch as any).mockRestore();
  });

  test('retries on transient failures and eventually succeeds', async () => {
    const bad = { ok: false, status: 502, text: async () => 'bad' };
    const good = { ok: true, json: async () => ({ uuid: 'enc-try' }), text: async () => '{}', status: 201 };

    // first two attempts fail, then succeed
    // @ts-ignore
    global.fetch = jest.fn()
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(good);

    const enc = await createOpenmrsEncounter('patient-xyz');
    expect(enc.uuid).toBe('enc-try');
  });

  test('circuit breaker opens after threshold and blocks requests', async () => {
    const bad = { ok: false, status: 502, text: async () => 'bad' };
    // always fail
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue(bad);

    // first call will retry and ultimately throw
    await expect(createOpenmrsEncounter('p1')).rejects.toThrow(/OpenMRS request failed/);

    // second call should hit circuit-breaker open error (faster path)
    await expect(createOpenmrsEncounter('p2')).rejects.toThrow(/circuit breaker is open/);
  });
});
