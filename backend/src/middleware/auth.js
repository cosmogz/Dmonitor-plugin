const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'change-me';

exports.required = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
};

exports.optional = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return next();
  try {
    req.user = jwt.verify(token, secret);
  } catch (err) {
    // ignore
  }
  next();
};
