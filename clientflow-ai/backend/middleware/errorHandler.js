/**
 * PROMPT 105 — Centralized Error Handling
 * Structured error classes, global handler, user-friendly messages, and logging.
 */

const logger = require('../services/loggerService');

// ─── Custom Error Classes ────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name      = 'AppError';
    this.statusCode = statusCode;
    this.code       = code;
    this.details    = details;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

// ─── Global Error Handler Middleware ────────────────────────────────────────

function errorHandler(err, req, res, _next) {
  // Determine status code
  let statusCode = err.statusCode || 500;
  let code       = err.code       || 'INTERNAL_ERROR';
  let message    = err.message    || 'An unexpected error occurred';

  // Map known Postgres errors
  if (err.code === '23505') { statusCode = 409; code = 'DUPLICATE_ENTRY';  message = 'A record with this value already exists.'; }
  if (err.code === '23503') { statusCode = 400; code = 'FOREIGN_KEY';      message = 'Referenced resource does not exist.'; }
  if (err.code === '23514') { statusCode = 400; code = 'CHECK_VIOLATION';  message = 'Invalid value for this field.'; }
  if (err.code === 'P0001') { statusCode = 403; code = 'CROSS_ORG_ACCESS'; message = 'Access denied: cross-organization data access is not allowed.'; }

  // Map JWT errors
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; code = 'INVALID_TOKEN';  message = 'Invalid authentication token.'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; code = 'TOKEN_EXPIRED';  message = 'Authentication token has expired.'; }

  // Log unexpected (non-operational) errors with full stack
  if (!err.isOperational) {
    logger.error('Unhandled error', {
      error:   err.message,
      stack:   err.stack,
      path:    req?.path,
      method:  req?.method,
      org_id:  req?.owner?.org_id,
      user_id: req?.owner?.user_id,
    });
  } else {
    logger.warn('Operational error', {
      code,
      message,
      path:   req?.path,
      org_id: req?.owner?.org_id,
    });
  }

  const response = {
    error:   message,
    code,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
}

/** Wraps an async route handler to forward errors to errorHandler */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = {
  AppError, ValidationError, AuthError, ForbiddenError,
  NotFoundError, ConflictError, RateLimitError, ExternalServiceError,
  errorHandler, asyncHandler,
};
