# ClientFlow AI — Final System Architecture

> **PROMPT 120 — FINAL SYSTEM ARCHITECTURE (ULTIMATE)**
> Complete SaaS architecture covering frontend, backend, DB, cache, queue, AI layer, integrations, scaling, deployment, and monitoring.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                    │
│  Browser/Mobile  │  White-label Subdomains  │  Custom Domains           │
│  company1.app.   │  company2.app.clientflow │  portal.acme.com          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS
┌───────────────────────────────▼─────────────────────────────────────────┐
│                         CDN / Edge Layer                                │
│       Cloudflare / CloudFront — SSL, DDoS, WAF, Asset Caching          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                       Load Balancer (Nginx / ALB)                       │
│   - Route /api/* → Backend       - Route /* → Frontend CDN             │
│   - SSL termination              - WebSocket passthrough                │
└──────────┬────────────────────────────────────────┬──────────────────────┘
           │                                        │
┌──────────▼──────────┐                ┌────────────▼────────────────────┐
│   FRONTEND (React)   │                │   BACKEND (Node.js / Express)   │
│   Vite + Tailwind    │                │   Multi-process / PM2 cluster   │
│   Lazy loaded pages  │                │   API v1 + Legacy v0            │
│   Theme engine       │                │   Socket.io (real-time)         │
│   White-label CSS    │                │   Cron jobs                     │
└──────────────────────┘                └────────────┬────────────────────┘
                                                     │
           ┌─────────────────────────────────────────┤
           │                     │                   │
┌──────────▼──────┐  ┌───────────▼───────┐  ┌───────▼────────────────────┐
│   PostgreSQL     │  │   Redis Cache     │  │   Message Queue (BullMQ)   │
│   v15+           │  │   Rate limiting   │  │   Background jobs          │
│   Row-Level Sec  │  │   Session store   │  │   - Broadcast sends        │
│   Partitioned    │  │   AI response     │  │   - Follow-up delivery     │
│   tables         │  │   cache           │  │   - AI processing          │
└──────────────────┘  └───────────────────┘  └────────────────────────────┘
```

---

## 2. Multi-Tenant Architecture (PROMPT 101)

### Isolation Strategy: Row-Level Security (PostgreSQL RLS)

Every table has:
- `org_id UUID NOT NULL` — foreign key to `organizations`
- `CREATE INDEX ON table(org_id)` — every query scoped to org
- `ALTER TABLE t ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY ... USING (org_id = current_setting('app.current_org_id')::UUID)`

### Request Flow:
```
1. Request arrives → JWT verified (auth middleware)
2. org_id extracted from JWT payload
3. orgIsolation middleware sets req.orgId
4. DB query helper: BEGIN → SET app.current_org_id → QUERY → COMMIT
5. PostgreSQL RLS filters all rows automatically
6. Cross-org access = database exception (logged + 403 returned)
```

### No Cross-Org Leakage Points:
- ✅ JWT contains org_id (verified server-side)
- ✅ All DB queries scoped with `WHERE org_id = $1`
- ✅ PostgreSQL RLS as defense-in-depth
- ✅ Subdomain resolved to org before any auth
- ✅ WebSocket rooms namespaced: `org:{orgId}`

---

## 3. Database Layer (PROMPT 101, 102, 119)

### Schema Design
- **organizations** — tenant root
- **users** — per-org team members
- **sessions** — device session tracking
- **clients, messages, payments, etc.** — all have `org_id`
- **plans** — subscription tiers with feature flags

### Partitioning (PROMPT 102)
Large tables are partitioned by time:
```sql
messages     PARTITION BY RANGE (created_at)   -- quarterly partitions
api_logs     PARTITION BY RANGE (created_at)
feature_usage PARTITION BY RANGE (created_at)
```

### Sharding Roadmap
| Phase | Condition | Action |
|-------|-----------|--------|
| 1 | < 50 orgs, < 10M rows | Single DB, partitioned |
| 2 | 50-500 orgs, 10-100M rows | Read replicas + PgBouncer |
| 3 | 500+ orgs, 100M+ rows | Citus horizontal sharding (16 shards by `shard_id`) |
| 4 | 5000+ orgs | Dedicated DB per enterprise org |

### Performance (PROMPT 119)
- Composite indexes: `(org_id, status)`, `(org_id, created_at DESC)`
- Materialized view: `mv_org_dashboard_stats` (refreshed every 5 min)
- PgBouncer connection pooling (transaction mode, 20 conn/shard)
- EXPLAIN ANALYZE on all slow queries > 100ms

---

## 4. Caching Layer — Redis (PROMPT 103)

```
Cache Key Pattern: clientflow:{org_id}:{namespace}:{suffix}

┌────────────────────────────────────────────────────────┐
│  Namespace       │ TTL    │ Use case                    │
├──────────────────┼────────┼─────────────────────────────┤
│  dashboard_stats │  60s   │ KPI cards on dashboard      │
│  contact_list    │  120s  │ Clients list page           │
│  analytics       │  300s  │ Charts and reports          │
│  ai_response     │  3600s │ Repeated AI queries         │
│  whitelabel      │  86400s│ Org branding config         │
│  tenant:host     │  300s  │ Subdomain → org resolution  │
│  ab:{exp}:{cli}  │  3600s │ A/B variant assignment      │
└────────────────────────────────────────────────────────┘

Invalidation: On write → invalidateOrg(orgId, namespace)
Fallback:     Redis down → getOrFetch falls through to DB
```

---

## 5. Rate Limiting (PROMPT 104)

Redis-based sliding window limiter:

| Scope | API | AI calls | Campaigns |
|-------|-----|----------|-----------|
| Starter plan | 1000/min | 100/day | 10/month |
| Pro plan | 5000/min | 500/day | 50/month |
| Enterprise | Unlimited | Unlimited | Unlimited |
| IP (anon) | 200/min | — | — |
| Login attempts | 10/15min | — | — |

Headers set: `X-RateLimit-Limit-{category}`, `X-RateLimit-Remaining-{category}`, `X-RateLimit-Reset-{category}`

---

## 6. Error Handling (PROMPT 105)

### Error Class Hierarchy
```
AppError (base)
├── ValidationError   400  VALIDATION_ERROR
├── AuthError         401  AUTH_ERROR
├── ForbiddenError    403  FORBIDDEN
├── NotFoundError     404  NOT_FOUND
├── ConflictError     409  CONFLICT
├── RateLimitError    429  RATE_LIMIT_EXCEEDED
└── ExternalServiceError 502 EXTERNAL_SERVICE_ERROR
```

### Response Format
```json
{
  "error": "Human-readable message",
  "code":  "MACHINE_READABLE_CODE",
  "details": { "field": "reason" }
}
```

### Postgres error mapping:
- `23505` → 409 DUPLICATE_ENTRY
- `23503` → 400 FOREIGN_KEY
- `P0001` → 403 CROSS_ORG_ACCESS

---

## 7. Logging System (PROMPT 106)

Structured JSON logs output to stdout (suitable for ELK / Datadog / CloudWatch):

```json
{
  "timestamp": "2026-04-19T10:00:00.000Z",
  "level": "info",
  "message": "API Request",
  "service": "clientflow-ai",
  "org_id": "abc-123",
  "method": "POST",
  "path": "/api/v1/broadcasts",
  "status": 201,
  "duration_ms": 45
}
```

| Level | Used for |
|-------|----------|
| error | Exceptions, crashes, DB failures |
| warn  | Rate limits, degraded service, security events |
| info  | Business events (login, broadcast sent, payment confirmed) |
| http  | All API requests |
| debug | Detailed flow for dev debugging |

Persistence: Errors + slow requests (>2s) → `api_logs` table (partitioned).

---

## 8. Session Management (PROMPT 113)

- JWT (7d expiry) + session record in DB
- Token hash (SHA-256) stored, never the raw JWT
- Session validation on every authenticated request
- Multi-device: list all active sessions, revoke one or all
- Expiry purge job: cron every day removes 30d+ old sessions

---

## 9. Security Hardening (PROMPT 114)

| Layer | Protection |
|-------|-----------|
| HTTP Headers | X-Frame-Options, CSP, HSTS, nosniff, XSS-Protection |
| Input | Null byte removal, prototype pollution prevention, 1MB payload limit |
| Auth | JWT + session validation, bcrypt (12 rounds), brute force protection |
| DB | Parameterized queries everywhere, RLS, cross-org assertion |
| Rate limiting | Per IP, per user, per org, per plan |
| Uploads | 10MB limit, filename sanitization |
| CORS | Strict origin whitelist |

---

## 10. API Versioning (PROMPT 115)

```
/api/v1/*  → Current (stable)
/api/*     → Legacy (backward compatible, same handlers)
/api/v2/*  → Future (non-breaking additions, new features)
```

Deprecation strategy:
1. Announce v2 in changelog
2. Add `Deprecation` header on v1 endpoints
3. Support both for 12 months
4. Sunset v1 with 90-day notice

---

## 11. API Documentation (PROMPT 116)

- Swagger UI: `GET /api/docs`
- OpenAPI JSON: `GET /api/docs.json`
- Auto-generated from JSDoc `@swagger` annotations on route files
- Includes: auth scheme, all endpoints, request/response schemas, error codes

---

## 12. A/B Testing Engine (PROMPT 108)

- Deterministic assignment: hash(clientId) % 100 → variant A or B
- Sticky: same client always gets same variant
- Conversion tracking with timestamps
- Statistical results: impressions, conversions, conversion rate per variant
- Supports: broadcast messages, AI response tone, UI variants, pricing pages

---

## 13. Feature Usage Tracking (PROMPT 107)

- Every API route can use `trackUsage(feature, action)` middleware
- Stores in `feature_usage` table (partitioned by month)
- Used for:
  - Plan limit enforcement (check monthly counts)
  - Analytics: "Which features are most used?"
  - Product decisions: "Should we invest in X?"

---

## 14. White-Label + Custom Domains (PROMPTS 110, 111, 112)

### White-Label
Each org has: `brand_name`, `brand_logo_url`, `brand_primary_color`, `brand_custom_css`
- CSS variables injected by ThemeProvider
- Logo shown in Sidebar
- Colors override Tailwind defaults

### Custom Domain
1. Admin adds domain via `POST /api/domains/initiate`
2. System returns TXT record to add to DNS
3. Admin calls `POST /api/domains/verify`
4. System does DNS TXT lookup to confirm
5. SSL provisioned (via Let's Encrypt / Cloudflare)

### Subdomain Routing
```
acme.app.clientflow.ai → org slug 'acme'
portal.acme.com (custom domain, verified) → org by custom_domain
```
Middleware: `subdomainTenant.js` resolves org from hostname, cached 5 min.

---

## 15. Theme Engine (PROMPT 109)

- CSS custom properties on `:root`
- React `ThemeContext` with dark/light/custom modes
- Persisted to `localStorage`
- White-label brand color overrides primary token
- Org `brand_custom_css` injected as `<style>` tag

---

## 16. Scaling Strategy

### Horizontal Scaling
```
Backend: PM2 cluster mode (1 process / CPU core) → ECS / K8s pods
Redis:   Redis Cluster (3 primary + 3 replica)
DB:      PostgreSQL read replicas → Citus sharding at scale
Queue:   BullMQ workers (scale independently from API)
```

### Vertical Scaling Triggers
| Metric | Threshold | Action |
|--------|-----------|--------|
| API CPU | >70% sustained | Add pod/instance |
| DB CPU | >60% | Add read replica |
| Redis memory | >80% | Add cluster node |
| Queue depth | >10K jobs | Add worker process |

---

## 17. Deployment Plan

### Infrastructure (AWS / GCP / Render)
```
Production Stack:
  Frontend:  Vercel / Cloudflare Pages (static, global CDN)
  Backend:   ECS Fargate (auto-scaling, 2–10 tasks)
  Database:  RDS PostgreSQL 15 (Multi-AZ, automated backups)
  Cache:     ElastiCache Redis 7 (cluster mode)
  Queue:     Managed Redis (same ElastiCache cluster)
  Storage:   S3 (payment screenshots, logos)
  CDN:       CloudFront
```

### CI/CD Pipeline
```
1. Push to main → GitHub Actions
2. Run tests
3. Build Docker image → ECR
4. Deploy to staging (ECS) → smoke tests
5. Manual approval → deploy to production
6. Zero-downtime rolling deployment
```

---

## 18. Monitoring

| Tool | Purpose |
|------|---------|
| Datadog / New Relic | APM, traces, error tracking |
| CloudWatch / Grafana | Infrastructure metrics |
| Sentry | Frontend + backend error capture |
| PagerDuty | On-call alerts |
| Structured logs | Searchable via Elasticsearch / CloudWatch Insights |

### Key Metrics to Alert On
- API P99 latency > 500ms
- Error rate > 1%
- DB connection pool exhausted
- Redis hit rate < 80%
- Queue depth > 5000
- Failed WhatsApp delivery rate > 10%

---

## 19. SDK (PROMPT 117)

| Language | File | Install |
|----------|------|---------|
| JavaScript | `sdk/js/clientflow-sdk.js` | `npm install clientflow-ai-sdk` |
| Python | `sdk/python/clientflow_sdk.py` | `pip install clientflow-ai` |

Both SDKs:
- Auto-set token after login
- Resource-based API: `cf.clients.list()`, `cf.broadcasts.send(id)`
- Error handling with typed exceptions
- No external dependencies (stdlib only for Python; `fetch` for JS)

---

## 20. File Structure

```
clientflow-ai/
├── backend/
│   ├── db/index.js                    # PostgreSQL pool
│   ├── middleware/
│   │   ├── auth.js                    # JWT + session validation (P101, P113)
│   │   ├── orgIsolation.js            # Org scoping + RBAC (P101)
│   │   ├── rateLimiter.js             # Redis rate limiting (P104)
│   │   ├── errorHandler.js            # Structured errors (P105)
│   │   ├── requestLogger.js           # HTTP logging (P106)
│   │   ├── security.js                # Headers, sanitize, CSRF (P114)
│   │   └── subdomainTenant.js         # Subdomain routing (P112)
│   ├── services/
│   │   ├── aiService.js               # AI provider abstraction
│   │   ├── cacheService.js            # Redis cache (P103)
│   │   ├── loggerService.js           # Structured logging (P106)
│   │   ├── sessionService.js          # Session CRUD (P113)
│   │   ├── featureTracker.js          # Usage tracking (P107)
│   │   ├── abTestService.js           # A/B testing (P108)
│   │   ├── whitelabelService.js       # Branding + domains (P110, P111)
│   │   ├── cronService.js             # Scheduled jobs
│   │   └── whatsappService.js         # WhatsApp API client
│   ├── routes/
│   │   ├── auth.js                    # Login, register, logout (P101, P113)
│   │   ├── sessions.js                # Session management (P113)
│   │   ├── experiments.js             # A/B testing (P108)
│   │   ├── usage.js                   # Feature tracking (P107)
│   │   ├── whitelabel.js              # Branding + domains (P110, P111)
│   │   └── ... (existing routes)
│   ├── swagger.js                     # OpenAPI spec (P116)
│   ├── server.js                      # Main server (all prompts wired)
│   └── package.json                   # + redis, swagger-jsdoc, swagger-ui-express
├── database/
│   ├── schema.sql                     # Original single-tenant schema
│   ├── schema_v2.sql                  # Multi-tenant schema (P101, P102)
│   └── performance_indexes.sql        # Indexes + sharding + materialized views (P102, P119)
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx        # Theme engine (P109)
│   │   ├── components/
│   │   │   └── ThemeToggle.jsx         # Dark/light toggle (P109)
│   │   ├── App.jsx                     # Lazy loading + ThemeProvider (P118)
│   │   └── index.css                   # CSS variables for theming
│   ├── tailwind.config.js              # CSS variable integration (P109)
│   └── vite.config.js                  # Code splitting (P118)
├── sdk/
│   ├── js/clientflow-sdk.js            # JavaScript SDK (P117)
│   └── python/clientflow_sdk.py        # Python SDK (P117)
├── .env.example                        # All env variables documented
├── ARCHITECTURE.md                     # This document (P120)
└── README.md
```
