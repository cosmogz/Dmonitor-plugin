const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

// Must set env before requiring worker (env captured at function-call time already, but set early anyway)
jest.setTimeout(15000);

let server;
let receivedMessages = [];

beforeAll(() => {
  return new Promise((resolve, reject) => {
    server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onData(stream, session, callback) {
        let raw = '';
        stream.on('data', (chunk) => { raw += chunk.toString(); });
        stream.on('end', async () => {
          try {
            const parsed = await simpleParser(raw);
            receivedMessages.push(parsed);
          } catch (e) {
            // ignore parse errors in tests
          }
          callback();
        });
      },
    });

    server.listen(0, '127.0.0.1', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
});

afterAll(() => {
  return new Promise((resolve) => server.close(resolve));
});

beforeEach(() => { receivedMessages = []; });

test('deliverEmail sends email through local SMTP server', async () => {
  const port = server.server.address().port;
  process.env.SMTP_URL = `smtp://127.0.0.1:${port}`;
  process.env.NOTIFICATION_DEFAULT_EMAIL = 'patient@example.com';
  process.env.NOTIFICATION_FROM = 'alerts@dmonitor.local';
  process.env.NODE_ENV = 'test';

  // Re-require to pick up fresh env values
  jest.resetModules();
  const { deliverEmail } = require('../src/notifications/worker');

  const notification = { id: 1, to: 'patient@example.com' };
  const payload = { rule: { type: 'hypoglycemia', message: 'Glucose low: 60 mg/dL' } };

  await deliverEmail(notification, payload);

  // Allow SMTP server to process the message
  const deadline = Date.now() + 3000;
  while (receivedMessages.length === 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }

  expect(receivedMessages.length).toBeGreaterThan(0);
  const msg = receivedMessages[0];
  expect(msg.subject).toMatch(/hypoglycemia/);
  expect(msg.text).toMatch(/Glucose low/);
  expect(msg.to.text).toContain('patient@example.com');
});

test('deliverEmail throws when no recipient configured', async () => {
  const port = server.server.address().port;
  process.env.SMTP_URL = `smtp://127.0.0.1:${port}`;
  delete process.env.NOTIFICATION_DEFAULT_EMAIL;
  process.env.NODE_ENV = 'test';

  jest.resetModules();
  const { deliverEmail } = require('../src/notifications/worker');

  // notification has no .to field
  await expect(deliverEmail({ id: 2 }, { rule: { type: 'test', message: 'msg' } }))
    .rejects.toThrow('no recipient email configured');
});
