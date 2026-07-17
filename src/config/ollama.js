/**
 * @file src/config/ollama.js
 * @description Local Ollama API client connection.
 * Ollama provides an OpenAI-compatible local server at http://localhost:11434/v1.
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');

let _client = null;

/**
 * Get the singleton Ollama client.
 */
const getOllamaClient = () => {
  if (_client) return _client;

  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const apiKey = process.env.OLLAMA_API_KEY || 'ollama-local-key';
  
  _client = new OpenAI({
    baseURL,
    apiKey,
  });

  logger.info(`[Ollama] Client initialized pointing to: ${baseURL}`);
  return _client;
};

/**
 * Default local model (e.g. llama3, mistral).
 */
const getModel = () => process.env.OLLAMA_MODEL || 'llama3';

module.exports = { getOllamaClient, getModel };
