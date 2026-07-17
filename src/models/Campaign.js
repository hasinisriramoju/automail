/**
 * @file src/models/Campaign.js
 * @description Mongoose schema for bulk outreach campaigns.
 */

const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    // ─── Identity ─────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
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
    },

    // ─── Recipients ───────────────────────────────────────────────────────
    recipientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipient',
      },
    ],

    // ─── Status ───────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'generating', 'ready', 'running', 'paused', 'completed', 'failed'],
      default: 'draft',
    },

    // ─── Schedule ────────────────────────────────────────────────────────
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,

    // ─── Sending Config ───────────────────────────────────────────────────
    delayBetweenEmailsMs: {
      type: Number,
      default: 3000, // 3 seconds between emails (anti-spam throttle)
    },

    // ─── Stats ────────────────────────────────────────────────────────────
    totalRecipients: { type: Number, default: 0 },
    totalGenerated: { type: Number, default: 0 },
    totalSent: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },

    // ─── Custom Override Prompt ───────────────────────────────────────────
    customPromptHint: {
      type: String,
      trim: true,
      // Optional user-provided context to steer AI for this specific campaign
    },

    // ─── Follow-up Config ─────────────────────────────────────────────────
    followUpEnabled: { type: Boolean, default: false },
    followUpDelayDays: { type: Number, default: 3 },
    maxFollowUps: { type: Number, default: 2 },

    // ─── Future: A/B Testing ─────────────────────────────────────────────
    variants: [
      {
        label: String,
        promptHint: String,
        recipientIds: [mongoose.Schema.Types.ObjectId],
      },
    ],

    // ─── Future: Multi-User ───────────────────────────────────────────────
    userId: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CampaignSchema.index({ status: 1 });
CampaignSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
