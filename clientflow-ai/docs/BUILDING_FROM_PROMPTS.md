# ClientFlow AI — Build Blueprint (Using All Prompt Tracks)

This document translates the full prompt set into an implementation blueprint.

---

## 1) High-Level Architecture

### Runtime Layers
- **API Layer (Express)**: Auth, CRM, Inbox, Campaigns, Automations, AI, Payments, Integrations, Analytics.
- **Worker Layer (BullMQ + Redis preferred)**: message delivery, AI tasks, imports, analytics recompute.
- **Storage Layer**: PostgreSQL for transactional data + aggregates.
- **Realtime Layer**: Socket.io for dashboard/inbox live updates.

### Core Principles
- API-first contracts.
- Queue-first heavy operations.
- Event-driven module interactions.
- Provider-agnostic AI manager.
- Tenant/workspace-ready schema.

---

## 2) Target Folder Structure

```text
clientflow-ai/
  backend/
    ai/
      aiConfig.js
      aiManager.js
      promptTemplates.js
      providers/
    routes/
    services/
    workers/
    integrations/
    middleware/
    db/
  frontend/
    src/
      app/
      components/
      pages/
      stores/            # Zustand stores
      features/
  database/
    schema.sql
    seed.sql
  docs/
    BUILDING_FROM_PROMPTS.md
```

---

## 3) Core Modules Breakdown

### A. CRM / Contacts
- Contact profile enrichment (city/company/source/product interest).
- Tags and segmentation.
- Duplicate detection + merge.
- Lead scoring (`hot/warm/cold`).

### B. Inbox / Conversations
- Conversation states: open/pending/resolved.
- Assignment, notes, timeline.
- Keyword search and unread filtering.

### C. Campaigns
- Draft/scheduled/running/paused/archived lifecycle.
- Queue-based fanout to recipients.
- Delivery/failure telemetry.

### D. Automation Engine
- Trigger-condition-action model.
- Sequence templates and follow-up steps.
- Event hooks (payment, reply, issue, inactivity).

### E. AI Engine
- Central manager with provider routing + fallback.
- Prompt templates and task-specific prompts.
- Features: writing, auto-reply, classification, translation, summarization.

### F. Billing/Payments
- Payment tracking.
- Pending/confirmed flows.
- Follow-up and upsell hooks.

### G. Integrations
- Gmail/Calendar/ClickUp/Make placeholders.
- Webhook-first sync strategy.
- Secret management and connector state.

### H. Analytics
- Funnel analytics.
- Agent performance.
- Best send times and conversion reporting.

---

## 4) Data Flow Diagram (Text)

```text
Inbound WhatsApp Webhook
  -> Normalize Message
  -> Store Message + Update Conversation
  -> Run AI Classification/Intent (queued)
  -> Trigger Automations (rules)
  -> Optional AI Reply Generation
  -> Enqueue outbound message jobs
  -> Worker sends message
  -> Delivery/read status webhook updates
  -> Analytics aggregation updates
```

```text
Campaign Create
  -> Save draft
  -> Segment audience
  -> Queue per-recipient jobs
  -> Worker processes with retries/rate limits
  -> Status updates + failures
  -> Campaign completion stats
```

---

## 5) Implementation Order (Module-by-Module)

1. Auth + RBAC + workspace boundaries.
2. Queue reliability (BullMQ/Redis + retry/backoff + DLQ).
3. Inbox + conversation assignment.
4. Campaign lifecycle and segmentation.
5. Automation execution engine.
6. AI prompt templates + provider routing.
7. Integrations hub.
8. Advanced analytics and recommendations.

---

## 6) Production Readiness Checklist

- [ ] Redis configured in all environments.
- [ ] BullMQ workers horizontally scalable.
- [ ] API + worker observability dashboards.
- [ ] Rate limiting per account/tenant.
- [ ] Webhook signature verification.
- [ ] Audit logs for critical actions.
- [ ] Backup/restore runbook.
- [ ] Feature flags for risky rollouts.

