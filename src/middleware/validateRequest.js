/**
 * @file src/middleware/validateRequest.js
 * @description Joi-based request validation middleware factory.
 */

const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Create a validation middleware for a given Joi schema.
 *
 * @param {Object} schema - Joi schema object with optional body/query/params keys
 * @returns {Function} Express middleware
 */
const validate = (schema) => (req, res, next) => {
  const toValidate = {};
  if (schema.body) toValidate.body = req.body;
  if (schema.query) toValidate.query = req.query;
  if (schema.params) toValidate.params = req.params;

  const fullSchema = Joi.object(
    Object.fromEntries(
      Object.entries(schema).map(([key, val]) => [key, val])
    )
  );

  const { error } = fullSchema.validate(toValidate, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message.replace(/"/g, "'"));
    logger.warn(`[Validate] Request validation failed: ${details.join('; ')}`);
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details,
    });
  }

  next();
};

// ─── Validation Schemas ───────────────────────────────────────────────────────

const OUTREACH_TYPES = [
  'partnership', 'sales', 'startup_collab', 'investor',
  'networking', 'hiring', 'internship', 'custom',
];

const schemas = {
  createRecipient: {
    body: Joi.object({
      companyName: Joi.string().trim().min(1).max(200).required(),
      contactName: Joi.string().trim().max(200).optional().allow(''),
      contactTitle: Joi.string().trim().max(200).optional().allow(''),
      email: Joi.string().email().lowercase().required(),
      industry: Joi.string().trim().max(100).optional().allow(''),
      subIndustry: Joi.string().trim().max(100).optional().allow(''),
      companySize: Joi.string()
        .valid('1-10', '11-50', '51-200', '201-500', '500+', 'Unknown')
        .default('Unknown'),
      fundingStage: Joi.string()
        .valid('Bootstrapped', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public', 'Unknown')
        .default('Unknown'),
      location: Joi.string().trim().max(200).optional().allow(''),
      website: Joi.string().uri().optional().allow(''),
      linkedinUrl: Joi.string().uri().optional().allow(''),
      description: Joi.string().trim().max(2000).optional().allow(''),
      manualNotes: Joi.string().trim().max(2000).optional().allow(''),
      outreachType: Joi.string().valid(...OUTREACH_TYPES).default('partnership'),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(20).default([]),
    }),
  },

  updateRecipient: {
    body: Joi.object({
      companyName: Joi.string().trim().min(1).max(200),
      contactName: Joi.string().trim().max(200).allow(''),
      contactTitle: Joi.string().trim().max(200).allow(''),
      email: Joi.string().email().lowercase(),
      industry: Joi.string().trim().max(100).allow(''),
      subIndustry: Joi.string().trim().max(100).allow(''),
      companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+', 'Unknown'),
      fundingStage: Joi.string().valid('Bootstrapped', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public', 'Unknown'),
      location: Joi.string().trim().max(200).allow(''),
      website: Joi.string().uri().allow(''),
      linkedinUrl: Joi.string().uri().allow(''),
      description: Joi.string().trim().max(2000).allow(''),
      manualNotes: Joi.string().trim().max(2000).allow(''),
      outreachType: Joi.string().valid(...OUTREACH_TYPES),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
      status: Joi.string().valid('new', 'contacted', 'responded', 'converted', 'not_interested', 'archived'),
    }).min(1),
  },

  generateEmail: {
    body: Joi.object({
      recipientId: Joi.string().hex().length(24).required(),
      outreachType: Joi.string().valid(...OUTREACH_TYPES).required(),
      customHint: Joi.string().trim().max(1000).optional().allow(''),
      skipResearch: Joi.boolean().default(false),
    }),
  },

  updateEmail: {
    body: Joi.object({
      subject: Joi.string().trim().min(1).max(500),
      bodyHtml: Joi.string().min(1),
      bodyText: Joi.string().min(1),
    }).min(1),
  },

  scheduleEmail: {
    body: Joi.object({
      scheduledAt: Joi.date().greater('now').required(),
    }),
  },

  createCampaign: {
    body: Joi.object({
      name: Joi.string().trim().min(1).max(200).required(),
      description: Joi.string().trim().max(1000).allow(''),
      outreachType: Joi.string().valid(...OUTREACH_TYPES).required(),
      recipientIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
      scheduledAt: Joi.date().optional(),
      delayBetweenEmailsMs: Joi.number().integer().min(500).max(60000).default(3000),
      customPromptHint: Joi.string().trim().max(1000).allow(''),
      followUpEnabled: Joi.boolean().default(false),
      followUpDelayDays: Joi.number().integer().min(1).max(30).default(3),
      maxFollowUps: Joi.number().integer().min(1).max(10).default(2),
    }),
  },

  createTemplate: {
    body: Joi.object({
      outreachType: Joi.string().valid(...OUTREACH_TYPES).required(),
      displayName: Joi.string().trim().min(1).max(200).required(),
      description: Joi.string().trim().max(500).allow(''),
      systemPrompt: Joi.string().min(10).required(),
      userPromptTemplate: Joi.string().min(10).required(),
      suggestedSubjectFormats: Joi.array().items(Joi.string()).max(10).default([]),
      maxWordCount: Joi.number().integer().min(50).max(1000).default(250),
      tone: Joi.string().valid('formal', 'professional', 'warm', 'casual').default('professional'),
    }),
  },
};

module.exports = { validate, schemas };
