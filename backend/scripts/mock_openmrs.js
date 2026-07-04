const http = require('http');

let lastObs = null;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/ws/rest/v1/patient')) {
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ results: [{ uuid: 'idtype-1', display: 'UNKNOWN' }] }));
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/ws/rest/v1/patient')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ uuid: 'patient-uuid-created' }));
    });
    return;
  }

  if (req.method === 'POST' && req.url.includes('/Observation')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        lastObs = JSON.parse(body);
        console.log('Mock OpenMRS received observation:', JSON.stringify(lastObs).slice(0,200));
      } catch (e) { console.log('Mock OpenMRS received non-json obs'); }
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 'obs-1' }));
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/_last') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(lastObs || null));
    return;
  }

  res.writeHead(404); res.end();
});

const port = process.env.PORT || 5000;
server.listen(port, '127.0.0.1', () => console.log('Mock OpenMRS listening on', port));

process.on('SIGINT', () => process.exit(0));
