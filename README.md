# ClientFlow SaaS

AI-powered communication, CRM, campaign automation, analytics, billing, and integrations platform with a WhatsApp-style operational inbox.

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd whatsappautoclickup

# 2. Copy environment config
cp .env.example .env
# Edit .env and fill in your values (especially GROQ_API_KEY, JWT_SECRET, ENCRYPTION_KEY)

# 3. Start everything with Docker Compose
docker-compose up -d

# 4. Open the app
open http://localhost:3000
```

The Docker Compose setup starts:
- **PostgreSQL** (port 5432) — database with auto-applied schema + seed
- **Redis** (port 6379) — queue and cache
- **Backend API** (port 5000) — Node.js/Express
- **Frontend** (port 3000) — React/Vite

---

## 🛠 Local Development (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 7+

### Backend
```bash
cd backend
cp .env.example .env
# Fill in .env

npm install

# Apply database schema
psql -U postgres -d clientflow -f database/schema.sql
psql -U postgres -d clientflow -f database/seed.sql

npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📦 Project Structure

```
├── backend/                     # Node.js/Express API
│   ├── src/
│   │   ├── app.js               # Express app setup
│   │   ├── server.js            # HTTP + WebSocket server
│   │   ├── config/              # DB, Redis, queues config
│   │   ├── middleware/          # Auth, RBAC, rate limit, validation
│   │   ├── modules/             # Feature modules (16 modules)
│   │   │   ├── auth/            # JWT auth, refresh tokens
│   │   │   ├── users/           # User management
│   │   │   ├── organizations/   # Multi-tenant org management
│   │   │   ├── crm/             # Contacts, leads, activities
│   │   │   ├── inbox/           # WhatsApp-style conversations
│   │   │   ├── campaigns/       # Campaign automation
│   │   │   ├── followups/       # Follow-up & reminder engine
│   │   │   ├── issues/          # Support desk / ticketing
│   │   │   ├── ai/              # AI center + provider layer
│   │   │   ├── billing/         # Subscriptions, invoices, plans
│   │   │   ├── integrations/    # Integration hub
│   │   │   ├── analytics/       # Reporting + dashboards
│   │   │   ├── settings/        # Org settings + API keys
│   │   │   ├── feature-flags/   # Feature flag management
│   │   │   ├── audit/           # Audit log system
│   │   │   └── notifications/   # In-app notifications
│   │   ├── workers/             # BullMQ background workers
│   │   └── shared/              # Logger, crypto, events
│   └── database/
│       ├── schema.sql           # PostgreSQL schema (30+ tables)
│       └── seed.sql             # Sample data
│
├── frontend/                    # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── public/          # Landing, Pricing, Login, Signup
│       │   └── app/             # Dashboard, Inbox, CRM, and 15+ pages
│       ├── components/
│       │   ├── ui/              # Design system components
│       │   ├── layout/          # AppLayout, Sidebar, Topbar
│       │   └── shared/          # Shared business components
│       ├── stores/              # Zustand state (auth, ui, socket)
│       ├── services/            # API service layer
│       └── hooks/               # Custom React hooks
│
├── docker-compose.yml           # Full stack local dev
├── .env.example                 # Environment template
└── README.md
```

---

## 🏗 Architecture

### Multi-Tenant SaaS
- **Organizations** — each org is isolated with its own data
- **Roles**: Super Admin, Org Admin, Manager, Agent, Support, Viewer
- **RBAC** — permission-based access control on every route
- **Tenant isolation** — all queries filtered by `org_id`

### AI Layer
| Provider | Status | Notes |
|----------|--------|-------|
| **Groq** | ✅ Active | Set `GROQ_API_KEY` to enable |
| OpenAI | 🔲 Placeholder | Set `OPENAI_API_KEY` to activate |
| Claude | 🔲 Placeholder | Set `ANTHROPIC_API_KEY` to activate |
| Gemini | 🔲 Placeholder | Set `GEMINI_API_KEY` to activate |

### Queue System (BullMQ + Redis)
| Queue | Purpose |
|-------|---------|
| `campaigns` | Campaign execution engine |
| `followups` | Scheduled follow-up delivery |
| `reminders` | Reminder notifications |
| `ai-processing` | Async AI requests |
| `notifications` | In-app + real-time notifications |
| `integrations` | Integration sync jobs |
| `reports` | Report generation |

### Real-Time (Socket.io)
- Per-org rooms: `org:{orgId}`
- Per-conversation: `conv:{convId}`
- Events: `new_message`, `conversation_updated`, `notification`, `campaign_progress`

---

## 🔐 Security

- JWT access tokens (15min) + refresh tokens (7 days)
- Passwords hashed with bcrypt (cost factor 12)
- API keys AES-256-CBC encrypted at rest
- Rate limiting on auth and API routes
- Parameterized SQL queries (no injection)
- Tenant isolation enforced at middleware level
- Audit logs for all sensitive actions

---

## 📋 Environment Variables

See `.env.example` for the full list.

**Required to get started:**
```
DB_PASSWORD=your-db-password
JWT_SECRET=<32+ random chars>
REFRESH_TOKEN_SECRET=<32+ random chars>
ENCRYPTION_KEY=<exactly 32 chars>
```

**To enable AI:**
```
GROQ_API_KEY=gsk_your_groq_api_key
```

---

## 🗄 Database Schema

Key tables (30+ total):
- `organizations` — multi-tenant org management
- `users` + `roles` + `permissions` — RBAC
- `contacts` — CRM contacts with custom fields (jsonb)
- `conversations` + `conversation_messages` — inbox
- `campaigns` + `campaign_runs` + `campaign_targets` — campaign engine
- `follow_ups` + `reminders` — follow-up engine
- `issues` + `issue_comments` — support desk
- `plans` + `subscriptions` + `invoices` — billing
- `integrations` + `integration_logs` — integrations
- `ai_requests` + `ai_prompt_templates` — AI layer
- `audit_logs` — full audit trail
- `feature_flags` — feature management
- `notifications` — in-app notifications

---

## 🛣 API Routes

All routes are prefixed with `/api/` and require `Authorization: Bearer <token>` unless marked public.

| Module | Base Path |
|--------|-----------|
| Auth (public) | `/api/auth` |
| Users | `/api/users` |
| Organizations | `/api/organizations` |
| CRM / Contacts | `/api/contacts` |
| Inbox | `/api/conversations` |
| Campaigns | `/api/campaigns` |
| Templates | `/api/templates` |
| Follow-ups | `/api/followups` |
| Reminders | `/api/reminders` |
| Issues | `/api/issues` |
| AI | `/api/ai` |
| Billing | `/api/billing` |
| Integrations | `/api/integrations` |
| Analytics | `/api/analytics` |
| Settings | `/api/settings` |
| Feature Flags | `/api/flags` |
| Audit Logs | `/api/audit` |
| Notifications | `/api/notifications` |

---

## 🗺 Frontend Pages

### Public
- `/` — Landing page
- `/pricing` — Pricing page
- `/login`, `/signup` — Authentication
- `/forgot-password`, `/reset-password` — Password reset

### App (authenticated)
- `/app/dashboard` — Executive dashboard
- `/app/inbox` — WhatsApp-style 3-panel inbox
- `/app/crm` — CRM contacts list
- `/app/contacts/:id` — Contact profile
- `/app/campaigns` — Campaign management
- `/app/campaigns/:id` — Campaign detail
- `/app/templates` — Message templates
- `/app/followups` — Follow-up engine
- `/app/reminders` — Reminders
- `/app/issues` — Issue/support desk
- `/app/ai` — AI Center
- `/app/billing` — Billing & plans
- `/app/integrations` — Integrations hub
- `/app/analytics` — Analytics & reports
- `/app/team` — Team management
- `/app/settings` — Settings
- `/app/api-keys` — API key manager
- `/app/feature-flags` — Feature flags
- `/app/audit-logs` — Audit logs
- `/app/notifications` — Notifications

---

## 📈 Default Plans

| Plan | Contacts | Campaigns | AI Requests/mo | Seats |
|------|----------|-----------|----------------|-------|
| Free | 500 | 3 | 100 | 2 |
| Starter | 5,000 | 20 | 1,000 | 5 |
| Pro | 50,000 | 100 | 10,000 | 20 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited |

---

## 🔧 Development Notes

- **Backend**: Node.js 20 + Express 4, modular structure, CommonJS
- **Frontend**: React 18 + Vite 5, ES modules, TanStack Query for data fetching
- **State**: Zustand (auth, UI theme, socket)
- **Styling**: Tailwind CSS 3 with dark mode (`class` strategy)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## 📋 Roadmap

- [ ] Phase 1: Core (Auth, CRM, Inbox, Campaigns) — **Done**
- [ ] Phase 2: AI features with Groq fully wired
- [ ] Phase 3: Billing with Stripe integration
- [ ] Phase 4: Gmail + Google Calendar integrations
- [ ] Phase 5: ClickUp + Make.com webhooks
- [ ] Phase 6: Mobile app (React Native)
- [ ] Phase 7: Custom domain support per org

---

Built with ❤️ as a production-ready SaaS foundation.
