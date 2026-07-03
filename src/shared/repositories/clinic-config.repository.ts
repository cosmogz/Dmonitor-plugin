import { randomUUID } from 'crypto';
import { hasDatabase, query } from '../db';
import { store, ClinicConfig } from '../store';

export interface ClinicConfigInput {
  clinicId: string;
  name: string;
  alertThresholds?: ClinicConfig['alertThresholds'];
  featureToggles?: Record<string, boolean>;
  adminRoles?: string[];
}

export class ClinicConfigRepository {
  static async save(payload: ClinicConfigInput): Promise<ClinicConfig> {
    const existing = await this.findByClinicId(payload.clinicId);
    const now = new Date().toISOString();
    const config: ClinicConfig = {
      id: existing?.id ?? randomUUID(),
      clinicId: payload.clinicId,
      name: payload.name,
      alertThresholds: payload.alertThresholds,
      featureToggles: payload.featureToggles,
      adminRoles: payload.adminRoles,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (hasDatabase()) {
      await query(
        `INSERT INTO clinic_configs (id, clinic_id, name, alert_thresholds, feature_toggles, admin_roles, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (clinic_id) DO UPDATE SET
           name = EXCLUDED.name,
           alert_thresholds = EXCLUDED.alert_thresholds,
           feature_toggles = EXCLUDED.feature_toggles,
           admin_roles = EXCLUDED.admin_roles,
           updated_at = EXCLUDED.updated_at`,
        [
          config.id,
          config.clinicId,
          config.name,
          config.alertThresholds ?? null,
          config.featureToggles ?? null,
          config.adminRoles ?? null,
          config.createdAt,
          config.updatedAt,
        ],
      );
    } else if (existing) {
      const index = store.clinicConfigs.findIndex((entry) => entry.clinicId === payload.clinicId);
      if (index >= 0) {
        store.clinicConfigs[index] = config;
      }
    } else {
      store.clinicConfigs.push(config);
    }

    return config;
  }

  static async findByClinicId(clinicId: string): Promise<ClinicConfig | undefined> {
    if (hasDatabase()) {
      const result = await query<ClinicConfig>(
        `SELECT id, clinic_id as "clinicId", name, alert_thresholds as "alertThresholds", feature_toggles as "featureToggles", admin_roles as "adminRoles", created_at as "createdAt", updated_at as "updatedAt"
         FROM clinic_configs
         WHERE clinic_id = $1
         LIMIT 1`,
        [clinicId],
      );
      return result.rows[0];
    }

    return store.clinicConfigs.find((entry) => entry.clinicId === clinicId);
  }

  static async list(): Promise<ClinicConfig[]> {
    if (hasDatabase()) {
      const result = await query<ClinicConfig>(
        `SELECT id, clinic_id as "clinicId", name, alert_thresholds as "alertThresholds", feature_toggles as "featureToggles", admin_roles as "adminRoles", created_at as "createdAt", updated_at as "updatedAt"
         FROM clinic_configs
         ORDER BY updated_at DESC`,
      );
      return result.rows;
    }

    return [...store.clinicConfigs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}