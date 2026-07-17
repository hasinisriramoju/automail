/**
 * @file src/services/aiService.js
 * @description AI email generation service.
 * Constructs rich, structured prompts from recipient context + OnIT India profile
 * and calls the OpenAI API to generate unique, personalized emails.
 */

const { getOllamaClient, getModel } = require('../config/ollama');
const onitProfile = require('../config/onitProfile');
const Template = require('../models/Template');
const { buildRecipientContext } = require('./researchService');
const { withRetry } = require('../utils/retryHelper');
const logger = require('../utils/logger');

/**
 * Generate a personalized email for a recipient.
 *
 * @param {Object} recipient - Full Mongoose Recipient document (with researchData populated)
 * @param {string} outreachType - One of the supported outreach types
 * @param {string} [customHint] - Optional user-provided context/instruction for this email
 * @returns {Promise<{subject: string, bodyHtml: string, bodyText: string, personalizationNotes: string, model: string}>}
 */
const generateEmail = async (recipient, outreachType, customHint = '') => {
  logger.info(
    `[AI] Generating ${outreachType} email locally via Ollama for: ${recipient.companyName} (${recipient.email})`
  );

  // Load template for this outreach type (DB first, fallback to built-in)
  const template = await loadTemplate(outreachType);

  // Build the recipient context string
  const recipientContext = buildRecipientContext(recipient);

  // Build the OnIT India sender context
  const senderContext = buildSenderContext();

  // Construct the user prompt from the template
  const userPrompt = template.userPromptTemplate
    .replace('{{recipientData}}', recipientContext)
    .replace('{{onitProfile}}', senderContext)
    .replace('{{customHint}}', customHint || 'No additional instructions.');

  const systemPrompt = template.systemPrompt;

  logger.debug(`[AI] Prompt built (${userPrompt.length} chars). Calling local Ollama server...`);

  // Call Groq/Ollama with retry (handles 429 rate-limits automatically)
  const responseText = await withRetry(
    () => callOllama(systemPrompt, userPrompt),
    {
      maxAttempts: 5,
      baseDelayMs: 2000,
      label: `Local AI generate email for ${recipient.companyName}`,
      shouldRetry: (err) => {
        // Don't retry on 400 Bad Request (bad model/prompt)
        if (err?.status === 400) return false;
        // Always retry on 429 rate limit — Groq will recover
        if (err?.status === 429) return true;
        return true;
      },
      getDelayMs: (attempt, err) => {
        // On rate limit (429), wait longer before retry
        if (err?.status === 429) {
          const retryAfter = parseInt(err?.headers?.['retry-after'] || '10', 10);
          logger.warn(`[Groq] Rate limited. Waiting ${retryAfter}s before retry...`);
          return retryAfter * 1000;
        }
        return 2000 * attempt;
      },
    }
  );

  // Parse the structured response
  const parsed = parseAIResponse(responseText);

  // Wrap in full HTML email template
  parsed.bodyHtml = wrapInEmailTemplate(parsed.bodyHtml, parsed.subject);
  parsed.bodyText = parsed.bodyText + onitProfile.signaturePlainText;

  logger.info(`[AI] Email generated successfully for: ${recipient.companyName}`);

  return {
    ...parsed,
    model: getModel(),
    promptUsed: `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}`,
  };
};

// ─── Ollama Local API Call ───────────────────────────────────────────────────

const callOllama = async (systemPrompt, userPrompt) => {
  const client = getOllamaClient();
  const model = getModel();

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 1200,
  });

  return completion.choices[0].message.content;
};

// ─── Response Parser ──────────────────────────────────────────────────────────

/**
 * Parse the AI's structured text response into subject, body, and notes.
 * The AI is instructed to respond in a specific delimited format.
 */
const parseAIResponse = (text) => {
  const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
  const bodyHtmlMatch = text.match(/BODY_HTML:\s*([\s\S]+?)(?:BODY_TEXT:|PERSONALIZATION_NOTES:|$)/i);
  const bodyTextMatch = text.match(/BODY_TEXT:\s*([\s\S]+?)(?:PERSONALIZATION_NOTES:|$)/i);
  const notesMatch = text.match(/PERSONALIZATION_NOTES:\s*([\s\S]+?)$/i);

  const subject = subjectMatch
    ? subjectMatch[1].trim()
    : 'Exploring a Collaboration Opportunity with ' + 'your team';

  let bodyHtml = bodyHtmlMatch
    ? bodyHtmlMatch[1].trim()
    : text; // Fallback: use full response as body

  const bodyText = bodyTextMatch
    ? bodyTextMatch[1].trim()
    : stripHtml(bodyHtml);

  const personalizationNotes = notesMatch
    ? notesMatch[1].trim()
    : '';

  return { subject, bodyHtml, bodyText, personalizationNotes };
};

const stripHtml = (html) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const wrapInEmailTemplate = (bodyHtml, subject) => {
  // Ensure body content uses <p> tags — convert bare newlines if AI gave plain text
  let content = bodyHtml.trim();
  if (!content.includes('<p') && !content.includes('<br')) {
    // Plain text fallback: wrap each paragraph in <p>
    content = content
      .split(/\n\n+/)
      .map(para => `<p style="margin: 0 0 14px 0;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Email from OnIT India'}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563EB 100%); padding: 24px 32px;">
              <p style="margin:0; font-size:20px; font-weight:bold; color:#ffffff; letter-spacing:0.5px;">OnIT India</p>
              <p style="margin:4px 0 0; font-size:12px; color:#a5c8ff;">Powering Businesses with Smart Technology</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px; color:#333333; font-size:15px; line-height:1.7;">
              ${content}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;"><hr style="border:none; border-top:1px solid #e5e7eb; margin:0;"></td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding: 24px 32px; background:#f9fafb;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-left: 3px solid #2563EB; padding-left: 12px;">
                    <p style="margin:0; font-size:14px; font-weight:bold; color:#1e3a5f;">OnIT India</p>
                    <p style="margin:2px 0 8px; font-size:12px; color:#6b7280;">Powering Businesses with Smart Technology</p>
                    <p style="margin:2px 0; font-size:12px; color:#374151;">🌐 <a href="https://www.onitindia.com" style="color:#2563EB; text-decoration:none;">www.onitindia.com</a></p>
                    <p style="margin:2px 0; font-size:12px; color:#374151;">🔗 <a href="https://www.linkedin.com/company/onit-india" style="color:#2563EB; text-decoration:none;">LinkedIn</a></p>
                    <p style="margin:2px 0; font-size:12px; color:#374151;">📧 <a href="mailto:outreach@onitindia.com" style="color:#2563EB; text-decoration:none;">outreach@onitindia.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px; background:#1e3a5f; text-align:center;">
              <p style="margin:0; font-size:11px; color:#9ca3af;">This email was sent by OnIT India's AI Outreach Platform. Please reply to unsubscribe.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ─── Sender Context Builder ───────────────────────────────────────────────────

const buildSenderContext = () => {
  const p = onitProfile;
  return `
SENDER COMPANY: ${p.companyName}
Tagline: ${p.tagline}
Mission: ${p.mission}
About: ${p.about}
Services:
${p.services.map((s) => `  - ${s.name}: ${s.description}`).join('\n')}
Value Proposition: ${p.valueProposition}
Key Differentiators:
${p.differentiators.map((d) => `  - ${d}`).join('\n')}
Website: ${p.website}
LinkedIn: ${p.linkedin}
Contact: ${p.email}
Tone Guidelines:
  - Overall: ${p.toneGuidelines.overall}
  - Avoid: ${p.toneGuidelines.avoid.join('; ')}
  - Prefer: ${p.toneGuidelines.prefer.join('; ')}
`.trim();
};

// ─── Template Loader ──────────────────────────────────────────────────────────

const loadTemplate = async (outreachType) => {
  // Try to find a custom template in DB
  try {
    const dbTemplate = await Template.findOne({ outreachType, isActive: true });
    if (dbTemplate) {
      logger.debug(`[AI] Using DB template for: ${outreachType}`);
      return dbTemplate;
    }
  } catch {
    // DB not available or template not found — use built-in
  }

  logger.debug(`[AI] Using built-in template for: ${outreachType}`);
  return getBuiltInTemplate(outreachType);
};

/**
 * Built-in prompt templates for each outreach type.
 * These are used if no custom template exists in the database.
 */
const getBuiltInTemplate = (outreachType) => {
  const templates = {
    partnership: {
      systemPrompt: `You are a professional business development writer for OnIT India, a technology company based in India. Your job is to write highly personalized, genuine outreach emails that feel specifically written for the recipient — not templates. You deeply understand the recipient's business and reference it meaningfully. You write with confidence, warmth, and clarity. You NEVER use generic phrases like "I hope this email finds you well" or "I'm reaching out to introduce". Keep emails under 220 words. Always respond in the exact structured format requested.`,
      userPromptTemplate: `Write a personalized business partnership outreach email.

RECIPIENT INFORMATION:
{{recipientData}}

SENDER INFORMATION:
{{onitProfile}}

ADDITIONAL INSTRUCTIONS:
{{customHint}}

IMPORTANT RULES:
1. Reference something SPECIFIC about the recipient's business, product, or mission
2. Connect their work to what OnIT India does — find the natural intersection
3. State the partnership value clearly without being vague
4. End with a single, specific, low-pressure call to action (e.g. "Would a 20-minute call next week work?")
5. Do NOT use placeholder text like [Company Name] — use the actual company name
6. Keep it genuine, warm, and under 220 words

Respond ONLY in this exact format:
SUBJECT: [your subject line here]
BODY_HTML: [full email body using proper HTML — wrap each paragraph in <p style="margin: 0 0 14px 0;"> tags, use <br> for line breaks within paragraphs. No tables. Clean, readable HTML only.]
BODY_TEXT: [plain text version of the same email body]
PERSONALIZATION_NOTES: [1-2 sentences explaining what specific data you used to personalize this email]`,
    },

    sales: {
      systemPrompt: `You are a senior B2B sales writer for OnIT India. You write concise, value-focused sales emails that respect the reader's time. You never oversell or use hype. You identify a real problem the recipient's company might face and position OnIT India as the solution. Always be specific about the industry and their business. Keep emails under 200 words.`,
      userPromptTemplate: `Write a personalized sales outreach email for OnIT India's technology services.

RECIPIENT INFORMATION:
{{recipientData}}

SENDER INFORMATION (OnIT India):
{{onitProfile}}

ADDITIONAL INSTRUCTIONS:
{{customHint}}

RULES:
1. Identify a realistic technology challenge or opportunity for this specific company/industry
2. Show how OnIT India can solve it — be specific, not generic
3. Use their industry language naturally
4. No buzzwords, no fluff
5. Clear CTA at the end

Respond in this exact format:
SUBJECT: [subject line]
BODY_HTML: [email body in HTML paragraphs]
BODY_TEXT: [plain text version]
PERSONALIZATION_NOTES: [what specific details you referenced]`,
    },

    startup_collab: {
      systemPrompt: `You are writing on behalf of OnIT India to propose collaboration with a startup. Your tone is founder-to-founder: peer-level, enthusiastic, and respectful of their work. You understand the startup world. Reference their product, market, or stage meaningfully. Keep it under 200 words and feel genuinely excited about their work.`,
      userPromptTemplate: `Write a startup collaboration email.

STARTUP INFORMATION:
{{recipientData}}

ONIT INDIA (sender):
{{onitProfile}}

ADDITIONAL INSTRUCTIONS:
{{customHint}}

RULES:
1. Show genuine familiarity with what they are building
2. Propose a specific collaboration angle (not generic "let's partner")
3. Be peer-level, not corporate
4. Under 200 words

Format:
SUBJECT: [subject]
BODY_HTML: [HTML body]
BODY_TEXT: [plain text]
PERSONALIZATION_NOTES: [what you referenced]`,
    },

    investor: {
      systemPrompt: `You are writing a professional investor outreach email on behalf of OnIT India. The tone is confident and strategic. You understand what investors look for. Reference the investor's known portfolio or focus area if possible. Keep it concise, under 180 words. Include a soft ask for a brief call or meeting.`,
      userPromptTemplate: `Write an investor outreach email.

INVESTOR/VC INFORMATION:
{{recipientData}}

ONIT INDIA (sender):
{{onitProfile}}

ADDITIONAL INSTRUCTIONS:
{{customHint}}

RULES:
1. Respect the investor's time — be direct
2. Mention what traction or proof points OnIT India has if possible
3. Reference their portfolio or investment thesis if known
4. Clear, soft CTA

Format:
SUBJECT: [subject]
BODY_HTML: [HTML body]
BODY_TEXT: [plain text]
PERSONALIZATION_NOTES: [what you referenced]`,
    },

    networking: {
      systemPrompt: `You are writing a warm, genuine networking email. No sales pitch. The goal is to start a real professional relationship. Be curious, respectful, and specific about why you are reaching out to THIS person or company specifically.`,
      userPromptTemplate: `Write a professional networking email.

RECIPIENT:
{{recipientData}}

FROM (OnIT India):
{{onitProfile}}

ADDITIONAL INSTRUCTIONS:
{{customHint}}

RULES:
1. Be genuinely curious about their work
2. No hard asks — keep it light
3. Reference something specific about them
4. Under 150 words

Format:
SUBJECT: [subject]
BODY_HTML: [HTML body]
BODY_TEXT: [plain text]
PERSONALIZATION_NOTES: [what you referenced]`,
    },

    hiring: {
      systemPrompt: `You are a talent acquisition professional writing a recruiting outreach email on behalf of OnIT India. You are reaching out to a talented individual or a company's HR/talent team. Be respectful, specific about the opportunity, and make it about them — not just about OnIT India's needs.`,
      userPromptTemplate: `Write a recruiting/hiring outreach email.

RECIPIENT INFO:
{{recipientData}}

ONIT INDIA:
{{onitProfile}}

ADDITIONAL INSTRUCTIONS:
{{customHint}}

Format:
SUBJECT: [subject]
BODY_HTML: [HTML body]
BODY_TEXT: [plain text]
PERSONALIZATION_NOTES: [what you referenced]`,
    },

    internship: {
      systemPrompt: `You are writing on behalf of OnIT India to propose an internship partnership with a college, university, or educational institution. The tone is professional, collaborative, and mutually beneficial. Emphasize what students gain AND what the institution gains.`,
      userPromptTemplate: `Write an internship partnership email.

INSTITUTION INFORMATION:
{{recipientData}}

ONIT INDIA:
{{onitProfile}}

ADDITIONAL INSTRUCTIONS:
{{customHint}}

Format:
SUBJECT: [subject]
BODY_HTML: [HTML body]
BODY_TEXT: [plain text]
PERSONALIZATION_NOTES: [what you referenced]`,
    },

    custom: {
      systemPrompt: `You are a professional business communication writer for OnIT India. Write a personalized, high-quality email that feels genuinely written for this specific recipient. Follow any custom instructions provided.`,
      userPromptTemplate: `Write a custom outreach email.

RECIPIENT:
{{recipientData}}

FROM (OnIT India):
{{onitProfile}}

CUSTOM INSTRUCTIONS:
{{customHint}}

Format:
SUBJECT: [subject]
BODY_HTML: [HTML body]
BODY_TEXT: [plain text]
PERSONALIZATION_NOTES: [what you referenced]`,
    },
  };

  return templates[outreachType] || templates.custom;
};

module.exports = { generateEmail };
