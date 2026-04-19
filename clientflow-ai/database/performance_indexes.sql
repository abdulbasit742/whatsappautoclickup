-- ═══════════════════════════════════════════════════════════════════════════════
-- PROMPT 102 — Database Sharding Preparation & Performance Optimization
-- PROMPT 119 — Backend Performance: Indexes + Query Optimization
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- All queries are org-scoped first for maximum performance
-- ─────────────────────────────────────────────────────────────────────────────

-- Clients: common filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_status_active
  ON clients(org_id, status) WHERE status NOT IN ('blocked','inactive');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_last_active
  ON clients(org_id, last_active_at DESC);

-- Messages: timeline queries per client
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_org_client_created
  ON messages(org_id, client_id, created_at DESC);

-- Payments: pending confirmations (most common admin view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org_pending
  ON payments(org_id, created_at DESC) WHERE status = 'pending';

-- Follow-ups: due soon
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_due
  ON follow_ups(org_id, scheduled_at ASC) WHERE status = 'pending';

-- Broadcasts: scheduled
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_broadcasts_scheduled
  ON broadcasts(org_id, scheduled_at ASC) WHERE status = 'scheduled';

-- AI logs: error analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_logs_errors
  ON ai_logs(org_id, created_at DESC) WHERE success = FALSE;

-- API logs: slow / error endpoint analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_logs_slow
  ON api_logs(org_id, path, duration_ms DESC) WHERE duration_ms > 1000;

-- Feature usage: most-used features per org (plan limit checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_month
  ON feature_usage(org_id, feature, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: SHARD PREPARATION (PROMPT 102)
--
-- When to shard:
--   - Total rows in messages > 100M
--   - Writes > 10,000/sec sustained
--   - Single DB CPU consistently > 70%
--   - Query P99 latency > 200ms despite indexing
--
-- Shard Strategy: TENANT-BASED (Org ID hash sharding)
--   shard_id = crc32(org_id) % NUM_SHARDS  (currently stored in organizations.shard_id)
--   Each shard holds ~N/16 organizations.
--   Shard count: start with 4, expand to 16 as needed.
--
-- Migration path:
--   1. Deploy new shard database instances (Citus / PgBouncer)
--   2. Run background job: copy data shard-by-shard (zero downtime)
--   3. Update connection router to direct org_id → shard
--   4. Drain old shard, decommission
-- ─────────────────────────────────────────────────────────────────────────────

-- Assign shard IDs to existing orgs (run once during migration)
UPDATE organizations
SET shard_id = (abs(hashtext(id::TEXT)) % 16)
WHERE shard_id = 0;

-- View: shard distribution health check
CREATE OR REPLACE VIEW shard_distribution AS
SELECT
  shard_id,
  COUNT(*)                    AS org_count,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_orgs
FROM organizations
GROUP BY shard_id
ORDER BY shard_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: PARTITION MANAGEMENT — Auto-create future partitions
-- ─────────────────────────────────────────────────────────────────────────────

-- Procedure to create next quarter's partition (run monthly via cron)
CREATE OR REPLACE PROCEDURE create_next_quarter_partitions()
LANGUAGE plpgsql AS $$
DECLARE
  next_start DATE;
  next_end   DATE;
  q_label    TEXT;
BEGIN
  -- Calculate next quarter start
  next_start := date_trunc('quarter', NOW() + INTERVAL '3 months')::DATE;
  next_end   := (next_start + INTERVAL '3 months')::DATE;
  q_label    := to_char(next_start, 'YYYY_"q"Q');

  -- messages
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS messages_%s PARTITION OF messages FOR VALUES FROM (%L) TO (%L)',
    q_label, next_start, next_end
  );

  -- api_logs
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS api_logs_%s PARTITION OF api_logs FOR VALUES FROM (%L) TO (%L)',
    q_label, next_start, next_end
  );

  -- feature_usage
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS feature_usage_%s PARTITION OF feature_usage FOR VALUES FROM (%L) TO (%L)',
    q_label, next_start, next_end
  );

  RAISE NOTICE 'Created partitions for quarter %', q_label;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: MATERIALIZED VIEWS FOR ANALYTICS CACHING (PROMPT 119)
-- Refresh every 5 minutes via cron instead of computing on every request
-- ─────────────────────────────────────────────────────────────────────────────

-- Dashboard stats per org (refreshed every 5 min)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_dashboard_stats AS
SELECT
  o.id AS org_id,
  COUNT(DISTINCT c.id)                       AS total_clients,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_clients,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'lead')   AS leads,
  COALESCE(SUM(p.amount_pkr) FILTER (WHERE p.status = 'confirmed'), 0) AS revenue_pkr,
  COUNT(DISTINCT p.id)   FILTER (WHERE p.status = 'pending')           AS pending_payments,
  COUNT(DISTINCT al.id)  FILTER (WHERE al.is_resolved = FALSE)          AS unresolved_alerts
FROM organizations o
LEFT JOIN clients  c  ON c.org_id = o.id
LEFT JOIN payments p  ON p.org_id = o.id
LEFT JOIN alerts   al ON al.org_id = o.id
GROUP BY o.id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_org ON mv_org_dashboard_stats(org_id);

-- Refresh command (call from cron):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_dashboard_stats;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: SLOW QUERY DETECTION HELPERS
-- ─────────────────────────────────────────────────────────────────────────────

-- View: top slow queries (requires pg_stat_statements extension)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- SELECT query, calls, mean_exec_time, total_exec_time
-- FROM pg_stat_statements
-- WHERE mean_exec_time > 100
-- ORDER BY total_exec_time DESC
-- LIMIT 20;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: CONNECTION POOLING NOTES (PgBouncer configuration)
-- ─────────────────────────────────────────────────────────────────────────────
-- pgbouncer.ini:
--   [databases]
--   clientflow = host=127.0.0.1 port=5432 dbname=clientflow
--
--   [pgbouncer]
--   pool_mode        = transaction   ; best for stateless API
--   max_client_conn  = 1000
--   default_pool_size = 20
--   reserve_pool_size = 5
--   server_idle_timeout = 600
