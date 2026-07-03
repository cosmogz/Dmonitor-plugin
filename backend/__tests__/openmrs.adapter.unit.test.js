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
