import { AuditLogRepository } from '../shared/repositories/audit-log.repository';
import { store } from '../shared/store';

describe('AuditLogRepository', () => {
  beforeEach(() => {
    store.auditLogs.length = 0;
  });

  it('stores audit log records in memory', async () => {
    const record = await AuditLogRepository.save({
      actorType: 'patient',
      action: 'reading_ingested',
      patientId: 'p-1',
      readingId: 'r-1',
      status: 'success',
      message: 'Reading ingested successfully',
      metadata: { source: 'test' },
    });

    expect(record.id).toBeDefined();
    expect(store.auditLogs).toHaveLength(1);
    expect(store.auditLogs[0]).toMatchObject({
      actorType: 'patient',
      action: 'reading_ingested',
      patientId: 'p-1',
      readingId: 'r-1',
      status: 'success',
      message: 'Reading ingested successfully',
    });
  });
});