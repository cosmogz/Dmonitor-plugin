#!/usr/bin/env node
const http = require('http');
const { generateKeyPairSync, createPublicKey } = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.MOCK_JWKS_PORT || 4000;
const KEY_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true });

// generate an RSA key pair
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

// export public key as JWK
const pubKeyObj = createPublicKey(publicKey);
const jwk = pubKeyObj.export({ format: 'jwk' });
// ensure kid
const kid = jwk.kid || 'dmonitor-key-1';
const jwkWithKid = Object.assign({}, jwk, { kid, alg: 'RS256', use: 'sig' });
const jwks = { keys: [jwkWithKid] };

// write private key path for token generator
fs.writeFileSync(path.join(KEY_DIR, 'private.pem'), privateKey);
fs.writeFileSync(path.join(KEY_DIR, 'jwks.json'), JSON.stringify(jwks, null, 2));

const server = http.createServer((req, res) => {
  if (req.url === '/.well-known/jwks.json' || req.url === '/jwks.json') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(jwks));
    return;
  }
  res.statusCode = 404;
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`JWKS mock server running on http://localhost:${PORT}`);
  console.log(`JWKS URI: http://localhost:${PORT}/.well-known/jwks.json`);
  console.log(`Private key written to ${path.join(KEY_DIR, 'private.pem')}`);
});

// keep process alive
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
