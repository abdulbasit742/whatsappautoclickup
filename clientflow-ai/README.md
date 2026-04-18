# ClientFlow AI — Production Backend

AI-powered CRM & WhatsApp automation system. Built with Node.js (Express), PostgreSQL, Redis + BullMQ.

---

## 🗂 Folder Structure

```
clientflow-ai/
├── backend/
│   ├── config/
│   │   └── redis.js               # IORedis connection (used by BullMQ)
│   ├── db/
│   │   └── index.js               # PostgreSQL pool (pg)
│   ├── middleware/
│   │   ├── auth.js                # JWT auth middleware
│   │   └── errorHandler.js        # Global Express error handler
│   ├── modules/
│   │   ├── ai/
│   │   │   └── aiService.js       # AI provider fallback chain (Groq → OpenAI → Claude → Gemini)
│   │   ├── apikeys/
│   │   │   └── apiKeyManager.js   # DB-backed API key manager with rotation & rate-limit tracking
│   │   ├── queue/
│   │   │   ├── queues.js          # BullMQ Queue definitions
│   │   │   └── workers/
│   │   │       ├── messageWorker.js   # Sends individual WhatsApp messages
│   │   │       ├── broadcastWorker.js # Fan-out broadcast jobs to messageQueue
│   │   │       └── followupWorker.js  # Generates & queues follow-up messages
│   │   └── whatsapp/
│   │       └── whatsappService.js # WhatsApp Cloud API calls (sendText, sendTemplate)
│   ├── routes/
│   │   ├── ai.js           ── /api/ai
│   │   ├── alerts.js       ── /api/alerts
│   │   ├── analytics.js    ── /api/analytics
│   │   ├── apikeys.js      ── /api/apikeys       ← NEW
│   │   ├── appointments.js ── /api/appointments
│   │   ├── auth.js         ── /api/auth
│   │   ├── broadcasts.js   ── /api/broadcasts
│   │   ├── clients.js      ── /api/clients
│   │   ├── followups.js    ── /api/followups
│   │   ├── payments.js     ── /api/payments
│   │   ├── referrals.js    ── /api/referrals
│   │   ├── reviews.js      ── /api/reviews
│   │   ├── services.js     ── /api/services
│   │   ├── settings.js     ── /api/settings
│   │   ├── templates.js    ── /api/templates
│   │   └── webhook.js      ── /webhook
│   ├── services/
│   │   ├── aiService.js       # Shim → modules/ai/aiService.js
│   │   ├── cronService.js     # node-cron jobs (enqueue to BullMQ)
│   │   └── whatsappService.js # Legacy shim (kept for compatibility)
│   ├── utils/
│   │   └── logger.js          # Structured JSON logger
│   ├── server.js              # Express API server entry point
│   ├── worker.js              # Standalone BullMQ worker entry point
│   └── package.json
├── database/
│   ├── schema.sql             # PostgreSQL schema (16 tables)
│   └── seed.sql               # Sample seed data
└── frontend/                  # React + Vite frontend
```

---

## 🗄 Database Schema (16 Tables)

| Table | Purpose |
|---|---|
| `clients` | WhatsApp contacts / CRM records |
| `messages` | All inbound/outbound WhatsApp messages |
| `services` | Business service catalog |
| `payments` | Payment records (Easypaisa/JazzCash/bank) |
| `alerts` | Owner notifications (new clients, AI failures, etc.) |
| `reviews` | Client ratings & sentiment |
| `broadcasts` | Bulk message campaigns |
| `broadcast_recipients` | Per-client broadcast delivery tracking |
| `templates` | Reusable message templates |
| `appointments` | Scheduled client sessions |
| `referrals` | Referral tracking |
| `follow_ups` | Scheduled follow-up messages |
| `ai_logs` | Per-request AI provider usage & latency |
| `settings` | Key-value business configuration |
| **`api_keys`** | **API key pool per provider (rotation support)** |
| **`job_logs`** | **BullMQ job failure audit log** |

---

## 🔗 API Routes

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Owner login → JWT |

### Clients
| Method | Path | Description |
|---|---|---|
| GET | `/api/clients` | List all clients |
| GET | `/api/clients/:id` | Get client detail |
| PATCH | `/api/clients/:id` | Update client |

### Broadcasts
| Method | Path | Description |
|---|---|---|
| GET | `/api/broadcasts` | List broadcasts |
| POST | `/api/broadcasts` | Create broadcast |
| POST | `/api/broadcasts/:id/send` | **Enqueue** broadcast for async sending |

### API Keys *(new)*
| Method | Path | Description |
|---|---|---|
| GET | `/api/apikeys` | List keys (values masked) |
| GET | `/api/apikeys?service=groq` | Filter by service |
| GET | `/api/apikeys/health` | Check which providers are configured |
| POST | `/api/apikeys` | Add a new key |
| DELETE | `/api/apikeys/:id` | Deactivate a key |
| POST | `/api/apikeys/:id/reset-limit` | Clear rate limit on a key |

### Queue Health *(new)*
| Method | Path | Description |
|---|---|---|
| GET | `/api/queue/health` | BullMQ queue stats (waiting/active/failed) |

---

## ⚡ Queue Flow

```
Cron / API Request
       │
       ▼
  broadcastQueue  ──► BroadcastWorker
       │                    │
       │          fans out  ▼
       │           messageQueue ──► MessageWorker ──► WhatsApp Cloud API
       │
  followupQueue   ──► FollowupWorker
       │                    │
       │          enqueues  ▼
       │           messageQueue ──► MessageWorker ──► WhatsApp Cloud API
       │
  whatsapp-messages (direct)
  (webhook AI replies, reminders, weekly summary)
```

**Retry policy:** 3 attempts with exponential backoff (5s → 25s → 125s).  
**Rate limit:** MessageWorker is capped at 80 sends/minute.  
**Concurrency:** Message=5, Broadcast=3, Followup=3 workers.

---

## 🤖 AI Module

Provider priority (first available key wins):

1. **Groq** — `llama-3.3-70b-versatile` *(active)*
2. OpenAI — `gpt-4o` *(placeholder — add key to activate)*
3. Claude — `claude-sonnet-4` *(placeholder — add key to activate)*
4. Gemini — `gemini-1.5-flash` *(placeholder — add key to activate)*

Keys are read from the `api_keys` DB table first (supports rotation),  
falling back to environment variables. Rate-limited keys are automatically  
skipped and re-enabled after 10 minutes.

---

## 🚀 Running

### API Server
```bash
npm start          # production
npm run dev        # development (nodemon)
```

### Worker Process (separate terminal or PM2)
```bash
npm run worker          # production
npm run dev:worker      # development (nodemon)

# PM2
pm2 start worker.js --name clientflow-worker
```

### Environment Variables
Copy `.env.example` to `.env` and fill in your values.  
**REDIS_URL** is new — defaults to `redis://localhost:6379`.

---

## 🔒 Error Handling

- All route errors are forwarded to the global `errorHandler` middleware
- `NODE_ENV=production` hides stack traces from API responses
- Worker failures are logged to the `job_logs` table
- AI provider failures trigger automatic failover to the next provider
- Rate-limited API keys are temporarily excluded and auto-recovered
