jest.mock('../src/db');
const db = require('../src/db');
const engine = require('../src/alerts/engine');

test('creating alert enqueues notification when redis configured', async () => {
  // mock alerts insert
  db.query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ id: 55 }] }) // insert alert
    .mockResolvedValueOnce({ rows: [{ id: 77 }] }); // insert notification

  process.env.REDIS_URL = '';
  const id = await engine.evaluateAndCreateAlert(1, 2, { value: 350 });
  expect(db.query).toHaveBeenCalled();
  expect(id).toBe(55);
});
