/**
 * Twilio SMS delivery adapter.
 *
 * Required env vars (production):
 *   TWILIO_ACCOUNT_SID   - Twilio Account SID (starts with AC…)
 *   TWILIO_AUTH_TOKEN    - Twilio Auth Token
 *   TWILIO_FROM_NUMBER   - E.164 source number or messaging service SID
 *
 * When TWILIO_STUB=true (or NODE_ENV=test) the send is stubbed and a resolved
 * promise is returned so tests run without real credentials.
 */

/**
 * Send an SMS message via Twilio.
 * @param {string} to      - E.164 recipient phone number e.g. "+15551234567"
 * @param {string} body    - Message text (≤ 160 chars recommended)
 * @returns {Promise<{sid: string}>}
 */
async function sendSms(to, body) {
  const isStub = process.env.TWILIO_STUB === 'true' || process.env.NODE_ENV === 'test';

  if (isStub) {
    // In test/stub mode, log and return a fake SID
    console.log(`[sms-stub] to=${to} body=${body}`);
    return { sid: `STUB_${Date.now()}` };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)');
  }

  // Lazy-require twilio so the module loads cleanly even when twilio is not
  // installed (in environments that only run tests).
  let twilio;
  try {
    twilio = require('twilio');
  } catch (e) {
    throw new Error('twilio package not installed — run: npm install twilio');
  }

  const client = twilio(accountSid, authToken);
  const msg = await client.messages.create({ to, from, body });
  return { sid: msg.sid };
}

module.exports = { sendSms };
