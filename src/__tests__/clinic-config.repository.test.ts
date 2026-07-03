import { ClinicConfigRepository } from '../shared/repositories/clinic-config.repository';
import { store } from '../shared/store';

describe('ClinicConfigRepository', () => {
  beforeEach(() => {
    store.clinicConfigs.length = 0;
  });

  it('creates and updates clinic configs in memory', async () => {
    const created = await ClinicConfigRepository.save({
      clinicId: 'clinic-1',
      name: 'Clinic One',
      alertThresholds: { low: 4.1, high: 9.5 },
      featureToggles: { offlineSync: true },
      adminRoles: ['admin'],
    });

    expect(created.clinicId).toBe('clinic-1');
    expect(created.alertThresholds).toEqual({ low: 4.1, high: 9.5 });
    expect(store.clinicConfigs).toHaveLength(1);

    const updated = await ClinicConfigRepository.save({
      clinicId: 'clinic-1',
      name: 'Clinic One Updated',
      alertThresholds: { low: 3.8, high: 10.2 },
      featureToggles: { offlineSync: false },
      adminRoles: ['super-admin'],
    });

    expect(updated.name).toBe('Clinic One Updated');
    expect(store.clinicConfigs).toHaveLength(1);
    expect((await ClinicConfigRepository.findByClinicId('clinic-1'))?.name).toBe('Clinic One Updated');
  });
});