jest.mock('../src/db');
const db = require('../src/db');
const engine = require('../src/alerts/engine');

test('classifyGlucose returns critical for very low', () => {
  const r = engine.classifyGlucose(40);
  expect(r).toBeTruthy();
  expect(r.type).toBe('severe_hypoglycemia');
});

test('evaluateAndCreateAlert inserts into DB when threshold exceeded', async () => {
  db.query = jest.fn().mockResolvedValue({ rows: [{ id: 123 }] });
  const id = await engine.evaluateAndCreateAlert(1, 2, { value: 320 });
  expect(db.query).toHaveBeenCalled();
  expect(id).toBe(123);
});
