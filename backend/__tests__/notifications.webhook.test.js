jest.mock('axios');
const axios = require('axios');

process.env.NOTIFICATION_WEBHOOK_URL = 'http://example.local/hook';
const { deliverWebhook, backoffSeconds } = require('../src/notifications/worker');

test('deliverWebhook posts to configured URL and returns true on 2xx', async () => {
  axios.post.mockResolvedValueOnce({ status: 200 });
  const ok = await deliverWebhook({ id: 1 }, { foo: 'bar' });
  expect(ok).toBe(true);
  expect(axios.post).toHaveBeenCalledWith(process.env.NOTIFICATION_WEBHOOK_URL, expect.any(Object), expect.any(Object));
});

test('deliverWebhook throws when no webhook configured', async () => {
  const original = process.env.NOTIFICATION_WEBHOOK_URL;
  delete process.env.NOTIFICATION_WEBHOOK_URL;
  // re-require function from fresh module to reflect env change
  jest.resetModules();
  const worker = require('../src/notifications/worker');
  await expect(worker.deliverWebhook({ id: 1 }, {})).rejects.toThrow('no webhook configured');
  process.env.NOTIFICATION_WEBHOOK_URL = original;
});

test('backoffSeconds grows exponentially', () => {
  expect(backoffSeconds(1)).toBeGreaterThanOrEqual(1);
  expect(backoffSeconds(2)).toBe(backoffSeconds(1) * 2);
});
