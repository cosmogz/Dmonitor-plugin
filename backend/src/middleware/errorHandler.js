// Centralized error handler — must be registered last with 4 args so Express treats it as error middleware
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? (err.message || 'bad request') : 'internal server error';
  if (status >= 500) {
    const logger = req.log || console;
    logger.error({ err, reqId: req.id }, 'unhandled error');
  }
  res.status(status).json({ error: message });
};
