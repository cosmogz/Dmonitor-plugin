process.env.OPENMRS_BASE_URL = 'http://openmrs.test';
process.env.OPENMRS_USERNAME = 'user';
process.env.OPENMRS_PASSWORD = 'pass';

import { getOpenmrsPatient, getOpenmrsPatientByNationalId } from '../shared/openmrs.client';

describe('OpenMRS client', () => {
  afterEach(() => {
    // @ts-ignore
    if (global.fetch && (global.fetch as any).mockRestore) (global.fetch as any).mockRestore();
  });

  test('getOpenmrsPatientByNationalId returns first result', async () => {
    const mockResp = {
      ok: true,
      json: async () => ({ results: [{ uuid: 'uuid-1', display: 'Patient One' }] }),
      text: async () => JSON.stringify({ results: [{ uuid: 'uuid-1' }] }),
      status: 200,
    };
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue(mockResp);

    const p = await getOpenmrsPatientByNationalId('NAT-123');
    expect(p).toBeTruthy();
    expect(p.uuid).toBe('uuid-1');
  });

  test('getOpenmrsPatient throws on non-ok', async () => {
    const mockResp = { ok: false, status: 404, text: async () => 'not found' };
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue(mockResp);
    await expect(getOpenmrsPatient('nope')).rejects.toThrow(/OpenMRS patient lookup failed/);
  });
});
