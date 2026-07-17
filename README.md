# OnIT India — AI-Powered Email Outreach Platform

> A production-ready Node.js + Express application that uses GPT-4o to generate hyper-personalized outreach emails for OnIT India. Every email is uniquely crafted for its recipient — no templates, no placeholders.

---

## Features

- 🤖 **AI-Personalized Emails** — GPT-4o generates unique emails for each recipient based on their company, industry, products, and website content
- 🔍 **Automatic Web Research** — Scrapes recipient websites to extract company context before generating emails
- 📧 **8 Outreach Types** — Partnership, Sales, Startup Collab, Investor, Networking, Hiring, Internship, Custom
- 📋 **Draft → Review → Send** workflow with manual editing support
- 📅 **Scheduled Sending** — Schedule individual emails or full campaigns
- 🚀 **Bulk Campaigns** — Generate and send unique emails to hundreds of recipients with anti-spam throttling
- 🔄 **Follow-up Automation** — Generate contextual follow-up emails
- 📊 **Email History & Status Tracking** — Draft, Scheduled, Sent, Failed
- 📎 **Attachment Support**
- 🔁 **Retry Logic** — Exponential backoff for AI calls and SMTP sends
- 📝 **Winston Logging** — Structured logs to console and rotating files

---

## Quick Start

### 1. Install dependencies

```bash
cd autoemail
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values:
# - MONGODB_URI
# - OPENAI_API_KEY
# - SMTP credentials
```

### 3. Start MongoDB

Make sure MongoDB is running locally:
```bash
mongod --dbpath /usr/local/var/mongodb
# OR use MongoDB Atlas (set MONGODB_URI in .env)
```

### 4. Start the server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

---

## Configuration

Edit `.env` for all configuration. Edit `src/config/onitProfile.js` to update **OnIT India's company profile, services, signature, and tone guidelines**.

---

## API Reference

### Base URL: `http://localhost:5000/api`

---

### Recipients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/recipients` | Add a new recipient |
| `GET` | `/recipients` | List recipients (supports `?search=`, `?industry=`, `?outreachType=`, `?status=`, `?page=`, `?limit=`) |
| `GET` | `/recipients/:id` | Get a single recipient |
| `PUT` | `/recipients/:id` | Update a recipient |
| `DELETE` | `/recipients/:id` | Delete a recipient |
| `POST` | `/recipients/:id/research` | Trigger web research/enrichment |

**Create recipient example:**
```json
POST /api/recipients
{
  "companyName": "Razorpay",
  "contactName": "Harshil Mathur",
  "contactTitle": "CEO",
  "email": "harshil@razorpay.com",
  "industry": "Fintech",
  "fundingStage": "Series F",
  "website": "https://razorpay.com",
  "linkedinUrl": "https://linkedin.com/company/razorpay",
  "outreachType": "partnership",
  "description": "India's leading payment gateway serving 8M+ businesses"
}
```

---

### Emails

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/emails/generate` | Generate AI email draft |
| `GET` | `/emails` | List emails (filter by `?status=`, `?outreachType=`, etc.) |
| `GET` | `/emails/stats` | Aggregate stats by status and type |
| `GET` | `/emails/:id` | Get a single email |
| `PUT` | `/emails/:id` | Edit a draft |
| `DELETE` | `/emails/:id` | Delete a draft |
| `POST` | `/emails/:id/send` | Send email immediately |
| `POST` | `/emails/:id/schedule` | Schedule for later |
| `POST` | `/emails/:id/followup` | Generate a follow-up draft |

**Generate email example:**
```json
POST /api/emails/generate
{
  "recipientId": "6686f1a2c8e3d4b9a1234567",
  "outreachType": "partnership",
  "customHint": "Emphasize our fintech experience and payment integration capabilities"
}
```

**Response includes:**
- `subject` — AI-generated subject line
- `bodyHtml` — Full HTML email body
- `bodyText` — Plain text version
- `personalizationNotes` — What the AI referenced to personalize this email

---

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/campaigns` | Create a bulk campaign |
| `GET` | `/campaigns` | List campaigns |
| `GET` | `/campaigns/:id` | Get campaign + stats |
| `POST` | `/campaigns/:id/generate` | Generate AI drafts for all recipients |
| `POST` | `/campaigns/:id/start` | Start sending |
| `POST` | `/campaigns/:id/pause` | Pause a running campaign |
| `DELETE` | `/campaigns/:id` | Delete a draft campaign |

**Create campaign example:**
```json
POST /api/campaigns
{
  "name": "July 2025 Startup Outreach",
  "outreachType": "startup_collab",
  "recipientIds": ["id1", "id2", "id3"],
  "delayBetweenEmailsMs": 5000,
  "customPromptHint": "Focus on AI and ML collaboration opportunities"
}
```

**Workflow:**
1. Create campaign → `POST /campaigns`
2. Generate unique drafts → `POST /campaigns/:id/generate` (async)
3. Review drafts → `GET /emails?campaignId=:id`
4. Edit any draft → `PUT /emails/:id`
5. Start sending → `POST /campaigns/:id/start` (async, rate-throttled)

---

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/templates` | List active templates |
| `GET` | `/templates/:id` | Get a template |
| `POST` | `/templates` | Create custom AI prompt template |
| `PUT` | `/templates/:id` | Update template |
| `DELETE` | `/templates/:id` | Deactivate template |

---

## Project Structure

```
autoemail/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── mailer.js          # Nodemailer SMTP
│   │   ├── openai.js          # OpenAI client
│   │   └── onitProfile.js     # ⭐ OnIT India brand profile
│   ├── models/
│   │   ├── Recipient.js
│   │   ├── Email.js
│   │   ├── Campaign.js
│   │   └── Template.js
│   ├── services/
│   │   ├── researchService.js  # Web scraping + context building
│   │   ├── aiService.js        # GPT-4o email generation
│   │   ├── emailService.js     # Nodemailer sending
│   │   ├── campaignService.js  # Bulk orchestration
│   │   └── schedulerService.js # node-cron background jobs
│   ├── controllers/
│   │   ├── recipientController.js
│   │   ├── emailController.js
│   │   ├── campaignController.js
│   │   └── templateController.js
│   ├── routes/
│   │   ├── recipients.js
│   │   ├── emails.js
│   │   ├── campaigns.js
│   │   └── templates.js
│   ├── middleware/
│   │   ├── validateRequest.js  # Joi validation
│   │   ├── errorHandler.js     # Centralized errors
│   │   └── rateLimiter.js      # Rate limiting
│   ├── utils/
│   │   ├── logger.js           # Winston logging
│   │   ├── retryHelper.js      # Exponential backoff
│   │   └── scraper.js          # Cheerio web scraper
│   └── app.js                  # Express setup
├── server.js                   # Entry point
├── .env.example
└── package.json
```

---

## Updating OnIT India's Profile

Edit `src/config/onitProfile.js` to update:
- Company name, tagline, mission, vision
- Services and value proposition
- Team members
- Email signature (HTML + plain text)
- Tone guidelines for the AI

All changes automatically apply to every generated email.

---

## Logs

Logs are written to the `logs/` directory:
- `logs/combined.log` — All log levels
- `logs/error.log` — Errors only

The `logs/` directory is created automatically.

---

## Future Roadmap

- [ ] Analytics dashboard (React frontend)
- [ ] CRM integration (HubSpot, Salesforce)
- [ ] Email open/reply tracking (webhooks)
- [ ] A/B testing for subject lines
- [ ] AI campaign optimization
- [ ] Multi-user accounts with OAuth login
- [ ] Multiple SMTP providers per campaign
- [ ] LinkedIn API integration for profile enrichment
- [ ] News API integration for recent news context
- [ ] Email sequence automation
- [ ] Unsubscribe management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| AI | OpenAI GPT-4o |
| Email | Nodemailer |
| Scraping | Axios + Cheerio |
| Scheduling | node-cron |
| Validation | Joi |
| Logging | Winston |
| Security | Helmet + express-rate-limit |

---

*Built for OnIT India — Powering Businesses with Smart Technology*
