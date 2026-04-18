# ClientFlow AI 🤖
WhatsApp Business Automation Platform

> A production-ready SaaS dashboard that turns your WhatsApp Business account into a full AI-powered CRM: automated replies, payment tracking, broadcast campaigns, appointment booking, referrals, and live analytics — all in one dark-themed dashboard.

---

## What It Does

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time overview of revenue, active clients, pending payments, and message volume. Shows today's stats, conversion funnel, and unread alerts at a glance. |
| **Inbox** | Full WhatsApp conversation view for every client, with message history, AI reply suggestion (one click), quick-template bar, and follow-up triggers. Supports sending messages directly from the dashboard. |
| **Clients** | CRM list of all clients with status (lead → active → paid → inactive), search, and quick navigation to full profiles. Tracks total spend, first contact, last active date, and referral code. |
| **Client Profile** | Deep per-client view showing chat history, all payments, reviews, pending follow-ups, and private notes — all in one tabbed page. Lets you confirm payments, schedule follow-ups, and send messages. |
| **Payments** | Tracks all Easypaisa / JazzCash / bank payments with pending confirmation workflow. Screenshot uploads, one-click confirm/reject, and revenue summary cards. |
| **Services** | Service catalog with name, category, price (PKR), delivery days, and active/inactive toggle. Used by the AI to quote prices to clients automatically when they ask. |
| **Templates** | Library of reusable WhatsApp message templates with category color coding, usage counters, clipboard copy, and one-click send to active client. Supports `{{client_name}}` personalisation placeholders. |
| **Broadcasts** | Send targeted bulk WhatsApp messages to segments (all clients / paid / inactive / leads) with optional scheduling. Includes an AI writer that generates broadcast copy from a topic + tone. |
| **Appointments** | Booking system with upcoming card view and full history table. Books confirmed slots, sends WhatsApp confirmation automatically, tracks reminder status, and supports mark-complete / cancel actions. |
| **Follow-ups** | Automated follow-up queue (cron-driven, hourly) with five types: cold lead, pending payment, post-delivery, re-engagement, upsell. Each message is editable before sending or auto-sent at schedule time. |
| **Reviews** | Collects post-delivery star ratings and feedback automatically via WhatsApp. Displays sentiment analysis (positive / neutral / negative) as pie chart plus rating distribution bar chart. |
| **Referrals** | Leaderboard of clients ranked by referral count with gold/silver/bronze row highlights. One-click reward message via WhatsApp with pre-filled, editable congratulations text. |
| **Analytics** | Revenue trend line, message volume bar chart, client growth area chart, conversion funnel, AI provider usage breakdown, and per-service revenue. All powered by Recharts with dark-themed tooltips. |
| **Alerts** | Real-time bell icon with Socket.io push for new clients, flagged queries, payment notifications, and system events. Shows unread count badge and dismissable list. |
| **Settings** | Business profile (name, description, working hours, auto-reply on/off), payment account numbers (Easypaisa / JazzCash / bank), and AI provider API keys — stored in the database and used at runtime. |
| **AI Engine** | Multi-provider AI fallback: Claude → GPT-4o → Gemini → Groq. Auto-switches on credit exhaustion or rate limits. Handles onboarding, pricing, payment, review collection, and upsell flows — all context-aware. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3 (dark mode), Recharts 2, Lucide React, date-fns, Socket.io client |
| **Backend** | Node.js 20, Express 4, Socket.io 4, node-cron, jsonwebtoken, bcrypt, multer |
| **Database** | PostgreSQL 14+ (14 normalised tables), pg driver |
| **AI Providers** | Anthropic Claude, OpenAI GPT-4o, Google Gemini, Groq (priority fallback chain) |
| **WhatsApp** | Meta Cloud API (WhatsApp Business Platform) |
| **Deployment** | Vercel (frontend), Railway (backend + PostgreSQL) |

---

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Meta Developer Account (for WhatsApp Business API)
- API keys for at least one AI provider (Groq is free)
- A WhatsApp Business phone number verified in Meta Portal

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd clientflow-ai
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

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example backend/.env
```

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://user:pass@localhost:5432/clientflow` |
| `JWT_SECRET` | Secret for signing auth tokens | Any long random string (e.g. `openssl rand -hex 32`) |
| `OWNER_EMAIL` | Dashboard login email | You choose |
| `OWNER_PASSWORD` | Dashboard login password | You choose |
| `WHATSAPP_TOKEN` | Meta permanent access token | Meta Developer Portal → WhatsApp → API Setup |
| `WHATSAPP_PHONE_ID` | Your WhatsApp Business phone number ID | Meta Developer Portal → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification string | Any custom string you choose |
| `ANTHROPIC_API_KEY` | Claude API key | console.anthropic.com |
| `OPENAI_API_KEY` | GPT-4o key (optional, fallback) | platform.openai.com |
| `GEMINI_API_KEY` | Gemini Flash key (optional, fallback) | aistudio.google.com |
| `GROQ_API_KEY` | Groq LLaMA key (optional, completely free) | console.groq.com |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` locally, Vercel URL in prod |
| `PORT` | Backend port | `5000` (default) |

### 4. Get WhatsApp API (Meta)

Step by step:

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create App → **Business** type → Add **WhatsApp** product
3. Under **API Setup**, get your **Phone Number ID** and **Temporary/Permanent Access Token**
4. Set webhook URL: `https://your-backend.railway.app/webhook`
5. Verify token: set to whatever you put in `WHATSAPP_VERIFY_TOKEN`
6. Subscribe to events: **messages**, **message_deliveries**, **message_reads**
7. To make the access token permanent: Create a System User in Business Manager → assign to App → generate token with `whatsapp_business_messaging` permission

### 5. Get AI Provider Keys

| Provider | Dashboard URL | Free Tier | Notes |
|----------|--------------|-----------|-------|
| **Claude** (recommended) | console.anthropic.com | $5 credit on signup | Best quality for sales conversations |
| **OpenAI GPT-4o** | platform.openai.com | Pay-as-you-go | Excellent all-rounder |
| **Gemini Flash** | aistudio.google.com | 1M tokens/day free | Good free tier for testing |
| **Groq LLaMA 3.3** | console.groq.com | Completely free | Fastest, great for high volume |

You only need **one** key to get started. The system auto-falls back through the chain on errors.

### 6. Run Locally

```bash
# Terminal 1 — Backend
cd backend && npm run dev
# → http://localhost:5000

# Terminal 2 — Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

Visit: [http://localhost:5173](http://localhost:5173)  
Login with `OWNER_EMAIL` and `OWNER_PASSWORD` from your `.env`

### 7. Deploy to Production

**Backend → Railway:**

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the `/backend` folder (or root if using monorepo)
4. Add all `.env` variables in the Railway **Variables** tab
5. Add **PostgreSQL** plugin → Railway auto-sets `DATABASE_URL`
6. Railway auto-detects the `Dockerfile` and builds
7. Note your Railway public URL (e.g. `https://clientflow-api.railway.app`)

**Frontend → Vercel:**

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select the `/frontend` folder as the root directory
3. Set environment variable: `VITE_API_URL` = your Railway backend URL
4. Deploy — Vercel auto-detects Vite and uses `vercel.json` for SPA routing

### 8. First-Time Setup

After deploying or running locally:

1. Log in to the dashboard
2. Go to **Settings** → fill in your business name and description
3. Add your **Easypaisa** and/or **JazzCash** numbers in Settings
4. Add your AI API key(s) in Settings → AI Configuration
5. Go to **Services** → add your service offerings with prices
6. In Settings, set your **working hours** and enable **Auto-Reply**
7. Test by sending a WhatsApp message to your business number
8. Check the **Inbox** page — the message should appear within seconds

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                              │
│                                                                 │
│   WhatsApp User                                                 │
│       │  sends message                                          │
│       ▼                                                         │
│   Meta Cloud API ──────────────────────────────────────────────┤
│       │  POST /webhook                                          │
└───────┼─────────────────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────┐
│                      BACKEND (Railway)                          │
│                                                                 │
│   webhook.js                                                    │
│       │ dedup check (message_id)                                │
│       │ save to messages table                                  │
│       ▼                                                         │
│   aiService.js ──► Claude / GPT-4o / Gemini / Groq             │
│       │ (context-aware: onboarding, pricing, payment, upsell)  │
│       ▼                                                         │
│   whatsappService.js ──► reply via Meta API                     │
│       │                                                         │
│       ▼                                                         │
│   PostgreSQL ◄──── all routes (clients, payments, reviews…)    │
│       │                                                         │
│   cronService.js ──► scheduled follow-ups every hour           │
│   Socket.io ──────► real-time push to frontend                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API + Socket.io
┌───────────────────────────▼─────────────────────────────────────┐
│                    FRONTEND (Vercel)                            │
│                                                                 │
│   React Dashboard                                               │
│   ├── Inbox          (live conversations)                       │
│   ├── Clients        (CRM + profiles)                           │
│   ├── Payments       (confirm / reject)                         │
│   ├── Broadcasts     (bulk messages)                            │
│   ├── Appointments   (booking calendar)                         │
│   ├── Reviews        (sentiment charts)                         │
│   ├── Referrals      (leaderboard)                              │
│   ├── Analytics      (revenue + AI usage)                       │
│   └── Settings       (API keys, business config)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Invalid credentials" on login | Wrong email/password in .env | Check `OWNER_EMAIL` and `OWNER_PASSWORD` in `backend/.env` |
| WhatsApp messages not arriving | Webhook not verified or wrong token | Set webhook URL in Meta Portal; ensure `WHATSAPP_VERIFY_TOKEN` matches |
| "AI not responding" in chat | No API key configured | Add at least one key in Settings → AI Configuration, or set `GROQ_API_KEY` in .env (free) |
| 500 error on startup | Database not set up | Run `schema.sql` then `seed.sql` in your PostgreSQL database |
| CORS errors in browser | `FRONTEND_URL` mismatch | Set `FRONTEND_URL` in backend `.env` to your exact frontend URL (no trailing slash) |
| Messages not deduplicating | Old schema missing `message_id` column | Re-run `database/schema.sql` — it's idempotent with `IF NOT EXISTS` |
| Socket.io not connecting | Wrong socket path | Ensure frontend connects with `path: '/socket.io'` (already set in Inbox.jsx) |
| Railway deployment fails | Missing env vars | Check all required variables are set in Railway dashboard → Variables tab |
| Vercel routing shows 404 | SPA routes not rewriting | Ensure `vercel.json` is in the `/frontend` folder with the `rewrites` rule |
| AI quota exhausted | All provider keys depleted | Check `/api/ai/health` for provider status; add a Groq key (free tier) as fallback |
| Payments page empty | No payment records yet | Log into a WhatsApp and complete a purchase flow to generate test payments |
| Follow-ups not auto-sending | Cron not running | Cron runs server-side every hour; check backend logs for `[CRON]` entries |

---

## Project Structure

```
clientflow-ai/
├── frontend/                  # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/        # Sidebar, StatCard, ChatBubble, DataTable, Toast, AlertBell
│   │   ├── context/           # AuthContext (JWT)
│   │   ├── pages/             # 13 dashboard pages
│   │   └── utils/api.js       # Axios instance with auth header
│   ├── vercel.json            # Vercel SPA deploy config
│   └── vite.config.js
├── backend/                   # Node.js + Express
│   ├── routes/                # 15 REST route files
│   ├── services/
│   │   ├── aiService.js       # Multi-provider AI with fallback
│   │   ├── whatsappService.js # Meta Cloud API sender
│   │   └── cronService.js     # Scheduled follow-up runner
│   ├── middleware/auth.js     # JWT verification
│   ├── db/index.js            # PostgreSQL pool
│   ├── server.js              # Express app + Socket.io
│   ├── Dockerfile             # Production container
│   └── railway.json           # Railway deploy config
├── database/
│   ├── schema.sql             # 14 tables (idempotent)
│   └── seed.sql               # Default services + settings
├── .env.example
└── README.md
```

---

Built with ❤️ using React, Node.js, PostgreSQL, and WhatsApp Business API.
