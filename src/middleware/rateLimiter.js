/**
 * @file src/middleware/rateLimiter.js
 * @description Rate limiting middleware for AI generation and email send endpoints.
 * Protects against accidental bulk calls and abuse.
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: message },
    handler: (req, res, next, options) => {
      logger.warn(`[RateLimit] ${req.ip} exceeded limit on ${req.path}`);
      res.status(429).json(options.message);
    },
  });

// 30 AI generations per 15 minutes per IP
const aiGenerateLimiter = createLimiter(
  15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_AI || '30', 10),
  'Too many email generation requests. Please wait before generating more.'
);

// 20 email sends per 15 minutes per IP
const emailSendLimiter = createLimiter(
  15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_SEND || '20', 10),
  'Too many send requests. Please wait before sending more emails.'
);

// General API limiter — 200 requests per 15 minutes
const generalLimiter = createLimiter(
  15 * 60 * 1000,
  200,
  'Too many requests. Please slow down.'
);

module.exports = { aiGenerateLimiter, emailSendLimiter, generalLimiter };
