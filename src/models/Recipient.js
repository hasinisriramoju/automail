/**
 * @file src/models/Recipient.js
 * @description Mongoose schema for email recipients (companies, people, investors, etc.)
 */

const mongoose = require('mongoose');

const ResearchDataSchema = new mongoose.Schema(
  {
    websiteTitle: String,
    websiteDescription: String,
    aboutText: String,
    productsServices: [String],
    recentNews: String,
    keyInsights: [String],
    scrapedAt: Date,
  },
  { _id: false }
);

const RecipientSchema = new mongoose.Schema(
  {
    // ─── Core Contact Info ─────────────────────────────────────────────────
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    contactTitle: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },

    // ─── Company Profile ──────────────────────────────────────────────────
    industry: {
      type: String,
      trim: true,
    },
    subIndustry: {
      type: String,
      trim: true,
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+', 'Unknown'],
      default: 'Unknown',
    },
    fundingStage: {
      type: String,
      enum: ['Bootstrapped', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public', 'Unknown'],
      default: 'Unknown',
    },
    location: {
      type: String,
      trim: true,
    },

    // ─── Online Presence ──────────────────────────────────────────────────
    website: {
      type: String,
      trim: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
    },

    // ─── Manual Research Notes ────────────────────────────────────────────
    description: {
      type: String,
      trim: true,
    },
    manualNotes: {
      type: String,
      trim: true,
    },

    // ─── AI-Enriched Research Data (populated by researchService) ─────────
    researchData: ResearchDataSchema,

    // ─── Outreach Configuration ───────────────────────────────────────────
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
      default: 'partnership',
    },
    tags: [{ type: String, trim: true }],

    // ─── Status & Tracking ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['new', 'contacted', 'responded', 'converted', 'not_interested', 'archived'],
      default: 'new',
    },
    lastContactedAt: Date,

    // ─── Future: CRM & Multi-User Hooks ───────────────────────────────────
    crmId: String,        // External CRM reference (HubSpot, Salesforce, etc.)
    userId: String,       // For future multi-user support
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: full name display
RecipientSchema.virtual('displayName').get(function () {
  if (this.contactName) return `${this.contactName} at ${this.companyName}`;
  return this.companyName;
});

// Index for search performance
RecipientSchema.index({ industry: 1, outreachType: 1 });
RecipientSchema.index({ status: 1 });
RecipientSchema.index({ tags: 1 });

module.exports = mongoose.model('Recipient', RecipientSchema);
