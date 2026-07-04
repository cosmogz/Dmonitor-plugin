const request = require('supertest');
process.env.JWT_SECRET = 'testsecret';

jest.mock('../src/analytics/compliance');
const compliance = require('../src/analytics/compliance');
// set mock implementation before loading the app so routes pick it up
compliance.evaluateAndAlertCompliance = jest.fn().mockResolvedValue({
  compliance: { score: 40, actual: 10, expected: 20, windowDays: 7 },
  trends: { count: 10 },
  createdAlerts: [101]
});
const app = require('../src/app');

describe('patient compliance endpoint', () => {
  test('GET /api/v1/patients/:id/compliance returns compliance object and createdAlerts', async () => {
    const res = await request(app).get('/api/v1/patients/12/compliance');
    // debug output when tests fail
    console.log('RES.TEXT:', res.text);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('compliance');
    expect(res.body.compliance.score).toBe(40);
    expect(res.body.createdAlerts).toEqual([101]);
  });
});
