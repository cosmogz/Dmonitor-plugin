#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const KEY_DIR = path.join(__dirname, '..', 'tmp');
const privPath = path.join(KEY_DIR, 'private.pem');
if (!fs.existsSync(privPath)) {
  console.error('Private key not found. Start mock-jwks-server first.');
  process.exit(2);
}

const privateKey = fs.readFileSync(privPath, 'utf8');
const issuer = process.env.JWT_ISSUER || 'http://auth.test/';
const audience = process.env.JWT_AUDIENCE || 'dmonitor-service';

const payload = {
  sub: 'test-user',
  scope: 'read:alerts write:readings',
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '1h',
  issuer,
  audience,
  keyid: 'dmonitor-key-1',
});

console.log(token);
