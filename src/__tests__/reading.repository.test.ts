import { ReadingRepository } from '../shared/repositories/reading.repository';
import { store } from '../shared/store';

describe('ReadingRepository offline sync behavior', () => {
  beforeEach(() => {
    store.readings.length = 0;
  });

  it('normalizes client timestamps and deduplicates offline uploads', async () => {
    const payload = {
      patientId: 'p-1',
      timestamp: '2026-07-02T10:00:00.000Z',
      clientTimestamp: '2026-07-02T09:45:00.000Z',
      offlineUploadId: 'upload-1',
      glucoseValue: 112,
      units: 'mg/dL' as const,
      deviceId: 'device-1',
      context: { notes: 'offline retry' },
    };

    const first = await ReadingRepository.save(payload);
    const second = await ReadingRepository.save(payload);

    expect(first.created).toBe(true);
    expect(first.reading.timestamp).toBe('2026-07-02T09:45:00.000Z');
    expect(first.reading.clientTimestamp).toBe('2026-07-02T09:45:00.000Z');
    expect(first.reading.offlineUploadId).toBe('upload-1');
    expect(second.created).toBe(false);
    expect(second.reading.id).toBe(first.reading.id);
    expect(store.readings).toHaveLength(1);
  });
});