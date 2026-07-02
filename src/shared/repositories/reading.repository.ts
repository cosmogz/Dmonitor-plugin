import { randomUUID } from 'crypto';
import { query, hasDatabase } from '../db';
import { store, GlucoseReading } from '../store';

export class ReadingRepository {
  static async save(payload: Omit<GlucoseReading, 'id' | 'createdAt'>): Promise<GlucoseReading> {
    const reading: GlucoseReading = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    if (hasDatabase()) {
      await query(
        `INSERT INTO readings (id, patient_id, timestamp, glucose_value, units, device_id, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [reading.id, reading.patientId, reading.timestamp, reading.glucoseValue, reading.units, reading.deviceId, reading.context ?? null, reading.createdAt],
      );
    } else {
      store.readings.push(reading);
    }

    return reading;
  }

  static async findByPatientId(patientId: string): Promise<GlucoseReading[]> {
    if (hasDatabase()) {
      const result = await query<GlucoseReading>(
        `SELECT id, patient_id as "patientId", timestamp, glucose_value as "glucoseValue", units, device_id as "deviceId", context, created_at as "createdAt"
         FROM readings WHERE patient_id = $1 ORDER BY timestamp DESC`,
        [patientId],
      );
      return result.rows;
    }

    return store.readings.filter((reading) => reading.patientId === patientId);
  }
}
