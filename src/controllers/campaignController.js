/**
 * @file src/controllers/campaignController.js
 * @description Handlers for campaign management and orchestration.
 */

const Campaign = require('../models/Campaign');
const {
  generateCampaignDrafts,
  runCampaign,
  pauseCampaign,
  getCampaignStats,
} = require('../services/campaignService');
const logger = require('../utils/logger');

/**
 * POST /api/campaigns
 * Create a new campaign.
 */
const createCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.create({
      ...req.body,
      totalRecipients: req.body.recipientIds.length,
    });
    logger.info(`[Campaigns] Created: "${campaign.name}" with ${campaign.recipientIds.length} recipients`);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns
 * List all campaigns.
 */
const getCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, outreachType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (outreachType) filter.outreachType = outreachType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Campaign.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: campaigns,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/:id
 * Get a campaign with its stats.
 */
const getCampaign = async (req, res, next) => {
  try {
    const { campaign, emailStats, totalEmails } = await getCampaignStats(req.params.id);
    res.json({ success: true, data: campaign, emailStats, totalEmails });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/generate
 * Generate AI drafts for all recipients in the campaign.
 * Runs asynchronously — returns immediately, generation happens in background.
 */
const generateDrafts = async (req, res, next) => {
  try {
    // Start generation in background
    res.json({
      success: true,
      message: 'Draft generation started. Check campaign status for progress.',
    });

    // Run after response is sent
    generateCampaignDrafts(req.params.id).catch((err) => {
      logger.error(`[Campaigns] Background generation failed: ${err.message}`);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/start
 * Start sending a campaign (emails must be generated first).
 * Also runs asynchronously.
 */
const startCampaign = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Campaign sending started. Monitor status via GET /api/campaigns/:id',
    });

    runCampaign(req.params.id).catch((err) => {
      logger.error(`[Campaigns] Background send failed: ${err.message}`);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/pause
 * Pause a running campaign.
 */
const pause = async (req, res, next) => {
  try {
    const campaign = await pauseCampaign(req.params.id);
    res.json({ success: true, message: 'Campaign paused', data: campaign });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign (only if draft).
 */
const deleteCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    if (['running', 'generating'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a running campaign. Pause it first.',
      });
    }
    await campaign.deleteOne();
    logger.info(`[Campaigns] Deleted: ${campaign.name}`);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaign,
  generateDrafts,
  startCampaign,
  pause,
  deleteCampaign,
};
