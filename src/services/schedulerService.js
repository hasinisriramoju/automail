/**
 * @file src/services/schedulerService.js
 * @description Background scheduler for timed email sends and follow-ups.
 * Uses node-cron to run checks every minute.
 */

const cron = require('node-cron');
const Email = require('../models/Email');
const { sendEmail } = require('./emailService');
const logger = require('../utils/logger');

let _schedulerTask = null;

/**
 * Start the email scheduler.
 * Runs every minute and sends any emails whose scheduledAt time has passed.
 */
const startScheduler = () => {
  if (_schedulerTask) {
    logger.warn('[Scheduler] Already running');
    return;
  }

  logger.info('[Scheduler] Starting email scheduler (every minute)');

  // Run every minute: "* * * * *"
  _schedulerTask = cron.schedule('* * * * *', async () => {
    await processScheduledEmails();
  });

  logger.info('[Scheduler] ✓ Email scheduler is active');
};

/**
 * Process all emails that are due to be sent.
 */
const processScheduledEmails = async () => {
  try {
    const now = new Date();

    // Find all scheduled emails whose time has come
    const dueEmails = await Email.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    })
      .populate('recipientId')
      .limit(50); // Process max 50 per tick to avoid overload

    if (dueEmails.length === 0) return;

    logger.info(`[Scheduler] Processing ${dueEmails.length} scheduled email(s)`);

    for (const email of dueEmails) {
      try {
        await sendEmail(email);
        logger.info(`[Scheduler] ✓ Sent scheduled email to ${email.recipientId?.email}`);
      } catch (error) {
        logger.error(`[Scheduler] ✗ Failed scheduled email ${email._id}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`[Scheduler] Error processing scheduled emails: ${error.message}`);
  }
};

/**
 * Stop the scheduler.
 */
const stopScheduler = () => {
  if (_schedulerTask) {
    _schedulerTask.stop();
    _schedulerTask = null;
    logger.info('[Scheduler] Stopped');
  }
};

module.exports = { startScheduler, stopScheduler, processScheduledEmails };
