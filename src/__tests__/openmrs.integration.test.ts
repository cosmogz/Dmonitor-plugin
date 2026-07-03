process.env.OPENMRS_BASE_URL = 'http://openmrs.test';
process.env.OPENMRS_USERNAME = 'user';
process.env.OPENMRS_PASSWORD = 'pass';
process.env.OPENMRS_GLUCOSE_CONCEPT = 'gluc-concept';
process.env.OPENMRS_ENCOUNTER_TYPE_UUID = 'enc-uuid';
process.env.OPENMRS_LOCATION_UUID = 'loc-uuid';
process.env.REDIS_URL = 'mock://local';

import { createOpenmrsEncounter, createOpenmrsObservation } from '../shared/openmrs.adapter';

describe('OpenMRS adapter integration (mocked via fetch)', () => {
  afterEach(() => {
    // @ts-ignore
    if (global.fetch && (global.fetch as any).mockRestore) (global.fetch as any).mockRestore();
  });

  test('creates encounter then observation when endpoints succeed', async () => {
    const encResp = { ok: true, json: async () => ({ uuid: 'enc-123' }), text: async () => '{}', status: 201 };
    const obsResp = { ok: true, json: async () => ({ uuid: 'obs-456' }), text: async () => '{}', status: 201 };

    // first call encounter, second call obs
    // @ts-ignore
    global.fetch = jest.fn()
      .mockResolvedValueOnce(encResp)
      .mockResolvedValueOnce(obsResp);

    const enc = await createOpenmrsEncounter('patient-uuid');
    expect(enc.uuid).toBe('enc-123');

    const reading = {
      id: 'r1',
      patientId: 'patient-uuid',
      timestamp: new Date().toISOString(),
      glucoseValue: 7.2,
      units: 'mmol/L',
      deviceId: 'd1',
      context: {},
      createdAt: new Date().toISOString(),
    };

    const obs = await createOpenmrsObservation('patient-uuid', reading as any);
    expect(obs.uuid).toBe('obs-456');
  });

  test('adapter surfaces errors when OpenMRS returns non-ok', async () => {
    const badResp = { ok: false, status: 500, text: async () => 'server error' };
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue(badResp);

    await expect(createOpenmrsEncounter('p')).rejects.toThrow(/OpenMRS request failed|circuit breaker is open/);
  });
});
