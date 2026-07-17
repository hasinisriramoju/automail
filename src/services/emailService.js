/**
 * @file src/services/emailService.js
 * @description Email sending service using Nodemailer.
 * Handles single sends, retry logic, status updates, and attachment support.
 */

const Email = require('../models/Email');
const Recipient = require('../models/Recipient');
const { getTransporter } = require('../config/mailer');
const onitProfile = require('../config/onitProfile');
const { withRetry } = require('../utils/retryHelper');
const logger = require('../utils/logger');

/**
 * Send an email by its document ID.
 * Handles status transitions, retry, and error recording.
 *
 * @param {string} emailId - MongoDB ObjectId of the Email document
 * @returns {Promise<Object>} The updated Email document
 */
const sendEmailById = async (emailId) => {
  const email = await Email.findById(emailId).populate('recipientId');
  if (!email) throw new Error(`Email not found: ${emailId}`);

  if (email.status === 'sent') {
    throw new Error('This email has already been sent');
  }
  if (email.status === 'sending') {
    throw new Error('This email is currently being sent');
  }

  return sendEmail(email);
};

/**
 * Send an Email document directly.
 *
 * @param {Object} email - Mongoose Email document (with recipientId populated)
 * @returns {Promise<Object>} Updated Email document
 */
const sendEmail = async (email) => {
  const recipient = email.recipientId;
  if (!recipient || !recipient.email) {
    throw new Error('Recipient email address is missing');
  }

  logger.info(`[Email] Sending email to: ${recipient.email} | Subject: ${email.subject}`);

  // Mark as 'sending'
  email.status = 'sending';
  await email.save();

  try {
    const transporter = await getTransporter();

    const mailOptions = buildMailOptions(email, recipient);

    const info = await withRetry(() => transporter.sendMail(mailOptions), {
      maxAttempts: 3,
      baseDelayMs: 2000,
      label: `Send email to ${recipient.email}`,
      shouldRetry: (err) => {
        // Don't retry permanent SMTP errors (5xx)
        const code = err?.responseCode || err?.code;
        if (String(code).startsWith('5')) return false;
        return true;
      },
    });

    // Success
    email.status = 'sent';
    email.sentAt = new Date();
    email.messageId = info.messageId;
    email.error = undefined;
    await email.save();

    // Update recipient's last contact date and status
    await Recipient.findByIdAndUpdate(recipient._id, {
      status: 'contacted',
      lastContactedAt: new Date(),
    });

    logger.info(
      `[Email] ✓ Sent to ${recipient.email} | MessageId: ${info.messageId}`
    );

    return email;
  } catch (error) {
    // Failure
    email.status = 'failed';
    email.failedAt = new Date();
    email.error = error.message;
    email.retryCount = (email.retryCount || 0) + 1;
    await email.save();

    logger.error(
      `[Email] ✗ Failed to send to ${recipient.email}: ${error.message}`
    );

    throw error;
  }
};

/**
 * Build the Nodemailer mail options object.
 */
const buildMailOptions = (email, recipient) => {
  const senderName = process.env.SENDER_NAME || onitProfile.companyName;
  const senderEmail = process.env.SENDER_EMAIL || onitProfile.email;

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: recipient.contactName
      ? `"${recipient.contactName}" <${recipient.email}>`
      : recipient.email,
    subject: email.subject,
    html: email.bodyHtml,
    text: email.bodyText,
    // Reply-to matches sender
    replyTo: `"${senderName}" <${senderEmail}>`,
    // Headers for better deliverability
    headers: {
      'X-Mailer': 'OnIT-AutoEmail/1.0',
      'X-Campaign-ID': email.campaignId ? String(email.campaignId) : 'direct',
    },
  };

  // Attachments
  if (email.attachments && email.attachments.length > 0) {
    mailOptions.attachments = email.attachments.map((att) => ({
      filename: att.filename,
      path: att.path || undefined,
      href: att.url || undefined,
      contentType: att.contentType || undefined,
    }));
  }

  return mailOptions;
};

/**
 * Schedule an email to be sent at a specific time.
 * The actual sending is handled by schedulerService.js
 *
 * @param {string} emailId
 * @param {Date} scheduledAt
 * @returns {Promise<Object>} Updated Email document
 */
const scheduleEmail = async (emailId, scheduledAt) => {
  const email = await Email.findById(emailId);
  if (!email) throw new Error(`Email not found: ${emailId}`);

  if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  email.status = 'scheduled';
  email.scheduledAt = new Date(scheduledAt);
  await email.save();

  logger.info(`[Email] Scheduled email ${emailId} for ${scheduledAt}`);
  return email;
};

module.exports = { sendEmailById, sendEmail, scheduleEmail };
