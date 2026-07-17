/**
 * @file src/models/Template.js
 * @description AI prompt templates per outreach type.
 * Allows customizing how the AI generates emails for each purpose.
 */

const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema(
  {
    outreachType: {
      type: String,
      enum: [
        'partnership',
        'sales',
        'startup_collab',
        'investor',
        'networking',
        'hiring',
        'internship',
        'custom',
      ],
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },

    // ─── AI Prompt Components ────────────────────────────────────────────
    systemPrompt: {
      type: String,
      required: true,
      // Sets the AI's role and overall behavior for this outreach type
    },
    userPromptTemplate: {
      type: String,
      required: true,
      // Template with {{variables}} that get replaced before sending to AI
      // Available variables: {{recipientData}}, {{onitProfile}}, {{customHint}}
    },

    // ─── Email Structure Guidelines ───────────────────────────────────────
    suggestedSubjectFormats: [String],
    maxWordCount: { type: Number, default: 250 },
    tone: {
      type: String,
      enum: ['formal', 'professional', 'warm', 'casual'],
      default: 'professional',
    },

    // ─── Status ──────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false }, // Seed/default templates
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Template', TemplateSchema);
