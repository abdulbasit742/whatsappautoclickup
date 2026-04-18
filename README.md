# 🚀 ClientFlow AI — WhatsApp CRM + Automation SaaS

A full AI-powered CRM & WhatsApp Business automation platform for freelancers and small businesses. Handles client onboarding, AI-generated replies, payments (Easypaisa / JazzCash / Bank), follow-up sequences, reviews, broadcasts, and a rich analytics dashboard — all from one dark, modern UI.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│           React 18 + Vite + Tailwind CSS + Recharts          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                   NGINX (Port 80)                            │
│       Static files + reverse-proxy to backend               │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│               BACKEND API (Node.js / Express)                │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │   15 Routes  │  │   Socket.io     │  │  Cron Jobs    │  │
│  │  REST API    │  │  Real-time push │  │  Follow-ups   │  │
│  └──────────────┘  └─────────────────┘  └───────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            AI Service (Multi-Provider Fallback)          │ │
│  │   Claude → GPT-4o → Gemini 1.5 Flash → Groq Llama 3.3  │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           WhatsApp Cloud API Service                     │ │
│  │     Webhook ingestion + outbound message dispatch        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              PostgreSQL 16 Database                          │
│   14 tables: clients, messages, payments, services,          │
│   alerts, reviews, broadcasts, templates, appointments,      │
│   referrals, follow_ups, ai_logs, settings, ...             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
clientflow-ai/
├── backend/
│   ├── db/index.js              PostgreSQL pool
│   ├── middleware/auth.js        JWT authentication
│   ├── routes/                   15 REST route files
│   │   ├── webhook.js            WhatsApp webhook (verify + inbound)
│   │   ├── ai.js                 AI writer, reply suggestion, upsell
│   │   ├── auth.js               Login / JWT issue
│   │   ├── clients.js            CRUD + client search
│   │   ├── payments.js           Payment confirmation + screenshot
│   │   ├── broadcasts.js         Bulk messaging + scheduling
│   │   ├── followups.js          Follow-up scheduler
│   │   ├── analytics.js          Revenue + message + AI charts
│   │   ├── appointments.js       Booking management
│   │   ├── referrals.js          Referral tracking
│   │   ├── reviews.js            Review collection + sentiment
│   │   ├── services.js           Service catalog
│   │   ├── templates.js          Message templates
│   │   ├── alerts.js             Real-time alerts
│   │   └── settings.js           Business config
│   ├── services/
│   │   ├── aiService.js          Multi-provider AI with auto-fallback
│   │   ├── whatsappService.js    Meta Cloud API wrapper
│   │   └── cronService.js        Follow-up + reminder cron jobs
│   ├── server.js                 Express + Socket.io entry point
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/           Sidebar, StatCard, ChatBubble, AlertBell, Toast
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/                13 dashboard pages
│   │   │   ├── Dashboard.jsx     Stats + revenue chart + recent activity
│   │   │   ├── Inbox.jsx         Real-time chat with AI reply suggestions
│   │   │   ├── Clients.jsx       Client list + search + filters
│   │   │   ├── ClientProfile.jsx Full profile + chat + payment history
│   │   │   ├── Payments.jsx      Payment confirmation + status management
│   │   │   ├── Analytics.jsx     Revenue, messages, AI usage charts
│   │   │   ├── Broadcasts.jsx    AI-assisted bulk messaging
│   │   │   ├── Followups.jsx     Follow-up queue management
│   │   │   ├── Reviews.jsx       Star ratings + sentiment dashboard
│   │   │   ├── Services.jsx      Service catalog CRUD
│   │   │   ├── Templates.jsx     Reusable message templates
│   │   │   ├── Appointments.jsx  Appointment booking
│   │   │   ├── Referrals.jsx     Referral tracking
│   │   │   └── Settings.jsx      Business config + AI keys
│   │   └── utils/api.js          Axios instance with auth interceptor
│   ├── nginx.conf                Production reverse-proxy config
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── database/
│   ├── schema.sql                14-table PostgreSQL schema
│   └── seed.sql                  Sample services + default settings
├── docker-compose.yml            Full-stack Docker deployment
├── .env.example                  Local development env template
├── .env.docker                   Docker deployment env template
└── README.md
```

---

## ✨ Feature Set

| Area | Features |
|------|----------|
| 🤖 **AI** | Multi-provider fallback (Claude → GPT-4o → Gemini → Groq), auto-reply, broadcast writer, upsell generator, reply suggestions |
| 💬 **WhatsApp** | Meta Cloud API webhook, inbound message handling, outbound dispatch, delivery/read receipts |
| 👥 **CRM** | Client profiles, search, status tracking (lead→active→paid), chat history, referral codes |
| 💰 **Payments** | Easypaisa / JazzCash / Bank, screenshot upload, admin confirmation flow |
| 📅 **Scheduling** | Appointment booking, reminders via WhatsApp, cron-based follow-up engine |
| 📢 **Broadcasts** | AI-written bulk messages, audience targeting, scheduling, delivery tracking |
| ⭐ **Reviews** | Auto-collection post-payment, sentiment analysis, rating charts |
| 🔔 **Alerts** | Real-time Socket.io notifications for new clients, payments, complaints |
| 📊 **Analytics** | Revenue charts, message volume, conversion funnel, AI provider usage stats |

---

## ⚡ Quick Start

### Option A — Docker (Recommended)

```bash
cp .env.docker .env
# Fill in JWT_SECRET, OWNER_EMAIL, OWNER_PASSWORD, WHATSAPP_*, and at least one AI key
docker compose up -d --build
```

Open `http://localhost` and login with your `OWNER_EMAIL` / `OWNER_PASSWORD`.

### Option B — Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 14+

```bash
# 1. Database
psql -U postgres -c "CREATE DATABASE clientflow;"
psql -U postgres -d clientflow -f database/schema.sql
psql -U postgres -d clientflow -f database/seed.sql

# 2. Backend
cp .env.example backend/.env
# Edit backend/.env
cd backend && npm install && npm run dev   # → http://localhost:5000

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev  # → http://localhost:5173
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/clientflow` |
| `JWT_SECRET` | ✅ | Random 32+ char string |
| `OWNER_EMAIL` | ✅ | Dashboard admin email |
| `OWNER_PASSWORD` | ✅ | Dashboard admin password |
| `WHATSAPP_TOKEN` | ✅ | Meta Cloud API access token |
| `WHATSAPP_PHONE_ID` | ✅ | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | ✅ | Custom webhook verify token |
| `ANTHROPIC_API_KEY` | ⭐ | Claude (highest priority AI) |
| `OPENAI_API_KEY` | optional | GPT-4o fallback |
| `GEMINI_API_KEY` | optional | Gemini 1.5 Flash fallback |
| `GROQ_API_KEY` | optional | Groq Llama 3.3 fallback |
| `FRONTEND_URL` | ✅ | Origin for CORS (`http://localhost` in Docker) |

---

## 📱 WhatsApp Webhook Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Add **WhatsApp** product → copy **Phone Number ID** + **Access Token**
3. Set Webhook URL: `https://your-domain.com/webhook`
4. Set Verify Token to match `WHATSAPP_VERIFY_TOKEN` in `.env`
5. Subscribe to: `messages`, `message_deliveries`, `message_reads`

> For local testing use [ngrok](https://ngrok.com): `ngrok http 5000`

---

## 🚀 Deployment

### Railway / Render
- Push this repo to GitHub
- Deploy `backend/` as a Node.js service; add a PostgreSQL plugin
- Deploy `frontend/` as a static site with `npm run build` → publish `dist/`
- Set all env vars in the platform dashboard

### VPS / DigitalOcean
```bash
git clone <repo>
cd clientflow-ai
cp .env.docker .env && nano .env   # fill in values
docker compose up -d --build
# Point your domain to the VPS IP and set up SSL with Certbot
```

---

## 🤖 AI System Details

```
Incoming message
      │
      ▼
detectLanguage() ──► append language instruction to system prompt
      │
      ▼
Try Claude Sonnet ──► success? return response
      │ 429/503/error
      ▼
Try GPT-4o ──────────► success? return response
      │ 429/503/error
      ▼
Try Gemini 1.5 Flash ► success? return response
      │ 429/503/error
      ▼
Try Groq Llama 3.3 ──► success? return response
      │ all failed
      ▼
Graceful degradation (manual reply mode)
```

- Failed providers are marked unavailable and retried after **10 minutes**
- Every call is logged to `ai_logs` table (provider, latency, success)
- Check health at `GET /api/ai/health`

---

## 🆘 Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid credentials" | Check `OWNER_EMAIL`/`OWNER_PASSWORD` in `.env` |
| WhatsApp not receiving | Verify webhook is HTTPS, verify token matches |
| AI not responding | Visit `/api/ai/health`, check API keys in Settings |
| CORS errors | Ensure `FRONTEND_URL` matches exactly (no trailing slash) |
| DB connection failed | Check `DATABASE_URL`, ensure PostgreSQL is running |

---

Built with ❤️ — React · Node.js · PostgreSQL · WhatsApp Business API · Multi-AI Fallback
