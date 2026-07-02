export interface ReadingPayload {
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
}

export function validateReadingPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return errors;
  }

  const body = payload as Partial<ReadingPayload>;
  if (!body.patientId || typeof body.patientId !== 'string') {
    errors.push('patientId is required and must be a string');
  }
  if (!body.timestamp || typeof body.timestamp !== 'string' || Number.isNaN(Date.parse(body.timestamp))) {
    errors.push('timestamp is required and must be a valid ISO timestamp');
  }
  if (typeof body.glucoseValue !== 'number') {
    errors.push('glucoseValue is required and must be a number');
  }
  if (body.units !== 'mg/dL' && body.units !== 'mmol/L') {
    errors.push('units is required and must be either mg/dL or mmol/L');
  }

  if (body.context) {
    if (body.context.mealType && !['pre-meal', 'post-meal', 'fasting', 'random'].includes(body.context.mealType)) {
      errors.push('context.mealType must be one of pre-meal, post-meal, fasting, random');
    }
    if (body.context.insulinDoseMg !== undefined && typeof body.context.insulinDoseMg !== 'number') {
      errors.push('context.insulinDoseMg must be a number');
    }
    if (body.context.exerciseMinutes !== undefined && typeof body.context.exerciseMinutes !== 'number') {
      errors.push('context.exerciseMinutes must be a number');
    }
    if (body.context.symptoms && !Array.isArray(body.context.symptoms)) {
      errors.push('context.symptoms must be an array of strings');
    }
  }

  return errors;
}
