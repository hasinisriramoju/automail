/**
 * @file src/routes/auth.js
 * @description Login / logout / check routes.
 */

const express = require('express');
const router = express.Router();
const { generateToken, verifyToken, revokeToken, extractToken } = require('../utils/authStore');
const logger = require('../utils/logger');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'onitindia';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AutoMail@2025';

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required.' });
  }

  if (username.trim() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    logger.warn(`[Auth] Failed login attempt for username: "${username}"`);
    return res.status(401).json({ success: false, error: 'Invalid username or password.' });
  }

  const token = generateToken(username);
  logger.info(`[Auth] Successful login for: ${username}`);

  // Set as HTTP-only cookie too (12h)
  res.cookie('automail_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
  });

  res.json({ success: true, token });
});

/**
 * GET /api/auth/check
 * Returns { authenticated: true/false }
 */
router.get('/check', (req, res) => {
  const token = extractToken(req);
  const authenticated = verifyToken(token);
  if (authenticated) {
    return res.json({ success: true, authenticated: true });
  }
  res.status(401).json({ success: false, authenticated: false });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  const token = extractToken(req);
  if (token) revokeToken(token);
  res.clearCookie('automail_token');
  logger.info('[Auth] User logged out.');
  res.json({ success: true });
});

module.exports = router;
