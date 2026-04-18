// ─── Global Express Error Handler ────────────────────────────────────────────
// Mount LAST in server.js: app.use(errorHandler)

module.exports = function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log all 5xx errors server-side
  if (status >= 500) {
    console.error('[Error]', {
      method: req.method,
      url: req.originalUrl,
      status,
      message: err.message,
      stack: isProduction ? undefined : err.stack,
    });
  }

  res.status(status).json({
    error: {
      message: isProduction && status === 500 ? 'Internal server error' : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
};
