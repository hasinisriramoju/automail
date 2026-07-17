/**
 * @file src/config/openai.js
 * @description OpenAI client initialization.
 * Centralizes AI client creation so swapping providers is a single-file change.
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');

let _client = null;

/**
 * Get the singleton OpenAI client.
 * @returns {OpenAI}
 */
const getOpenAIClient = () => {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined in environment variables');
  }

  _client = new OpenAI({ apiKey });
  logger.info('[OpenAI] Client initialized');
  return _client;
};

/**
 * Default model from environment or fallback.
 */
const getModel = () => process.env.OPENAI_MODEL || 'gpt-4o';

module.exports = { getOpenAIClient, getModel };
