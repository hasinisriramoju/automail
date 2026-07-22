/**
 * @file src/app.js
 * @description Express application factory.
 * Sets up all middleware, routes, and error handlers.
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route modules
const recipientRoutes = require('./routes/recipients');
const emailRoutes    = require('./routes/emails');
const campaignRoutes = require('./routes/campaigns');
const templateRoutes = require('./routes/templates');
const profileRoutes  = require('./routes/profile');
const authRoutes     = require('./routes/auth');
const requireAuth    = require('./middleware/requireAuth');
const { verifyToken, extractToken } = require('./utils/authStore');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Logging ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// ─── General Rate Limiting ────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OnIT India — AI Email Outreach Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Page Routes (MUST be before express.static so '/' serves landing, not index.html) ───
// Root route — redirect to dashboard if authenticated, else serve login page
app.get('/', (req, res) => {
  const token = extractToken(req);
  if (verifyToken(token)) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// App dashboard — redirect to /login if not authenticated
app.get('/dashboard', (req, res) => {
  const token = extractToken(req);
  if (!verifyToken(token)) {
    return res.redirect('/login?next=/dashboard');
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// ─── API Routes ───────────────────────────────────────────────────────────────
// Auth (public — no token required)
app.use('/api/auth', authRoutes);

// All other API routes require authentication
app.use('/api/recipients', requireAuth, recipientRoutes);
app.use('/api/emails',     requireAuth, emailRoutes);
app.use('/api/campaigns',  requireAuth, campaignRoutes);
app.use('/api/templates',  requireAuth, templateRoutes);
app.use('/api/profile',    requireAuth, profileRoutes);

// ─── 404 & Error Handlers (MUST be last) ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
