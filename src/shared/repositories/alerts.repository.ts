import { randomUUID } from 'crypto';
import { query, hasDatabase } from '../db';
import { store, AlertRecord } from '../store';

export class AlertsRepository {
  static async save(payload: Omit<AlertRecord, 'id' | 'createdAt'>): Promise<AlertRecord> {
    const alert: AlertRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
      status: payload.status ?? 'open',
    } as AlertRecord;

    if (hasDatabase()) {
      await query(
        `INSERT INTO alerts (id, patient_id, reading_id, type, value, threshold, status, created_at, acknowledged_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [alert.id, alert.patientId, alert.readingId ?? null, alert.type, alert.value, alert.threshold ?? null, alert.status, alert.createdAt, alert.acknowledgedAt ?? null],
      );
    } else {
      store.alerts.push(alert);
    }

    return alert;
  }

  static async findByPatient(patientId: string) {
    if (hasDatabase()) {
      const result = await query<AlertRecord>(
        `SELECT id, patient_id as "patientId", reading_id as "readingId", type, value, threshold, status, created_at as "createdAt", acknowledged_at as "acknowledgedAt"
         FROM alerts WHERE patient_id = $1 ORDER BY created_at DESC`,
        [patientId],
      );
      return result.rows;
    }

    return store.alerts.filter((a) => a.patientId === patientId);
  }

  static async acknowledge(id: string) {
    const ackTime = new Date().toISOString();
    if (hasDatabase()) {
      await query(`UPDATE alerts SET status = 'acknowledged', acknowledged_at = $2 WHERE id = $1`, [id, ackTime]);
      const result = await query<AlertRecord>(`SELECT id, patient_id as "patientId", reading_id as "readingId", type, value, threshold, status, created_at as "createdAt", acknowledged_at as "acknowledgedAt" FROM alerts WHERE id = $1`, [id]);
      return result.rows[0];
    }

    const found = store.alerts.find((a) => a.id === id);
    if (!found) return null;
    found.status = 'acknowledged';
    found.acknowledgedAt = ackTime;
    return found;
  }
}
