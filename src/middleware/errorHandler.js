/**
 * @file src/middleware/errorHandler.js
 * @description Centralized Express error handling middleware.
 * Catches all unhandled errors and returns consistent JSON responses.
 */

const logger = require('../utils/logger');

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with request context
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `Duplicate value for ${field}`,
    });
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // OpenAI API errors
  if (err?.constructor?.name === 'APIError' || err?.type?.includes?.('openai')) {
    return res.status(502).json({
      success: false,
      error: 'AI service error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  // Custom application errors with statusCode
  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler — register before errorHandler for undefined routes.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Helper to create application errors with status codes.
 */
const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, notFoundHandler, createError };
