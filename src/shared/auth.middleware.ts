import { Request, Response, NextFunction } from 'express';
import jwksRsa from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const jwksUri = process.env.JWKS_URI;
const issuer = process.env.JWT_ISSUER;
const audience = process.env.JWT_AUDIENCE;
const jwtSecret = process.env.JWT_SECRET;

const jwksClient = jwksUri ? jwksRsa({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri,
}) : null;

function unauthorized(res: Response, msg = 'Authorization header missing or invalid') {
  return res.status(401).json({ error: msg });
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return unauthorized(res);

  const token = authHeader.replace('Bearer ', '').trim();

  if (jwksClient && issuer && audience) {
    // RS256 via JWKS
    const decoded: any = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;
    if (!kid) return res.status(403).json({ error: 'Token missing kid' });

    try {
      const key = await jwksClient.getSigningKey(kid);
      const pub = key.getPublicKey();
      const payload = jwt.verify(token, pub, { algorithms: ['RS256'], issuer, audience });
      (req as any).auth = payload;
      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  }

  if (jwtSecret) {
    try {
      const payload = jwt.verify(token, jwtSecret as string);
      (req as any).auth = payload;
      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  }

  return res.status(401).json({ error: 'No authentication configured on server' });
}
