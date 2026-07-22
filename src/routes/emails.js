/**
 * @file src/routes/emails.js
 */

const express = require('express');
const router = express.Router();
const {
  generate,
  saveDraft,
  getEmails,
  getEmail,
  updateEmail,
  send,
  schedule,
  deleteEmail,
  generateFollowUp,
  getStats,
  trackOpen,
} = require('../controllers/emailController');
const { validate, schemas } = require('../middleware/validateRequest');
const { aiGenerateLimiter, emailSendLimiter } = require('../middleware/rateLimiter');

// Stats (before /:id to avoid route conflict)
router.get('/stats', getStats);

// Generate AI email draft
router.post('/generate', aiGenerateLimiter, validate(schemas.generateEmail), generate);

// Save pre-built draft (poster, custom HTML) — no AI generation, no rate limit
router.post('/save-draft', saveDraft);


// CRUD
router.get('/', getEmails);
router.get('/:id', getEmail);
router.put('/:id', validate(schemas.updateEmail), updateEmail);
router.delete('/:id', deleteEmail);

// Send & Schedule
router.post('/:id/send', emailSendLimiter, send);
router.post('/:id/schedule', validate(schemas.scheduleEmail), schedule);

// Follow-up
router.post('/:id/followup', aiGenerateLimiter, generateFollowUp);

// Open tracking pixel (no auth, no rate limit — must be lightweight)
router.get('/track/open/:id', trackOpen);

module.exports = router;
