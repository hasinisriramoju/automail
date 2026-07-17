/**
 * @file src/config/onitProfile.js
 * @description OnIT India — Sender Profile (Single Source of Truth)
 *
 * This file contains everything about OnIT India as a company.
 * It is injected into every AI prompt automatically so that
 * generated emails always accurately represent the company.
 *
 * Edit this file to update the company's profile, services,
 * team details, or email signature without touching any other code.
 */

const onitProfile = {
  // ─── Company Identity ─────────────────────────────────────────────────────
  companyName: 'OnIT India',
  tagline: 'Powering Businesses with Smart Technology',
  foundedYear: 2023,
  location: 'India',

  // ─── Mission & Vision ─────────────────────────────────────────────────────
  mission:
    'To empower businesses of all sizes with cutting-edge technology solutions that accelerate growth, streamline operations, and create lasting digital impact.',
  vision:
    'To be the most trusted technology partner for startups and enterprises across India and beyond, recognized for our innovation, quality, and client-centric approach.',

  // ─── About ────────────────────────────────────────────────────────────────
  about:
    'OnIT India is a technology company specializing in end-to-end IT solutions, software development, AI-powered products, and digital transformation services. We partner with startups, SMEs, and enterprises to build scalable, intelligent software that drives real business outcomes. Our team combines technical excellence with a deep understanding of business strategy to deliver solutions that matter.',

  // ─── Core Services ────────────────────────────────────────────────────────
  services: [
    {
      name: 'Custom Software Development',
      description:
        'We build scalable, production-ready web and mobile applications tailored to your specific business needs using modern technology stacks.',
    },
    {
      name: 'AI & Machine Learning Integration',
      description:
        'We integrate AI, ML, and NLP capabilities into existing or new products — from recommendation engines and chatbots to intelligent automation pipelines.',
    },
    {
      name: 'Cloud Solutions & DevOps',
      description:
        'End-to-end cloud architecture, CI/CD pipeline setup, infrastructure automation, and managed deployment on AWS, GCP, and Azure.',
    },
    {
      name: 'UI/UX Design & Product Strategy',
      description:
        'Human-centered product design, wireframing, prototyping, and design systems that result in intuitive, beautiful user experiences.',
    },
    {
      name: 'IT Consulting & Digital Transformation',
      description:
        'Strategic technology consulting to help organizations modernize legacy systems, adopt new technologies, and build a roadmap for long-term digital success.',
    },
    {
      name: 'Startup Technology Partnership',
      description:
        'We partner with early-stage and growth-stage startups as their fractional CTO and technology team — building MVPs, scaling infrastructure, and validating product-market fit.',
    },
  ],

  // ─── Value Proposition ────────────────────────────────────────────────────
  valueProposition:
    'We bridge the gap between business ambition and technology execution. Unlike large IT firms where clients get lost in bureaucracy, OnIT India offers direct engagement with senior engineers and strategists who treat every project as if it were their own startup.',

  // ─── Differentiators ──────────────────────────────────────────────────────
  differentiators: [
    'Dedicated senior team — no outsourcing, no juniors running your product',
    'AI-first approach built into every solution we deliver',
    'Transparent delivery with weekly milestones and live dashboards',
    'Flexible engagement: project-based, retainer, or co-founder tech partnership',
    'Deep expertise across fintech, healthtech, edtech, SaaS, and e-commerce verticals',
  ],

  // ─── Contact & Online Presence ────────────────────────────────────────────
  website: 'https://www.onitindia.com',
  linkedin: 'https://www.linkedin.com/company/onit-india',
  email: 'outreach@onitindia.com',
  phone: '+91-XXXXXXXXXX',

  // ─── Team ─────────────────────────────────────────────────────────────────
  team: [
    {
      name: 'Founder & CEO',
      role: 'Founder & CEO',
      linkedin: '',
    },
  ],

  // ─── Email Signature (HTML) ───────────────────────────────────────────────
  signatureHtml: `
<br/>
<table style="font-family: Arial, sans-serif; font-size: 13px; color: #333; border-collapse: collapse;">
  <tr>
    <td style="padding: 8px 12px; border-left: 3px solid #2563EB;">
      <strong style="font-size: 15px; color: #1e40af;">OnIT India</strong><br/>
      <span style="color: #555;">Powering Businesses with Smart Technology</span><br/><br/>
      <span>🌐 <a href="https://www.onitindia.com" style="color: #2563EB; text-decoration: none;">www.onitindia.com</a></span><br/>
      <span>🔗 <a href="https://www.linkedin.com/company/onit-india" style="color: #2563EB; text-decoration: none;">LinkedIn</a></span><br/>
      <span>📧 <a href="mailto:outreach@onitindia.com" style="color: #2563EB; text-decoration: none;">outreach@onitindia.com</a></span>
    </td>
  </tr>
</table>
`,

  // ─── Email Signature (Plain Text) ────────────────────────────────────────
  signaturePlainText: `
--
OnIT India | Powering Businesses with Smart Technology
Website: https://www.onitindia.com
LinkedIn: https://www.linkedin.com/company/onit-india
Email: outreach@onitindia.com
`,

  // ─── Tone Guidelines for AI ───────────────────────────────────────────────
  toneGuidelines: {
    overall: 'Professional yet warm. Confident but not pushy. Concise and value-driven.',
    avoid: [
      'Generic greetings like "I hope this email finds you well"',
      'Overly formal language that sounds robotic',
      'Hollow buzzwords without substance',
      'Making promises we cannot keep',
      'Sounding desperate or sales-y',
    ],
    prefer: [
      'Lead with insight about the recipient\'s business',
      'Reference something specific and real about their work',
      'State value clearly and early',
      'Keep it under 250 words unless follow-up context requires more',
      'End with a clear, low-friction call to action',
    ],
  },
};

module.exports = onitProfile;
