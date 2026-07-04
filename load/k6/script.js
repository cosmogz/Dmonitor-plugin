import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const url = __ENV.TARGET_URL || 'http://localhost:3000/api/v1/readings';
  const payload = JSON.stringify({ value: Math.random()*200, timestamp: new Date().toISOString(), patient_id: 1, client_id: Math.random().toString(36).slice(2) });
  const params = { headers: { 'Content-Type': 'application/json' } };
  http.post(url, payload, params);
  sleep(1);
}
