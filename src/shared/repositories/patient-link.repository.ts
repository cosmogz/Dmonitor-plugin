import { randomUUID } from 'crypto';
import { query, hasDatabase } from '../db';
import { store, PatientLink } from '../store';

export class PatientLinkRepository {
  static async save(payload: Omit<PatientLink, 'id' | 'createdAt'>): Promise<PatientLink> {
    const link: PatientLink = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    if (hasDatabase()) {
      await query(
        `INSERT INTO patient_links (id, patient_id, national_id, openmrs_uuid, name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [link.id, link.patientId, link.nationalId, link.openmrsUuid, link.name, link.createdAt],
      );
    } else {
      store.patientLinks.push(link);
    }

    return link;
  }

  static async findByIdentifier(identifier: string): Promise<PatientLink | undefined> {
    if (hasDatabase()) {
      const result = await query<PatientLink>(
        `SELECT id, patient_id as "patientId", national_id as "nationalId", openmrs_uuid as "openmrsUuid", name, created_at as "createdAt"
         FROM patient_links
         WHERE id = $1 OR patient_id = $1 OR national_id = $1 OR openmrs_uuid = $1
         LIMIT 1`,
        [identifier],
      );
      return result.rows[0];
    }

    return store.patientLinks.find(
      (entry) => entry.id === identifier || entry.patientId === identifier || entry.nationalId === identifier || entry.openmrsUuid === identifier,
    );
  }
}
