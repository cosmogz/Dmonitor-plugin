process.env.GATEWAY_BASE_URL = 'http://gateway.test';
process.env.GATEWAY_API_KEY = 'gateway-key';

import { buildGatewayReadingEvent, publishGatewayReadingEvent } from '../shared/gateway.adapter';
import { GlucoseReading } from '../shared/store';

describe('Gateway adapter', () => {
  afterEach(() => {
    // @ts-ignore
    if (global.fetch && (global.fetch as any).mockRestore) (global.fetch as any).mockRestore();
  });

  it('maps a reading to a gateway event payload', () => {
    const reading: GlucoseReading = {
      id: 'r-1',
      patientId: 'p-1',
      timestamp: '2026-07-02T10:00:00.000Z',
      clientTimestamp: '2026-07-02T09:59:00.000Z',
      offlineUploadId: 'upload-1',
      glucoseValue: 120,
      units: 'mg/dL',
      deviceId: 'device-1',
      context: { notes: 'gateway test' },
      createdAt: '2026-07-02T10:00:01.000Z',
    };

    expect(buildGatewayReadingEvent(reading)).toMatchObject({
      source: 'dmonitor',
      eventType: 'glucose_reading',
      patientId: 'p-1',
      readingId: 'r-1',
      offlineUploadId: 'upload-1',
      glucoseValue: 120,
      units: 'mg/dL',
    });
  });

  it('publishes a reading event when gateway is configured', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'ok',
    });

    const reading: GlucoseReading = {
      id: 'r-2',
      patientId: 'p-2',
      timestamp: '2026-07-02T10:00:00.000Z',
      glucoseValue: 130,
      units: 'mg/dL',
      createdAt: '2026-07-02T10:00:01.000Z',
    };

    const result = await publishGatewayReadingEvent(reading);

    expect(result).toEqual({ attempted: true, published: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://gateway.test/events/readings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer gateway-key' }),
      }),
    );
  });
});