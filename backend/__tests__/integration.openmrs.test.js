const http = require('http');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

jest.setTimeout(30000);

function startProcess(cmd, args, opts = {}) {
  const proc = spawn(cmd, args, { stdio: 'inherit', ...opts });
  return proc;
}

test('worker delivers reading to OpenMRS mock', async () => {
  // start mock OpenMRS
  let received = null;
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/ws/rest/v1/patient')) {
      // simulate search endpoint returning results array unless searching for ext-create
      const q = (req.url.split('?q=')[1] || '');
      const id = decodeURIComponent(q) || 'ext-123';
      if (id === 'ext-create') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results: [] }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results: [{ uuid: 'patient-uuid-1', display: id }] }));
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/ws/rest/v1/identifiertype')) {
      // return a fake identifier type if queried
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results: [{ uuid: 'idtype-1', display: 'UNKNOWN' }] }));
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/ws/rest/v1/patient')) {
      // simulate patient create
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        receivedCreate = JSON.parse(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ uuid: 'patient-uuid-created' }));
      });
      return;
    }

    if (req.method === 'POST' && req.url.includes('/Observation')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        received = JSON.parse(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'obs-1' }));
      });
      return;
    }

    res.writeHead(404); res.end();
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const OPENMRS_URL = `http://127.0.0.1:${port}`;

  // set env for subprocesses
  const env = Object.assign({}, process.env, {
    DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/dmonitor',
    REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    OPENMRS_URL
    ,OPENMRS_AUTO_CREATE: 'true'
  });

  // run migrations
  const migrate = startProcess('node', [path.join('scripts','migrate.js')], { env });
  await new Promise((res, rej) => migrate.on('close', (code) => code === 0 ? res() : rej(new Error('migrate failed'))));

  // start server and worker
  const serverProc = spawn('node', [path.join('src','index.js')], { env, stdio: ['ignore','pipe','pipe'] });
  const workerProc = spawn('node', [path.join('src','openmrs','worker.js')], { env, stdio: ['ignore','pipe','pipe'] });

  // wait briefly for processes to boot
  await new Promise((r) => setTimeout(r, 2000));

  // login to get token
  const base = process.env.BASE_URL || 'http://127.0.0.1:4002';
  const loginResp = await axios.post(`${base}/auth/login`, { email: 'int@test.local' }).catch(e => { throw e; });
  const token = loginResp.data && loginResp.data.token;
  expect(token).toBeTruthy();

  // post a reading
  // test auto-create path for ext-create (server returns empty search, then create)
  const reading = { patient_external_id: 'ext-create', value: 5.4, unit: 'mg/dL', type: 'glucose' };
  await axios.post(`${base}/api/v1/readings`, reading, { headers: { Authorization: `Bearer ${token}` } });

  // wait for worker to deliver
  const deadline = Date.now() + 10000;
  while (!received && Date.now() < deadline) await new Promise(r => setTimeout(r, 200));
  expect(received).toBeTruthy();
  expect(received.resourceType).toBe('Observation');
  expect(received.subject).toBeTruthy();
  // when auto-created, adapter should set subject.reference to created UUID
  expect(received.subject.reference).toBeTruthy();
  expect(received.subject.reference).toMatch(/Patient\//);

  // cleanup
  serverProc.kill();
  workerProc.kill();
  server.close();
});
