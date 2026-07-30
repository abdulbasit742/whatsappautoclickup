const logger = require('../shared/utils/logger');

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    logger.error('Unhandled error', {
      message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      orgId: req.user?.org_id,
    });
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
