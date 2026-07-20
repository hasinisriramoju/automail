/**
 * @file src/middleware/requireAuth.js
 * @description Middleware that protects API routes with token auth.
 */

const { verifyToken, extractToken } = require('../utils/authStore');

const requireAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Please log in.',
      redirect: '/login',
    });
  }
  next();
};

module.exports = requireAuth;
