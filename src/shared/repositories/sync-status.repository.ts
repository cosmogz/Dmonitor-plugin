import { randomUUID } from 'crypto';
import { query, hasDatabase } from '../db';
import { store, SyncStatus } from '../store';

export class SyncStatusRepository {
  static async save(payload: Omit<SyncStatus, 'id' | 'createdAt'>): Promise<SyncStatus> {
    const syncRecord: SyncStatus = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    if (hasDatabase()) {
      await query(
        `INSERT INTO sync_statuses (id, patient_id, status, details, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [syncRecord.id, syncRecord.patientId, syncRecord.status, syncRecord.details ?? null, syncRecord.createdAt],
      );
    } else {
      store.syncStatuses.push(syncRecord);
    }

    return syncRecord;
  }
}
