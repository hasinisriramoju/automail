/**
 * @file src/utils/retryHelper.js
 * @description Retry utility with exponential backoff.
 * Used for resilient AI API calls and email sending.
 */

const logger = require('./logger');

/**
 * Execute an async function with retry and exponential backoff.
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options
 * @param {number} [options.maxAttempts=3] - Maximum number of attempts
 * @param {number} [options.baseDelayMs=1000] - Initial delay in ms
 * @param {number} [options.maxDelayMs=30000] - Max delay cap in ms
 * @param {string} [options.label='Operation'] - Log label for this operation
 * @param {Function} [options.shouldRetry] - Optional predicate: return false to skip retry
 * @returns {Promise<*>}
 */
const withRetry = async (fn, options = {}) => {
  const {
    maxAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    baseDelayMs = parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
    maxDelayMs = 60000,
    label = 'Operation',
    shouldRetry = () => true,
    getDelayMs = null,  // Optional: (attempt, err) => ms — overrides exponential backoff
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logger.info(`[Retry] ${label} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxAttempts;
      const shouldStop = !shouldRetry(error, attempt);

      if (isLastAttempt || shouldStop) {
        logger.error(`[Retry] ${label} failed after ${attempt} attempt(s): ${error.message}`);
        break;
      }

      // Use custom delay calculator if provided (e.g. for 429 retry-after), else exponential backoff
      let delay;
      if (getDelayMs) {
        delay = Math.min(getDelayMs(attempt, error), maxDelayMs);
      } else {
        const jitter = Math.random() * 500;
        delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1) + jitter, maxDelayMs);
      }

      logger.warn(
        `[Retry] ${label} attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { withRetry, sleep };
