/**
 * @file src/controllers/recipientController.js
 * @description CRUD handlers for recipient management.
 */

const Recipient = require('../models/Recipient');
const { enrichRecipient } = require('../services/researchService');
const logger = require('../utils/logger');

/**
 * POST /api/recipients
 * Create a new recipient.
 */
const createRecipient = async (req, res, next) => {
  try {
    const recipient = await Recipient.create(req.body);
    logger.info(`[Recipients] Created: ${recipient.companyName} (${recipient.email})`);
    res.status(201).json({ success: true, data: recipient });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipients
 * List all recipients with optional filters.
 */
const getRecipients = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      industry,
      outreachType,
      status,
      tag,
      search,
    } = req.query;

    const filter = {};
    if (industry) filter.industry = new RegExp(industry, 'i');
    if (outreachType) filter.outreachType = outreachType;
    if (status) filter.status = status;
    if (tag) filter.tags = tag;
    if (search) {
      filter.$or = [
        { companyName: new RegExp(search, 'i') },
        { contactName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [recipients, total] = await Promise.all([
      Recipient.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Recipient.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: recipients,
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
 * GET /api/recipients/:id
 * Get a single recipient by ID.
 */
const getRecipient = async (req, res, next) => {
  try {
    const recipient = await Recipient.findById(req.params.id);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }
    res.json({ success: true, data: recipient });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/recipients/:id
 * Update a recipient.
 */
const updateRecipient = async (req, res, next) => {
  try {
    const recipient = await Recipient.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }
    logger.info(`[Recipients] Updated: ${recipient.companyName}`);
    res.json({ success: true, data: recipient });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/recipients/:id
 * Delete a recipient.
 */
const deleteRecipient = async (req, res, next) => {
  try {
    const recipient = await Recipient.findByIdAndDelete(req.params.id);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }
    logger.info(`[Recipients] Deleted: ${recipient.companyName}`);
    res.json({ success: true, message: 'Recipient deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipients/:id/research
 * Trigger AI research/enrichment for a recipient.
 */
const researchRecipient = async (req, res, next) => {
  try {
    const recipient = await enrichRecipient(req.params.id);
    res.json({
      success: true,
      message: 'Research completed successfully',
      data: recipient,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRecipient,
  getRecipients,
  getRecipient,
  updateRecipient,
  deleteRecipient,
  researchRecipient,
};
