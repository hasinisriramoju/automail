/**
 * @file src/utils/authStore.js
 * @description In-memory auth token store using Node built-in crypto.
 * No external packages required.
 */

const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET ||
  'onitindia-automail-secret-2025-xK9mP2qR7n';

// In-memory store: token → { username, createdAt }
const tokenStore = new Map();

// Token TTL: 12 hours
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Generate a signed auth token.
 */
const generateToken = (username) => {
  const random = crypto.randomBytes(32).toString('hex');
  const payload = `${username}:${Date.now()}:${random}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const token = `${Buffer.from(payload).toString('base64url')}.${sig}`;
  tokenStore.set(token, { username, createdAt: Date.now() });
  return token;
};

/**
 * Verify a token is valid and not expired.
 */
const verifyToken = (token) => {
  if (!token || !tokenStore.has(token)) return false;
  const entry = tokenStore.get(token);
  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    tokenStore.delete(token);
    return false;
  }
  return true;
};

/**
 * Revoke a token (logout).
 */
const revokeToken = (token) => {
  tokenStore.delete(token);
};

/**
 * Extract Bearer token from Authorization header.
 */
const extractToken = (req) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  // Also check cookie as fallback
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/automail_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

module.exports = { generateToken, verifyToken, revokeToken, extractToken };
