const jwt = require('jsonwebtoken');

const getSecret = () => process.env.JWT_SECRET || 'change-me';

exports.required = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, getSecret());
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
    req.user = jwt.verify(token, getSecret());
  } catch (err) {
    // ignore
  }
  next();
};
