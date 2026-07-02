import { validateReadingPayload } from '../modules/readings/reading.validators';

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
});
