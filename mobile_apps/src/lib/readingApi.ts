export type ReadingContext = {
  mealType?: 'pre-meal' | 'post-meal' | 'fasting' | 'random';
  insulinDoseMg?: number;
  symptoms?: string[];
  exerciseMinutes?: number;
  notes?: string;
};

export type ReadingSubmission = {
  patientId: string;
  clinicId?: string;
  timestamp: string;
  clientTimestamp?: string;
  offlineUploadId?: string;
  glucoseValue: number;
  units: 'mg/dL' | 'mmol/L';
  deviceId?: string;
  context?: ReadingContext;
};

export type ReadingSubmissionResponse = {
  message: string;
  created: boolean;
  conflict: boolean;
};

export type ReadingSubmitResult = {
  response?: ReadingSubmissionResponse;
  queued?: boolean;
  errorMessage?: string;
};

export function buildReadingSubmission(input: {
  patientId: string;
  glucoseValue: string;
  units: 'mg/dL' | 'mmol/L';
  notes?: string;
}) : ReadingSubmission {
  const now = new Date().toISOString();

  return {
    patientId: input.patientId.trim(),
    timestamp: now,
    clientTimestamp: now,
    offlineUploadId: `mobile-${Date.now()}`,
    glucoseValue: Number(input.glucoseValue),
    units: input.units,
    deviceId: 'dmonitor-mobile-demo',
    context: input.notes?.trim()
      ? {
          mealType: 'random',
          notes: input.notes.trim(),
        }
      : undefined,
  };
}
