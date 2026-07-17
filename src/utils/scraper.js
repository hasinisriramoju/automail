/**
 * @file src/utils/scraper.js
 * @description Lightweight website scraper using Axios + Cheerio.
 * Extracts publicly available information about recipient companies.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');

const SCRAPE_TIMEOUT_MS = 10000;
const MAX_CONTENT_LENGTH = 5000000; // 5MB limit

/**
 * Scrape a website URL and extract key company information.
 *
 * @param {string} url - The company website URL to scrape
 * @returns {Promise<Object>} Extracted data
 */
const scrapeWebsite = async (url) => {
  if (!url) return null;

  // Normalize URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    logger.debug(`[Scraper] Fetching: ${normalizedUrl}`);

    const response = await axios.get(normalizedUrl, {
      timeout: SCRAPE_TIMEOUT_MS,
      maxContentLength: MAX_CONTENT_LENGTH,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; OnITResearchBot/1.0; +https://www.onitindia.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Follow redirects
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // ── Remove noise ────────────────────────────────────────────────────
    $('script, style, noscript, nav, footer, .cookie-banner, #cookie-notice').remove();

    // ── Extract metadata ────────────────────────────────────────────────
    const title = $('title').first().text().trim() || $('h1').first().text().trim();

    const metaDescription =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    const ogTitle =
      $('meta[property="og:title"]').attr('content') || '';

    const keywords =
      $('meta[name="keywords"]').attr('content') || '';

    // ── Extract main content ────────────────────────────────────────────
    // Priority: main > article > sections with substance
    let mainContent = '';

    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.hero',
      '.about',
      '.services',
      '.features',
      '#about',
      '#services',
      '.page-content',
      'section',
    ];

    for (const selector of contentSelectors) {
      const text = $(selector).text().replace(/\s+/g, ' ').trim();
      if (text.length > 100) {
        mainContent += text + ' ';
        if (mainContent.length > 2000) break;
      }
    }

    // Fallback: body text
    if (mainContent.length < 100) {
      mainContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);
    } else {
      mainContent = mainContent.trim().slice(0, 2000);
    }

    // ── Extract headings as service/product clues ─────────────────────
    const headings = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3 && text.length < 150) {
        headings.push(text);
      }
    });

    // ── Extract any visible email or social links (optional enrichment) ─
    const linkedinUrl = $('a[href*="linkedin.com"]').first().attr('href') || '';

    const result = {
      url: normalizedUrl,
      title: (ogTitle || title).slice(0, 200),
      metaDescription: metaDescription.slice(0, 500),
      keywords: keywords.slice(0, 300),
      mainContent,
      headings: headings.slice(0, 15),
      linkedinUrl,
      scrapedAt: new Date(),
    };

    logger.debug(`[Scraper] Successfully scraped: ${normalizedUrl} (${mainContent.length} chars)`);
    return result;
  } catch (error) {
    logger.warn(`[Scraper] Failed to scrape ${normalizedUrl}: ${error.message}`);
    return {
      url: normalizedUrl,
      error: error.message,
      scrapedAt: new Date(),
    };
  }
};

/**
 * Extract a compact, AI-friendly summary from scraped data.
 *
 * @param {Object} scrapedData
 * @returns {string} Formatted summary for AI prompt injection
 */
const buildScrapeSummary = (scrapedData) => {
  if (!scrapedData || scrapedData.error) return '';

  const parts = [];

  if (scrapedData.title) parts.push(`Website Title: ${scrapedData.title}`);
  if (scrapedData.metaDescription) parts.push(`Description: ${scrapedData.metaDescription}`);
  if (scrapedData.keywords) parts.push(`Keywords: ${scrapedData.keywords}`);
  if (scrapedData.headings?.length) {
    parts.push(`Key Headings: ${scrapedData.headings.slice(0, 8).join(' | ')}`);
  }
  if (scrapedData.mainContent) {
    parts.push(`Content Excerpt: ${scrapedData.mainContent.slice(0, 800)}`);
  }

  return parts.join('\n');
};

module.exports = { scrapeWebsite, buildScrapeSummary };
