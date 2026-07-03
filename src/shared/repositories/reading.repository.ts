import { randomUUID } from 'crypto';
import { query, hasDatabase } from '../db';
import { store, GlucoseReading, IngestionResult } from '../store';

export class ReadingRepository {
  static async save(payload: Omit<GlucoseReading, 'id' | 'createdAt'>): Promise<IngestionResult> {
    const normalizedTimestamp = payload.clientTimestamp ?? payload.timestamp;

    if (payload.offlineUploadId) {
      const existing = await this.findByOfflineUploadId(payload.offlineUploadId, payload.patientId);
      if (existing) {
        return { reading: existing, created: false };
      }
    }

    const reading: GlucoseReading = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
      timestamp: normalizedTimestamp,
    };

    if (hasDatabase()) {
      await query(
        `INSERT INTO readings (id, patient_id, clinic_id, timestamp, client_timestamp, offline_upload_id, glucose_value, units, device_id, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          reading.id,
          reading.patientId,
          reading.clinicId ?? null,
          reading.timestamp,
          reading.clientTimestamp ?? null,
          reading.offlineUploadId ?? null,
          reading.glucoseValue,
          reading.units,
          reading.deviceId,
          reading.context ?? null,
          reading.createdAt,
        ],
      );
    } else {
      store.readings.push(reading);
    }

    return { reading, created: true };
  }

  static async findByPatientId(patientId: string): Promise<GlucoseReading[]> {
    if (hasDatabase()) {
      const result = await query<GlucoseReading>(
        `SELECT id, patient_id as "patientId", clinic_id as "clinicId", timestamp, client_timestamp as "clientTimestamp", offline_upload_id as "offlineUploadId", glucose_value as "glucoseValue", units, device_id as "deviceId", context, created_at as "createdAt"
         FROM readings WHERE patient_id = $1 ORDER BY timestamp DESC`,
        [patientId],
      );
      return result.rows;
    }

    return store.readings.filter((reading) => reading.patientId === patientId);
  }

  static async findByOfflineUploadId(offlineUploadId: string, patientId?: string): Promise<GlucoseReading | undefined> {
    if (hasDatabase()) {
      const result = await query<GlucoseReading>(
        `SELECT id, patient_id as "patientId", clinic_id as "clinicId", timestamp, client_timestamp as "clientTimestamp", offline_upload_id as "offlineUploadId", glucose_value as "glucoseValue", units, device_id as "deviceId", context, created_at as "createdAt"
         FROM readings
         WHERE offline_upload_id = $1${patientId ? ' AND patient_id = $2' : ''}
         ORDER BY created_at DESC
         LIMIT 1`,
        patientId ? [offlineUploadId, patientId] : [offlineUploadId],
      );
      return result.rows[0];
    }

    return store.readings.find((reading) => reading.offlineUploadId === offlineUploadId && (!patientId || reading.patientId === patientId));
  }
}
