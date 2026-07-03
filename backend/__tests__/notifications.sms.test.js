process.env.NODE_ENV = 'test'; // activates stub mode in sms.js

const { sendSms } = require('../src/notifications/sms');

describe('SMS adapter (stub mode)', () => {
  test('returns a stub SID without calling Twilio', async () => {
    const result = await sendSms('+15551234567', 'Test message');
    expect(result).toHaveProperty('sid');
    expect(result.sid).toMatch(/^STUB_/);
  });

  test('accepts any to/body without throwing', async () => {
    await expect(sendSms('+12025550100', 'Alert: glucose low')).resolves.not.toThrow();
  });
});

describe('SMS adapter (TWILIO_STUB=true)', () => {
  const orig = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.TWILIO_STUB = 'true';
  });
  afterAll(() => {
    process.env.NODE_ENV = orig;
    delete process.env.TWILIO_STUB;
  });

  test('TWILIO_STUB=true bypasses real credentials', async () => {
    const result = await sendSms('+15559876543', 'Stub test');
    expect(result.sid).toMatch(/^STUB_/);
  });
});
