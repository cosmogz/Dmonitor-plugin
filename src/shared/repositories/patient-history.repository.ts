import { randomUUID } from 'crypto';
import { hasDatabase, query } from '../db';
import { store, PatientHistory } from '../store';

export interface PatientHistoryInput {
  patientId: string;
  category: PatientHistory['category'];
  details: string;
  recordedAt?: string;
}

export class PatientHistoryRepository {
  static async save(payload: PatientHistoryInput): Promise<PatientHistory> {
    const history: PatientHistory = {
      id: randomUUID(),
      patientId: payload.patientId,
      category: payload.category,
      details: payload.details,
      recordedAt: payload.recordedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (hasDatabase()) {
      await query(
        `INSERT INTO patient_history (id, patient_id, category, details, recorded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [history.id, history.patientId, history.category, history.details, history.recordedAt, history.createdAt],
      );
    } else {
      store.patientHistory.push(history);
    }

    return history;
  }

  static async findByPatientId(patientId: string): Promise<PatientHistory[]> {
    if (hasDatabase()) {
      const result = await query<PatientHistory>(
        `SELECT id,
                patient_id as "patientId",
                category,
                details,
                recorded_at as "recordedAt",
                created_at as "createdAt"
         FROM patient_history
         WHERE patient_id = $1
         ORDER BY recorded_at DESC, created_at DESC`,
        [patientId],
      );
      return result.rows;
    }

    return store.patientHistory
      .filter((entry) => entry.patientId === patientId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }
}