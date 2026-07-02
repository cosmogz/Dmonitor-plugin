import { randomUUID } from 'crypto';
import { hasDatabase, query } from '../db';
import { store, AuditLogRecord } from '../store';

export interface AuditLogInput {
  actorType: AuditLogRecord['actorType'];
  action: string;
  patientId?: string;
  readingId?: string;
  status: AuditLogRecord['status'];
  message?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogRepository {
  static async save(payload: AuditLogInput): Promise<AuditLogRecord> {
    const auditLog: AuditLogRecord = {
      id: randomUUID(),
      actorType: payload.actorType,
      action: payload.action,
      patientId: payload.patientId,
      readingId: payload.readingId,
      status: payload.status,
      message: payload.message,
      metadata: payload.metadata,
      createdAt: new Date().toISOString(),
    };

    if (hasDatabase()) {
      await query(
        `INSERT INTO audit_logs (id, actor_type, action, patient_id, reading_id, status, message, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          auditLog.id,
          auditLog.actorType,
          auditLog.action,
          auditLog.patientId ?? null,
          auditLog.readingId ?? null,
          auditLog.status,
          auditLog.message ?? null,
          auditLog.metadata ?? null,
          auditLog.createdAt,
        ],
      );
    } else {
      store.auditLogs.push(auditLog);
    }

    return auditLog;
  }
}