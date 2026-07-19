# 🚀 ClientFlow AI — WhatsApp Business Automation

A full-stack WhatsApp CRM & automation platform for freelancers and small businesses. Handles client onboarding, AI responses, payments, follow-ups, reviews, broadcasts, and more — all from one dark dashboard.

---

## 📁 Project Structure

```
/
├── frontend/          # React + Vite + Tailwind CSS  → Deploy on Vercel
│   ├── src/
│   │   ├── components/   Sidebar, StatCard, ChatBubble, AlertBell, DataTable, Toast
│   │   ├── context/      AuthContext
│   │   ├── pages/        13 dashboard pages
│   │   └── utils/        api.js (axios instance)
│   ├── .env.example
│   ├── vercel.json
│   └── vite.config.js
├── backend/           # Node.js + Express            → Deploy on Render / Railway
│   ├── routes/           15 API route files
│   ├── services/         aiService, whatsappService, cronService
│   ├── middleware/        JWT auth
│   ├── db/               PostgreSQL pool
│   ├── server.js
│   └── .env.example
├── database/
│   ├── schema.sql        14 tables
│   └── seed.sql          Sample services + default settings
└── README.md
```

---

## ✨ Features

- 🤖 **Multi-AI Fallback** — Claude → GPT-4o → Gemini → Groq (auto-switches on rate limits)
- 💬 **WhatsApp Automation** — Auto-reply, onboarding, pricing, payment flow via Meta Cloud API
- 💰 **Payments** — Easypaisa / JazzCash / Bank with screenshot confirmation
- 📊 **Analytics Dashboard** — Revenue charts, message volume, conversion funnel, AI usage
- 📅 **Follow-Up Engine** — Cron-based: cold leads, pending payments, post-delivery, re-engagement
- 📢 **Broadcasts** — Targeted bulk messages with AI writer + scheduling
- ⭐ **Reviews & Sentiment** — Auto-collect ratings, sentiment analysis charts
- 🔔 **Real-time Alerts** — Socket.io for new clients, flagged queries, payment alerts
- 👥 **CRM** — Full client profiles, chat history, payment history, referral tracking

---

## ⚡ Local Run Commands

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Database Setup

```bash
psql -U postgres -c "CREATE DATABASE clientflow;"
psql -U postgres -d clientflow -f database/schema.sql
psql -U postgres -d clientflow -f database/seed.sql
```

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm start
# → http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL= (leave empty to use Vite proxy in dev)
npm install
npm run dev
# → http://localhost:5173
```

Login at `http://localhost:5173` with `OWNER_EMAIL` / `OWNER_PASSWORD`.

---

## 🌍 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Platform |
|---|---|---|
| `PORT` | Server port (default 5000) | Render auto-sets this |
| `NODE_ENV` | `production` or `development` | Render |
| `FRONTEND_URL` | Deployed Vercel URL | Render |
| `DATABASE_URL` | PostgreSQL connection string | Render (add Postgres) |
| `JWT_SECRET` | Min 32-char secret key | Render |
| `OWNER_EMAIL` | Dashboard login email | Render |
| `OWNER_PASSWORD` | Dashboard login password | Render |
| `WHATSAPP_TOKEN` | Meta Cloud API access token | Render |
| `WHATSAPP_PHONE_ID` | Meta phone number ID | Render |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verify token | Render |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta WABA ID | Render |
| `ANTHROPIC_API_KEY` | Claude API key | Render |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | Render |
| `GEMINI_API_KEY` | Gemini API key (fallback) | Render |
| `GROQ_API_KEY` | Groq API key (fallback) | Render |

### Frontend (`frontend/.env`)

| Variable | Description | Platform |
|---|---|---|
| `VITE_API_URL` | Deployed backend URL (e.g. `https://clientflow.onrender.com`) | Vercel |

---

## 🚀 Deployment Steps

### Frontend → Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repo
3. **Root Directory**: `frontend`
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Environment Variables**: Add `VITE_API_URL=https://your-backend.onrender.com`
8. Click **Deploy**

### Backend → Render

1. Go to [render.com](https://render.com) → **New Web Service** → Connect repo
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `node server.js`
5. **Environment**: Add all variables from `backend/.env.example`
6. Add a **PostgreSQL** database from Render dashboard → copy `DATABASE_URL` into env vars
7. Run schema: use Render shell → `psql $DATABASE_URL -f ../database/schema.sql`
8. Click **Deploy**

---

## 📱 WhatsApp Webhook Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Add WhatsApp product → Get **Phone Number ID** and **Access Token**
3. Webhook URL: `https://your-backend.onrender.com/webhook`
4. Verify token: same as `WHATSAPP_VERIFY_TOKEN` in `.env`
5. Subscribe to: `messages`, `message_deliveries`, `message_reads`

**Local testing with ngrok:**
```bash
ngrok http 5000
# Use the HTTPS URL as webhook
```

---

## 🔧 First Login Checklist

1. ⚙️ **Settings** → Add business name, payment numbers, AI API keys
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

Check `/api/ai/health` for live provider status.

---

## 🆘 Common Issues

| Problem | Fix |
|---|---|
| "Invalid credentials" on login | Check `OWNER_EMAIL`/`OWNER_PASSWORD` in `backend/.env` |
| WhatsApp not receiving messages | Verify webhook is HTTPS, verify token matches |
| AI not responding | Check API key in Settings, visit `/api/ai/health` |
| Database errors | Make sure `schema.sql` ran before `seed.sql` |
| CORS errors | Set `FRONTEND_URL` to your Vercel URL in backend `.env` |

---

Built with ❤️ using React, Vite, Node.js, Express, PostgreSQL, Socket.io, and WhatsApp Business API.
