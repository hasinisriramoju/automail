/**
 * @file src/models/Email.js
 * @description Mongoose schema for email drafts, sends, and history.
 */

const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    path: String,       // Local file path
    url: String,        // Remote URL
    contentType: String,
    size: Number,       // bytes
  },
  { _id: false }
);

const EmailSchema = new mongoose.Schema(
  {
    // ─── Relationships ────────────────────────────────────────────────────
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipient',
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },

    // ─── Email Content ────────────────────────────────────────────────────
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    bodyHtml: {
      type: String,
      required: true,
    },
    bodyText: {
      type: String, // Plain-text version for deliverability
    },
    attachments: [AttachmentSchema],

    // ─── Outreach Context ─────────────────────────────────────────────────
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

    // ─── AI Personalization Metadata ──────────────────────────────────────
    aiPersonalizationNotes: {
      type: String, // What data the AI used to personalize
    },
    aiModel: {
      type: String, // Which AI model generated this email
    },
    promptUsed: {
      type: String, // Full prompt (for debugging and A/B testing)
    },

    // ─── Status & Lifecycle ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
      default: 'draft',
    },
    scheduledAt: Date,
    sentAt: Date,
    failedAt: Date,
    error: String,          // Error message if send failed
    retryCount: {
      type: Number,
      default: 0,
    },

    // ─── Follow-up Tracking ───────────────────────────────────────────────
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    parentEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      default: null,
    },
    followUpCount: {
      type: Number,
      default: 0,
    },

    // ─── Future: Engagement Tracking (webhook-driven) ─────────────────────
    openedAt: Date,
    repliedAt: Date,
    clickedAt: Date,
    messageId: String,  // SMTP message ID for tracking

    // ─── Future: A/B Testing ─────────────────────────────────────────────
    variantLabel: String,  // e.g. 'A', 'B'

    // ─── Future: Multi-User ───────────────────────────────────────────────
    userId: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
EmailSchema.index({ recipientId: 1 });
EmailSchema.index({ campaignId: 1 });
EmailSchema.index({ status: 1 });
EmailSchema.index({ scheduledAt: 1, status: 1 });
EmailSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Email', EmailSchema);
