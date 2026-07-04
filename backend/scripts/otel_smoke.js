#!/usr/bin/env node
require('dotenv').config();
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const api = require('@opentelemetry/api');

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const exporter = new OTLPTraceExporter({ url: endpoint });

const sdk = new NodeSDK({
  traceExporter: exporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

(async () => {
  try {
    await sdk.start();
    const tracer = api.trace.getTracer('dmonitor-otel-smoke');
    const span = tracer.startSpan('smoke-test-span');
    span.setAttribute('smoke', true);
    span.end();
    console.log('Created smoke span, waiting for export...');
    await new Promise((r) => setTimeout(r, 1000));
    await sdk.shutdown();
    console.log('OTEL smoke succeeded');
    process.exit(0);
  } catch (e) {
    console.error('OTEL smoke failed', e);
    try { await sdk.shutdown(); } catch (__) {}
    process.exit(2);
  }
})();
