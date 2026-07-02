import { validateReadingBatchPayload, validateReadingPayload } from '../modules/readings/reading.validators';

describe('validateReadingPayload', () => {
  it('accepts a valid payload', () => {
    const payload = {
      patientId: 'p1',
      timestamp: new Date().toISOString(),
      glucoseValue: 120,
      units: 'mg/dL'
    };
    const errors = validateReadingPayload(payload);
    expect(errors).toHaveLength(0);
  });

  it('rejects missing patientId', () => {
    const payload = {
      timestamp: new Date().toISOString(),
      glucoseValue: 120,
      units: 'mg/dL'
    } as any;
    const errors = validateReadingPayload(payload);
    expect(errors).toContain('patientId is required and must be a string');
  });

  it('rejects invalid timestamp', () => {
    const payload = {
      patientId: 'p1',
      timestamp: 'not-a-date',
      glucoseValue: 120,
      units: 'mg/dL'
    } as any;
    const errors = validateReadingPayload(payload);
    expect(errors).toContain('timestamp is required and must be a valid ISO timestamp');
  });

  it('accepts a valid batch payload', () => {
    const payload = {
      readings: [
        {
          patientId: 'p1',
          timestamp: new Date().toISOString(),
          glucoseValue: 120,
          units: 'mg/dL',
        },
        {
          patientId: 'p2',
          timestamp: new Date().toISOString(),
          glucoseValue: 6.2,
          units: 'mmol/L',
        },
      ],
    };

    const errors = validateReadingBatchPayload(payload);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid batch payloads', () => {
    const payload = {
      readings: [
        {
          patientId: 'p1',
          timestamp: 'bad-time',
          glucoseValue: 120,
          units: 'mg/dL',
        },
      ],
    } as any;

    const errors = validateReadingBatchPayload(payload);
    expect(errors).toContain('readings[0].timestamp is required and must be a valid ISO timestamp');
  });

  it('accepts offline sync metadata', () => {
    const payload = {
      patientId: 'p1',
      clinicId: 'clinic-1',
      timestamp: new Date().toISOString(),
      clientTimestamp: new Date().toISOString(),
      offlineUploadId: 'upload-123',
      glucoseValue: 120,
      units: 'mg/dL',
    };

    const errors = validateReadingPayload(payload);
    expect(errors).toHaveLength(0);
  });
});
