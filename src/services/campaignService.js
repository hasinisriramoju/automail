/**
 * @file src/services/campaignService.js
 * @description Bulk campaign orchestration.
 * Generates unique AI emails for every recipient and sends them
 * with configurable delays to respect SMTP rate limits.
 */

const Campaign = require('../models/Campaign');
const Recipient = require('../models/Recipient');
const Email = require('../models/Email');
const { enrichRecipient } = require('./researchService');
const { generateEmail } = require('./aiService');
const { sendEmail } = require('./emailService');
const { sleep } = require('../utils/retryHelper');
const logger = require('../utils/logger');

/**
 * Generate AI email drafts for all recipients in a campaign.
 * Does NOT send them — creates drafts for review first.
 *
 * @param {string} campaignId
 * @returns {Promise<Object>} Updated campaign with generation stats
 */
const generateCampaignDrafts = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

  if (!campaign.recipientIds.length) {
    throw new Error('Campaign has no recipients');
  }

  logger.info(
    `[Campaign] Generating drafts for campaign "${campaign.name}" (${campaign.recipientIds.length} recipients)`
  );

  campaign.status = 'generating';
  campaign.totalRecipients = campaign.recipientIds.length;
  campaign.totalGenerated = 0;
  campaign.totalFailed = 0;
  await campaign.save();

  for (const recipientId of campaign.recipientIds) {
    try {
      // Enrich recipient with web research
      const recipient = await enrichRecipient(recipientId);

      // Generate a unique AI email
      const generated = await generateEmail(
        recipient,
        campaign.outreachType,
        campaign.customPromptHint || ''
      );

      // Save as draft
      await Email.create({
        recipientId: recipient._id,
        campaignId: campaign._id,
        subject: generated.subject,
        bodyHtml: generated.bodyHtml,
        bodyText: generated.bodyText,
        outreachType: campaign.outreachType,
        aiPersonalizationNotes: generated.personalizationNotes,
        aiModel: generated.model,
        promptUsed: generated.promptUsed,
        status: 'draft',
      });

      campaign.totalGenerated += 1;
      await campaign.save();

      logger.info(
        `[Campaign] Draft generated for ${recipient.companyName} (${campaign.totalGenerated}/${campaign.recipientIds.length})`
      );

      // Small delay between AI calls to avoid rate limiting
      await sleep(500);
    } catch (error) {
      campaign.totalFailed += 1;
      await campaign.save();
      logger.error(
        `[Campaign] Failed to generate draft for recipient ${recipientId}: ${error.message}`
      );
      // Continue with next recipient
    }
  }

  campaign.status = 'ready';
  await campaign.save();

  logger.info(
    `[Campaign] Draft generation complete: ${campaign.totalGenerated} generated, ${campaign.totalFailed} failed`
  );

  return campaign;
};

/**
 * Send all ready draft emails in a campaign.
 * Sends with configured delay between each email.
 *
 * @param {string} campaignId
 * @returns {Promise<Object>} Updated campaign with send stats
 */
const runCampaign = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

  if (!['ready', 'paused'].includes(campaign.status)) {
    throw new Error(`Campaign cannot be started from status: ${campaign.status}`);
  }

  logger.info(`[Campaign] Starting campaign: "${campaign.name}"`);

  campaign.status = 'running';
  campaign.startedAt = campaign.startedAt || new Date();
  campaign.totalSent = 0;
  campaign.totalFailed = 0;
  await campaign.save();

  // Get all draft emails for this campaign
  const emails = await Email.find({
    campaignId: campaign._id,
    status: { $in: ['draft', 'failed'] }, // Include failed for retry
  }).populate('recipientId');

  logger.info(`[Campaign] Found ${emails.length} emails to send`);

  for (const email of emails) {
    // Check if campaign was paused between sends
    const freshCampaign = await Campaign.findById(campaignId);
    if (freshCampaign.status === 'paused') {
      logger.info(`[Campaign] Paused at email ${campaign.totalSent + 1}/${emails.length}`);
      return freshCampaign;
    }

    try {
      await sendEmail(email);
      campaign.totalSent += 1;
      await campaign.save();

      logger.info(
        `[Campaign] Sent ${campaign.totalSent}/${emails.length}: ${email.recipientId?.email}`
      );
    } catch (error) {
      campaign.totalFailed += 1;
      await campaign.save();
      logger.error(
        `[Campaign] Failed to send to ${email.recipientId?.email}: ${error.message}`
      );
    }

    // Delay between sends (anti-spam throttle)
    const delay = campaign.delayBetweenEmailsMs || parseInt(process.env.CAMPAIGN_DELAY_MS || '3000', 10);
    if (emails.indexOf(email) < emails.length - 1) {
      logger.debug(`[Campaign] Waiting ${delay}ms before next send...`);
      await sleep(delay);
    }
  }

  campaign.status = 'completed';
  campaign.completedAt = new Date();
  await campaign.save();

  logger.info(
    `[Campaign] Completed: ${campaign.totalSent} sent, ${campaign.totalFailed} failed`
  );

  return campaign;
};

/**
 * Pause a running campaign.
 */
const pauseCampaign = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

  if (campaign.status !== 'running') {
    throw new Error('Can only pause a running campaign');
  }

  campaign.status = 'paused';
  await campaign.save();
  logger.info(`[Campaign] Paused: ${campaign.name}`);
  return campaign;
};

/**
 * Get campaign statistics.
 */
const getCampaignStats = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

  const emailStats = await Email.aggregate([
    { $match: { campaignId: campaign._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statsByStatus = {};
  emailStats.forEach((s) => { statsByStatus[s._id] = s.count; });

  return {
    campaign,
    emailStats: statsByStatus,
    totalEmails: Object.values(statsByStatus).reduce((a, b) => a + b, 0),
  };
};

module.exports = {
  generateCampaignDrafts,
  runCampaign,
  pauseCampaign,
  getCampaignStats,
};
