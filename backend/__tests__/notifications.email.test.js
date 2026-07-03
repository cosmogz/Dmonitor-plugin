jest.mock('nodemailer');
const nodemailer = require('nodemailer');

process.env.SMTP_URL = 'smtp://user:pass@smtp.example';
process.env.NOTIFICATION_DEFAULT_EMAIL = 'test@example.com';

const { deliverEmail } = require('../src/notifications/worker');

test('deliverEmail sends mail via nodemailer', async () => {
  const sendMail = jest.fn().mockResolvedValueOnce({ messageId: 'm1' });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  const res = await deliverEmail({ id: 1 }, { rule: { type: 'hypoglycemia', message: 'low' } });
  expect(sendMail).toHaveBeenCalled();
  expect(res).toBeTruthy();
});

test('deliverEmail throws when SMTP not configured', async () => {
  const old = process.env.SMTP_URL;
  delete process.env.SMTP_URL;
  jest.resetModules();
  const worker = require('../src/notifications/worker');
  await expect(worker.deliverEmail({ id: 1 }, { rule: {} })).rejects.toThrow('no SMTP configured');
  process.env.SMTP_URL = old;
});
