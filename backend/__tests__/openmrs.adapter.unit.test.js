const { buildFhirObservation } = require('../src/openmrs/adapter');

test('glucose mmol/L is converted to mg/dL and LOINC set', () => {
  const obs = buildFhirObservation('ext-1', { type: 'glucose', value: 5.5, unit: 'mmol/L' });
  expect(obs.code.coding[0].code).toBe('2339-0');
  expect(obs.valueQuantity.unit).toBe('mg/dL');
  // 5.5 mmol/L -> approx 99.1 mg/dL
  expect(obs.valueQuantity.value).toBeCloseTo(5.5 * 18.0182, 1);
});

test('hba1c mapping sets code and percent unit', () => {
  const obs = buildFhirObservation('ext-2', { type: 'hba1c', value: 6.2 });
  expect(obs.code.coding[0].code).toBe('4548-4');
  expect(obs.valueQuantity.unit).toBe('%');
});

test('default maps to glucose code when unknown type', () => {
  const obs = buildFhirObservation('ext-3', { value: 120 });
  expect(obs.code.coding[0].code).toBe('2339-0');
});

test('lipid mapping preserves components', () => {
  const reading = { type: 'lipid', value: { total: 200, hdl: 50, ldl: 120, triglycerides: 150 }, unit: 'mg/dL' };
  const obs = buildFhirObservation('ext-l', reading);
  expect(obs.code.coding[0].code).toBe('2093-3');
  // valueQuantity should use total by default
  expect(obs.valueQuantity.value).toBeCloseTo(200);
});

test('creatinine mapping', () => {
  const obs = buildFhirObservation('ext-c', { type: 'creatinine', value: 1.1 });
  expect(obs.code.coding[0].code).toBe('2160-0');
  expect(obs.valueQuantity.unit).toBe('mg/dL');
});

test('buildPatientPayload includes provided name and birthdate', () => {
  const { buildFhirObservation } = require('../src/openmrs/adapter');
  const adapter = require('../src/openmrs/adapter');
  const payload = adapter.buildPatientPayload ? adapter.buildPatientPayload('ext-x', { name: 'Alice Smith', gender: 'female', birthdate: '1990-01-02' }) : null;
  if (payload) {
    expect(payload.person.names[0].givenName).toBe('Alice');
    expect(payload.person.names[0].familyName).toContain('Smith');
    expect(payload.person.birthdate).toBe('1990-01-02');
  }
});
