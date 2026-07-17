/**
 * @file src/services/researchService.js
 * @description Enriches recipient profiles with public data.
 * Scrapes their website and compiles all available information into
 * a structured context object for AI email generation.
 */

const Recipient = require('../models/Recipient');
const { scrapeWebsite, buildScrapeSummary } = require('../utils/scraper');
const { withRetry } = require('../utils/retryHelper');
const logger = require('../utils/logger');

/**
 * Research and enrich a recipient's profile with publicly available data.
 * Saves the result back to the Recipient document.
 *
 * @param {string|Object} recipientOrId - Recipient document or its MongoDB ID
 * @returns {Promise<Object>} The enriched recipient document
 */
const enrichRecipient = async (recipientOrId) => {
  // Accept either an ID string or a document
  let recipient = recipientOrId;
  if (typeof recipientOrId === 'string' || recipientOrId.constructor.name === 'ObjectId') {
    recipient = await Recipient.findById(recipientOrId);
    if (!recipient) throw new Error(`Recipient not found: ${recipientOrId}`);
  }

  logger.info(`[Research] Enriching recipient: ${recipient.companyName} (${recipient.email})`);

  let scrapedData = null;

  // Scrape website if available
  if (recipient.website) {
    scrapedData = await withRetry(() => scrapeWebsite(recipient.website), {
      maxAttempts: 2,
      baseDelayMs: 1500,
      label: `Scrape ${recipient.website}`,
    });
  }

  // Build researchData object
  const researchData = {
    websiteTitle: scrapedData?.title || recipient.companyName,
    websiteDescription: scrapedData?.metaDescription || recipient.description || '',
    aboutText: scrapedData?.mainContent || '',
    productsServices: extractServicesFromHeadings(scrapedData?.headings || []),
    recentNews: '', // Future: integrate news API (NewsAPI, Google News)
    keyInsights: buildInsights(recipient, scrapedData),
    scrapedAt: new Date(),
  };

  // Update the recipient's research data
  recipient.researchData = researchData;
  await recipient.save();

  logger.info(`[Research] Enrichment complete for: ${recipient.companyName}`);
  return recipient;
};

/**
 * Build a structured, AI-ready context string from recipient + research data.
 * This is the primary input the AI uses to understand the recipient.
 *
 * @param {Object} recipient - Mongoose Recipient document
 * @returns {string} Formatted context for AI prompt
 */
const buildRecipientContext = (recipient) => {
  const r = recipient;
  const rd = r.researchData || {};

  const sections = [];

  // Core identity
  sections.push(`Company: ${r.companyName}`);
  if (r.contactName) sections.push(`Contact Person: ${r.contactName}${r.contactTitle ? ` (${r.contactTitle})` : ''}`);
  if (r.industry) sections.push(`Industry: ${r.industry}${r.subIndustry ? ` / ${r.subIndustry}` : ''}`);
  if (r.location) sections.push(`Location: ${r.location}`);
  if (r.companySize && r.companySize !== 'Unknown') sections.push(`Company Size: ${r.companySize} employees`);
  if (r.fundingStage && r.fundingStage !== 'Unknown') sections.push(`Funding Stage: ${r.fundingStage}`);
  if (r.website) sections.push(`Website: ${r.website}`);
  if (r.linkedinUrl) sections.push(`LinkedIn: ${r.linkedinUrl}`);

  // Manual description / notes
  if (r.description) sections.push(`\nAbout (Manual): ${r.description}`);
  if (r.manualNotes) sections.push(`Additional Notes: ${r.manualNotes}`);

  // Scraped / researched data
  if (rd.websiteDescription) sections.push(`\nWebsite Description: ${rd.websiteDescription}`);

  if (rd.productsServices?.length) {
    sections.push(`Products/Services: ${rd.productsServices.join(', ')}`);
  }

  if (rd.aboutText) {
    sections.push(`\nWebsite Content Excerpt:\n${rd.aboutText.slice(0, 1000)}`);
  }

  if (rd.keyInsights?.length) {
    sections.push(`\nKey Insights:\n${rd.keyInsights.map((i) => `- ${i}`).join('\n')}`);
  }

  if (rd.recentNews) {
    sections.push(`\nRecent News: ${rd.recentNews}`);
  }

  // Outreach type context
  sections.push(`\nOutreach Goal: ${outreachTypeDescription(r.outreachType)}`);

  return sections.join('\n');
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

const extractServicesFromHeadings = (headings) => {
  const serviceKeywords = [
    'service', 'product', 'solution', 'platform', 'tool', 'feature',
    'offer', 'provide', 'build', 'develop', 'create', 'deliver',
  ];

  return headings.filter((h) =>
    serviceKeywords.some((kw) => h.toLowerCase().includes(kw))
  ).slice(0, 8);
};

const buildInsights = (recipient, scrapedData) => {
  const insights = [];

  if (recipient.fundingStage && recipient.fundingStage !== 'Unknown') {
    insights.push(`${recipient.companyName} is at ${recipient.fundingStage} stage`);
  }

  if (scrapedData?.headings?.length > 3) {
    insights.push(`Key focus areas based on website: ${scrapedData.headings.slice(0, 4).join(', ')}`);
  }

  if (recipient.industry) {
    insights.push(`Operates in the ${recipient.industry} sector`);
  }

  if (recipient.companySize && recipient.companySize !== 'Unknown') {
    const sizeMap = {
      '1-10': 'a small team',
      '11-50': 'a growing startup',
      '51-200': 'a mid-size company',
      '201-500': 'a large company',
      '500+': 'an enterprise',
    };
    insights.push(`Team size suggests this is ${sizeMap[recipient.companySize] || 'a company'}`);
  }

  return insights;
};

const outreachTypeDescription = (type) => {
  const map = {
    partnership: 'Propose a strategic business partnership or collaboration',
    sales: 'Introduce OnIT India\'s services as a solution to their business challenges',
    startup_collab: 'Explore a technology collaboration with this startup',
    investor: 'Reach out to explore investment or mentorship opportunities',
    networking: 'Build a meaningful professional relationship',
    hiring: 'Identify and reach out to potential talent or hiring managers',
    internship: 'Propose an internship collaboration program',
    custom: 'Custom outreach campaign',
  };
  return map[type] || 'Professional outreach';
};

module.exports = { enrichRecipient, buildRecipientContext };
