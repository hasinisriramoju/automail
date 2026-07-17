/**
 * @file src/config/mailer.js
 * @description Nodemailer transporter factory.
 * Supports multiple SMTP configurations for future multi-provider support.
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Create and return a verified Nodemailer transporter.
 * Uses environment variables by default. Pass an override config
 * object for campaign-specific SMTP providers (future multi-provider support).
 *
 * @param {Object} [overrideConfig] - Optional SMTP override config
 * @returns {Promise<nodemailer.Transporter>}
 */
const createTransporter = async (overrideConfig = null) => {
  const config = overrideConfig || {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Connection pool for bulk sending
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Retry on transient errors
    greetingTimeout: 30000,
    socketTimeout: 60000,
  };

  const transporter = nodemailer.createTransport(config);

  // Verify connection on creation
  try {
    await transporter.verify();
    logger.info('[Mailer] SMTP connection verified successfully');
  } catch (err) {
    logger.error(`[Mailer] SMTP verification failed: ${err.message}`);
    throw err;
  }

  return transporter;
};

/**
 * Lazy singleton transporter for single-send operations.
 */
let _transporter = null;

const getTransporter = async () => {
  if (!_transporter) {
    _transporter = await createTransporter();
  }
  return _transporter;
};

/**
 * Reset the singleton (useful for tests or config changes).
 */
const resetTransporter = () => {
  _transporter = null;
};

module.exports = { createTransporter, getTransporter, resetTransporter };
