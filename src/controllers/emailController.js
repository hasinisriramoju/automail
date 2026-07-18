/**
 * @file src/controllers/emailController.js
 * @description Handlers for email generation, drafting, editing, sending, and history.
 */

const Email = require('../models/Email');
const Recipient = require('../models/Recipient');
const { enrichRecipient } = require('../services/researchService');
const { generateEmail } = require('../services/aiService');
const { sendEmailById, scheduleEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * POST /api/emails/generate
 * Generate a personalized AI email draft for a recipient.
 */
const generate = async (req, res, next) => {
  try {
    const { recipientId, outreachType, customHint, skipResearch } = req.body;

    // Load recipient
    let recipient = await Recipient.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    // Enrich with research unless skipped or recently done
    if (!skipResearch) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const hasRecentResearch = recipient.researchData?.scrapedAt > hourAgo;
      if (!hasRecentResearch) {
        recipient = await enrichRecipient(recipient);
      }
    }

    // Generate unique AI email
    const generated = await generateEmail(recipient, outreachType, customHint);

    // Save as draft
    const email = await Email.create({
      recipientId: recipient._id,
      subject: generated.subject,
      bodyHtml: generated.bodyHtml,
      bodyText: generated.bodyText,
      outreachType,
      aiPersonalizationNotes: generated.personalizationNotes,
      aiModel: generated.model,
      promptUsed: generated.promptUsed,
      status: 'draft',
    });

    logger.info(`[Emails] Draft generated for ${recipient.email} | EmailId: ${email._id}`);

    res.status(201).json({
      success: true,
      message: 'Email draft generated successfully',
      data: email,
      personalizationNotes: generated.personalizationNotes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails
 * List emails with filters.
 */
const getEmails = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      outreachType,
      recipientId,
      campaignId,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (outreachType) filter.outreachType = outreachType;
    if (recipientId) filter.recipientId = recipientId;
    if (campaignId) filter.campaignId = campaignId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [emails, total] = await Promise.all([
      Email.find(filter)
        .populate('recipientId', 'companyName email contactName industry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Email.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails/:id
 * Get a single email.
 */
const getEmail = async (req, res, next) => {
  try {
    const email = await Email.findById(req.params.id)
      .populate('recipientId')
      .populate('campaignId', 'name outreachType');

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }
    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/emails/:id
 * Edit an email draft (subject, body).
 */
const updateEmail = async (req, res, next) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    if (email.status === 'sent') {
      return res.status(400).json({ success: false, error: 'Cannot edit a sent email' });
    }

    Object.assign(email, req.body);
    await email.save();

    logger.info(`[Emails] Updated draft: ${email._id}`);
    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/emails/:id/send
 * Send an email immediately.
 */
const send = async (req, res, next) => {
  try {
    const email = await sendEmailById(req.params.id);
    res.json({
      success: true,
      message: 'Email sent successfully',
      data: email,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/emails/:id/schedule
 * Schedule an email for later sending.
 */
const schedule = async (req, res, next) => {
  try {
    const email = await scheduleEmail(req.params.id, req.body.scheduledAt);
    res.json({
      success: true,
      message: `Email scheduled for ${email.scheduledAt}`,
      data: email,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/emails/:id
 * Delete a draft email.
 */
const deleteEmail = async (req, res, next) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }
    if (email.status === 'sent') {
      return res.status(400).json({ success: false, error: 'Cannot delete a sent email' });
    }

    await email.deleteOne();
    logger.info(`[Emails] Deleted email: ${email._id}`);
    res.json({ success: true, message: 'Email deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/emails/:id/followup
 * Generate a follow-up email for a previously sent email.
 */
const generateFollowUp = async (req, res, next) => {
  try {
    const parentEmail = await Email.findById(req.params.id).populate('recipientId');
    if (!parentEmail) {
      return res.status(404).json({ success: false, error: 'Parent email not found' });
    }
    if (parentEmail.status !== 'sent') {
      return res.status(400).json({
        success: false,
        error: 'Can only follow up on sent emails',
      });
    }

    const followUpHint = `This is follow-up #${parentEmail.followUpCount + 1}. The original email was sent on ${parentEmail.sentAt?.toDateString()}. Keep the follow-up brief, reference the previous email subtly, and gently reiterate the value proposition.`;

    const generated = await generateEmail(
      parentEmail.recipientId,
      parentEmail.outreachType,
      `${req.body?.customHint || ''} ${followUpHint}`.trim()
    );

    const followUp = await Email.create({
      recipientId: parentEmail.recipientId._id,
      campaignId: parentEmail.campaignId,
      subject: `Re: ${parentEmail.subject}`,
      bodyHtml: generated.bodyHtml,
      bodyText: generated.bodyText,
      outreachType: parentEmail.outreachType,
      aiPersonalizationNotes: generated.personalizationNotes,
      aiModel: generated.model,
      isFollowUp: true,
      parentEmailId: parentEmail._id,
      status: 'draft',
    });

    // Increment follow-up count on parent
    await Email.findByIdAndUpdate(parentEmail._id, { $inc: { followUpCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Follow-up email generated as draft',
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/track/open/:id
 * Serve a 1x1 tracking pixel and record open event.
 */
const trackOpen = async (req, res) => {
  // Always serve the pixel regardless of DB errors
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.end(pixel);

  // Record open asynchronously (don't block response)
  try {
    const email = await Email.findById(req.params.id);
    if (email && email.status === 'sent') {
      const update = { $inc: { openCount: 1 } };
      if (!email.openedAt) update.$set = { openedAt: new Date() };
      await Email.findByIdAndUpdate(req.params.id, update);
      logger.info(`[Track] Open recorded for email ${req.params.id}`);
    }
  } catch (err) {
    logger.error(`[Track] Failed to record open: ${err.message}`);
  }
};

/**
 * GET /api/emails/stats
 * Get aggregate email statistics.
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await Email.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byType = await Email.aggregate([
      { $group: { _id: '$outreachType', count: { $sum: 1 } } },
    ]);

    // Count emails opened at least once
    const openedCount = await Email.countDocuments({ openCount: { $gt: 0 } });
    const totalCount  = await Email.countDocuments();

    res.json({
      success: true,
      data: {
        byStatus: Object.fromEntries(stats.map((s) => [s._id, s.count])),
        byOutreachType: Object.fromEntries(byType.map((s) => [s._id, s.count])),
        opened: openedCount,
        total: totalCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generate,
  getEmails,
  getEmail,
  updateEmail,
  send,
  schedule,
  deleteEmail,
  generateFollowUp,
  getStats,
  trackOpen,
};
