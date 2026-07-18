/**
 * @file src/services/emailService.js
 * @description Email sending service.
 * Uses Resend SDK if RESEND_API_KEY is set, otherwise falls back to Nodemailer SMTP.
 */

const Email = require('../models/Email');
const Recipient = require('../models/Recipient');
const onitProfile = require('../config/onitProfile');
const { withRetry } = require('../utils/retryHelper');
const logger = require('../utils/logger');

// ─── Provider detection ────────────────────────────────────────────────────
const useResend = !!process.env.RESEND_API_KEY;

let resendClient = null;
if (useResend) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
  logger.info('[Email] Provider: Resend SDK');
} else {
  logger.info('[Email] Provider: Nodemailer SMTP (fallback)');
}

// ─── Tracking pixel injector ───────────────────────────────────────────────
const buildTrackedHtml = (emailId, bodyHtml) => {
  const baseUrl = process.env.APP_URL || 'https://automail.onrender.com';
  const pixel = `<img src="${baseUrl}/api/emails/track/open/${emailId}" width="1" height="1" style="display:none;border:0;" alt="" />`;
  // Inject before closing </body> if present, otherwise append
  if (bodyHtml && bodyHtml.includes('</body>')) {
    return bodyHtml.replace('</body>', `${pixel}</body>`);
  }
  return (bodyHtml || '') + pixel;
};

// ─── sendEmailById ─────────────────────────────────────────────────────────
const sendEmailById = async (emailId) => {
  const email = await Email.findById(emailId).populate('recipientId');
  if (!email) throw new Error(`Email not found: ${emailId}`);

  if (email.status === 'sent') throw new Error('This email has already been sent');
  if (email.status === 'sending') throw new Error('This email is currently being sent');
  // Note: 'failed' emails ARE allowed to be retried

  return sendEmail(email);
};

// ─── sendEmail ─────────────────────────────────────────────────────────────
const sendEmail = async (email) => {
  const recipient = email.recipientId;
  if (!recipient || !recipient.email) throw new Error('Recipient email address is missing');

  logger.info(`[Email] Sending to: ${recipient.email} | Subject: ${email.subject}`);

  email.status = 'sending';
  await email.save();

  try {
    let messageId;

    if (useResend) {
      messageId = await sendViaResend(email, recipient);
    } else {
      messageId = await sendViaNodmailer(email, recipient);
    }

    // Success
    email.status = 'sent';
    email.sentAt = new Date();
    email.messageId = messageId;
    email.error = undefined;
    await email.save();

    await Recipient.findByIdAndUpdate(recipient._id, {
      status: 'contacted',
      lastContactedAt: new Date(),
    });

    logger.info(`[Email] ✓ Sent to ${recipient.email} | MessageId: ${messageId}`);
    return email;

  } catch (error) {
    email.status = 'failed';
    email.failedAt = new Date();
    email.error = error.message;
    email.retryCount = (email.retryCount || 0) + 1;
    await email.save();

    logger.error(`[Email] ✗ Failed to send to ${recipient.email}: ${error.message}`);
    throw error;
  }
};

// ─── Resend sender ─────────────────────────────────────────────────────────
const sendViaResend = async (email, recipient) => {
  const senderName  = process.env.SENDER_NAME  || onitProfile.companyName;
  const senderEmail = process.env.RESEND_FROM  || process.env.SENDER_EMAIL || onitProfile.email;

  const toAddress = recipient.contactName
    ? `${recipient.contactName} <${recipient.email}>`
    : recipient.email;

  const result = await withRetry(
    () => resendClient.emails.send({
      from:     `${senderName} <${senderEmail}>`,
      to:       [toAddress],
      subject:  email.subject,
      html:     buildTrackedHtml(email._id, email.bodyHtml),
      text:     email.bodyText,
      reply_to: `${senderName} <${senderEmail}>`,
      tags: [
        { name: 'campaign', value: email.campaignId ? String(email.campaignId) : 'direct' },
      ],
    }),
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      label: `Resend to ${recipient.email}`,
    }
  );

  if (result.error) throw new Error(result.error.message || 'Resend API error');
  return result.data?.id || 'resend-ok';
};

// ─── Nodemailer fallback ───────────────────────────────────────────────────
const sendViaNodmailer = async (email, recipient) => {
  const { getTransporter } = require('../config/mailer');
  const transporter = await getTransporter();

  const senderName  = process.env.SENDER_NAME  || onitProfile.companyName;
  const senderEmail = process.env.SENDER_EMAIL  || onitProfile.email;

  const mailOptions = {
    from:    `"${senderName}" <${senderEmail}>`,
    to:      recipient.contactName ? `"${recipient.contactName}" <${recipient.email}>` : recipient.email,
    subject: email.subject,
    html:    buildTrackedHtml(email._id, email.bodyHtml),
    text:    email.bodyText,
    replyTo: `"${senderName}" <${senderEmail}>`,
    headers: {
      'X-Mailer':      'OnIT-AutoEmail/1.0',
      'X-Campaign-ID': email.campaignId ? String(email.campaignId) : 'direct',
    },
  };

  if (email.attachments && email.attachments.length > 0) {
    mailOptions.attachments = email.attachments.map((att) => ({
      filename:    att.filename,
      path:        att.path    || undefined,
      href:        att.url     || undefined,
      contentType: att.contentType || undefined,
    }));
  }

  const info = await withRetry(() => transporter.sendMail(mailOptions), {
    maxAttempts: 3,
    baseDelayMs: 2000,
    label: `SMTP to ${recipient.email}`,
    shouldRetry: (err) => !String(err?.responseCode || err?.code || '').startsWith('5'),
  });

  return info.messageId;
};

// ─── scheduleEmail ─────────────────────────────────────────────────────────
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

