# 🚀 ClientFlow AI — WhatsApp Business Automation

A full-stack WhatsApp CRM & automation platform for freelancers and small businesses. Handles client onboarding, AI responses, payments, follow-ups, reviews, broadcasts, and more — all from one dark dashboard.

---

## ✨ Features

- 🤖 **Multi-AI Fallback** — Claude → GPT-4o → Gemini → Groq (auto-switches on credit exhaustion)
- 💬 **WhatsApp Automation** — Auto-reply, onboarding, pricing, payment flow via Meta Cloud API
- 💰 **Payments** — Easypaisa / JazzCash / Bank with screenshot confirmation
- 📊 **Analytics Dashboard** — Revenue charts, message volume, conversion funnel, AI usage
- 📅 **Follow-Up Engine** — Cron-based: cold leads, pending payments, post-delivery, re-engagement
- 📢 **Broadcasts** — Targeted bulk messages with AI writer + scheduling
- ⭐ **Reviews & Sentiment** — Auto-collect ratings, sentiment analysis charts
- 🔔 **Real-time Alerts** — Socket.io for new clients, flagged queries, payment alerts
- 👥 **CRM** — Full client profiles, chat history, payment history, referral tracking
- 🧠 **Lead Intelligence** — Auto lead scoring (0-100), hot/warm/cold temperature, behavior tags
- 📈 **Advanced Funnel Analytics** — Sent → Delivered → Seen → Replied → Converted metrics + rates
- ⏱️ **Best Send Time Insights** — Hourly reply-rate analysis for campaign timing
- 🔁 **Drip Follow-Up Foundations** — Sequence + step schema for Day 1 / Day 3 / Day 7 style automations
- 📨 **Inbox Foundations** — Conversation statuses (open/pending/resolved), agent assignment, starred and internal notes
- 🧪 **Contact Intelligence Tools** — custom contact fields + duplicate detection & merge APIs
- ⚙️ **Queue-first Delivery** — message jobs table + worker with retry/backoff for stable bulk sends

---

## 📁 Project Structure

```
clientflow-ai/
├── frontend/          # React + Vite + Tailwind CSS
│   └── src/
│       ├── components/   Sidebar, StatCard, ChatBubble, AlertBell, DataTable, Toast
│       └── pages/        13 dashboard pages
├── backend/           # Node.js + Express
│   ├── routes/           15 API route files
│   ├── services/         aiService, whatsappService, cronService
│   ├── middleware/        JWT auth
│   └── db/               PostgreSQL pool
├── database/
│   ├── schema.sql        14 tables
│   └── seed.sql          Sample services + default settings
├── .env.example
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- WhatsApp Business account (Meta Developer Portal)
- At least one AI API key (Claude recommended)

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Database Setup

```bash
psql -U postgres -c "CREATE DATABASE clientflow;"
psql -U postgres -d clientflow -f database/schema.sql
psql -U postgres -d clientflow -f database/seed.sql
```

### 3. Environment Variables

```bash
cp .env.example backend/.env
# Edit backend/.env with your values
```

**Required:**

| Variable | Where to get |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/clientflow` |
| `JWT_SECRET` | Any long random string |
| `OWNER_EMAIL` | Your dashboard login email |
| `OWNER_PASSWORD` | Your dashboard login password |
| `WHATSAPP_TOKEN` | Meta Developer Portal |
| `WHATSAPP_PHONE_ID` | Meta Developer Portal |
| `WHATSAPP_VERIFY_TOKEN` | Any custom string (you choose) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `FRONTEND_URL` | `http://localhost:5173` |

**Optional (AI fallback):**
```
OPENAI_API_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

### 4. Run Locally

```bash
# Terminal 1
cd backend && npm run dev    # → http://localhost:5000

# Terminal 2
cd frontend && npm run dev   # → http://localhost:5173
```

Login at `http://localhost:5173` with `OWNER_EMAIL` / `OWNER_PASSWORD`.

---

## 🧭 Product Direction (Platform, not just sender)

ClientFlow AI is designed as an **AI-powered WhatsApp Marketing & CRM platform** with phased execution:

1. **Phase 1:** Reliable messaging + contact capture
2. **Phase 2:** Multi-step follow-ups + behavior triggers
3. **Phase 3:** CRM intelligence + full-funnel analytics
4. **Phase 4:** AI personalization + automation builder
5. **Phase 5:** Multi-channel expansion (Email/SMS/Telegram)

This repo now includes core building blocks for phases 2 and 3:
- lead scoring engine (`backend/services/leadScoringService.js`)
- advanced funnel and best-time analytics (`/api/analytics/funnel-advanced`, `/api/analytics/best-send-times`)
- drip-sequence schema (`follow_up_sequences`, `follow_up_sequence_steps`)
- client insights API (`/api/clients/:id/insights`)
- unified inbox APIs (`/api/inbox/conversations`, assignment/status/notes/timeline endpoints)
- queue-based send pipeline (`message_jobs`, queue worker, broadcast enqueue flow)
- optional BullMQ + Redis mode for production worker scaling (`REDIS_URL`)
- full product architecture blueprint in `docs/FULL_PRODUCT_BLUEPRINT.md`

---

## 🧠 AI Architecture (Modular Provider System)

Backend AI layer now follows a single interface pattern:

`User Request → AI Manager → Selected Provider → Response`

```text
backend/ai/
  aiConfig.js
  aiManager.js
  providers/
    groq.js
    openai.js
    claude.js
    gemini.js
```

- **Groq is active** when `GROQ_API_KEY` is configured.
- Other providers are plug-ready and enabled via env keys.
- Provider selection supports explicit preference + automatic fallback order.
- AI manager includes request queueing + short TTL cache to reduce duplicate calls.

New AI APIs:
- `POST /api/ai/write-broadcast`
- `POST /api/ai/suggest-reply`
- `POST /api/ai/summarize-chat`
- `POST /api/ai/classify`
- `POST /api/ai/translate`
- `GET /api/ai/health`

---

## 📱 WhatsApp Webhook Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Add WhatsApp product → Get **Phone Number ID** and **Access Token**
3. Webhook URL: `https://your-domain.com/webhook`
4. Verify token: same as `WHATSAPP_VERIFY_TOKEN` in `.env`
5. Subscribe to: `messages`, `message_deliveries`, `message_reads`

**Local testing with ngrok:**
```bash
ngrok http 5000
# Use the HTTPS URL as webhook
```

---

## 🚀 Deployment

**Frontend → Vercel:** Build with `npm run build`, deploy `/dist`

**Backend → Railway:**
1. Push to GitHub
2. Connect to [railway.app](https://railway.app) → Add PostgreSQL plugin
3. Set all env vars → Deploy

---

## 🔧 First Login Checklist

1. ⚙️ **Settings** → Add business name, payment numbers (Easypaisa/JazzCash), AI API keys
2. 📦 **Services** → Add your service offerings with prices
3. ✅ Toggle **Auto-Reply** ON in Settings
4. 🔗 Connect WhatsApp webhook
5. 💬 Send a test WhatsApp message to your number

---

## 🤖 AI Providers

| Provider | Key From | Fallback Priority |
|---|---|---|
| Claude Sonnet | console.anthropic.com | 1st |
| GPT-4o | platform.openai.com | 2nd |
| Gemini 1.5 Flash | aistudio.google.com | 3rd |
| Groq Llama 3.3 | console.groq.com | 4th |

System auto-falls back on 429 / credit errors. Check `/api/ai/health` for provider status.

---

## 🆘 Common Issues

| Problem | Fix |
|---|---|
| "Invalid credentials" on login | Check `OWNER_EMAIL`/`OWNER_PASSWORD` in `backend/.env` |
| WhatsApp not receiving messages | Verify webhook is HTTPS, verify token matches |
| AI not responding | Check API key in Settings, visit `/api/ai/health` |
| Database errors | Make sure `schema.sql` ran before `seed.sql` |
| CORS errors | Set `FRONTEND_URL` correctly in `.env` |

---

Built with ❤️ using React, Node.js, PostgreSQL, and WhatsApp Business API.
