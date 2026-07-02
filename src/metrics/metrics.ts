import * as client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const openmrsCircuitOpen = new client.Gauge({
  name: 'openmrs_circuit_open',
  help: '1 when OpenMRS circuit is open',
  registers: [register],
});

export const openmrsCircuitOpenCount = new client.Counter({
  name: 'openmrs_circuit_open_count',
  help: 'Counts how many times the OpenMRS circuit has opened',
  registers: [register],
});

export async function metricsHandler() {
  return await register.metrics();
}

export function markCircuitOpen() {
  openmrsCircuitOpen.set(1);
  openmrsCircuitOpenCount.inc();
}

export function markCircuitClosed() {
  openmrsCircuitOpen.set(0);
}

export default register;
