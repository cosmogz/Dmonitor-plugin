process.env.OPENMRS_BASE_URL = 'http://openmrs.test';
process.env.OPENMRS_USERNAME = 'user';
process.env.OPENMRS_PASSWORD = 'pass';
process.env.OPENMRS_GLUCOSE_CONCEPT = 'gluc-concept';
process.env.OPENMRS_ENCOUNTER_TYPE_UUID = 'enc-uuid';
process.env.OPENMRS_LOCATION_UUID = 'loc-uuid';

import { createOpenmrsObservation, createOpenmrsEncounter } from '../shared/openmrs.adapter';
import { GlucoseReading } from '../shared/store';

describe('OpenMRS adapter', () => {
  afterEach(() => {
    // @ts-ignore
    if (global.fetch && (global.fetch as any).mockRestore) (global.fetch as any).mockRestore();
  });

  test('createOpenmrsEncounter and observation succeed', async () => {
    const encResp = { ok: true, json: async () => ({ uuid: 'enc-1' }), text: async () => '{}', status: 201 };
    const obsResp = { ok: true, json: async () => ({ uuid: 'obs-1' }), text: async () => '{}', status: 201 };

    // first call encounter, second call observation
    // @ts-ignore
    global.fetch = jest.fn()
      .mockResolvedValueOnce(encResp)
      .mockResolvedValueOnce(obsResp);

    const enc = await createOpenmrsEncounter('patient-uuid');
    expect(enc.uuid).toBe('enc-1');

    const reading: GlucoseReading = {
      id: 'r1',
      patientId: 'p1',
      timestamp: new Date().toISOString(),
      glucoseValue: 8,
      units: 'mmol/L',
      deviceId: 'd1',
      context: {},
      createdAt: new Date().toISOString(),
    };

    const obs = await createOpenmrsObservation('patient-uuid', reading);
    expect(obs.uuid).toBe('obs-1');
  });

  test('createOpenmrsObservation throws when config missing', async () => {
    const original = process.env.OPENMRS_GLUCOSE_CONCEPT;
    // Reset module cache so config is reloaded with changed env
    jest.resetModules();
    delete process.env.OPENMRS_GLUCOSE_CONCEPT;
    // re-require adapter after environment change
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createOpenmrsObservation: createObsReloaded } = require('../shared/openmrs.adapter');
    await expect(createObsReloaded('p', {})).rejects.toThrow(/OPENMRS_GLUCOSE_CONCEPT is not configured/);
    process.env.OPENMRS_GLUCOSE_CONCEPT = original;
  });
});
