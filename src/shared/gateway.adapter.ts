import { config } from '../config/app.config';
import { GlucoseReading } from './store';

export interface GatewayReadingEvent {
  source: 'dmonitor';
  eventType: 'glucose_reading';
  patientId: string;
  readingId: string;
  timestamp: string;
  clientTimestamp?: string;
  offlineUploadId?: string;
  glucoseValue: number;
  units: 'mg/dL' | 'mmol/L';
  deviceId?: string;
  context?: GlucoseReading['context'];
}

export interface GatewayPublishResult {
  attempted: boolean;
  published: boolean;
  error?: string;
}

export function buildGatewayReadingEvent(reading: GlucoseReading): GatewayReadingEvent {
  return {
    source: 'dmonitor',
    eventType: 'glucose_reading',
    patientId: reading.patientId,
    readingId: reading.id,
    timestamp: reading.timestamp,
    clientTimestamp: reading.clientTimestamp,
    offlineUploadId: reading.offlineUploadId,
    glucoseValue: reading.glucoseValue,
    units: reading.units,
    deviceId: reading.deviceId,
    context: reading.context,
  };
}

export async function publishGatewayReadingEvent(reading: GlucoseReading): Promise<GatewayPublishResult> {
  if (!config.gatewayBaseUrl) {
    return { attempted: false, published: false };
  }

  const response = await fetch(`${config.gatewayBaseUrl.replace(/\/$/, '')}/events/readings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.gatewayApiKey ? { Authorization: `Bearer ${config.gatewayApiKey}` } : {}),
    },
    body: JSON.stringify(buildGatewayReadingEvent(reading)),
  });

  if (!response.ok) {
    const body = await response.text();
    return { attempted: true, published: false, error: `Gateway publish failed: ${response.status} ${body}` };
  }

  return { attempted: true, published: true };
}