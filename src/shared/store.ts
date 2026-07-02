export interface GlucoseReading {
  id: string;
  patientId: string;
  timestamp: string;
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

export interface SyncStatus {
  id: string;
  patientId: string;
  status: string;
  details?: string;
  createdAt: string;
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

export const store = {
  readings: [] as GlucoseReading[],
  patientLinks: [] as PatientLink[],
  syncStatuses: [] as SyncStatus[],
  alerts: [] as AlertRecord[],
};
