import { AlertsRepository } from '../shared/repositories/alerts.repository';

describe('AlertsRepository (in-memory)', () => {
  test('save and findByPatient works', async () => {
    const alert = await AlertsRepository.save({
      patientId: 'p-1',
      readingId: 'r-1',
      type: 'high',
      value: 12,
      threshold: 10,
      status: 'open',
    });

    expect(alert.id).toBeTruthy();
    const list = await AlertsRepository.findByPatient('p-1');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].patientId).toBe('p-1');
  });

  test('acknowledge updates status', async () => {
    const alert = await AlertsRepository.save({
      patientId: 'p-ack',
      readingId: 'r-ack',
      type: 'low',
      value: 2,
      threshold: 3,
      status: 'open',
    });

    const acked = await AlertsRepository.acknowledge(alert.id);
    expect(acked).not.toBeNull();
    expect(acked!.status).toBe('acknowledged');
  });
});
