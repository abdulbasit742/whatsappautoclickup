# ClientFlow AI — Full-Stack SaaS Platform

> AI-powered CRM + WhatsApp Inbox + Campaign Engine + Analytics + Billing + Integrations

---

## 🚀 What is ClientFlow AI?

ClientFlow AI is a complete business automation SaaS built for agencies, freelancers, and service businesses. It combines:

- **WhatsApp-like operational dashboard** — inbox, CRM, follow-ups
- **AI assistant layer** — Groq, Claude, OpenAI, Gemini support with automatic failover
- **Campaign engine** — broadcasts, drip campaigns, A/B testing
- **Business reporting** — analytics, revenue, AI usage
- **Admin controls** — multi-user roles, API keys, integrations

---

## ✨ Features

### Core Platform
- ✅ Auth system with multi-user roles (Admin, Agent, Viewer)
- ✅ JWT authentication with owner + database user support
- ✅ Responsive dark-mode dashboard
- ✅ Collapsible grouped sidebar navigation

### CRM
- ✅ Contacts/Clients management
- ✅ Leads pipeline (New → Contacted → Qualified → Proposal → Won/Lost)
- ✅ Lead scoring (manual + AI-powered)
- ✅ Tags system with color coding
- ✅ Structured notes with types (general, call, meeting, AI summary)
- ✅ Follow-up status, payment status, issue status per lead
- ✅ Assigned agent per lead
- ✅ Customer history

### Chat / Inbox
- ✅ WhatsApp-style inbox UI
- ✅ Conversation panel with chat bubbles
- ✅ Client intelligence panel
- ✅ Message search and filters
- ✅ Quick replies and templates
- ✅ AI reply suggestions
- ✅ Broadcasts with audience targeting

### AI Dashboard
- ✅ Groq (LLaMA 3.3 70B) — primary provider
- ✅ Claude (Sonnet) — failover
- ✅ OpenAI GPT-4o — failover
- ✅ Google Gemini — failover
- ✅ AI message/broadcast generator
- ✅ AI reply suggestions
- ✅ AI chat summary (saved as notes)
- ✅ AI issue detection with alert creation
- ✅ AI lead scoring with database update
- ✅ AI follow-up suggestions
- ✅ AI recommendation engine (business insights)
- ✅ AI usage statistics and logs
- ✅ Provider health monitoring

### Campaigns
- ✅ Broadcast campaigns (WhatsApp)
- ✅ Contact lists (reusable)
- ✅ Drip campaigns with multi-step sequences
- ✅ Variable delay between steps
- ✅ Campaign enrollment from contact lists
- ✅ Pause/resume campaigns
- ✅ A/B testing with variant tracking
- ✅ Campaign scheduling

### Business System
- ✅ Payments tracking (Easypaisa, JazzCash, bank, cash)
- ✅ Services catalog
- ✅ Plans & Subscriptions
- ✅ Invoice management
- ✅ Reviews & ratings
- ✅ Referral system
- ✅ Admin alerts

### Integrations
- ✅ Gmail (OAuth configuration)
- ✅ Google Calendar
- ✅ ClickUp
- ✅ Make (Integromat) webhooks
- ✅ Stripe, PayPal, Razorpay (config)
- ✅ Webhook endpoints with event selection
- ✅ API Key Manager (generate, revoke, scope-based)

### Analytics
- ✅ Revenue analytics
- ✅ Message volume and reply rates
- ✅ Client activity (status breakdown)
- ✅ AI usage and provider breakdown
- ✅ Follow-up completion rates
- ✅ Campaign performance
- ✅ Lead pipeline analytics

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Real-time | Socket.IO |
| AI | Groq / Claude / OpenAI / Gemini |
| Scheduling | node-cron |
| Auth | JWT |
| File uploads | Multer |

---

## 📦 Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database

```bash
psql -U postgres -c "CREATE DATABASE clientflow"
psql -U postgres -d clientflow -f ../database/schema.sql
```

### 3. Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Run

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `WHATSAPP_TOKEN` | WhatsApp Business Cloud API token |
| `WHATSAPP_PHONE_ID` | WhatsApp phone number ID |
| `GROQ_API_KEY` | Groq API key (primary AI) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (32+ chars) |
| `OWNER_EMAIL` | Admin login email |
| `OWNER_PASSWORD` | Admin login password |

---

## 🗺 Roadmap (Future Phases)

- [ ] WhatsApp Cloud API webhook automation
- [ ] ClickUp task creation from leads
- [ ] Gmail thread sync
- [ ] Google Calendar appointment booking
- [ ] Make/Zapier scenario triggers
- [ ] Mobile app (React Native)
- [ ] White-label support
- [ ] Multi-tenant architecture

---

## ⚠️ Ethical Use Policy

This platform is built for **ethical, consent-based communication** only. The following are explicitly NOT supported:

- Fake followers / artificial engagement
- Geo-spoofing for deception
- Anti-ban/anti-detection evasion
- Scraping private contacts without consent
- Mass unsolicited outreach
- Group/channel abuse automation

Instead, the platform uses:
- Opt-in contact management
- Consent-based messaging
- Admin approval workflows
- Official WhatsApp Business API
- Real engagement analytics

---

Built with ❤️ by the ClientFlow AI team.
