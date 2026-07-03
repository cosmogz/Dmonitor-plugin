export interface GlucoseReading {
  id: string;
  patientId: string;
  clinicId?: string;
  timestamp: string;
  clientTimestamp?: string;
  offlineUploadId?: string;
  glucoseValue: number;
  units: 'mg/dL' | 'mmol/L';
  deviceId?: string;
  context?: {
    mealType?: 'pre-meal' | 'post-meal' | 'fasting' | 'random';
    insulinDoseMg?: number;
    symptoms?: string[];
    exerciseMinutes?: number;
    notes?: string;
  };
  createdAt: string;
}

export interface PatientLink {
  id: string;
  patientId?: string;
  nationalId?: string;
  openmrsUuid?: string;
  name?: string;
  createdAt: string;
}

export interface PatientHistory {
  id: string;
  patientId: string;
  category: 'allergies' | 'medications' | 'conditions' | 'demographics' | 'other';
  details: string;
  recordedAt: string;
  createdAt: string;
}

export interface ClinicConfig {
  id: string;
  clinicId: string;
  name: string;
  alertThresholds?: {
    low?: number;
    high?: number;
  };
  featureToggles?: Record<string, boolean>;
  adminRoles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatus {
  id: string;
  patientId: string;
  status: string;
  details?: string;
  createdAt: string;
}

export interface IngestionResult {
  reading: GlucoseReading;
  created: boolean;
}

export interface AlertRecord {
  id: string;
  patientId: string;
  readingId?: string;
  type: 'low' | 'high';
  value: number;
  threshold?: number;
  status: 'open' | 'acknowledged';
  createdAt: string;
  acknowledgedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  actorType: 'patient' | 'system' | 'clinic';
  action: string;
  patientId?: string;
  readingId?: string;
  status: 'success' | 'failure';
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const store = {
  readings: [] as GlucoseReading[],
  patientLinks: [] as PatientLink[],
  patientHistory: [] as PatientHistory[],
  clinicConfigs: [] as ClinicConfig[],
  syncStatuses: [] as SyncStatus[],
  alerts: [] as AlertRecord[],
  auditLogs: [] as AuditLogRecord[],
};
