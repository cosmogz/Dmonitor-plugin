const { randomUUID } = require('crypto');

// Attaches a unique X-Request-Id to every request for correlation
module.exports = (req, res, next) => {
  const id = req.headers['x-request-id'] || randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
