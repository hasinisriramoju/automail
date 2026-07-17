/**
 * @file src/controllers/templateController.js
 * @description Handlers for AI prompt template management.
 */

const Template = require('../models/Template');
const logger = require('../utils/logger');

/**
 * GET /api/templates
 * List all active templates.
 */
const getTemplates = async (req, res, next) => {
  try {
    const templates = await Template.find({ isActive: true }).sort({ outreachType: 1 }).lean();
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/templates/:id
 * Get a single template.
 */
const getTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/templates
 * Create a new AI prompt template.
 */
const createTemplate = async (req, res, next) => {
  try {
    // Deactivate any existing template for this outreach type
    await Template.updateMany(
      { outreachType: req.body.outreachType },
      { isActive: false }
    );

    const template = await Template.create({ ...req.body, isActive: true });
    logger.info(`[Templates] Created template for: ${template.outreachType}`);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/templates/:id
 * Update an existing template.
 */
const updateTemplate = async (req, res, next) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, $inc: { version: 1 } },
      { new: true, runValidators: true }
    );
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    logger.info(`[Templates] Updated: ${template.outreachType} (v${template.version})`);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/templates/:id
 * Soft-delete a template (marks as inactive).
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate };
